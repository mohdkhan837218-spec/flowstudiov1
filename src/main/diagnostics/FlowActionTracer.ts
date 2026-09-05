import {
  ActionTraceEvent,
  FlowDiagnosticError,
  FlowErrorCode,
  ErrorCategory,
  ErrorSeverity,
  RootCauseConfidence,
  CurrentOperationState,
  OperationLifecyclePhase,
  DiscoveryMethodResult,
  ElementCandidate,
  TargetElementDiagnostic,
  ClickDiagnostic,
  StateTransitionRecord,
  GenerationEvidenceScore,
  ResultDetectionRecord,
  ProjectAccessCheck
} from '../../shared/types/diagnostics';
import { Logger } from '../logging/logger';

export class FlowActionTracer {
  private static activeTracers: Map<string, FlowActionTracer> = new Map();
  private static globalOpCounter = 0;

  private jobId: string;
  private workerId?: string;
  private accountId?: string;
  private projectId?: string;
  private actionCounter = 0;
  private timeline: ActionTraceEvent[] = [];
  private lastSuccessfulStep = 'INITIALIZED';
  private currentStage = 'QUEUED';
  private currentStep = 'START';
  private currentActionDesc = 'Job Initialized';

  private currentOpState?: CurrentOperationState;
  private currentDiscoveryMethods: DiscoveryMethodResult[] = [];
  private currentCandidates: ElementCandidate[] = [];
  private currentSelectedCandidate?: TargetElementDiagnostic;
  private currentClickDiagnostic?: ClickDiagnostic;
  private currentStateTransition?: StateTransitionRecord;
  private currentGenerationEvidence?: GenerationEvidenceScore;
  private currentResultDetection?: ResultDetectionRecord;
  private currentProjectAccess?: ProjectAccessCheck;

  constructor(jobId: string, accountId?: string, workerId?: string, projectId?: string) {
    this.jobId = jobId;
    this.accountId = accountId;
    this.workerId = workerId;
    this.projectId = projectId;
  }

  public static getOrCreate(jobId: string, accountId?: string, workerId?: string, projectId?: string): FlowActionTracer {
    if (!this.activeTracers.has(jobId)) {
      this.activeTracers.set(jobId, new FlowActionTracer(jobId, accountId, workerId, projectId));
    }
    const tracer = this.activeTracers.get(jobId)!;
    if (accountId) tracer.accountId = accountId;
    if (workerId) tracer.workerId = workerId;
    if (projectId) tracer.projectId = projectId;
    return tracer;
  }

  public static get(jobId: string): FlowActionTracer | undefined {
    return this.activeTracers.get(jobId);
  }

  public static remove(jobId: string): void {
    this.activeTracers.delete(jobId);
  }

  public recordAction(stage: string, step: string, action: string, target?: string): string {
    this.actionCounter++;
    const actionId = `ACT-${String(this.actionCounter).padStart(4, '0')}`;
    const now = new Date().toISOString();

    this.currentStage = stage;
    this.currentStep = step;
    this.currentActionDesc = action;

    const event: ActionTraceEvent = {
      actionId,
      time: now,
      stage,
      step,
      action,
      target,
      result: 'PENDING'
    };

    this.timeline.push(event);
    Logger.debug('FlowActionTracer', `[TRACE ${actionId}] Started: ${stage} > ${step} > ${action}${target ? ` (Target: ${target})` : ''}`, this.jobId);
    return actionId;
  }

  public completeAction(actionId: string, result: 'SUCCESS' | 'FAILED' | 'SKIPPED', detail?: string): void {
    const event = this.timeline.find((e) => e.actionId === actionId);
    if (event) {
      event.result = result;
      event.detail = detail;
      if (result === 'SUCCESS') {
        this.lastSuccessfulStep = `${event.stage}_${event.step}`;
      }
      Logger.debug('FlowActionTracer', `[TRACE ${actionId}] Finished with ${result}: ${detail || ''}`, this.jobId);
    }
  }

