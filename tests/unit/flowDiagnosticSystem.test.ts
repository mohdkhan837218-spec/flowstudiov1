import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FlowActionTracer } from '../../src/main/diagnostics/FlowActionTracer';
import { FlowDiagnosticBundle } from '../../src/main/diagnostics/FlowDiagnosticBundle';
import { PathSecurity } from '../../src/main/security/paths';

describe('Google Flow Diagnostic System & Root Cause Forensics', () => {
  beforeEach(() => {
    PathSecurity.initialize();
  });

  it('TEST 1: FlowActionTracer should track action IDs, timeline events, and lastSuccessfulStep', () => {
    const tracer = new FlowActionTracer('job_diag_001', 'acct_01', 'worker_01', 'proj_01');

    const act1 = tracer.recordAction('OPEN_FLOW', 'CONNECT', 'Open Flow session');
    expect(act1).toBe('ACT-0001');
    tracer.completeAction(act1, 'SUCCESS');
    expect(tracer.getLastSuccessfulStep()).toBe('OPEN_FLOW_CONNECT');

    const act2 = tracer.recordAction('SELECT_MODE', 'CLICK_TAB', 'Click VIDEO tab');
    expect(act2).toBe('ACT-0002');
    tracer.completeAction(act2, 'SUCCESS');
    expect(tracer.getLastSuccessfulStep()).toBe('SELECT_MODE_CLICK_TAB');

    const act3 = tracer.recordAction('SELECT_MODEL', 'OPEN_DROPDOWN', 'Open model dropdown');
    expect(act3).toBe('ACT-0003');
    tracer.completeAction(act3, 'FAILED', 'Model Veo 3.1 - Quality not found');

    const timeline = tracer.getTimeline();
    expect(timeline.length).toBe(3);
    expect(timeline[0].result).toBe('SUCCESS');
    expect(timeline[2].result).toBe('FAILED');
    expect(timeline[2].detail).toContain('Veo 3.1 - Quality not found');
  });

  it('TEST 2: should produce HIGH-confidence root-cause analysis for FLOW_CONFIGURATION_MISMATCH (Video on Nano Banana 2)', () => {
    const tracer = new FlowActionTracer('job_mismatch_002', 'acct_01', 'worker_01');
    tracer.recordAction('SELECT_MODE', 'MODE_SWITCH', 'Switched mode');
    tracer.completeAction('ACT-0001', 'SUCCESS');

    const diagError = tracer.createDiagnosticError({
      code: 'FLOW_CONFIGURATION_MISMATCH',
      message: 'FLOW_MODE_MISMATCH: Job requested VIDEO but Flow composer is in IMAGE mode (Nano Banana 2)',
      expected: {
        generationType: 'VIDEO',
        model: 'Omni Flash',
        aspectRatio: '16:9',
        duration: 10,
        generationCount: 1,
        prompt: 'make a video for moto patlu'
      },
      actual: {
        generationType: 'IMAGE',
        model: 'Nano Banana 2',
        aspectRatio: '16:9',
        generationCount: 2
      }
    });

    expect(diagError.errorId).toMatch(/^ERR-/);
    expect(diagError.code).toBe('FLOW_CONFIGURATION_MISMATCH');
    expect(diagError.severity).toBe('ERROR');
    expect(diagError.confidence).toBe('HIGH');
    expect(diagError.likelyRootCause).toContain('Google Flow defaulted to Image mode');
    expect(diagError.evidence.some((e) => e.includes('IMAGE'))).toBe(true);
    expect(diagError.evidence.some((e) => e.includes('Nano Banana 2'))).toBe(true);
    expect(diagError.nextRecommendedAction).toContain('Click the VIDEO mode tab');
    expect(diagError.retryStrategy).toBe('SWITCH_MODE_AND_REAPPLY');
    expect(diagError.retryable).toBe(true);
  });

  it('TEST 3: should produce HIGH-confidence root-cause analysis for FLOW_MODEL_OPTION_NOT_FOUND', () => {
    const tracer = new FlowActionTracer('job_model_003', 'acct_01');
    tracer.recordAction('OPEN_FLOW', 'CONNECT', 'Flow opened');
    tracer.completeAction('ACT-0001', 'SUCCESS');

    const diagError = tracer.createDiagnosticError({
      code: 'FLOW_MODEL_OPTION_NOT_FOUND',
      message: 'Requested model Veo 3.1 - Quality not found in live menu',
      expected: { model: 'Veo 3.1 - Quality' },
      actual: {
        availableModels: ['Omni Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast']
      }
    });

    expect(diagError.code).toBe('FLOW_MODEL_OPTION_NOT_FOUND');
    expect(diagError.category).toBe('MODEL_SELECTION_ERROR');
    expect(diagError.confidence).toBe('HIGH');
    expect(diagError.likelyRootCause).toContain('The requested model is either not supported');
    expect(diagError.evidence.some((e) => e.includes('Veo 3.1 - Quality'))).toBe(true);
    expect(diagError.nextRecommendedAction).toContain('Re-open the model menu');
  });

  it('TEST 4: FlowDiagnosticBundle should store, sanitize secrets, and export complete debug bundle to disk', () => {
    const tracer = new FlowActionTracer('job_bundle_004', 'acct_01');
    tracer.recordAction('OPEN_FLOW', 'CONNECT', 'Opened Flow session');
    tracer.completeAction('ACT-0001', 'SUCCESS');

    const diagError = tracer.createDiagnosticError({
      code: 'FLOW_DURATION_MISMATCH',
      message: 'Job requested 10s but Flow composer is set to 8s',
      expected: { duration: 10, prompt: 'A futuristic city' },
      actual: { duration: 8, availableDurations: ['4s', '6s', '8s'] }
    });

    FlowDiagnosticBundle.storeError(diagError);

    // Retrieve error
    const fetched = FlowDiagnosticBundle.getError(diagError.errorId);
    expect(fetched).toBeDefined();
    expect(fetched?.errorId).toBe(diagError.errorId);

    // Sanitize secrets test
    const sensitive = { token: 'secret_token_123', password: 'my_password', code: 'FLOW_ERROR' };
    const sanitized = FlowDiagnosticBundle.sanitizeData(sensitive);
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.code).toBe('FLOW_ERROR');

    // Export bundle test
    const bundleDir = FlowDiagnosticBundle.exportDebugBundle(diagError.errorId);
    expect(fs.existsSync(bundleDir)).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'error.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'timeline.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'requested-vs-actual.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'logs.txt'))).toBe(true);

    const errorJson = JSON.parse(fs.readFileSync(path.join(bundleDir, 'error.json'), 'utf-8'));
    expect(errorJson.errorId).toBe(diagError.errorId);
    expect(errorJson.code).toBe('FLOW_DURATION_MISMATCH');
  });

  it('TEST 5: FlowActionTracer should manage Operation Lifecycle and Discovery Method Trace', () => {
    const tracer = new FlowActionTracer('job_op_005', 'acct_01');
    const opId = tracer.startOperation('SELECT_GENERATION_MODE', 'VIDEO', 'SELECT_MODE', { current: 2, total: 5 }, 1, 3);
    expect(opId).toMatch(/^OP-\d{6}$/);

    tracer.recordDiscoveryMethod('DOM TEXT', 'NO_MATCH', 0, 'Direct text not found');
    tracer.recordDiscoveryMethod('ARIA ROLE', 'MATCH_FOUND', 7, 'Found button roles');
    tracer.recordDiscoveryMethod('ACCESSIBLE NAME', 'MATCH_FOUND', 1, 'Exact accessible name');

    tracer.recordCandidates([
      { candidateId: 1, role: 'button', text: 'Image', visible: true, enabled: true, matched: false },
      { candidateId: 2, role: 'button', text: 'Video', visible: true, enabled: true, matched: true, matchScore: 100 },
      { candidateId: 3, role: 'button', text: 'Frames', visible: true, enabled: true, matched: false }
    ]);

    tracer.updateOperationLifecycle('VALIDATING', 'Candidate #2 selected');
    tracer.completeOperation('SUCCESS', 'VIDEO mode activated');

    const opState = tracer.getCurrentOperation();
    expect(opState).toBeDefined();
    expect(opState?.status).toBe('SUCCESS');
    expect(opState?.discoveryMethods.length).toBeGreaterThanOrEqual(3);
    expect(opState?.candidates.find((c) => c.matched)?.text).toBe('Video');
  });

  it('TEST 6: should record Click Diagnostics and State Transitions (BEFORE vs ACTION vs AFTER)', () => {
    const tracer = new FlowActionTracer('job_trans_006', 'acct_01');
    tracer.startOperation('SELECT_GENERATION_MODE', 'VIDEO', 'SELECT_MODE');

    tracer.recordClickDiagnostic({
      target: 'VIDEO',
      candidateName: 'Candidate #2',
      visible: true,
      enabled: true,
      pointerEvents: true,
      method: 'locator.click()',
      result: 'SUCCESS'
    });

    tracer.recordStateTransition(
      { mode: 'IMAGE', model: 'Nano Banana 2', duration: 'N/A', count: 'x2' },
      'Click VIDEO tab',
      { mode: 'VIDEO', model: 'Omni Flash', duration: '10s', count: 'x1' },
      'VERIFIED'
    );

    const op = tracer.getCurrentOperation();
    expect(op?.clickDiagnostic?.result).toBe('SUCCESS');
    expect(op?.stateTransition?.result).toBe('VERIFIED');
    expect(op?.stateTransition?.before.mode).toBe('IMAGE');
    expect(op?.stateTransition?.after.mode).toBe('VIDEO');
  });

  it('TEST 7: should record Generation Start Evidence Scoring and Result Detection', () => {
    const tracer = new FlowActionTracer('job_evidence_007', 'acct_01');
    tracer.startOperation('DETECT_GENERATION_START', 'DIFFUSION_OUTPUT', 'GENERATING');

    tracer.recordGenerationEvidence({
      score: 11,
      threshold: 4,
      status: 'GENERATION_CONFIRMED',
      breakdown: {
        newOutputPlaceholder: 3,
        mediaCountIncreased: 3,
        processingIndicator: 2,
        statusGeneratingLabel: 2,
        domMutation: 1
      },
      notes: ['Placeholder created', 'Media count incremented from 5 to 6']
    });

    tracer.recordResultDetection({
      beforeMediaCount: 5,
      afterMediaCount: 6,
      elapsedSeconds: 18.2,
      processingState: 'IDLE',
      status: 'NEW_OUTPUT_DETECTED',
      detectedResultId: 'result_shot_001_video.mp4'
    });

    const op = tracer.getCurrentOperation();
    expect(op?.generationEvidence?.score).toBe(11);
    expect(op?.generationEvidence?.status).toBe('GENERATION_CONFIRMED');
    expect(op?.resultDetection?.status).toBe('NEW_OUTPUT_DETECTED');
  });
});
