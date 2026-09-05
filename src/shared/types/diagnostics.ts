import { GenerationType, InputMode, FlowCapabilitySnapshot } from './generation';

export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ErrorCategory =
  | 'FLOW_NAVIGATION_ERROR'
  | 'WRONG_ROUTE_ERROR'
  | 'WORKSPACE_ERROR'
  | 'PROJECT_ERROR'
  | 'COMPOSER_ERROR'
  | 'MODE_SELECTION_ERROR'
  | 'CAPABILITY_DISCOVERY_ERROR'
  | 'MODEL_SELECTION_ERROR'
  | 'ASPECT_RATIO_ERROR'
  | 'DURATION_SELECTION_ERROR'
  | 'GENERATION_COUNT_ERROR'
  | 'INPUT_MODE_ERROR'
  | 'PROMPT_INPUT_ERROR'
  | 'PROMPT_VERIFICATION_ERROR'
  | 'SUBMIT_BUTTON_ERROR'
  | 'SUBMISSION_ERROR'
  | 'GENERATION_START_ERROR'
  | 'GENERATION_MONITOR_ERROR'
  | 'RESULT_DETECTION_ERROR'
  | 'DOWNLOAD_ERROR'
  | 'FILE_VERIFICATION_ERROR'
  | 'BROWSER_ERROR'
  | 'PROFILE_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'QUEUE_ERROR'
  | 'WORKER_ERROR'
  | 'UNKNOWN_ERROR';

export type FlowErrorCode =
  | 'FLOW_WRONG_ROUTE'
  | 'FLOW_WORKSPACE_NOT_READY'
  | 'FLOW_CONFIGURATION_MISMATCH'
  | 'FLOW_HOME_NOT_FOUND'
  | 'FLOW_PROJECT_NOT_FOUND'
  | 'FLOW_PROJECT_CREATE_FAILED'
  | 'FLOW_COMPOSER_NOT_FOUND'
  | 'FLOW_MODE_BUTTON_NOT_FOUND'
  | 'FLOW_MODE_SWITCH_FAILED'
  | 'FLOW_MODE_TRANSITION_FAILED'
  | 'FLOW_MODE_MISMATCH'
  | 'FLOW_CAPABILITIES_EMPTY'
  | 'FLOW_MODEL_MENU_NOT_FOUND'
  | 'FLOW_MODEL_OPTION_NOT_FOUND'
  | 'FLOW_MODEL_AMBIGUOUS'
  | 'FLOW_MODEL_SELECTION_FAILED'
  | 'FLOW_MODEL_VERIFICATION_FAILED'
  | 'FLOW_MODEL_MISMATCH'
  | 'FLOW_ASPECT_RATIO_OPTION_NOT_FOUND'
  | 'FLOW_ASPECT_RATIO_SELECTION_FAILED'
  | 'FLOW_ASPECT_RATIO_VERIFICATION_FAILED'
  | 'FLOW_ASPECT_RATIO_MISMATCH'
  | 'FLOW_DURATION_OPTION_NOT_FOUND'
  | 'FLOW_DURATION_SELECTION_FAILED'
  | 'FLOW_DURATION_VERIFICATION_FAILED'
  | 'FLOW_DURATION_MISMATCH'
  | 'FLOW_COUNT_OPTION_NOT_FOUND'
  | 'FLOW_COUNT_SELECTION_FAILED'
  | 'FLOW_COUNT_VERIFICATION_FAILED'
  | 'FLOW_COUNT_MISMATCH'
  | 'FLOW_PROMPT_FIELD_NOT_FOUND'
  | 'FLOW_PROMPT_INPUT_FAILED'
  | 'FLOW_PROMPT_VERIFICATION_FAILED'
  | 'FLOW_SUBMIT_BUTTON_NOT_FOUND'
  | 'FLOW_SUBMIT_BUTTON_DISABLED'
  | 'FLOW_SUBMIT_CLICK_FAILED'
  | 'FLOW_SUBMISSION_NOT_CONFIRMED'
  | 'FLOW_GENERATION_NOT_STARTED'
  | 'FLOW_GENERATION_TIMEOUT'
  | 'FLOW_RESULT_NOT_FOUND'
  | 'FLOW_RESULT_NOT_READY'
  | 'FLOW_RESULT_IDENTIFICATION_FAILED'
  | 'FLOW_DOWNLOAD_BUTTON_NOT_FOUND'
  | 'FLOW_DOWNLOAD_FAILED'
  | 'FLOW_FILE_NOT_FOUND'
  | 'FLOW_FILE_INVALID'
  | 'AUTHENTICATION_REQUIRED'
  | 'WORKER_CRASH';

