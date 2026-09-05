import React from 'react';
import { clsx } from 'clsx';
import { Tooltip } from './Tooltip';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon-sm' | 'icon-md';
  isLoading?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  disabled,
  tooltip,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] whitespace-nowrap';

  const sizeStyles = {
    sm: 'h-9 text-xs px-3 gap-1.5',
    md: 'h-10 text-xs font-semibold px-4 gap-2',
    lg: 'h-11 text-sm font-semibold px-5 gap-2.5',
    xl: 'h-12 text-sm font-bold px-6 gap-2.5',
    'icon-sm': 'h-8 w-8 p-0',
    'icon-md': 'h-9 w-9 p-0'
  };

  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm border border-indigo-500/40 hover:border-indigo-400/60 shadow-indigo-950/40',
    secondary:
      'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 shadow-sm',
    danger:
      'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-600/40 hover:border-rose-500/60 shadow-sm',
    ghost:
      'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent',
    outline:
      'bg-transparent border border-slate-700/80 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 hover:bg-indigo-950/20 shadow-sm',
    success:
      'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400/60 shadow-sm'
  };

  const buttonElement = (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{buttonElement}</Tooltip>;
  }

  return buttonElement;
};
