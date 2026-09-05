import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, User, Clock, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { GenerationMedia } from '../../../shared/types/preview';

interface MediaPlaceholderProps {
  media: GenerationMedia;
  aspectRatio?: string;
  isDetailed?: boolean;
}

export const MediaPlaceholder: React.FC<MediaPlaceholderProps> = ({
  media,
  aspectRatio,
  isDetailed = false
}) => {
  const [elapsed, setElapsed] = useState(media.elapsedMs || 0);

  useEffect(() => {
    if (media.status === 'COMPLETED' || media.status === 'FAILED' || media.status === 'CANCELLED') {
      return;
    }

    const interval = setInterval(() => {
      if (media.startedAt) {
        setElapsed(Date.now() - new Date(media.startedAt).getTime());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [media.startedAt, media.status]);

  const formatElapsed = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isImage = media.generationType === 'IMAGE';
  const ratio = aspectRatio || media.aspectRatio || (isImage ? '1:1' : '16:9');

  // Determine container aspect ratio class
  const getAspectClass = () => {
    switch (ratio) {
      case '9:16':
        return 'aspect-[9/16] max-w-[260px] mx-auto';
      case '1:1':
        return 'aspect-square max-w-[360px] mx-auto';
      case '4:3':
        return 'aspect-[4/3]';
      case '3:4':
        return 'aspect-[3/4] max-w-[300px] mx-auto';
      case '16:9':
      default:
        return 'aspect-video';
    }
  };

  return (
    <div
      className={`w-full ${getAspectClass()} rounded-2xl bg-[#0b0e18] border border-white/[0.08] relative overflow-hidden flex flex-col items-center justify-center p-6 text-center select-none shadow-inner group`}
    >
      {/* Background ambient gradient pulse */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/20 via-slate-900/40 to-cyan-950/20 animate-pulse pointer-events-none" />

      {/* Center animated loader & status */}
      <div className="relative z-10 space-y-3.5 max-w-sm flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/40">
            {isImage ? (
              <ImageIcon className="w-5 h-5 animate-pulse" />
            ) : (
              <Film className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <Loader2 className="w-16 h-16 text-indigo-500/30 animate-spin absolute" />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <span>{media.stageText || (isImage ? 'Generating image...' : 'Generating video...')}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Elapsed: <strong className="text-slate-200">{formatElapsed(elapsed)}</strong>
          </p>
        </div>

        {/* Worker & Account context pills */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1 text-[11px] font-mono text-slate-400">
          <span className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-white/[0.06] flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" />
            {media.workerId}
          </span>
          <span className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-white/[0.06] flex items-center gap-1">
            <User className="w-3 h-3 text-cyan-400" />
            {media.accountDisplayName}
          </span>
        </div>

        {isDetailed && media.prompt && (
          <p className="text-[11px] text-slate-400 line-clamp-2 max-w-xs leading-relaxed italic pt-1">
            "{media.prompt}"
          </p>
        )}
      </div>

      {/* Bottom status indicator bar */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-slate-500 z-10 border-t border-white/[0.04] pt-2">
        <span>{media.model || (isImage ? 'Nano Banana 2' : 'Omni Flash')}</span>
        <span>Ratio {ratio}</span>
        <span>{media.isSandbox ? 'Sandbox Session' : 'Google Flow Live'}</span>
      </div>
    </div>
  );
};
