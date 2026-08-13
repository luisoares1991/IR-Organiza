import React from 'react';
import { ArrowLeft } from 'lucide-react';
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

  if (app.authLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div>;
  if (!app.user) return <LoginScreen app={app} />;

  const header = (title) => <div className="sticky top-0 z-20 -mx-4 mb-5 flex items-center gap-3 border-b border-slate-200/70 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"><button onClick={app.back} className="rounded-full p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"><ArrowLeft size={20} /></button><h2 className="text-lg font-bold">{title}</h2></div>;

  const screens = {
    dashboard: <DashboardScreen app={app} />,
    list: <ListScreen app={app} header={header} />,
    scan: <ScanScreen app={app} />,
    review: <ReviewScreen app={app} header={header} />,
    detail: <DetailScreen app={app} header={header} />,
    dependents: <DependentsScreen app={app} header={header} />,
    settings: <SettingsScreen app={app} header={header} />,
  };

  return <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100"><div className="mx-auto min-h-screen w-full max-w-lg px-4 py-3">{screens[app.view] || screens.dashboard}</div></main>;
}
