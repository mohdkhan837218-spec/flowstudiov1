export type LogSeverity = 'TRACE' | 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  component: string;
  category?: string;
  stage?: string;
  action?: string;
  accountId?: string | null;
  jobId?: string | null;
  workerId?: string | null;
  projectId?: string | null;
  errorCode?: string | null;
  errorId?: string | null;
  message: string;
  metadata?: Record<string, any>;
}
