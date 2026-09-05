import { Page } from 'playwright';
import { Logger } from '../logging/logger';
import { FlowActionTracer } from '../diagnostics/FlowActionTracer';

export interface VerifiedWorkspaceResult {
  found: boolean;
  isWrongRoute: boolean;
  currentRoute: string;
  expectedRoute: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  confidenceScore: number;
  evidence: string[];
  missingControls?: string[];
  composer?: {
    hasPrompt: boolean;
    hasModeSwitch: boolean;
    hasModelSelector: boolean;
    hasSubmitButton: boolean;
  };
  error?: string;
}

export class GenerationWorkspaceResolver {
  /**
   * Evaluates whether the current URL represents an unintended sub-route
   * (e.g. /project/{id}/characters).
   */
  public static isWrongRoute(url: string): { isWrong: boolean; subRoute?: string } {
    if (!url) return { isWrong: false };
    const lower = url.toLowerCase().split('?')[0].split('#')[0];
    const projectSubRouteMatch = lower.match(/\/project\/[^/]+\/(characters|scenes|tools|videos)(\/.*)?$/i);
    if (projectSubRouteMatch && projectSubRouteMatch[1]) {
      return { isWrong: true, subRoute: `/${projectSubRouteMatch[1]}` };
    }
    return { isWrong: false };
  }

  /**
   * Discovers, verifies, and returns the genuine Google Flow Generation Workspace.
   * Enforces strict route verification, element intent, and confidence scoring.
   */
  public static async findGenerationWorkspace(
    page: Page,
    requestedType: 'VIDEO' | 'IMAGE' = 'VIDEO',
    options?: {
      timeoutMs?: number;
      allowRecovery?: boolean;
      accountId?: string;
      tracer?: FlowActionTracer;
    }
  ): Promise<VerifiedWorkspaceResult> {
    const timeout = options?.timeoutMs || 15000;
    const allowRecovery = options?.allowRecovery !== false;
    const accountId = options?.accountId;
    const tracer = options?.tracer;

    const evidence: string[] = [];
    const missingControls: string[] = [];
    let currentUrl = page.url() || '';
    const routeCheck = this.isWrongRoute(currentUrl);

    Logger.info(
      'GenerationWorkspaceResolver',
      `[WORKSPACE RESOLVER] Inspecting live workspace for ${requestedType} generation (URL: ${currentUrl})`,
      accountId
    );

    // 1. Check for Wrong Route (e.g. /characters)
    if (routeCheck.isWrong) {
      evidence.push(`Detected unintended sub-route: ${routeCheck.subRoute}`);
      Logger.warn(
        'GenerationWorkspaceResolver',
        `[FLOW_WRONG_ROUTE] Current URL (${currentUrl}) ends with ${routeCheck.subRoute}. Generation workspace required.`,
        accountId
      );

      if (allowRecovery) {
        Logger.info(
          'GenerationWorkspaceResolver',
          `[RECOVERY] Initiating automatic recovery to Generation Workspace...`,
          accountId
        );
        const recoverySuccess = await this.returnToGenerationWorkspace(page, accountId, tracer);
        currentUrl = page.url() || '';

        if (!recoverySuccess) {
          return {
            found: false,
            isWrongRoute: true,
            currentRoute: routeCheck.subRoute || currentUrl,
            expectedRoute: 'PROJECT_GENERATION_WORKSPACE',
            confidence: 'NONE',
            confidenceScore: 0,
            evidence: [
              `Current URL ended with ${routeCheck.subRoute}`,
              'Recovery to Generation Workspace failed via live UI discovery'
            ],
            error: `Google Flow is on incorrect sub-route (${routeCheck.subRoute}) and could not automatically return to Generation Workspace`
          };
        }
        evidence.push(`Successfully recovered from ${routeCheck.subRoute} to Generation Workspace (${currentUrl})`);
      } else {
        return {
          found: false,
          isWrongRoute: true,
          currentRoute: routeCheck.subRoute || currentUrl,
          expectedRoute: 'PROJECT_GENERATION_WORKSPACE',
          confidence: 'NONE',
          confidenceScore: 0,
          evidence,
          error: `Current URL ends with incorrect route: ${routeCheck.subRoute}`
        };
      }
    }

    // 2. Deep DOM Inspection of Generation Workspace Controls
    const startTime = Date.now();
    let controls = await this.inspectGenerationControls(page);

    while (Date.now() - startTime < timeout && (!controls.hasPrompt || !controls.hasSubmitButton)) {
      await page.waitForTimeout(600);
      controls = await this.inspectGenerationControls(page);
    }

    // 3. Compute Honest Confidence Score
    let score = 0;
    if (controls.hasPrompt) {
      score += 40;
      evidence.push('Prompt input field detected on active canvas');
    } else {
      missingControls.push('PROMPT_INPUT');
    }

    if (controls.hasModeSwitch) {
      score += 20;
      evidence.push('Generation type switch (VIDEO / IMAGE) detected');
    } else {
      missingControls.push('GENERATION_MODE_SWITCH');
    }

    if (controls.hasModelSelector) {
      score += 20;
      evidence.push('Model configuration control detected');
    } else {
      missingControls.push('MODEL_SELECTOR');
    }

    if (controls.hasSubmitButton) {
      score += 20;
      evidence.push('Circular submit arrow button detected');
    } else {
      missingControls.push('SUBMIT_BUTTON');
    }

    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';
    if (score >= 80) confidence = 'HIGH';
    else if (score >= 40) confidence = 'MEDIUM';
    else if (score > 0) confidence = 'LOW';

    const isFound = confidence === 'HIGH' || (confidence === 'MEDIUM' && controls.hasPrompt);

    evidence.push(`Final Workspace Confidence Score: ${score}/100 (${confidence})`);

    Logger.info(
      'GenerationWorkspaceResolver',
      `[WORKSPACE RESOLVER] Verified Workspace: Found=${isFound} | Confidence=${confidence} (${score}/100) | Missing=[${missingControls.join(', ')}]`,
      accountId
    );

    return {
      found: isFound,
      isWrongRoute: false,
      currentRoute: currentUrl,
      expectedRoute: 'PROJECT_GENERATION_WORKSPACE',
      confidence,
      confidenceScore: score / 100,
      evidence,
      missingControls: missingControls.length > 0 ? missingControls : undefined,
      composer: controls,
      error: !isFound ? `Generation workspace controls incomplete (Missing: ${missingControls.join(', ')})` : undefined
    };
  }

