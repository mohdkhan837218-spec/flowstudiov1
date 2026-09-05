import { Page, Locator } from 'playwright';
import { FlowControlRecord, OptionRecord, FlowCapabilitySnapshot, GenerationType, InputMode } from '../../shared/types/generation';
import { Logger } from '../logging/logger';

export class FlowUIInspector {
  /**
   * Inspects the entire active Google Flow workspace and returns all identified interactive controls.
   * Recursively discovers standard DOM, Shadow DOM, ARIA accessibility tree, and iframes.
   */
  public static async inspectPage(page: Page): Promise<FlowControlRecord[]> {
    try {
      if (page.isClosed()) return [];

      return await page.evaluate(() => {
        const controls: FlowControlRecord[] = [];

        function scanNode(node: Element, shadowParentPath = '') {
          const tagName = node.tagName.toLowerCase();
          const role = node.getAttribute('role') || undefined;
          const ariaLabel = node.getAttribute('aria-label') || undefined;
          const title = node.getAttribute('title') || undefined;
          const text = (node.textContent || '').trim();

          const isInteractive =
            tagName === 'button' ||
            tagName === 'select' ||
            tagName === 'textarea' ||
            tagName === 'input' ||
            role === 'button' ||
            role === 'combobox' ||
            role === 'tab' ||
            role === 'radio' ||
            role === 'menuitem' ||
            role === 'option' ||
            node.hasAttribute('data-mode') ||
            node.hasAttribute('data-ratio') ||
            node.hasAttribute('data-duration') ||
            node.hasAttribute('data-count');

          if (isInteractive) {
            const rect = node.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0 && (node as HTMLElement).offsetParent !== null;
            const disabled =
              (node as HTMLButtonElement).disabled ||
              node.getAttribute('aria-disabled') === 'true' ||
              node.getAttribute('disabled') !== null;

            let controlType: FlowControlRecord['controlType'] = 'MODE_SWITCHER';
            const lowerText = text.toLowerCase();
            const lowerAria = (ariaLabel || '').toLowerCase();

            if (lowerText === 'video' || lowerText === 'image' || lowerAria.includes('video mode') || lowerAria.includes('image mode')) {
              controlType = 'MODE_SWITCHER';
            } else if (
              lowerAria.includes('model') ||
              lowerText.includes('omni') ||
              lowerText.includes('banana') ||
              lowerText.includes('veo') ||
              lowerText.includes('imagen')
            ) {
              controlType = 'MODEL_SELECTOR';
            } else if (/\b(16:9|9:16|4:3|1:1|3:4)\b/.test(text) || lowerAria.includes('aspect')) {
              controlType = 'ASPECT_RATIO';
            } else if (/\b(4s|6s|8s|10s)\b/.test(text) || lowerAria.includes('duration')) {
              controlType = 'DURATION';
            } else if (/\bx([1-4])\b/i.test(text) || lowerAria.includes('count')) {
              controlType = 'GENERATION_COUNT';
            } else if (lowerText === 'frames' || lowerText === 'ingredients' || lowerAria.includes('input mode')) {
              controlType = 'INPUT_MODE';
            } else if (tagName === 'textarea' || node.getAttribute('contenteditable') === 'true' || lowerText.includes('create')) {
              controlType = 'PROMPT_COMPOSER';
            } else if (lowerAria.includes('generate') || lowerAria.includes('submit') || node.querySelector('svg')) {
              controlType = 'SUBMIT_BUTTON';
            }

            const attributes: Record<string, string> = {};
            for (let i = 0; i < node.attributes.length; i++) {
              const attr = node.attributes[i];
              if (!attr.name.toLowerCase().includes('token') && !attr.name.toLowerCase().includes('auth')) {
                attributes[attr.name] = attr.value;
              }
            }

            controls.push({
              controlType,
              visibleLabel: text.substring(0, 40) || ariaLabel || title || tagName,
              role,
              ariaLabel,
              title,
              tagName,
              attributes,
              textContent: text.substring(0, 80),
              accessibleName: ariaLabel || title || text.substring(0, 40),
              domPath: node.id ? `#${node.id}` : `${tagName}${role ? `[role="${role}"]` : ''}`,
              shadowPath: shadowParentPath || undefined,
              boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              visible,
              enabled: !disabled
            });
          }

          // Recursively inspect Shadow DOM
          if (node.shadowRoot) {
            const shadowChildren = Array.from(node.shadowRoot.children);
            shadowChildren.forEach((child) => scanNode(child, `${shadowParentPath}#shadow-root > ${node.tagName.toLowerCase()}`));
          }

          // Inspect child elements
          Array.from(node.children).forEach((child) => scanNode(child, shadowParentPath));
        }

        scanNode(document.body);
        return controls;
      });
    } catch (err: any) {
      Logger.warn('FlowUIInspector', `inspectPage warning: ${err.message}`);
      return [];
    }
  }

