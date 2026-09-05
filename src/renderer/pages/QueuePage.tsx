import React, { useEffect, useState } from 'react';
import {
  ListOrdered,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldAlert,
  Film,
  Sparkles,
  Layers,
  Search,
  X,
  ExternalLink,
  Download
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ComposerDebugPanel } from '../components/generation/ComposerDebugPanel';
import { FlowDiagnosticModal } from '../components/diagnostics/FlowDiagnosticModal';
import { ActiveGenerationCard } from '../components/preview/ActiveGenerationCard';
import { GenerationDetailsView } from '../components/preview/GenerationDetailsView';
import { useQueueStore } from '../stores/queueStore';
import { useLiveGenerationStore } from '../stores/liveGenerationStore';
import { JobStatus, WorkerStatus } from '../../shared/types/job';
import { FlowDiagnosticError } from '../../shared/types/diagnostics';
import { clsx } from 'clsx';

type StudioTab = 'studio' | 'previews' | 'queue' | 'history' | 'workers';

interface QueuePageProps {
  onNavigateToProjects?: () => void;
}

export const QueuePage: React.FC<QueuePageProps> = ({ onNavigateToProjects }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<FlowDiagnosticError | null>(null);

  const {
    jobs,
    workers,
    summary,
    loadQueue,
    cancelJob,
    retryJob,
    pauseQueue,
    resumeQueue,
    clearQueue,
    processQueue
  } = useQueueStore();

  const {
    activeGenerations,
    recentGenerations,
    stats,
    selectedJobId,
    loadGenerations,
    selectGeneration,
    setupSubscriptions
  } = useLiveGenerationStore();

  useEffect(() => {
    loadQueue();
    loadGenerations();
    const unsub = setupSubscriptions();
    return () => unsub();
  }, [loadQueue, loadGenerations, setupSubscriptions]);

  // Filter jobs by search
  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.jobId.toLowerCase().includes(q) ||
      job.prompt.toLowerCase().includes(q) ||
      job.status.toLowerCase().includes(q) ||
      (job.assignedAccountId && job.assignedAccountId.toLowerCase().includes(q))
    );
  });

  // Selected media for Side-Drawer Inspector
  const selectedMedia =
    activeGenerations.find((m) => m.jobId === selectedJobId) ||
    recentGenerations.find((m) => m.jobId === selectedJobId);

  const getJobStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'GENERATING':
      case 'SUBMITTING':
      case 'RESULT_DETECTED':
        return 'bg-amber-950/40 text-amber-300 border-amber-500/30 animate-pulse';
      case 'DOWNLOADING':
      case 'VERIFYING_DOWNLOAD':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 animate-pulse';
      case 'RUNNING':
      case 'STARTING':
      case 'FLOW_INITIALIZING':
      case 'FLOW_READY':
        return 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 animate-pulse';
      case 'QUEUED':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30';
      case 'FAILED':
      case 'MANUAL_ACTION_REQUIRED':
      case 'RECOVERY_REQUIRED':
        return 'bg-rose-950/40 text-rose-300 border-rose-500/30';
      case 'CANCELLED':
        return 'bg-slate-900/80 text-slate-500 border-slate-700/50';
      default:
        return 'bg-slate-900/80 text-slate-400 border-slate-700/60';
    }
  };

  const getWorkerStatusBadge = (status: WorkerStatus) => {
    switch (status) {
      case 'RUNNING_FLOW':
      case 'DOWNLOADING':
      case 'INITIALIZING_FLOW':
        return 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 animate-pulse';
      case 'IDLE':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'PAUSED':
        return 'bg-amber-950/40 text-amber-300 border-amber-500/30';
      case 'ERROR':
        return 'bg-rose-950/40 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-900/80 text-slate-400 border-slate-700/60';
    }
  };

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-[#090d16]/40">
      {/* Studio Top Toolbar */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-[#0b0f19] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'studio' as StudioTab, label: 'All-in-One Studio', icon: Layers },
            { id: 'previews' as StudioTab, label: `Live Previews (${stats.activeCount})`, icon: Film },
            { id: 'queue' as StudioTab, label: `Dispatch Queue (${jobs.length})`, icon: ListOrdered },
            { id: 'history' as StudioTab, label: `Completed (${recentGenerations.length})`, icon: CheckCircle2 },
            { id: 'workers' as StudioTab, label: `Workers (${workers.length})`, icon: Cpu }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'h-7.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/35 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Controls & Search */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-44 sm:w-56">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts or IDs..."
              className="w-full h-7 pl-7 pr-2.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => processQueue()}
            icon={<Zap className="w-3 h-3 text-amber-400" />}
            className="h-7 text-xs px-2"
            tooltip="Force immediate queue dispatch cycle"
          >
            Dispatch
          </Button>

          {summary.isPaused ? (
            <Button
              variant="success"
              size="sm"
              onClick={() => resumeQueue()}
              icon={<Play className="w-3 h-3" />}
              className="h-7 text-xs px-2"
            >
              Resume
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => pauseQueue()}
              icon={<Pause className="w-3 h-3" />}
              className="h-7 text-xs px-2 text-slate-400"
            >
              Pause
            </Button>
          )}

          {summary.queued + summary.waiting > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearQueue()}
              className="h-7 text-xs px-2 text-rose-400 hover:bg-rose-950/40"
              icon={<Trash2 className="w-3 h-3" />}
              tooltip="Clear pending queue"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Sleek Single-Line Status Ticker */}
      <div className="px-5 py-2 border-b border-white/[0.04] bg-[#090d16] flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className={clsx('w-1.5 h-1.5 rounded-full', stats.activeCount > 0 ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600')} />
            <span>Active: <strong className="text-indigo-300 font-bold">{stats.activeCount}</strong></span>
          </span>
          <span className="text-slate-700">•</span>
          <span>Queued: <strong className="text-cyan-300 font-bold">{summary.queued}</strong></span>
          <span className="text-slate-700">•</span>
          <span>Completed: <strong className="text-emerald-400 font-bold">{summary.completed}</strong></span>
          <span className="text-slate-700">•</span>
          <span>Failed: <strong className="text-rose-400 font-bold">{summary.failed}</strong></span>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <span>Worker Fleet: <strong className="text-slate-200">{summary.activeWorkers}/{summary.concurrencyLimit}</strong></span>
        </div>
      </div>

      {/* Main Workspace Area with Optional Side-Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Scrollable Area */}
        <div className="flex-1 p-4 lg:p-5 overflow-y-auto space-y-5">
          {/* Real-time Flow Composer Controller Debug Panel */}
          {jobs.find(
            (j) => j.status !== 'QUEUED' && j.status !== 'COMPLETED' && j.status !== 'FAILED' && j.status !== 'CANCELLED'
          ) && (
            <ComposerDebugPanel
              activeJob={jobs.find(
                (j) =>
                  j.status !== 'QUEUED' &&
                  j.status !== 'COMPLETED' &&
                  j.status !== 'FAILED' &&
                  j.status !== 'CANCELLED'
              )}
            />
          )}

          {/* TAB 1: ALL-IN-ONE STUDIO */}
          {activeTab === 'studio' && (
            <div className="space-y-5">
              {/* Active Generations Section */}
              {activeGenerations.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Live Video Rendering Streams ({activeGenerations.length})</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeGenerations.map((media) => (
                      <ActiveGenerationCard
                        key={media.jobId}
                        media={media}
                        isSelected={selectedJobId === media.jobId}
                        onSelect={(m) => selectGeneration(m.jobId)}
                        onCancel={(jobId) => cancelJob(jobId)}
                        onRetry={(jobId) => retryJob(jobId)}
                        onViewDiagnostics={(m) => {
                          if (m.diagnosticError) setSelectedDiagnostic(m.diagnosticError);
                          else {
                            window.flowWorkspace.diagnostics.getJobError(m.jobId).then((res) => {
                              if (res.success && res.error) setSelectedDiagnostic(res.error);
                            });
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* High Density Queue Table */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dispatch Queue Sequence ({filteredJobs.length})</span>
                  </h3>
                </div>

                {filteredJobs.length === 0 ? (
                  <div className="saas-card p-6 rounded-xl text-center text-xs text-slate-500">
                    Queue is currently empty.
                  </div>
                ) : (
                  <div className="saas-card rounded-xl overflow-hidden divide-y divide-white/[0.04]">
                    {filteredJobs.map((job) => (
                      <div
                        key={job.jobId}
                        onClick={() => selectGeneration(job.jobId)}
                        className={clsx(
                          'p-3 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02] cursor-pointer transition-colors',
                          selectedJobId === job.jobId ? 'bg-indigo-950/25 border-l-2 border-indigo-500' : ''
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-mono font-bold text-white text-[11px] shrink-0">{job.jobId}</span>

                          <span
                            className={clsx(
                              'px-1.5 py-0.2 rounded text-[9px] font-semibold border uppercase shrink-0',
                              getJobStatusBadge(job.status)
                            )}
                          >
                            {job.status}
                          </span>

                          <p className="text-slate-300 text-xs truncate">{job.prompt}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono text-slate-400">
                          <span>{job.duration}s · {job.aspectRatio}</span>
                          {job.assignedAccountId && (
                            <span className="text-indigo-400 truncate max-w-[100px] hidden sm:block">
                              {job.assignedAccountId}
                            </span>
                          )}

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {job.status === 'FAILED' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => retryJob(job.jobId)}
                                className="h-6 text-[10px] px-1.5"
                                icon={<RotateCcw className="w-2.5 h-2.5" />}
                              >
                                Retry
                              </Button>
                            )}

                            {(job.status === 'QUEUED' || job.status === 'RUNNING' || job.status === 'WAITING_FOR_WORKER') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelJob(job.jobId)}
                                className="h-6 text-[10px] px-1.5 text-slate-500 hover:text-rose-400"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Outputs Preview Grid */}
              {recentGenerations.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recent Completed Assets ({recentGenerations.length})</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {recentGenerations.slice(0, 6).map((media) => (
                      <ActiveGenerationCard
                        key={media.jobId}
                        media={media}
                        isSelected={selectedJobId === media.jobId}
                        onSelect={(m) => selectGeneration(m.jobId)}
                        onRetry={(jobId) => retryJob(jobId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE PREVIEWS */}
          {activeTab === 'previews' && (
            <div className="space-y-3">
              {activeGenerations.length === 0 ? (
                <EmptyState
                  icon={<Film className="w-6 h-6" />}
                  title="No Active Previews"
                  description="There are no video generations rendering right now."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {activeGenerations.map((media) => (
                    <ActiveGenerationCard
                      key={media.jobId}
                      media={media}
                      isSelected={selectedJobId === media.jobId}
                      onSelect={(m) => selectGeneration(m.jobId)}
                      onCancel={(jobId) => cancelJob(jobId)}
                      onRetry={(jobId) => retryJob(jobId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISPATCH QUEUE ONLY */}
          {activeTab === 'queue' && (
            <div className="space-y-2.5">
              <div className="saas-card rounded-xl overflow-hidden divide-y divide-white/[0.04]">
                {filteredJobs.map((job) => (
                  <div
                    key={job.jobId}
                    onClick={() => selectGeneration(job.jobId)}
                    className={clsx(
                      'p-3 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02] cursor-pointer transition-colors',
                      selectedJobId === job.jobId ? 'bg-indigo-950/25 border-l-2 border-indigo-500' : ''
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono font-bold text-white text-[11px] shrink-0">{job.jobId}</span>
                      <span className={clsx('px-1.5 py-0.2 rounded text-[9px] font-semibold border uppercase shrink-0', getJobStatusBadge(job.status))}>
                        {job.status}
                      </span>
                      <p className="text-slate-300 text-xs truncate">{job.prompt}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-slate-400" onClick={(e) => e.stopPropagation()}>
                      {job.status === 'FAILED' && (
                        <Button variant="secondary" size="sm" onClick={() => retryJob(job.jobId)} className="h-6 text-[10px] px-2">
                          Retry
                        </Button>
                      )}
                      {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
                        <Button variant="ghost" size="sm" onClick={() => cancelJob(job.jobId)} className="h-6 text-[10px] px-2 text-slate-500 hover:text-rose-400">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: COMPLETED GALLERY */}
          {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentGenerations.map((media) => (
                <ActiveGenerationCard
                  key={media.jobId}
                  media={media}
                  isSelected={selectedJobId === media.jobId}
                  onSelect={(m) => selectGeneration(m.jobId)}
                  onRetry={(jobId) => retryJob(jobId)}
                />
              ))}
            </div>
          )}

          {/* TAB 5: WORKERS FLEET */}
          {activeTab === 'workers' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workers.map((worker) => (
                <div key={worker.workerId} className="saas-card p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{worker.accountDisplayName}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border uppercase ${getWorkerStatusBadge(worker.status)}`}>
                      {worker.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Completed: {worker.jobsCompleted} · Failed: {worker.jobsFailed}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIDE-DRAWER SPOTLIGHT INSPECTOR (Slide-in Right Panel - Zero page push!) */}
        {selectedMedia && (
          <div className="w-80 lg:w-96 border-l border-white/[0.08] bg-[#0b0f1a] p-4 flex flex-col overflow-y-auto shrink-0 shadow-2xl z-10 space-y-3 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Asset Inspector</span>
              </div>
              <button
                onClick={() => selectGeneration(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <GenerationDetailsView
              media={selectedMedia}
              onClose={() => selectGeneration(null)}
              onRetry={(jobId) => retryJob(jobId)}
              onViewDiagnostics={(m) => {
                if (m.diagnosticError) setSelectedDiagnostic(m.diagnosticError);
                else {
                  window.flowWorkspace.diagnostics.getJobError(m.jobId).then((res) => {
                    if (res.success && res.error) setSelectedDiagnostic(res.error);
                  });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Forensic Diagnostic Modal */}
      {selectedDiagnostic && (
        <FlowDiagnosticModal
          error={selectedDiagnostic}
          onClose={() => setSelectedDiagnostic(null)}
          onRetry={(jobId) => {
            retryJob(jobId);
            setSelectedDiagnostic(null);
          }}
        />
      )}
    </div>
  );
};
