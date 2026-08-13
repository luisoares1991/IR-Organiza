import { useEffect, useState } from 'react';
import { ArrowLeft, Cookie, ExternalLink, Scale, ShieldCheck } from 'lucide-react';
import { ANALYTICS_CONSENT_KEY, setAnalyticsConsent } from './privacy';

const UPDATED_AT = '13 de agosto de 2026';

export function PrivacyConsent() {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(ANALYTICS_CONSENT_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener('recibos-ir-open-privacy', reopen);
    return () => window.removeEventListener('recibos-ir-open-privacy', reopen);
  }, []);

  const choose = (value) => {
    setAnalyticsConsent(value);
    setOpen(false);
  };

  if (!open) return null;
  return <aside role="dialog" aria-label="Preferências de privacidade" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:bottom-5 sm:p-6">
    <div className="flex gap-4"><span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 sm:flex"><Cookie size={22}/></span><div className="min-w-0 flex-1"><h2 className="font-black">Sua privacidade, sua escolha</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">O armazenamento essencial mantém login, tema e dados locais. Com sua autorização, métricas do Google Analytics ajudam a entender o uso do app. Não usamos publicidade personalizada.</p><a href="/privacidade" className="mt-2 inline-block text-sm font-bold text-teal-700 underline underline-offset-4 dark:text-teal-300">Ler Política de Privacidade</a><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={() => choose('denied')} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold dark:border-slate-600">Somente essenciais</button><button onClick={() => choose('granted')} className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800">Aceitar métricas</button></div></div></div>
  </aside>;
}

const Section = ({ title, children }) => <section className="scroll-mt-6"><h2 className="text-xl font-black tracking-tight">{title}</h2><div className="mt-3 space-y-3 text-[15px] leading-7 text-slate-600 dark:text-slate-300">{children}</div></section>;
const ProviderLink = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-teal-700 underline underline-offset-4 dark:text-teal-300">{children}<ExternalLink size={13}/></a>;

