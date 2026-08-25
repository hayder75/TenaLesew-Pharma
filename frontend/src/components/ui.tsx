/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { X } from 'lucide-react';

/* ---------- Buttons ---------- */

type BtnVariant = 'dark' | 'lime' | 'ghost' | 'danger';

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }
> = ({ variant = 'dark', className = '', children, ...rest }) => (
  <button
    className={`btn btn-${variant} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/* ---------- Chips ---------- */

type ChipTone = 'lime' | 'sun' | 'sky' | 'lav' | 'blush' | 'mint' | 'neutral' | 'dark';

const chipTones: Record<ChipTone, string> = {
  lime: 'bg-lime-soft text-[#5c6b12]',
  sun: 'bg-sun-soft text-[#8a6d10]',
  sky: 'bg-sky-soft text-[#3d5a94]',
  lav: 'bg-lav-soft text-[#5d4394]',
  blush: 'bg-blush-soft text-[#a34141]',
  mint: 'bg-mint-soft text-[#2f6b46]',
  neutral: 'bg-cream-deep text-[#6b6753]',
  dark: 'bg-ink text-white'
};

export const Chip: React.FC<{ tone?: ChipTone; className?: string; children: React.ReactNode }> = ({
  tone = 'neutral',
  className = '',
  children
}) => <span className={`chip ${chipTones[tone]} ${className}`}>{children}</span>;

/* ---------- Stat cards ---------- */

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: ChipTone;
  sub?: string;
  dark?: boolean;
}> = ({ label, value, icon: Icon, tone = 'lime', sub, dark }) => (
  <div className={`${dark ? 'card-dark' : 'card'} p-5`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-[13px] font-medium ${dark ? 'text-white/60' : 'text-stone-500'}`}>{label}</p>
        <p className={`text-[26px] leading-tight font-extrabold tracking-tight mt-1 truncate ${dark ? 'text-white' : ''}`}>
          {value}
        </p>
        {sub && (
          <p className={`text-xs mt-1.5 font-medium ${dark ? 'text-lime' : 'text-stone-400'}`}>{sub}</p>
        )}
      </div>
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
          dark ? 'bg-lime text-ink' : chipTones[tone]
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

/* ---------- Progress ring ---------- */

export const ProgressRing: React.FC<{
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}> = ({ percent, size = 56, stroke = 6, label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ECE9DD" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#D9ED4E"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-ink">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
};

/* ---------- Page header ---------- */

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* ---------- Tabs (pill style) ---------- */

export const Tabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ElementType }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="inline-flex gap-1 bg-cream-deep/60 p-1 rounded-full">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all ${
            isActive ? 'bg-ink text-white shadow-card' : 'text-stone-500 hover:text-ink'
          }`}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {tab.label}
        </button>
      );
    })}
  </div>
);

/* ---------- Modal ---------- */

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, children, footer, maxWidth = 'max-w-md' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-3xl shadow-pop w-full ${maxWidth} overflow-hidden max-h-[92vh] flex flex-col`}>
        <div className="px-5 py-4 border-b border-line flex items-center justify-between shrink-0">
          <h2 className="font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-cream rounded-full text-stone-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3.5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex gap-3 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

/* ---------- Empty state ---------- */

export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  sub?: string;
}> = ({ icon: Icon, title, sub }) => (
  <div className="text-center py-14">
    <div className="w-16 h-16 rounded-3xl bg-cream-deep flex items-center justify-center mx-auto mb-3">
      <Icon className="w-7 h-7 text-stone-400" />
    </div>
    <p className="font-semibold text-ink">{title}</p>
    {sub && <p className="text-sm text-stone-400 mt-1">{sub}</p>}
  </div>
);

/* ---------- Avatar ---------- */

export const Avatar: React.FC<{ name: string; tone?: ChipTone; size?: 'sm' | 'md' | 'lg' }> = ({
  name,
  tone = 'lime',
  size = 'md'
}) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold ${chipTones[tone]} shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

/* ---------- Soft table helpers ---------- */

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...rest }) => (
  <th
    className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400 ${className}`}
    {...rest}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...rest }) => (
  <td className={`px-4 py-3 text-sm ${className}`} {...rest}>
    {children}
  </td>
);

/* ---------- Mini bar chart (pure CSS) ---------- */

export const BarChart: React.FC<{
  data: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
}> = ({ data, height = 160, format = (v) => v.toLocaleString() }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-0">
          <span className="text-[10px] font-bold text-stone-400 truncate max-w-full">{format(d.value)}</span>
          <div
            className="w-full max-w-[38px] rounded-t-xl rounded-b-md bg-lime hover:bg-lime-deep transition-all relative group"
            style={{ height: `${Math.max(4, (d.value / max) * 82)}%` }}
          >
            <div className="absolute inset-0 rounded-t-xl rounded-b-md bg-ink/0 group-hover:bg-ink/5" />
          </div>
          <span className="text-[10px] font-semibold text-stone-400 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------- Status pill for tables ---------- */

export const statusTone = (status: string): ChipTone => {
  const s = status.toLowerCase();
  if (['completed', 'received', 'active', 'paid', 'stocked'].includes(s)) return 'mint';
  if (['pending', 'low', 'expiring', 'trial'].includes(s)) return 'sun';
  if (['processed', 'in_transit', 'requested'].includes(s)) return 'sky';
  if (['cancelled', 'expired', 'out', 'refunded', 'suspended'].includes(s)) return 'blush';
  return 'neutral';
};
