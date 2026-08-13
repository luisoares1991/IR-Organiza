import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from './services/firebase';
import { listGuestDependents, listGuestExpenses } from './localStore';

const sortExpenses = (items) => [...items].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
const yearOf = (expense) => String(expense.data || '').slice(0, 4);

export function useDataState({ user, filterYear, search, dependentFilter }) {
  const [expenses, setExpenses] = useState([]);
  const [dependents, setDependents] = useState([]);

  const refreshGuest = useCallback(async () => {
    const [guestExpenses, guestDependents] = await Promise.all([listGuestExpenses(), listGuestDependents()]);
    setExpenses(sortExpenses(guestExpenses));
    setDependents([...guestDependents].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    if (user.isAnonymous) {
      queueMicrotask(() => refreshGuest().catch(console.error));
      return undefined;
    }

    const expensesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    const dependentsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dependents');
    const stopExpenses = onSnapshot(expensesRef, (snapshot) => {
      setExpenses(sortExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    });
    const stopDependents = onSnapshot(dependentsRef, (snapshot) => {
      const values = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setDependents(values.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
    });
    return () => {
      stopExpenses();
      stopDependents();
    };
  }, [user, refreshGuest]);

  const years = useMemo(() => {
    const values = new Set(expenses.map(yearOf).filter(Boolean));
    values.add(String(new Date().getFullYear()));
    return [...values].sort((a, b) => Number(b) - Number(a));
  }, [expenses]);

  const yearExpenses = useMemo(
    () => expenses.filter((item) => yearOf(item) === filterYear),
    [expenses, filterYear],
  );

  const filteredExpenses = useMemo(() => {
    const byPerson = yearExpenses.filter((item) => {
      if (dependentFilter === 'all') return true;
      if (dependentFilter === 'titular') return !item.dependentId;
      return item.dependentId === dependentFilter;
    });
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return byPerson;
    return byPerson.filter((item) => [item.razao_social, item.cnpj_cpf, item.descricao, item.categoria]
      .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term)));
  }, [yearExpenses, dependentFilter, search]);

  return {
    expenses, dependents, setExpenses, setDependents, refreshGuest, years, yearExpenses, filteredExpenses,
  };
}
