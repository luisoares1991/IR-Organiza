import React from 'react';
import { auth } from './services/firebase';

export default function App() {
  return <div>{auth ? 'OK' : 'Erro'}</div>;
}
