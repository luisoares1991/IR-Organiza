const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map();

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function takeRateLimit(key) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt > WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

async function verifyFirebaseToken(token) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_AUTH_NOT_CONFIGURED');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload.users?.[0] || null;
}

function sanitizeResult(raw) {
  const categories = new Set(['Saúde', 'Educação', 'Previdência', 'Outros']);
  const statuses = new Set(['potential', 'review', 'non_deductible']);
  const confidence = {};
  for (const field of ['razao_social', 'cnpj_cpf', 'valor', 'data', 'categoria', 'descricao']) {
    const value = Number(raw?.confidence?.[field]);
    confidence[field] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  }
  const valor = raw?.valor == null ? null : Number(raw.valor);
  return {
    razao_social: typeof raw?.razao_social === 'string' ? raw.razao_social.trim() || null : null,
    cnpj_cpf: typeof raw?.cnpj_cpf === 'string' ? raw.cnpj_cpf.replace(/\D/g, '') || null : null,
    valor: Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null,
    data: /^\d{4}-\d{2}-\d{2}$/.test(raw?.data || '') ? raw.data : null,
    categoria: categories.has(raw?.categoria) ? raw.categoria : 'Outros',
    descricao: typeof raw?.descricao === 'string' ? raw.descricao.trim() || null : null,
    confidence,
    deductibility_status: statuses.has(raw?.deductibility_status) ? raw.deductibility_status : 'review',
    deductibility_reason: typeof raw?.deductibility_reason === 'string' ? raw.deductibility_reason.slice(0, 300) : null,
  };
}

async function callGemini({ apiKey, model, mimeType, base64 }) {
  const prompt = `Você analisa comprovantes exclusivamente para organização de documentos do Imposto de Renda brasileiro.

REGRAS CRÍTICAS:
- Extraia somente informação que esteja visível ou explicitamente escrita no documento.
- NÃO infira, complete, adivinhe ou fabrique CPF/CNPJ, valor, data, prestador ou descrição.
- Se um campo não puder ser lido com segurança, retorne null e confiança baixa.
- A classificação fiscal é apenas triagem auxiliar. Quando houver dúvida sobre dedutibilidade, use "review".
- Não declare que uma despesa é garantidamente dedutível.

Retorne JSON estrito no formato:
{
  "razao_social": string|null,
  "cnpj_cpf": string|null,
  "valor": number|null,
  "data": "YYYY-MM-DD"|null,
  "categoria": "Saúde"|"Educação"|"Previdência"|"Outros",
  "descricao": string|null,
  "confidence": {
    "razao_social": number,
    "cnpj_cpf": number,
    "valor": number,
    "data": number,
    "categoria": number,
    "descricao": number
  },
  "deductibility_status": "potential"|"review"|"non_deductible",
  "deductibility_reason": string|null
}

Confidence deve variar de 0 a 1 e refletir legibilidade do campo, não confiança geral no modelo.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error?.message || `Gemini ${model} retornou ${response.status}.`);
  }
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  return sanitizeResult(JSON.parse(text));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return json(res, 401, { error: 'Faça login para usar a análise automática.' });

  try {
    const identity = await verifyFirebaseToken(token);
    if (!identity?.localId) return json(res, 401, { error: 'Sessão inválida ou expirada.' });
    if (!takeRateLimit(identity.localId)) return json(res, 429, { error: 'Muitas análises em pouco tempo. Tente novamente em um minuto.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { dataUrl, mimeType } = body;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:') || typeof mimeType !== 'string') {
      return json(res, 400, { error: 'Arquivo inválido.' });
    }
    const base64 = dataUrl.split(',')[1];
    if (!base64 || base64.length > 4_000_000) return json(res, 413, { error: 'Arquivo grande demais para análise automática.' });

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return json(res, 503, { error: 'Análise automática ainda não foi configurada no servidor.' });

    const errors = [];
    for (const model of MODELS) {
      try {
        const result = await callGemini({ apiKey, model, mimeType, base64 });
        return json(res, 200, { ...result, model });
      } catch (error) {
        errors.push(`${model}: ${error.message}`);
      }
    }
    console.error('Gemini fallbacks exhausted:', errors);
    return json(res, 502, { error: 'A IA não conseguiu analisar este documento. Você ainda pode preencher os campos manualmente.' });
  } catch (error) {
    console.error(error);
    if (error.message === 'FIREBASE_AUTH_NOT_CONFIGURED') return json(res, 503, { error: 'Autenticação do backend não configurada.' });
    return json(res, 500, { error: 'Erro interno ao analisar o documento.' });
  }
}