function PrivacyPolicy() {
  return <>
    <Section title="1. Quem é responsável"><p>O Recibos IR é mantido por Luis André Ramos, responsável pelas decisões sobre o tratamento de dados realizado diretamente pelo aplicativo. Solicitações relacionadas à privacidade podem ser encaminhadas pelo canal “Entre em contato” em <ProviderLink href="https://luisandre.com.br/">luisandre.com.br</ProviderLink>.</p></Section>
    <Section title="2. Quais dados são tratados"><p><b>Conta:</b> identificador do Firebase, nome, e-mail, provedor de login, situação de verificação e, quando fornecida pelo Google, foto do perfil.</p><p><b>Recibos e organização fiscal:</b> prestador, CPF/CNPJ, valor, data, categoria, descrição, pessoa beneficiária, nome do arquivo, tipo do arquivo, hash para detecção de duplicidade, datas de criação e atualização, status de revisão e informações técnicas da análise por IA.</p><p><b>Dados potencialmente sensíveis:</b> os comprovantes podem revelar informações de saúde, educação, dependentes e outras informações pessoais. O usuário decide quais documentos incluir e deve ter legitimidade para tratar dados de terceiros ou dependentes.</p><p><b>Dados técnicos:</b> preferências de tema e privacidade, informações necessárias à sessão, telas acessadas, método de autenticação e dados técnicos normalmente processados pelo Google Analytics, como navegador, dispositivo, endereço IP e localização aproximada.</p></Section>
    <Section title="3. Onde os dados ficam"><p>Os arquivos originais de imagens e PDFs são armazenados no IndexedDB do dispositivo. Eles não são sincronizados com o Firestore. Excluir dados do navegador, remover o app ou trocar de aparelho pode apagar esses arquivos; por isso, o app oferece backup local.</p><p>Para contas autenticadas, os metadados dos recibos e dependentes são sincronizados no Google Firestore e vinculados ao identificador da conta. No modo visitante, recibos, dependentes e arquivos permanecem no dispositivo; uma sessão anônima do Firebase é criada para autorizar a análise automática.</p></Section>
    <Section title="4. Leitura por inteligência artificial"><p>Quando o usuário solicita a leitura automática, uma cópia otimizada do comprovante é transmitida ao endpoint seguro do Recibos IR e ao Google Gemini API para extração dos campos. O aplicativo não grava deliberadamente essa cópia em um banco próprio, mas o trânsito e o processamento técnico ocorrem na infraestrutura da Vercel e do Google, sujeitos aos termos aplicáveis desses fornecedores.</p><p>A análise pode conter erros. O resultado é assistência de organização e precisa ser conferido pelo usuário; não constitui orientação contábil, tributária ou jurídica.</p></Section>
    <Section title="5. Para que usamos os dados e bases legais"><p>Os dados são tratados para autenticar o usuário, prestar as funções solicitadas, sincronizar registros, detectar duplicidades, gerar backups e exportações, proteger o serviço contra abuso e cumprir obrigações legais. Conforme o caso, o tratamento se apoia na execução do serviço solicitado, em procedimentos relacionados ao uso do app, no legítimo interesse de segurança e melhoria e no cumprimento de obrigação legal.</p><p>As métricas não essenciais do Google Analytics dependem da escolha apresentada no app. A recusa não impede o uso das funções principais, e a escolha pode ser alterada em Configurações.</p></Section>
    <Section title="6. Compartilhamento e fornecedores"><p>O Recibos IR não comercializa dados pessoais. Dados são transmitidos apenas quando necessário à operação, especialmente para: <ProviderLink href="https://firebase.google.com/support/privacy">Google Firebase</ProviderLink> (autenticação e Firestore), <ProviderLink href="https://ai.google.dev/gemini-api/terms">Google Gemini API</ProviderLink> (leitura solicitada), <ProviderLink href="https://policies.google.com/privacy">Google Analytics</ProviderLink> (métricas autorizadas) e <ProviderLink href="https://vercel.com/legal/privacy-policy">Vercel</ProviderLink> (hospedagem e execução do endpoint).</p><p>Esses fornecedores podem processar dados fora do Brasil conforme suas infraestruturas e instrumentos contratuais de proteção de dados.</p></Section>
    <Section title="7. Retenção e exclusão"><p>Arquivos locais permanecem no dispositivo até serem excluídos no app, pelo navegador ou pelo sistema. Metadados sincronizados permanecem enquanto necessários à conta e ao serviço, até a exclusão pelo usuário ou atendimento de solicitação, ressalvadas obrigações legais, prevenção de fraude e exercício regular de direitos.</p><p>A exclusão de um recibo apaga seu metadado sincronizado e o arquivo local disponível naquele dispositivo. Para solicitar exclusão da conta e dos dados associados, use o canal de contato indicado nesta política. Dados mantidos exclusivamente no dispositivo precisam ser apagados pelo próprio usuário.</p></Section>
    <Section title="8. Direitos do titular"><p>Nos termos da LGPD, o titular pode solicitar confirmação do tratamento, acesso, correção, portabilidade quando aplicável, informação sobre compartilhamento, oposição, revisão de decisões automatizadas e eliminação ou anonimização quando cabível. A identidade poderá ser validada antes do atendimento para proteger a conta.</p></Section>
    <Section title="9. Segurança"><p>O app utiliza HTTPS, autenticação do Firebase, regras do Firestore que limitam o acesso ao identificador do usuário e processamento server-side da chave da IA. Nenhum sistema é imune a incidentes; medidas serão revistas conforme a evolução técnica e os riscos observados.</p></Section>
    <Section title="10. Crianças e dados de terceiros"><p>O app não é direcionado a crianças para uso autônomo. Um responsável pode organizar comprovantes de dependentes, desde que tenha autoridade e observe o melhor interesse do titular. Não inclua dados de terceiros sem necessidade ou base legítima.</p></Section>
    <Section title="11. Atualizações"><p>Esta política pode ser atualizada para refletir mudanças no aplicativo, nos fornecedores ou na legislação. Alterações relevantes serão destacadas no próprio serviço. A data da versão vigente aparece no início desta página.</p></Section>
  </>;
}

