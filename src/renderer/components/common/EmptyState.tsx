import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon
}) => {
  return (
    <div className="saas-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-indigo-400 shadow-lg shadow-indigo-950/20">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="md" onClick={onAction} icon={actionIcon}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