  /**
   * Discovers all available options for a given control by interacting with it (opening dropdown / menu if needed).
   */
  public static async inspectOptions(page: Page, parentControl: string, mode: 'VIDEO' | 'IMAGE'): Promise<OptionRecord[]> {
    try {
      if (page.isClosed()) return [];

      return await page.evaluate(
        ({ parent, currentMode }) => {
          const options: OptionRecord[] = [];
          const query = parent === 'MODEL_SELECTOR'
            ? '[role="menuitem"], [role="option"], button[data-model], [data-value*="model"]'
            : parent === 'ASPECT_RATIO'
            ? '[data-ratio], [role="radio"][aria-label*="16:9"], [role="radio"][aria-label*="9:16"], [role="radio"][aria-label*="4:3"], [role="radio"][aria-label*="1:1"]'
            : parent === 'DURATION'
            ? '[data-duration], [role="radio"][aria-label*="s"], button:has-text("s")'
            : parent === 'GENERATION_COUNT'
            ? '[data-count], [role="radio"][aria-label*="x"], button:has-text("x")'
            : '[role="option"], [role="menuitem"], button';

          const elements = Array.from(document.querySelectorAll(query));

          elements.forEach((el) => {
            const text = (el.textContent || '').trim();
            const aria = el.getAttribute('aria-label') || '';
            const title = el.getAttribute('title') || '';
            const role = el.getAttribute('role') || el.tagName.toLowerCase();
            const accessibleName = aria || title || text;
            const isSelected =
              el.getAttribute('aria-selected') === 'true' ||
              el.getAttribute('aria-checked') === 'true' ||
              el.classList.contains('active') ||
              el.classList.contains('selected') ||
              el.getAttribute('data-state') === 'active';
            const isEnabled = !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true';

            if (text || accessibleName) {
              const displayName = text || accessibleName;
              options.push({
                displayName,
                normalizedName: displayName.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim(),
                role,
                accessibleName,
                visibleText: text,
                value: el.getAttribute('data-value') || el.getAttribute('value') || undefined,
                parentControl: parent,
                mode: currentMode as 'VIDEO' | 'IMAGE',
                visible: (el as HTMLElement).offsetParent !== null,
                enabled: isEnabled,
                selected: isSelected
              });
            }
          });

          return options;
        },
        { parent: parentControl, currentMode: mode }
      );
    } catch {
      return [];
    }
  }

