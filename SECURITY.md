# Segurança e privacidade

## Chaves e segredos

A chave do Gemini deve existir somente no ambiente server-side como `GEMINI_API_KEY`. Não coloque uma chave Gemini em código do navegador nem em arquivos versionados.

As variáveis `VITE_FIREBASE_*` identificam o aplicativo web Firebase. A proteção dos registros depende da autenticação e das regras versionadas em `firestore.rules`.

## Comprovantes

Imagens e PDFs são armazenados no IndexedDB do próprio dispositivo. Durante a leitura automática, uma cópia otimizada do documento é enviada ao endpoint `/api/analyze`, que autentica a sessão e encaminha o conteúdo ao Gemini. O IR Organiza não grava esse arquivo no Firestore.

## Modo visitante

O modo visitante usa Firebase Authentication anônimo para obter uma sessão capaz de chamar o endpoint de análise. Despesas, dependentes e comprovantes criados nesse modo são mantidos localmente e não são gravados no Firestore.

## Relato de vulnerabilidades

Não abra issues públicas contendo dados pessoais, chaves ou comprovantes reais. Revogue imediatamente qualquer segredo que tenha sido publicado acidentalmente.
