import React from 'react';
import { FileText, Share2, Trash2 } from 'lucide-react';
import { Button, Card, CategoryBadge, StatusBadge } from './ui';
import { formatCurrency, formatDate } from './format';

export function DetailScreen({ app, header }) {
  const expense = app.selectedExpense;
  if (!expense) return null;
  const attachment = app.selectedAttachment;
  return <div className="pb-12">{header('Detalhes')}<div className="space-y-4">
    {attachment?.dataUrl ? <Card className="overflow-hidden"><div className="flex min-h-40 items-center justify-center bg-slate-100 dark:bg-slate-950">{(attachment.mimeType || expense.mimeType)==='application/pdf'?<div className="p-10 text-center"><FileText className="mx-auto text-red-500" size={42}/><p className="mt-2 font-bold">PDF armazenado neste dispositivo</p></div>:<img src={attachment.dataUrl} alt="Comprovante" className="max-h-96 w-full object-contain"/>}</div><button onClick={app.shareAttachment} className="flex w-full items-center justify-center gap-2 border-t border-slate-200 p-3 text-sm font-bold text-blue-600 dark:border-slate-800"><Share2 size={17}/>Compartilhar ou baixar</button></Card> : expense.hasAttachment ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><b>Comprovante indisponível neste dispositivo.</b><br/>Os metadados sincronizam entre aparelhos, mas o arquivo permanece local.</div> : null}
    <Card className="space-y-5 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Prestador</p><p className="mt-1 text-xl font-black">{expense.razao_social}</p><p className="text-sm text-slate-500">{expense.cnpj_cpf || 'CPF/CNPJ não informado'}</p></div><div className="grid grid-cols-2 gap-4"><div><p className="text-xs font-bold uppercase text-slate-400">Valor</p><p className="mt-1 text-xl font-black">{formatCurrency(expense.valor)}</p></div><div><p className="text-xs font-bold uppercase text-slate-400">Data</p><p className="mt-1 font-bold">{formatDate(expense.data)}</p></div></div><div className="flex flex-wrap gap-2"><CategoryBadge category={expense.categoria}/><StatusBadge status={expense.deductibilityStatus || 'review'}/></div><div><p className="text-xs font-bold uppercase text-slate-400">Beneficiário</p><p className="mt-1 font-semibold">{expense.dependentName || expense.dependente || 'Titular'}</p></div>{expense.descricao&&<div><p className="text-xs font-bold uppercase text-slate-400">Descrição</p><p className="mt-1">{expense.descricao}</p></div>}</Card>
    <div className="grid grid-cols-2 gap-3"><Button onClick={()=>app.editExpense(expense)} variant="secondary">Editar</Button><Button onClick={()=>app.deleteExpense(expense)} variant="danger"><Trash2 size={18}/>Excluir</Button></div>
  </div></div>;
}
