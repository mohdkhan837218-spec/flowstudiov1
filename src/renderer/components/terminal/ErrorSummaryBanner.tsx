import React from 'react';
import { AlertCircle, AlertTriangle, Play, Cpu, Sparkles, Terminal, Beaker } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';
import { useQueueStore } from '../../stores/queueStore';

export const ErrorSummaryBanner: React.FC = () => {
  const { logs, filters, setSeverityFilter, selectError, setSimulatorOpen } = useTerminalStore();
  const { summary, workers } = useQueueStore();

  const errorLogs = logs.filter((l) => l.severity === 'ERROR' || l.severity === 'CRITICAL');
  const warningLogs = logs.filter((l) => l.severity === 'WARNING');
  const latestError = [...errorLogs].reverse()[0];

  const activeJobs = summary?.running ?? 0;
  const activeWorkers = workers?.filter((w) => w.status !== 'IDLE').length ?? 0;

  return (
    <div className="bg-[#161922] border border-[#232838] rounded-xl p-3.5 mb-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Errors counter */}
        <button
          type="button"
          onClick={() => setSeverityFilter(filters.severityFilter === 'ERRORS' ? 'ALL' : 'ERRORS')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            filters.severityFilter === 'ERRORS'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/50'
              : 'bg-[#1e1418] text-rose-400 border-rose-900/40 hover:bg-rose-950/40'
          }`}
          title="Filter terminal by Errors"
        >
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <span>Errors</span>
          <span className="bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded text-[11px] font-mono">
            {errorLogs.length}
          </span>
        </button>

        {/* Warnings counter */}
        <button
          type="button"
          onClick={() => setSeverityFilter(filters.severityFilter === 'WARNINGS' ? 'ALL' : 'WARNINGS')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            filters.severityFilter === 'WARNINGS'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/50'
              : 'bg-[#1f1a14] text-amber-400 border-amber-900/40 hover:bg-amber-950/40'
          }`}
          title="Filter terminal by Warnings"
        >
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span>Warnings</span>
          <span className="bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded text-[11px] font-mono">
            {warningLogs.length}
          </span>
        </button>

        {/* Active Jobs counter */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141d2e] text-blue-300 border border-blue-900/30">
          <Play size={13} className="text-blue-400 shrink-0" />
          <span>Active Jobs:</span>
          <span className="font-mono text-blue-200 font-bold">{activeJobs}</span>
        </div>

        {/* Workers counter */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#14231e] text-emerald-300 border border-emerald-900/30">
          <Cpu size={13} className="text-emerald-400 shrink-0" />
          <span>Active Workers:</span>
          <span className="font-mono text-emerald-200 font-bold">{activeWorkers}</span>
        </div>

        {/* Most Recent Error preview */}
        {latestError && (
          <div className="hidden xl:flex items-center gap-2 text-xs text-neutral-300 bg-[#1e1820] border border-rose-900/40 px-3 py-1.5 rounded-lg max-w-md truncate">
            <span className="text-neutral-400 text-[11px]">Latest:</span>
            <span className="font-mono text-rose-400 font-semibold truncate">
              {latestError.errorCode || latestError.message}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Sandbox Error Simulator trigger */}
        <button
          type="button"
          onClick={() => setSimulatorOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 border border-purple-500/40 text-purple-200 rounded-lg text-xs font-semibold shadow transition-all hover:scale-[1.02]"
          title="Simulate Flow error cases in Sandbox"
        >
          <Beaker size={14} className="text-purple-300" />
          <span>Simulate Error</span>
        </button>
      </div>
    </div>
  );
};
