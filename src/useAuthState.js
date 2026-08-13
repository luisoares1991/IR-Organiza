import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';

const GOOGLE_REDIRECT_PENDING = 'recibos_ir_google_redirect_pending';

const authErrorMessage = (error) => {
  const messages = {
    'auth/network-request-failed': 'Não foi possível conectar ao Google. Confira sua internet e tente novamente.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Autorize pop-ups para este site e tente novamente.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de o login terminar.',
    'auth/unauthorized-domain': 'Este endereço ainda não está autorizado para login. Tente novamente pelo endereço principal do Recibos IR.',
    'auth/web-storage-unsupported': 'O navegador está bloqueando o armazenamento necessário para manter o login.',
    'auth/email-already-in-use': 'Este e-mail já está vinculado a uma conta. Entre com a sua senha ou recupere o acesso.',
    'auth/invalid-credential': 'E-mail ou senha incorretos. Confira os dados ou recupere sua senha.',
    'auth/invalid-email': 'Digite um endereço de e-mail válido.',
    'auth/missing-password': 'Digite a sua senha.',
    'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/operation-not-allowed': 'O login por e-mail e senha ainda não foi habilitado no Firebase deste aplicativo.',
    'auth/admin-restricted-operation': 'A criação de contas está bloqueada na configuração do Firebase.',
    'auth/configuration-not-found': 'O método de autenticação ainda não foi configurado no Firebase.',
    'auth/app-not-authorized': 'Este domínio não está autorizado a usar o Firebase Authentication.',
    'auth/invalid-api-key': 'A configuração do Firebase publicada no aplicativo é inválida.',
    'auth/cancelled-popup-request': 'A tentativa anterior de login foi interrompida. Tente novamente.',
    'auth/operation-not-supported-in-this-environment': 'Este navegador não permite o login por janela. Tente novamente para usar o redirecionamento seguro.',
    'auth/internal-error': 'O Firebase não conseguiu concluir a autenticação. Tente novamente em alguns instantes.',
  };

  return messages[error?.code] || `Não foi possível concluir a autenticação${error?.code ? ` — ${error.code}` : ''}. Tente novamente.`;
};

export function useAuthState() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    const redirectWasPending = sessionStorage.getItem(GOOGLE_REDIRECT_PENDING) === '1';
    getRedirectResult(auth).then((credential) => {
      if (credential?.user) {
        sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING);
        setUser(credential.user);
        setAuthError('');
        window.gtag?.('event', 'login', { method: 'Google' });
      } else if (redirectWasPending && !auth.currentUser) {
        sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING);
        setAuthError('O Google retornou ao aplicativo, mas o Firebase não conseguiu restaurar a sessão. Verifique a URI de redirecionamento OAuth configurada para este domínio.');
      }
    }).catch((error) => {
      sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING);
      console.error('[auth] Google redirect result failed', { code: error?.code, message: error?.message });
      setAuthError(authErrorMessage(error));
    });

    return onAuthStateChanged(
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
    );
  }, []);

  const login = async () => {
    setLoginLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const useRedirect = window.matchMedia?.('(display-mode: standalone)').matches
        || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (useRedirect) {
        sessionStorage.setItem(GOOGLE_REDIRECT_PENDING, '1');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const credential = await signInWithPopup(auth, googleProvider);
      setUser(credential.user);
      window.gtag?.('event', 'login', { method: 'Google' });
    } catch (error) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(error?.code)) {
        try {
          sessionStorage.setItem(GOOGLE_REDIRECT_PENDING, '1');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING);
          console.error('[auth] Google redirect fallback failed', { code: redirectError?.code, message: redirectError?.message });
          setAuthError(authErrorMessage(redirectError));
          return;
        }
      }
      console.error('[auth] Google sign-in failed', { code: error?.code, message: error?.message });
      setAuthError(authErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const emailLogin = async ({ email, password }) => {
    setLoginLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.gtag?.('event', 'login', { method: 'Email' });
    } catch (error) {
      console.error('[auth] Email sign-in failed', { code: error?.code, message: error?.message });
      setAuthError(authErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const createAccount = async ({ name, email, password }) => {
    setLoginLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      setUser(credential.user);
      await sendEmailVerification(credential.user).catch((error) => {
        console.warn('[auth] Verification email could not be sent', { code: error?.code });
      });
      window.gtag?.('event', 'sign_up', { method: 'Email' });
      setAuthNotice('Conta criada. Enviamos um link de confirmação para o seu e-mail.');
    } catch (error) {
      console.error('[auth] Account creation failed', { code: error?.code, message: error?.message });
      setAuthError(authErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return;
    setAuthNotice('');
    setAuthError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setAuthNotice('Novo link de confirmação enviado. Confira também a caixa de spam.');
    } catch (error) {
      setAuthError(authErrorMessage(error));
    }
  };

  const resetPassword = async (email) => {
    if (!email?.trim()) {
      setAuthError('Digite seu e-mail para receber o link de recuperação.');
      return false;
    }
    setLoginLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAuthNotice('Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
      return true;
    } catch (error) {
      console.error('[auth] Password reset failed', { code: error?.code, message: error?.message });
      setAuthError(authErrorMessage(error));
      return false;
    } finally {
      setLoginLoading(false);
    }
  };

  const guestLogin = async () => {
    if (!window.confirm('No modo visitante, seus dados e comprovantes ficam somente neste dispositivo. Se apagar os dados do navegador, você poderá perdê-los. Continuar?')) return;
    try { await signInAnonymously(auth); window.gtag?.('event', 'login', { method: 'Guest' }); }
    catch (error) { alert(`Erro ao iniciar modo visitante: ${error.message}`); }
  };

  return {
    user,
    authLoading,
    loginLoading,
    authError,
    authNotice,
    isGuest: Boolean(user?.isAnonymous),
    login,
    emailLogin,
    createAccount,
    resetPassword,
    resendVerification,
    guestLogin,
    logout: () => signOut(auth),
  };
}
