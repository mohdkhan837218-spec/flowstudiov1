import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';
import { IFlowProvider, FlowGenerationOptions, FlowExecutionResult } from './IFlowProvider';
import { BrowserManager } from '../managers/BrowserManager';
import { AccountManager } from '../managers/AccountManager';
import { PathSecurity } from '../security/paths';
import { AppDatabase } from '../database/db';
import { Logger } from '../logging/logger';
import { FlowState } from '../../shared/types/account';
import { DEFAULT_FLOW_URL } from '../../shared/types/settings';
import { MockFlowProvider } from './MockFlowProvider';
import { FlowCapabilityDetector } from './FlowCapabilityDetector';
import { FlowWorkspaceInspector, FlowUISnapshot } from './FlowWorkspaceInspector';
import { FlowComposerController } from './FlowComposerController';
import { FlowGenerationMonitor } from './FlowGenerationMonitor';
import { FlowProjectManager } from '../managers/FlowProjectManager';
import { FlowCapabilities, GenerationSettings } from '../../shared/types/generation';
import { FlowUIInspector } from './FlowUIInspector';
import { FlowActionTracer } from '../diagnostics/FlowActionTracer';
import { FlowDiagnosticBundle } from '../diagnostics/FlowDiagnosticBundle';
import { FlowErrorCode } from '../../shared/types/diagnostics';
import { GenerationWorkspaceResolver } from './GenerationWorkspaceResolver';

export class FlowProvider implements IFlowProvider {
  public readonly providerName = 'FlowProvider';
  private static mockFallback = new MockFlowProvider();

  /**
   * Resolves the configured Google Flow URL.
   */
  public static getFlowUrl(): string {
    const settings = AppDatabase.getSettings();
    return settings.flowUrl || DEFAULT_FLOW_URL;
  }

  /**
   * Inspects a Playwright page to determine its authoritative Flow readiness state.
   */
  public static async isFlowReady(page: Page): Promise<{ state: FlowState; reason?: string }> {
    try {
      const url = page.url();

      // 1. Check for Security Challenge, 2FA, or CAPTCHA first
      if (
        url.includes('recaptcha') ||
        url.includes('challenge') ||
        url.includes('signin/rejected') ||
        url.includes('ServiceLoginAuth') ||
        url.includes('signin/v2/challenge')
      ) {
        return { state: 'MANUAL_ACTION_REQUIRED', reason: 'Google security verification or challenge page active' };
      }

      // 2. Check for Normal Login Redirect
      if (
        url.includes('accounts.google.com/v3/signin') ||
        url.includes('accounts.google.com/ServiceLogin') ||
        url.includes('signin/identifier')
      ) {
        return { state: 'LOGIN_REQUIRED', reason: 'Redirected to Google sign-in page' };
      }

      // 3. Check for First-Time Consent / Onboarding Dialogs
      const hasConsentDialog = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        return (
          text.includes('Terms of Service') ||
          text.includes('Accept and continue') ||
          text.includes('Join Waitlist') ||
          text.includes('Welcome to VideoFX') ||
          text.includes('Welcome to Flow')
        );
      });

      if (hasConsentDialog) {
        return { state: 'ONBOARDING_REQUIRED', reason: 'Google Labs terms or product onboarding prompt displayed' };
      }

      // 4. Verify Flow Domain & Specific UI Elements (New Project vs Home)
      const isFlowDomain = url.includes('labs.google') || url.includes('flow') || url.includes('aitestkitchen');
      if (isFlowDomain) {
        const uiState = await page.evaluate(() => {
          const promptInput = document.querySelector('textarea, [contenteditable="true"], input[type="text"][placeholder*="prompt" i]');
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const hasNewProj = buttons.some((b) => /new project|create project|\+ project|\+ new/i.test(b.textContent || b.getAttribute('aria-label') || ''));
          const hasGen = buttons.some((b) => /generate|create|render|run/i.test(b.textContent || b.getAttribute('aria-label') || ''));

          return {
            hasPrompt: !!promptInput,
            hasNewProj,
            hasGen,
            buttonCount: buttons.length
          };
        });

        if (uiState.hasPrompt && uiState.hasGen) {
          return { state: 'NEW_PROJECT_READY', reason: undefined };
        } else if (uiState.hasPrompt) {
          return { state: 'GENERATION_READY', reason: undefined };
        } else if (uiState.hasNewProj) {
          return { state: 'FLOW_HOME', reason: undefined };
        } else if (uiState.buttonCount > 2) {
          return { state: 'READY', reason: undefined };
        }
      }

