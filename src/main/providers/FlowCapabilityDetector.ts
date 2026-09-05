import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';
import { FlowCapabilities, FlowModelOption, AspectRatioOption, DurationOption, DEFAULT_MOCK_CAPABILITIES } from '../../shared/types/generation';
import { PathSecurity } from '../security/paths';
import { Logger } from '../logging/logger';

export class FlowCapabilityDetector {
  private static capabilitiesCache: Map<string, FlowCapabilities> = new Map();

  /**
   * Inspects the live Google Flow page to dynamically detect available controls.
   */
  public static async detectFlowCapabilities(page: Page, accountId: string): Promise<FlowCapabilities> {
    Logger.info('FlowCapabilityDetector', `Scanning Google Flow UI capabilities for account ${accountId}`, accountId);

    const now = new Date().toISOString();
    const defaultCaps: FlowCapabilities = JSON.parse(JSON.stringify(DEFAULT_MOCK_CAPABILITIES));
    defaultCaps.accountId = accountId;
    defaultCaps.lastCheckedAt = now;

    try {
      if (page.isClosed()) {
        return this.getCachedCapabilities(accountId);
      }

      // Dynamic evaluation inside Flow page DOM
      const detected = await page.evaluate(() => {
        const rawControls: string[] = [];

        // 1. Scan for Generation Type Buttons / Tabs
        const modeElements = Array.from(
          document.querySelectorAll('button, [role="tab"], [role="radio"], [data-mode], div[role="button"]')
        );
        const detectedModes: string[] = [];

        modeElements.forEach((el) => {
          const text = (el.textContent || '').trim().toLowerCase();
          const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
          if (text.includes('video') || ariaLabel.includes('video') || text.includes('videofx')) {
            detectedModes.push('VIDEO');
            rawControls.push(`Mode: Video (${el.tagName})`);
          }
          if (text.includes('image') || ariaLabel.includes('image') || text.includes('imagen')) {
            detectedModes.push('IMAGE');
            rawControls.push(`Mode: Image (${el.tagName})`);
          }
        });

        // 2. Scan for Model Selectors / Badges / Labels
        const modelElements = Array.from(
          document.querySelectorAll('[aria-label*="Model"], [data-testid*="model"], select, [role="combobox"], [role="menuitem"]')
        );
        const videoModels: Array<{ id: string; label: string }> = [];
        const imageModels: Array<{ id: string; label: string }> = [];

        modelElements.forEach((el) => {
          const text = (el.textContent || '').trim();
          if (text && text.length < 50) {
            rawControls.push(`ModelControl: ${text}`);
            if (text.toLowerCase().includes('veo') || text.toLowerCase().includes('video') || text.toLowerCase().includes('omni')) {
              videoModels.push({ id: text.toLowerCase().replace(/\s+/g, '-'), label: text });
            } else if (text.toLowerCase().includes('imagen') || text.toLowerCase().includes('image') || text.toLowerCase().includes('banana') || text.toLowerCase().includes('nano')) {
              imageModels.push({ id: text.toLowerCase().replace(/\s+/g, '-'), label: text });
            }
          }
        });

        // 3. Scan for Aspect Ratio Options
        const ratioElements = Array.from(
          document.querySelectorAll('[aria-label*="Aspect"], [data-ratio], [aria-label*="16:9"], [aria-label*="9:16"], [aria-label*="1:1"]')
        );
        const ratios: Array<{ value: string; label: string }> = [];

        ratioElements.forEach((el) => {
          const text = el.textContent || el.getAttribute('aria-label') || '';
          if (text.includes('16:9')) ratios.push({ value: '16:9', label: '16:9 (Landscape)' });
          if (text.includes('9:16')) ratios.push({ value: '9:16', label: '9:16 (Vertical Short)' });
          if (text.includes('1:1')) ratios.push({ value: '1:1', label: '1:1 (Square)' });
          if (text.includes('4:3')) ratios.push({ value: '4:3', label: '4:3 (Standard)' });
        });

        // 4. Scan for Durations
        const durationElements = Array.from(
          document.querySelectorAll('[aria-label*="duration"], [aria-label*="second"], [data-duration]')
        );
        const durations: Array<{ value: number; label: string }> = [];

        durationElements.forEach((el) => {
          const text = el.textContent || el.getAttribute('aria-label') || '';
          const match = text.match(/(\d+)\s*(s|sec|seconds?)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            durations.push({ value: num, label: `${num} seconds` });
          }
        });

        return {
          detectedModes: Array.from(new Set(detectedModes)),
          videoModels,
          imageModels,
          ratios: Array.from(new Set(ratios.map((r) => JSON.stringify(r)))).map((s) => JSON.parse(s)),
          durations: Array.from(new Set(durations.map((d) => JSON.stringify(d)))).map((s) => JSON.parse(s)),
          rawControls
        };
      });

      // Construct capabilities merging detected items with robust defaults
      const capabilities: FlowCapabilities = {
        accountId,
        lastCheckedAt: now,
        generationTypes: detected.detectedModes.length > 0 ? (detected.detectedModes as any) : ['VIDEO', 'IMAGE'],
        video: {
          models:
            detected.videoModels.length > 0
              ? detected.videoModels.map((m) => ({ id: m.id, label: m.label, type: 'VIDEO', available: true }))
              : defaultCaps.video.models,
          aspectRatios: detected.ratios.length > 0 ? detected.ratios.map((r) => ({ ...r, available: true })) : defaultCaps.video.aspectRatios,
          durations: detected.durations.length > 0 ? detected.durations.map((d) => ({ ...d, available: true })) : defaultCaps.video.durations
        },
        image: {
          models:
            detected.imageModels.length > 0
              ? detected.imageModels.map((m) => ({ id: m.id, label: m.label, type: 'IMAGE', available: true }))
              : defaultCaps.image.models,
          aspectRatios: detected.ratios.length > 0 ? detected.ratios.map((r) => ({ ...r, available: true })) : defaultCaps.image.aspectRatios
        },
        rawDetectedControls: detected.rawControls
      };

      // Save cache & snapshot to disk
      this.capabilitiesCache.set(accountId, capabilities);
      this.saveCapabilitySnapshot(accountId, capabilities);

      Logger.info(
        'FlowCapabilityDetector',
        `Discovered Flow capabilities for ${accountId}: ${capabilities.generationTypes.join(', ')} | ${capabilities.video.models.length} video models | ${capabilities.image.models.length} image models`,
        accountId
      );

      return capabilities;
    } catch (err: any) {
      Logger.warn('FlowCapabilityDetector', `Failed runtime capability scan, using baseline capability set: ${err.message}`, accountId);
      this.capabilitiesCache.set(accountId, defaultCaps);
      return defaultCaps;
    }
  }

