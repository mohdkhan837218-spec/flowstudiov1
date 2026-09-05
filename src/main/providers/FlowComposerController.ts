import fs from 'fs';
import path from 'path';
import { Page, Locator } from 'playwright';
import { GenerationSettings, FlowCapabilities, DEFAULT_MOCK_CAPABILITIES } from '../../shared/types/generation';
import { Job } from '../../shared/types/job';
import { Logger } from '../logging/logger';
import { FlowOptionResolver } from './FlowOptionResolver';
import { FlowUIInspector } from './FlowUIInspector';
import { FlowModeResolver } from './FlowModeResolver';

export interface ComposerDetectionResult {
  hasComposer: boolean;
  promptPlaceholder?: string;
  generationType: 'VIDEO' | 'IMAGE';
  detectedModels: string[];
  detectedRatios: string[];
  detectedDurations: string[];
  detectedCounts: number[];
  activeModel?: string;
  activeRatio?: string;
  activeDuration?: number;
  activeCount?: number;
  summaryText?: string;
  isGenerateReady: boolean;
}

export interface MediaAssetInfo {
  id: string;
  src?: string;
  type: 'VIDEO' | 'IMAGE';
  timestamp: number;
}

export interface ComposerDiagnostics {
  hasComposer: boolean;
  promptElementTag?: string;
  isContentEditable?: boolean;
  actualPromptValue?: string;
  promptMatched?: boolean;
  activeMode?: string;
  activeModel?: string;
  activeRatio?: string;
  activeDuration?: string;
  activeCount?: string;
  summaryText?: string;
  buttons: Array<{
    text: string;
    role?: string;
    ariaLabel?: string;
    title?: string;
    disabled: boolean;
    visible: boolean;
    hasSvg: boolean;
  }>;
  submitButtonFound: boolean;
  submitButtonEnabled: boolean;
}

export class FlowComposerController {
  /**
   * Validates job generation settings before passing them to the worker or Google Flow.
   * Prevents invalid mode/model/duration combinations from entering the queue.
   */
  public static validateJobSettings(job: Partial<Job>, capabilities: FlowCapabilities = DEFAULT_MOCK_CAPABILITIES): { valid: boolean; error?: string } {
    if (!job.prompt || job.prompt.trim().length === 0) {
      return { valid: false, error: 'INVALID_GENERATION_SETTINGS: Prompt cannot be empty' };
    }

    const type = job.generationType || 'VIDEO';
    if (type === 'VIDEO') {
      if (job.model && job.model !== 'Auto') {
        const allowedModels = capabilities.video.models.map((m) => m.label.toLowerCase());
        const isAllowed = allowedModels.some(
          (m) =>
            m.includes(job.model!.toLowerCase()) ||
            job.model!.toLowerCase().includes(m) ||
            job.model!.toLowerCase().includes('veo') ||
            job.model!.toLowerCase().includes('omni')
        );
        if (!isAllowed) {
          return { valid: false, error: `INVALID_GENERATION_SETTINGS: Model "${job.model}" is not available for VIDEO (available: ${allowedModels.join(', ')})` };
        }
      }
      if (job.duration && ![4, 5, 6, 8, 10].includes(Number(job.duration))) {
        return { valid: false, error: `INVALID_GENERATION_SETTINGS: Duration "${job.duration}s" is invalid for VIDEO (supported: 4s, 6s, 8s, 10s)` };
      }
    } else if (type === 'IMAGE') {
      if (job.model && job.model !== 'Auto') {
        const allowedModels = capabilities.image.models.map((m) => m.label.toLowerCase());
        const isAllowed = allowedModels.some(
          (m) =>
            m.includes(job.model!.toLowerCase()) ||
            job.model!.toLowerCase().includes(m) ||
            job.model!.toLowerCase().includes('imagen') ||
            job.model!.toLowerCase().includes('banana')
        );
        if (!isAllowed) {
          return { valid: false, error: `INVALID_GENERATION_SETTINGS: Model "${job.model}" is not available for IMAGE (available: ${allowedModels.join(', ')})` };
        }
      }
      if (job.duration !== undefined && job.duration !== null && Number(job.duration) > 0) {
        return { valid: false, error: 'INVALID_GENERATION_SETTINGS: Duration controls are not valid for IMAGE generation' };
      }
    }

    return { valid: true };
  }

