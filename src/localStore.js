const DB_NAME = 'IROrganiza_Images';
const DB_VERSION = 2;
const ATTACHMENTS = 'receipt_files';
const GUEST_EXPENSES = 'guest_expenses';
const GUEST_DEPENDENTS = 'guest_dependents';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Erro ao abrir banco local.'));
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(ATTACHMENTS)) database.createObjectStore(ATTACHMENTS);
      if (!database.objectStoreNames.contains(GUEST_EXPENSES)) database.createObjectStore(GUEST_EXPENSES, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(GUEST_DEPENDENTS)) database.createObjectStore(GUEST_DEPENDENTS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function run(storeName, mode, action) {
  return openDb().then((database) => new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Erro no armazenamento local.'));
    tx.oncomplete = () => database.close();
  }));
}

export async function saveAttachment(id, dataUrl, mimeType = '', originalName = '') {
  return run(ATTACHMENTS, 'readwrite', (store) => store.put({ dataUrl, mimeType, originalName }, id));
}

export async function getAttachment(id) {
  const value = await run(ATTACHMENTS, 'readonly', (store) => store.get(id));
  if (!value) return null;
  if (typeof value === 'string') return { dataUrl: value, mimeType: value.match(/^data:([^;]+)/)?.[1] || '', originalName: '' };
  return value;
}

export async function deleteAttachment(id) {
  return run(ATTACHMENTS, 'readwrite', (store) => store.delete(id));
}

export async function listGuestExpenses() {
  return run(GUEST_EXPENSES, 'readonly', (store) => store.getAll());
}

export async function putGuestExpense(expense) {
  return run(GUEST_EXPENSES, 'readwrite', (store) => store.put(expense));
}

export async function deleteGuestExpense(id) {
  return run(GUEST_EXPENSES, 'readwrite', (store) => store.delete(id));
}

export async function listGuestDependents() {
  return run(GUEST_DEPENDENTS, 'readonly', (store) => store.getAll());
}

export async function putGuestDependent(dependent) {
  return run(GUEST_DEPENDENTS, 'readwrite', (store) => store.put(dependent));
}

export async function deleteGuestDependent(id) {
  return run(GUEST_DEPENDENTS, 'readwrite', (store) => store.delete(id));
}
