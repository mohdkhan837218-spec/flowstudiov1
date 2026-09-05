import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '../../src/main/database/db';
import { JobManager } from '../../src/main/managers/JobManager';
import { QueueManager } from '../../src/main/managers/QueueManager';
import { WorkerManager } from '../../src/main/managers/WorkerManager';
import { AccountManager } from '../../src/main/managers/AccountManager';
import { PathSecurity } from '../../src/main/security/paths';
import { MockFlowProvider } from '../../src/main/providers/MockFlowProvider';

describe('JobManager & QueueManager Pipeline', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
    WorkerManager.setFlowProvider(new MockFlowProvider());
  });

  it('should create a project and enqueue its shot jobs with instant trigger', () => {
    const project = JobManager.createProject({
      name: 'Sci-Fi Scene',
      sourcePrompt: 'Space colony under attack',
      shots: [
        { id: 'shot_001', prompt: 'Dome exploding', duration: 5, aspectRatio: '16:9' },
        { id: 'shot_002', prompt: 'Evacuation ships', duration: 10, aspectRatio: '16:9' }
      ]
    });

    expect(project.id).toBeDefined();
    expect(project.totalShots).toBe(2);

    const enqueueResult = JobManager.enqueueProjectShots(project.id);
    expect(enqueueResult.success).toBe(true);
    expect(enqueueResult.jobsCount).toBe(2);

    const jobs = JobManager.listJobs(project.id);
    expect(jobs).toHaveLength(2);
  });

  it('should explain waiting reason when no workers are available', async () => {
    const project = JobManager.createProject({
      name: 'Waiting Test',
      sourcePrompt: 'Desert storm',
      shots: [{ id: 'shot_wait_01', prompt: 'Desert dune closeup', duration: 5, aspectRatio: '16:9' }]
    });

    JobManager.enqueueProjectShots(project.id);
    await QueueManager.tick();

    const summary = QueueManager.getSummary();
    expect(summary.waitingReason).toBeDefined();
  });

  it('should pause and resume queue dispatching', () => {
    QueueManager.pause();
    expect(QueueManager.getSummary().isPaused).toBe(true);

    QueueManager.resume();
    expect(QueueManager.getSummary().isPaused).toBe(false);
  });

  it('should cancel and retry specific jobs', () => {
    const jobs = JobManager.listJobs();
    if (jobs.length > 0) {
      const target = jobs[0];
      JobManager.cancelJob(target.jobId);
      expect(JobManager.getJob(target.jobId)?.status).toBe('CANCELLED');

      JobManager.retryJob(target.jobId);
      expect(JobManager.getJob(target.jobId)?.status).toBe('QUEUED');
    }
  });

  it('should atomically reserve worker to prevent concurrent dispatch races', () => {
    const account = AccountManager.createAccount({ displayName: 'Atomic Test Acct' });
    AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      email: 'atomic@gmail.com',
      flowStatus: 'READY'
    });

    const worker = WorkerManager.register(account.id);
    expect(worker).toBeDefined();
    expect(worker?.status).toBe('IDLE');

    // First reservation succeeds
    const res1 = WorkerManager.reserveWorker(worker!.workerId, 'job_atomic_01', 'Test prompt');
    expect(res1).toBe(true);

    // Second concurrent reservation on same worker fails
    const res2 = WorkerManager.reserveWorker(worker!.workerId, 'job_atomic_02', 'Test prompt 2');
    expect(res2).toBe(false);

    // Release worker
    WorkerManager.releaseWorker(worker!);
    expect(worker!.status).toBe('IDLE');
  });
});
