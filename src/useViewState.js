import { useEffect, useState } from 'react';

export function useViewState() {
  const [view, setView] = useState('dashboard');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [dependentFilter, setDependentFilter] = useState('all');
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'system');

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    localStorage.setItem('app_theme', theme);
    applyTheme();
    media.addEventListener?.('change', applyTheme);
    return () => media.removeEventListener?.('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    const onPopState = (event) => setView(event.state?.view || 'dashboard');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    window.gtag?.('event', 'screen_view', {
      app_name: 'Recibos IR',
      screen_name: view,
    });
  }, [view]);

  const navigate = (next) => {
    if (next === view) return;
    window.history.pushState({ view: next }, '', '');
    setView(next);
  };

  const back = () => {
    if (window.history.state?.view) window.history.back();
    else setView('dashboard');
  };

  return {
    view, setView, filterYear, setFilterYear, search, setSearch, dependentFilter, setDependentFilter,
    theme, setTheme, navigate, back,
  };
}
