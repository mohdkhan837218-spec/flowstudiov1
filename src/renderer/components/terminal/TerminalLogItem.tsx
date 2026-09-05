import React from 'react';
import { ActivityLogEntry } from '../../../shared/types/activity';
import { useTerminalStore } from '../../stores/terminalStore';

interface Props {
  log: ActivityLogEntry;
  isSelected?: boolean;
}

export const TerminalLogItem: React.FC<Props> = ({ log, isSelected }) => {
  const { selectLog, setTargetFilter } = useTerminalStore();

  const timeString = log.timestamp
    ? log.timestamp.split('T')[1]?.slice(0, 8) || log.timestamp
    : '00:00:00';

  const isError = log.severity === 'ERROR' || log.severity === 'CRITICAL';
  const isWarn = log.severity === 'WARNING';
  const isSuccess = log.severity === 'SUCCESS';
  const isDebug = log.severity === 'DEBUG';
  const isTrace = log.severity === 'TRACE';

  // Severity color tokens
  const getSeverityStyle = () => {
    switch (log.severity) {
      case 'CRITICAL':
        return 'bg-red-950/80 text-red-300 border-red-700/80 font-bold';
      case 'ERROR':
        return 'bg-rose-950/60 text-rose-300 border-rose-800/60 font-semibold';
      case 'WARNING':
        return 'bg-amber-950/50 text-amber-300 border-amber-800/50 font-medium';
      case 'SUCCESS':
        return 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50';
      case 'DEBUG':
        return 'bg-slate-800/60 text-slate-400 border-slate-700/50';
      case 'TRACE':
        return 'bg-neutral-900/60 text-neutral-500 border-neutral-800/50 text-[10px]';
      case 'INFO':
      default:
        return 'bg-neutral-800/50 text-neutral-300 border-neutral-700/40';
    }
  };

  const getRowBg = () => {
    if (isSelected) return 'bg-[#1e263d] border-blue-500/60';
    if (log.severity === 'CRITICAL') return 'bg-[#221014] hover:bg-[#2c151b] border-red-900/40';
    if (log.severity === 'ERROR') return 'bg-[#1b1216] hover:bg-[#24171d] border-rose-900/30';
    if (log.severity === 'WARNING') return 'bg-[#191612] hover:bg-[#221d17] border-amber-900/30';
    return 'hover:bg-[#151822] border-transparent';
  };

  return (
    <div
      onClick={() => selectLog(log)}
      className={`group flex items-start gap-2.5 px-3 py-1.5 font-mono text-[12px] leading-relaxed cursor-pointer transition-colors border-b border-[#181c28] ${getRowBg()}`}
    >
      {/* 1. Timestamp */}
      <span className="text-neutral-500 text-[11px] shrink-0 select-none pt-0.5">{timeString}</span>

      {/* 2. Severity Badge */}
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0 border select-none ${getSeverityStyle()}`}
      >
        {log.severity.slice(0, 5)}
      </span>

      {/* 3. Component / Source Tag */}
      <span className="text-blue-400/90 shrink-0 select-none">
        [{log.component || 'System'}]
      </span>

      {/* 4. Category Tag if distinct */}
      {log.category && log.category !== 'SYSTEM' && (
        <span className="text-purple-400/80 text-[11px] shrink-0 select-none">
          [{log.category}]
        </span>
      )}

      {/* 5. Stage / Action Tag if available */}
      {(log.stage || log.action) && (
        <span className="text-cyan-400/80 text-[11px] shrink-0 select-none hidden md:inline">
          [{log.stage || ''}{log.stage && log.action ? ': ' : ''}{log.action || ''}]
        </span>
      )}

      {/* 6. Error Code if present */}
      {log.errorCode && (
        <span className="bg-rose-950/70 text-rose-300 border border-rose-800/60 px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0">
          {log.errorCode}
        </span>
      )}

      {/* 7. Message content */}
      <span
        className={`flex-1 break-words ${
          isError
            ? 'text-rose-200'
            : isWarn
            ? 'text-amber-200'
            : isSuccess
            ? 'text-emerald-200'
            : isDebug || isTrace
            ? 'text-neutral-400'
            : 'text-neutral-200'
        }`}
      >
        {log.message}
      </span>

      {/* 8. Target pills (Job, Worker) */}
      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 text-[10px]">
        {log.jobId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTargetFilter('job', log.jobId || undefined);
            }}
            className="bg-[#1e2436] hover:bg-blue-900/40 text-blue-300 border border-blue-800/40 px-1.5 py-0.5 rounded"
            title={`Filter by Job ID: ${log.jobId}`}
          >
            {log.jobId.slice(0, 10)}
          </button>
        )}
        {log.workerId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTargetFilter('worker', log.workerId || undefined);
            }}
            className="bg-[#1c2923] hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded"
            title={`Filter by Worker: ${log.workerId}`}
          >
            {log.workerId}
          </button>
        )}
      </div>
    </div>
  );
};