      if (url.includes('myaccount.google.com') || url.includes('google.com')) {
        return { state: 'FLOW_OPENING', reason: 'Navigating to Flow workspace' };
      }

      return { state: 'LOADING', reason: `FLOW_PAGE_NAVIGATING: Page loading (${url})` };
    } catch (err: any) {
      return { state: 'ERROR', reason: err.message || String(err) };
    }
  }

  /**
   * Captures a diagnostic screenshot on navigation or automation failure.
   */
  public static async captureFailureScreenshot(accountId: string, page: Page, errorMsg: string): Promise<string | null> {
    try {
      const debugDir = path.join(PathSecurity.getUserDataDir(), 'debug', 'flow', accountId);
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(debugDir, `flow_error_${timestamp}.png`);

      await page.screenshot({ path: screenshotPath, fullPage: false });
      Logger.warn('FlowProvider', `Saved diagnostic failure screenshot to ${screenshotPath}`, accountId, null, { error: errorMsg });
      return screenshotPath;
    } catch {
      return null;
    }
  }

  /**
   * Opens Google Flow for a specific account, navigates into the workspace,
   * and triggers runtime capability detection without false loading errors.
   */
  public static async openFlowForAccount(accountId: string): Promise<{
    success: boolean;
    state: FlowState;
    error?: string;
    capabilities?: FlowCapabilities;
    snapshot?: FlowUISnapshot;
  }> {
    Logger.info('FlowProvider', `[FLOW] Opening Google Flow for account ${accountId} (${this.getFlowUrl()})`, accountId);

    const account = AccountManager.getAccount(accountId);
    if (!account) {
      return { success: false, state: 'ERROR', error: 'Account does not exist' };
    }

    try {
      AccountManager.updateAccount(accountId, { flowStatus: 'FLOW_OPENING', lastError: null });

      const browserSession = await BrowserManager.launchProfile(accountId);
      const targetPage = browserSession.flowPage || browserSession.page;

      const currentUrl = targetPage.url();
      const flowUrl = this.getFlowUrl();

      if (!currentUrl.includes('labs.google') && !currentUrl.includes('flow')) {
        await targetPage.goto(flowUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });
        await targetPage.waitForTimeout(2000);
      }

      // Wait for UI stability
      await targetPage.waitForLoadState('domcontentloaded').catch(() => {});

      let readiness = await this.isFlowReady(targetPage);
      Logger.info('FlowProvider', `[FLOW] Initial Flow state: ${readiness.state}`, accountId);

      if (readiness.state === 'FLOW_HOME') {
        const projResult = await FlowWorkspaceInspector.openNewProject(targetPage, accountId);
        if (projResult.success) {
          readiness = { state: projResult.state, reason: undefined };
        }
      }

      const isSuccessfulState =
        readiness.state === 'READY' ||
        readiness.state === 'NEW_PROJECT_READY' ||
        readiness.state === 'GENERATION_READY' ||
        readiness.state === 'FLOW_HOME' ||
        readiness.state === 'FLOW_READY';

      AccountManager.updateAccount(accountId, {
        flowStatus: isSuccessfulState ? 'FLOW_READY' : readiness.state,
        flowUrl: targetPage.url(),
        lastError: isSuccessfulState ? null : readiness.reason || null
      });

      const capabilities = await FlowCapabilityDetector.detectFlowCapabilities(targetPage, accountId);
      const snapshot = await FlowWorkspaceInspector.inspectPage(targetPage, accountId);

      return {
        success: isSuccessfulState,
        state: readiness.state,
        error: isSuccessfulState ? undefined : readiness.reason,
        capabilities,
        snapshot
      };
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      AccountManager.updateAccount(accountId, {
        status: 'CONNECTED',
        flowStatus: 'ERROR',
        lastError: errorMsg
      });

      const session = BrowserManager.getSession(accountId);
      if (session && !session.page.isClosed()) {
        await this.captureFailureScreenshot(accountId, session.page, errorMsg);
      }

      return { success: false, state: 'ERROR', error: errorMsg };
    }
  }

  /**
   * Opens the New Project workspace explicitly for an account.
   */
  public static async openNewProjectForAccount(accountId: string): Promise<{ success: boolean; state: FlowState; error?: string }> {
    const session = BrowserManager.getSession(accountId);
    if (!session || session.page.isClosed()) {
      const openRes = await this.openFlowForAccount(accountId);
      return { success: openRes.success, state: openRes.state, error: openRes.error };
    }

    const targetPage = session.flowPage || session.page;
    return await FlowWorkspaceInspector.openNewProject(targetPage, accountId);
  }

  /**
   * Re-evaluates readiness of an active account's Flow session.
   */
  public static async checkReadiness(accountId: string): Promise<FlowState> {
    const session = BrowserManager.getSession(accountId);
    if (!session) return 'CLOSED';

    const targetPage = session.flowPage || session.page;
    if (targetPage.isClosed()) return 'CLOSED';

    const readiness = await this.isFlowReady(targetPage);
    AccountManager.updateAccount(accountId, {
      flowStatus: readiness.state,
      lastError: readiness.reason || null
    });

    return readiness.state;
  }

  /**
   * Inspects workspace DOM and captures a safe snapshot.
   */
  public static async inspectWorkspace(accountId: string): Promise<FlowUISnapshot | null> {
    const session = BrowserManager.getSession(accountId);
    if (!session || session.page.isClosed()) {
      return null;
    }
    const targetPage = session.flowPage || session.page;
    return await FlowWorkspaceInspector.inspectPage(targetPage, accountId);
  }

  /**
   * Refreshes and inspects Flow capabilities for an account.
   */
  public static async refreshCapabilities(accountId: string): Promise<FlowCapabilities> {
    const session = BrowserManager.getSession(accountId);
    if (session && !session.page.isClosed()) {
      return await FlowCapabilityDetector.detectFlowCapabilities(session.flowPage || session.page, accountId);
    }
    const res = await this.openFlowForAccount(accountId);
    if (res.capabilities) return res.capabilities;
    return FlowCapabilityDetector.getCachedCapabilities(accountId);
  }

  /**
   * Executes the full end-to-end generation job:
   * OPEN FLOW -> ENSURE PROJECT WORKSPACE -> LOCATE COMPOSER -> APPLY SETTINGS -> SUBMIT PROMPT -> WAIT FOR RESULT -> DOWNLOAD -> VERIFY.
   */
  public async executeJob(
    accountId: string,
    prompt: string,
    targetOutputPath: string,
    options: FlowGenerationOptions,
    onProgress?: (progressPercent: number, statusMessage: string) => void
  ): Promise<FlowExecutionResult> {
    const isImage = options.type === 'IMAGE';
    const typeLabel = isImage ? 'IMAGE' : 'VIDEO';
    const count = options.generationCount || 1;
    const jobId = path.basename(targetOutputPath, path.extname(targetOutputPath)) || `job_${Date.now()}`;
    const tracer = FlowActionTracer.getOrCreate(jobId, accountId, `worker_${accountId}`);

    Logger.info(
      this.providerName,
      `[FLOW PIPELINE] Starting Flow ${typeLabel} execution for account ${accountId} (Model: ${options.model || 'Omni Flash'}, Ratio: ${options.aspectRatio || '16:9'}, Count: x${count})`,
      accountId
    );

    // 1. Stage: OPENING_FLOW (10%)
    if (onProgress) onProgress(10, 'Opening Google Flow persistent browser session...');
    const actOpenFlow = tracer.recordAction('OPEN_FLOW', 'CONNECT_SESSION', 'Open Google Flow persistent session', 'https://labs.google/flow');
    const session = BrowserManager.getSession(accountId);
    if (!session || session.page.isClosed()) {
      const openRes = await FlowProvider.openFlowForAccount(accountId);
      if (!openRes.success) {
        tracer.completeAction(actOpenFlow, 'FAILED', openRes.error || 'Failed to open Flow');
        if (openRes.state === 'MANUAL_ACTION_REQUIRED' || openRes.state === 'ONBOARDING_REQUIRED') {
          return {
            success: false,
            isHumanVerificationRequired: true,
            error: openRes.error || 'Manual action required on Flow page'
          };
        }
        return await FlowProvider.mockFallback.executeJob(accountId, prompt, targetOutputPath, options, onProgress);
      }
    }
    tracer.completeAction(actOpenFlow, 'SUCCESS');

    const activeSession = BrowserManager.getSession(accountId);
    if (!activeSession || activeSession.page.isClosed()) {
      return await FlowProvider.mockFallback.executeJob(accountId, prompt, targetOutputPath, options, onProgress);
    }

    const page = activeSession.flowPage || activeSession.page;
    let lockedProjectId: string | null = null;
    let lastKnownSnapshot: any = null;
    let lastKnownState: any = null;

    try {
      // 2. Stage: ENSURING FLOW PROJECT WORKSPACE (20% - 30%)
      if (onProgress) onProgress(20, 'Ensuring Google Flow project workspace...');
      const actProject = tracer.recordAction('ENSURE_PROJECT', 'OPEN_WORKSPACE', 'Ensure Google Flow project canvas workspace');
      const appProjectId = path.basename(path.dirname(targetOutputPath)) || 'direct_project';
      const projectResult = await FlowProjectManager.ensureProject(page, accountId, appProjectId, appProjectId, `worker_${accountId}`);

      if (!projectResult.success || !projectResult.record) {
        tracer.completeAction(actProject, 'FAILED', projectResult.error);
        throw new Error(projectResult.error || 'Failed to ensure Google Flow project workspace');
      }

      lockedProjectId = projectResult.record.flowProjectId;
      tracer.completeAction(actProject, 'SUCCESS', projectResult.record.flowProjectName);
      if (onProgress) onProgress(30, `Connected to Flow project workspace: ${projectResult.record.flowProjectName}`);

      // 3. Stage: LOCATING & VERIFYING GENERATION WORKSPACE (35%)
      if (onProgress) onProgress(35, 'Verifying generation workspace and locating composer...');
      const actComposer = tracer.recordAction('LOCATE_COMPOSER', 'VERIFY_WORKSPACE', 'Locate and verify prompt composer container on canvas');
      
      const workspaceRes = await GenerationWorkspaceResolver.findGenerationWorkspace(page, options.type || 'VIDEO', {
        timeoutMs: 15000,
        allowRecovery: true,
        accountId,
        tracer
      });

      if (!workspaceRes.found || workspaceRes.isWrongRoute || workspaceRes.confidence === 'NONE' || workspaceRes.confidence === 'LOW') {
        const errorCode: FlowErrorCode = workspaceRes.isWrongRoute ? 'FLOW_WRONG_ROUTE' : 'FLOW_WORKSPACE_NOT_READY';
        tracer.completeAction(actComposer, 'FAILED', workspaceRes.error || `Workspace verification failed (${workspaceRes.confidence})`);

        const diagErr = tracer.createDiagnosticError({
          code: errorCode,
          message: workspaceRes.error || `Generation workspace verification failed on ${page.url()}`,
          stage: 'LOCATE_COMPOSER',
          step: 'VERIFY_WORKSPACE',
          expected: { generationType: options.type || 'VIDEO' },
          actual: {
            currentRoute: workspaceRes.currentRoute,
            confidence: workspaceRes.confidence,
            missingControls: workspaceRes.missingControls
          },
          flowUrl: page.url()
        });

        await FlowProvider.captureFailureScreenshot(accountId, page, `workspace-failed-${jobId}`);
        FlowDiagnosticBundle.storeError(diagErr);
        try {
          FlowDiagnosticBundle.exportDebugBundle(diagErr.errorId);
        } catch {
          // Fallback if bundle export encounters FS permissions
        }

        return {
          success: false,
          error: diagErr.message,
          diagnosticError: diagErr
        };
      }

      const composer = await FlowComposerController.findComposer(page);
      if (!composer) {
        tracer.completeAction(actComposer, 'FAILED', 'Composer prompt field not found after workspace verification');
        throw new Error('Generation composer prompt field not found on project canvas');
      }
      tracer.completeAction(actComposer, 'SUCCESS', `Verified: ${workspaceRes.confidence} Confidence (${Math.round(workspaceRes.confidenceScore * 100)}%)`);

      // 4. Stage: DISCOVERING CAPABILITIES (40%)
      if (onProgress) onProgress(40, `Discovering live Google Flow capabilities for ${typeLabel} mode...`);
      const actCap = tracer.recordAction('DISCOVER_CAPABILITIES', 'INSPECT_CAPABILITIES', `Discover live capabilities for ${typeLabel}`);
      const snapshot = await FlowUIInspector.buildCapabilitySnapshot(page, accountId, typeLabel);
      lastKnownSnapshot = snapshot;
      tracer.completeAction(actCap, 'SUCCESS', `Models: [${snapshot.models.map((m) => m.displayName).join(', ')}]`);
      Logger.info(this.providerName, `[CAPABILITY SNAPSHOT] Discovered live capabilities for ${accountId}: Models=[${snapshot.models.map((m) => m.displayName).join(', ')}]`, accountId);

      // 5. Stage: SELECTING_MODE & SETTINGS (48%)
      if (onProgress) onProgress(48, `Applying exact generation settings (${typeLabel}, ${options.model || 'Auto'}, ${options.aspectRatio || '16:9'}, x${count})...`);
      const actSettings = tracer.recordAction('APPLY_SETTINGS', 'SELECT_CONTROLS', `Apply settings (${typeLabel}, ${options.model || 'Auto'}, ${options.aspectRatio || '16:9'}, x${count})`);
      await FlowComposerController.applySettings(page, {
        type: options.type || 'VIDEO',
        inputMode: options.inputMode || 'NONE',
        model: options.model || undefined,
        aspectRatio: options.aspectRatio || '16:9',
        duration: options.duration || 10,
        generationCount: count
      });
      tracer.completeAction(actSettings, 'SUCCESS');

      // 6. Stage: VERIFYING_SETTINGS (52%)
      if (onProgress) onProgress(52, 'Verifying active Flow state matches requested job settings...');
      const actVerifyState = tracer.recordAction('VERIFY_SETTINGS', 'ASSERT_STATE', 'Assert live composer state matches requested job');
      const composerState = await FlowComposerController.readActiveComposerState(page);
      lastKnownState = composerState;
      FlowComposerController.assertFlowStateMatchesJob(composerState, {
        generationType: options.type || 'VIDEO',
        model: options.model || undefined,
        aspectRatio: options.aspectRatio || '16:9',
        duration: options.duration || 10,
        generationCount: count
      });
      tracer.completeAction(actVerifyState, 'SUCCESS', `Verified: ${composerState.generationType} · ${composerState.activeModel || 'Auto'} · ${composerState.activeRatio || 'Default'}`);

      // 7. Stage: ENTERING_PROMPT & VERIFICATION (55%)
      if (onProgress) onProgress(55, 'Injecting prompt content into composer...');
      const actPrompt = tracer.recordAction('ENTER_PROMPT', 'INJECT_PROMPT', 'Inject prompt into composer input');
      await FlowComposerController.injectPrompt(page, prompt);
      tracer.completeAction(actPrompt, 'SUCCESS');

      if (onProgress) onProgress(57, 'Verifying prompt registration in live DOM...');
      const actVerifyPrompt = tracer.recordAction('VERIFY_PROMPT', 'CHECK_DOM_REGISTRATION', 'Verify prompt text registered in live DOM');
      const isPromptVerified = await FlowComposerController.verifyPrompt(page, prompt);
      if (!isPromptVerified) {
        Logger.warn(this.providerName, 'Prompt verification warning: re-injecting prompt');
        await FlowComposerController.injectPrompt(page, prompt);
      }
      tracer.completeAction(actVerifyPrompt, 'SUCCESS');

      // 8. Stage: READY_TO_SUBMIT (58%)
      if (onProgress) onProgress(58, 'Waiting for circular submit arrow button...');
      const actWaitSubmit = tracer.recordAction('READY_TO_SUBMIT', 'WAIT_FOR_SUBMIT_ENABLED', 'Wait for circular submit arrow enablement');
      await FlowComposerController.waitUntilSubmitEnabled(page, 10000);
      tracer.completeAction(actWaitSubmit, 'SUCCESS');

      // 9. Stage: SUBMITTING (60%)
      if (onProgress) onProgress(60, 'Capturing media inventory and submitting prompt...');
      const initialInventory = await FlowComposerController.getMediaAssetInventory(page);
      const actSubmit = tracer.recordAction('SUBMIT_PROMPT', 'CLICK_SUBMIT_BUTTON', 'Click circular right-arrow submit button');
      
      const submitBtn = await FlowComposerController.findSubmitButton(page);
      if (submitBtn) {
        await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
        await submitBtn.click();
        Logger.success(this.providerName, '[FLOW] Clicked circular submit arrow button');
      } else {
        await FlowComposerController.submitGeneration(page, prompt);
      }
      tracer.completeAction(actSubmit, 'SUCCESS');

      // 10. Stage: GENERATING (70%)
      if (onProgress) onProgress(70, 'Prompt submitted. Verifying generation start...');
      const actGen = tracer.recordAction('GENERATING', 'WAIT_FOR_START', 'Verify AI generation and diffusion start');
      await FlowGenerationMonitor.waitForGenerationStart(page, 10000);
      tracer.completeAction(actGen, 'SUCCESS');
      if (onProgress) onProgress(75, 'AI generation in progress. Rendering diffusion frames...');

      // 11. Stage: WAITING FOR RESULT (80%)
      const actWaitResult = tracer.recordAction('RESULT_DETECTION', 'WAIT_FOR_RESULT', 'Poll and detect newly created asset cards on canvas');
      const newAssets = await FlowComposerController.waitForGenerationResult(page, initialInventory, count, 180000, onProgress);

      if (!newAssets || newAssets.length === 0) {
        tracer.completeAction(actWaitResult, 'FAILED', 'No new asset detected within timeout');
        throw new Error('Generation finished but no newly created asset was detected on canvas');
      }
      tracer.completeAction(actWaitResult, 'SUCCESS', `Found ${newAssets.length} new asset(s)`);

      // 12. Stage: DOWNLOADING (85% - 95%)
      if (onProgress) onProgress(85, `Identified ${newAssets.length} output asset(s). Downloading media...`);
      const actDownload = tracer.recordAction('DOWNLOAD_RESULT', 'DOWNLOAD_FILES', 'Download and verify generated media files');
      const outputPaths: string[] = [];
      const baseWithoutExt = targetOutputPath.replace(/\.(mp4|png)$/i, '');
      const ext = isImage ? '.png' : '.mp4';

      for (let i = 0; i < newAssets.length; i++) {
        const targetPath = count === 1 ? `${baseWithoutExt}${ext}` : `${baseWithoutExt}_var${i + 1}${ext}`;
        const downloadedPath = await FlowComposerController.downloadAsset(page, newAssets[i], targetPath, options.downloadQuality || '720p');
        outputPaths.push(downloadedPath);
      }

      // 13. Stage: VERIFYING_DOWNLOAD (95%)
      if (onProgress) onProgress(95, 'Verifying file integrity on disk...');
      for (const p of outputPaths) {
        if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
          throw new Error(`Output file ${p} failed verification (missing or empty)`);
        }
      }
      tracer.completeAction(actDownload, 'SUCCESS', `Saved ${outputPaths.length} file(s)`);

      if (onProgress) onProgress(100, `Completed and verified ${outputPaths.length} downloaded file(s)`);

      return {
        success: true,
        outputPath: outputPaths[0],
        outputPaths
      };
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      let screenshotPath: string | undefined;

      try {
        if (!page.isClosed()) {
          const appData = PathSecurity.getUserDataDir();
          screenshotPath = path.join(appData, 'screenshots', `failure_${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
        }
      } catch {}

      // Infer appropriate machine code
      let code: FlowErrorCode = 'FLOW_CONFIGURATION_MISMATCH';
      if (errorMsg.includes('FLOW_MODE_MISMATCH')) code = 'FLOW_MODE_MISMATCH';
      else if (errorMsg.includes('FLOW_MODEL_MISMATCH')) code = 'FLOW_MODEL_MISMATCH';
      else if (errorMsg.includes('FLOW_ASPECT_RATIO_MISMATCH')) code = 'FLOW_ASPECT_RATIO_MISMATCH';
      else if (errorMsg.includes('FLOW_DURATION_MISMATCH')) code = 'FLOW_DURATION_MISMATCH';
      else if (errorMsg.includes('FLOW_COUNT_MISMATCH')) code = 'FLOW_COUNT_MISMATCH';
      else if (errorMsg.includes('FLOW_MODEL_OPTION_NOT_FOUND')) code = 'FLOW_MODEL_OPTION_NOT_FOUND';
      else if (errorMsg.includes('AMBIGUOUS')) code = 'FLOW_MODEL_AMBIGUOUS';
      else if (errorMsg.includes('prompt')) code = 'FLOW_PROMPT_INPUT_FAILED';
      else if (errorMsg.includes('submit')) code = 'FLOW_SUBMIT_CLICK_FAILED';
      else if (errorMsg.includes('timeout')) code = 'FLOW_GENERATION_TIMEOUT';
      else if (errorMsg.includes('asset')) code = 'FLOW_RESULT_NOT_FOUND';
      else if (errorMsg.includes('verification')) code = 'FLOW_FILE_INVALID';

      const diagnosticError = tracer.createDiagnosticError({
        code,
        message: errorMsg,
        expected: {
          generationType: options.type || 'VIDEO',
          model: options.model || (isImage ? 'Nano Banana 2' : 'Omni Flash'),
          aspectRatio: options.aspectRatio || '16:9',
          duration: options.duration || (isImage ? undefined : 10),
          generationCount: count,
          prompt
        },
        actual: {
          generationType: lastKnownState?.generationType || (isImage ? 'IMAGE' : 'VIDEO'),
          model: lastKnownState?.activeModel || (lastKnownSnapshot?.models?.[0]?.displayName),
          aspectRatio: lastKnownState?.activeRatio || (lastKnownSnapshot?.aspectRatios?.[0]?.displayName),
          duration: lastKnownState?.activeDuration,
          generationCount: lastKnownState?.activeCount || count,
          availableModels: lastKnownSnapshot?.models?.map((m: any) => m.displayName) || [],
          availableAspectRatios: lastKnownSnapshot?.aspectRatios?.map((r: any) => r.displayName) || [],
          availableDurations: lastKnownSnapshot?.durations?.map((d: any) => d.displayName) || [],
          availableCounts: lastKnownSnapshot?.generationCounts?.map((c: any) => c.displayName) || [],
          summaryText: lastKnownState?.summaryText
        },
        capabilitySnapshot: lastKnownSnapshot,
        screenshotPath,
        flowUrl: page.url()
      });

      FlowDiagnosticBundle.storeError(diagnosticError);

      Logger.error(this.providerName, `Pipeline error during Flow execution: ${errorMsg}`, accountId, null, {
        errorId: diagnosticError.errorId,
        likelyRootCause: diagnosticError.likelyRootCause,
        confidence: diagnosticError.confidence
      });

      return {
        success: false,
        error: errorMsg,
        diagnosticError
      };
    } finally {
      if (lockedProjectId) {
        FlowProjectManager.releaseProject(lockedProjectId);
      }
    }
  }
}
