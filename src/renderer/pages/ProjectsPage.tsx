import React, { useState, useEffect } from 'react';
import {
  Clapperboard,
  Plus,
  Play,
  Trash2,
  Film,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { NewProjectModal } from '../components/projects/NewProjectModal';
import { GenerationControlPanel } from '../components/generation/GenerationControlPanel';
import { useProjectStore } from '../stores/projectStore';
import { Project } from '../../shared/types/project';

interface ProjectsPageProps {
  onNavigateToQueue?: () => void;
  onNavigateToLive?: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onNavigateToQueue,
  onNavigateToLive
}) => {
  const { projects, loadProjects, enqueueProject, deleteProject } = useProjectStore();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [actingProjectId, setActingProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleEnqueue = async (id: string) => {
    setActingProjectId(id);
    await enqueueProject(id);
    setActingProjectId(null);
  };

  const handleDelete = async (id: string) => {
    setActingProjectId(id);
    await deleteProject(id);
    setActingProjectId(null);
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'RUNNING':
        return 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 animate-pulse';
      case 'QUEUED':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30';
      case 'FAILED':
        return 'bg-rose-950/40 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-900/80 text-slate-400 border-slate-700/60';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto overflow-y-auto">
      {/* SaaS Page Header */}
      <PageHeader
        title="Video Story Projects"
        subtitle="Compose direct prompts, generate multi-shot storyboards with Groq AI, and orchestrate Flow jobs."
        badge={
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-600/15 text-indigo-300 border border-indigo-500/30">
            {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsNewProjectOpen(true)}
            icon={<Sparkles className="w-4 h-4" />}
            className="shadow-sm"
          >
            Create AI Storyboard
          </Button>
        }
      />

      {/* Generation Control Center Panel (Direct Prompt + Storyboard Switcher) */}
      <GenerationControlPanel
        onOpenStoryboardWizard={() => setIsNewProjectOpen(true)}
        onNavigateToQueue={onNavigateToQueue}
      />

      {/* Storyboard Projects Library */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-indigo-400" />
              <span>Storyboard Projects Library</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-shot video narratives decomposed by Groq AI and queued to Google Flow.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsNewProjectOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Storyboard
          </Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<Film className="w-8 h-8" />}
            title="No Storyboard Projects Yet"
            description="Create your first storyboard project to break high-level prompts into sequential camera shots and queue them across Google accounts."
            actionLabel="Create Storyboard Project"
            onAction={() => setIsNewProjectOpen(true)}
            actionIcon={<Sparkles className="w-4 h-4" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="saas-card rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-bold text-white tracking-tight truncate flex items-center gap-2">
                        <span>{proj.name}</span>
                      </h3>
                      <div className="text-xs font-mono text-slate-500 truncate">{proj.id}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusColor(proj.status)}`}>
                      {proj.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.sourcePrompt || proj.description}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.05] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Shots</span>
                      <div className="text-slate-200 font-mono font-bold mt-0.5">{proj.shots?.length || proj.totalShots || 0} planned</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Created</span>
                      <div className="text-slate-400 font-mono mt-0.5">
                        {new Date(proj.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleEnqueue(proj.id)}
                    isLoading={actingProjectId === proj.id}
                    icon={<Play className="w-3.5 h-3.5" />}
                    className="flex-1"
                  >
                    Enqueue All Shots
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(proj.id)}
                    isLoading={actingProjectId === proj.id}
                    className="text-slate-500 hover:text-rose-400"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    tooltip="Delete Project"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project AI Wizard Modal */}
      {isNewProjectOpen && (
        <NewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          onSuccess={() => {
            loadProjects();
            setIsNewProjectOpen(false);
          }}
        />
      )}
    </div>
  );
};
