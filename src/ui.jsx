import React from 'react';
import { Activity, DollarSign, GraduationCap, HelpCircle, ShieldCheck, AlertTriangle, CircleX } from 'lucide-react';

export function Card({ children, className = '', onClick }) {
  const clickable = onClick ? 'cursor-pointer active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md' : '';
  return <div onClick={onClick} className={`min-w-0 max-w-full rounded-[22px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.045)] transition dark:border-slate-800 dark:bg-slate-900 ${clickable} ${className}`}>{children}</div>;
}

export function Button({ onClick, children, variant = 'primary', className = '', disabled = false, type = 'button' }) {
  const variants = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800 shadow-lg shadow-teal-700/15',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300',
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-normal break-words rounded-xl px-4 py-3 text-center font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0 ${variants[variant]} ${className}`}>{children}</button>;
}

export function CategoryBadge({ category }) {
  const config = {
    Saúde: ['bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', Activity],
    Educação: ['bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300', GraduationCap],
    Previdência: ['bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', DollarSign],
    Outros: ['bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', HelpCircle],
  };
  const [classes, Icon] = config[category] || config.Outros;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}><Icon size={12} />{category || 'Outros'}</span>;
}

export function StatusBadge({ status }) {
  const config = {
    potential: ['Potencialmente dedutível', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', ShieldCheck],
    review: ['Revisar', 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', AlertTriangle],
    non_deductible: ['Não dedutível', 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', CircleX],
  };
  const [label, classes, Icon] = config[status] || config.review;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}><Icon size={12} />{label}</span>;
}

export function ConfidenceHint({ value }) {
  if (value == null || value >= 0.8) return null;
  const pct = Math.round(value * 100);
  return <span className="ml-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">IA {pct}% — confira</span>;
}
