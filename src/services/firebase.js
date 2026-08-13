import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const isProductionDomain = typeof window !== 'undefined'
  && window.location.hostname === 'ir-app.luisandre.com.br';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Keep the Firebase helper same-origin in production. Vercel proxies
  // /__/auth/* to the project's firebaseapp.com domain (see vercel.json).
  authDomain: isProductionDomain ? window.location.hostname : configuredAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = initializeAuth(firebaseApp, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
  ],
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const db = getFirestore(firebaseApp);
export const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
