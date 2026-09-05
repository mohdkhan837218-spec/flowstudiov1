import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  Info,
  RotateCcw,
  XCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { GenerationMedia } from '../../../shared/types/preview';
import { MediaPlaceholder } from './MediaPlaceholder';
import { VideoPlayer } from './VideoPlayer';
import { ImageViewer } from './ImageViewer';
import { Button } from '../common/Button';

interface ActiveGenerationCardProps {
  media: GenerationMedia;
  onSelect?: (media: GenerationMedia) => void;
  onCancel?: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
  onViewDiagnostics?: (media: GenerationMedia) => void;
  isSelected?: boolean;
}

export const ActiveGenerationCard: React.FC<ActiveGenerationCardProps> = ({
  media,
  onSelect,
  onCancel,
  onRetry,
  onViewDiagnostics,
  isSelected = false
}) => {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  const isImage = media.generationType === 'IMAGE';
  const hasResult = (media.status === 'COMPLETED' || media.status === 'RESULT_READY') && Boolean(media.localPath || media.resultUrl);
  const hasIntermediatePreview = media.status === 'PREVIEW_AVAILABLE' && Boolean(media.previewUrl);

  const activeSrc =
    media.outputPaths && media.outputPaths.length > 1
      ? media.outputPaths[selectedVariantIdx] || media.resultUrl || media.localPath
      : media.resultUrl || media.localPath || media.previewUrl;

  const handleOpenFlow = () => {
    if (media.accountId) {
      window.flowWorkspace.accounts.openFlow(media.accountId);
    }
  };

  const handleDownload = () => {
    if (activeSrc) {
      const a = document.createElement('a');
      a.href = activeSrc;
      a.download = `${media.jobId}_output.${isImage ? 'png' : 'mp4'}`;
      a.click();
    }
  };

  // Badge determination
  const getBadge = () => {
    if (media.status === 'COMPLETED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          COMPLETED
        </span>
      );
    }
    if (media.status === 'FAILED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-rose-950/50 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          FAILED
        </span>
      );
    }
    if (media.previewSource === 'FLOW_INTERMEDIATE') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-indigo-950/50 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          LIVE PREVIEW
        </span>
      );
    }
    if (media.isSandbox) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-purple-950/50 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          SANDBOX PREVIEW
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        GENERATING
      </span>
    );
  };

  return (
    <div
      className={`saas-card rounded-2xl p-4 flex flex-col justify-between space-y-3.5 transition-all duration-200 ${
        isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl' : 'hover:border-indigo-500/40'
      }`}
    >
      <div className="space-y-3">
        {/* Top Bar: Live Status Badge, Generation Specs & Timer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getBadge()}
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/[0.06]">
              {media.generationType} · {media.aspectRatio}
              {!isImage && media.duration ? ` · ${media.duration}s` : ''}
              {media.generationCount > 1 ? ` · x${media.generationCount}` : ''}
            </span>
          </div>

          <span className="text-xs font-mono text-slate-400 shrink-0">
            {media.workerId}
          </span>
        </div>

        {/* Media Preview Container */}
        <div className="w-full">
          {hasResult || hasIntermediatePreview ? (
            isImage ? (
              <ImageViewer
                src={activeSrc || ''}
                aspectRatio={media.aspectRatio}
                onDownload={handleDownload}
                onOpenFlow={handleOpenFlow}
              />
            ) : (
              <VideoPlayer
                src={activeSrc || ''}
                aspectRatio={media.aspectRatio}
                autoPlay={false}
                onDownload={handleDownload}
                onOpenFlow={handleOpenFlow}
              />
            )
          ) : (
            <MediaPlaceholder media={media} aspectRatio={media.aspectRatio} />
          )}
        </div>

        {/* Multi-Output Variation Selector if Count > 1 */}
        {media.outputPaths && media.outputPaths.length > 1 && (
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/60 rounded-xl border border-white/[0.04]">
            <span className="text-[10px] font-mono text-slate-500 uppercase px-1">Outputs:</span>
            {media.outputPaths.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedVariantIdx(idx)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  selectedVariantIdx === idx
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                #{idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Prompt Preview Snippet */}
        <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/[0.04] space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Prompt</span>
            <span className="font-mono text-slate-400">{media.accountDisplayName}</span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed italic">
            "{media.prompt}"
          </p>
        </div>

        {/* Error Notice If Failed */}
        {media.error && (
          <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="line-clamp-2">{media.error}</span>
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenFlow}
            icon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Open Flow
          </Button>

          {onSelect && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(media)}
              icon={<Info className="w-3.5 h-3.5 text-indigo-400" />}
            >
              Details
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {media.status === 'FAILED' && onViewDiagnostics && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDiagnostics(media)}
              className="bg-rose-950/50 text-rose-300 border-rose-600/40"
            >
              Diagnostics
            </Button>
          )}

          {media.status === 'FAILED' && onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRetry(media.jobId)}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          )}

          {(media.status === 'GENERATING' || media.status === 'STARTING' || media.status === 'QUEUED') && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(media.jobId)}
              className="text-slate-500 hover:text-rose-400"
              icon={<XCircle className="w-3.5 h-3.5" />}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
