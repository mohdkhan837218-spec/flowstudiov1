import React, { useState } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Bug,
  Pause,
  Play,
  ArrowDownCircle,
  Trash2,
  Download,
  FolderArchive,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';
import { TerminalLogCategory } from '../../../shared/types/diagnostics';

const CATEGORIES: { label: string; value: TerminalLogCategory }[] = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Flow Engine', value: 'FLOW' },
  { label: 'Browser', value: 'BROWSER' },
  { label: 'DOM Selectors', value: 'DOM' },
  { label: 'Accessibility', value: 'ACCESSIBILITY' },
  { label: 'Navigation', value: 'NAVIGATION' },
  { label: 'Composer', value: 'COMPOSER' },
  { label: 'Mode Resolver', value: 'MODE' },
  { label: 'Model Resolver', value: 'MODEL' },
  { label: 'Prompt', value: 'PROMPT' },
  { label: 'Submission', value: 'SUBMISSION' },
  { label: 'Generation', value: 'GENERATION' },
  { label: 'Downloads', value: 'DOWNLOAD' },
  { label: 'Workers', value: 'WORKER' },
  { label: 'Queue', value: 'QUEUE' },
  { label: 'Accounts', value: 'ACCOUNT' },
  { label: 'Auth', value: 'AUTH' },
  { label: 'Network', value: 'NETWORK' },
  { label: 'Diagnostic', value: 'DIAGNOSTIC' }
];

export const TerminalToolbar: React.FC = () => {
  const {
    filters,
    setSearchQuery,
    setSeverityFilter,
    setCategoryFilter,
    setLiveDebug,
    setTargetFilter,
    isPaused,
    togglePause,
    autoScroll,
    setAutoScroll,
    clearDisplay,
    exportLogs,
    selectedError,
    exportDebugBundle
  } = useTerminalStore();

  const [exportOpen, setExportOpen] = useState(false);
  const [exportingBundle, setExportingBundle] = useState(false);
  const [bundleNotice, setBundleNotice] = useState<string | null>(null);

  const handleExportBundle = async () => {
    if (!selectedError?.errorId) return;
    setExportingBundle(true);
    try {
      const path = await exportDebugBundle(selectedError.errorId);
      if (path) {
        setBundleNotice(`Exported to: ${path}`);
        setTimeout(() => setBundleNotice(null), 4000);
      }
    } finally {
      setExportingBundle(false);
    }
  };

  const hasActiveTargetFilter = Boolean(
    filters.selectedJobId || filters.selectedWorkerId || filters.selectedAccountId
  );

  return (
    <div className="bg-[#12141c] border border-[#202534] rounded-t-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-neutral-300 select-none">
      {/* Left side: Search & Filters */}
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by message, code, stage, action, job, worker..."
            className="w-full bg-[#181c28] border border-[#282f44] rounded-lg pl-8 pr-7 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/40"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category selector */}
        <div className="relative">
          <select
            value={filters.categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TerminalLogCategory)}
            aria-label="Filter logs by category"
            className="bg-[#181c28] border border-[#282f44] text-neutral-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/70"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live Debug Mode Toggle */}
        <button
          type="button"
          onClick={() => setLiveDebug(!filters.liveDebug)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all border ${
            filters.liveDebug
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 ring-1 ring-indigo-500/40'
              : 'bg-[#181c28] text-neutral-400 border-[#282f44] hover:text-neutral-300'
          }`}
          title="Toggle TRACE & DEBUG verbose logs"
        >
          <Bug size={13} className={filters.liveDebug ? 'text-indigo-400' : 'text-neutral-500'} />
          <span>Live Debug: {filters.liveDebug ? 'ON' : 'OFF'}</span>
        </button>

        {/* Clear target filter badge if applied */}
        {hasActiveTargetFilter && (
          <button
            type="button"
            onClick={() => setTargetFilter(null)}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-mono hover:bg-amber-500/30"
            title="Clear target filter"
          >
            <span>
              Target:{' '}
              {filters.selectedJobId || filters.selectedWorkerId || filters.selectedAccountId}
            </span>
            <X size={11} />
          </button>
        )}
      </div>

      {/* Right side: Stream Controls, Export, Clear */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pause / Resume Button */}
        <button
          type="button"
          onClick={togglePause}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium border transition-all ${
            isPaused
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-[#181c28] text-neutral-300 border-[#282f44] hover:bg-[#202536]'
          }`}
          title={isPaused ? 'Resume live terminal stream' : 'Pause live terminal display (workers continue running)'}
        >
          {isPaused ? <Play size={13} className="text-amber-400" /> : <Pause size={13} />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        {/* Auto Scroll Toggle */}
        <button
          type="button"
          onClick={() => setAutoScroll(!autoScroll)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium border transition-all ${
            autoScroll
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : 'bg-[#181c28] text-neutral-400 border-[#282f44] hover:text-neutral-300'
          }`}
          title="Toggle auto-scroll to newest logs"
        >
          <ArrowDownCircle size={13} className={autoScroll ? 'text-blue-400' : 'text-neutral-500'} />
          <span>Auto-Scroll</span>
        </button>

        {/* Clear Display Button */}
        <button
          type="button"
          onClick={clearDisplay}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#181c28] hover:bg-[#222838] border border-[#282f44] text-neutral-400 hover:text-neutral-200 rounded-lg transition-all"
          title="Clears terminal display buffer (does not delete persistent diagnostic history)"
        >
          <Trash2 size={13} />
          <span>Clear View</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#181c28] hover:bg-[#222838] border border-[#282f44] text-neutral-300 rounded-lg transition-all"
            title="Export filtered logs"
          >
            <Download size={13} />
            <span>Export</span>
            <ChevronDown size={11} className="text-neutral-400" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#1a1e2b] border border-[#2d354d] rounded-lg shadow-2xl py-1 z-30 flex flex-col text-xs">
              <button
                type="button"
                onClick={() => {
                  exportLogs('json');
                  setExportOpen(false);
                }}
                className="px-3 py-1.5 text-left text-neutral-300 hover:bg-blue-600/20 hover:text-blue-300 transition-colors"
              >
                Export as JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  exportLogs('txt');
                  setExportOpen(false);
                }}
                className="px-3 py-1.5 text-left text-neutral-300 hover:bg-blue-600/20 hover:text-blue-300 transition-colors"
              >
                Export as TXT
              </button>
              <button
                type="button"
                onClick={() => {
                  exportLogs('csv');
                  setExportOpen(false);
                }}
                className="px-3 py-1.5 text-left text-neutral-300 hover:bg-blue-600/20 hover:text-blue-300 transition-colors"
              >
                Export as CSV
              </button>
              {selectedError && (
                <div className="border-t border-[#2d354d] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportBundle();
                      setExportOpen(false);
                    }}
                    className="px-3 py-1.5 text-left text-purple-300 hover:bg-purple-600/20 transition-colors flex items-center gap-1.5 w-full"
                  >
                    <FolderArchive size={12} />
                    <span>Debug Bundle (Zip)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {bundleNotice && (
        <div className="w-full bg-purple-950/60 border border-purple-800/40 text-purple-200 px-3 py-1 rounded text-[11px] font-mono">
          {bundleNotice}
        </div>
      )}
    </div>
  );
};