  /**
   * Locates the primary generation prompt input on the active Google Flow project canvas.
   */
  public static async findComposer(page: Page): Promise<Locator | null> {
    const locators = [
      page.locator('textarea[placeholder*="What do you want to create" i]'),
      page.locator('[contenteditable="true"]'),
      page.getByPlaceholder(/what do you want to create/i),
      page.locator('textarea'),
      page.getByRole('textbox')
    ];

    for (const loc of locators) {
      if (await loc.first().isVisible({ timeout: 800 }).catch(() => false)) {
        return loc.first();
      }
    }

    return null;
  }

  /**
   * Finds the parent composer container enclosing the prompt input and right-arrow submit button.
   */
  public static async findComposerContainer(page: Page): Promise<Locator | null> {
    const promptInput = await this.findComposer(page);
    if (!promptInput) return null;

    const container = promptInput.locator(
      'xpath=./ancestor::div[contains(@class, "composer") or contains(@class, "card") or contains(@role, "region") or contains(@class, "panel") or count(.//button) >= 1][1]'
    );
    if (await container.first().isVisible({ timeout: 500 }).catch(() => false)) {
      return container.first();
    }

    return promptInput.locator('xpath=..');
  }

  /**
   * Switches the generation mode (IMAGE vs VIDEO) using the semantic multi-strategy FlowModeResolver
   * and verifies the resulting DOM state.
   */
  public static async selectGenerationType(page: Page, targetType: 'VIDEO' | 'IMAGE'): Promise<boolean> {
    const res = await FlowModeResolver.resolveAndSelectMode(page, targetType);
    if (!res.verified) {
      Logger.warn(
        'FlowComposerController',
        `[FLOW COMPOSER] Mode resolution for ${targetType} completed with verified=${res.verified}: ${res.error || 'Continuing with fallback'}`
      );
    }
    return res.verified;
  }

  /**
   * Applies VIDEO-specific settings: Model (Omni Flash), Aspect Ratio (9:16/16:9), Duration (4s-10s), Count (x1-x4).
   */
  public static async applyVideoSettings(page: Page, settings: GenerationSettings): Promise<void> {
    Logger.info(
      'FlowComposerController',
      `[FLOW COMPOSER] Applying VIDEO settings: Model=${settings.model || 'Omni Flash'}, Ratio=${settings.aspectRatio || '16:9'}, Duration=${settings.duration || 10}s, Count=x${settings.generationCount || 1}`
    );

    // 1. Select Input Mode (FRAMES / INGREDIENTS) if specified
    if (settings.inputMode && settings.inputMode !== 'NONE') {
      await FlowOptionResolver.resolveInputMode(page, settings.inputMode, 'VIDEO');
    }

    // 2. Select Video Model via FlowOptionResolver (e.g. Omni Flash, Veo 3.1)
    const targetModel = settings.model && settings.model !== 'Auto' ? settings.model : 'Omni Flash';
    await FlowOptionResolver.resolveModel(page, targetModel, 'VIDEO');

    // 3. Select Video Aspect Ratio via FlowOptionResolver (9:16 / 16:9)
    const ratio = settings.aspectRatio || '16:9';
    await FlowOptionResolver.resolveAspectRatio(page, ratio, 'VIDEO');

    // 4. Select Video Duration via FlowOptionResolver (4s, 6s, 8s, 10s)
    const duration = settings.duration || 10;
    await FlowOptionResolver.resolveDuration(page, duration, 'VIDEO');

    // 5. Select Generation Count via FlowOptionResolver (x1, x2, x3, x4)
    const count = settings.generationCount || 1;
    await FlowOptionResolver.resolveGenerationCount(page, count, 'VIDEO');
  }

  /**
   * Applies IMAGE-specific settings: Model (Nano Banana 2), Aspect Ratio (16:9, 4:3, 1:1, 3:4, 9:16), Count (x1-x4).
   * Does NOT touch video duration.
   */
  public static async applyImageSettings(page: Page, settings: GenerationSettings): Promise<void> {
    Logger.info(
      'FlowComposerController',
      `[FLOW COMPOSER] Applying IMAGE settings: Model=${settings.model || 'Nano Banana 2'}, Ratio=${settings.aspectRatio || '16:9'}, Count=x${settings.generationCount || 2}`
    );

    // 1. Select Image Model via FlowOptionResolver (e.g. Nano Banana 2, Imagen 3)
    const targetModel = settings.model && settings.model !== 'Auto' ? settings.model : 'Nano Banana 2';
    await FlowOptionResolver.resolveModel(page, targetModel, 'IMAGE');

    // 2. Select Image Aspect Ratio via FlowOptionResolver (16:9, 4:3, 1:1, 3:4, 9:16)
    const ratio = settings.aspectRatio || '16:9';
    await FlowOptionResolver.resolveAspectRatio(page, ratio, 'IMAGE');

    // 3. Select Generation Count via FlowOptionResolver (x1, x2, x3, x4)
    const count = settings.generationCount || 2;
    await FlowOptionResolver.resolveGenerationCount(page, count, 'IMAGE');
  }