  /**
   * Non-destructively probes the live DOM for key generation composer controls.
   */
  public static async inspectGenerationControls(page: Page): Promise<{
    hasPrompt: boolean;
    hasModeSwitch: boolean;
    hasModelSelector: boolean;
    hasSubmitButton: boolean;
  }> {
    try {
      return await page.evaluate(() => {
        // 1. Prompt input
        const promptEl = document.querySelector(
          'textarea, [contenteditable="true"], input[placeholder*="prompt" i], input[placeholder*="describe" i], [data-placeholder*="prompt" i]'
        );
        const hasPrompt = !!promptEl && (promptEl as HTMLElement).offsetParent !== null;

        // 2. Mode switch (VIDEO / IMAGE tabs or buttons)
        const allText = document.body ? document.body.innerText : '';
        const buttons = Array.from(document.querySelectorAll('button, [role="tab"], [role="radio"], [role="button"]'));
        const hasVideoBtn = buttons.some((b) => /video/i.test(b.textContent || b.getAttribute('aria-label') || ''));
        const hasImageBtn = buttons.some((b) => /image/i.test(b.textContent || b.getAttribute('aria-label') || ''));
        const hasModeSwitch = (hasVideoBtn && hasImageBtn) || /nano banana|omni flash|veo/i.test(allText);

        // 3. Model selector (dropdown chips or model names)
        const hasModelSelector = buttons.some((b) => {
          const t = (b.textContent || b.getAttribute('aria-label') || '').toLowerCase();
          return t.includes('omni') || t.includes('veo') || t.includes('banana') || t.includes('imagen') || t.includes('fast') || t.includes('quality');
        }) || !!document.querySelector('[aria-haspopup="listbox"], [role="combobox"], [data-testid*="model" i]');

        // 4. Submit arrow button
        const hasSubmitButton = buttons.some((b) => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const title = (b.getAttribute('title') || '').toLowerCase();
          const hasArrowSvg = !!b.querySelector('svg path[d*="arrow" i], svg path[d*="M5" i], svg path[d*="M12" i]');
          return (
            aria.includes('generate') ||
            aria.includes('submit') ||
            aria.includes('create') ||
            title.includes('generate') ||
            title.includes('submit') ||
            hasArrowSvg
          );
        });

        return {
          hasPrompt,
          hasModeSwitch,
          hasModelSelector,
          hasSubmitButton
        };
      });
    } catch {
      return {
        hasPrompt: false,
        hasModeSwitch: false,
        hasModelSelector: false,
        hasSubmitButton: false
      };
    }
  }

  /**
   * Recovers from an unintended sub-route (e.g. /characters) by inspecting live UI navigation
   * and clicking the All Media / Project Workspace entry point with verified semantic intent.
   */
  public static async returnToGenerationWorkspace(
    page: Page,
    accountId?: string,
    tracer?: FlowActionTracer
  ): Promise<boolean> {
    const actId = tracer?.recordAction(
      'NAVIGATION_RECOVERY',
      'RETURN_TO_GENERATION_WORKSPACE',
      'Navigate from sub-route to Project Generation Workspace'
    );

    Logger.info(
      'GenerationWorkspaceResolver',
      `[NAVIGATION RECOVERY] Searching for Project Workspace entry point in live DOM...`,
      accountId
    );

    try {
      let clicked = false;

      // Strategy 1: Look for "All Media", "Workspace", "Canvas", or "Project" navigation buttons/links
      const candidateLocators = [
        page.getByRole('tab', { name: /all media|workspace|canvas|media/i }),
        page.getByRole('link', { name: /all media|workspace|canvas|media/i }),
        page.getByRole('button', { name: /all media|workspace|canvas|media/i }),
        page.locator('button:has-text("All Media")'),
        page.locator('button:has-text("Workspace")'),
        page.locator('button:has-text("Canvas")'),
        page.locator('a:has-text("All Media")'),
        page.locator('a:has-text("Workspace")'),
        page.locator('[aria-label*="All media" i]'),
        page.locator('[aria-label*="Workspace" i]')
      ];

      for (const loc of candidateLocators) {
        if (await loc.first().isVisible({ timeout: 800 }).catch(() => false)) {
          Logger.info(
            'GenerationWorkspaceResolver',
            `[NAVIGATION RECOVERY] Found workspace entry point via accessible locator, clicking with intent...`,
            accountId
          );
          await loc.first().click();
          clicked = true;
          break;
        }
      }

      // Strategy 2: If inside /characters, clean URL to project root without reloading unauthenticated
      if (!clicked) {
        const currentUrl = page.url();
        const baseProjectUrlMatch = currentUrl.match(/^(https:\/\/[^/]+\/fx\/tools\/flow\/project\/[^/?#]+)/i);
        if (baseProjectUrlMatch && baseProjectUrlMatch[1]) {
          const targetUrl = baseProjectUrlMatch[1];
          Logger.info(
            'GenerationWorkspaceResolver',
            `[NAVIGATION RECOVERY] Navigating directly to base Project URL: ${targetUrl}`,
            accountId
          );
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          clicked = true;
        }
      }

      // Wait for page hydration
      await page.waitForTimeout(2000);

      // Verify post-recovery route
      const newUrl = page.url() || '';
      const routeCheck = this.isWrongRoute(newUrl);

      if (routeCheck.isWrong) {
        if (actId && tracer) {
          tracer.completeAction(actId, 'FAILED', `Still on wrong route: ${newUrl}`);
        }
        return false;
      }

      if (actId && tracer) {
        tracer.completeAction(actId, 'SUCCESS', `Recovered to: ${newUrl}`);
      }
      return true;
    } catch (err: any) {
      Logger.error('GenerationWorkspaceResolver', `Recovery failed: ${err.message}`, accountId);
      if (actId && tracer) {
        tracer.completeAction(actId, 'FAILED', err.message);
      }
      return false;
    }
  }
}
