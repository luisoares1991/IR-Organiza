import React from 'react';
import { useSession } from './useSession';

export default function App() {
  const app = useSession();
  return <div>{app.authLoading ? 'Carregando' : 'OK'}</div>;
}
