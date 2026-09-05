import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LivePreviewManager } from '../../src/main/preview/LivePreviewManager';
import { Job } from '../../src/shared/types/job';
import { PathSecurity } from '../../src/main/security/paths';

describe('LivePreviewManager', () => {
  beforeEach(() => {
    PathSecurity.initialize();
    LivePreviewManager.clearAll();
  });

  const createSampleJob = (overrides?: Partial<Job>): Job => ({
    jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    projectId: 'proj_001',
    shotId: 'shot_001',
    prompt: 'A futuristic city at sunset with flying cars in 8k cinematic lighting',
    status: 'QUEUED',
    generationType: 'VIDEO',
    model: 'Omni Flash',
    aspectRatio: '16:9',
    duration: 10,
    generationCount: 1,
    assignedAccountId: 'acct_01',
    assignedWorkerId: 'Worker 01',
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 2,
    ...overrides
  });

  it('should register a new active generation job with honest initial state', () => {
    const job = createSampleJob();
    const media = LivePreviewManager.registerJob(job, false);

    expect(media.jobId).toBe(job.jobId);
    expect(media.status).toBe('QUEUED');
    expect(media.previewSource).toBe('NONE');
    expect(media.timeline).toHaveLength(1);
    expect(media.timeline[0].stage).toBe('QUEUED');
    expect(media.isSandbox).toBe(false);

    const active = LivePreviewManager.getActiveGenerations();
    expect(active).toHaveLength(1);
    expect(active[0].jobId).toBe(job.jobId);

    const stats = LivePreviewManager.getStats();
    expect(stats.activeCount).toBe(1);
    expect(stats.videoCount).toBe(1);
    expect(stats.imageCount).toBe(0);
  });

  it('should update stage transitions and record timeline steps', () => {
    const job = createSampleJob();
    LivePreviewManager.registerJob(job, false);

    LivePreviewManager.updateJobStage(job.jobId, 'STARTING', 'Navigating to Google Flow workspace');
    LivePreviewManager.updateJobStage(job.jobId, 'GENERATING', 'Rendering AI diffusion frames...');

    const media = LivePreviewManager.getById(job.jobId);
    expect(media).toBeDefined();
    expect(media?.status).toBe('GENERATING');
    expect(media?.stageText).toBe('Rendering AI diffusion frames...');
    expect(media?.timeline.length).toBeGreaterThanOrEqual(3);
  });

  it('should attach intermediate preview media without guessing', () => {
    const job = createSampleJob();
    LivePreviewManager.registerJob(job, false);

    const mockDataUrl = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    LivePreviewManager.attachPreviewMedia(job.jobId, mockDataUrl, 'FLOW_INTERMEDIATE');

    const media = LivePreviewManager.getById(job.jobId);
    expect(media?.status).toBe('PREVIEW_AVAILABLE');
    expect(media?.previewSource).toBe('FLOW_INTERMEDIATE');
    expect(media?.previewUrl).toBe(mockDataUrl);
  });

  it('should handle completed generations with multi-output variations', () => {
    const job = createSampleJob({ generationCount: 2 });
    LivePreviewManager.registerJob(job, false);

    const primaryPath = path.join(os.tmpdir(), 'out_var1.mp4');
    const secondPath = path.join(os.tmpdir(), 'out_var2.mp4');
    fs.writeFileSync(primaryPath, 'mock-video-content');
    fs.writeFileSync(secondPath, 'mock-video-content-2');

    LivePreviewManager.attachCompletedOutput(job.jobId, primaryPath, [primaryPath, secondPath]);

    const media = LivePreviewManager.getById(job.jobId);
    expect(media?.status).toBe('COMPLETED');
    expect(media?.localPath).toBe(primaryPath);
    expect(media?.outputPaths).toHaveLength(2);

    const active = LivePreviewManager.getActiveGenerations();
    expect(active).toHaveLength(0);

    const recent = LivePreviewManager.getRecentGenerations();
    expect(recent).toHaveLength(1);
    expect(recent[0].jobId).toBe(job.jobId);

    const stats = LivePreviewManager.getStats();
    expect(stats.activeCount).toBe(0);
    expect(stats.completedCount).toBe(1);

    // Cleanup temp files
    if (fs.existsSync(primaryPath)) fs.unlinkSync(primaryPath);
    if (fs.existsSync(secondPath)) fs.unlinkSync(secondPath);
  });

  it('should safely convert local file to Data URL and prevent invalid path access', async () => {
    const tempFile = path.join(os.tmpdir(), `test_image_${Date.now()}.png`);
    fs.writeFileSync(tempFile, 'fake-png-binary-data');

    const dataUrl = await LivePreviewManager.getMediaDataUrl(tempFile);
    expect(dataUrl).toBeDefined();
    expect(dataUrl?.startsWith('data:image/png;base64,')).toBe(true);

    const missingUrl = await LivePreviewManager.getMediaDataUrl('C:\\non_existent_folder\\fake_file.mp4');
    expect(missingUrl).toBeNull();

    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });
});
