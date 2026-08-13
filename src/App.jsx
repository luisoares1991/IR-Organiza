import React from 'react';
import { ArrowLeft, FileText, Home, Plus, Settings, Users } from 'lucide-react';
import { useAuthState } from './useAuthState';
import { useViewState } from './useViewState';
import { useDataState } from './useDataState';
import { useReceipts } from './useReceipts';
import { useLibraryActions } from './useLibraryActions';
import { usePwaInstall } from './usePwaInstall';
import { LoginScreen, DashboardScreen, ListScreen, ScanScreen } from './screensCore';
import { ReviewScreen } from './check';
import { DetailScreen } from './detail';
import { DependentsScreen } from './family';
import { SettingsScreen } from './options';

export default function App() {
  const authState = useAuthState();
  const viewState = useViewState();
  const dataState = useDataState({
    user: authState.user,
    filterYear: viewState.filterYear,
    search: viewState.search,
    dependentFilter: viewState.dependentFilter,
  });
  const session = { ...authState, ...viewState, ...dataState };
  const receipts = useReceipts(session);
  const library = useLibraryActions(session);
  const pwa = usePwaInstall();
  const app = { ...session, ...receipts, ...library, pwa, loading: receipts.loading || library.loading };

  if (app.authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f8f7] dark:bg-slate-950"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-700" /></div>;
  if (!app.user) return <LoginScreen app={app} />;

  const header = (title) => <div className="sticky top-0 z-20 -mx-4 mb-5 flex items-center gap-3 border-b border-slate-200/70 bg-[#f5f8f7]/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-white lg:px-5 dark:lg:bg-slate-900"><button onClick={app.back} className="rounded-full p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"><ArrowLeft size={20} /></button><h2 className="text-lg font-black">{title}</h2></div>;

  const screens = {
    dashboard: <DashboardScreen app={app} />,
    list: <ListScreen app={app} header={header} />,
    scan: <ScanScreen app={app} />,
    review: <ReviewScreen app={app} header={header} />,
    detail: <DetailScreen app={app} header={header} />,
    dependents: <DependentsScreen app={app} header={header} />,
    settings: <SettingsScreen app={app} header={header} />,
  };

  const navItems = [
    ['dashboard', 'Início', Home], ['list', 'Recibos', FileText], ['scan', 'Adicionar', Plus],
    ['dependents', 'Pessoas', Users], ['settings', 'Mais', Settings],
  ];
  const go = (target) => {
    if (target === 'scan') app.resetScan();
    app.navigate(target);
  };

  return <main className="min-h-screen bg-[#f5f8f7] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200/80 bg-white px-5 py-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <button onClick={() => go('dashboard')} className="flex items-center gap-3 rounded-2xl p-2 text-left"><img src="/brand-mark.svg" alt="" className="h-12 w-12"/><span><b className="block text-xl tracking-tight">Recibos IR</b><small className="text-slate-500">Sua declaração tranquila.</small></span></button>
        <nav className="mt-10 space-y-2">{navItems.filter(([key]) => key !== 'scan').map(([key,label,Icon]) => <button key={key} onClick={() => go(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${app.view===key?'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300':'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{React.createElement(Icon,{size:20})}{label}</button>)}</nav>
        <button onClick={() => go('scan')} className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-4 font-bold text-white shadow-lg shadow-teal-900/15 hover:bg-teal-800"><Plus size={20}/>Adicionar recibo</button>
        <div className="mt-auto rounded-2xl bg-teal-50 p-4 text-xs leading-5 text-teal-900 dark:bg-teal-950/30 dark:text-teal-200"><b>Seus dados são seus.</b><br/>Comprovantes ficam neste dispositivo; metadados sincronizam com sua conta.</div>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-72"><div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-3 pb-28 sm:px-6 lg:px-8 lg:py-7 lg:pb-10">{screens[app.view] || screens.dashboard}</div></div>
    </div>
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[24px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_16px_50px_rgba(15,23,42,.18)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 lg:hidden">{navItems.map(([key,label,Icon]) => { const active=app.view===key; const add=key==='scan'; return <button key={key} onClick={() => go(key)} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold ${add?'-mt-6':''} ${active?'text-teal-700 dark:text-teal-300':'text-slate-400'}`}>{add?<span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/25">{React.createElement(Icon,{size:26})}</span>:React.createElement(Icon,{size:21})}<span>{label}</span></button>})}</nav>
  </main>;
}
