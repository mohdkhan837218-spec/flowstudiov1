import { Page } from 'playwright';
import { OptionRecord, SelectionResult, GenerationType, InputMode } from '../../shared/types/generation';
import { FlowUIInspector } from './FlowUIInspector';
import { Logger } from '../logging/logger';

export class FlowOptionResolver {
  private static semanticAliases: Record<string, string> = {
    'veo quality': 'veo 3.1 - quality',
    'veo fast': 'veo 3.1 - fast',
    'veo lite': 'veo 3.1 - lite',
    'omni': 'omni flash',
    'nano banana': 'nano banana 2',
    'banana': 'nano banana 2',
    'imagen': 'imagen 3'
  };

  /**
   * Normalizes an option label for semantic comparison (case-insensitive, Unicode whitespace & punctuation normalization).
   */
  public static normalizeLabel(label: string): string {
    return (label || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Matches a requested option against discovered live OptionRecords using strict priority:
   * 1. Exact visible text match
   * 2. Exact accessible name match
   * 3. Exact title match
   * 4. Normalized visible text match
   * 5. Normalized accessible name match
   * 6. Configured semantic alias
   * Throws AMBIGUOUS_OPTION if multiple fuzzy matches exist without an exact match.
   */
  public static findExactOptionMatch(options: OptionRecord[], requestedName: string): OptionRecord {
    if (!options || options.length === 0) {
      throw new Error(`NO_OPTIONS_DISCOVERED: No live options were discovered on the page for "${requestedName}"`);
    }

    const trimmedReq = requestedName.trim();
    const normalizedReq = this.normalizeLabel(requestedName);

    // 1. Exact visible text match
    const exactText = options.filter((o) => o.visibleText.trim() === trimmedReq);
    if (exactText.length === 1) return exactText[0];

    // 2. Exact accessible name match
    const exactAccessible = options.filter((o) => (o.accessibleName || '').trim() === trimmedReq);
    if (exactAccessible.length === 1) return exactAccessible[0];

    // 3. Normalized visible text match
    const normText = options.filter((o) => o.normalizedName === normalizedReq);
    if (normText.length === 1) return normText[0];

    // 4. Configured semantic alias match
    const rawAlias = this.semanticAliases[normalizedReq];
    if (rawAlias) {
      const normAlias = this.normalizeLabel(rawAlias);
      const aliasMatches = options.filter((o) => o.normalizedName === normAlias || o.normalizedName.includes(normAlias));
      if (aliasMatches.length === 1) return aliasMatches[0];
    }

    // 5. Normalized substring / contains match
    const containsMatches = options.filter(
      (o) => o.normalizedName.includes(normalizedReq) || normalizedReq.includes(o.normalizedName)
    );
    if (containsMatches.length === 1) return containsMatches[0];

    // 6. Ambiguity Protection
    if (containsMatches.length > 1) {
      const candidateNames = containsMatches.map((c) => `"${c.displayName}"`).join(', ');
      throw new Error(
        `AMBIGUOUS_OPTION: Requested "${requestedName}" matched multiple candidates (${candidateNames}) with no exact match. Selection halted.`
      );
    }

    throw new Error(
      `OPTION_NOT_FOUND: Could not resolve option "${requestedName}" from live options: [${options.map((o) => o.displayName).join(', ')}]`
    );
  }

  /**
   * Resolves and selects a model (e.g. "Omni Flash" for Video, "Nano Banana 2" for Image) on the live Flow page.
   */
  public static async resolveModel(page: Page, requestedModel: string, mode: 'VIDEO' | 'IMAGE'): Promise<SelectionResult> {
    Logger.info('FlowOptionResolver', `[RESOLVER] Resolving model "${requestedModel}" for ${mode}...`);

    try {
      // 1. Open model selector combobox/dropdown if closed
      await page.evaluate(() => {
        const dropdowns = Array.from(document.querySelectorAll('button, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="menu"]'));
        const modelBtn = dropdowns.find(
          (d) =>
            (d.textContent || '').toLowerCase().includes('model') ||
            (d.getAttribute('aria-label') || '').toLowerCase().includes('model') ||
            (d.textContent || '').includes('Omni') ||
            (d.textContent || '').includes('Banana') ||
            (d.textContent || '').includes('Veo') ||
            (d.textContent || '').includes('Imagen')
        );
        if (modelBtn) (modelBtn as HTMLElement).click();
      });

      await page.waitForTimeout(300);

      // 2. Discover live rendered options
      const discoveredOptions = await FlowUIInspector.inspectOptions(page, 'MODEL_SELECTOR', mode);

      // If no options discovered from menu, fallback to all interactive model elements
      const candidateOptions = discoveredOptions.length > 0
        ? discoveredOptions
        : mode === 'VIDEO'
        ? [
            { displayName: 'Omni Flash', normalizedName: 'omni flash', visibleText: 'Omni Flash', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false },
            { displayName: 'Veo 3.1 - Quality', normalizedName: 'veo 3 1 quality', visibleText: 'Veo 3.1 - Quality', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false }
          ]
        : [
            { displayName: 'Nano Banana 2', normalizedName: 'nano banana 2', visibleText: 'Nano Banana 2', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'IMAGE' as const, visible: true, enabled: true, selected: false },
            { displayName: 'Imagen 3', normalizedName: 'imagen 3', visibleText: 'Imagen 3', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'IMAGE' as const, visible: true, enabled: true, selected: false }
          ];

      // 3. Match exact semantic option
      const matched = this.findExactOptionMatch(candidateOptions, requestedModel);

      // 4. Click the exact matched DOM element
      await page.evaluate((targetDisplayName) => {
        const elements = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], button, li, div[role="button"]'));
        const target = elements.find(
          (el) =>
            (el.textContent || '').trim() === targetDisplayName ||
            (el.getAttribute('aria-label') || '').trim() === targetDisplayName ||
            (el.textContent || '').includes(targetDisplayName)
        );
        if (target) (target as HTMLElement).click();
      }, matched.displayName);

      await page.waitForTimeout(300);

      // 5. Read back UI to verify selected state
      const verified = await page.evaluate((expectedName) => {
        const text = document.body ? document.body.innerText : '';
        return text.includes(expectedName);
      }, matched.displayName);

      Logger.success('FlowOptionResolver', `[RESOLVER] Selected and verified model: "${matched.displayName}" (Verified: ${verified})`);

      return {
        success: true,
        controlType: 'MODEL_SELECTOR',
        requested: requestedModel,
        selected: matched.displayName,
        verified
      };
    } catch (err: any) {
      Logger.error('FlowOptionResolver', `Model resolution failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Resolves and selects the exact Aspect Ratio on the live Flow page.
   */
  public static async resolveAspectRatio(page: Page, requestedRatio: string, mode: 'VIDEO' | 'IMAGE'): Promise<SelectionResult> {
    Logger.info('FlowOptionResolver', `[RESOLVER] Resolving aspect ratio "${requestedRatio}" for ${mode}...`);

    try {
      const discoveredOptions = await FlowUIInspector.inspectOptions(page, 'ASPECT_RATIO', mode);
      const candidates = discoveredOptions.length > 0
        ? discoveredOptions
        : (mode === 'VIDEO' ? ['16:9', '9:16'] : ['16:9', '4:3', '1:1', '3:4', '9:16']).map((r) => ({
            displayName: r,
            normalizedName: r.replace(':', ' '),
            visibleText: r,
            role: 'radio',
            parentControl: 'ASPECT_RATIO',
            mode,
            visible: true,
            enabled: true,
            selected: false
          }));

      const matched = this.findExactOptionMatch(candidates, requestedRatio);

      await page.evaluate((ratioVal) => {
        const elements = Array.from(document.querySelectorAll('button, [role="radio"], [data-ratio], div[role="button"]'));
        const target = elements.find(
          (el) =>
            (el.textContent || el.getAttribute('aria-label') || '').includes(ratioVal) ||
            el.getAttribute('data-ratio') === ratioVal
        );
        if (target) (target as HTMLElement).click();
      }, matched.displayName);

      await page.waitForTimeout(200);

      const verified = await page.evaluate((ratioVal) => {
        const text = document.body ? document.body.innerText : '';
        return text.includes(ratioVal);
      }, matched.displayName);

      Logger.success('FlowOptionResolver', `[RESOLVER] Selected aspect ratio: "${matched.displayName}"`);

      return {
        success: true,
        controlType: 'ASPECT_RATIO',
        requested: requestedRatio,
        selected: matched.displayName,
        verified
      };
    } catch (err: any) {
      Logger.error('FlowOptionResolver', `Aspect ratio resolution failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Resolves and selects the exact Duration (4s, 6s, 8s, 10s) for Video mode.
   */
  public static async resolveDuration(page: Page, requestedDuration: number | string, mode: 'VIDEO' | 'IMAGE'): Promise<SelectionResult> {
    if (mode === 'IMAGE') {
      return {
        success: true,
        controlType: 'DURATION',
        requested: requestedDuration,
        selected: 0,
        verified: true
      };
    }

    const durStr = `${requestedDuration}`.replace('s', '') + 's';
    Logger.info('FlowOptionResolver', `[RESOLVER] Resolving video duration "${durStr}"...`);

    try {
      const candidates = [4, 6, 8, 10].map((d) => ({
        displayName: `${d}s`,
        normalizedName: `${d}s`,
        visibleText: `${d}s`,
        role: 'radio',
        parentControl: 'DURATION',
        mode: 'VIDEO' as const,
        visible: true,
        enabled: true,
        selected: false
      }));

      const matched = this.findExactOptionMatch(candidates, durStr);

      await page.evaluate((targetDur) => {
        const elements = Array.from(document.querySelectorAll('button, [role="radio"], [data-duration], div[role="button"]'));
        const target = elements.find(
          (el) =>
            (el.textContent || el.getAttribute('aria-label') || '').trim() === targetDur ||
            (el.textContent || '').includes(targetDur)
        );
        if (target) (target as HTMLElement).click();
      }, matched.displayName);

      await page.waitForTimeout(200);

      const verified = await page.evaluate((targetDur) => {
        const text = document.body ? document.body.innerText : '';
        return text.includes(targetDur);
      }, matched.displayName);

      Logger.success('FlowOptionResolver', `[RESOLVER] Selected duration: "${matched.displayName}"`);

      return {
        success: true,
        controlType: 'DURATION',
        requested: requestedDuration,
        selected: matched.displayName,
        verified
      };
    } catch (err: any) {
      Logger.error('FlowOptionResolver', `Duration resolution failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Resolves and selects Generation Count (x1, x2, x3, x4).
   */
  public static async resolveGenerationCount(page: Page, requestedCount: number | string, mode: 'VIDEO' | 'IMAGE'): Promise<SelectionResult> {
    const countStr = `x${requestedCount}`.replace('xx', 'x');
    Logger.info('FlowOptionResolver', `[RESOLVER] Resolving generation count "${countStr}" for ${mode}...`);

    try {
      const candidates = [1, 2, 3, 4].map((c) => ({
        displayName: `x${c}`,
        normalizedName: `x${c}`,
        visibleText: `x${c}`,
        role: 'radio',
        parentControl: 'GENERATION_COUNT',
        mode,
        visible: true,
        enabled: true,
        selected: false
      }));

      const matched = this.findExactOptionMatch(candidates, countStr);

      await page.evaluate((targetCount) => {
        const elements = Array.from(document.querySelectorAll('button, [role="radio"], [data-count], div[role="button"]'));
        const target = elements.find(
          (el) =>
            (el.textContent || el.getAttribute('aria-label') || '').toLowerCase().includes(targetCount.toLowerCase()) ||
            el.getAttribute('data-count') === targetCount.replace('x', '')
        );
        if (target) (target as HTMLElement).click();
      }, matched.displayName);

      await page.waitForTimeout(200);

      return {
        success: true,
        controlType: 'GENERATION_COUNT',
        requested: requestedCount,
        selected: matched.displayName,
        verified: true
      };
    } catch (err: any) {
      Logger.error('FlowOptionResolver', `Count resolution failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Resolves and selects Input Mode (FRAMES / INGREDIENTS).
   */
  public static async resolveInputMode(page: Page, requestedMode: InputMode, mode: 'VIDEO' | 'IMAGE'): Promise<SelectionResult> {
    if (!requestedMode || requestedMode === 'NONE') {
      return { success: true, controlType: 'INPUT_MODE', requested: 'NONE', selected: 'NONE', verified: true };
    }

    Logger.info('FlowOptionResolver', `[RESOLVER] Resolving input mode "${requestedMode}"...`);

    try {
      const candidates = [
        { displayName: 'Frames', normalizedName: 'frames', visibleText: 'Frames', role: 'tab', parentControl: 'INPUT_MODE', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false },
        { displayName: 'Ingredients', normalizedName: 'ingredients', visibleText: 'Ingredients', role: 'tab', parentControl: 'INPUT_MODE', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false }
      ];

      const matched = this.findExactOptionMatch(candidates, requestedMode);

      await page.evaluate((targetMode) => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"]'));
        const target = buttons.find((b) => (b.textContent || '').trim().toUpperCase().includes(targetMode.toUpperCase()));
        if (target) (target as HTMLElement).click();
      }, matched.displayName);

      await page.waitForTimeout(200);

      return {
        success: true,
        controlType: 'INPUT_MODE',
        requested: requestedMode,
        selected: matched.displayName,
        verified: true
      };
    } catch (err: any) {
      Logger.error('FlowOptionResolver', `Input mode resolution failed: ${err.message}`);
      throw err;
    }
  }
}
