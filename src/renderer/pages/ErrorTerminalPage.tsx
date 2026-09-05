import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ArrowDown, ShieldAlert, Sparkles, Filter, Database } from 'lucide-react';
import { useTerminalStore } from '../stores/terminalStore';
import { ErrorSummaryBanner } from '../components/terminal/ErrorSummaryBanner';
import { TerminalToolbar } from '../components/terminal/TerminalToolbar';
import { TerminalLogItem } from '../components/terminal/TerminalLogItem';
import { ForensicErrorInspector } from '../components/terminal/ForensicErrorInspector';
import { SandboxErrorSimulatorModal } from '../components/terminal/SandboxErrorSimulatorModal';

export const ErrorTerminalPage: React.FC = () => {
  const {
    filteredLogs,
    initialize,
    autoScroll,
    setAutoScroll,
    isPaused,
    hasNewLogsWhilePaused,
    unreadCountWhilePaused,
    selectedLog,
    isDrawerOpen,
    drawerWidth
  } = useTerminalStore();

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  // Handle auto-scroll to bottom when logs update
  useEffect(() => {
    if (autoScroll && !isPaused && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll, isPaused]);

  // Detect user manual scroll to disable autoScroll
  const handleScroll = () => {
    const el = terminalContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 35;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const scrollToBottom = () => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#0d0f17] text-neutral-100 select-text overflow-hidden relative">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
            <Terminal size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-neutral-100 flex items-center gap-2">
              <span>Error Terminal & Forensic Console</span>
              <span className="text-xs font-mono font-normal bg-blue-950 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-full">
                Live Trace
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Real-time Flow automation diagnostics, selector traces, state transitions, and root-cause analysis.
            </p>
          </div>
        </div>
      </div>

      {/* KPI / Summary Banner */}
      <ErrorSummaryBanner />

      {/* Main Terminal Frame */}
      <div
        className={`flex-1 flex flex-col bg-[#0f111a] border border-[#202534] rounded-xl overflow-hidden shadow-2xl transition-all ${
          isDrawerOpen ? 'mr-0' : ''
        }`}
        style={{
          marginRight: isDrawerOpen ? `${drawerWidth}px` : '0px'
        }}
      >
        {/* Sticky Terminal Toolbar */}
        <TerminalToolbar />

        {/* Live Terminal Log Stream Window */}
        <div
          ref={terminalContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-[#0a0c12] font-mono text-xs select-text relative"
        >
          {filteredLogs.length > 0 ? (
            <div className="min-w-full divide-y divide-[#151926]">
              {filteredLogs.map((log) => (
                <TerminalLogItem
                  key={log.id}
                  log={log}
                  isSelected={selectedLog?.id === log.id}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-500 space-y-2">
              <Terminal size={32} className="text-neutral-600 opacity-60" />
              <div className="text-sm font-medium text-neutral-400">No logs matching current filters</div>
              <p className="text-xs max-w-sm text-neutral-500">
                Adjust search query or category filters, or enable Live Debug mode to inspect verbose TRACE / DEBUG events.
              </p>
            </div>
          )}

          {/* Floating "↓ New Logs" notification pill */}
          {(!autoScroll || isPaused) && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-1.5 transition-all z-20 animate-bounce"
            >
              <ArrowDown size={13} />
              <span>
                {hasNewLogsWhilePaused
                  ? `↓ ${unreadCountWhilePaused} New Logs`
                  : '↓ Jump to newest'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Right-Side Forensic Error Inspector Drawer */}
      <ForensicErrorInspector />

      {/* Sandbox Error Simulator Modal */}
      <SandboxErrorSimulatorModal />
    </div>
  );
};
