import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db, appId, googleProvider } from './services/firebase';
import { listGuestDependents, listGuestExpenses } from './localStore';

const sortExpenses = (items) => [...items].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
const yearOf = (expense) => String(expense.data || '').slice(0, 4);

export function useSession() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [dependentFilter, setDependentFilter] = useState('all');
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'system');
  const isGuest = Boolean(user?.isAnonymous);

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    setAuthLoading(false);
    if (current) setView('dashboard');
  }), []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.remove('dark');
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) root.classList.add('dark');
    };
    localStorage.setItem('app_theme', theme);
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, [theme]);

  useEffect(() => {
    const pop = (event) => setView(event.state?.view || 'dashboard');
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  const refreshGuest = async () => {
    setExpenses(sortExpenses(await listGuestExpenses()));
    setDependents((await listGuestDependents()).sort((a, b) => a.name.localeCompare(b.name)));
  };

  useEffect(() => {
    if (!user) return undefined;
    if (user.isAnonymous) {
      refreshGuest().catch(console.error);
      return undefined;
    }
    const expRef = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    const depRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dependents');
    const unsubExp = onSnapshot(expRef, (snapshot) => setExpenses(sortExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const unsubDep = onSnapshot(depRef, (snapshot) => setDependents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => a.name.localeCompare(b.name))));
    return () => { unsubExp(); unsubDep(); };
  }, [user]);

  const years = useMemo(() => {
    const values = new Set(expenses.map(yearOf).filter(Boolean));
    values.add(String(new Date().getFullYear()));
    return [...values].sort((a, b) => Number(b) - Number(a));
  }, [expenses]);
  const yearExpenses = useMemo(() => expenses.filter((item) => yearOf(item) === filterYear), [expenses, filterYear]);
  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const byPerson = dependentFilter === 'all' ? yearExpenses : yearExpenses.filter((item) => dependentFilter === 'titular' ? !item.dependentId : item.dependentId === dependentFilter);
    if (!term) return byPerson;
    return byPerson.filter((item) => [item.razao_social, item.cnpj_cpf, item.descricao, item.categoria].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term)));
  }, [yearExpenses, search, dependentFilter]);

  const navigate = (next) => {
    if (next === view) return;
    window.history.pushState({ view: next }, '', '');
    setView(next);
  };
  const back = () => window.history.state?.view ? window.history.back() : setView('dashboard');
  const login = async () => { try { await signInWithPopup(auth, googleProvider); } catch (error) { alert(`Erro no login: ${error.message}`); } };
  const guestLogin = async () => {
    if (!confirm('No modo visitante, seus dados e comprovantes ficam somente neste dispositivo. Se apagar os dados do navegador, você poderá perdê-los. Continuar?')) return;
    try { await signInAnonymously(auth); } catch (error) { alert(`Erro ao iniciar modo visitante: ${error.message}`); }
  };
  const logout = () => signOut(auth);

  return {
    user, authLoading, isGuest, view, setView, expenses, dependents, setExpenses, setDependents,
    filterYear, setFilterYear, search, setSearch, dependentFilter, setDependentFilter, theme, setTheme,
    years, yearExpenses, filteredExpenses, refreshGuest, navigate, back, login, guestLogin, logout,
  };
}
