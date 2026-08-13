# Recibos IR

Aplicativo web para organizar recibos, comprovantes e despesas ao longo do ano, com leitura assistida por IA e foco em conferência humana dos dados extraídos.

## Principais recursos

- **Captura por foto, imagem ou PDF** com extração de prestador, CPF/CNPJ, valor, data, categoria e descrição.
- **Sem inferência de campos fiscais:** se a IA não consegue ler um dado com segurança, o campo fica vazio para revisão.
- **Indicadores de confiança** destacam campos que merecem conferência.
- **Ano-base** aplicado ao dashboard, extrato e pacote de exportação.
- **Busca e filtros** por prestador, documento, descrição, categoria e beneficiário.
- **Detecção de possíveis duplicados** por arquivo e por combinação de CPF/CNPJ + data + valor.
- **Titular e dependentes** vinculados por identificador, evitando quebrar o histórico ao reorganizar cadastros.
- **Backup completo** com metadados e comprovantes locais.
- **Pacote do contador** em ZIP com CSV, JSON e comprovantes disponíveis no dispositivo.
- **Manifesto de instalação**, temas claro/escuro/sistema e interface responsiva para celular e desktop.
- **Autenticação completa** com Google, e-mail e senha, criação de conta e recuperação de acesso.

## Privacidade e armazenamento

Para usuários autenticados com Google, os **metadados** das despesas e dependentes são sincronizados pelo Firestore. Os **arquivos dos comprovantes** ficam no IndexedDB do dispositivo.

No **modo visitante**, despesas, dependentes e comprovantes ficam localmente no dispositivo. O Firebase Authentication anônimo é usado apenas para fornecer uma sessão autenticada ao endpoint de análise.

Durante a leitura automática, uma cópia otimizada do comprovante é enviada ao endpoint `/api/analyze`, que autentica a sessão e chama o Gemini. A chave Gemini não é usada pelo código do navegador.

Consulte também [`SECURITY.md`](SECURITY.md).

## IA

O backend tenta os modelos nesta ordem:

1. `gemini-3.6-flash`
2. `gemini-3.5-flash`

Se ambos falharem, o aplicativo mantém o comprovante aberto para preenchimento manual.

A classificação de situação da despesa é apenas um recurso de organização e não substitui a verificação das regras tributárias aplicáveis ao caso concreto.

## Configuração

Copie `.env.example` para `.env` no ambiente local e preencha as variáveis Firebase.

A variável `GEMINI_API_KEY` deve ser configurada **somente no ambiente server-side** que executa `/api/analyze`. Não versione chaves ou comprovantes reais.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
GEMINI_API_KEY=
```

Se o backend estiver hospedado em outro domínio, configure também `VITE_ANALYZE_API_URL` para apontar para o endpoint compatível.

## Firestore

As regras estão versionadas em `firestore.rules` e restringem os documentos de usuário ao próprio `request.auth.uid`. O arquivo `firebase.json` referencia essas regras para deploy via Firebase CLI.

## Desenvolvimento

```bash
npm install
npm run dev
```

O comando acima inicia o frontend Vite. Para testar a análise de IA localmente, execute também uma runtime serverless compatível com a rota `/api/analyze` ou configure `VITE_ANALYZE_API_URL`.

Validação do projeto:

```bash
npm run check
```

## Estrutura

- `src/useSession.js` — autenticação, tema, navegação e sincronização/local-first.
- `src/useReceipts.js` — captura, análise, revisão, duplicidade e comprovantes.
- `src/useLibraryActions.js` — dependentes, backup, restauração e pacote do contador.
- `src/localStore.js` — IndexedDB.
- `src/services/analysis.js` — cliente do endpoint seguro.
- `api/analyze.js` — integração server-side com Gemini e fallback de modelos.
- `firestore.rules` — regras de acesso aos dados.

Desenvolvido por Luis Ramos.
