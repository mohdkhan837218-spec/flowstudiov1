export type AccountStatus =
  | 'NEW'
  | 'CONNECTING'
  | 'GOOGLE_AUTHENTICATED'
  | 'CONNECTED'
  | 'OPENING_FLOW'
  | 'FLOW_LOADING'
  | 'FLOW_READY'
  | 'DISCONNECTED'
  | 'OPEN'
  | 'BUSY'
  | 'PAUSED'
  | 'ERROR'
  | 'MANUAL_ACTION_REQUIRED'
  | 'RECONNECT_REQUIRED'
  | 'REMOVED';

export type BrowserStatus = 'CLOSED' | 'LAUNCHING' | 'OPEN' | 'BUSY' | 'CRASHED' | 'ERROR';

export type FlowState =
  | 'UNKNOWN'
  | 'FLOW_NOT_OPEN'
  | 'FLOW_OPENING'
  | 'FLOW_HOME'
  | 'FLOW_READY'
  | 'OPENING_NEW_PROJECT'
  | 'NEW_PROJECT_LOADING'
  | 'NEW_PROJECT_READY'
  | 'GENERATION_READY'
  | 'GENERATING'
  | 'GENERATION_COMPLETE'
  | 'DOWNLOAD_READY'
  | 'OPENING'
  | 'LOADING'
  | 'READY'
  | 'LOGIN_REQUIRED'
  | 'ONBOARDING_REQUIRED'
  | 'MANUAL_ACTION_REQUIRED'
  | 'ERROR'
  | 'CLOSED';

export interface GoogleAccount {
  id: string;                      // internal ID, e.g. acct_01_8f3a
  displayName: string;             // user label, e.g. "Google Account 01"
  email: string | null;            // detected Google email, e.g. "user@example.com"
  profilePath: string;             // normalized relative or full path
  status: AccountStatus;           // authoritative account state
  browserStatus: BrowserStatus;    // real-time browser status
  flowStatus: FlowState;           // Google Flow ready state
  flowUrl?: string;                // Active Flow workspace URL
  lastVerifiedAt: string | null;   // ISO timestamp
  lastActiveAt: string | null;     // ISO timestamp
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
  lastError: string | null;        // last encountered error message
  queueCount: number;              // current queued jobs
  currentJobName?: string | null;  // currently executing job
  metadata?: Record<string, any>;
}

export interface CreateAccountInput {
  displayName: string;
}

export interface UpdateAccountInput {
  displayName?: string;
  status?: AccountStatus;
  browserStatus?: BrowserStatus;
  flowStatus?: FlowState;
  flowUrl?: string;
  email?: string | null;
  lastError?: string | null;
  lastVerifiedAt?: string | null;
  lastActiveAt?: string | null;
  metadata?: Record<string, any>;
}
