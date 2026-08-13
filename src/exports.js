import { dataUrlToBytes, extensionForMime } from './receiptFile';
import { escapeCsv } from './format';
import { getAttachment } from './localStore';

const encoder = new TextEncoder();
const u16 = (n) => Uint8Array.of(n & 255, (n >>> 8) & 255);
const u32 = (n) => Uint8Array.of(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let count = 0;
  for (const [name, value] of Object.entries(entries)) {
    const nameBytes = encoder.encode(name);
    const data = typeof value === 'string' ? encoder.encode(value) : value;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data,
    ]);
    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
    count += 1;
  }
  const central = concat(centralParts);
  const end = concat([u32(0x06054b50), u16(0), u16(0), u16(count), u16(count), u32(central.length), u32(offset), u16(0)]);
  return concat([...localParts, central, end]);
}

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
  return { format: 'ir-organiza-backup', version: 2, exportedAt: new Date().toISOString(), expenses, dependents, attachments };
}

export async function buildAccountantPack(expenses, dependents, year) {
  const selected = expenses.filter((expense) => String(expense.data || '').startsWith(`${year}-`));
  const rows = [['Data', 'Prestador', 'CPF/CNPJ', 'Valor', 'Categoria', 'Situação', 'Beneficiário', 'Descrição', 'Comprovante local'].map(escapeCsv).join(',')];
  const entries = {};
  let missing = 0;

  for (const expense of selected) {
    const attachment = await getAttachment(expense.id);
    const dependent = dependents.find((item) => item.id === expense.dependentId)?.name || expense.dependentName || expense.dependente || 'Titular';
    rows.push([expense.data, expense.razao_social, expense.cnpj_cpf, expense.valor, expense.categoria, expense.deductibilityStatus || 'review', dependent, expense.descricao, attachment?.dataUrl ? 'Sim' : 'Não'].map(escapeCsv).join(','));
    if (attachment?.dataUrl) {
      const ext = extensionForMime(attachment.mimeType || expense.mimeType);
      const fileName = `${expense.data || 'sem-data'}_${safeName(expense.razao_social)}_${Number(expense.valor || 0).toFixed(2).replace('.', '-')}.${ext}`;
      entries[`comprovantes/${fileName}`] = dataUrlToBytes(attachment.dataUrl);
    } else if (expense.hasAttachment) missing += 1;
  }

  entries['despesas.csv'] = `\ufeff${rows.join('\r\n')}`;
  entries['dados.json'] = JSON.stringify({ year, exportedAt: new Date().toISOString(), expenses: selected, dependents }, null, 2);
  entries['LEIA-ME.txt'] = [`IR Organiza — pacote do ano-base ${year}`, '', `${selected.length} registro(s) incluído(s).`, missing ? `${missing} comprovante(s) constam no cadastro, mas não estão armazenados neste dispositivo.` : 'Todos os comprovantes locais disponíveis foram incluídos.', '', 'Os rótulos de dedutibilidade são auxiliares e não substituem conferência das regras fiscais aplicáveis ao caso concreto.'].join('\r\n');

  const bytes = makeZip(entries);
  return { blob: new Blob([bytes], { type: 'application/zip' }), count: selected.length, missing };
}
