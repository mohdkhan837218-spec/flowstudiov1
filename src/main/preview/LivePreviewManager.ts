import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { GenerationMedia, GenerationMediaStatus, LiveGenerationStats, PreviewSource } from '../../shared/types/preview';
import { Job } from '../../shared/types/job';
import { AppDatabase } from '../database/db';
import { AccountManager } from '../managers/AccountManager';
import { Logger } from '../logging/logger';

export class LivePreviewManager {
  private static mediaMap: Map<string, GenerationMedia> = new Map();
  private static cacheDir: string = path.join(process.cwd(), 'app-data', 'runtime', 'media-cache');

  public static initialize(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Broadcasts generation media updates to all Electron renderer windows.
   */
  public static notifyGenerationUpdated(media: GenerationMedia): void {
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('generation:updated', media);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }
  }

  public static notifyGenerationRemoved(jobId: string): void {
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('generation:removed', jobId);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }
  }

  /**
   * Registers or updates a job inside the live preview monitor.
   */
  public static registerJob(job: Job, isSandbox: boolean = false): GenerationMedia {
    const existing = this.mediaMap.get(job.jobId);
    const account = job.assignedAccountId ? AccountManager.getAccount(job.assignedAccountId) : null;
    const accountDisplayName = account?.displayName || job.assignedAccountId || 'Unassigned';

    const now = new Date().toISOString();
    const isImage = job.generationType === 'IMAGE';

    let status: GenerationMediaStatus = 'QUEUED';
    if (job.status === 'COMPLETED') status = 'COMPLETED';
    else if (job.status === 'FAILED' || job.status === 'MANUAL_ACTION_REQUIRED') status = 'FAILED';
    else if (job.status === 'CANCELLED') status = 'CANCELLED';
    else if (job.status === 'DOWNLOADING' || job.status === 'VERIFYING_DOWNLOAD') status = 'DOWNLOADING';
    else if (job.status === 'RESULT_DETECTED') status = 'RESULT_DETECTED';
    else if (job.status === 'GENERATING' || job.status === 'SUBMITTING') status = 'GENERATING';
    else if (job.status === 'STARTING' || job.status === 'OPENING_FLOW' || job.status === 'FLOW_INITIALIZING') status = 'STARTING';

    const media: GenerationMedia = {
      jobId: job.jobId,
      projectId: job.projectId,
      shotId: job.shotId,
      accountId: job.assignedAccountId || '',
      accountDisplayName,
      workerId: job.assignedWorkerId || job.workerId || 'Worker --',
      prompt: job.prompt,
      generationType: job.generationType || 'VIDEO',
      status,
      previewUrl: existing?.previewUrl || null,
      previewSource: existing?.previewSource || (isSandbox ? 'LOCAL_SANDBOX' : 'NONE'),
      resultUrl: existing?.resultUrl || null,
      localPath: job.outputPath || existing?.localPath || null,
      outputPaths: job.outputPaths || (job.outputPath ? [job.outputPath] : existing?.outputPaths || []),
      aspectRatio: job.aspectRatio || (isImage ? '1:1' : '16:9'),
      duration: job.duration,
      model: job.model || null,
      generationCount: job.generationCount || 1,
      downloadQuality: job.downloadQuality || '720p',
      isSandbox,
      flowProjectId: job.flowProjectId || null,
      elapsedMs: existing?.startedAt ? Date.now() - new Date(existing.startedAt).getTime() : 0,
      startedAt: job.startedAt || existing?.startedAt || (status !== 'QUEUED' ? now : null),
      completedAt: job.completedAt || existing?.completedAt || null,
      stageText: job.statusDetail || (status === 'GENERATING' ? `Generating ${isImage ? 'image' : 'video'}...` : status),
      error: job.error || null,
      diagnosticError: (job as any).diagnosticError || null,
      timeline: existing?.timeline || [
        {
          timestamp: now,
          stage: 'QUEUED',
          message: 'Job enqueued for dispatch',
          status: 'completed'
        }
      ]
    };

    // If completed and localPath exists, set resultUrl
    if (job.status === 'COMPLETED' && job.outputPath) {
      media.resultUrl = job.outputPath;
      media.previewSource = isSandbox ? 'LOCAL_SANDBOX' : 'FLOW_RESULT';
      media.status = 'COMPLETED';
    }

    this.mediaMap.set(job.jobId, media);
    this.notifyGenerationUpdated(media);
    return media;
  }

  /**
   * Updates state transition with honest timeline logging.
   */
  public static updateJobStage(
    jobId: string,
    status: GenerationMediaStatus,
    stageText?: string,
    extra?: Partial<GenerationMedia>
  ): GenerationMedia | null {
    let media = this.mediaMap.get(jobId);
    if (!media) {
      const dbJob = AppDatabase.getJob(jobId);
      if (dbJob) {
        media = this.registerJob(dbJob);
      } else {
        return null;
      }
    }

    media.status = status;
    if (stageText) media.stageText = stageText;
    if (extra) Object.assign(media, extra);

    if (media.startedAt) {
      media.elapsedMs = Date.now() - new Date(media.startedAt).getTime();
    }

    const now = new Date().toISOString();
    media.timeline.push({
      timestamp: now,
      stage: status,
      message: stageText || `Transitioned to ${status}`,
      status: status === 'FAILED' ? 'failed' : 'completed'
    });

    this.mediaMap.set(jobId, media);
    this.notifyGenerationUpdated(media);
    return media;
  }

  /**
   * Attaches genuine intermediate preview or detected result asset.
   */
  public static attachPreviewMedia(
    jobId: string,
    mediaPathOrUrl: string,
    source: PreviewSource
  ): void {
    const media = this.mediaMap.get(jobId);
    if (!media) return;

    media.previewUrl = mediaPathOrUrl;
    media.previewSource = source;
    if (source === 'FLOW_RESULT') {
      media.resultUrl = mediaPathOrUrl;
      media.status = 'RESULT_READY';
    } else if (source === 'FLOW_INTERMEDIATE') {
      media.status = 'PREVIEW_AVAILABLE';
    }

    this.mediaMap.set(jobId, media);
    this.notifyGenerationUpdated(media);
    Logger.info('LivePreviewManager', `Attached ${source} media to job ${jobId}`, media.accountId, jobId);
  }

  /**
   * Attaches completed download outputs.
   */
  public static attachCompletedOutput(
    jobId: string,
    outputPath: string,
    outputPaths: string[] = [outputPath]
  ): void {
    const media = this.mediaMap.get(jobId);
    if (!media) return;

    media.status = 'COMPLETED';
    media.localPath = outputPath;
    media.resultUrl = outputPath;
    media.outputPaths = outputPaths;
    media.completedAt = new Date().toISOString();
    media.previewSource = media.isSandbox ? 'LOCAL_SANDBOX' : 'FLOW_RESULT';
    media.stageText = `${media.generationType === 'IMAGE' ? 'Image' : 'Video'} generation complete`;

    if (media.startedAt) {
      media.elapsedMs = Date.now() - new Date(media.startedAt).getTime();
    }

    this.mediaMap.set(jobId, media);
    this.notifyGenerationUpdated(media);
  }

  /**
   * Retrieves active running or generating jobs.
   */
  public static getActiveGenerations(): GenerationMedia[] {
    this.syncWithDatabase();
    return Array.from(this.mediaMap.values()).filter(
      (m) =>
        m.status !== 'COMPLETED' &&
        m.status !== 'FAILED' &&
        m.status !== 'CANCELLED'
    );
  }

  /**
   * Retrieves recently completed generations for history.
   */
  public static getRecentGenerations(limit: number = 30): GenerationMedia[] {
    this.syncWithDatabase();
    return Array.from(this.mediaMap.values())
      .filter((m) => m.status === 'COMPLETED' || m.status === 'FAILED')
      .sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }

  public static getById(jobId: string): GenerationMedia | null {
    this.syncWithDatabase();
    return this.mediaMap.get(jobId) || null;
  }

  public static getStats(): LiveGenerationStats {
    this.syncWithDatabase();
    const all = Array.from(this.mediaMap.values());
    const active = all.filter(
      (m) => m.status !== 'COMPLETED' && m.status !== 'FAILED' && m.status !== 'CANCELLED'
    );

    return {
      activeCount: active.length,
      videoCount: active.filter((m) => m.generationType === 'VIDEO').length,
      imageCount: active.filter((m) => m.generationType === 'IMAGE').length,
      completedCount: all.filter((m) => m.status === 'COMPLETED').length,
      failedCount: all.filter((m) => m.status === 'FAILED').length
    };
  }

  public static remove(jobId: string): boolean {
    const deleted = this.mediaMap.delete(jobId);
    if (deleted) {
      this.notifyGenerationRemoved(jobId);
    }
    return deleted;
  }

  /**
   * Safely reads a local media file and converts to base64 Data URL for the renderer.
   */
  public static async getMediaDataUrl(filePath: string): Promise<string | null> {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null;
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'video/mp4';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';

      const fileBuffer = await fs.promises.readFile(filePath);
      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    } catch (err: any) {
      Logger.error('LivePreviewManager', `Failed to read media file ${filePath}: ${err.message}`);
      return null;
    }
  }

  /**
   * Synchronizes in-memory preview state with persisted database jobs.
   */
  private static syncWithDatabase(): void {
    try {
      const dbJobs = AppDatabase.getJobs();
      for (const job of dbJobs) {
        if (!this.mediaMap.has(job.jobId)) {
          this.registerJob(job);
        } else {
          const current = this.mediaMap.get(job.jobId)!;
          if (job.status === 'COMPLETED' && current.status !== 'COMPLETED') {
            current.status = 'COMPLETED';
            current.localPath = job.outputPath || current.localPath;
            current.outputPaths = job.outputPaths || (job.outputPath ? [job.outputPath] : current.outputPaths);
            current.completedAt = job.completedAt || new Date().toISOString();
          } else if ((job.status === 'FAILED' || job.status === 'MANUAL_ACTION_REQUIRED') && current.status !== 'FAILED') {
            current.status = 'FAILED';
            current.error = job.error || current.error;
          }
        }
      }
    } catch {
      // Ignore during bootstrap
    }
  }

  /**
   * Resets all preview state (used for testing).
   */
  public static clearAll(): void {
    this.mediaMap.clear();
  }
}
