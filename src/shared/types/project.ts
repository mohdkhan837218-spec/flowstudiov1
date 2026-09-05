import { GenerationType } from './generation';

export type ProjectStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ShotPlanItem {
  id: string;                      // e.g. "shot_001"
  prompt: string;                  // detailed visual camera prompt
  generationType?: GenerationType; // 'VIDEO' | 'IMAGE'
  model?: string | null;           // e.g. "Veo 2"
  duration: number;                // 5 or 10 seconds
  aspectRatio: '16:9' | '9:16' | '1:1' | string;
  notes?: string;
}

export interface Project {
  id: string;                      // e.g. "proj_01_7fa9"
  name: string;                    // e.g. "Cyberpunk Alley Chase"
  description: string;
  sourcePrompt: string;            // original user story or concept
  generationType?: GenerationType;
  defaultModel?: string;
  defaultAspectRatio?: string;
  defaultDuration?: number;
  status: ProjectStatus;
  outputDirectory: string;
  totalShots: number;
  completedShots: number;
  failedShots: number;
  createdAt: string;
  updatedAt: string;
  shots: ShotPlanItem[];
  metadata?: Record<string, any>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  sourcePrompt: string;
  generationType?: GenerationType;
  defaultModel?: string;
  defaultAspectRatio?: string;
  defaultDuration?: number;
  shots: ShotPlanItem[];
  outputDirectory?: string;
}
