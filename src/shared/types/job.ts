export type JobStatus =
  | 'QUEUED'
  | 'WAITING_FOR_WORKER'
  | 'ASSIGNED'
  | 'OPENING_FLOW'
  | 'CREATING_PROJECT'
  | 'OPENING_PROJECT'
  | 'FINDING_COMPOSER'
  | 'DISCOVERING_CAPABILITIES'
  | 'SELECTING_MODE'
  | 'SELECTING_SETTINGS'
  | 'VERIFYING_SETTINGS'
  | 'ENTERING_PROMPT'
  | 'VERIFYING_PROMPT'
  | 'APPLYING_SETTINGS'
  | 'PROMPT_ENTERED'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTING'
  | 'GENERATING'
  | 'RESULT_DETECTED'
  | 'DOWNLOADING'
  | 'VERIFYING_DOWNLOAD'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'PAUSED'
  | 'MANUAL_ACTION_REQUIRED'
  | 'STARTING'
  | 'FLOW_INITIALIZING'
  | 'FLOW_READY'
  | 'RUNNING'
  | 'RECOVERY_REQUIRED';

export type WorkerStatus =
  | 'IDLE'
  | 'ASSIGNED'
  | 'OPENING_FLOW'
  | 'CREATING_PROJECT'
  | 'OPENING_PROJECT'
  | 'FINDING_COMPOSER'
  | 'DISCOVERING_CAPABILITIES'
  | 'SELECTING_MODE'
  | 'SELECTING_SETTINGS'
  | 'VERIFYING_SETTINGS'
  | 'ENTERING_PROMPT'
  | 'VERIFYING_PROMPT'
  | 'APPLYING_SETTINGS'
  | 'PROMPT_ENTERED'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTING'
  | 'GENERATING'
  | 'INITIALIZING_FLOW'
  | 'RUNNING_FLOW'
  | 'DOWNLOADING'
  | 'ERROR'
  | 'PAUSED';

export interface FlowProjectRecord {
  flowProjectId: string;
  applicationProjectId: string;
  accountId: string;
  flowProjectName: string;
  flowProjectUrl: string | null;
  flowProjectStatus: 'READY' | 'BUSY' | 'ARCHIVED' | 'ERROR';
  createdAt: string;
  lastUsedAt: string;
  metadata?: Record<string, any>;
}

import { FlowDiagnosticError } from './diagnostics';

export interface Job {
  jobId: string;                   // e.g. "job_01_a982"
  projectId: string;
  shotId: string;                  // e.g. "shot_001"
  prompt: string;                  // visual generation prompt
  generationType?: 'VIDEO' | 'IMAGE'; // video or image generation
  inputMode?: 'NONE' | 'FRAMES' | 'INGREDIENTS';
  model?: string | null;           // selected model identifier
  duration: number;                // seconds (for video)
  aspectRatio: string;             // "16:9", etc.
  generationCount?: number;        // x1, x2, x3, x4
  downloadQuality?: string;        // "720p", "1080p", "4k", "270p_gif"
  flowProjectId?: string | null;   // associated Google Flow project ID
  flowProjectUrl?: string | null;  // associated Google Flow project URL
  status: JobStatus;
  statusDetail?: string | null;    // Detailed explanation e.g. "Applying settings in generation composer"
  progress: number;                // 0 to 100
  assignedAccountId: string | null;// account ID assigned to run this job
  assignedWorkerId?: string | null;// worker session ID
  workerId: string | null;         // worker session ID (alias)
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  maxRetries: number;
  outputPath: string | null;       // local mp4/png path
  outputPaths?: string[];          // multiple outputs for x2/x3/x4
  error: string | null;
  diagnosticError?: FlowDiagnosticError | null;
  metadata?: Record<string, any>;
}

export interface WorkerSession {
  workerId: string;
  accountId: string;
  accountDisplayName: string;
  accountEmail: string | null;
  status: WorkerStatus;
  currentJobId: string | null;
  currentJobPrompt?: string | null;
  currentProgress: number;
  lastActiveAt: string;
  jobsCompleted: number;
  jobsFailed: number;
  lastError?: string | null;
  diagnosticError?: FlowDiagnosticError | null;
}

export interface QueueSummary {
  totalJobs: number;
  queued: number;
  waiting: number;
  running: number;
  completed: number;
  failed: number;
  activeWorkers: number;
  totalWorkers?: number;
  isPaused: boolean;
  concurrencyLimit: number;
  waitingReason?: string | null;
}

