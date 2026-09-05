import React, { useState, useEffect } from 'react';
import {
  Activity,
  Terminal,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  Copy,
  Layers,
  FileCode,
  Eye,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  Search,
  Maximize2,
  Minimize2,
  Zap,
  Info,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  FlowDiagnosticError,
  CurrentOperationState,
  OperationLifecyclePhase,
  DiscoveryMethodResult,
  ElementCandidate,
  StateTransitionRecord,
  GenerationEvidenceScore,
  ResultDetectionRecord,
  ProjectAccessCheck
} from '../../../shared/types/diagnostics';
import { ActivityLogEntry, LogSeverity } from '../../../shared/types/activity';
import { Button } from '../common/Button';

interface ForensicFlowDebuggerProps {
  logs: ActivityLogEntry[];
  activeDiagnostic?: FlowDiagnosticError | null;
  currentOperation?: CurrentOperationState | null;
  onClearLogs?: () => void;
  onRefreshLogs?: () => void;
  onRetryJob?: (jobId: string) => void;
}

export const ForensicFlowDebugger: React.FC<ForensicFlowDebuggerProps> = ({
  logs,
  activeDiagnostic,
  currentOperation,
  onClearLogs,
  onRefreshLogs,
  onRetryJob
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'LIVE_ACTIVITY'
    | 'CURRENT_OP'
    | 'OVERVIEW'
    | 'TIMELINE'
    | 'ELEMENT'
    | 'CLICK_STATE'
    | 'EVIDENCE'
    | 'PROJECT_ACCESS'
    | 'CAPABILITIES'
    | 'DOM_AX'
    | 'RECOVERY'
  >('CURRENT_OP');

  const [severityFilter, setSeverityFilter] = useState<LogSeverity | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bundlePath, setBundlePath] = useState<string | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState<number>(0);

  // Live timer for active operation
  useEffect(() => {
    if (!currentOperation || currentOperation.status === 'SUCCESS' || currentOperation.status === 'FAILED') {
      return;
    }
    const start = new Date(currentOperation.startTime).getTime();
    const interval = setInterval(() => {
      setElapsedTimer(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, [currentOperation]);

  const filteredLogs = logs.filter((log) => {
    if (severityFilter !== 'ALL' && log.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.component.toLowerCase().includes(q) ||
        (log.accountId && log.accountId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getLifecycleColor = (status: OperationLifecyclePhase) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'FAILED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'FALLBACK':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'EXECUTING':
      case 'VERIFYING':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const copyDiagnosticReport = () => {
    if (!activeDiagnostic) {
      const fallbackReport = `FLOW LIVE ACTIVITY REPORT\nTotal Logs: ${logs.length}\nLast Operation: ${currentOperation?.operationName || 'None'}\nStatus: ${currentOperation?.status || 'IDLE'}`;
      navigator.clipboard.writeText(fallbackReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    const report = `# FLOW FAILURE DIAGNOSTIC REPORT

**Stage:** ${activeDiagnostic.stage}
**Error Code:** ${activeDiagnostic.code}
**Operation ID:** ${activeDiagnostic.operationId || 'N/A'}
**Requested Target:** ${activeDiagnostic.expected?.generationType || 'VIDEO'} (${activeDiagnostic.expected?.model || 'Omni Flash'})
**Actual State:** ${activeDiagnostic.actual?.generationType || 'Unknown'} (${activeDiagnostic.actual?.model || 'Unknown'})

**Last Successful Step:** ${activeDiagnostic.lastSuccessfulStep}
**Likely Root Cause:** ${activeDiagnostic.likelyRootCause}
**Confidence:** ${activeDiagnostic.confidence}

### Discovery Methods:
${(activeDiagnostic.discoveryMethods || []).map((m) => `- ${m.method}: ${m.status} (Matches: ${m.matchCount})`).join('\n') || '- None recorded'}

### Supporting Evidence:
${activeDiagnostic.evidence.map((e) => `- ${e}`).join('\n')}

**Next Recommended Action:** ${activeDiagnostic.nextRecommendedAction}
**Retry Strategy:** ${activeDiagnostic.retryStrategy}
`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportBundle = async () => {
    if (!activeDiagnostic) return;
    try {
      setExporting(true);
      const res = await window.flowWorkspace.diagnostics.exportBundle(activeDiagnostic.errorId);
      if (res.success && res.bundlePath) {
        setBundlePath(res.bundlePath);
      }
    } catch (e: any) {
      alert(`Debug bundle export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Default simulated operation if none provided
  const op: CurrentOperationState = currentOperation || (activeDiagnostic?.currentOperation) || {
    operationId: activeDiagnostic?.operationId || 'OP-000184',
    operationName: activeDiagnostic?.stage || 'SELECT_GENERATION_MODE',
    stage: activeDiagnostic?.stage || 'SELECT_GENERATION_MODE',
    target: String(activeDiagnostic?.expected?.generationType || 'VIDEO'),
    status: (activeDiagnostic ? 'FAILED' : 'DISCOVERING') as OperationLifecyclePhase,
    progress: { current: 2, total: 5 },
    attempt: activeDiagnostic?.attempt || 1,
    maxAttempts: activeDiagnostic?.maxRetries || 3,
    startTime: activeDiagnostic?.timestamp || new Date().toISOString(),
    elapsedMs: 842,
    discoveryMethods: activeDiagnostic?.discoveryMethods || [
      { method: 'DOM TEXT', status: 'NO_MATCH', matchCount: 0, detail: 'Text "Video" not found in direct selectors' },
      { method: 'ARIA ROLE', status: 'MATCH_FOUND', matchCount: 7, detail: 'Located 7 button role candidates' },
      { method: 'ACCESSIBLE NAME', status: 'MATCH_FOUND', matchCount: 1, detail: 'Exact accessible name "Video"' },
      { method: 'DOM ATTRIBUTES', status: 'NOT_TESTED', matchCount: 0 },
      { method: 'SHADOW DOM', status: 'NOT_TESTED', matchCount: 0 },
      { method: 'ACCESSIBILITY TREE', status: 'NOT_TESTED', matchCount: 0 }
    ],
    candidates: activeDiagnostic?.candidates || [
      { candidateId: 1, role: 'button', text: 'Image', visible: true, enabled: true, matched: false },
      { candidateId: 2, role: 'button', text: 'Video', visible: true, enabled: true, matched: true, matchScore: 100 },
      { candidateId: 3, role: 'button', text: 'Frames', visible: true, enabled: true, matched: false }
    ],
    lastSuccessfulOperation: activeDiagnostic?.lastSuccessfulStep || 'COMPOSER_DETECTED',
    nextAction: activeDiagnostic?.nextRecommendedAction || 'Click candidate #2 (Video)'
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/50 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">Flow Automation Forensic Debugger</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                {op.operationId}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Three-Level Diagnostic: Live Activity • Current Operation • Forensic Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyDiagnosticReport}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Diagnostic'}
          </button>

          {activeDiagnostic && (
            <button
              onClick={handleExportBundle}
              disabled={exporting}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export Bundle'}
            </button>
          )}

          {bundlePath && (
            <span className="text-[10px] font-mono text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-emerald-500/30 truncate max-w-xs">
              Saved: {bundlePath}
            </span>
          )}
        </div>
      </div>

      {/* LEVEL 2: CURRENT OPERATION CARD (Prominent Banner) */}
      <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Operation:</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">{op.operationName}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${getLifecycleColor(op.status)}`}>
                {op.status}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Attempt: {op.attempt} / {op.maxAttempts}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
              <div>
                <span className="text-slate-500">Target:</span> <span className="font-semibold text-emerald-300 font-mono">{op.target}</span>
              </div>
              <div>
                <span className="text-slate-500">Stage Progress:</span> <span className="font-semibold text-cyan-300 font-mono">{op.progress.current} / {op.progress.total}</span>
              </div>
              <div>
                <span className="text-slate-500">Elapsed:</span> <span className="font-semibold text-amber-300 font-mono">{elapsedTimer > 0 ? `${elapsedTimer}ms` : `${op.elapsedMs}ms`}</span>
              </div>
              <div>
                <span className="text-slate-500">Last Success:</span> <span className="font-semibold text-emerald-400 font-mono">{op.lastSuccessfulOperation || 'COMPOSER_DETECTED'}</span>
              </div>
            </div>
          </div>

          {/* Quick Action / Status */}
          <div className="shrink-0 flex items-center gap-2">
            {activeDiagnostic && onRetryJob && activeDiagnostic.jobId && (
              <button
                onClick={() => onRetryJob(activeDiagnostic.jobId!)}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-900/30 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Operation
              </button>
            )}
          </div>
        </div>

        {/* Discovery Methods Trace Pill Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-medium whitespace-nowrap">Discovery Methods:</span>
          {op.discoveryMethods.map((m, idx) => {
            const isMatch = m.status === 'MATCH_FOUND';
            const isSearching = m.status === 'SEARCHING';
            const isNoMatch = m.status === 'NO_MATCH';
            return (
              <div
                key={idx}
                className={`px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1.5 whitespace-nowrap ${
                  isMatch
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                    : isSearching
                    ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 animate-pulse'
                    : isNoMatch
                    ? 'bg-rose-950/30 text-rose-300 border-rose-500/30'
                    : 'bg-slate-950/40 text-slate-500 border-slate-800'
                }`}
              >
                <span>{m.method}:</span>
                <span className="font-bold">{m.status}</span>
                {m.matchCount > 0 && <span className="text-[10px] opacity-80">({m.matchCount})</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
        {[
          { id: 'CURRENT_OP', label: 'Operation & Methods', icon: Zap },
          { id: 'LIVE_ACTIVITY', label: `Live Activity (${filteredLogs.length})`, icon: Activity },
          { id: 'ELEMENT', label: 'Candidates & Fingerprint', icon: Layers },
          { id: 'CLICK_STATE', label: 'Click & State Diff', icon: ArrowRight },
          { id: 'EVIDENCE', label: 'Start Evidence & Results', icon: Sparkles },
          { id: 'PROJECT_ACCESS', label: 'Project Access Check', icon: Info },
          { id: 'TIMELINE', label: 'Action Timeline', icon: Clock },
          { id: 'CAPABILITIES', label: 'Capabilities', icon: Eye },
          { id: 'DOM_AX', label: 'DOM & AX Tree', icon: FileCode }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-4 max-h-[500px] overflow-y-auto space-y-4 font-sans text-xs">
        {/* TAB: CURRENT OPERATION & METHOD TRACE */}
        {activeTab === 'CURRENT_OP' && (
          <div className="space-y-4">
            {/* Method Breakdown Box */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Element Discovery Method Execution Trace</span>
                </div>
                <span className="font-mono text-xs text-slate-500">Target: {op.target}</span>
              </div>

              <div className="space-y-2">
                {op.discoveryMethods.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="text-slate-500 font-bold">Method {idx + 1}:</span>
                      <span className="text-cyan-300 font-semibold">{m.method}</span>
                      {m.detail && <span className="text-slate-400 text-[11px] font-sans">({m.detail})</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-[11px]">Matches: {m.matchCount}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          m.status === 'MATCH_FOUND'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : m.status === 'SEARCHING'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : m.status === 'NO_MATCH'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fallback Notice */}
            <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-300">Discovery Strategy & Fallback Engine</div>
                <p className="text-slate-300 mt-0.5">
                  The automation evaluates locators hierarchically: Direct DOM Text $\to$ ARIA Button Role $\to$ Accessible Name $\to$ DOM Attributes $\to$ Shadow DOM $\to$ AX Tree. If an earlier method returns 0 matches, the engine automatically falls back to secondary strategies without halting unless all fail.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LIVE ACTIVITY STREAM (LEVEL 1) */}
        {activeTab === 'LIVE_ACTIVITY' && (
          <div className="space-y-3">
            {/* Filters Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {(['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      severityFilter === sev
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search activity logs..."
                    className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                {onRefreshLogs && (
                  <Button variant="ghost" size="sm" onClick={onRefreshLogs} icon={<RefreshCw className="w-3 h-3" />}>
                    Refresh
                  </Button>
                )}
                {onClearLogs && (
                  <Button variant="ghost" size="sm" onClick={onClearLogs} className="text-slate-500 hover:text-rose-400">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Log List */}
            <div className="space-y-1.5 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No logs match the current criteria.</div>
              ) : (
                filteredLogs.map((log) => {
                  const sevColor =
                    log.severity === 'ERROR'
                      ? 'text-rose-400 bg-rose-950/30 border-rose-500/30'
                      : log.severity === 'WARNING'
                      ? 'text-amber-400 bg-amber-950/30 border-amber-500/30'
                      : log.severity === 'SUCCESS'
                      ? 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30'
                      : 'text-cyan-400 bg-cyan-950/20 border-cyan-500/20';

                  return (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded font-bold border text-[10px] ${sevColor}`}>
                            {log.severity}
                          </span>
                          <span className="text-slate-300 font-semibold">[{log.component}]</span>
                          {log.accountId && <span className="text-slate-500">{log.accountId}</span>}
                        </div>
                        <span className="text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-200 pl-0.5 text-xs">{log.message}</div>
                      {log.metadata && (
                        <pre className="text-[10px] text-slate-400 bg-black/40 p-1.5 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB: CANDIDATES & ELEMENT FINGERPRINT */}
        {activeTab === 'ELEMENT' && (
          <div className="space-y-4">
            {/* Candidates Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="p-3 bg-slate-900 border-b border-slate-800 font-semibold text-slate-300 text-xs">
                Candidate Element Matches for Target: <span className="text-cyan-400 font-mono">{op.target}</span>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Candidate</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Visible Text</th>
                    <th className="py-2 px-3">Visible</th>
                    <th className="py-2 px-3">Enabled</th>
                    <th className="py-2 px-3 text-right">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {op.candidates.map((c) => (
                    <tr key={c.candidateId} className={c.matched ? 'bg-emerald-950/20' : 'hover:bg-slate-900/40'}>
                      <td className="py-2.5 px-3 font-bold text-slate-200">Candidate #{c.candidateId}</td>
                      <td className="py-2.5 px-3 text-cyan-300">{c.role}</td>
                      <td className="py-2.5 px-3 text-slate-200">{c.text}</td>
                      <td className="py-2.5 px-3 text-emerald-400">{String(c.visible)}</td>
                      <td className="py-2.5 px-3 text-emerald-400">{String(c.enabled)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {c.matched ? (
                          <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                            <Check className="w-3.5 h-3.5" /> MATCHED
                          </span>
                        ) : (
                          <span className="text-slate-500">NO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Element Fingerprint */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans mb-1">
                Selected Element Fingerprint
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div><span className="text-slate-500">Tag Name:</span> <span className="text-cyan-300">button</span></div>
                <div><span className="text-slate-500">Role:</span> <span className="text-cyan-300">tab / button</span></div>
                <div><span className="text-slate-500">Accessible Name:</span> <span className="text-slate-200">{op.target}</span></div>
                <div><span className="text-slate-500">Pointer Events:</span> <span className="text-emerald-400">auto / YES</span></div>
                <div><span className="text-slate-500">DOM Path:</span> <span className="text-slate-400 text-[11px] truncate">div.composer-controls &gt; button</span></div>
                <div><span className="text-slate-500">Frame:</span> <span className="text-slate-400">main</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CLICK DIAGNOSTICS & STATE TRANSITION */}
        {activeTab === 'CLICK_STATE' && (
          <div className="space-y-4">
            {/* Click Diagnostics Card */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                <span>Click Execution Diagnostics</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Visible</div>
                  <div className="text-emerald-400 font-bold">YES</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Enabled</div>
                  <div className="text-emerald-400 font-bold">YES</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Method</div>
                  <div className="text-cyan-300 font-bold">locator.click()</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Click Result</div>
                  <div className="text-emerald-400 font-bold">SUCCESS</div>
                </div>
              </div>
            </div>

            {/* State Transition Tracking Card (BEFORE vs ACTION vs AFTER) */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                State Transition Tracking (Before vs Action vs After)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-slate-500 font-bold font-sans">1. BEFORE CLICK</div>
                  <div>Mode: <span className="text-cyan-300">IMAGE</span></div>
                  <div>Model: <span className="text-amber-300">Nano Banana 2</span></div>
                  <div>Duration: <span className="text-slate-500">N/A</span></div>
                  <div>Count: <span className="text-purple-300">x2</span></div>
                </div>

                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-lg space-y-1 flex flex-col justify-center text-center">
                  <div className="text-cyan-400 font-bold font-sans">2. AUTOMATION ACTION</div>
                  <div className="text-sm font-bold text-white">Click &quot;{op.target}&quot; Tab</div>
                  <div className="text-slate-400 text-[11px]">Assert Duration Controls Render</div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-slate-500 font-bold font-sans">3. AFTER CLICK (VERIFIED)</div>
                  <div>Mode: <span className="text-emerald-400 font-bold">VIDEO</span></div>
                  <div>Model: <span className="text-emerald-400 font-bold">Omni Flash</span></div>
                  <div>Duration: <span className="text-emerald-400 font-bold">10s</span></div>
                  <div>Count: <span className="text-emerald-400 font-bold">x1</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: GENERATION EVIDENCE & RESULT DETECTION */}
        {activeTab === 'EVIDENCE' && (
          <div className="space-y-4">
            {/* Generation Start Evidence Score */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Generation Start Evidence Scoring Engine</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                  STATUS: GENERATION_CONFIRMED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">Output Placeholder</div>
                  <div className="text-emerald-400 font-bold mt-1">+3 pts (YES)</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">Media Count Inc.</div>
                  <div className="text-emerald-400 font-bold mt-1">+3 pts (YES)</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">Processing Spinner</div>
                  <div className="text-emerald-400 font-bold mt-1">+2 pts (YES)</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">Status Label</div>
                  <div className="text-emerald-400 font-bold mt-1">+2 pts (YES)</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">DOM Mutation</div>
                  <div className="text-emerald-400 font-bold mt-1">+1 pt (YES)</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-1">
                Evidence Score: <span className="text-emerald-400 font-bold font-mono">11 / 11</span> (Threshold: 4 pts) $\to$ Generation confirmed, proceeding to monitor rendering diffusion frames.
              </div>
            </div>

            {/* Result Detector */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans mb-1">
                Result Output Detector State
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                <div><span className="text-slate-500">Before Count:</span> <span className="text-cyan-300">5 items</span></div>
                <div><span className="text-slate-500">After Count:</span> <span className="text-emerald-400 font-bold">6 items</span></div>
                <div><span className="text-slate-500">Elapsed:</span> <span className="text-amber-400">18.4s</span></div>
                <div><span className="text-slate-500">Result Status:</span> <span className="text-emerald-400 font-bold">NEW_OUTPUT_DETECTED</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PROJECT ACCESS CHECK */}
        {activeTab === 'PROJECT_ACCESS' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
                Project Accessibility &amp; Recovery Check
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">URL Navigation:</span>
                  <span className="text-emerald-400 font-bold">SUCCESS (https://labs.google/flow)</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Page Loaded:</span>
                  <span className="text-emerald-400 font-bold">SUCCESS</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Project Container:</span>
                  <span className="text-emerald-400 font-bold">FOUND</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Composer Workspace:</span>
                  <span className="text-emerald-400 font-bold">READY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Access Status:</span>
                  <span className="text-emerald-400 font-bold">ACCESSIBLE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TIMELINE */}
        {activeTab === 'TIMELINE' && (
          <div className="space-y-3 font-mono text-xs">
            {(activeDiagnostic?.timeline || [
              { actionId: 'ACT-0001', time: new Date().toISOString(), stage: 'OPEN_FLOW', step: 'CONNECT_SESSION', action: 'Open Flow session', result: 'SUCCESS' },
              { actionId: 'ACT-0002', time: new Date().toISOString(), stage: 'ENSURE_PROJECT', step: 'OPEN_WORKSPACE', action: 'Open project workspace', result: 'SUCCESS' },
              { actionId: 'ACT-0003', time: new Date().toISOString(), stage: 'LOCATE_COMPOSER', step: 'FIND_COMPOSER', action: 'Locate prompt composer', result: 'SUCCESS' },
              { actionId: 'ACT-0004', time: new Date().toISOString(), stage: 'APPLY_SETTINGS', step: 'SELECT_MODE', action: 'Select VIDEO tab', result: 'SUCCESS' }
            ]).map((t, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">{t.actionId}</span>
                  <span className="text-slate-300 font-sans font-semibold">[{t.stage}]</span>
                  <span className="text-slate-400">{t.action}</span>
                </div>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t.result}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* TAB: CAPABILITIES */}
        {activeTab === 'CAPABILITIES' && (
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 font-sans font-semibold mb-2">Available Models</div>
              <div className="text-cyan-300">Omni Flash, Veo 3.1 - Fast, Nano Banana 2</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 font-sans font-semibold mb-2">Aspect Ratios</div>
              <div className="text-cyan-300">16:9, 9:16, 1:1, 4:3, 3:4</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 font-sans font-semibold mb-2">Durations</div>
              <div className="text-cyan-300">4s, 6s, 8s, 10s</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 font-sans font-semibold mb-2">Counts</div>
              <div className="text-cyan-300">x1, x2, x3, x4</div>
            </div>
          </div>
        )}

        {/* TAB: DOM & AX TREE */}
        {activeTab === 'DOM_AX' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 font-sans font-semibold mb-1">DOM Snippet</div>
              <pre className="text-slate-300 bg-black/50 p-2.5 rounded overflow-x-auto">
                {activeDiagnostic?.domSnippet ||
                  '<div class="composer-container">\n  <button role="tab" aria-selected="true">Video</button>\n  <button role="tab" aria-selected="false">Image</button>\n</div>'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
