import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from './services/firebase';
import { deleteGuestDependent, putGuestDependent, putGuestExpense, saveAttachment } from './localStore';
import { buildAccountantPack, buildFullBackup } from './exports';
import { expenseFingerprint } from './format';

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useLibraryActions(session) {
  const { user, isGuest, expenses, dependents, filterYear, refreshGuest } = session;
  const [loading, setLoading] = useState(false);
  const [newDependentName, setNewDependentName] = useState('');

  const addDependent = async () => {
    const name = newDependentName.trim();
    if (!name) return;
    if (dependents.some((item) => item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
      alert('Esse dependente já está cadastrado.');
      return;
    }
    try {
      if (isGuest) await putGuestDependent({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
      else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'), { name, createdAt: new Date().toISOString() });
      setNewDependentName('');
      if (isGuest) await refreshGuest();
    } catch (error) { console.error(error); alert('Não foi possível adicionar o dependente.'); }
  };

  const deleteDependent = async (dependent) => {
    const linked = expenses.filter((item) => item.dependentId === dependent.id || (!item.dependentId && item.dependente === dependent.name));
    const warning = linked.length ? `Há ${linked.length} despesa(s) vinculada(s). Elas serão movidas para Titular. Continuar?` : `Excluir ${dependent.name}?`;
    if (!confirm(warning)) return;
    try {
      for (const expense of linked) {
        const updated = { ...expense, dependentId: '', dependentName: 'Titular', dependente: 'Titular', updatedAt: new Date().toISOString() };
        delete updated.id;
        if (isGuest) await putGuestExpense({ id: expense.id, ...updated });
        else await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', expense.id), updated);
      }
      if (isGuest) { await deleteGuestDependent(dependent.id); await refreshGuest(); }
      else await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'dependents', dependent.id));
    } catch (error) { console.error(error); alert('Não foi possível excluir o dependente.'); }
  };

  const backup = async () => {
    setLoading(true);
    try {
      const payload = await buildFullBackup(expenses, dependents);
      download(new Blob([JSON.stringify(payload)], { type: 'application/json' }), `ir-organiza-backup-${new Date().toISOString().slice(0, 10)}.irbackup.json`);
    } catch (error) { console.error(error); alert('Não foi possível gerar o backup.'); }
    finally { setLoading(false); }
  };

  const accountantPack = async () => {
    setLoading(true);
    try {
      const result = await buildAccountantPack(expenses, dependents, filterYear);
      download(result.blob, `IR-${filterYear}-pacote-contador.zip`);
      if (result.missing) alert(`Pacote criado. ${result.missing} comprovante(s) não estavam disponíveis neste dispositivo e não puderam ser incluídos.`);
    } catch (error) { console.error(error); alert('Não foi possível gerar o pacote.'); }
    finally { setLoading(false); }
  };

  const restore = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !confirm('Restaurar este backup? Registros equivalentes serão ignorados para evitar duplicidade.')) return;
    setLoading(true);
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.expenses)) throw new Error('Backup inválido.');
      const fingerprints = new Set(expenses.map(expenseFingerprint));
      const depByName = new Map(dependents.map((item) => [item.name.toLocaleLowerCase('pt-BR'), item.id]));
      let imported = 0;
      let skipped = 0;

      for (const incoming of Array.isArray(payload.dependents) ? payload.dependents : []) {
        const name = String(incoming.name || '').trim();
        const key = name.toLocaleLowerCase('pt-BR');
        if (!name || depByName.has(key)) continue;
        if (isGuest) {
          const id = crypto.randomUUID();
          await putGuestDependent({ id, name, createdAt: incoming.createdAt || new Date().toISOString() });
          depByName.set(key, id);
        } else {
          const created = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'), { name, createdAt: incoming.createdAt || new Date().toISOString() });
          depByName.set(key, created.id);
        }
      }

      for (const incoming of payload.expenses) {
        const fingerprint = expenseFingerprint(incoming);
        if (fingerprints.has(fingerprint)) { skipped += 1; continue; }
        const dependentName = incoming.dependentName || incoming.dependente || 'Titular';
        const oldId = incoming.id;
        const data = {
          ...incoming,
          dependentId: dependentName === 'Titular' ? '' : (depByName.get(String(dependentName).toLocaleLowerCase('pt-BR')) || ''),
          dependentName,
          restoredAt: new Date().toISOString(),
        };
        delete data.id;
        let id;
        if (isGuest) { id = crypto.randomUUID(); await putGuestExpense({ id, ...data }); }
        else id = (await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), data)).id;
        const attachment = payload.attachments?.[oldId];
        if (attachment?.dataUrl) await saveAttachment(id, attachment.dataUrl, attachment.mimeType, attachment.originalName);
        fingerprints.add(fingerprint);
        imported += 1;
      }
      if (isGuest) await refreshGuest();
      alert(`Restauração concluída: ${imported} importado(s), ${skipped} duplicado(s) ignorado(s).`);
    } catch (error) { console.error(error); alert(error.message || 'Backup inválido.'); }
    finally { setLoading(false); }
  };

  return { loading, newDependentName, setNewDependentName, addDependent, deleteDependent, backup, accountantPack, restore };
}
