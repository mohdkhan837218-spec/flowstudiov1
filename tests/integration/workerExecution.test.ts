import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '../../src/main/database/db';
import { AccountManager } from '../../src/main/managers/AccountManager';
import { JobManager } from '../../src/main/managers/JobManager';
import { WorkerManager } from '../../src/main/managers/WorkerManager';
import { QueueManager } from '../../src/main/managers/QueueManager';
import { MockFlowProvider } from '../../src/main/providers/MockFlowProvider';
import { DownloadManager } from '../../src/main/managers/DownloadManager';
import { PathSecurity } from '../../src/main/security/paths';
import fs from 'fs';

describe('Worker & Queue Execution Pipeline', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
    WorkerManager.setFlowProvider(new MockFlowProvider());
  });

  it('should automatically process queued jobs when worker is registered', async () => {
    // 1. Create connected account
    const account = AccountManager.createAccount({ displayName: 'Pipeline Worker 01' });
    AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      email: 'pipeline01@gmail.com',
      flowStatus: 'READY'
    });

    // 2. Create project with multiple shots
    const project = JobManager.createProject({
      name: 'Multi Shot Test',
      sourcePrompt: 'Solar flare hitting space station',
      shots: [
        { id: 'shot_pipe_01', prompt: 'Solar flare closeup', duration: 5, aspectRatio: '16:9' },
        { id: 'shot_pipe_02', prompt: 'Station shields flickering', duration: 5, aspectRatio: '16:9' }
      ]
    });

    // 3. Enqueue shots
    JobManager.enqueueProjectShots(project.id);
    const jobs = JobManager.listJobs(project.id);
    expect(jobs).toHaveLength(2);

    // 4. Register worker
    const worker = WorkerManager.register(account.id);
    expect(worker).toBeDefined();

    // 5. Trigger queue processing
    await QueueManager.tick();

    // 6. First job should be executed
    const firstJob = jobs[0];
    await WorkerManager.executeJob(worker!, firstJob);

    const completedFirstJob = JobManager.getJob(firstJob.jobId);
    expect(completedFirstJob?.status).toBe('COMPLETED');
    expect(completedFirstJob?.outputPath).toBeDefined();
    expect(fs.existsSync(completedFirstJob!.outputPath!)).toBe(true);

    // Worker is automatically released back to IDLE
    expect(worker?.status).toBe('IDLE');
  }, 20000);
});
