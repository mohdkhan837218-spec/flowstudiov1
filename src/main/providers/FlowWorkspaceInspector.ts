import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';
import { FlowState } from '../../shared/types/account';
import { PathSecurity } from '../security/paths';
import { Logger } from '../logging/logger';

export interface FlowUISnapshot {
  accountId: string;
  timestamp: string;
  url: string;
  title: string;
  detectedState: FlowState;
  hasNewProjectButton: boolean;
  hasPromptInput: boolean;
  hasGenerateButton: boolean;
  buttons: Array<{ text: string; ariaLabel?: string; role?: string }>;
  inputs: Array<{ type: string; placeholder?: string; ariaLabel?: string }>;
  comboboxes: Array<{ text: string; ariaLabel?: string }>;
  tabs: Array<{ text: string; ariaLabel?: string }>;
  detectedControls: {
    generationModes: string[];
    models: string[];
    aspectRatios: string[];
    durations: string[];
  };
  screenshotPath?: string | null;
}

export class FlowWorkspaceInspector {
  /**
   * Performs deep, non-destructive DOM inspection of the currently loaded Flow page.
   * Collects UI metadata and control selectors without harvesting passwords or cookies.
   */
  public static async inspectPage(page: Page, accountId: string): Promise<FlowUISnapshot> {
    Logger.info('FlowWorkspaceInspector', `Inspecting Google Flow workspace DOM for account ${accountId}`, accountId);

    const now = new Date().toISOString();
    const timestampStr = now.replace(/[:.]/g, '-');

    try {
      const url = page.url();
      const title = await page.title();

      // Deep DOM evaluation
      const domData = await page.evaluate(() => {
        const buttons: Array<{ text: string; ariaLabel?: string; role?: string }> = [];
        const inputs: Array<{ type: string; placeholder?: string; ariaLabel?: string }> = [];
        const comboboxes: Array<{ text: string; ariaLabel?: string }> = [];
        const tabs: Array<{ text: string; ariaLabel?: string }> = [];

        // 1. Buttons & Action Elements
        document.querySelectorAll('button, [role="button"], a[role="button"]').forEach((el) => {
          const text = (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60);
          const ariaLabel = el.getAttribute('aria-label') || undefined;
          const role = el.getAttribute('role') || 'button';
          if (text || ariaLabel) {
            buttons.push({ text, ariaLabel, role });
          }
        });

        // 2. Inputs & Textareas & ContentEditables
        document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach((el) => {
          const type = (el as HTMLInputElement).type || el.tagName.toLowerCase();
          const placeholder = (el as HTMLInputElement).placeholder || undefined;
          const ariaLabel = el.getAttribute('aria-label') || undefined;
          inputs.push({ type, placeholder, ariaLabel });
        });

        // 3. Comboboxes & Selects & Menus
        document.querySelectorAll('[role="combobox"], select, [role="menu"], [aria-haspopup="listbox"]').forEach((el) => {
          const text = (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60);
          const ariaLabel = el.getAttribute('aria-label') || undefined;
          comboboxes.push({ text, ariaLabel });
        });

        // 4. Tabs
        document.querySelectorAll('[role="tab"], [role="radio"]').forEach((el) => {
          const text = (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60);
          const ariaLabel = el.getAttribute('aria-label') || undefined;
          tabs.push({ text, ariaLabel });
        });

        // 5. Control Discovery
        const allText = document.body ? document.body.innerText : '';
        const hasPrompt = !!document.querySelector('textarea, [contenteditable="true"], input[type="text"][placeholder*="prompt" i]');
        const hasNewProj = buttons.some((b) => /new project|create project|\+ project|\+ new/i.test(b.text || b.ariaLabel || '')) ||
          !!document.querySelector('[data-action*="new-project" i], [aria-label*="New project" i]');
        const hasGen = buttons.some((b) => /generate|create|render|run/i.test(b.text || b.ariaLabel || ''));

        const generationModes: string[] = [];
        if (/video/i.test(allText)) generationModes.push('VIDEO');
        if (/image/i.test(allText)) generationModes.push('IMAGE');

        const models: string[] = [];
        buttons.concat(comboboxes as any).forEach((b) => {
          const t = (b.text || b.ariaLabel || '').toLowerCase();
          if (t.includes('veo') || t.includes('imagen') || t.includes('fast') || t.includes('quality')) {
            models.push(b.text || b.ariaLabel || '');
          }
        });

        const aspectRatios: string[] = [];
        if (/16:9/.test(allText)) aspectRatios.push('16:9');
        if (/9:16/.test(allText)) aspectRatios.push('9:16');
        if (/1:1/.test(allText)) aspectRatios.push('1:1');
        if (/4:3/.test(allText)) aspectRatios.push('4:3');

        const durations: string[] = [];
        const durMatches = allText.match(/\b(\d+)\s*(s|sec|seconds?)\b/gi);
        if (durMatches) {
          durMatches.forEach((m) => durations.push(m.trim()));
        }

        return {
          buttons: buttons.slice(0, 30),
          inputs: inputs.slice(0, 15),
          comboboxes: comboboxes.slice(0, 15),
          tabs: tabs.slice(0, 15),
          hasPrompt,
          hasNewProj,
          hasGen,
          generationModes: Array.from(new Set(generationModes)),
          models: Array.from(new Set(models)),
          aspectRatios: Array.from(new Set(aspectRatios)),
          durations: Array.from(new Set(durations))
        };
      });

      // Determine Flow State
      let detectedState: FlowState = 'FLOW_HOME';
      if (url.includes('signin') || url.includes('ServiceLogin')) {
        detectedState = 'LOGIN_REQUIRED';
      } else if (url.includes('challenge') || url.includes('recaptcha')) {
        detectedState = 'MANUAL_ACTION_REQUIRED';
      } else if (domData.hasPrompt && domData.hasGen) {
        detectedState = 'NEW_PROJECT_READY';
      } else if (domData.hasPrompt) {
        detectedState = 'GENERATION_READY';
      } else if (domData.hasNewProj) {
        detectedState = 'FLOW_HOME';
      } else if (url.includes('labs.google') || url.includes('flow')) {
        detectedState = 'FLOW_HOME';
      }

      // Capture screenshot in development debug directory
      const debugDir = path.join(PathSecurity.getUserDataDir(), 'debug', 'flow');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }

      const screenshotFile = `new-project-${accountId}-${timestampStr}.png`;
      const screenshotPath = path.join(debugDir, screenshotFile);

      try {
        await page.screenshot({ path: screenshotPath, fullPage: false });
      } catch {
        // Screenshot fallback
      }

      const snapshot: FlowUISnapshot = {
        accountId,
        timestamp: now,
        url,
        title,
        detectedState,
        hasNewProjectButton: domData.hasNewProj,
        hasPromptInput: domData.hasPrompt,
        hasGenerateButton: domData.hasGen,
        buttons: domData.buttons,
        inputs: domData.inputs,
        comboboxes: domData.comboboxes,
        tabs: domData.tabs,
        detectedControls: {
          generationModes: domData.generationModes,
          models: domData.models,
          aspectRatios: domData.aspectRatios,
          durations: domData.durations
        },
        screenshotPath
      };

      // Save safe UI snapshot JSON
      const snapshotPath = path.join(debugDir, `flow-ui-snapshot-${accountId}.json`);
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

      Logger.info(
        'FlowWorkspaceInspector',
        `[INSPECTION SUCCESS] State: ${detectedState} | Has New Project: ${domData.hasNewProj} | Has Prompt: ${domData.hasPrompt} | Has Generate: ${domData.hasGen}`,
        accountId
      );

      return snapshot;
    } catch (err: any) {
      Logger.warn('FlowWorkspaceInspector', `Workspace inspection failed: ${err.message}`, accountId);
      return {
        accountId,
        timestamp: now,
        url: page.url() || '',
        title: '',
        detectedState: 'ERROR',
        hasNewProjectButton: false,
        hasPromptInput: false,
        hasGenerateButton: false,
        buttons: [],
        inputs: [],
        comboboxes: [],
        tabs: [],
        detectedControls: {
          generationModes: ['VIDEO', 'IMAGE'],
          models: [],
          aspectRatios: [],
          durations: []
        }
      };
    }
  }

  /**
   * Finds and clicks the "New Project" / "Create Project" control in Google Flow,
   * transitioning the page into NEW_PROJECT_READY workspace.
   */
  public static async openNewProject(page: Page, accountId: string): Promise<{ success: boolean; state: FlowState; error?: string }> {
    Logger.info('FlowWorkspaceInspector', `[FLOW] Navigating into New Project workspace for account ${accountId}`, accountId);

    try {
      // 1. First inspect if we are already inside a workspace with a prompt input
      const initialSnapshot = await this.inspectPage(page, accountId);
      if (initialSnapshot.hasPromptInput && (initialSnapshot.hasGenerateButton || initialSnapshot.detectedState === 'NEW_PROJECT_READY')) {
        Logger.info('FlowWorkspaceInspector', `[FLOW] Workspace already active with prompt and generation controls ready`, accountId);
        return { success: true, state: 'NEW_PROJECT_READY' };
      }

      Logger.info('FlowWorkspaceInspector', `[FLOW] Searching for New Project trigger on Flow home...`, accountId);

      // 2. Locate the New Project control using multi-strategy accessible locators
      let clicked = false;

      // Strategy A: Role button with accessible name
      const roleSelectors = [
        page.getByRole('button', { name: /new project/i }),
        page.getByRole('button', { name: /create project/i }),
        page.getByRole('button', { name: /create video/i }),
        page.getByRole('button', { name: /new/i, exact: true }),
        page.getByRole('link', { name: /new project/i })
      ];

      for (const locator of roleSelectors) {
        if (await locator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          Logger.info('FlowWorkspaceInspector', `[FLOW] Found New Project button via accessible role locator, clicking...`, accountId);
          await locator.first().click();
          clicked = true;
          break;
        }
      }

      // Strategy B: Visible text matching
      if (!clicked) {
        const textLocators = [
          page.locator('text="New project"'),
          page.locator('text="New Project"'),
          page.locator('text="Create Project"'),
          page.locator('text="+ New"'),
          page.locator('button:has-text("New")'),
          page.locator('[aria-label*="New project" i]'),
          page.locator('[aria-label*="Create" i]')
        ];

        for (const loc of textLocators) {
          if (await loc.first().isVisible({ timeout: 800 }).catch(() => false)) {
            Logger.info('FlowWorkspaceInspector', `[FLOW] Found New Project control via text/attribute selector, clicking...`, accountId);
            await loc.first().click();
            clicked = true;
            break;
          }
        }
      }

      // Strategy C: DOM evaluation click with strict sub-route protection
      if (!clicked) {
        clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
          const target = buttons.find((b) => {
            const t = (b.textContent || '').trim().toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const href = (b.getAttribute('href') || '').toLowerCase();

            // Exclude sub-routes
            if (
              t.includes('character') ||
              aria.includes('character') ||
              href.includes('character') ||
              t.includes('scene') ||
              aria.includes('scene') ||
              href.includes('scene') ||
              t.includes('tool') ||
              aria.includes('tool') ||
              href.includes('tool')
            ) {
              return false;
            }

            return (
              t.includes('new project') ||
              t.includes('create project') ||
              aria.includes('new project') ||
              aria.includes('create project') ||
              t === 'new' ||
              t === '+'
            );
          });

          if (target) {
            (target as HTMLElement).click();
            return true;
          }
          return false;
        });
      }

      if (!clicked) {
        Logger.warn('FlowWorkspaceInspector', `[FLOW] New Project control could not be automatically clicked on Flow Home`, accountId);
      }

      // 3. Wait for workspace to hydrate and transition
      await page.waitForTimeout(2000);

      // 4. Verify post-click state
      const postSnapshot = await this.inspectPage(page, accountId);
      Logger.info(
        'FlowWorkspaceInspector',
        `[FLOW] Post-New Project state: ${postSnapshot.detectedState} (Prompt: ${postSnapshot.hasPromptInput}, Generate: ${postSnapshot.hasGenerateButton})`,
        accountId
      );

      const isReady = postSnapshot.detectedState === 'NEW_PROJECT_READY' ||
        postSnapshot.detectedState === 'GENERATION_READY' ||
        postSnapshot.hasPromptInput;

      return {
        success: isReady,
        state: isReady ? 'NEW_PROJECT_READY' : postSnapshot.detectedState,
        error: isReady ? undefined : 'New Project workspace controls not fully identified'
      };
    } catch (err: any) {
      Logger.error('FlowWorkspaceInspector', `Error opening New Project: ${err.message}`, accountId);
      return {
        success: false,
        state: 'ERROR',
        error: err.message
      };
    }
  }
}
