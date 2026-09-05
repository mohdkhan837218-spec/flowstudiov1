import React from 'react';
import { Terminal, CheckCircle, XCircle, AlertCircle, ArrowRightCircle, Zap, Clock } from 'lucide-react';
import { Job } from '../../../shared/types/job';

interface ComposerDebugPanelProps {
  activeJob?: Job | null;
}

export const ComposerDebugPanel: React.FC<ComposerDebugPanelProps> = ({ activeJob }) => {
  if (!activeJob) return null;

  const isFailed = activeJob.status === 'FAILED';
  const isGenerating = activeJob.status === 'GENERATING' || activeJob.status === 'SUBMITTING';

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-xs font-mono space-y-3 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>FORENSIC OPERATION CONTROLLER</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            OP-{activeJob.jobId.slice(-6).toUpperCase()}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
              isFailed
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : isGenerating
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}
          >
            STAGE: {activeJob.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-slate-300">
        <div>
          <span className="text-slate-500 block">PROMPT ANCHOR:</span>
          <span className="text-emerald-400 font-medium break-all">
            {activeJob.prompt ? `"${activeJob.prompt}"` : 'EMPTY'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block">FLOW MODEL / TYPE:</span>
          <span className="text-cyan-400 font-medium">
            {activeJob.generationType} · {activeJob.model || 'Omni Flash'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block">ASPECT RATIO / DURATION:</span>
          <span className="text-amber-400 font-medium">
            {activeJob.aspectRatio || '16:9'} · {activeJob.duration ? `${activeJob.duration}s` : 'N/A'} (x{activeJob.generationCount || 1})
          </span>
        </div>

        <div>
          <span className="text-slate-500 block">SUBMIT ARROW STATUS:</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ArrowRightCircle className="w-3.5 h-3.5" />
            <span>LOCATED & ENABLED</span>
          </span>
        </div>
      </div>

      <div className="bg-slate-950/60 rounded p-2 text-[11px] border border-slate-800/80 text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-500 font-semibold">STATUS NOTE: </span>
          <span className="text-slate-300 truncate">{activeJob.statusDetail || 'Monitoring generation pipeline'}</span>
        </div>
        <span className="text-cyan-400 font-bold ml-2 shrink-0">{activeJob.progress}%</span>
      </div>
    </div>
  );
};
