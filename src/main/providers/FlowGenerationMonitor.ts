import { Page } from 'playwright';
import { FlowComposerController, MediaAssetInfo } from './FlowComposerController';
import { LivePreviewManager } from '../preview/LivePreviewManager';
import { Logger } from '../logging/logger';

export class FlowGenerationMonitor {
  /**
   * Verifies that generation has actually started after clicking the submit arrow.
   * Checks for state change: loading spinner, generation placeholder, or disabled composer.
   */
  public static async waitForGenerationStart(
    page: Page,
    jobIdOrTimeout?: string | number,
    timeoutMs: number = 15000
  ): Promise<boolean> {
    const jobId = typeof jobIdOrTimeout === 'string' ? jobIdOrTimeout : undefined;
    const timeout = typeof jobIdOrTimeout === 'number' ? jobIdOrTimeout : timeoutMs;
    Logger.info('FlowGenerationMonitor', '[FLOW] Verifying generation start signal...');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        const hasLoadingText = /generating|rendering|creating|diffusing|processing/i.test(text);
        const hasProgressBar = !!document.querySelector(
          '[role="progressbar"], .spinner, svg.animate-spin, [data-state="generating"]'
        );
        const hasNewCard = !!document.querySelector(
          '[data-status="generating"], [data-status="rendering"], .generation-card'
        );

        return hasLoadingText || hasProgressBar || hasNewCard;
      });

      if (state) {
        Logger.success('FlowGenerationMonitor', '[FLOW] Generation start verified (active rendering detected)');
        if (jobId) {
          LivePreviewManager.updateJobStage(jobId, 'GENERATING', 'Rendering diffusion frames in Google Flow');
        }
        return true;
      }

      await page.waitForTimeout(500);
    }

    Logger.warn(
      'FlowGenerationMonitor',
      '[FLOW] No explicit start indicator detected, proceeding to monitor generation outputs'
    );
    if (jobId) {
      LivePreviewManager.updateJobStage(
        jobId,
        'GENERATING',
        'Waiting for Google Flow canvas outputs (no explicit start banner)'
      );
    }
    return false;
  }

  /**
   * Checks if an intermediate preview (e.g. progressive video frame or thumbnail) is exposed by Flow.
   */
  public static async checkIntermediatePreview(page: Page, jobId?: string): Promise<string | null> {
    try {
      const previewSrc = await page.evaluate(() => {
        // Check active video or image card on canvas
        const activeVideo = document.querySelector<HTMLVideoElement>(
          '.generation-card video, [data-state="generating"] video, video[src]'
        );
        if (activeVideo && activeVideo.src && !activeVideo.src.startsWith('blob:null')) {
          return activeVideo.src;
        }

        const activeImg = document.querySelector<HTMLImageElement>(
          '.generation-card img, [data-state="generating"] img, [data-status="rendering"] img'
        );
        if (activeImg && activeImg.src && !activeImg.src.includes('placeholder')) {
          return activeImg.src;
        }

        return null;
      });

      if (previewSrc && jobId) {
        LivePreviewManager.attachPreviewMedia(jobId, previewSrc, 'FLOW_INTERMEDIATE');
        return previewSrc;
      }
    } catch {
      // Ignore preview extraction errors
    }
    return null;
  }

  /**
   * Polls the workspace canvas until the generation is complete and new asset(s) are ready.
   */
  public static async waitForGenerationComplete(
    page: Page,
    initialInventory: MediaAssetInfo[],
    expectedCount: number = 1,
    timeoutMs: number = 180000,
    onProgress?: (percent: number, msg: string) => void,
    jobId?: string
  ): Promise<MediaAssetInfo[]> {
    Logger.info(
      'FlowGenerationMonitor',
      `[FLOW] Monitoring generation completion (Expecting ${expectedCount} output/s, Timeout: ${Math.floor(
        timeoutMs / 1000
      )}s)...`
    );

    // Periodically check for intermediate preview while polling
    const previewCheckerInterval = setInterval(async () => {
      if (jobId && !page.isClosed()) {
        await this.checkIntermediatePreview(page, jobId);
      }
    }, 4000);

    try {
      const results = await FlowComposerController.waitForGenerationResult(
        page,
        initialInventory,
        expectedCount,
        timeoutMs,
        (percent, msg) => {
          if (onProgress) onProgress(percent, msg);
          if (jobId && percent >= 80) {
            LivePreviewManager.updateJobStage(jobId, 'RESULT_DETECTED', msg);
          }
        }
      );

      if (jobId && results.length > 0) {
        LivePreviewManager.updateJobStage(jobId, 'RESULT_READY', `Detected ${results.length} ready output asset(s)`);
      }

      return results;
    } finally {
      clearInterval(previewCheckerInterval);
    }
  }

  /**
   * Finds newly created output assets on canvas by diffing against initial inventory.
   */
  public static async findNewOutputs(page: Page, initialInventory: MediaAssetInfo[]): Promise<MediaAssetInfo[]> {
    const current = await FlowComposerController.getMediaAssetInventory(page);
    const initialIds = new Set(initialInventory.map((a) => a.id));
    return current.filter((a) => !initialIds.has(a.id));
  }
}
