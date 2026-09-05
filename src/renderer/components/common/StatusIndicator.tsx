import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle, Clock, Pause, XCircle, Power, RefreshCw } from 'lucide-react';

export type StandardStatus =
  | 'CONNECTED'
  | 'READY'
  | 'NOT_READY'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'BUSY'
  | 'WAITING'
  | 'PAUSED'
  | 'OFFLINE'
  | 'INITIALIZING'
  | 'COMPLETED'
  | 'QUEUED'
  | 'RUNNING'
  | 'OPEN'
  | 'CLOSED';

interface StatusIndicatorProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  showDot = true,
  showIcon = false,
  className
}) => {
  const norm = (status || '').toUpperCase().replace(/[\s-]/g, '_');

  let dotColor = 'bg-slate-400';
  let badgeColor = 'bg-slate-900/60 text-slate-300 border-slate-700/60';
  let displayLabel = label || status;
  let Icon = Clock;

  switch (norm) {
    case 'CONNECTED':
    case 'READY':
    case 'FLOW_READY':
    case 'GOOGLE_AUTHENTICATED':
    case 'COMPLETED':
    case 'OPEN':
      dotColor = 'bg-emerald-400';
      badgeColor = 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      displayLabel = label || (norm === 'FLOW_READY' || norm === 'READY' ? 'Ready' : 'Connected');
      Icon = CheckCircle2;
      break;

    case 'CONNECTING':
    case 'INITIALIZING':
    case 'STARTING':
    case 'RUNNING':
    case 'BUSY':
    case 'GENERATING':
    case 'OPENING_FLOW':
      dotColor = 'bg-cyan-400 animate-pulse';
      badgeColor = 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30';
      displayLabel = label || (norm === 'BUSY' ? 'Busy' : norm === 'CONNECTING' ? 'Connecting...' : 'Active');
      Icon = RefreshCw;
      break;

    case 'NOT_READY':
    case 'WAITING':
    case 'QUEUED':
    case 'PENDING':
    case 'NEW':
      dotColor = 'bg-amber-400';
      badgeColor = 'bg-amber-950/40 text-amber-300 border-amber-500/30';
      displayLabel = label || (norm === 'NOT_READY' ? 'Not Ready' : norm === 'WAITING' ? 'Waiting' : 'Queued');
      Icon = Clock;
      break;

    case 'PAUSED':
      dotColor = 'bg-amber-400';
      badgeColor = 'bg-amber-950/40 text-amber-300 border-amber-500/30';
      displayLabel = label || 'Paused';
      Icon = Pause;
      break;

    case 'ERROR':
    case 'FAILED':
    case 'DISCONNECTED':
    case 'AUTH_FAILED':
    case 'CLOSED':
    case 'OFFLINE':
      dotColor = 'bg-rose-400';
      badgeColor = 'bg-rose-950/40 text-rose-300 border-rose-500/30';
      displayLabel = label || (norm === 'CLOSED' ? 'Closed' : norm === 'OFFLINE' ? 'Offline' : 'Error');
      Icon = XCircle;
      break;

    default:
      dotColor = 'bg-slate-400';
      badgeColor = 'bg-slate-900/60 text-slate-400 border-slate-700/60';
      displayLabel = label || status || 'Unknown';
      Icon = AlertCircle;
      break;
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg border font-medium select-none transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        badgeColor,
        className
      )}
    >
      {showDot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />}
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};
