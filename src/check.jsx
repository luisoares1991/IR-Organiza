import React from 'react';
import { AlertTriangle, Camera, FileText } from 'lucide-react';
import { Button, Card, ConfidenceHint } from './ui';
import { CATEGORIES, STATUSES } from './useReceipts';
import { formatDate } from './format';

const css = 'w-full rounded-xl border border-slate-200 bg-white p-3.5 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900';
const fields = [['valor','Valor (R$)','number'],['data','Data','date'],['razao_social','Prestador','text'],['cnpj_cpf','CPF/CNPJ do prestador','text'],['descricao','Descrição','text']];

export function ReviewScreen({ app, header }) {
  const set = (key, value) => app.setReviewData({ ...app.reviewData, [key]: value });
  if (app.analyzing) return <div className="pb-12">{header('Revisar leitura')}<Card className="p-12 text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-700" /><b className="text-lg">Lendo o comprovante com IA…</b><p className="mt-1 text-sm text-slate-500">Campos incertos serão marcados para sua conferência.</p></Card></div>;
  return <div className="pb-12">{header(app.editingId ? 'Editar despesa' : 'Revisar leitura')}
    {app.possibleHashDuplicate && <div className="mb-4 flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle size={18}/><span><b>Possível duplicado.</b> Registro semelhante em {formatDate(app.possibleHashDuplicate.data)}.</span></div>}
    {app.scannedFile && <Card className="mb-4 flex min-h-32 items-center justify-center overflow-hidden">{app.scannedFileType === 'application/pdf' ? <div className="p-7 text-center"><FileText className="mx-auto text-red-500"/><p className="mt-2 text-sm">{app.scannedFileName || 'PDF'}</p></div> : <img src={app.scannedFile} alt="Comprovante" className="max-h-52 w-full object-contain"/>}</Card>}
    <div className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black">Confira os dados</h3><p className="text-sm text-slate-500">Ajuste qualquer campo antes de confirmar.</p></div><span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">Lido por IA ✦</span></div><Card className="p-4"><p className="mb-2 text-sm font-bold">Categoria</p><div className="flex flex-wrap gap-2">{CATEGORIES.map((item)=><button key={item} onClick={()=>set('categoria',item)} className={`rounded-full px-3 py-2 text-sm font-bold ${app.reviewData.categoria===item?'bg-teal-700 text-white':'bg-slate-100 dark:bg-slate-800'}`}>{item}</button>)}</div></Card>
    {fields.map(([key,label,type])=><label key={key} className="block text-sm font-semibold">{label}<ConfidenceHint value={app.reviewData.confidence?.[key]}/><input type={type} step={key==='valor'?'0.01':undefined} inputMode={key==='cnpj_cpf'?'numeric':undefined} value={app.reviewData[key]} onChange={(e)=>set(key,e.target.value)} className={`${css} mt-1`}/></label>)}
    <label className="block text-sm font-semibold">Beneficiário<select value={app.reviewData.dependentId} onChange={(e)=>set('dependentId',e.target.value)} className={`${css} mt-1`}><option value="">Titular</option>{app.dependents.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <Card className="p-4"><label className="text-sm font-bold">Situação para organização<select value={app.reviewData.deductibilityStatus} onChange={(e)=>set('deductibilityStatus',e.target.value)} className={`${css} mt-2`}>{STATUSES.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{app.reviewData.deductibilityReason&&<p className="mt-3 text-xs text-slate-500">Triagem da IA: {app.reviewData.deductibilityReason}</p>}<p className="mt-3 text-[11px] text-slate-500">Organização auxiliar; confira as regras fiscais aplicáveis.</p></Card>
    <Button onClick={()=>app.saveExpense(false)} disabled={app.loading} className="w-full py-4">{app.loading?'Salvando…':app.editingId?'Salvar alterações':'Confirmar e salvar'}</Button>{!app.editingId&&<Button onClick={()=>app.saveExpense(true)} disabled={app.loading} variant="secondary" className="w-full"><Camera size={18}/>Salvar e fotografar outro</Button>}</div>
  </div>;
}
