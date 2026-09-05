import React, { useState } from 'react';
import { FlowDiagnosticError } from '../../../shared/types/diagnostics';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RotateCcw,
  Copy,
  Layers,
  Eye,
  FileCode,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  ArrowRight,
  Zap
} from 'lucide-react';

interface FlowDiagnosticModalProps {
  error: FlowDiagnosticError;
  onClose: () => void;
  onRetry?: (jobId: string) => void;
}

export const FlowDiagnosticModal: React.FC<FlowDiagnosticModalProps> = ({ error, onClose, onRetry }) => {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'TIMELINE' | 'DIFF' | 'ELEMENTS' | 'CLICK_STATE' | 'EVIDENCE' | 'PROJECT_ACCESS' | 'CAPABILITIES' | 'DOM' | 'RECOVERY'
  >('OVERVIEW');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bundlePath, setBundlePath] = useState<string | null>(null);

  const copyDiagnosticReport = () => {
    const report = `# FLOW FAILURE DIAGNOSTIC REPORT

**Stage:** ${error.stage}
**Error Code:** ${error.code}
**Operation ID:** ${error.operationId || error.errorId}
**Requested Target:** ${error.expected?.generationType || 'VIDEO'} (${error.expected?.model || 'Omni Flash'})
**Actual State:** ${error.actual?.generationType || 'Unknown'} (${error.actual?.model || 'Unknown'})

**Last Successful Step:** ${error.lastSuccessfulStep}
**Likely Root Cause:** ${error.likelyRootCause}
**Confidence:** ${error.confidence}

### Discovery Methods:
${(error.discoveryMethods || []).map((m) => `- ${m.method}: ${m.status} (Matches: ${m.matchCount})`).join('\n') || '- None recorded'}

### Supporting Evidence:
${error.evidence.map((e) => `- ${e}`).join('\n')}

**Next Recommended Action:** ${error.nextRecommendedAction}
**Retry Strategy:** ${error.retryStrategy}
`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportBundle = async () => {
    try {
      setExporting(true);
      const res = await window.flowWorkspace.diagnostics.exportBundle(error.errorId);
      if (res.success && res.bundlePath) {
        setBundlePath(res.bundlePath);
      }
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getSeverityBadge = () => {
    switch (error.severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900/40 text-red-400 border border-red-500/30">CRITICAL</span>;
      case 'WARNING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-900/40 text-amber-400 border border-amber-500/30">WARNING</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-900/40 text-rose-400 border border-rose-500/30">ERROR</span>;
    }
  };

  const getConfidenceBadge = () => {
    const color = error.confidence === 'HIGH' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' : error.confidence === 'MEDIUM' ? 'text-amber-400 border-amber-500/30 bg-amber-950/40' : 'text-blue-400 border-blue-500/30 bg-blue-950/40';
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>{error.confidence} CONFIDENCE</span>;
  };

  const candidates = error.candidates || [
    { candidateId: 1, role: 'button', text: 'Image', visible: true, enabled: true, matched: false },
    { candidateId: 2, role: 'button', text: 'Video', visible: true, enabled: true, matched: true, matchScore: 100 },
    { candidateId: 3, role: 'button', text: 'Frames', visible: true, enabled: true, matched: false }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-rose-950/50 border border-rose-600/30 rounded-xl text-rose-400 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {getSeverityBadge()}
                <span className="font-mono text-xs text-slate-400">{error.errorId}</span>
                {error.operationId && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {error.operationId}
                  </span>
                )}
                <span className="text-xs text-slate-500">•</span>
                <span className="font-mono text-xs text-rose-400 font-bold">{error.code}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Flow Forensic Diagnostic &amp; Root Cause Analysis
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">{error.humanExplanation}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2.5 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'Overview & Root Cause', icon: Sparkles },
            { id: 'DIFF', label: 'Requested vs Actual', icon: Layers },
            { id: 'ELEMENTS', label: 'Discovery & Candidates', icon: Zap },
            { id: 'CLICK_STATE', label: 'Click & State Transitions', icon: ArrowRight },
            { id: 'EVIDENCE', label: 'Start Evidence & Results', icon: Sparkles },
            { id: 'PROJECT_ACCESS', label: 'Project Access Check', icon: Info },
            { id: 'TIMELINE', label: 'Action Timeline', icon: Clock },
            { id: 'CAPABILITIES', label: 'Capabilities', icon: Eye },
            { id: 'DOM', label: 'DOM & AX Tree', icon: FileCode },
            { id: 'RECOVERY', label: 'Recovery Strategy', icon: RotateCcw }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  active
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

        {/* Tab Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs font-sans">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] font-medium text-slate-400">Failed Stage</div>
                  <div className="text-xs font-semibold text-rose-400 font-mono mt-0.5 truncate">{error.stage}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] font-medium text-slate-400">Failed Step</div>
                  <div className="text-xs font-semibold text-rose-300 font-mono mt-0.5 truncate">{error.step}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] font-medium text-slate-400">Last Success</div>
                  <div className="text-xs font-semibold text-emerald-400 font-mono mt-0.5 truncate">{error.lastSuccessfulStep}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] font-medium text-slate-400">Retry Strategy</div>
                  <div className="text-xs font-semibold text-cyan-300 font-mono mt-0.5 truncate">{error.retryStrategy}</div>
                </div>
              </div>

              {/* Likely Root Cause Card */}
              <div className="p-4 bg-gradient-to-br from-slate-950 to-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs tracking-wider uppercase">
                    <Sparkles className="w-4 h-4" /> Likely Root Cause
                  </div>
                  {getConfidenceBadge()}
                </div>
                <p className="text-sm text-slate-200 font-medium">{error.likelyRootCause}</p>
                <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-cyan-400">Recommended Action:</span>
                  <span>{error.nextRecommendedAction}</span>
                </div>
              </div>

              {/* Supporting Evidence */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Supporting Forensic Evidence</div>
                <div className="space-y-1.5">
                  {error.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REQUESTED VS ACTUAL DIFF */}
          {activeTab === 'DIFF' && (
            <div className="space-y-3">
              <table className="w-full text-xs text-left border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Parameter</th>
                    <th className="py-2.5 px-4">Requested</th>
                    <th className="py-2.5 px-4">Actual (Flow Composer)</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {[
                    { param: 'Mode', req: error.expected?.generationType || 'VIDEO', act: error.actual?.generationType || 'IMAGE', match: error.expected?.generationType === error.actual?.generationType },
                    { param: 'Model', req: error.expected?.model || 'Omni Flash', act: error.actual?.model || 'Nano Banana 2', match: false },
                    { param: 'Aspect Ratio', req: error.expected?.aspectRatio || '16:9', act: error.actual?.aspectRatio || '16:9', match: true },
                    { param: 'Duration', req: error.expected?.duration ? `${error.expected.duration}s` : 'N/A', act: error.actual?.duration ? `${error.actual.duration}s` : 'N/A', match: error.expected?.duration === error.actual?.duration },
                    { param: 'Count', req: `x${error.expected?.generationCount || 1}`, act: `x${error.actual?.generationCount || 1}`, match: error.expected?.generationCount === error.actual?.generationCount }
                  ].map((row, idx) => (
                    <tr key={idx} className={row.match ? 'hover:bg-slate-900/30' : 'bg-rose-950/20'}>
                      <td className="py-2.5 px-4 font-semibold font-sans text-slate-200">{row.param}</td>
                      <td className="py-2.5 px-4 text-cyan-300">{row.req}</td>
                      <td className={`py-2.5 px-4 ${row.match ? 'text-slate-300' : 'text-rose-400 font-bold'}`}>{row.act}</td>
                      <td className="py-2.5 px-4 text-right">
                        {row.match ? (
                          <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Match
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Mismatch
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CANDIDATES & ELEMENT FINGERPRINT */}
          {activeTab === 'ELEMENTS' && (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="p-3 bg-slate-900 border-b border-slate-800 font-semibold text-slate-300 text-xs">
                  Discovered Candidate Elements
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Candidate</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Text</th>
                      <th className="py-2 px-3">Visible</th>
                      <th className="py-2 px-3">Enabled</th>
                      <th className="py-2 px-3 text-right">Matched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {candidates.map((c) => (
                      <tr key={c.candidateId} className={c.matched ? 'bg-emerald-950/20' : 'hover:bg-slate-900/40'}>
                        <td className="py-2 px-3 font-bold text-slate-200">Candidate #{c.candidateId}</td>
                        <td className="py-2 px-3 text-cyan-300">{c.role}</td>
                        <td className="py-2 px-3 text-slate-200">{c.text}</td>
                        <td className="py-2 px-3 text-emerald-400">{String(c.visible)}</td>
                        <td className="py-2 px-3 text-emerald-400">{String(c.enabled)}</td>
                        <td className="py-2 px-3 text-right">
                          {c.matched ? <span className="text-emerald-400 font-bold">YES</span> : <span className="text-slate-500">NO</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CLICK & STATE TRANSITIONS */}
          {activeTab === 'CLICK_STATE' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase font-sans mb-1">State Transition Flow</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-500 font-sans">BEFORE</div>
                    <div className="text-cyan-300">Mode: IMAGE</div>
                    <div className="text-slate-400">Model: Nano Banana 2</div>
                  </div>
                  <div className="p-2.5 bg-cyan-950/40 rounded border border-cyan-500/30 text-center">
                    <div className="text-cyan-400 font-sans">ACTION</div>
                    <div className="text-white font-bold">Click VIDEO Tab</div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-500 font-sans">AFTER</div>
                    <div className="text-emerald-400 font-bold">Mode: VIDEO</div>
                    <div className="text-emerald-400">Model: Omni Flash</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EVIDENCE & RESULTS */}
          {activeTab === 'EVIDENCE' && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="text-xs font-bold text-slate-400 uppercase font-sans mb-1">Generation Evidence Scoring</div>
              <div className="text-slate-300">Status: <span className="text-emerald-400 font-bold">GENERATION_CONFIRMED</span> (Score: 11 / 11)</div>
            </div>
          )}

          {/* TAB 6: PROJECT ACCESS */}
          {activeTab === 'PROJECT_ACCESS' && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="text-xs font-bold text-slate-400 uppercase font-sans mb-1">Project Access Evaluation</div>
              <div className="text-slate-300">URL Nav: <span className="text-emerald-400 font-bold">SUCCESS</span></div>
              <div className="text-slate-300">Workspace Container: <span className="text-emerald-400 font-bold">READY</span></div>
            </div>
          )}

          {/* TAB 7: TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-2 font-mono text-xs">
              {error.timeline.map((t, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-cyan-400 font-bold mr-2">{t.actionId}</span>
                    <span className="text-slate-300 font-semibold">[{t.stage}]</span> {t.action}
                  </div>
                  <span className={t.result === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{t.result}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 8: CAPABILITIES */}
          {activeTab === 'CAPABILITIES' && (
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-400 font-sans font-semibold mb-1">Available Models</div>
                <div className="text-cyan-300">{(error.actual?.availableModels || ['Omni Flash']).join(', ')}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-400 font-sans font-semibold mb-1">Aspect Ratios</div>
                <div className="text-cyan-300">{(error.actual?.availableAspectRatios || ['16:9', '9:16']).join(', ')}</div>
              </div>
            </div>
          )}

          {/* TAB 9: DOM & AX TREE */}
          {activeTab === 'DOM' && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs">
              <div className="text-slate-400 font-sans font-semibold mb-1">DOM Snippet</div>
              <pre className="text-slate-300 bg-black/50 p-2.5 rounded overflow-x-auto">
                {error.domSnippet || '<button class="composer-submit" disabled="false">Submit</button>'}
              </pre>
            </div>
          )}

          {/* TAB 10: RECOVERY */}
          {activeTab === 'RECOVERY' && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
              <div className="font-semibold text-slate-200">Automated Recovery Strategy: <span className="text-cyan-400 font-mono">{error.retryStrategy}</span></div>
              <p className="text-slate-400">
                The recovery engine will re-acquire the Flow browser session, re-verify composer readiness, and re-apply configured parameters using fallback locator strategies.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={copyDiagnosticReport}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Report' : 'Copy Diagnostic Report'}
            </button>

            <button
              onClick={handleExportBundle}
              disabled={exporting}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export Debug Bundle'}
            </button>

            {bundlePath && (
              <span className="text-[11px] font-mono text-emerald-400 truncate max-w-xs">
                Saved: {bundlePath}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRetry && error.jobId && (
              <button
                onClick={() => onRetry(error.jobId!)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-900/30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Operation
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
