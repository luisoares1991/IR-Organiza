import React from 'react';
import { listGuestExpenses } from './localStore';

export default function App() {
  return <button onClick={() => listGuestExpenses()}>OK</button>;
}
