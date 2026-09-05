import fs from 'fs';
import path from 'path';
import { FlowDiagnosticError } from '../../shared/types/diagnostics';
import { PathSecurity } from '../security/paths';
import { Logger } from '../logging/logger';

export class FlowDiagnosticBundle {
  private static storedErrors: Map<string, FlowDiagnosticError> = new Map();

  public static storeError(error: FlowDiagnosticError): void {
    this.storedErrors.set(error.errorId, error);
    if (error.jobId) {
      this.storedErrors.set(error.jobId, error);
    }
  }

  public static getError(id: string): FlowDiagnosticError | undefined {
    return this.storedErrors.get(id);
  }

  public static listErrors(): FlowDiagnosticError[] {
    const unique = new Map<string, FlowDiagnosticError>();
    this.storedErrors.forEach((v) => unique.set(v.errorId, v));
    return Array.from(unique.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Sanitizes all sensitive data (cookies, tokens, authorization headers, passwords).
   */
  public static sanitizeData<T>(data: T): T {
    if (!data) return data;
    const str = JSON.stringify(data);
    const sanitizedStr = str
      .replace(/("token"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
      .replace(/("password"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
      .replace(/("cookie"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
      .replace(/("authorization"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
      .replace(/("key"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
      .replace(/("apiKey"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"');
    return JSON.parse(sanitizedStr);
  }

  /**
   * Exports a complete forensic debug bundle folder on disk.
   */
  public static exportDebugBundle(errorId: string): string {
    const error = this.getError(errorId);
    if (!error) {
      throw new Error(`Diagnostic error ${errorId} not found`);
    }

    const appData = PathSecurity.getUserDataDir();
    const bundleDir = path.join(appData, 'debug-bundles', error.errorId);
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
    }

    // 1. error.json
    fs.writeFileSync(path.join(bundleDir, 'error.json'), JSON.stringify(this.sanitizeData(error), null, 2), 'utf-8');

    // 2. timeline.json
    fs.writeFileSync(path.join(bundleDir, 'timeline.json'), JSON.stringify(error.timeline, null, 2), 'utf-8');

    // 3. action-trace.json
    fs.writeFileSync(
      path.join(bundleDir, 'action-trace.json'),
      JSON.stringify(
        {
          operationId: error.operationId,
          lastSuccessfulStep: error.lastSuccessfulStep,
          stage: error.stage,
          step: error.step,
          timeline: error.timeline
        },
        null,
        2
      ),
      'utf-8'
    );

    // 4. requested-state.json
    fs.writeFileSync(path.join(bundleDir, 'requested-state.json'), JSON.stringify(error.expected, null, 2), 'utf-8');

    // 5. actual-state.json
    fs.writeFileSync(path.join(bundleDir, 'actual-state.json'), JSON.stringify(error.actual, null, 2), 'utf-8');

    // 6. capabilities.json
    if (error.capabilitySnapshot) {
      fs.writeFileSync(path.join(bundleDir, 'capabilities.json'), JSON.stringify(error.capabilitySnapshot, null, 2), 'utf-8');
    }

    // 7. requested-vs-actual.json
    const reqVsAct = {
      expected: error.expected,
      actual: error.actual,
      likelyRootCause: error.likelyRootCause,
      confidence: error.confidence,
      evidence: error.evidence,
      lastSuccessfulStep: error.lastSuccessfulStep,
      nextRecommendedAction: error.nextRecommendedAction,
      discoveryMethods: error.discoveryMethods,
      candidates: error.candidates,
      clickDiagnostic: error.clickDiagnostic,
      stateTransition: error.stateTransition,
      generationEvidence: error.generationEvidence,
      resultDetection: error.resultDetection
    };
    fs.writeFileSync(path.join(bundleDir, 'requested-vs-actual.json'), JSON.stringify(reqVsAct, null, 2), 'utf-8');

    // 8. accessibility-tree.json
    if (error.accessibilityTree) {
      fs.writeFileSync(path.join(bundleDir, 'accessibility-tree.json'), JSON.stringify(error.accessibilityTree, null, 2), 'utf-8');
    }

    // 9. dom-snapshot.html
    if (error.domSnippet) {
      fs.writeFileSync(path.join(bundleDir, 'dom-snapshot.html'), error.domSnippet, 'utf-8');
    }

    // 10. logs.txt
    const logLines = error.timeline.map((t) => `${t.time} [${t.stage}] ${t.action} -> ${t.result}${t.detail ? ` (${t.detail})` : ''}`);
    fs.writeFileSync(path.join(bundleDir, 'logs.txt'), logLines.join('\n'), 'utf-8');

    // Copy screenshot if present
    if (error.screenshotPath && fs.existsSync(error.screenshotPath)) {
      try {
        fs.copyFileSync(error.screenshotPath, path.join(bundleDir, 'failure-screenshot.png'));
      } catch {}
    }

    error.debugBundlePath = bundleDir;
    Logger.success('FlowDiagnosticBundle', `Exported forensic debug bundle to ${bundleDir}`);
    return bundleDir;
  }

  public static clearHistory(): void {
    this.storedErrors.clear();
  }

  /**
   * Generates a fully-formed realistic forensic diagnostic error for Sandbox testing.
   */
  public static simulateDiagnosticError(type: string): FlowDiagnosticError {
    const errorId = `sim_err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const jobId = `job_sim_${Math.random().toString(36).substring(2, 7)}`;
    const workerId = `worker_sim_${Math.floor(Math.random() * 4) + 1}`;
    const accountId = `acc_sim_${Math.random().toString(36).substring(2, 6)}`;
    const projectId = `proj_sim_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    let error: FlowDiagnosticError;

    switch (type) {
      case 'WRONG_ROUTE': {
        const flowUrl = `https://labs.google/fx/tools/flow/project/${projectId}/characters`;
        Logger.info('FlowProjectManager', 'Navigating to project URL...', accountId, jobId, { category: 'NAVIGATION', stage: 'NAVIGATE_TO_PROJECT' });
        Logger.warn('GenerationWorkspaceResolver', `Target URL redirected to non-generation route: ${flowUrl}`, accountId, jobId, { category: 'NAVIGATION', stage: 'WORKSPACE_VALIDATION', errorCode: 'FLOW_WRONG_ROUTE' });
        Logger.error('FlowProjectManager', 'Wrong route detected: redirected to /characters instead of generation workspace', accountId, jobId, { category: 'FLOW', stage: 'VALIDATE_WORKSPACE', errorCode: 'FLOW_WRONG_ROUTE', errorId });

        error = {
          errorId,
          code: 'FLOW_WRONG_ROUTE',
          category: 'WRONG_ROUTE_ERROR',
          severity: 'ERROR',
          stage: 'WORKSPACE_VALIDATION',
          step: 'VALIDATE_GENERATION_WORKSPACE',
          message: 'Navigation reached /characters route instead of root generation workspace',
          humanExplanation: 'The browser opened a project sub-route (/characters) which lacks the generation composer canvas. Flow Studio must operate on the primary generation workspace.',
          jobId,
          workerId,
          accountId,
          projectId,
          flowUrl,
          expected: { generationType: 'VIDEO', prompt: 'Cinematic slow-motion shot' },
          actual: { currentRoute: '/characters', expectedRoute: `/project/${projectId}` },
          lastSuccessfulStep: 'PROJECT_NAVIGATE_INITIAL',
          currentAction: 'CHECK_WORKSPACE_ROUTE',
          nextRecommendedAction: 'Clean project URL and navigate to base project URL',
          likelyRootCause: 'Route contains /characters sub-path causing Flow to render Character management view instead of Composer.',
          confidence: 'HIGH',
          evidence: [
            `Current URL: ${flowUrl}`,
            'Expected base project URL without sub-paths',
            'Composer DOM elements not present on /characters page'
          ],
          retryable: true,
          retryStrategy: 'RETURN_TO_GENERATION_WORKSPACE',
          maxRetries: 2,
          attempt: 1,
          timestamp,
          timeline: [
            { actionId: 'a1', time: '12:00:01', stage: 'INIT', step: 'START', action: 'INIT_WORKER', result: 'SUCCESS' },
            { actionId: 'a2', time: '12:00:02', stage: 'NAV', step: 'GOTO_PROJECT', action: 'NAVIGATE', target: flowUrl, result: 'SUCCESS' },
            { actionId: 'a3', time: '12:00:03', stage: 'VALIDATE', step: 'CHECK_ROUTE', action: 'PARSE_URL', target: '/characters', result: 'FAILED', detail: 'FLOW_WRONG_ROUTE' }
          ],
          domSnippet: '<div class="character-management-container"><h2>Characters</h2><button>New Character</button></div>'
        };
        break;
      }

      case 'VIDEO_BUTTON_MISSING':
      default: {
        Logger.info('FlowProjectManager', 'Project opened and workspace active', accountId, jobId, { category: 'PROJECT', stage: 'OPEN_PROJECT' });
        Logger.debug('FlowWorkspaceInspector', 'Composer container verified in DOM', accountId, jobId, { category: 'COMPOSER', stage: 'FIND_COMPOSER' });
        Logger.debug('FlowModeResolver', 'Searching for VIDEO mode button candidates...', accountId, jobId, { category: 'MODE', stage: 'SELECT_GENERATION_MODE' });
        Logger.warn('DOMResolver', 'Text selector [role="tab"]:has-text("Video") yielded 0 candidates', accountId, jobId, { category: 'DOM', stage: 'FIND_VIDEO_BUTTON' });
        Logger.debug('AXResolver', 'Searching accessibility tree for name="Video"...', accountId, jobId, { category: 'ACCESSIBILITY', stage: 'FIND_VIDEO_BUTTON' });
        Logger.error('FlowModeResolver', 'VIDEO mode button could not be verified or clicked', accountId, jobId, {
          category: 'MODE',
          stage: 'SELECT_GENERATION_MODE',
          action: 'VERIFY_VIDEO',
          errorCode: 'FLOW_MODE_BUTTON_NOT_FOUND',
          errorId
        });

        error = {
          errorId,
          code: 'FLOW_MODE_BUTTON_NOT_FOUND',
          category: 'MODE_SELECTION_ERROR',
          severity: 'ERROR',
          stage: 'SELECT_GENERATION_MODE',
          step: 'RESOLVE_VIDEO_MODE_BUTTON',
          message: 'VIDEO mode button could not be found or verified in composer UI',
          humanExplanation: 'Flow Studio searched for the Video mode toggle across DOM text, CSS selectors, ARIA roles, and the accessibility tree, but 0 active candidates responded.',
          jobId,
          workerId,
          accountId,
          projectId,
          flowUrl: `https://labs.google/fx/tools/flow/project/${projectId}`,
          expected: { generationType: 'VIDEO', model: 'Veo 2', duration: 5, aspectRatio: '16:9' },
          actual: { generationType: 'IMAGE', model: 'Nano Banana 2', availableButtons: ['Image', 'Expand'] },
          lastSuccessfulStep: 'COMPOSER_CONTAINER_FOUND',
          currentAction: 'CLICK_AND_VERIFY_VIDEO_MODE',
          nextRecommendedAction: 'Reinspect UI accessibility tree and refresh composer controls',
          likelyRootCause: 'Composer mode switcher collapsed or rendered under non-standard ARIA tab list in current Flow revision.',
          confidence: 'HIGH',
          evidence: [
            'DOM text selector "Video": 0 matches',
            'ARIA button selector [role="button"][name*="Video"]: 0 matches',
            'AX tree search: 0 matches for target VIDEO',
            'Composer currently stuck in IMAGE mode (Nano Banana 2)'
          ],
          retryable: true,
          retryStrategy: 'REINSPECT_AND_RETRY',
          maxRetries: 3,
          attempt: 1,
          timestamp,
          timeline: [
            { actionId: 't1', time: '12:01:01', stage: 'PROJECT', step: 'OPEN', action: 'OPEN_PROJECT', result: 'SUCCESS' },
            { actionId: 't2', time: '12:01:02', stage: 'WORKSPACE', step: 'INSPECT', action: 'FIND_COMPOSER', result: 'SUCCESS' },
            { actionId: 't3', time: '12:01:03', stage: 'MODE', step: 'DISCOVERY', action: 'SEARCH_VIDEO_DOM', target: 'button:has-text("Video")', result: 'FAILED', detail: '0 matches' },
            { actionId: 't4', time: '12:01:04', stage: 'MODE', step: 'DISCOVERY', action: 'SEARCH_VIDEO_ARIA', target: '[aria-label*="Video"]', result: 'FAILED', detail: '0 matches' },
            { actionId: 't5', time: '12:01:05', stage: 'MODE', step: 'VERIFY', action: 'VERIFY_VIDEO_ACTIVE', result: 'FAILED', detail: 'FLOW_MODE_BUTTON_NOT_FOUND' }
          ],
          discoveryMethods: [
            { method: 'DOM Text Match ("Video")', status: 'NO_MATCH', matchCount: 0, detail: '0 text elements matched "Video"' },
            { method: 'CSS Selector (.mode-switch-video)', status: 'NO_MATCH', matchCount: 0, detail: 'Class not found in current DOM' },
            { method: 'ARIA Role Locator ([role="tab"][name*="Video"])', status: 'NO_MATCH', matchCount: 0, detail: '0 matching ARIA nodes' },
            { method: 'Accessibility Tree Traverse', status: 'NO_MATCH', matchCount: 0, detail: 'Target "Video" not exposed in active ax tree' }
          ],
          candidates: [],
          stateTransition: {
            before: { mode: 'IMAGE', model: 'Nano Banana 2' },
            action: 'CLICK_VIDEO_MODE',
            after: { mode: 'IMAGE', model: 'Nano Banana 2' },
            result: 'FLOW_MODE_TRANSITION_FAILED'
          },
          clickDiagnostic: {
            target: 'VIDEO_MODE_TOGGLE',
            visible: false,
            enabled: false,
            pointerEvents: false,
            method: 'ARIA_LOCATOR_SEARCH',
            result: 'FAILED',
            stateVerification: {
              expected: 'VIDEO',
              actual: 'IMAGE',
              result: 'FAILED'
            }
          },
          domSnippet: '<div class="composer-toolbar"><div class="mode-pill active">Image</div><div class="model-badge">Nano Banana 2</div></div>'
        };
        break;
      }

      case 'GENERATION_TIMEOUT': {
        Logger.info('FlowSubmissionManager', 'Prompt submitted successfully', accountId, jobId, { category: 'SUBMISSION', stage: 'SUBMIT_PROMPT' });
        Logger.debug('FlowGenerationMonitor', 'Polling for generation output placeholder...', accountId, jobId, { category: 'GENERATION', stage: 'WAIT_FOR_OUTPUT' });
        Logger.warn('FlowGenerationMonitor', '120s elapsed without output placeholder or progress indicator', accountId, jobId, { category: 'GENERATION', stage: 'WAIT_FOR_OUTPUT' });
        Logger.error('FlowGenerationMonitor', 'Generation timed out after 180s without completed media card', accountId, jobId, {
          category: 'GENERATION',
          stage: 'WAIT_FOR_OUTPUT',
          action: 'WAIT_FOR_GENERATION_RESULT',
          errorCode: 'FLOW_GENERATION_TIMEOUT',
          errorId
        });

        error = {
          errorId,
          code: 'FLOW_GENERATION_TIMEOUT',
          category: 'TIMEOUT_ERROR',
          severity: 'ERROR',
          stage: 'WAITING_FOR_GENERATION',
          step: 'MONITOR_GENERATION_RESULT',
          message: 'Generation timed out after 180s without result in project timeline',
          humanExplanation: 'The job was submitted to Google Flow, but after 180 seconds no new video/image output was registered or ready for download.',
          jobId,
          workerId,
          accountId,
          projectId,
          flowUrl: `https://labs.google/fx/tools/flow/project/${projectId}`,
          expected: { prompt: 'Futuristic hypercar racing on neon highway', duration: 5 },
          actual: { elapsedSeconds: 180, mediaCountBefore: 4, mediaCountAfter: 4, processingState: 'IDLE' },
          lastSuccessfulStep: 'SUBMISSION_CONFIRMED',
          currentAction: 'POLL_PROJECT_MEDIA_STREAM',
          nextRecommendedAction: 'Verify Google Flow quota or retry job with a clean session',
          likelyRootCause: 'Google Flow backend queue latency or silent generation failure without UI error notice.',
          confidence: 'MEDIUM',
          evidence: [
            'Prompt submit button clicked and disabled normally',
            'Elapsed time reached maximum configured timeout threshold (180s)',
            'Media items count remained unchanged (4 items)',
            'No spinner or loading skeleton visible in active workspace'
          ],
          retryable: true,
          retryStrategy: 'WAIT_AND_RECHECK',
          maxRetries: 2,
          attempt: 1,
          timestamp,
          timeline: [
            { actionId: 'gt1', time: '12:05:00', stage: 'SUBMIT', step: 'PROMPT', action: 'CLICK_SUBMIT', result: 'SUCCESS' },
            { actionId: 'gt2', time: '12:05:02', stage: 'SUBMIT', step: 'CONFIRM', action: 'SUBMISSION_CONFIRMED', result: 'SUCCESS' },
            { actionId: 'gt3', time: '12:06:00', stage: 'MONITOR', step: 'POLL', action: 'CHECK_OUTPUT_60S', result: 'PENDING' },
            { actionId: 'gt4', time: '12:07:00', stage: 'MONITOR', step: 'POLL', action: 'CHECK_OUTPUT_120S', result: 'PENDING' },
            { actionId: 'gt5', time: '12:08:02', stage: 'MONITOR', step: 'TIMEOUT', action: 'TIMEOUT_180S', result: 'FAILED', detail: 'FLOW_GENERATION_TIMEOUT' }
          ],
          generationEvidence: {
            score: 0,
            threshold: 4,
            status: 'WAITING_FOR_GENERATION_EVIDENCE',
            breakdown: {
              newOutputPlaceholder: 0,
              mediaCountIncreased: 0,
              processingIndicator: 0,
              statusGeneratingLabel: 0,
              domMutation: 0
            },
            notes: ['No new output element found', 'No progress bar detected', 'Score 0 < threshold 4']
          },
          resultDetection: {
            beforeMediaCount: 4,
            afterMediaCount: 4,
            elapsedSeconds: 180,
            processingState: 'IDLE',
            status: 'TIMEOUT'
          }
        };
        break;
      }

      case 'SUBMIT_FAILURE': {
        Logger.info('FlowComposerController', 'Prompt inserted into Flow composer textarea', accountId, jobId, { category: 'PROMPT', stage: 'ENTER_PROMPT' });
        Logger.warn('FlowSubmissionManager', 'Submit button remains disabled after prompt insertion', accountId, jobId, { category: 'SUBMISSION', stage: 'CLICK_SUBMIT', errorCode: 'FLOW_SUBMIT_BUTTON_DISABLED' });
        Logger.error('FlowSubmissionManager', 'Submit button could not be activated', accountId, jobId, {
          category: 'SUBMISSION',
          stage: 'CLICK_SUBMIT',
          errorCode: 'FLOW_SUBMIT_BUTTON_DISABLED',
          errorId
        });

        error = {
          errorId,
          code: 'FLOW_SUBMIT_BUTTON_DISABLED',
          category: 'SUBMIT_BUTTON_ERROR',
          severity: 'ERROR',
          stage: 'SUBMIT_GENERATION',
          step: 'ACTIVATE_SUBMIT_BUTTON',
          message: 'Submit arrow button is disabled or unresponsive after prompt input',
          humanExplanation: 'The prompt text was written into the composer, but the submit button remained in a disabled state, possibly because the input event was not recognized by Flow React state.',
          jobId,
          workerId,
          accountId,
          projectId,
          expected: { prompt: 'Make a video for motu patlu' },
          actual: { submitButtonDisabled: true, promptLength: 26 },
          lastSuccessfulStep: 'PROMPT_TEXT_WRITTEN',
          currentAction: 'CLICK_CIRCULAR_SUBMIT_ARROW',
          nextRecommendedAction: 'Re-trigger synthetic input and change events on textarea',
          likelyRootCause: 'Flow React state did not update onChange handler when text was filled programmatically.',
          confidence: 'HIGH',
          evidence: [
            'Textarea value length: 26 chars',
            'Submit button aria-disabled="true" / disabled property true',
            'Synthetic input and keydown events did not trigger state re-render'
          ],
          retryable: true,
          retryStrategy: 'REENTER_PROMPT',
          maxRetries: 3,
          attempt: 1,
          timestamp,
          timeline: [
            { actionId: 'sf1', time: '12:10:00', stage: 'PROMPT', step: 'FILL', action: 'FILL_TEXTAREA', result: 'SUCCESS' },
            { actionId: 'sf2', time: '12:10:01', stage: 'SUBMIT', step: 'VERIFY_BUTTON', action: 'CHECK_BUTTON_ENABLED', result: 'FAILED', detail: 'disabled=true' }
          ]
        };
        break;
      }

      case 'WORKER_CRASH': {
        Logger.critical('WorkerManager', 'Worker browser process disconnected abruptly (SIGSEGV / crash)', accountId, jobId, {
          category: 'WORKER',
          stage: 'WORKER_MONITOR',
          errorCode: 'WORKER_CRASH',
          workerId,
          errorId
        });

        error = {
          errorId,
          code: 'WORKER_CRASH',
          category: 'WORKER_ERROR',
          severity: 'CRITICAL',
          stage: 'WORKER_EXECUTION',
          step: 'MAINTAIN_WORKER_HEARTBEAT',
          message: 'Worker browser process crashed or heartbeat timed out',
          humanExplanation: 'The background Playwright/Chromium process terminated unexpectedly or failed to send a heartbeat for >30 seconds.',
          jobId,
          workerId,
          accountId,
          expected: { workerStatus: 'BUSY', heartbeatAgeSeconds: '<5' },
          actual: { workerStatus: 'CRASHED', lastHeartbeatSecondsAgo: 45 },
          lastSuccessfulStep: 'WORKER_SPAWN',
          currentAction: 'MONITOR_WORKER_LIFECYCLE',
          nextRecommendedAction: 'Restart worker profile and reclaim pending job from queue',
          likelyRootCause: 'Browser out of memory or native graphics driver crash in Chromium profile.',
          confidence: 'MEDIUM',
          evidence: [
            'Process exit event caught with non-zero exit code',
            'Heartbeat timer expired (>30s silence)',
            'IPC connection severed'
          ],
          retryable: true,
          retryStrategy: 'RESTART_PROFILE',
          maxRetries: 2,
          attempt: 1,
          timestamp,
          timeline: [
            { actionId: 'wc1', time: '12:15:00', stage: 'WORKER', step: 'START', action: 'SPAWN_WORKER', result: 'SUCCESS' },
            { actionId: 'wc2', time: '12:15:30', stage: 'WORKER', step: 'HEARTBEAT', action: 'CHECK_HEARTBEAT', result: 'FAILED', detail: 'HEARTBEAT_TIMEOUT' }
          ]
        };
        break;
      }
    }

    this.storeError(error);
    return error;
  }
}
