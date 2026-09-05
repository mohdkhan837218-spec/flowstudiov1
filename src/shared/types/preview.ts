import { FlowDiagnosticError } from './diagnostics';

export type PreviewSource = 'FLOW_INTERMEDIATE' | 'FLOW_RESULT' | 'LOCAL_SANDBOX' | 'NONE';

export type GenerationMediaStatus =
  | 'QUEUED'
  | 'STARTING'
  | 'GENERATING'
  | 'PREVIEW_AVAILABLE'
  | 'RESULT_DETECTED'
  | 'RESULT_READY'
  | 'DOWNLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface GenerationTimelineStep {
  timestamp: string;
  stage: string;
  message: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface GenerationMedia {
  jobId: string;
  projectId: string;
  shotId: string;
  accountId: string;
  accountDisplayName: string;
  workerId: string;
  prompt: string;
  generationType: 'VIDEO' | 'IMAGE';
  status: GenerationMediaStatus;
  previewUrl: string | null;
  previewSource: PreviewSource;
  resultUrl: string | null;
  localPath: string | null;
  outputPaths: string[];
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | string;
  duration?: number;
  model?: string | null;
  generationCount: number;
  downloadQuality?: string;
  isSandbox?: boolean;
  flowProjectId?: string | null;
  elapsedMs: number;
  startedAt: string | null;
  completedAt: string | null;
  stageText?: string;
  error: string | null;
  diagnosticError?: FlowDiagnosticError | null;
  timeline: GenerationTimelineStep[];
}

export interface LiveGenerationStats {
  activeCount: number;
  videoCount: number;
  imageCount: number;
  completedCount: number;
  failedCount: number;
}
