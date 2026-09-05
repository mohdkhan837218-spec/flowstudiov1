import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import { AppDatabase } from '../../src/main/database/db';
import { JobManager } from '../../src/main/managers/JobManager';
import { WorkerManager } from '../../src/main/managers/WorkerManager';
import { AccountManager } from '../../src/main/managers/AccountManager';
import { MockFlowProvider } from '../../src/main/providers/MockFlowProvider';
import { PathSecurity } from '../../src/main/security/paths';

describe('Direct Prompt Generation Mode (Mode B)', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
    WorkerManager.setFlowProvider(new MockFlowProvider());
  });

  it('should create exactly ONE Video job with specified parameters without storyboard decomposition', () => {
    const job = JobManager.createDirectJob({
      prompt: 'A cinematic drone shot of a futuristic cyberpunk city in rain',
      type: 'VIDEO',
      model: 'Veo 2',
      aspectRatio: '16:9',
      duration: 10
    });

    expect(job).toBeDefined();
    expect(job.jobId).toMatch(/^job_direct_/);
    expect(job.generationType).toBe('VIDEO');
    expect(job.model).toBe('Veo 2');
    expect(job.aspectRatio).toBe('16:9');
    expect(job.duration).toBe(10);
    expect(job.status).toBe('QUEUED');

    // Verify it is saved in SQLite and readable
    const fetched = JobManager.getJob(job.jobId);
    expect(fetched).toBeDefined();
    expect(fetched?.prompt).toBe('A cinematic drone shot of a futuristic cyberpunk city in rain');
    expect(fetched?.generationType).toBe('VIDEO');
    expect(fetched?.model).toBe('Veo 2');
  });

  it('should create exactly ONE Image job with duration 0', () => {
    const job = JobManager.createDirectJob({
      prompt: 'Photorealistic crystal dragonfly on misty leaf at dawn',
      type: 'IMAGE',
      model: 'Imagen 3',
      aspectRatio: '1:1'
    });

    expect(job).toBeDefined();
    expect(job.generationType).toBe('IMAGE');
    expect(job.duration).toBe(0);
    expect(job.aspectRatio).toBe('1:1');
    expect(job.model).toBe('Imagen 3');
  });

  it('should reject empty prompts with a validation error', () => {
    expect(() => {
      JobManager.createDirectJob({
        prompt: '   ',
        type: 'VIDEO'
      });
    }).toThrow('Prompt cannot be empty');
  });

  it('should execute Image and Video direct jobs to completion and produce valid output files', async () => {
    // 1. Create account & worker
    const account = AccountManager.createAccount({ displayName: 'Direct Worker Acct' });
    AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      flowStatus: 'READY'
    });
    const worker = WorkerManager.register(account.id);
    expect(worker).toBeDefined();

    // 2. Direct Video Job
    const videoJob = JobManager.createDirectJob({
      prompt: 'A comet crossing the night sky over mountain peaks',
      type: 'VIDEO',
      model: 'Veo 2',
      duration: 5,
      aspectRatio: '16:9'
    });

    await WorkerManager.executeJob(worker!, videoJob);
    const completedVid = JobManager.getJob(videoJob.jobId);
    expect(completedVid?.status).toBe('COMPLETED');
    expect(completedVid?.outputPath).toBeDefined();
    expect(fs.existsSync(completedVid!.outputPath!)).toBe(true);

    // 3. Direct Image Job
    const imageJob = JobManager.createDirectJob({
      prompt: 'Luminous crystal lotus flower in zen pond',
      type: 'IMAGE',
      model: 'Imagen 3',
      aspectRatio: '1:1'
    });

    await WorkerManager.executeJob(worker!, imageJob);
    const completedImg = JobManager.getJob(imageJob.jobId);
    expect(completedImg?.status).toBe('COMPLETED');
    expect(completedImg?.outputPath).toBeDefined();
    expect(fs.existsSync(completedImg!.outputPath!)).toBe(true);
    expect(completedImg?.outputPath?.endsWith('.png')).toBe(true);
  }, 15000);
});