  // --- NEW: OPERATION-LEVEL FORENSIC LIFECYCLE ---
  public startOperation(
    operationName: string,
    target: string,
    stage: string,
    progress: { current: number; total: number } = { current: 1, total: 5 },
    attempt: number = 1,
    maxAttempts: number = 3
  ): string {
    FlowActionTracer.globalOpCounter++;
    const operationId = `OP-${String(FlowActionTracer.globalOpCounter).padStart(6, '0')}`;
    const now = new Date().toISOString();

    this.currentDiscoveryMethods = [
      { method: 'DOM TEXT', status: 'SEARCHING', matchCount: 0 },
      { method: 'ARIA ROLE', status: 'NOT_TESTED', matchCount: 0 },
      { method: 'ACCESSIBLE NAME', status: 'NOT_TESTED', matchCount: 0 },
      { method: 'DOM ATTRIBUTES', status: 'NOT_TESTED', matchCount: 0 },
      { method: 'SHADOW DOM', status: 'NOT_TESTED', matchCount: 0 },
      { method: 'ACCESSIBILITY TREE', status: 'NOT_TESTED', matchCount: 0 }
    ];
    this.currentCandidates = [];
    this.currentSelectedCandidate = undefined;
    this.currentClickDiagnostic = undefined;
    this.currentStateTransition = undefined;

    this.currentOpState = {
      operationId,
      operationName,
      stage,
      target,
      status: 'DISCOVERING',
      progress,
      attempt,
      maxAttempts,
      startTime: now,
      elapsedMs: 0,
      discoveryMethods: this.currentDiscoveryMethods,
      candidates: this.currentCandidates,
      lastSuccessfulOperation: this.lastSuccessfulStep,
      nextAction: `Execute ${operationName} for ${target}`
    };

    Logger.info('FlowActionTracer', `[OPERATION ${operationId}] Started: ${operationName} (Target: ${target}, Attempt ${attempt}/${maxAttempts})`, this.jobId);
    return operationId;
  }

  public updateOperationLifecycle(status: OperationLifecyclePhase, detail?: string): void {
    if (this.currentOpState) {
      this.currentOpState.status = status;
      this.currentOpState.elapsedMs = Date.now() - new Date(this.currentOpState.startTime).getTime();
      if (detail) {
        this.currentOpState.nextAction = detail;
      }
      Logger.debug('FlowActionTracer', `[OPERATION ${this.currentOpState.operationId}] Lifecycle: ${status} (${this.currentOpState.elapsedMs}ms) - ${detail || ''}`, this.jobId);
    }
  }

  public recordDiscoveryMethod(methodName: string, status: 'TESTED' | 'SEARCHING' | 'NOT_TESTED' | 'MATCH_FOUND' | 'NO_MATCH', matchCount: number, detail?: string): void {
    const existing = this.currentDiscoveryMethods.find((m) => m.method.toLowerCase() === methodName.toLowerCase());
    if (existing) {
      existing.status = status;
      existing.matchCount = matchCount;
      existing.detail = detail;
    } else {
      this.currentDiscoveryMethods.push({ method: methodName, status, matchCount, detail });
    }
    if (this.currentOpState) {
      this.currentOpState.discoveryMethods = [...this.currentDiscoveryMethods];
    }
  }

  public recordCandidates(candidates: ElementCandidate[]): void {
    this.currentCandidates = candidates;
    if (this.currentOpState) {
      this.currentOpState.candidates = candidates;
      const matched = candidates.find((c) => c.matched);
      if (matched) {
        this.currentOpState.status = 'FOUND';
      }
    }
  }

  public recordSelectedCandidate(candidate: TargetElementDiagnostic): void {
    this.currentSelectedCandidate = candidate;
    if (this.currentOpState) {
      this.currentOpState.selectedCandidate = candidate;
      this.currentOpState.status = 'VALIDATING';
    }
  }

  public recordClickDiagnostic(clickDiag: ClickDiagnostic): void {
    this.currentClickDiagnostic = clickDiag;
    if (this.currentOpState) {
      this.currentOpState.clickDiagnostic = clickDiag;
      this.currentOpState.status = clickDiag.result === 'SUCCESS' ? 'VERIFYING' : 'FAILED';
    }
  }

  public recordStateTransition(
    before: { mode?: string; model?: string; duration?: string; ratio?: string; count?: string },
    action: string,
    after: { mode?: string; model?: string; duration?: string; ratio?: string; count?: string },
    result: 'VERIFIED' | 'FAILED' | 'FLOW_MODE_TRANSITION_FAILED'
  ): void {
    this.currentStateTransition = { before, action, after, result };
    if (this.currentOpState) {
      this.currentOpState.stateTransition = this.currentStateTransition;
      if (result === 'VERIFIED') {
        this.currentOpState.status = 'SUCCESS';
      } else {
        this.currentOpState.status = 'FAILED';
      }
    }
  }

  public recordGenerationEvidence(evidence: GenerationEvidenceScore): void {
    this.currentGenerationEvidence = evidence;
    if (this.currentOpState) {
      this.currentOpState.generationEvidence = evidence;
    }
  }

