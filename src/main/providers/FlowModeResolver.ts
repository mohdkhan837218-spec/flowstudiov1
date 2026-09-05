import { Page, Locator } from 'playwright';
import { Logger } from '../logging/logger';
import { FlowErrorCode } from '../../shared/types/diagnostics';
import { FlowActionTracer } from '../diagnostics/FlowActionTracer';

export interface ModeCandidateInfo {
  candidateId: number;
  strategy: string;
  tag: string;
  role?: string;
  text: string;
  accessibleName?: string;
  ariaLabel?: string;
  title?: string;
  visible: boolean;
  enabled: boolean;
  selected?: boolean;
  checked?: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
  parentTag?: string;
  parentClass?: string;
  isInsideComposer?: boolean;
  isAdjacentToImage?: boolean;
  isNavLink?: boolean;
  accepted: boolean;
  rejectionReason?: string;
  locator?: Locator;
}

export interface ModeResolutionResult {
  success: boolean;
  mode: 'VIDEO' | 'IMAGE';
  verified: boolean;
  candidatesCount: number;
  acceptedCandidate?: ModeCandidateInfo;
  rejectedCandidates: ModeCandidateInfo[];
  strategyUsed?: string;
  error?: string;
  errorCode?: FlowErrorCode;
}

export class FlowModeResolver {
  /**
   * Semantically resolves and activates the target generation mode (VIDEO or IMAGE).
   * Implements 9 search strategies in order with strict candidate intent verification and post-click state assertion.
   */
  public static async resolveAndSelectMode(
    page: Page,
    targetMode: 'VIDEO' | 'IMAGE',
    options?: {
      timeoutMs?: number;
      accountId?: string;
      jobId?: string;
      tracer?: FlowActionTracer;
    }
  ): Promise<ModeResolutionResult> {
    const timeoutMs = options?.timeoutMs || 10000;
    const accountId = options?.accountId;
    const jobId = options?.jobId;
    const tracer = options?.tracer;

    Logger.info(
      'FlowModeResolver',
      `[MODE RESOLVER] Starting semantic mode discovery for target: ${targetMode}`,
      accountId,
      jobId,
      { category: 'MODE', stage: 'SELECT_GENERATION_MODE', action: `RESOLVE_${targetMode}` }
    );

    // 1. Check if already in the target mode
    const initialModeState = await this.readActiveModeFromDOM(page);
    if (initialModeState.currentMode === targetMode && initialModeState.verified) {
      Logger.success(
        'FlowModeResolver',
        `[MODE RESOLVER] Target mode ${targetMode} is ALREADY ACTIVE and verified on composer canvas`,
        accountId,
        jobId
      );
      return {
        success: true,
        mode: targetMode,
        verified: true,
        candidatesCount: 1,
        rejectedCandidates: [],
        strategyUsed: 'INITIAL_STATE_ALREADY_ACTIVE'
      };
    }

    // 2. Run 9 semantic discovery strategies in priority order
    const allCandidates: ModeCandidateInfo[] = [];

    // Strategy 1: Accessibility Role + Accessible Name (button, tab, radio, menuitem, switch)
    await this.discoverByAccessibilityRole(page, targetMode, allCandidates);

    // Strategy 2: ARIA-label Attribute
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverByAriaLabel(page, targetMode, allCandidates);
    }

