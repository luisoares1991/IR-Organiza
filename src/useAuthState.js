import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';

const authErrorMessage = (error) => {
  const messages = {
    'auth/network-request-failed': 'Não foi possível conectar ao Google. Confira sua internet e tente novamente.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Autorize pop-ups para este site e tente novamente.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de o login terminar.',
    'auth/unauthorized-domain': 'Este endereço ainda não está autorizado para login. Tente novamente pelo endereço principal do IR Organiza.',
    'auth/web-storage-unsupported': 'O navegador está bloqueando o armazenamento necessário para manter o login.',
  };

  return messages[error?.code] || `Não foi possível entrar com o Google${error?.code ? ` (${error.code})` : ''}. Tente novamente.`;
};

export function useAuthState() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => onAuthStateChanged(
    auth,
    (current) => {
      setUser(current);
      setAuthLoading(false);
      if (current) setAuthError('');
    },
    (error) => {
      console.error('[auth] Failed to restore session', { code: error?.code, message: error?.message });
      setAuthError(authErrorMessage(error));
      setAuthLoading(false);
    },
  ), []);

  const login = async () => {
    setLoginLoading(true);
    setAuthError('');
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      setUser(credential.user);
    } catch (error) {
      console.error('[auth] Google sign-in failed', { code: error?.code, message: error?.message });
      setAuthError(authErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const guestLogin = async () => {
    if (!window.confirm('No modo visitante, seus dados e comprovantes ficam somente neste dispositivo. Se apagar os dados do navegador, você poderá perdê-los. Continuar?')) return;
    try { await signInAnonymously(auth); }
    catch (error) { alert(`Erro ao iniciar modo visitante: ${error.message}`); }
  };

  return {
    user,
    authLoading,
    loginLoading,
    authError,
    isGuest: Boolean(user?.isAnonymous),
    login,
    guestLogin,
    logout: () => signOut(auth),
  };
}
