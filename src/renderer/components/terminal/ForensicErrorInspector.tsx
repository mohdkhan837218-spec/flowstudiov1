import React, { useState } from 'react';
import {
  X,
  Pin,
  PinOff,
  Copy,
  Check,
  FolderArchive,
  RefreshCw,
  AlertOctagon,
  HelpCircle,
  Clock,
  Layers,
  Search,
  MousePointer,
  Code,
  Image as ImageIcon,
  ShieldAlert,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';
import { FlowDiagnosticError } from '../../../shared/types/diagnostics';

export const ForensicErrorInspector: React.FC = () => {
  const {
    selectedError,
    isDrawerOpen,
    isDrawerPinned,
    drawerWidth,
    activeDrawerTab,
    closeDrawer,
    togglePinDrawer,
    setDrawerWidth,
    setActiveDrawerTab,
    copyErrorReport,
    exportDebugBundle
  } = useTerminalStore();

  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  if (!isDrawerOpen || !selectedError) return null;

  const handleCopy = async () => {
    const ok = await copyErrorReport(selectedError);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetryJob = async () => {
    if (!selectedError.jobId || !window.flowWorkspace?.diagnostics?.retryJob) return;
    setRetrying(true);
    try {
      const res = await window.flowWorkspace.diagnostics.retryJob(selectedError.jobId);
      if (res.success) {
        setRetryResult('Job successfully re-queued');
      } else {
        setRetryResult(`Retry failed: ${res.message}`);
      }
      setTimeout(() => setRetryResult(null), 4000);
    } finally {
      setRetrying(false);
    }
  };

  const handleExportBundle = async () => {
    const path = await exportDebugBundle(selectedError.errorId);
    if (path) {
      setExportNotice(`Exported: ${path}`);
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const tabs: { id: typeof activeDrawerTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: HelpCircle },
    { id: 'timeline', label: 'Timeline & Chain', icon: Clock },
    { id: 'element', label: 'Selector Trace', icon: Search },
    { id: 'state', label: 'State & Click', icon: MousePointer },
    { id: 'dom', label: 'DOM & AX Tree', icon: Code },
    { id: 'screenshot', label: 'Screenshot & Route', icon: ImageIcon },
    { id: 'recovery', label: 'Recovery', icon: RefreshCw }
  ];

  return (
    <div
      style={{ width: `${drawerWidth}px` }}
      className="fixed right-0 top-14 bottom-0 bg-[#131620] border-l border-[#242a3e] z-40 flex flex-col shadow-2xl transition-all duration-150"
    >
      {/* Resizer Handle */}
      <div
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startW = drawerWidth;
          const onMouseMove = (ev: MouseEvent) => {
            const delta = startX - ev.clientX;
            setDrawerWidth(startW + delta);
          };
          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
        className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-50"
        title="Drag to resize Inspector"
      />

      {/* Header */}
      <div className="p-3.5 border-b border-[#242a3e] bg-[#161a27] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg shrink-0">
            <AlertOctagon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-rose-300 truncate">
                {selectedError.code}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/60">
                {selectedError.severity}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {selectedError.stage} {selectedError.step ? `• ${selectedError.step}` : ''}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 bg-[#1e2436] hover:bg-[#28314a] text-neutral-300 rounded-lg border border-[#2d3652] text-xs flex items-center gap-1 transition-all"
            title="Copy formatted forensic report to clipboard"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span className="hidden sm:inline text-[11px]">{copied ? 'Copied' : 'Report'}</span>
          </button>

          <button
            type="button"
            onClick={togglePinDrawer}
            className={`p-1.5 rounded-lg border text-xs transition-all ${
              isDrawerPinned
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-[#1e2436] text-neutral-400 border-[#2d3652] hover:text-neutral-200'
            }`}
            title={isDrawerPinned ? 'Unpin inspector drawer' : 'Pin inspector drawer'}
          >
            {isDrawerPinned ? <Pin size={13} /> : <PinOff size={13} />}
          </button>

          <button
            type="button"
            onClick={closeDrawer}
            className="p-1.5 bg-[#1e2436] hover:bg-rose-950/50 text-neutral-400 hover:text-rose-300 rounded-lg border border-[#2d3652] transition-all"
            title="Close inspector"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#11141c] border-b border-[#202536] overflow-x-auto text-xs select-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeDrawerTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveDrawerTab(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all whitespace-nowrap text-[11px] font-medium ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1c2233]'
              }`}
            >
              <Icon size={12} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
        {/* TAB 1: OVERVIEW */}
        {activeDrawerTab === 'overview' && (
          <div className="space-y-3.5">
            {/* Human Explanation Box */}
            <div className="bg-[#1b1e2b] border border-[#282f44] rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                Diagnostic Explanation
              </div>
              <p className="text-neutral-200 leading-relaxed text-xs">
                {selectedError.humanExplanation || selectedError.message}
              </p>
            </div>

            {/* Root Cause & Confidence Meter */}
            <div className="bg-[#171b26] border border-[#262c3e] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                  Likely Root Cause
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedError.confidence === 'HIGH'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : selectedError.confidence === 'MEDIUM'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {selectedError.confidence} Confidence
                </span>
              </div>
              <p className="text-rose-300/90 font-medium text-xs leading-snug">
                {selectedError.likelyRootCause}
              </p>
            </div>

            {/* Evidence List */}
            {selectedError.evidence && selectedError.evidence.length > 0 && (
              <div className="bg-[#171b26] border border-[#262c3e] rounded-xl p-3 space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                  Forensic Evidence
                </div>
                <ul className="space-y-1">
                  {selectedError.evidence.map((ev, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-neutral-300 font-mono text-[11px]">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expected vs Actual Diff Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-[#131b26] border border-blue-900/40 rounded-xl p-3">
                <div className="text-[11px] uppercase font-bold text-blue-400 mb-1.5">Expected State</div>
                <pre className="text-[11px] font-mono text-blue-200/90 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(selectedError.expected, null, 2)}
                </pre>
              </div>

              <div className="bg-[#241419] border border-rose-900/40 rounded-xl p-3">
                <div className="text-[11px] uppercase font-bold text-rose-400 mb-1.5">Actual State</div>
                <pre className="text-[11px] font-mono text-rose-200/90 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(selectedError.actual, null, 2)}
                </pre>
              </div>
            </div>

            {/* Metadata Summary Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-[#181c28] p-2.5 rounded-lg border border-[#252c40]">
                <span className="text-neutral-500 block text-[10px]">LAST SUCCESSFUL STEP</span>
                <span className="text-emerald-300 font-medium">{selectedError.lastSuccessfulStep}</span>
              </div>
              <div className="bg-[#181c28] p-2.5 rounded-lg border border-[#252c40]">
                <span className="text-neutral-500 block text-[10px]">CURRENT ACTION</span>
                <span className="text-amber-300 font-medium">{selectedError.currentAction}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIMELINE & CHAIN */}
        {activeDrawerTab === 'timeline' && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              Exact Execution Chain
            </div>

            <div className="relative pl-5 space-y-2 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#28314a]">
              {selectedError.timeline && selectedError.timeline.length > 0 ? (
                selectedError.timeline.map((item, idx) => (
                  <div key={item.actionId || idx} className="relative group">
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                        item.result === 'SUCCESS'
                          ? 'bg-emerald-500 border-[#131620]'
                          : item.result === 'FAILED'
                          ? 'bg-rose-500 border-[#131620]'
                          : 'bg-amber-500 border-[#131620]'
                      }`}
                    />

                    <div className="bg-[#181c28] border border-[#262d42] rounded-lg p-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="text-blue-400 font-bold">[{item.stage}]</span>
                        <span className="text-neutral-500">{item.time}</span>
                      </div>
                      <div className="font-mono text-xs text-neutral-200">
                        {item.action} {item.target ? `-> ${item.target}` : ''}
                      </div>
                      {item.detail && (
                        <div className="text-[11px] text-rose-300/80 font-mono mt-1">
                          Detail: {item.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-neutral-500 text-xs py-4 text-center">No timeline events recorded.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SELECTOR TRACE */}
        {activeDrawerTab === 'element' && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              Discovery Strategies Tested
            </div>

            {selectedError.discoveryMethods && selectedError.discoveryMethods.length > 0 ? (
              <div className="space-y-2">
                {selectedError.discoveryMethods.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border font-mono text-xs ${
                      m.status === 'MATCH_FOUND'
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                        : 'bg-[#181c28] border-[#283046] text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span>{m.method}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          m.status === 'MATCH_FOUND'
                            ? 'bg-emerald-900 text-emerald-300'
                            : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {m.status} ({m.matchCount} matches)
                      </span>
                    </div>
                    {m.detail && <p className="text-[11px] text-neutral-400 mt-1">{m.detail}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#181c28] border border-[#283046] p-3 rounded-lg text-neutral-400 text-xs">
                No element discovery logs for this action.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STATE & CLICK */}
        {activeDrawerTab === 'state' && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              Before / Action / After State Transition
            </div>

            {selectedError.stateTransition ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="bg-[#141b2b] border border-blue-900/40 p-3 rounded-lg">
                  <div className="text-[10px] text-blue-400 uppercase font-bold mb-1">State BEFORE Action</div>
                  <pre className="text-[11px] text-blue-200 whitespace-pre-wrap">
                    {JSON.stringify(selectedError.stateTransition.before, null, 2)}
                  </pre>
                </div>

                <div className="flex items-center justify-center gap-2 py-1 text-neutral-400 font-bold">
                  <ChevronRight size={14} className="text-amber-400" />
                  <span>{selectedError.stateTransition.action}</span>
                  <ChevronRight size={14} className="text-amber-400" />
                </div>

                <div className="bg-[#241318] border border-rose-900/40 p-3 rounded-lg">
                  <div className="text-[10px] text-rose-400 uppercase font-bold mb-1">
                    State AFTER Action (Transition Result: {selectedError.stateTransition.result})
                  </div>
                  <pre className="text-[11px] text-rose-200 whitespace-pre-wrap">
                    {JSON.stringify(selectedError.stateTransition.after, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-[#181c28] border border-[#283046] p-3 rounded-lg text-neutral-400 text-xs">
                No state transition diff captured for this operation.
              </div>
            )}

            {selectedError.clickDiagnostic && (
              <div className="bg-[#181c28] border border-[#283046] p-3 rounded-lg space-y-1.5 font-mono text-xs">
                <div className="text-[10px] text-purple-400 uppercase font-bold">Click Diagnostic Trace</div>
                <div className="text-neutral-300">Target: {selectedError.clickDiagnostic.target}</div>
                <div className="text-neutral-300">Method: {selectedError.clickDiagnostic.method}</div>
                <div className="text-neutral-300">Visible: {String(selectedError.clickDiagnostic.visible)}</div>
                <div className="text-neutral-300">Enabled: {String(selectedError.clickDiagnostic.enabled)}</div>
                <div className="text-neutral-300">Click Result: {selectedError.clickDiagnostic.result}</div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DOM & AX TREE */}
        {activeDrawerTab === 'dom' && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              Sanitized DOM Snapshot
            </div>
            {selectedError.domSnippet ? (
              <div className="bg-[#10131c] border border-[#242b3e] rounded-lg p-3 overflow-x-auto">
                <pre className="font-mono text-[11px] text-emerald-300/90 whitespace-pre-wrap">
                  {selectedError.domSnippet}
                </pre>
              </div>
            ) : (
              <div className="bg-[#181c28] border border-[#283046] p-3 rounded-lg text-neutral-400 text-xs">
                No DOM snippet available for this error event.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SCREENSHOT & ROUTE */}
        {activeDrawerTab === 'screenshot' && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              Route & Screenshot Context
            </div>

            {selectedError.flowUrl && (
              <div className="bg-[#181c28] border border-[#283046] p-3 rounded-lg font-mono text-xs space-y-1">
                <span className="text-neutral-500 text-[10px] block">ACTIVE FLOW URL</span>
                <span className="text-blue-300 break-all">{selectedError.flowUrl}</span>
              </div>
            )}

            {selectedError.screenshotPath ? (
              <div className="border border-[#283046] rounded-lg overflow-hidden bg-black">
                <img
                  src={`file://${selectedError.screenshotPath}`}
                  alt="Error state capture"
                  className="w-full h-auto object-contain"
                />
              </div>
            ) : (
              <div className="bg-[#181c28] border border-[#283046] p-4 rounded-lg text-neutral-400 text-xs text-center">
                No screenshot captured at error moment.
              </div>
            )}
          </div>
        )}

        {/* TAB 7: RECOVERY */}
        {activeDrawerTab === 'recovery' && (
          <div className="space-y-3.5">
            <div className="bg-[#181c28] border border-[#283046] rounded-xl p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                Recovery Engine Strategy
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Strategy:</span>
                <span className="font-mono text-purple-300 font-semibold">{selectedError.retryStrategy}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Retryable:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {selectedError.retryable ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Max Retries:</span>
                <span className="font-mono text-neutral-200">{selectedError.maxRetries}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleRetryJob}
                disabled={retrying || !selectedError.jobId}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md disabled:opacity-50"
              >
                <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
                <span>{retrying ? 'Re-queueing Job...' : 'Re-Queue / Retry Job'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportBundle}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#1e2436] hover:bg-[#28314a] border border-[#2d3652] text-neutral-200 font-medium rounded-lg text-xs transition-all"
              >
                <FolderArchive size={13} className="text-purple-400" />
                <span>Export Forensic Debug Bundle (Zip)</span>
              </button>
            </div>

            {retryResult && (
              <div className="p-2.5 bg-blue-950 border border-blue-800 text-blue-200 rounded-lg text-xs font-mono">
                {retryResult}
              </div>
            )}
            {exportNotice && (
              <div className="p-2.5 bg-purple-950 border border-purple-800 text-purple-200 rounded-lg text-xs font-mono">
                {exportNotice}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