function TermsOfUse() {
  return <>
    <Section title="1. Aceitação"><p>Estes Termos regulam o uso do Recibos IR. Ao criar uma conta, entrar ou continuar como visitante, o usuário declara ter lido estes Termos e a Política de Privacidade. Se não concordar, não deve utilizar o serviço.</p></Section>
    <Section title="2. Finalidade do aplicativo"><p>O Recibos IR é uma ferramenta de organização de recibos e comprovantes relacionados ao Imposto de Renda. O app auxilia na captura, leitura, classificação, revisão e exportação de informações, mas não substitui contador, advogado, Receita Federal ou análise profissional do caso concreto.</p></Section>
    <Section title="3. Conta e acesso"><p>O usuário é responsável pela veracidade dos dados de cadastro, pela segurança do dispositivo e das credenciais e pelas atividades realizadas em sua conta. O acesso pode ocorrer por Google, e-mail e senha ou modo visitante. O modo visitante não oferece sincronização em nuvem e pode ser perdido com a limpeza do dispositivo.</p></Section>
    <Section title="4. Conteúdo enviado pelo usuário"><p>O usuário mantém seus direitos sobre documentos e dados inseridos e concede apenas a autorização necessária para processá-los e entregar as funções solicitadas. É responsabilidade do usuário ter legitimidade para armazenar dados próprios, de dependentes ou de terceiros e não enviar conteúdo ilícito, fraudulento ou que viole direitos.</p></Section>
    <Section title="5. Inteligência artificial e conferência"><p>A leitura automática pode omitir, interpretar incorretamente ou classificar de forma inadequada informações. Campos extraídos, indicadores de confiança e avaliação de possível dedutibilidade são auxiliares. O usuário deve conferir cada registro e buscar orientação qualificada quando necessário.</p></Section>
    <Section title="6. Uso permitido"><p>É proibido tentar invadir, sobrecarregar, contornar limites, obter acesso a dados alheios, explorar vulnerabilidades, automatizar uso abusivo, introduzir código malicioso ou utilizar o serviço para fraude, falsificação documental ou violação de direitos.</p></Section>
    <Section title="7. Armazenamento, backup e disponibilidade"><p>Os comprovantes são mantidos localmente no dispositivo, enquanto metadados de contas autenticadas podem ser sincronizados. O usuário deve manter backups adequados. O serviço pode sofrer indisponibilidades, alterações técnicas ou interrupções de fornecedores externos.</p></Section>
    <Section title="8. Propriedade intelectual"><p>A marca, identidade visual, interface, textos próprios e código do serviço são protegidos pela legislação aplicável, sem prejuízo das licenças de componentes de terceiros. Estes Termos não transferem direitos de propriedade intelectual ao usuário.</p></Section>
    <Section title="9. Responsabilidades"><p>Na extensão permitida pela legislação, o responsável pelo app não responde por decisões fiscais tomadas sem conferência, perda de arquivos mantidos apenas no dispositivo, indisponibilidade de terceiros ou danos decorrentes de uso contrário a estes Termos. Nada nesta cláusula afasta direitos obrigatórios do consumidor ou responsabilidades que não possam ser legalmente limitadas.</p></Section>
    <Section title="10. Suspensão e encerramento"><p>O acesso pode ser restringido em caso de abuso, risco à segurança, fraude ou violação destes Termos. O usuário pode deixar de usar o app e solicitar a exclusão de sua conta e dos dados sincronizados pelo canal indicado na Política de Privacidade.</p></Section>
    <Section title="11. Alterações"><p>Funcionalidades e estes Termos podem ser atualizados. Mudanças relevantes serão comunicadas no serviço, e a continuidade do uso após a entrada em vigor estará sujeita à versão atualizada, respeitados os direitos legais aplicáveis.</p></Section>
    <Section title="12. Lei aplicável e contato"><p>Aplicam-se as leis da República Federativa do Brasil. Eventuais controvérsias observarão o foro competente definido pela legislação, inclusive o foro do domicílio do consumidor quando aplicável. Para dúvidas, utilize o canal “Entre em contato” em <ProviderLink href="https://luisandre.com.br/">luisandre.com.br</ProviderLink>.</p></Section>
  </>;
}

export function LegalPage({ type }) {
  const privacy = type === 'privacy';
  useEffect(() => {
    const title = privacy ? 'Política de Privacidade | Recibos IR' : 'Termos de Uso | Recibos IR';
    const description = privacy ? 'Saiba como o Recibos IR trata dados pessoais, comprovantes, autenticação, IA e métricas.' : 'Conheça as regras de uso do Recibos IR e os limites da assistência de organização fiscal.';
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://ir-app.luisandre.com.br/${privacy ? 'privacidade' : 'termos'}`);
  }, [privacy]);

  return <main className="min-h-screen bg-[#f5f8f7] px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 sm:py-10"><article className="mx-auto max-w-3xl"><header className="rounded-[28px] bg-gradient-to-br from-teal-900 via-teal-800 to-[#075569] p-6 text-white shadow-xl sm:p-9"><a href="/" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold ring-1 ring-white/15"><ArrowLeft size={17}/>Voltar ao app</a><div className="mt-8 flex items-start gap-4"><span className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">{privacy ? <ShieldCheck size={28}/> : <Scale size={28}/>}</span><div><p className="text-sm font-bold text-teal-100">Recibos IR</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{privacy ? 'Política de Privacidade' : 'Termos de Uso'}</h1><p className="mt-3 text-sm text-teal-100">Versão 1.0 · última atualização em {UPDATED_AT}</p></div></div></header><div className="mt-6 space-y-9 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-9">{privacy ? <PrivacyPolicy/> : <TermsOfUse/>}<footer className="border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-700"><p>Documento relacionado: <a href={privacy ? '/termos' : '/privacidade'} className="font-bold text-teal-700 underline underline-offset-4 dark:text-teal-300">{privacy ? 'Termos de Uso' : 'Política de Privacidade'}</a></p><p className="mt-2">Referências: <ProviderLink href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm">LGPD</ProviderLink> e <ProviderLink href="https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf">Guia de Cookies da ANPD</ProviderLink>.</p></footer></div></article></main>;
}
