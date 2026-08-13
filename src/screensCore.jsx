import React from 'react';
import { Camera, FileText, Package, Plus, Search, Settings, Upload, Users, X } from 'lucide-react';
import { Card, StatusBadge, CategoryBadge } from './ui';
import { formatCurrency, formatDate } from './format';

export function LoginScreen({ app }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm text-center">
        <img src="/logo.png" alt="IR Organiza" className="mx-auto mb-6 h-24 w-24 rounded-3xl object-cover shadow-xl" />
        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">IR Organiza</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Seus comprovantes organizados durante o ano, sem correria na época da declaração.</p>
        <button onClick={app.login} className="mt-8 w-full rounded-xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-600/15">Entrar com Google</button>
        <button onClick={app.guestLogin} className="mt-4 text-sm font-semibold text-slate-600 underline underline-offset-4 dark:text-slate-300">Usar somente neste dispositivo</button>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <strong className="text-slate-700 dark:text-slate-200">Privacidade:</strong> o comprovante fica armazenado localmente. Durante a leitura automática, uma cópia temporária é enviada ao serviço de IA e não é salva pelo IR Organiza na nuvem.
        </div>
      </div>
    </main>
  );
}

export function DashboardScreen({ app }) {
  const potential = app.yearExpenses.filter((item) => item.deductibilityStatus === 'potential').reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const registered = app.yearExpenses.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const review = app.yearExpenses.filter((item) => (item.deductibilityStatus || 'review') === 'review').length;
  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-start justify-between pt-2">
        <div><p className="text-sm font-semibold text-blue-600">IR Organiza</p><h1 className="mt-1 text-2xl font-black tracking-tight">Olá, {app.user.displayName?.split(' ')[0] || 'visitante'}</h1><p className="text-sm text-slate-500">Ano-base {app.filterYear}</p></div>
        <button onClick={() => app.navigate('settings')} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><Settings size={20} /></button>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1">{app.years.map((year) => <button key={year} onClick={() => app.setFilterYear(year)} className={`rounded-full px-4 py-2 text-sm font-bold ${app.filterYear === year ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}>{year}</button>)}</div>
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-xl shadow-blue-700/15">
        <p className="text-sm font-semibold text-blue-100">Potencialmente dedutível</p><div className="mt-1 text-4xl font-black tracking-tight">{formatCurrency(potential)}</div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-blue-100">Total registrado</p><p className="mt-1 font-bold">{formatCurrency(registered)}</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-blue-100">Precisam de revisão</p><p className="mt-1 font-bold">{review} item(ns)</p></div></div>
        <p className="mt-4 text-[11px] leading-4 text-blue-100">Classificação auxiliar. A dedutibilidade efetiva depende das regras fiscais aplicáveis ao seu caso.</p>
      </Card>
      <button onClick={() => { app.resetScan(); app.navigate('scan'); }} className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800">
        <div><p className="text-lg font-black">Adicionar comprovante</p><p className="mt-1 text-sm text-slate-500">Foto, imagem ou PDF — a IA preenche o resto.</p></div><div className="rounded-2xl bg-blue-600 p-3 text-white"><Plus size={24} /></div>
      </button>
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => app.navigate('list')} className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"><FileText className="mx-auto mb-2 text-blue-600" size={22} /><span className="text-xs font-bold">Extrato</span></button>
        <button onClick={() => app.navigate('dependents')} className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"><Users className="mx-auto mb-2 text-blue-600" size={22} /><span className="text-xs font-bold">Pessoas</span></button>
        <button onClick={app.accountantPack} disabled={app.loading} className="rounded-2xl border border-slate-200 bg-white p-4 text-center disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"><Package className="mx-auto mb-2 text-blue-600" size={22} /><span className="text-xs font-bold">Contador</span></button>
      </div>
      <section><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Recentes</h3><button onClick={() => app.navigate('list')} className="text-sm font-semibold text-blue-600">Ver todos</button></div><div className="space-y-3">
        {app.yearExpenses.slice(0, 4).map((expense) => <Card key={expense.id} onClick={() => app.openExpense(expense)} className="flex items-center justify-between p-4"><div className="min-w-0 pr-3"><p className="truncate font-bold">{expense.razao_social}</p><div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{formatDate(expense.data)}</span><StatusBadge status={expense.deductibilityStatus || 'review'} /></div></div><p className="shrink-0 font-black">{formatCurrency(expense.valor)}</p></Card>)}
        {!app.yearExpenses.length && <Card className="p-6 text-center text-sm text-slate-500">Nenhuma despesa cadastrada em {app.filterYear}.</Card>}
      </div></section>
    </div>
  );
}

export function ListScreen({ app, header }) {
  return (
    <div className="pb-12">{header(`Extrato de ${app.filterYear}`)}
      <div className="relative mb-4"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={app.search} onChange={(event) => app.setSearch(event.target.value)} placeholder="Buscar prestador, CPF/CNPJ, descrição..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900" /></div>
      <div className="mb-3 flex gap-2 overflow-x-auto">{app.years.map((year) => <button key={year} onClick={() => app.setFilterYear(year)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${app.filterYear === year ? 'bg-blue-600 text-white' : 'bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'}`}>{year}</button>)}</div>
      <select value={app.dependentFilter} onChange={(event) => app.setDependentFilter(event.target.value)} className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="all">Todos os beneficiários</option><option value="titular">Titular</option>{app.dependents.map((dependent) => <option key={dependent.id} value={dependent.id}>{dependent.name}</option>)}</select>
      <div className="space-y-3">{app.filteredExpenses.map((expense) => <Card key={expense.id} onClick={() => app.openExpense(expense)} className="p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{expense.razao_social}</p><p className="mt-1 text-xs text-slate-500">{formatDate(expense.data)} · {expense.dependentName || expense.dependente || 'Titular'}</p></div><p className="shrink-0 text-lg font-black">{formatCurrency(expense.valor)}</p></div><div className="mt-3 flex flex-wrap gap-2"><CategoryBadge category={expense.categoria} /><StatusBadge status={expense.deductibilityStatus || 'review'} />{expense.hasAttachment && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">comprovante</span>}</div></Card>)}{!app.filteredExpenses.length && <Card className="p-8 text-center text-sm text-slate-500">Nenhum registro encontrado.</Card>}</div>
    </div>
  );
}

export function ScanScreen({ app }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-white">
      <button onClick={app.back} className="absolute right-5 top-5 rounded-full bg-white/10 p-2"><X size={26} /></button>
      <img src="/logo.png" alt="" className="mb-6 h-20 w-20 rounded-3xl object-cover" /><h2 className="text-2xl font-black">Novo comprovante</h2>
      <p className="mt-2 max-w-xs text-center text-sm text-slate-400">A imagem será reduzida no aparelho antes da análise. O arquivo original não é enviado para o Firestore.</p>
      <div className="mt-8 w-full max-w-sm space-y-3">
        <label className="block cursor-pointer rounded-2xl bg-blue-600 p-4 text-center font-bold"><Camera className="mr-2 inline" size={20} />Tirar foto<input type="file" accept="image/*" capture="environment" onChange={app.upload} className="hidden" /></label>
        <label className="block cursor-pointer rounded-2xl border border-white/15 bg-white/5 p-4 text-center font-bold"><Upload className="mr-2 inline" size={20} />Escolher imagem ou PDF<input type="file" accept="image/*,application/pdf" onChange={app.upload} className="hidden" /></label>
      </div>
    </div>
  );
}