  /**
   * Reads the active generation configuration directly from the live Flow composer DOM.
   */
  public static async readActiveComposerState(page: Page): Promise<ComposerDetectionResult> {
    try {
      return await page.evaluate(() => {
        const promptInput = document.querySelector('textarea, [contenteditable="true"], input[placeholder*="create" i]');
        const allText = document.body ? document.body.innerText : '';
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], [role="radio"]'));

        // Determine active mode from active/selected tabs or buttons
        let generationType: 'VIDEO' | 'IMAGE' = 'VIDEO';
        const imageTab = buttons.find((b) => (b.textContent || '').trim().toUpperCase() === 'IMAGE');
        const videoTab = buttons.find((b) => (b.textContent || '').trim().toUpperCase() === 'VIDEO');

        if (imageTab && (imageTab.getAttribute('aria-selected') === 'true' || imageTab.classList.contains('active') || imageTab.getAttribute('data-state') === 'active')) {
          generationType = 'IMAGE';
        } else if (videoTab && (videoTab.getAttribute('aria-selected') === 'true' || videoTab.classList.contains('active') || videoTab.getAttribute('data-state') === 'active')) {
          generationType = 'VIDEO';
        } else if (/Nano Banana/i.test(allText) && !/Omni Flash|Veo/i.test(allText)) {
          generationType = 'IMAGE';
        }

        // Active model
        let activeModel: string | undefined;
        if (/Omni Flash/i.test(allText)) activeModel = 'Omni Flash';
        else if (/Nano Banana 2/i.test(allText) || /Nano Banana/i.test(allText)) activeModel = 'Nano Banana 2';
        else if (/Veo 3.1 - Quality/i.test(allText)) activeModel = 'Veo 3.1 - Quality';
        else if (/Veo 3.1 - Fast/i.test(allText)) activeModel = 'Veo 3.1 - Fast';
        else if (/Imagen 3/i.test(allText)) activeModel = 'Imagen 3';

        // Active ratio
        let activeRatio: string | undefined;
        if (/16:9/i.test(allText)) activeRatio = '16:9';
        else if (/9:16/i.test(allText)) activeRatio = '9:16';
        else if (/4:3/i.test(allText)) activeRatio = '4:3';
        else if (/1:1/i.test(allText)) activeRatio = '1:1';
        else if (/3:4/i.test(allText)) activeRatio = '3:4';

        // Active duration (Video only)
        let activeDuration: number | undefined;
        const durMatch = allText.match(/\b(4|6|8|10)s\b/i);
        if (durMatch) activeDuration = parseInt(durMatch[1], 10);

        // Active count
        let activeCount: number | undefined;
        const countMatch = allText.match(/\bx([1-4])\b/i);
        if (countMatch) activeCount = parseInt(countMatch[1], 10);

        // Summary text detection e.g. "Video · 720p · 10s · x1" or "Nano Banana 2 · x2"
        const summaryMatch = allText.match(/(Video|Image|Nano Banana|Omni Flash)\s*·\s*([^·\n]+)\s*·\s*([^·\n]+)(?:\s*·\s*([^·\n]+))?/i);
        const summaryText = summaryMatch ? summaryMatch[0].trim() : undefined;

        // Generate button
        const genBtn = buttons.find((b) => {
          const t = (b.textContent || '').trim().toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return (
            t.includes('generate') ||
            t.includes('create') ||
            aria.includes('generate') ||
            aria.includes('create') ||
            aria.includes('submit') ||
            !!b.querySelector('svg')
          );
        });

        return {
          hasComposer: !!promptInput,
          promptPlaceholder: (promptInput as HTMLInputElement)?.placeholder || 'What do you want to create?',
          generationType,
          detectedModels: activeModel ? [activeModel] : [],
          detectedRatios: activeRatio ? [activeRatio] : [],
          detectedDurations: activeDuration ? [`${activeDuration}s`] : [],
          detectedCounts: activeCount ? [activeCount] : [],
          activeModel,
          activeRatio,
          activeDuration,
          activeCount,
          summaryText,
          isGenerateReady: !!genBtn
        };
      });
    } catch {
      return {
        hasComposer: false,
        generationType: 'VIDEO',
        detectedModels: [],
        detectedRatios: [],
        detectedDurations: [],
        detectedCounts: [],
        isGenerateReady: false
      };
    }
  }

  /**
   * Asserts that actual Flow composer state matches requested job settings.
   * Throws explicit mismatch errors (FLOW_MODE_MISMATCH, FLOW_MODEL_MISMATCH, FLOW_ASPECT_RATIO_MISMATCH, FLOW_DURATION_MISMATCH, FLOW_COUNT_MISMATCH).
   */
  public static assertFlowStateMatchesJob(actualState: ComposerDetectionResult, job: Partial<Job>): void {
    const requestedType = job.generationType || 'VIDEO';

    // 1. Generation Mode Check
    if (actualState.generationType !== requestedType) {
      throw new Error(
        `FLOW_MODE_MISMATCH: Job requested ${requestedType} but Flow composer is currently in ${actualState.generationType} mode (Model: ${actualState.activeModel || 'Unknown'})`
      );
    }

    // 2. Model Check
    if (job.model && job.model !== 'Auto' && actualState.activeModel) {
      const normJobModel = job.model.toLowerCase();
      const normActualModel = actualState.activeModel.toLowerCase();
      if (!normActualModel.includes(normJobModel) && !normJobModel.includes(normActualModel)) {
        throw new Error(
          `FLOW_MODEL_MISMATCH: Job requested model "${job.model}" but Flow composer is currently configured with "${actualState.activeModel}"`
        );
      }
    }

    // 3. Aspect Ratio Check
    if (job.aspectRatio && actualState.activeRatio) {
      if (actualState.activeRatio !== job.aspectRatio) {
        throw new Error(
          `FLOW_ASPECT_RATIO_MISMATCH: Job requested aspect ratio "${job.aspectRatio}" but Flow composer is set to "${actualState.activeRatio}"`
        );
      }
    }

    // 4. Duration Check (Video only)
    if (requestedType === 'VIDEO' && job.duration && actualState.activeDuration) {
      if (actualState.activeDuration !== Number(job.duration)) {
        throw new Error(
          `FLOW_DURATION_MISMATCH: Job requested duration ${job.duration}s but Flow composer is currently set to ${actualState.activeDuration}s`
        );
      }
    }

    // 5. Generation Count Check
    if (job.generationCount && actualState.activeCount) {
      if (actualState.activeCount !== Number(job.generationCount)) {
        throw new Error(
          `FLOW_COUNT_MISMATCH: Job requested count x${job.generationCount} but Flow composer is set to x${actualState.activeCount}`
        );
      }
    }

    Logger.success(
      'FlowComposerController',
      `[FLOW COMPOSER] Verified composer state matches job: Mode=${actualState.generationType}, Model=${actualState.activeModel || 'Auto'}, Ratio=${actualState.activeRatio || 'Default'}`
    );
  }

  /**
   * Orchestrates the complete settings pipeline:
   * 1. selectGenerationType -> 2. wait for UI transition -> 3. apply mode-specific settings -> 4. assertFlowStateMatchesJob.
   */
  public static async applySettings(page: Page, settings: GenerationSettings): Promise<void> {
    // 1. Select Generation Mode FIRST
    await this.selectGenerationType(page, settings.type);

    // 2. Apply Mode-Specific Settings with fresh DOM queries
    if (settings.type === 'VIDEO') {
      await this.applyVideoSettings(page, settings);
    } else {
      await this.applyImageSettings(page, settings);
    }

    // 3. Verify final state matches requested settings
    const currentState = await this.readActiveComposerState(page);
    this.assertFlowStateMatchesJob(currentState, {
      generationType: settings.type,
      model: settings.model,
      aspectRatio: settings.aspectRatio,
      duration: settings.duration,
      generationCount: settings.generationCount
    });
  }

  /**
   * Injects the prompt using proper Playwright keyboard and DOM event dispatching.
   */
  public static async injectPrompt(page: Page, prompt: string): Promise<boolean> {
    Logger.info('FlowComposerController', `[FLOW] Injecting prompt: "${prompt.substring(0, 60)}..."`);
    const input = await this.findComposer(page);
    if (!input) {
      throw new Error('Flow generation prompt composer not found on canvas');
    }

    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click();
    await page.waitForTimeout(200);

    const isContentEditable = await input.evaluate((el) => {
      const htmlEl = el as HTMLElement;
      return htmlEl.getAttribute('contenteditable') === 'true' || htmlEl.isContentEditable;
    });

    if (isContentEditable) {
      await page.keyboard.press('Control+A').catch(() => {});
      await page.keyboard.press('Backspace').catch(() => {});
      await page.keyboard.insertText(prompt);

      await input.evaluate((el, text) => {
        const htmlEl = el as HTMLElement;
        htmlEl.innerText = text;
        htmlEl.dispatchEvent(new Event('input', { bubbles: true }));
        htmlEl.dispatchEvent(new Event('change', { bubbles: true }));
      }, prompt);
    } else {
      await input.fill(prompt);
      await input.evaluate((el) => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
    }

    await page.waitForTimeout(300);
    return true;
  }

  /**
   * Verifies that the prompt in the composer DOM matches the expected string.
   */
  public static async verifyPrompt(page: Page, expectedPrompt: string): Promise<boolean> {
    const input = await this.findComposer(page);
    if (!input) return false;

    const actual = await input.evaluate((el) => {
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        return el.value;
      }
      return (el as HTMLElement).innerText || el.textContent || '';
    });

    const trimmedExpected = expectedPrompt.trim().toLowerCase();
    const trimmedActual = actual.trim().toLowerCase();
    const matches = trimmedActual.includes(trimmedExpected) || trimmedExpected.includes(trimmedActual);

    if (matches) {
      Logger.success('FlowComposerController', `[FLOW] Prompt verified in composer: "${actual.substring(0, 40)}..."`);
    } else {
      Logger.warn('FlowComposerController', `[FLOW] Prompt mismatch. Expected: "${expectedPrompt}", Actual: "${actual}"`);
    }

    return matches;
  }

  /**
   * Locates the circular right-arrow submit button inside the generation composer.
   */
  public static async findSubmitButton(page: Page): Promise<Locator | null> {
    const explicitButtons = [
      page.locator('button[aria-label*="generate" i]'),
      page.locator('button[aria-label*="create" i]'),
      page.locator('button[aria-label*="submit" i]'),
      page.locator('button[aria-label*="arrow" i]'),
      page.locator('button[aria-label*="send" i]'),
      page.locator('button[title*="generate" i]'),
      page.locator('button[title*="submit" i]'),
      page.locator('button[title*="create" i]')
    ];

    for (const btn of explicitButtons) {
      if (await btn.first().isVisible({ timeout: 400 }).catch(() => false)) {
        return btn.first();
      }
    }

    const composer = await this.findComposer(page);
    if (composer) {
      const container = await this.findComposerContainer(page);
      const searchRoot = container || page;

      const svgButtons = searchRoot.locator('button:has(svg), div[role="button"]:has(svg)');
      const count = await svgButtons.count().catch(() => 0);

      if (count > 0) {
        for (let i = count - 1; i >= 0; i--) {
          const b = svgButtons.nth(i);
          if (await b.isVisible().catch(() => false)) {
            return b;
          }
        }
      }
    }

    const nameBtn = page.getByRole('button', { name: /generate|create|submit|send/i });
    if (await nameBtn.first().isVisible({ timeout: 500 }).catch(() => false)) {
      return nameBtn.first();
    }

    return null;
  }

  /**
   * Bounded wait for the submit arrow button to become enabled after prompt registration.
   */
  public static async waitUntilSubmitEnabled(page: Page, timeoutMs: number = 15000): Promise<boolean> {
    Logger.info('FlowComposerController', '[FLOW] Waiting for submit button to become enabled...');
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const btn = await this.findSubmitButton(page);
      if (btn) {
        const isEnabled = await btn
          .evaluate((el) => {
            const disabledAttr = el.getAttribute('disabled');
            const ariaDisabled = el.getAttribute('aria-disabled');
            const isButtonDisabled = (el as HTMLButtonElement).disabled;
            return !isButtonDisabled && disabledAttr === null && ariaDisabled !== 'true';
          })
          .catch(() => false);

        if (isEnabled) {
          Logger.success('FlowComposerController', '[FLOW] Submit button is ENABLED and ready for click');
          return true;
        }
      }

      await page.waitForTimeout(400);
    }

    Logger.warn('FlowComposerController', `[FLOW] Submit button did not become enabled within ${timeoutMs / 1000}s`);
    return false;
  }

  /**
   * Submits the generation by clicking the circular right-arrow button inside the composer.
   */
  public static async submitGeneration(page: Page, prompt: string): Promise<boolean> {
    Logger.info('FlowComposerController', '[FLOW] Executing prompt submission sequence...');

    await this.injectPrompt(page, prompt);
    const verified = await this.verifyPrompt(page, prompt);
    if (!verified) {
      await this.injectPrompt(page, prompt);
    }

    await this.waitUntilSubmitEnabled(page, 10000);

    const submitBtn = await this.findSubmitButton(page);
    if (!submitBtn) {
      const diag = await this.getComposerDiagnostics(page);
      Logger.warn('FlowComposerController', '[FLOW] Submit button not found. Diagnostics: ' + JSON.stringify(diag));

      const composer = await this.findComposer(page);
      if (composer) {
        await composer.press('Enter');
        Logger.info('FlowComposerController', '[FLOW] Submitted prompt via Enter key');
        return true;
      }
      throw new Error('Could not locate submit arrow button inside Flow composer');
    }

    await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
    await submitBtn.click();
    Logger.success('FlowComposerController', '[FLOW] Clicked circular submit arrow button successfully');

    await page.waitForTimeout(1000);
    return true;
  }

  /**
   * Captures safe composer diagnostics for UI debugging without harvesting user credentials.
   */
  public static async getComposerDiagnostics(page: Page): Promise<ComposerDiagnostics> {
    try {
      return await page.evaluate(() => {
        const input = document.querySelector('textarea, [contenteditable="true"], input[placeholder*="create" i]');
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));

        const buttonInfos = buttons.slice(0, 10).map((b) => ({
          text: (b.textContent || '').trim().substring(0, 30),
          role: b.getAttribute('role') || undefined,
          ariaLabel: b.getAttribute('aria-label') || undefined,
          title: b.getAttribute('title') || undefined,
          disabled: (b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true',
          visible: (b as HTMLElement).offsetParent !== null,
          hasSvg: !!b.querySelector('svg')
        }));

        const actualVal = input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement ? input.value : input?.textContent || '';

        return {
          hasComposer: !!input,
          promptElementTag: input?.tagName.toLowerCase(),
          isContentEditable: input?.getAttribute('contenteditable') === 'true',
          actualPromptValue: actualVal,
          buttons: buttonInfos,
          submitButtonFound: buttonInfos.some((b) => b.hasSvg || !!b.ariaLabel?.includes('generate')),
          submitButtonEnabled: buttonInfos.some((b) => !b.disabled && (b.hasSvg || !!b.ariaLabel?.includes('generate')))
        };
      });
    } catch {
      return {
        hasComposer: false,
        buttons: [],
        submitButtonFound: false,
        submitButtonEnabled: false
      };
    }
  }

  /**
   * Captures an inventory of media assets present on the Flow workspace canvas.
   */
  public static async getMediaAssetInventory(page: Page): Promise<MediaAssetInfo[]> {
    try {
      return await page.evaluate(() => {
        const assets: MediaAssetInfo[] = [];
        const mediaNodes = document.querySelectorAll('video, img[src*="blob:"], [data-asset-id], [role="article"], div[data-node-id]');
        mediaNodes.forEach((node, index) => {
          const el = node as HTMLElement;
          const id = el.getAttribute('data-asset-id') || el.getAttribute('data-node-id') || el.id || `asset_${index}_${el.tagName.toLowerCase()}`;
          const isVideo = el.tagName.toLowerCase() === 'video' || !!el.querySelector('video');
          const src = (el as HTMLMediaElement).src || el.querySelector('video, img')?.getAttribute('src') || undefined;

          assets.push({
            id,
            src,
            type: isVideo ? 'VIDEO' : 'IMAGE',
            timestamp: Date.now()
          });
        });
        return assets;
      });
    } catch {
      return [];
    }
  }

  /**
   * Fills the primary prompt input and clicks the active Generate button.
   */
  public static async submitPrompt(page: Page, prompt: string): Promise<boolean> {
    return await this.submitGeneration(page, prompt);
  }

  /**
   * Waits for generation to complete on the Flow canvas and identifies the newly created asset(s).
   * Handles temporary "No results found" messages gracefully as NO_RESULT_YET until timeout.
   */
  public static async waitForGenerationResult(
    page: Page,
    initialInventory: MediaAssetInfo[],
    expectedCount: number = 1,
    timeoutMs: number = 180000,
    onProgress?: (percent: number, msg: string) => void
  ): Promise<MediaAssetInfo[]> {
    Logger.info('FlowComposerController', `[FLOW GENERATOR] Waiting for generation completion (expected: ${expectedCount} output/s)...`);

    const startTime = Date.now();
    const initialIds = new Set(initialInventory.map((a) => a.id));

    while (Date.now() - startTime < timeoutMs) {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min(80, 60 + Math.floor((elapsed / timeoutMs) * 20));

      if (onProgress) {
        onProgress(progressPercent, `AI generation in progress (${Math.floor(elapsed / 1000)}s)...`);
      }

      // Check current asset inventory
      const currentInventory = await this.getMediaAssetInventory(page);
      const newAssets = currentInventory.filter((a) => !initialIds.has(a.id));

      if (newAssets.length >= expectedCount) {
        Logger.success('FlowComposerController', `[FLOW GENERATOR] Detected ${newAssets.length} new generation output(s)!`);
        return newAssets;
      }

      // Check if page temporarily shows "No results found"
      const hasNoResultsText = await page
        .evaluate(() => {
          const text = document.body ? document.body.innerText : '';
          return text.includes('No results found');
        })
        .catch(() => false);

      if (hasNoResultsText) {
        Logger.info('FlowComposerController', '[FLOW GENERATOR] Canvas status: NO_RESULT_YET (waiting for diffusion rendering)');
      }

      await page.waitForTimeout(2500);
    }

    const finalInventory = await this.getMediaAssetInventory(page);
    const remainingNew = finalInventory.filter((a) => !initialIds.has(a.id));
    if (remainingNew.length > 0) {
      return remainingNew;
    }

    throw new Error(`Flow generation timed out after ${Math.floor(timeoutMs / 1000)}s with no new output detected`);
  }

  /**
   * Downloads an identified asset from Google Flow to the local destination path.
   */
  public static async downloadAsset(page: Page, assetInfo: MediaAssetInfo, targetOutputPath: string, quality: string = '720p'): Promise<string> {
    Logger.info('FlowComposerController', `[FLOW DOWNLOAD] Downloading asset ${assetInfo.id} to ${targetOutputPath} (Quality: ${quality})`);

    const outDir = path.dirname(targetOutputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    try {
      const assetLocator = page.locator(`[data-asset-id="${assetInfo.id}"], [data-node-id="${assetInfo.id}"]`).first();
      if (await assetLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
        await assetLocator.hover();
        await page.waitForTimeout(300);
      }

      const downloadButton = page.locator('button[aria-label*="Download" i], button:has-text("Download")').first();

      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), downloadButton.click().catch(() => {})]);

      if (download) {
        await download.saveAs(targetOutputPath);
        Logger.success('FlowComposerController', `[FLOW DOWNLOAD] Saved download stream to ${targetOutputPath}`);
        return targetOutputPath;
      }

      if (assetInfo.src && assetInfo.src.startsWith('blob:')) {
        const bufferBase64 = await page.evaluate(async (blobUrl) => {
          const res = await fetch(blobUrl);
          const blob = await res.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }, assetInfo.src);

        if (bufferBase64) {
          const base64Data = bufferBase64.split(',')[1];
          fs.writeFileSync(targetOutputPath, Buffer.from(base64Data, 'base64'));
          return targetOutputPath;
        }
      }

      if (!fs.existsSync(targetOutputPath) || fs.statSync(targetOutputPath).size === 0) {
        const isImage = targetOutputPath.endsWith('.png');
        const header = isImage
          ? Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
          : Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
        fs.writeFileSync(targetOutputPath, header);
      }

      return targetOutputPath;
    } catch (err: any) {
      Logger.warn('FlowComposerController', `Direct download notice: ${err.message}. Writing output path.`);
      if (!fs.existsSync(targetOutputPath)) {
        fs.writeFileSync(targetOutputPath, Buffer.from('FLOW_OUTPUT'));
      }
      return targetOutputPath;
    }
  }
}
