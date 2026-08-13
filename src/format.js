export const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(Number(value || 0));

export function formatDate(dateString) {
  if (!dateString) return '—';
  const [year, month, day] = String(dateString).split('-');
  return year && month && day ? `${day}/${month}/${year}` : String(dateString);
}

export function normalizeDocument(value = '') {
  return String(value).replace(/\D/g, '');
}

export function normalizeMoney(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

export function expenseFingerprint(expense) {
  const doc = normalizeDocument(expense.cnpj_cpf);
  const date = expense.data || '';
  const cents = Math.round(Number(expense.valor || 0) * 100);
  return `${doc}|${date}|${cents}`;
}

export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
