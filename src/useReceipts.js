import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from './services/firebase';
import { analyzeReceipt } from './services/analysis';
import { deleteAttachment, deleteGuestExpense, getAttachment, putGuestExpense, saveAttachment } from './localStore';
import { extensionForMime, optimizeForAnalysis } from './receiptFile';
import { expenseFingerprint, formatCurrency, formatDate, sha256 } from './format';

export const CATEGORIES = ['Saúde', 'Educação', 'Previdência', 'Outros'];
export const STATUSES = [
  { value: 'potential', label: 'Potencialmente dedutível' },
  { value: 'review', label: 'Revisar' },
  { value: 'non_deductible', label: 'Não dedutível' },
];

export const emptyReview = () => ({
  razao_social: '', cnpj_cpf: '', valor: '', data: '', categoria: 'Outros', descricao: '',
  dependentId: '', deductibilityStatus: 'review', deductibilityReason: '', confidence: {}, model: '',
});

const needsReview = (data) => ['razao_social', 'valor', 'data'].some((field) => !data[field] || (data.confidence?.[field] != null && data.confidence[field] < 0.8));

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

export function useReceipts(session) {
  const { user, isGuest, expenses, dependents, refreshGuest, navigate, back, setView } = session;
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [reviewData, setReviewData] = useState(emptyReview);
  const [scannedFile, setScannedFile] = useState(null);
  const [scannedFileType, setScannedFileType] = useState('');
  const [scannedFileName, setScannedFileName] = useState('');
  const [scannedHash, setScannedHash] = useState('');

  const resetScan = () => {
    setEditingId(null); setReviewData(emptyReview()); setScannedFile(null); setScannedFileType('');
    setScannedFileName(''); setScannedHash(''); setSelectedExpense(null); setSelectedAttachment(null);
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const optimized = await optimizeForAnalysis(file);
      setScannedFile(optimized.dataUrl); setScannedFileType(optimized.mimeType); setScannedFileName(optimized.originalName);
      setScannedHash(await sha256(optimized.dataUrl)); setEditingId(null); setReviewData(emptyReview()); navigate('review'); setAnalyzing(true);
      try {
        const result = await analyzeReceipt({ dataUrl: optimized.dataUrl, mimeType: optimized.mimeType, token: await user.getIdToken() });
        setReviewData({
          razao_social: result.razao_social || '', cnpj_cpf: result.cnpj_cpf || '', valor: result.valor ?? '', data: result.data || '',
          categoria: result.categoria || 'Outros', descricao: result.descricao || '', dependentId: '',
          deductibilityStatus: needsReview(result) ? 'review' : (result.deductibility_status || 'review'),
          deductibilityReason: result.deductibility_reason || '', confidence: result.confidence || {}, model: result.model || '',
        });
      } catch (error) {
        console.error(error);
        alert(`${error.message}\n\nO arquivo continua disponível e você pode preencher os dados manualmente.`);
      } finally { setAnalyzing(false); }
    } catch (error) { alert(error.message || 'Não foi possível preparar o arquivo.'); }
  };

  const persist = async (data) => {
    if (editingId) {
      if (isGuest) { await putGuestExpense({ id: editingId, ...data }); await refreshGuest(); }
      else await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editingId), data);
      return editingId;
    }
    if (isGuest) {
      const id = crypto.randomUUID(); await putGuestExpense({ id, ...data }); await refreshGuest(); return id;
    }
    return (await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), data)).id;
  };

  const saveExpense = async (addAnother = false) => {
    if (!reviewData.razao_social || !reviewData.valor || !reviewData.data) return alert('Preencha pelo menos prestador, valor e data.');
    const data = {
      ...reviewData,
      valor: Number(reviewData.valor),
      dependentId: reviewData.dependentId || '',
      dependentName: dependents.find((item) => item.id === reviewData.dependentId)?.name || 'Titular',
      fileHash: scannedHash || selectedExpense?.fileHash || '',
      hasAttachment: Boolean(scannedFile || selectedExpense?.hasAttachment),
      mimeType: scannedFileType || selectedExpense?.mimeType || '',
      originalFileName: scannedFileName || selectedExpense?.originalFileName || '',
      updatedAt: new Date().toISOString(),
      createdAt: selectedExpense?.createdAt || new Date().toISOString(),
      aiConfidence: Object.keys(reviewData.confidence || {}).length ? reviewData.confidence : (selectedExpense?.aiConfidence || {}),
      analysisModel: reviewData.model || selectedExpense?.analysisModel || '',
      documentStatus: needsReview(reviewData) ? 'review' : 'confirmed',
    };
    delete data.confidence;
    delete data.model;

    const fingerprint = expenseFingerprint(data);
    const duplicate = expenses.find((item) => item.id !== editingId && (
      (data.fileHash && item.fileHash === data.fileHash) ||
      (fingerprint !== '||0' && expenseFingerprint(item) === fingerprint)
    ));
    if (duplicate && !confirm(`Possível duplicidade com “${duplicate.razao_social}”, ${formatCurrency(duplicate.valor)} em ${formatDate(duplicate.data)}. Salvar mesmo assim?`)) return;

    setLoading(true);
    try {
      const id = await persist(data);
      if (scannedFile) await saveAttachment(id, scannedFile, scannedFileType, scannedFileName);
      resetScan();
      const next = addAnother ? 'scan' : 'dashboard';
      setView(next);
      window.history.replaceState({ view: next }, '', '');
    } catch (error) { console.error(error); alert('Erro ao salvar a despesa.'); }
    finally { setLoading(false); }
  };

  const openExpense = async (expense) => {
    setSelectedExpense(expense);
    setSelectedAttachment(await getAttachment(expense.id));
    navigate('detail');
  };

  const editExpense = async (expense) => {
    const attachment = await getAttachment(expense.id);
    setSelectedExpense(expense); setEditingId(expense.id);
    setReviewData({
      razao_social: expense.razao_social || '', cnpj_cpf: expense.cnpj_cpf || '', valor: expense.valor ?? '', data: expense.data || '',
      categoria: expense.categoria || 'Outros', descricao: expense.descricao || '', dependentId: expense.dependentId || '',
      deductibilityStatus: expense.deductibilityStatus || 'review', deductibilityReason: expense.deductibilityReason || '', confidence: {}, model: '',
    });
    setScannedFile(attachment?.dataUrl || null);
    setScannedFileType(attachment?.mimeType || expense.mimeType || '');
    setScannedFileName(attachment?.originalName || expense.originalFileName || '');
    setScannedHash(expense.fileHash || '');
    navigate('review');
  };

  const deleteExpense = async (expense) => {
    if (!confirm(`Excluir a despesa de ${expense.razao_social}? O comprovante local também será apagado.`)) return;
    try {
      if (isGuest) { await deleteGuestExpense(expense.id); await refreshGuest(); }
      else await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', expense.id));
      await deleteAttachment(expense.id);
      setSelectedExpense(null);
      back();
    } catch (error) { console.error(error); alert('Não foi possível excluir a despesa.'); }
  };

  const shareAttachment = async () => {
    if (!selectedExpense || !selectedAttachment?.dataUrl) return;
    const blob = await fetch(selectedAttachment.dataUrl).then((response) => response.blob());
    const ext = extensionForMime(selectedAttachment.mimeType || selectedExpense.mimeType);
    const name = `comprovante_${selectedExpense.data}_${selectedExpense.razao_social}.${ext}`.replace(/\s+/g, '_');
    const file = new File([blob], name, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: 'Comprovante IR', files: [file] }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    download(blob, name);
  };

  return {
    loading, analyzing, editingId, selectedExpense, selectedAttachment, reviewData, setReviewData,
    scannedFile, scannedFileType, scannedFileName, possibleHashDuplicate: scannedHash && expenses.find((item) => item.id !== editingId && item.fileHash === scannedHash),
    resetScan, upload, saveExpense, openExpense, editExpense, deleteExpense, shareAttachment,
  };
}