  public recordResultDetection(detection: ResultDetectionRecord): void {
    this.currentResultDetection = detection;
    if (this.currentOpState) {
      this.currentOpState.resultDetection = detection;
    }
  }

  public recordProjectAccess(check: ProjectAccessCheck): void {
    this.currentProjectAccess = check;
    if (this.currentOpState) {
      this.currentOpState.projectAccess = check;
    }
  }

  public completeOperation(result: 'SUCCESS' | 'FAILED', detail?: string): void {
    if (this.currentOpState) {
      this.currentOpState.status = result;
      this.currentOpState.elapsedMs = Date.now() - new Date(this.currentOpState.startTime).getTime();
      if (result === 'SUCCESS') {
        this.lastSuccessfulStep = this.currentOpState.operationName;
      }
      Logger.info('FlowActionTracer', `[OPERATION ${this.currentOpState.operationId}] ${result}: ${detail || ''} (${this.currentOpState.elapsedMs}ms)`, this.jobId);
    }
  }

  public getCurrentOperation(): CurrentOperationState | undefined {
    return this.currentOpState;
  }

  public getTimeline(): ActionTraceEvent[] {
    return [...this.timeline];
  }

  public getLastSuccessfulStep(): string {
    return this.lastSuccessfulStep;
  }

  public createDiagnosticError(input: {
    code: FlowErrorCode;
    message: string;
    stage?: string;
    step?: string;
    expected?: Partial<FlowDiagnosticError['expected']>;
    actual?: Partial<FlowDiagnosticError['actual']>;
    targetElement?: TargetElementDiagnostic;
    capabilitySnapshot?: import('../../shared/types/generation').FlowCapabilitySnapshot;
    domSnippet?: string;
    screenshotPath?: string;
    flowUrl?: string;
  }): FlowDiagnosticError {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const stage = input.stage || this.currentStage;
    const step = input.step || this.currentStep;
    const category = this.inferCategoryFromCode(input.code);
    const severity = this.inferSeverityFromCode(input.code);

    const { likelyRootCause, confidence, evidence, nextRecommendedAction, retryStrategy, humanExplanation } =
      this.inferRootCauseAndHypothesis(input.code, input.message, input.expected, input.actual, stage, step);

    const diagError: FlowDiagnosticError = {
      errorId,
      operationId: this.currentOpState?.operationId,
      code: input.code,
      category,
      severity,
      stage,
      step,
      message: input.message,
      humanExplanation,
      jobId: this.jobId,
      workerId: this.workerId,
      accountId: this.accountId,
      projectId: this.projectId,
      flowUrl: input.flowUrl,
      expected: input.expected || {},
      actual: input.actual || {},
      lastSuccessfulStep: this.lastSuccessfulStep,
      currentAction: this.currentActionDesc,
      nextRecommendedAction,
      likelyRootCause,
      confidence,
      evidence,
      retryable: retryStrategy !== 'MANUAL_USER_ACTION',
      retryStrategy,
      maxRetries: 3,
      attempt: 1,
      timestamp: new Date().toISOString(),
      timeline: this.getTimeline(),
      currentOperation: this.currentOpState,
      discoveryMethods: this.currentDiscoveryMethods.length > 0 ? this.currentDiscoveryMethods : undefined,
      candidates: this.currentCandidates.length > 0 ? this.currentCandidates : undefined,
      clickDiagnostic: this.currentClickDiagnostic,
      stateTransition: this.currentStateTransition,
      generationEvidence: this.currentGenerationEvidence,
      resultDetection: this.currentResultDetection,
      projectAccess: this.currentProjectAccess,
      targetElement: input.targetElement || this.currentSelectedCandidate,
      capabilitySnapshot: input.capabilitySnapshot,
      domSnippet: input.domSnippet,
      screenshotPath: input.screenshotPath
    };

    Logger.error('FlowActionTracer', `[DIAGNOSTIC ERROR ${errorId}] ${input.code} at ${stage} > ${step}: ${input.message}`, this.jobId);
    return diagError;
  }

