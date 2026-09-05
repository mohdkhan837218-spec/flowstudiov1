import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Ratio,
  Bot,
  Users,
  Sliders,
  Send,
  Cpu
} from 'lucide-react';
import { Button } from '../common/Button';
import { useGenerationStore } from '../../stores/generationStore';
import { useAccountStore } from '../../stores/accountStore';

interface GenerationControlPanelProps {
  onOpenStoryboardWizard?: () => void;
  onNavigateToQueue?: () => void;
}

export const GenerationControlPanel: React.FC<GenerationControlPanelProps> = ({
  onOpenStoryboardWizard,
  onNavigateToQueue
}) => {
  const {
    mode,
    type,
    inputMode,
    prompt,
    model,
    aspectRatio,
    duration,
    generationCount,
    downloadQuality,
    assignedAccountId,
    capabilities,
    isLoadingCapabilities,
    isGenerating,
    error,
    setMode,
    setType,
    setInputMode,
    setPrompt,
    setModel,
    setAspectRatio,
    setDuration,
    setGenerationCount,
    setAssignedAccountId,
    loadCapabilities,
    refreshCapabilities,
    openNewProject,
    generateDirectJob
  } = useGenerationStore();

  const { accounts } = useAccountStore();
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    loadCapabilities(assignedAccountId || undefined);
  }, [loadCapabilities, assignedAccountId]);

  const handleRefresh = async () => {
    if (assignedAccountId) {
      await refreshCapabilities(assignedAccountId);
    } else {
      await loadCapabilities();
    }
  };

  const handleDirectGenerate = async () => {
    const success = await generateDirectJob();
    if (success) {
      setSuccessNotice('Generation submitted to Google Flow queue!');
      setTimeout(() => setSuccessNotice(null), 5000);
    }
  };

  const isImage = type === 'IMAGE';
  const availableModels = isImage ? capabilities.image.models : capabilities.video.models;
  const availableRatios = isImage ? capabilities.image.aspectRatios : capabilities.video.aspectRatios;
  const availableDurations = capabilities.video.durations;
  const availableCounts = capabilities.generationCounts || [1, 2, 3, 4];

  // Live Composer Settings Summary representation (e.g. "Video · 720p · 10s · 1")
  const composerSummary = `${isImage ? 'Image' : 'Video'} · ${downloadQuality.toUpperCase()} · ${
    isImage ? '1x' : `${duration}s`
  } · x${generationCount}`;

  return (
    <div className="glass-panel rounded-3xl p-6 relative overflow-hidden border border-white/10 space-y-6 shadow-2xl backdrop-blur-2xl">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <span>Google Flow Generation Composer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Exact Google Flow composer controller with live capability verification and multi-output tracking.
          </p>
        </div>

        {/* Mode Switch: Storyboard vs Direct Prompt */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setMode('STORYBOARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'STORYBOARD'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Storyboard Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('DIRECT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'DIRECT'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Direct Prompt Mode</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successNotice}</span>
          </span>
          {onNavigateToQueue && (
            <button
              onClick={onNavigateToQueue}
              className="text-xs text-emerald-400 font-bold hover:underline"
            >
              View in Queue →
            </button>
          )}
        </div>
      )}

      {/* Error Alert if any */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generation Settings Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* 1. Generation Type (IMAGE / VIDEO) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Film className="w-3.5 h-3.5 text-brand-400" />
            <span>Generation Type</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/5">
            <button
              type="button"
              onClick={() => setType('VIDEO')}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                type === 'VIDEO'
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => setType('IMAGE')}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                type === 'IMAGE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
          </div>
        </div>

        {/* 2. Input Mode (NONE / FRAMES / INGREDIENTS) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Input Mode</span>
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/5">
            {(['NONE', 'FRAMES', 'INGREDIENTS'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setInputMode(m)}
                className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  inputMode === m
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'NONE' ? 'Standard' : m}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Model Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Model</span>
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/50"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.label}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Aspect Ratio (9:16 / 16:9) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Ratio className="w-3.5 h-3.5 text-pink-400" />
            <span>Aspect Ratio</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/5">
            {availableRatios.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setAspectRatio(r.value)}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  aspectRatio === r.value
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{r.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Video Duration (4s / 6s / 8s / 10s) */}
        {!isImage && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Video Duration</span>
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/5">
              {availableDurations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    duration === d.value
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. Generations Count (x1 / x2 / x3 / x4) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Generations Count</span>
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/5">
            {availableCounts.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setGenerationCount(count)}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  generationCount === count
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>x{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 7. Target Account */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Worker Account</span>
          </label>
          <select
            value={assignedAccountId || ''}
            onChange={(e) => setAssignedAccountId(e.target.value || null)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/50"
          >
            <option value="">Auto (Least-Loaded Flow Worker)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName} ({a.flowStatus === 'NEW_PROJECT_READY' || a.flowStatus === 'READY' ? 'Flow Ready' : a.status})
              </option>
            ))}
          </select>
        </div>

        {/* 8. Live Settings Summary Badge */}
        <div className="space-y-1.5 flex flex-col justify-end">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Flow Composer Summary</span>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 font-mono text-[11px] text-brand-300 flex items-center justify-between">
            <span>{composerSummary}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">Verified</span>
          </div>
        </div>
      </div>

      {/* Mode Specific Body */}
      {mode === 'DIRECT' ? (
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Prompt Composer</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5 font-mono">
                What do you want to create?
              </span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">{prompt.length} characters</span>
          </div>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="What do you want to create? (e.g. A cinematic drone shot of a futuristic cyberpunk city in heavy rain, volumetric lighting, 8k details...)"
              className="w-full bg-slate-950/80 border border-white/10 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 resize-none font-sans leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                isLoading={isLoadingCapabilities}
                icon={<RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
                title="Inspect Flow page for latest models and settings"
              >
                Refresh Flow Controls
              </Button>

              {assignedAccountId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openNewProject(assignedAccountId)}
                  isLoading={isLoadingCapabilities}
                  icon={<Sparkles className="w-3.5 h-3.5 text-brand-400" />}
                  title="Open a fresh New Project workspace in Google Flow"
                >
                  New Project Workspace
                </Button>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleDirectGenerate}
              isLoading={isGenerating}
              disabled={!prompt.trim()}
              icon={<Send className="w-4 h-4 text-amber-300" />}
            >
              Generate {isImage ? 'Image' : 'Video'} {generationCount > 1 ? `(x${generationCount})` : ''} →
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-white">Storyboard Story Decomposition</span>
            <p className="text-xs text-slate-400 max-w-xl">
              Write a high-level concept or script. Groq AI will decompose it into cinematic camera shots with the default settings configured above ({composerSummary}).
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={onOpenStoryboardWizard}
            icon={<Layers className="w-4 h-4" />}
          >
            Open Storyboard Creator
          </Button>
        </div>
      )}
    </div>
  );
};
