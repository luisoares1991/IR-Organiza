🦁 IR Organiza

Seu assistente pessoal, movido a Inteligência Artificial, para organizar recibos e despesas dedutíveis do Imposto de Renda.

📱 Sobre o Projeto

O IR Organiza é uma Web App (PWA) desenvolvida para resolver a dor de cabeça de organizar a papelada para a declaração anual de imposto.

Diferente de planilhas manuais, o app utiliza a IA do Google Gemini para ler fotos de recibos e notas fiscais, extraindo automaticamente:

CNPJ/CPF do prestador

Razão Social

Valor e Data

Categoria (Saúde, Educação, etc.)

✨ Principais Funcionalidades

📸 Leitura Inteligente: Basta tirar uma foto ou subir um PDF. A IA preenche os dados para você.

📂 Armazenamento Híbrido (Privacidade):

Os dados (valores, datas) são salvos na nuvem (Firebase) para acesso em qualquer lugar.

As imagens dos recibos são salvas localmente no seu dispositivo (IndexedDB), garantindo privacidade total e economia de armazenamento.

👶 Gestão de Dependentes: Vincule despesas a dependentes específicos automaticamente.

📊 Dashboard Financeiro: Acompanhe em tempo real o total dedutível acumulado no ano.

🌙 Modo Escuro/Claro: Interface adaptável e moderna.

💾 Backup & Restore: Exporte seus dados para JSON para segurança ou migração.

📱 Instalação Nativa: Funciona como um app nativo no Android e iOS (Adicionar à Tela de Início).

⚙️ Configuração (Obrigatório)

Para rodar este projeto, você precisará das suas próprias chaves de API (é gratuito). O projeto utiliza variáveis de ambiente para segurança.

Crie um arquivo chamado .env na raiz do projeto.

Cole o seguinte conteúdo dentro dele:

VITE_FIREBASE_API_KEY=sua_chave_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_id_numerico
VITE_FIREBASE_APP_ID=seu_app_id
VITE_GEMINI_API_KEY=sua_chave_gemini_aqui


Onde conseguir as chaves?

Firebase: Crie um projeto no Firebase Console. Vá em Configurações do Projeto > Geral > Seus aplicativos.

Gemini AI: Gere uma chave gratuita no Google AI Studio.

🚀 Como rodar localmente

Clone o repositório:

git clone [https://github.com/luisoares1991/IR-Organiza.git](https://github.com/luisoares1991/IR-Organiza.git)


Instale as dependências:

cd IR-Organiza
npm install


Configure o arquivo .env (conforme explicado acima).

Rode o servidor:

npm run dev


🤝 Contribua

Este é um projeto Open Source. Sinta-se livre para abrir Issues, sugerir melhorias ou enviar Pull Requests. A ideia é criar uma ferramenta útil para todos os brasileiros.

☕ Apoie o Desenvolvedor

Este aplicativo é disponibilizado gratuitamente, sem anúncios e com código aberto. Se ele te ajudou a economizar tempo (e talvez dinheiro no Leão 🦁), considere apoiar o desenvolvimento pagando um café!

<a href="https://tipa.ai/agilizei" target="_blank">
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Apoiar%2520pelo%2520Tipa%2520A%C3%AD-FF0050%3Fstyle%3Dfor-the-badge%26logo%3Dko-fi%26logoColor%3Dwhite" alt="Apoie o projeto" />
</a>

Desenvolvido com ❤️ por Luis Ramos