  private inferCategoryFromCode(code: FlowErrorCode): ErrorCategory {
    if (code === 'FLOW_WRONG_ROUTE') return 'WRONG_ROUTE_ERROR';
    if (code === 'FLOW_WORKSPACE_NOT_READY') return 'WORKSPACE_ERROR';
    if (code.includes('MODEL')) return 'MODEL_SELECTION_ERROR';
    if (code.includes('MODE')) return 'MODE_SELECTION_ERROR';
    if (code.includes('ASPECT')) return 'ASPECT_RATIO_ERROR';
    if (code.includes('DURATION')) return 'DURATION_SELECTION_ERROR';
    if (code.includes('COUNT')) return 'GENERATION_COUNT_ERROR';
    if (code.includes('PROMPT')) return 'PROMPT_INPUT_ERROR';
    if (code.includes('SUBMIT')) return 'SUBMIT_BUTTON_ERROR';
    if (code.includes('GENERATION')) return 'GENERATION_START_ERROR';
    if (code.includes('RESULT')) return 'RESULT_DETECTION_ERROR';
    if (code.includes('DOWNLOAD') || code.includes('FILE')) return 'DOWNLOAD_ERROR';
    if (code.includes('PROJECT')) return 'PROJECT_ERROR';
    return 'UNKNOWN_ERROR';
  }

  private inferSeverityFromCode(code: FlowErrorCode): ErrorSeverity {
    if (code.includes('CRASH') || code.includes('AUTHENTICATION')) return 'CRITICAL';
    if (code === 'FLOW_WRONG_ROUTE') return 'ERROR';
    if (code.includes('NOT_FOUND') || code.includes('FAILED') || code.includes('MISMATCH')) return 'ERROR';
    return 'WARNING';
  }