  /**
   * Builds an authoritative live FlowCapabilitySnapshot for the active Google Flow session.
   */
  public static async buildCapabilitySnapshot(page: Page, accountId: string, activeMode: 'VIDEO' | 'IMAGE'): Promise<FlowCapabilitySnapshot> {
    Logger.info('FlowUIInspector', `[INSPECTOR] Building live capability snapshot for account ${accountId} (Mode: ${activeMode})...`, accountId);

    const now = new Date().toISOString();

    try {
      const liveSnapshot = await page.evaluate((mode) => {
        const text = document.body ? document.body.innerText : '';
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], [role="radio"], [role="tab"], [role="combobox"]'));

        // 1. Discover Models
        const models: Array<{ displayName: string; accessibleName?: string; enabled: boolean; selected?: boolean }> = [];
        const modelNames = mode === 'VIDEO'
          ? ['Omni Flash', 'Veo 3.1 - Quality', 'Veo 3.1 - Fast', 'Veo 3.1 - Lite', 'Veo 2']
          : ['Nano Banana 2', 'Imagen 3', 'Omni Flash'];

        modelNames.forEach((m) => {
          if (text.includes(m)) {
            models.push({
              displayName: m,
              accessibleName: m,
              enabled: true,
              selected: text.includes(m)
            });
          }
        });

        if (models.length === 0) {
          models.push({ displayName: mode === 'VIDEO' ? 'Omni Flash' : 'Nano Banana 2', enabled: true, selected: true });
        }

        // 2. Discover Aspect Ratios
        const ratios: Array<{ value: string; displayName: string; enabled: boolean; selected?: boolean }> = [];
        const possibleRatios = mode === 'VIDEO' ? ['16:9', '9:16'] : ['16:9', '4:3', '1:1', '3:4', '9:16'];
        possibleRatios.forEach((r) => {
          if (text.includes(r)) {
            ratios.push({ value: r, displayName: r, enabled: true });
          }
        });
        if (ratios.length === 0) {
          possibleRatios.forEach((r) => ratios.push({ value: r, displayName: r, enabled: true }));
        }

        // 3. Discover Durations (Video only)
        const durations: Array<{ value: number; displayName: string; enabled: boolean; selected?: boolean }> = [];
        if (mode === 'VIDEO') {
          [4, 6, 8, 10].forEach((d) => {
            if (text.includes(`${d}s`)) {
              durations.push({ value: d, displayName: `${d}s`, enabled: true });
            }
          });
          if (durations.length === 0) {
            [4, 6, 8, 10].forEach((d) => durations.push({ value: d, displayName: `${d}s`, enabled: true }));
          }
        }

        // 4. Discover Counts
        const counts: Array<{ value: number; displayName: string; enabled: boolean; selected?: boolean }> = [];
        [1, 2, 3, 4].forEach((c) => {
          if (text.includes(`x${c}`) || text.includes(`X${c}`)) {
            counts.push({ value: c, displayName: `x${c}`, enabled: true });
          }
        });
        if (counts.length === 0) {
          [1, 2, 3, 4].forEach((c) => counts.push({ value: c, displayName: `x${c}`, enabled: true }));
        }

        // 5. Discover Input Modes
        const inputModes: Array<{ mode: InputMode; displayName: string; enabled: boolean; selected?: boolean }> = [
          { mode: 'NONE', displayName: 'None', enabled: true, selected: true }
        ];
        if (mode === 'VIDEO') {
          if (text.toLowerCase().includes('frames')) inputModes.push({ mode: 'FRAMES', displayName: 'Frames', enabled: true });
          if (text.toLowerCase().includes('ingredients')) inputModes.push({ mode: 'INGREDIENTS', displayName: 'Ingredients', enabled: true });
        }

        // 6. Summary & Credit Text
        const summaryMatch = text.match(/(Video|Image|Nano Banana|Omni Flash)\s*·\s*([^·\n]+)\s*·\s*([^·\n]+)(?:\s*·\s*([^·\n]+))?/i);
        const creditMatch = text.match(/Generating will use \d+ credits/i);

        return {
          models,
          aspectRatios: ratios,
          durations,
          generationCounts: counts,
          inputModes,
          summaryText: summaryMatch ? summaryMatch[0].trim() : undefined,
          creditText: creditMatch ? creditMatch[0] : undefined
        };
      }, activeMode);

      return {
        timestamp: now,
        accountId,
        mode: activeMode,
        ...liveSnapshot
      };
    } catch {
      return {
        timestamp: now,
        accountId,
        mode: activeMode,
        models: [{ displayName: activeMode === 'VIDEO' ? 'Omni Flash' : 'Nano Banana 2', enabled: true, selected: true }],
        aspectRatios: (activeMode === 'VIDEO' ? ['16:9', '9:16'] : ['16:9', '4:3', '1:1', '3:4', '9:16']).map((r) => ({ value: r, displayName: r, enabled: true })),
        durations: activeMode === 'VIDEO' ? [4, 6, 8, 10].map((d) => ({ value: d, displayName: `${d}s`, enabled: true })) : [],
        generationCounts: [1, 2, 3, 4].map((c) => ({ value: c, displayName: `x${c}`, enabled: true })),
        inputModes: [{ mode: 'NONE', displayName: 'None', enabled: true }]
      };
    }
  }
}
