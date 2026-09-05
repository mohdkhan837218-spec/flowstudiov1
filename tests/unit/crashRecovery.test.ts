import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '../../src/main/database/db';
import { JobManager } from '../../src/main/managers/JobManager';
import { RetryManager } from '../../src/main/managers/RetryManager';
import { PathSecurity } from '../../src/main/security/paths';

describe('Crash Recovery & Retry System', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
  });

  it('should reset dangling running jobs to QUEUED upon crash recovery scan', () => {
    const project = JobManager.createProject({
      name: 'Crash Recovery Test',
      sourcePrompt: 'Crashing ship in storm',
      shots: [{ id: 'shot_crash_01', prompt: 'Lightning strike', duration: 5, aspectRatio: '16:9' }]
    });

    JobManager.enqueueProjectShots(project.id);
    const jobs = JobManager.listJobs(project.id);
    const job = jobs[0];

    // Simulate crash: job was marked RUNNING before app died
    JobManager.updateJob(job.jobId, { status: 'RUNNING', progress: 45, assignedAccountId: 'acct_temp' });
    expect(JobManager.getJob(job.jobId)?.status).toBe('RUNNING');

    // Run recovery scan
    JobManager.recoverDanglingJobs();

    // Verify job is safely reset to QUEUED
    const recovered = JobManager.getJob(job.jobId);
    expect(recovered?.status).toBe('QUEUED');
    expect(recovered?.progress).toBe(0);
    expect(recovered?.error).toContain('Recovered after application restart');
  });

  it('should differentiate recoverable from non-recoverable errors', () => {
    expect(RetryManager.isRecoverable('Network timeout connecting to server')).toBe(true);
    expect(RetryManager.isRecoverable('Chromium browser process crashed')).toBe(true);

    expect(RetryManager.isRecoverable('MANUAL_VERIFICATION_REQUIRED')).toBe(false);
    expect(RetryManager.isRecoverable('Google CAPTCHA challenge detected')).toBe(false);
    expect(RetryManager.isRecoverable('LOGIN_REQUIRED for user')).toBe(false);
  });

  it('should compute exponential backoff intervals correctly', () => {
    expect(RetryManager.getBackoffDelayMs(1)).toBe(5000);  // 5 sec
    expect(RetryManager.getBackoffDelayMs(2)).toBe(15000); // 15 sec
    expect(RetryManager.getBackoffDelayMs(3)).toBe(45000); // 45 sec
  });
});