  private inferRootCauseAndHypothesis(
    code: FlowErrorCode,
    message: string,
    expected?: any,
    actual?: any,
    stage?: string,
    step?: string
  ): {
    likelyRootCause: string;
    confidence: RootCauseConfidence;
    evidence: string[];
    nextRecommendedAction: string;
    retryStrategy: FlowDiagnosticError['retryStrategy'];
    humanExplanation: string;
  } {
    const evidence: string[] = [];

    if (code === 'FLOW_WRONG_ROUTE') {
      evidence.push(`Current URL route detected: "${actual?.currentRoute || actual?.summaryText || '/characters'}"`);
      evidence.push(`Expected destination: "PROJECT_GENERATION_WORKSPACE"`);
      evidence.push(`Requested job operation: "${expected?.generationType || 'VIDEO'}_GENERATION"`);
      if (actual?.clickedElement) {
        evidence.push(`Incorrect click source: ${actual.clickedElement}`);
      }

      return {
        likelyRootCause: 'Automation clicked or restored the Characters, Scenes, or Tools navigation sub-route instead of the main Project Generation Workspace.',
        confidence: 'HIGH',
        evidence,
        nextRecommendedAction: 'Reinspect project navigation, click All Media / Canvas entry point, and locate generation composer.',
        retryStrategy: 'RETURN_TO_GENERATION_WORKSPACE',
        humanExplanation: `Google Flow navigated to wrong route (${actual?.currentRoute || '/characters'}). Generation operations require the Project Generation Workspace.`
      };
    }

    if (code === 'FLOW_WORKSPACE_NOT_READY') {
      evidence.push(`Current route: "${actual?.currentRoute || 'Project Canvas'}"`);
      evidence.push(`Composer confidence: ${actual?.confidence || 'LOW'}`);
      if (actual?.missingControls) {
        evidence.push(`Missing essential controls: ${(actual.missingControls as string[]).join(', ')}`);
      }

      return {
        likelyRootCause: 'The project workspace is loaded but the generation composer and prompt inputs have not fully hydrated or mounted on the canvas.',
        confidence: 'HIGH',
        evidence,
        nextRecommendedAction: 'Wait for workspace React hydration and verify generation composer controls before entering prompt.',
        retryStrategy: 'REINSPECT_AND_RETRY',
        humanExplanation: 'Project workspace was detected but prompt composer and generation controls are not yet ready.'
      };
    }

    if (code === 'FLOW_CONFIGURATION_MISMATCH' || code === 'FLOW_MODE_MISMATCH') {
      evidence.push(`Job requested generation mode "${expected?.generationType || 'VIDEO'}"`);
      evidence.push(`Flow composer state currently detected as "${actual?.generationType || 'IMAGE'}"`);
      if (actual?.model) evidence.push(`Active model detected as "${actual.model}" (default for image mode)`);
      if (!actual?.duration) evidence.push('Video duration controls (4s, 6s, 8s, 10s) are absent in current DOM');

      return {
        likelyRootCause: 'Google Flow defaulted to Image mode or the mode switch transition to Video was not completed before applying settings.',
        confidence: 'HIGH',
        evidence,
        nextRecommendedAction: 'Click the VIDEO mode tab, wait for duration controls to appear, and re-apply settings.',
        retryStrategy: 'SWITCH_MODE_AND_REAPPLY',
        humanExplanation: `The job requires ${expected?.generationType || 'VIDEO'} mode, but Google Flow is currently in ${actual?.generationType || 'IMAGE'} mode.`
      };
    }

    if (code === 'FLOW_MODEL_OPTION_NOT_FOUND' || code === 'FLOW_MODEL_MISMATCH') {
      evidence.push(`Requested model: "${expected?.model || 'Unknown'}"`);
      evidence.push(`Available models detected on page: ${(actual?.availableModels || []).join(', ') || 'None'}`);
      return {
        likelyRootCause: 'The requested model is either not supported on this Google account or renamed by Google Flow.',
        confidence: 'HIGH',
        evidence,
        nextRecommendedAction: 'Re-open the model menu and inspect available model chips or use the default Omni Flash.',
        retryStrategy: 'REINSPECT_AND_RETRY',
        humanExplanation: `Requested model "${expected?.model}" could not be selected in the model menu.`
      };
    }

    if (code === 'FLOW_MODEL_AMBIGUOUS') {
      evidence.push(`Requested model query: "${expected?.model}"`);
      evidence.push(`Multiple candidate matches found: ${(actual?.availableModels || []).join(', ')}`);
      return {
        likelyRootCause: 'The requested model name matched multiple candidate options without a distinct exact match.',
        confidence: 'HIGH',
        evidence,
        nextRecommendedAction: 'Specify the full exact model name in job settings to avoid ambiguity.',
        retryStrategy: 'REINSPECT_AND_RETRY',
        humanExplanation: `Model name "${expected?.model}" is ambiguous and matched multiple options.`
      };
    }

    if (code === 'FLOW_DURATION_MISMATCH' || code === 'FLOW_DURATION_OPTION_NOT_FOUND') {
      evidence.push(`Requested duration: ${expected?.duration}s`);
      evidence.push(`Available durations on page: ${(actual?.availableDurations || []).join(', ') || 'None'}`);
      return {
        likelyRootCause: 'Requested duration option is not visible in current composer mode (Image mode has 0 durations, or model lacks this length).',
        confidence: 'HIGH',
        evidence,
        nextRecommendedAction: 'Verify that Video mode is active and select an available duration chip (4s, 6s, 8s, 10s).',
        retryStrategy: 'REINSPECT_AND_RETRY',
        humanExplanation: `Duration of ${expected?.duration}s could not be set.`
      };
    }

    if (code === 'FLOW_SUBMIT_BUTTON_DISABLED') {
      evidence.push('Prompt is populated inside the composer textarea');
      evidence.push('Circular submit right-arrow button was found but has disabled=true attribute or pointer-events: none');
      return {
        likelyRootCause: 'Google Flow is currently validating the prompt or waiting for credits/account quota check.',
        confidence: 'MEDIUM',
        evidence,
        nextRecommendedAction: 'Wait 3 seconds and trigger input/change events to ensure composer recognizes prompt.',
        retryStrategy: 'REENTER_PROMPT',
        humanExplanation: 'Submit arrow button is present but currently disabled.'
      };
    }

    if (code === 'FLOW_GENERATION_TIMEOUT') {
      evidence.push(`Waited for generation completion during stage ${stage}`);
      evidence.push('Output placeholder or progress bar did not complete within the timeout threshold');
      return {
        likelyRootCause: 'Google Flow diffusion rendering queue took longer than expected or was rate-limited.',
        confidence: 'MEDIUM',
        evidence,
        nextRecommendedAction: 'Check network connectivity or re-queue the shot with extended timeout.',
        retryStrategy: 'WAIT_AND_RECHECK',
        humanExplanation: 'Generation did not complete within the allotted time window.'
      };
    }

    // Default fallback
    evidence.push(`Stage: ${stage}, Step: ${step}`);
    evidence.push(`Error message: ${message}`);
    return {
      likelyRootCause: `Automation step failed at ${stage} > ${step}. Flow UI structure may differ from expected locator.`,
      confidence: 'MEDIUM',
      evidence,
      nextRecommendedAction: 'Inspect the live Flow DOM snapshot or retry with fallback locators.',
      retryStrategy: 'REINSPECT_AND_RETRY',
      humanExplanation: message || 'An unexpected automation error occurred.'
    };
  }
}
