import { BrowserWindow } from 'electron';
import { QueueSummary, Job } from '../../shared/types/job';
import { JobManager } from './JobManager';
import { WorkerManager } from './WorkerManager';
import { AccountManager } from './AccountManager';
import { AppDatabase } from '../database/db';
import { Logger } from '../logging/logger';

export class QueueManager {
  private static isPaused = false;
  private static dispatcherTimer: NodeJS.Timeout | null = null;
  private static isDispatching = false;
  private static heartbeatCounter = 0;

  public static initialize(): void {
    if (this.dispatcherTimer) return;
    Logger.info('QueueManager', 'Starting background job queue dispatcher and scheduler');
    this.dispatcherTimer = setInterval(() => this.tick(), 1000);
  }

  public static start(): void {
    this.initialize();
  }

  public static stop(): void {
    if (this.dispatcherTimer) {
      clearInterval(this.dispatcherTimer);
      this.dispatcherTimer = null;
    }
  }

  private static notifyQueueUpdated(): void {
    const summary = this.getSummary();
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('queue:updated', summary);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }
  }

  public static getSummary(): QueueSummary {
    const jobs = AppDatabase.getJobs();
    const settings = AppDatabase.getSettings();

    const queued = jobs.filter((j) => j.status === 'QUEUED').length;
    const waiting = jobs.filter((j) => j.status === 'WAITING_FOR_WORKER').length;
    const running = jobs.filter(
      (j) =>
        j.status === 'RUNNING' ||
        j.status === 'STARTING' ||
        j.status === 'FLOW_INITIALIZING' ||
        j.status === 'FLOW_READY' ||
        j.status === 'SUBMITTING' ||
        j.status === 'GENERATING' ||
        j.status === 'DOWNLOADING' ||
        j.status === 'ASSIGNED'
    ).length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failed = jobs.filter((j) => j.status === 'FAILED' || j.status === 'MANUAL_ACTION_REQUIRED').length;
    const activeWorkers = WorkerManager.getActiveWorkerCount();

    // Determine current waiting reason if applicable
    let waitingReason: string | null = null;
    if (queued > 0 || waiting > 0) {
      const accounts = AccountManager.listAccounts();
      const connectedCount = accounts.filter((a) => a.email || a.status === 'CONNECTED' || a.status === 'FLOW_READY').length;
      const flowReadyCount = accounts.filter((a) => a.flowStatus === 'READY' || a.status === 'FLOW_READY').length;
      const concurrencyLimit = settings.maxConcurrentWorkers || 3;

      if (accounts.length === 0) {
        waitingReason = 'No Google accounts configured. Connect an account in Accounts tab.';
      } else if (connectedCount === 0) {
        waitingReason = 'No Google accounts authenticated. Login required.';
      } else if (activeWorkers >= concurrencyLimit) {
        waitingReason = `Concurrency limit reached (${activeWorkers}/${concurrencyLimit} active).`;
      } else if (flowReadyCount === 0) {
        waitingReason = 'Accounts ready. Launching Google Flow...';
      } else {
        waitingReason = 'All available workers currently busy.';
      }
    }

    return {
      totalJobs: jobs.length,
      queued,
      waiting,
      running,
      completed,
      failed,
      activeWorkers,
      isPaused: this.isPaused,
      concurrencyLimit: settings.maxConcurrentWorkers || 3,
      waitingReason
    };
  }

  public static pause(): boolean {
    this.isPaused = true;
    Logger.info('QueueManager', 'Job dispatcher paused by user');
    this.notifyQueueUpdated();
    return true;
  }

  public static resume(): boolean {
    this.isPaused = false;
    Logger.info('QueueManager', 'Job dispatcher resumed');
    this.notifyQueueUpdated();
    this.process();
    return true;
  }

  public static clear(): boolean {
    const queuedJobs = AppDatabase.getJobs().filter(
      (j) => j.status === 'QUEUED' || j.status === 'WAITING_FOR_WORKER'
    );
    queuedJobs.forEach((job) => {
      JobManager.cancelJob(job.jobId);
    });
    Logger.info('QueueManager', `Cancelled ${queuedJobs.length} queued jobs`);
    this.notifyQueueUpdated();
    return true;
  }

  // ================= EVENT TRIGGERS =================

  public static onJobQueued(): void {
    Logger.debug('QueueManager', '[EVENT] onJobQueued triggered');
    this.process();
  }

  public static onWorkerAvailable(accountId: string): void {
    Logger.debug('QueueManager', `[EVENT] onWorkerAvailable triggered for ${accountId}`);
    this.process();
  }

  public static onJobCompleted(jobId: string): void {
    Logger.debug('QueueManager', `[EVENT] onJobCompleted triggered for ${jobId}`);
    this.process();
  }

  public static onJobFailed(jobId: string): void {
    Logger.debug('QueueManager', `[EVENT] onJobFailed triggered for ${jobId}`);
    this.process();
  }

  /**
   * Immediate dispatch execution entry point.
   */
  public static process(): void {
    setImmediate(() => {
      this.tick().catch((err) => {
        Logger.error('QueueManager', `Error in process tick: ${err.message}`, null, null, { error: String(err) });
      });
    });
  }

  /**
   * Main Dispatcher Loop Tick with Atomic Reservation and Fallback Explanation.
   */
  public static async tick(): Promise<void> {
    if (this.isPaused || this.isDispatching) return;

    this.isDispatching = true;
    try {
      const settings = AppDatabase.getSettings();
      const maxConcurrency = Math.max(1, Number(settings.maxConcurrentWorkers) || 3);
      const activeWorkerCount = WorkerManager.getActiveWorkerCount();

      // Periodic heartbeat logging
      this.heartbeatCounter++;
      if (this.heartbeatCounter % 10 === 0) {
        const summary = this.getSummary();
        if (summary.queued > 0 || summary.waiting > 0 || summary.running > 0) {
          Logger.debug(
            'QueueManager',
            `[QUEUE HEARTBEAT] Queued: ${summary.queued}, Waiting: ${summary.waiting}, Running: ${summary.running}, Active Workers: ${summary.activeWorkers}/${maxConcurrency}`
          );
        }
      }

      // 1. Concurrency limit backpressure check
      if (activeWorkerCount >= maxConcurrency) {
        return;
      }

      // 2. Fetch pending jobs (QUEUED or WAITING_FOR_WORKER)
      const allJobs = AppDatabase.getJobs();
      const pendingJobs = allJobs.filter((j) => j.status === 'QUEUED' || j.status === 'WAITING_FOR_WORKER');

      if (pendingJobs.length === 0) {
        return;
      }

      // 3. Find Idle Workers
      const idleWorkers = WorkerManager.getIdleWorkers();

      if (idleWorkers.length === 0) {
        // Explain why jobs are waiting
        const accounts = AccountManager.listAccounts();
        const connectedAccounts = accounts.filter((a) => WorkerManager.isAccountCandidate(a));

        let detail = 'Waiting for available worker';
        if (accounts.length === 0) {
          detail = 'Waiting: No Google accounts configured';
        } else if (connectedAccounts.length === 0) {
          detail = 'Waiting: No authenticated Google accounts';
        } else if (activeWorkerCount >= maxConcurrency) {
          detail = `Waiting: Maximum concurrency reached (${activeWorkerCount}/${maxConcurrency})`;
        } else {
          detail = 'Waiting: All connected workers busy';
        }

        // Update first few pending jobs to WAITING_FOR_WORKER with reason
        pendingJobs.slice(0, 5).forEach((j) => {
          if (j.status === 'QUEUED' || j.statusDetail !== detail) {
            JobManager.updateJob(j.jobId, {
              status: 'WAITING_FOR_WORKER',
              statusDetail: detail
            });
          }
        });

        return;
      }

      // 4. Match and dispatch jobs to idle workers
      for (const nextJob of pendingJobs) {
        if (WorkerManager.getActiveWorkerCount() >= maxConcurrency) {
          break;
        }

        // Strategy: Least Loaded Worker (lowest jobsCompleted)
        const currentIdle = WorkerManager.getIdleWorkers();
        if (currentIdle.length === 0) break;

        // Prioritize Flow-ready workers first, then candidates
        currentIdle.sort((a, b) => {
          const acctA = AccountManager.getAccount(a.accountId);
          const acctB = AccountManager.getAccount(b.accountId);
          const readyA = acctA?.flowStatus === 'READY' ? 1 : 0;
          const readyB = acctB?.flowStatus === 'READY' ? 1 : 0;
          if (readyA !== readyB) return readyB - readyA;
          return a.jobsCompleted - b.jobsCompleted;
        });

        const selectedWorker = currentIdle[0];

        // 5. Atomic reservation: immediately mark worker ASSIGNED and job ASSIGNED
        const reserved = WorkerManager.reserveWorker(selectedWorker.workerId, nextJob.jobId, nextJob.prompt);
        if (!reserved) continue;

        JobManager.updateJob(nextJob.jobId, {
          status: 'ASSIGNED',
          statusDetail: `Assigned to ${selectedWorker.accountDisplayName} (${selectedWorker.workerId})`,
          assignedAccountId: selectedWorker.accountId,
          assignedWorkerId: selectedWorker.workerId,
          workerId: selectedWorker.workerId
        });

        Logger.info(
          'QueueManager',
          `[QUEUE DISPATCH] Assigned job ${nextJob.jobId} to worker ${selectedWorker.workerId} (${selectedWorker.accountDisplayName})`,
          selectedWorker.accountId,
          nextJob.jobId
        );

        // 6. Launch asynchronous job execution pipeline
        WorkerManager.executeJob(selectedWorker, nextJob).catch((execErr) => {
          Logger.error('QueueManager', `Unhandled error executing job ${nextJob.jobId}: ${execErr.message}`, selectedWorker.accountId, nextJob.jobId);
        });
      }

      this.notifyQueueUpdated();
    } catch (err: any) {
      Logger.error('QueueManager', `Error during dispatch loop: ${err.message}`, null, null, { error: String(err) });
    } finally {
      this.isDispatching = false;
    }
  }
}
