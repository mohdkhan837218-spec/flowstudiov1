import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  Cpu,
  User,
  Film,
  Image as ImageIcon,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Activity,
  Layers
} from 'lucide-react';
import { GenerationMedia } from '../../../shared/types/preview';
import { VideoPlayer } from './VideoPlayer';
import { ImageViewer } from './ImageViewer';
import { MediaPlaceholder } from './MediaPlaceholder';
import { Button } from '../common/Button';

interface GenerationDetailsViewProps {
  media: GenerationMedia;
  onClose?: () => void;
  onRetry?: (jobId: string) => void;
  onViewActivity?: (jobId: string) => void;
  onViewDiagnostics?: (media: GenerationMedia) => void;
}

export const GenerationDetailsView: React.FC<GenerationDetailsViewProps> = ({
  media,
  onClose,
  onRetry,
  onViewActivity,
  onViewDiagnostics
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  const isImage = media.generationType === 'IMAGE';
  const hasResult =
    (media.status === 'COMPLETED' || media.status === 'RESULT_READY') &&
    Boolean(media.localPath || media.resultUrl);
  const hasIntermediatePreview =
    media.status === 'PREVIEW_AVAILABLE' && Boolean(media.previewUrl);

  const activeSrc =
    media.outputPaths && media.outputPaths.length > 1
      ? media.outputPaths[selectedVariantIdx] || media.resultUrl || media.localPath
      : media.resultUrl || media.localPath || media.previewUrl;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(media.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleOpenFlow = () => {
    if (media.accountId) {
      window.flowWorkspace.accounts.openFlow(media.accountId);
    }
  };

  const handleDownload = () => {
    if (activeSrc) {
      const a = document.createElement('a');
      a.href = activeSrc;
      a.download = `${media.jobId}_${selectedVariantIdx + 1}.${isImage ? 'png' : 'mp4'}`;
      a.click();
    }
  };

  return (
    <div className="saas-card rounded-2xl p-6 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{media.jobId}</span>
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-white/[0.06]">
              {media.projectId} / {media.shotId}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-indigo-950/50 text-indigo-300 border border-indigo-500/30">
              {media.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {media.stageText || `Real-time monitoring for ${media.generationType.toLowerCase()} generation`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onViewActivity && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewActivity(media.jobId)}
              icon={<Activity className="w-3.5 h-3.5 text-cyan-400" />}
            >
              Activity Logs
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenFlow}
            icon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Open in Flow
          </Button>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Back to Grid
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Large Media View + Right Comprehensive Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Large Media Preview (Cols 1-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="w-full">
            {hasResult || hasIntermediatePreview ? (
              isImage ? (
                <ImageViewer
                  src={activeSrc || ''}
                  aspectRatio={media.aspectRatio}
                  onDownload={handleDownload}
                  onOpenFlow={handleOpenFlow}
                  className="max-h-[520px]"
                />
              ) : (
                <VideoPlayer
                  src={activeSrc || ''}
                  aspectRatio={media.aspectRatio}
                  autoPlay={false}
                  onDownload={handleDownload}
                  onOpenFlow={handleOpenFlow}
                  className="max-h-[520px]"
                />
              )
            ) : (
              <MediaPlaceholder media={media} aspectRatio={media.aspectRatio} isDetailed={true} />
            )}
          </div>

          {/* Multi-Output Variation Tabs */}
          {media.outputPaths && media.outputPaths.length > 1 && (
            <div className="saas-subcard p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-300">
                  Outputs ({media.outputPaths.length} variations generated):
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {media.outputPaths.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVariantIdx(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      selectedVariantIdx === idx
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Variation #{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {hasResult && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleDownload}
                  icon={<Download className="w-4 h-4 text-indigo-400" />}
                >
                  Download Output
                </Button>
              )}
            </div>

            {media.status === 'FAILED' && (
              <div className="flex items-center gap-2">
                {onViewDiagnostics && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => onViewDiagnostics(media)}
                    className="bg-rose-950/50 text-rose-300 border-rose-600/40"
                  >
                    View Forensic Diagnostics
                  </Button>
                )}
                {onRetry && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onRetry(media.jobId)}
                    icon={<RotateCcw className="w-4 h-4" />}
                  >
                    Retry Job
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Job Information & Real Timeline (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Metadata Specs Card */}
          <div className="saas-subcard p-4 space-y-3.5">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Generation Configuration
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Type & Model</span>
                <div className="text-slate-200 font-semibold font-mono mt-0.5">
                  {media.generationType} · {media.model || 'Default'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Ratio & Duration</span>
                <div className="text-slate-200 font-semibold font-mono mt-0.5">
                  {media.aspectRatio} {!isImage && media.duration ? `· ${media.duration}s` : ''}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Assigned Worker</span>
                <div className="text-indigo-300 font-semibold font-mono mt-0.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  {media.workerId}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Google Profile</span>
                <div className="text-cyan-300 font-semibold font-mono mt-0.5 flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{media.accountDisplayName}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Preview Source:</span>
              <span className="text-slate-200 font-semibold">{media.previewSource}</span>
            </div>
          </div>

          {/* Collapsible Prompt Card */}
          <div className="saas-subcard p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Prompt Content</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {isPromptExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p
              className={`text-xs text-slate-200 font-mono leading-relaxed bg-slate-950 p-3 rounded-xl border border-white/[0.05] ${
                !isPromptExpanded ? 'line-clamp-4' : ''
              }`}
            >
              {media.prompt}
            </p>
          </div>

          {/* Real State Machine Generation Timeline */}
          <div className="saas-subcard p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Generation Lifecycle Timeline</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {media.timeline.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <div className="mt-0.5">
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : step.status === 'failed' ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 animate-pulse inline-block" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span className="font-bold text-slate-300">{step.stage}</span>
                      <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
