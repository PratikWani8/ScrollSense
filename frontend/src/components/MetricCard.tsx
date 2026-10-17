import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'accent' | 'warning' | 'emerald';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'from-slate-900 to-navy-900 border-slate-800 text-indigo-400',
    accent: 'from-indigo-950/40 to-navy-900 border-indigo-500/20 text-indigo-400',
    warning: 'from-amber-950/30 to-navy-900 border-amber-500/20 text-amber-400',
    emerald: 'from-emerald-950/30 to-navy-900 border-emerald-500/20 text-emerald-400',
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-b border ${variantStyles[variant]} shadow-sm flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{title}</span>
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
        {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