    // Strategy 3: Title Attribute
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverByTitle(page, targetMode, allCandidates);
    }

    // Strategy 4: Button Direct Text
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverByButtonText(page, targetMode, allCandidates);
    }

    // Strategy 5: Visible Text in Mode Containers / Composer Controls
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverByVisibleTextInContainer(page, targetMode, allCandidates);
    }

    // Strategy 6: Role-Independent Semantic Candidates (.mode-pill, .segmented-item, .toggle)
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverBySemanticClass(page, targetMode, allCandidates);
    }

    // Strategy 7: DOM Attributes (data-mode, data-value, data-testid)
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverByDataAttributes(page, targetMode, allCandidates);
    }

    // Strategy 8: Keyboard / Focusable Controls
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverByFocusable(page, targetMode, allCandidates);
    }

    // Strategy 9: Shadow DOM Traversal
    if (!this.hasAcceptedCandidate(allCandidates)) {
      await this.discoverByShadowDom(page, targetMode, allCandidates);
    }

    // Log complete candidate audit
    const accepted = allCandidates.find((c) => c.accepted);
    const rejected = allCandidates.filter((c) => !c.accepted);

    Logger.info(
      'FlowModeResolver',
      `[MODE RESOLVER] Candidate Discovery Audit for ${targetMode}: Total=${allCandidates.length}, Accepted=${accepted ? 1 : 0}, Rejected=${rejected.length}`,
      accountId,
      jobId,
      {
        category: 'MODE',
        stage: 'SELECT_GENERATION_MODE',
        action: 'CANDIDATE_AUDIT',
        metadata: {
          target: targetMode,
          total: allCandidates.length,
          accepted: accepted ? { tag: accepted.tag, role: accepted.role, text: accepted.text, strategy: accepted.strategy } : null,
          rejected: rejected.map((r) => ({ role: r.role, text: r.text, reason: r.rejectionReason }))
        }
      }
    );

    // If no candidate accepted, record failure
    if (!accepted) {
      const errCode: FlowErrorCode = 'FLOW_MODE_BUTTON_NOT_FOUND';
      const errMsg = `FLOW_MODE_BUTTON_NOT_FOUND: No valid generation mode control found for ${targetMode} across 9 discovery strategies (${allCandidates.length} rejected candidates)`;
      Logger.error('FlowModeResolver', errMsg, accountId, jobId, {
        category: 'MODE',
        stage: 'SELECT_GENERATION_MODE',
        errorCode: errCode
      });

      return {
        success: false,
        mode: targetMode,
        verified: false,
        candidatesCount: allCandidates.length,
        rejectedCandidates: rejected,
        error: errMsg,
        errorCode: errCode
      };
    }

    // 3. Click the Accepted Candidate with State Verification
    Logger.info(
      'FlowModeResolver',
      `[MODE RESOLVER] Clicking accepted candidate #${accepted.candidateId} (${accepted.tag} "${accepted.text}", role=${accepted.role}, strategy=${accepted.strategy})...`,
      accountId,
      jobId
    );

    try {
      // Execute click via Playwright locator or evaluate click
      let clicked = false;
      if (accepted.locator) {
        try {
          await accepted.locator.click({ timeout: 2000, force: true });
          clicked = true;
        } catch {
          // fallback to evaluate click
        }
      }

      if (!clicked) {
        await page.evaluate((targetText) => {
          const els = Array.from(document.querySelectorAll('button, [role="tab"], [role="radio"], div[role="button"], span, div'));
          const match = els.find((el) => (el.textContent || '').trim().toUpperCase() === targetText.toUpperCase());
          if (match) {
            (match as HTMLElement).click();
            match.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        }, targetMode);
      }

      // 4. Assert State Transition: wait for actual Flow UI state to reflect targetMode
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        await page.waitForTimeout(350);
        const activeCheck = await this.readActiveModeFromDOM(page);
        if (activeCheck.currentMode === targetMode && activeCheck.verified) {
          Logger.success(
            'FlowModeResolver',
            `[MODE RESOLVER] [SUCCESS] ${targetMode}_MODE_VERIFIED (Active Model: ${activeCheck.activeModel || 'Auto'}, Summary: ${activeCheck.summaryText || 'N/A'})`,
            accountId,
            jobId,
            { category: 'MODE', stage: 'SELECT_GENERATION_MODE', action: 'VERIFY_SUCCESS' }
          );

          return {
            success: true,
            mode: targetMode,
            verified: true,
            candidatesCount: allCandidates.length,
            acceptedCandidate: accepted,
            rejectedCandidates: rejected,
            strategyUsed: accepted.strategy
          };
        }
      }

      // If state didn't transition within timeout
      const finalState = await this.readActiveModeFromDOM(page);
      const errCode: FlowErrorCode = 'FLOW_MODE_TRANSITION_FAILED';
      const errMsg = `FLOW_MODE_TRANSITION_FAILED: Clicked ${targetMode} control #${accepted.candidateId}, but Flow composer remained in ${finalState.currentMode} mode (${finalState.activeModel || 'Unknown model'})`;

      Logger.error('FlowModeResolver', errMsg, accountId, jobId, {
        category: 'MODE',
        stage: 'SELECT_GENERATION_MODE',
        errorCode: errCode
      });

      return {
        success: false,
        mode: targetMode,
        verified: false,
        candidatesCount: allCandidates.length,
        acceptedCandidate: accepted,
        rejectedCandidates: rejected,
        strategyUsed: accepted.strategy,
        error: errMsg,
        errorCode: errCode
      };
    } catch (err: any) {
      return {
        success: false,
        mode: targetMode,
        verified: false,
        candidatesCount: allCandidates.length,
        acceptedCandidate: accepted,
        rejectedCandidates: rejected,
        error: err.message || String(err),
        errorCode: 'FLOW_MODE_TRANSITION_FAILED'
      };
    }
  }

  private static hasAcceptedCandidate(candidates: ModeCandidateInfo[]): boolean {
    return candidates.some((c) => c.accepted);
  }

  /**
   * Candidate Intent Verifier: validates whether an element controls generation mode vs navigation/help/assets.
   */
  public static evaluateCandidateIntent(info: Partial<ModeCandidateInfo>, targetMode: 'VIDEO' | 'IMAGE'): { accepted: boolean; reason?: string } {
    const text = (info.text || '').trim().toLowerCase();
    const role = (info.role || '').toLowerCase();
    const accessibleName = (info.accessibleName || '').toLowerCase();
    const ariaLabel = (info.ariaLabel || '').toLowerCase();
    const targetLower = targetMode.toLowerCase();

    // 1. Reject if it is clearly a navigation link or sidebar link
    if (role === 'link' || info.isNavLink) {
      return { accepted: false, reason: 'Rejected: role=link / navigation item (not a mode control)' };
    }

    // 2. Reject plural "Videos" if purpose is project videos section
    if (text === 'videos' && !info.isInsideComposer && !info.isAdjacentToImage) {
      return { accepted: false, reason: 'Rejected: plural "Videos" outside composer (project asset collection navigation)' };
    }

    // 3. Reject if text contains long help description
    if (text.length > 25 && !text.includes('mode')) {
      return { accepted: false, reason: 'Rejected: text length > 25 characters (likely descriptive/help text)' };
    }

    // 4. Accept if inside composer toolbar, pill group, or adjacent to the alternate mode (Image/Video)
    if (info.isAdjacentToImage || info.isInsideComposer) {
      return { accepted: true };
    }

    // 5. Accept if role is button, tab, radio, menuitem, switch with exact mode name
    if (['button', 'tab', 'radio', 'menuitem', 'option', 'switch'].includes(role)) {
      if (text === targetLower || accessibleName === targetLower || ariaLabel.includes(targetLower)) {
        return { accepted: true };
      }
    }

    // 6. Default acceptance if exact text match and visible
    if ((text === targetLower || accessibleName === targetLower) && info.visible) {
      return { accepted: true };
    }

    return { accepted: false, reason: 'Rejected: element context lacks generation mode control indicators' };
  }

  // --- Discovery Strategy Implementations ---

  private static async discoverByAccessibilityRole(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const candidates = await page.evaluate((type) => {
        const roles = ['button', 'tab', 'radio', 'menuitem', 'option', 'switch'];
        const elements = Array.from(document.querySelectorAll(roles.map((r) => `[role="${r}"]`).join(', ') + ', button'));

        return elements
          .filter((el) => {
            const text = (el.textContent || '').trim();
            const aria = el.getAttribute('aria-label') || '';
            const name = el.getAttribute('name') || '';
            const val = type.toLowerCase();
            return (
              text.toLowerCase() === val ||
              aria.toLowerCase() === val ||
              name.toLowerCase() === val ||
              text.toLowerCase().includes(val)
            );
          })
          .map((el, i) => {
            const rect = el.getBoundingClientRect();
            const parent = el.parentElement;
            const parentText = parent ? parent.textContent || '' : '';
            const isAdjacentToImage = /image/i.test(parentText) || !!parent?.querySelector('[role*="tab"], [role*="button"], button');
            const isInsideComposer = !!el.closest('div[class*="composer"], div[role="region"], div[class*="toolbar"]');

            return {
              candidateId: out.length + i + 1,
              strategy: 'ACCESSIBILITY_ROLE_NAME',
              tag: el.tagName.toLowerCase(),
              role: el.getAttribute('role') || el.tagName.toLowerCase(),
              text: (el.textContent || '').trim(),
              accessibleName: el.getAttribute('aria-label') || (el.textContent || '').trim(),
              ariaLabel: el.getAttribute('aria-label') || undefined,
              title: el.getAttribute('title') || undefined,
              visible: rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none',
              enabled: !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true',
              selected: el.getAttribute('aria-selected') === 'true',
              boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              parentTag: parent ? parent.tagName.toLowerCase() : undefined,
              isAdjacentToImage,
              isInsideComposer,
              isNavLink: el.tagName.toLowerCase() === 'a' || el.getAttribute('role') === 'link' || !!el.closest('nav')
            };
          });
      }, targetMode);

      for (const cand of candidates) {
        const intent = this.evaluateCandidateIntent(cand, targetMode as any);
        const fullCand: ModeCandidateInfo = {
          ...cand,
          accepted: intent.accepted,
          rejectionReason: intent.reason,
          locator: page.getByRole(cand.role as any, { name: new RegExp(`^${cand.text}$`, 'i') }).first()
        };
        out.push(fullCand);
      }
    } catch {}
  }

  private static async discoverByAriaLabel(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const loc = page.locator(`[aria-label*="${targetMode}" i]`);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const item = loc.nth(i);
        const isVis = await item.isVisible().catch(() => false);
        const aria = (await item.getAttribute('aria-label')) || '';
        const role = (await item.getAttribute('role')) || 'button';
        const text = (await item.textContent()) || '';

        const cand: ModeCandidateInfo = {
          candidateId: out.length + 1,
          strategy: 'ARIA_LABEL',
          tag: 'element',
          role,
          text: text.trim(),
          ariaLabel: aria,
          visible: isVis,
          enabled: true,
          accepted: isVis && (aria.toLowerCase() === targetMode.toLowerCase() || aria.toLowerCase().includes(`${targetMode.toLowerCase()} mode`)),
          locator: item
        };
        if (!cand.accepted) {
          cand.rejectionReason = 'Aria label did not meet exact mode criteria';
        }
        out.push(cand);
      }
    } catch {}
  }

  private static async discoverByTitle(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const loc = page.locator(`[title*="${targetMode}" i]`);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const item = loc.nth(i);
        const isVis = await item.isVisible().catch(() => false);
        const title = (await item.getAttribute('title')) || '';
        out.push({
          candidateId: out.length + 1,
          strategy: 'TITLE_ATTRIBUTE',
          tag: 'element',
          text: title,
          title,
          visible: isVis,
          enabled: true,
          accepted: isVis && title.toLowerCase() === targetMode.toLowerCase(),
          locator: item
        });
      }
    } catch {}
  }

  private static async discoverByButtonText(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const loc = page.locator(`button:has-text("${targetMode}")`);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const item = loc.nth(i);
        const isVis = await item.isVisible().catch(() => false);
        const text = ((await item.textContent()) || '').trim();
        const cand: ModeCandidateInfo = {
          candidateId: out.length + 1,
          strategy: 'BUTTON_TEXT',
          tag: 'button',
          role: 'button',
          text,
          visible: isVis,
          enabled: true,
          accepted: isVis && text.toUpperCase() === targetMode.toUpperCase(),
          locator: item
        };
        if (!cand.accepted) {
          cand.rejectionReason = 'Button text did not strictly equal target mode';
        }
        out.push(cand);
      }
    } catch {}
  }

  private static async discoverByVisibleTextInContainer(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const cand = await page.evaluate((type) => {
        const spans = Array.from(document.querySelectorAll('span, div, p, label'));
        const exact = spans.find((s) => (s.textContent || '').trim().toUpperCase() === type.toUpperCase());
        if (exact) {
          const rect = exact.getBoundingClientRect();
          return {
            candidateId: 99,
            strategy: 'VISIBLE_TEXT_CONTAINER',
            tag: exact.tagName.toLowerCase(),
            text: (exact.textContent || '').trim(),
            visible: rect.width > 0 && rect.height > 0,
            enabled: true,
            accepted: true
          };
        }
        return null;
      }, targetMode);

      if (cand) {
        out.push({
          ...cand,
          candidateId: out.length + 1,
          locator: page.locator(`${cand.tag}:has-text("${cand.text}")`).first()
        });
      }
    } catch {}
  }

  private static async discoverBySemanticClass(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const loc = page.locator(`.mode-pill, .segmented-item, .toggle-item, [class*="mode" i]:has-text("${targetMode}")`);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const item = loc.nth(i);
        const isVis = await item.isVisible().catch(() => false);
        const text = ((await item.textContent()) || '').trim();
        out.push({
          candidateId: out.length + 1,
          strategy: 'SEMANTIC_CLASS',
          tag: 'div',
          text,
          visible: isVis,
          enabled: true,
          accepted: isVis && text.toUpperCase().includes(targetMode.toUpperCase()),
          locator: item
        });
      }
    } catch {}
  }

  private static async discoverByDataAttributes(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const val = targetMode.toLowerCase();
      const loc = page.locator(`[data-mode="${val}"], [data-value="${val}"], [data-testid*="${val}" i]`);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const item = loc.nth(i);
        const isVis = await item.isVisible().catch(() => false);
        out.push({
          candidateId: out.length + 1,
          strategy: 'DATA_ATTRIBUTES',
          tag: 'element',
          text: targetMode,
          visible: isVis,
          enabled: true,
          accepted: isVis,
          locator: item
        });
      }
    } catch {}
  }

  private static async discoverByFocusable(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    try {
      const loc = page.locator(`[tabindex="0"]:has-text("${targetMode}")`);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const item = loc.nth(i);
        const isVis = await item.isVisible().catch(() => false);
        out.push({
          candidateId: out.length + 1,
          strategy: 'FOCUSABLE_CONTROL',
          tag: 'element',
          text: targetMode,
          visible: isVis,
          enabled: true,
          accepted: isVis,
          locator: item
        });
      }
    } catch {}
  }

  private static async discoverByShadowDom(page: Page, targetMode: string, out: ModeCandidateInfo[]): Promise<void> {
    // Traverse shadow DOM elements if present
    try {
      const loc = page.locator(`*:has-text("${targetMode}") >> button`);
      if (await loc.first().isVisible({ timeout: 500 }).catch(() => false)) {
        out.push({
          candidateId: out.length + 1,
          strategy: 'SHADOW_DOM',
          tag: 'button',
          text: targetMode,
          visible: true,
          enabled: true,
          accepted: true,
          locator: loc.first()
        });
      }
    } catch {}
  }

  /**
   * Reads the active generation mode and active model directly from the live Flow composer DOM.
   */
  public static async readActiveModeFromDOM(page: Page): Promise<{
    currentMode: 'VIDEO' | 'IMAGE';
    activeModel?: string;
    summaryText?: string;
    verified: boolean;
  }> {
    try {
      return await page.evaluate(() => {
        const allText = document.body ? document.body.innerText : '';
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], [role="radio"]'));

        const imageTab = buttons.find((b) => (b.textContent || '').trim().toUpperCase() === 'IMAGE');
        const videoTab = buttons.find((b) => (b.textContent || '').trim().toUpperCase() === 'VIDEO');

        let currentMode: 'VIDEO' | 'IMAGE' = 'VIDEO';
        let verified = false;

        if (imageTab && (imageTab.getAttribute('aria-selected') === 'true' || imageTab.classList.contains('active') || imageTab.getAttribute('data-state') === 'active')) {
          currentMode = 'IMAGE';
          verified = true;
        } else if (videoTab && (videoTab.getAttribute('aria-selected') === 'true' || videoTab.classList.contains('active') || videoTab.getAttribute('data-state') === 'active')) {
          currentMode = 'VIDEO';
          verified = true;
        } else if (/Nano Banana 2|Nano Banana/i.test(allText) && !/Omni Flash|Veo/i.test(allText)) {
          currentMode = 'IMAGE';
          verified = true;
        } else if (/Omni Flash|Veo/i.test(allText)) {
          currentMode = 'VIDEO';
          verified = true;
        }

        // Active model
        let activeModel: string | undefined;
        if (/Omni Flash/i.test(allText)) activeModel = 'Omni Flash';
        else if (/Nano Banana 2/i.test(allText) || /Nano Banana/i.test(allText)) activeModel = 'Nano Banana 2';
        else if (/Veo 3.1 - Quality/i.test(allText)) activeModel = 'Veo 3.1 - Quality';
        else if (/Veo 3.1 - Fast/i.test(allText)) activeModel = 'Veo 3.1 - Fast';
        else if (/Imagen 3/i.test(allText)) activeModel = 'Imagen 3';

        // Summary text
        const summaryMatch = allText.match(/(Video|Image|Nano Banana|Omni Flash)\s*·\s*([^·\n]+)\s*·\s*([^·\n]+)/i);
        const summaryText = summaryMatch ? summaryMatch[0].trim() : undefined;

        return {
          currentMode,
          activeModel,
          summaryText,
          verified
        };
      });
    } catch {
      return {
        currentMode: 'VIDEO',
        verified: false
      };
    }
  }
}
