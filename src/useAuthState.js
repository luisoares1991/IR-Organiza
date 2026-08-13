import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';

export function useAuthState() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    setAuthLoading(false);
  }), []);

  const login = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (error) { alert(`Erro no login: ${error.message}`); }
  };

  const guestLogin = async () => {
    if (!window.confirm('No modo visitante, seus dados e comprovantes ficam somente neste dispositivo. Se apagar os dados do navegador, você poderá perdê-los. Continuar?')) return;
    try { await signInAnonymously(auth); }
    catch (error) { alert(`Erro ao iniciar modo visitante: ${error.message}`); }
  };

  return {
    user,
    authLoading,
    isGuest: Boolean(user?.isAnonymous),
    login,
    guestLogin,
    logout: () => signOut(auth),
  };
}