export type RootCauseConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ActionTraceEvent {
  actionId: string;
  time: string;
  stage: string;
  step: string;
  action: string;
  target?: string;
  result: 'SUCCESS' | 'FAILED' | 'PENDING' | 'SKIPPED';
  detail?: string;
  durationMs?: number;
}

export interface TargetElementDiagnostic {
  tagName?: string;
  role?: string;
  ariaLabel?: string;
  title?: string;
  textContent?: string;
  accessibleName?: string;
  visible?: boolean;
  enabled?: boolean;
  ariaDisabled?: boolean;
  selected?: boolean;
  checked?: boolean;
  expanded?: boolean;
  domPath?: string;
  shadowPath?: string;
  frameUrl?: string;
  attributes?: Record<string, string>;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OptionCandidateDiagnostic {
  displayName: string;
  matchScorePercent: number;
  exactMatch: boolean;
  enabled: boolean;
  visible: boolean;
  role?: string;
  accessibleName?: string;
}

export type OperationLifecyclePhase =
  | 'DISCOVERING'
  | 'FOUND'
  | 'VALIDATING'
  | 'ACTION_READY'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'FALLBACK';

export interface DiscoveryMethodResult {
  method: string;
  status: 'TESTED' | 'SEARCHING' | 'NOT_TESTED' | 'MATCH_FOUND' | 'NO_MATCH';
  matchCount: number;
  detail?: string;
}

export interface ElementCandidate {
  candidateId: number;
  role: string;
  text: string;
  visible: boolean;
  enabled: boolean;
  matched: boolean;
  matchScore?: number;
}

export interface ClickDiagnostic {
  target: string;
  candidateName?: string;
  visible: boolean;
  enabled: boolean;
  pointerEvents: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
  method: string;
  result: 'SUCCESS' | 'FAILED';
  stateVerification?: {
    expected: string;
    actual: string;
    result: 'VERIFIED' | 'FAILED';
  };
}

export interface StateTransitionRecord {
  before: {
    mode?: string;
    model?: string;
    duration?: string;
    ratio?: string;
    count?: string;
  };
  action: string;
  after: {
    mode?: string;
    model?: string;
    duration?: string;
    ratio?: string;
    count?: string;
  };
  result: 'VERIFIED' | 'FAILED' | 'FLOW_MODE_TRANSITION_FAILED';
}

export interface GenerationEvidenceScore {
  score: number;
  threshold: number;
  status: 'GENERATION_CONFIRMED' | 'WAITING_FOR_GENERATION_EVIDENCE';
  breakdown: {
    newOutputPlaceholder: number; // +3
    mediaCountIncreased: number; // +3
    processingIndicator: number; // +2
    statusGeneratingLabel: number; // +2
    domMutation: number; // +1
  };
  notes: string[];
}

export interface ResultDetectionRecord {
  beforeMediaCount: number;
  afterMediaCount: number;
  elapsedSeconds: number;
  processingState: 'UNKNOWN' | 'ACTIVE' | 'IDLE';
  status: 'WAITING_FOR_NEW_OUTPUT' | 'NEW_OUTPUT_DETECTED' | 'TIMEOUT';
  detectedResultId?: string;
}

export interface ProjectAccessCheck {
  projectId?: string;
  url?: string;
  urlNavigation: 'SUCCESS' | 'FAILED';
  pageLoaded: 'SUCCESS' | 'FAILED';
  projectContainer: 'FOUND' | 'NOT_FOUND';
  composer: 'FOUND' | 'NOT_FOUND';
  flowHomeDetected: boolean;
  status: 'ACCESSIBLE' | 'PROJECT_NO_LONGER_ACCESSIBLE';
  recoveryAction: 'CREATE_NEW_PROJECT' | 'NONE';
}

export interface CurrentOperationState {
  operationId: string;
  operationName: string;
  stage: string;
  target: string;
  status: OperationLifecyclePhase;
  progress: { current: number; total: number };
  attempt: number;
  maxAttempts: number;
  startTime: string;
  elapsedMs: number;
  discoveryMethods: DiscoveryMethodResult[];
  candidates: ElementCandidate[];
  selectedCandidate?: TargetElementDiagnostic;
  clickDiagnostic?: ClickDiagnostic;
  stateTransition?: StateTransitionRecord;
  generationEvidence?: GenerationEvidenceScore;
  resultDetection?: ResultDetectionRecord;
  projectAccess?: ProjectAccessCheck;
  lastSuccessfulOperation?: string;
  nextAction?: string;
}

export interface FlowDiagnosticError {
  errorId: string;
  operationId?: string;
  code: FlowErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  stage: string;
  step: string;
  message: string;
  humanExplanation: string;
  jobId?: string;
  workerId?: string;
  accountId?: string;
  projectId?: string;
  flowUrl?: string;
  expected: {
    generationType?: GenerationType;
    model?: string;
    aspectRatio?: string;
    duration?: number | string;
    generationCount?: number;
    inputMode?: InputMode;
    prompt?: string;
    [key: string]: any;
  };
  actual: {
    generationType?: GenerationType;
    model?: string;
    aspectRatio?: string;
    duration?: number | string;
    generationCount?: number;
    inputMode?: InputMode;
    prompt?: string;
    availableModels?: string[];
    availableAspectRatios?: string[];
    availableDurations?: string[];
    availableCounts?: string[];
    summaryText?: string;
    creditText?: string;
    [key: string]: any;
  };
  lastSuccessfulStep: string;
  currentAction: string;
  nextRecommendedAction: string;
  likelyRootCause: string;
  confidence: RootCauseConfidence;
  evidence: string[];
  retryable: boolean;
  retryStrategy:
    | 'RETURN_TO_GENERATION_WORKSPACE'
    | 'REINSPECT_AND_RETRY'
    | 'REENTER_PROMPT'
    | 'WAIT_AND_RECHECK'
    | 'SWITCH_MODE_AND_REAPPLY'
    | 'RESTART_PROFILE'
    | 'MANUAL_USER_ACTION';
  maxRetries: number;
  attempt: number;
  timestamp: string;
  timeline: ActionTraceEvent[];
  currentOperation?: CurrentOperationState;
  discoveryMethods?: DiscoveryMethodResult[];
  candidates?: ElementCandidate[];
  clickDiagnostic?: ClickDiagnostic;
  stateTransition?: StateTransitionRecord;
  generationEvidence?: GenerationEvidenceScore;
  resultDetection?: ResultDetectionRecord;
  projectAccess?: ProjectAccessCheck;
  targetElement?: TargetElementDiagnostic;
  optionCandidates?: OptionCandidateDiagnostic[];
  capabilitySnapshot?: FlowCapabilitySnapshot;
  domSnippet?: string;
  accessibilityTree?: any;
  screenshotPath?: string;
  debugBundlePath?: string;
}

export type TerminalLogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type TerminalLogCategory =
  | 'ALL'
  | 'FLOW'
  | 'BROWSER'
  | 'NAVIGATION'
  | 'PROJECT'
  | 'COMPOSER'
  | 'MODE'
  | 'MODEL'
  | 'ASPECT_RATIO'
  | 'DURATION'
  | 'PROMPT'
  | 'SUBMISSION'
  | 'GENERATION'
  | 'RESULT'
  | 'DOWNLOAD'
  | 'WORKER'
  | 'QUEUE'
  | 'ACCOUNT'
  | 'AUTH'
  | 'DOM'
  | 'ACCESSIBILITY'
  | 'NETWORK'
  | 'FILESYSTEM'
  | 'SANDBOX'
  | 'DIAGNOSTIC'
  | 'SYSTEM';

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  level: TerminalLogLevel;
  source: string;
  category: TerminalLogCategory;
  stage?: string;
  action?: string;
  jobId?: string;
  workerId?: string;
  accountId?: string;
  projectId?: string;
  message: string;
  errorCode?: FlowErrorCode | string;
  errorId?: string;
  diagnosticError?: FlowDiagnosticError;
  metadata?: Record<string, any>;
}

export type SandboxSimulationType =
  | 'WRONG_ROUTE'
  | 'PROJECT_MISSING'
  | 'COMPOSER_MISSING'
  | 'VIDEO_BUTTON_MISSING'
  | 'MODEL_MISSING'
  | 'DURATION_MISSING'
  | 'PROMPT_FAILURE'
  | 'SUBMIT_FAILURE'
  | 'GENERATION_TIMEOUT'
  | 'RESULT_MISSING'
  | 'DOWNLOAD_FAILURE'
  | 'WORKER_CRASH';


