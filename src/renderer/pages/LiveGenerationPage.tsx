import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  Activity,
  Filter,
  Search,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Play,
  Download,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { ActiveGenerationCard } from '../components/preview/ActiveGenerationCard';
import { GenerationDetailsView } from '../components/preview/GenerationDetailsView';
import { FlowDiagnosticModal } from '../components/diagnostics/FlowDiagnosticModal';
import { useLiveGenerationStore } from '../stores/liveGenerationStore';
import { useQueueStore } from '../stores/queueStore';
import { GenerationMedia } from '../../shared/types/preview';
import { FlowDiagnosticError } from '../../shared/types/diagnostics';

interface LiveGenerationPageProps {
  onNavigateToQueue?: () => void;
  onNavigateToProjects?: () => void;
  onNavigateToActivity?: (jobId?: string) => void;
}

export const LiveGenerationPage: React.FC<LiveGenerationPageProps> = ({
  onNavigateToQueue,
  onNavigateToProjects,
  onNavigateToActivity
}) => {
  const {
    activeGenerations,
    recentGenerations,
    stats,
    selectedJobId,
    filter,
    searchQuery,
    sortBy,
    loadGenerations,
    selectGeneration,
    setFilter,
    setSearchQuery,
    setSortBy,
    removePreview,
    setupSubscriptions
  } = useLiveGenerationStore();

  const { cancelJob, retryJob } = useQueueStore();
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<FlowDiagnosticError | null>(null);

  useEffect(() => {
    loadGenerations();
    const unsub = setupSubscriptions();
    return () => unsub();
  }, [loadGenerations, setupSubscriptions]);

  // Filter Active Generations
  const filteredActive = activeGenerations.filter((media) => {
    if (filter === 'GENERATING' && media.status !== 'GENERATING' && media.status !== 'STARTING') return false;
    if (filter === 'IMAGES' && media.generationType !== 'IMAGE') return false;
    if (filter === 'VIDEOS' && media.generationType !== 'VIDEO') return false;
    if (filter === 'SANDBOX' && !media.isSandbox) return false;
    if (filter === 'REAL' && media.isSandbox) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrompt = media.prompt.toLowerCase().includes(q);
      const matchJob = media.jobId.toLowerCase().includes(q);
      const matchWorker = media.workerId.toLowerCase().includes(q);
      const matchAccount = media.accountDisplayName.toLowerCase().includes(q);
      const matchProject = media.projectId.toLowerCase().includes(q);
      if (!matchPrompt && !matchJob && !matchWorker && !matchAccount && !matchProject) return false;
    }
    return true;
  });

  // Filter Recent Generations
  const filteredRecent = recentGenerations.filter((media) => {
    if (filter === 'COMPLETED' && media.status !== 'COMPLETED') return false;
    if (filter === 'FAILED' && media.status !== 'FAILED') return false;
    if (filter === 'IMAGES' && media.generationType !== 'IMAGE') return false;
    if (filter === 'VIDEOS' && media.generationType !== 'VIDEO') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        media.prompt.toLowerCase().includes(q) ||
        media.jobId.toLowerCase().includes(q) ||
        media.accountDisplayName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sorting
  const sortList = (list: GenerationMedia[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') {
        return (new Date(a.startedAt || 0).getTime()) - (new Date(b.startedAt || 0).getTime());
      }
      if (sortBy === 'worker') {
        return a.workerId.localeCompare(b.workerId);
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      if (sortBy === 'project') {
        return a.projectId.localeCompare(b.projectId);
      }
      // 'newest' default
      return (new Date(b.startedAt || 0).getTime()) - (new Date(a.startedAt || 0).getTime());
    });
  };

  const sortedActive = sortList(filteredActive);
  const sortedRecent = sortList(filteredRecent);

  const selectedMedia =
    activeGenerations.find((m) => m.jobId === selectedJobId) ||
    recentGenerations.find((m) => m.jobId === selectedJobId);

  const filters = [
    { id: 'ALL', label: 'All Active' },
    { id: 'GENERATING', label: 'Generating Now' },
    { id: 'VIDEOS', label: 'Videos' },
    { id: 'IMAGES', label: 'Images' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'FAILED', label: 'Failed' },
    { id: 'SANDBOX', label: 'Sandbox' },
    { id: 'REAL', label: 'Real Flow' }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto overflow-y-auto">
      {/* SaaS Page Header */}
      <PageHeader
        title="Live Generation Monitor"
        subtitle="Real-time visual monitoring for active image and video generations across all Google Flow worker sessions."
        badge={
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-600/15 text-indigo-300 border border-indigo-500/30">
              {stats.activeCount} Active
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-600/15 text-cyan-300 border border-cyan-500/30">
              {stats.videoCount} Video
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-600/15 text-emerald-300 border border-emerald-500/30">
              {stats.imageCount} Image
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {onNavigateToQueue && (
              <Button variant="secondary" size="md" onClick={onNavigateToQueue}>
                View Job Queue
              </Button>
            )}
            {onNavigateToProjects && (
              <Button
                variant="primary"
                size="md"
                onClick={onNavigateToProjects}
                icon={<Sparkles className="w-4 h-4" />}
              >
                New Generation
              </Button>
            )}
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="saas-card rounded-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by prompt, ID, worker, or account..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {filters.map((f) => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pl-2 border-t md:border-t-0 md:border-l border-white/[0.07] shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 min-w-[150px] bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="worker">Sort: Worker</option>
            <option value="status">Sort: Status</option>
            <option value="project">Sort: Project</option>
          </select>
        </div>
      </div>

      {/* Selected Active Generation Details Spotlight */}
      {selectedMedia && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Active Generation Spotlight</span>
            </h2>
            <Button variant="ghost" size="sm" onClick={() => selectGeneration(null)}>
              Close Spotlight
            </Button>
          </div>
          <GenerationDetailsView
            media={selectedMedia}
            onClose={() => selectGeneration(null)}
            onRetry={(jobId) => retryJob(jobId)}
            onViewActivity={(jobId) => onNavigateToActivity && onNavigateToActivity(jobId)}
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

      {/* Active Generations Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            <span>Active Worker Generations ({sortedActive.length})</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {stats.activeCount} running in background
          </span>
        </div>

        {sortedActive.length === 0 ? (
          <EmptyState
            icon={<Film className="w-8 h-8" />}
            title="No Active Generations"
            description="There are currently no active video or image generations running. Start a new generation from Projects or Job Queue to watch real-time generation previews."
            actionLabel={onNavigateToProjects ? 'Start Generation' : undefined}
            onAction={onNavigateToProjects}
            actionIcon={<Sparkles className="w-4 h-4" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sortedActive.map((media) => (
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
        )}
      </div>

      {/* Recent Outputs History Section */}
      <div className="space-y-4 pt-4 border-t border-white/[0.07]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Recent Output History ({sortedRecent.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Completed and downloaded image and video assets ready for preview and export.
            </p>
          </div>
        </div>

        {sortedRecent.length === 0 ? (
          <div className="saas-card rounded-2xl p-8 text-center text-xs text-slate-400">
            No completed media history yet. Completed generations will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sortedRecent.map((media) => (
              <ActiveGenerationCard
                key={media.jobId}
                media={media}
                isSelected={selectedJobId === media.jobId}
                onSelect={(m) => selectGeneration(m.jobId)}
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
