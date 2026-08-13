import React from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { Button, Card } from './ui';

export function DependentsScreen({ app, header }) {
  return <div>{header('Titular e dependentes')}<Card className="mb-4 p-4"><div className="flex gap-2"><input value={app.newDependentName} onChange={(e)=>app.setNewDependentName(e.target.value)} placeholder="Nome" className="w-full rounded-xl border p-3 dark:bg-slate-900"/><Button onClick={app.addDependent}><Plus size={18}/></Button></div></Card><Card className="mb-3 flex items-center justify-between p-4"><b>Titular</b><ShieldCheck size={18}/></Card>{app.dependents.map((item)=><Card key={item.id} className="mb-3 p-4"><b>{item.name}</b></Card>)}</div>;
}
