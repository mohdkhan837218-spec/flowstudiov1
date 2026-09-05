import React from 'react';
import { clsx } from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  accentColor?: 'brand' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple';
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendPositive,
  accentColor = 'brand',
  description
}) => {
  const accentIcons = {
    brand: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/25',
    cyan: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/25',
    emerald: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/25',
    amber: 'text-amber-400 bg-amber-950/40 border-amber-500/25',
    rose: 'text-rose-400 bg-rose-950/40 border-rose-500/25',
    purple: 'text-purple-400 bg-purple-950/40 border-purple-500/25'
  };

  return (
    <div className="saas-card rounded-xl p-3.5 relative overflow-hidden transition-all duration-150 hover:border-slate-600 flex flex-col justify-between space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={clsx('p-1.5 rounded-lg border shrink-0', accentIcons[accentColor])}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight text-white font-mono">{value}</span>
        {trend && (
          <span
            className={clsx(
              'text-[10px] font-semibold px-1.5 py-0.2 rounded border',
              trendPositive
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
            )}
          >
            {trend}
          </span>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-slate-400 font-normal leading-tight truncate">{description}</p>
      )}
    </div>
  );
};