  public static getCachedCapabilities(accountId: string = 'default'): FlowCapabilities {
    const cached = this.capabilitiesCache.get(accountId) || this.capabilitiesCache.get('default');
    if (cached) return cached;

    // Try loading from disk
    try {
      const capsDir = path.join(PathSecurity.getUserDataDir(), 'capabilities');
      const filePath = path.join(capsDir, `flow-capabilities-${accountId}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.capabilitiesCache.set(accountId, parsed);
        return parsed;
      }
    } catch {
      // Ignored
    }

    const fallback: FlowCapabilities = {
      ...DEFAULT_MOCK_CAPABILITIES,
      accountId,
      lastCheckedAt: new Date().toISOString()
    };
    this.capabilitiesCache.set(accountId, fallback);
    return fallback;
  }

  private static saveCapabilitySnapshot(accountId: string, capabilities: FlowCapabilities): void {
    try {
      const capsDir = path.join(PathSecurity.getUserDataDir(), 'capabilities');
      if (!fs.existsSync(capsDir)) {
        fs.mkdirSync(capsDir, { recursive: true });
      }

      const filePath = path.join(capsDir, `flow-capabilities-${accountId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(capabilities, null, 2), 'utf-8');
    } catch (err) {
      Logger.debug('FlowCapabilityDetector', `Failed saving capability snapshot to disk: ${err}`, accountId);
    }
  }
}
