const DEFAULT_ENDPOINT = '/api/analyze';

export async function analyzeReceipt({ dataUrl, mimeType, token }) {
  const endpoint = import.meta.env.VITE_ANALYZE_API_URL || DEFAULT_ENDPOINT;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ dataUrl, mimeType }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível analisar o comprovante.');
  }
  return payload;
}
