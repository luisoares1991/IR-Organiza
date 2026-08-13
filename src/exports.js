import { strToU8, zipSync } from 'fflate';
import { dataUrlToBytes, extensionForMime } from './receiptFile';
import { escapeCsv } from './format';
import { getAttachment } from './localStore';

function safeName(value = '') {
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'comprovante';
}

export async function buildFullBackup(expenses, dependents) {
  const attachments = {};
  for (const expense of expenses) {
    const attachment = await getAttachment(expense.id);
    if (attachment?.dataUrl) attachments[expense.id] = attachment;
  }
  return {
    format: 'ir-organiza-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    expenses,
    dependents,
    attachments,
  };
}

export async function buildAccountantPack(expenses, dependents, year) {
  const selected = expenses.filter((expense) => String(expense.data || '').startsWith(`${year}-`));
  const rows = [
    ['Data', 'Prestador', 'CPF/CNPJ', 'Valor', 'Categoria', 'Situação', 'Beneficiário', 'Descrição', 'Comprovante local'].map(escapeCsv).join(','),
  ];
  const zipEntries = {};
  let missing = 0;

  for (const expense of selected) {
    const attachment = await getAttachment(expense.id);
    const dependent = dependents.find((item) => item.id === expense.dependentId)?.name || expense.dependentName || expense.dependente || 'Titular';
    rows.push([
      expense.data, expense.razao_social, expense.cnpj_cpf, expense.valor, expense.categoria,
      expense.deductibilityStatus || 'review', dependent, expense.descricao, attachment?.dataUrl ? 'Sim' : 'Não',
    ].map(escapeCsv).join(','));

    if (attachment?.dataUrl) {
      const ext = extensionForMime(attachment.mimeType || expense.mimeType);
      const fileName = `${expense.data || 'sem-data'}_${safeName(expense.razao_social)}_${Number(expense.valor || 0).toFixed(2).replace('.', '-')}.${ext}`;
      zipEntries[`comprovantes/${fileName}`] = dataUrlToBytes(attachment.dataUrl);
    } else if (expense.hasAttachment) missing += 1;
  }

  zipEntries['despesas.csv'] = strToU8(`\ufeff${rows.join('\r\n')}`);
  zipEntries['dados.json'] = strToU8(JSON.stringify({ year, exportedAt: new Date().toISOString(), expenses: selected, dependents }, null, 2));
  zipEntries['LEIA-ME.txt'] = strToU8([
    `IR Organiza — pacote do ano-base ${year}`, '', `${selected.length} registro(s) incluído(s).`,
    missing ? `${missing} comprovante(s) constam no cadastro, mas não estão armazenados neste dispositivo.` : 'Todos os comprovantes locais disponíveis foram incluídos.',
    '', 'Os rótulos de dedutibilidade são auxiliares e não substituem conferência das regras fiscais aplicáveis ao caso concreto.',
  ].join('\r\n'));

  const bytes = zipSync(zipEntries, { level: 6 });
  return { blob: new Blob([bytes], { type: 'application/zip' }), count: selected.length, missing };
}
