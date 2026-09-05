import { BrowserWindow } from 'electron';
import { AccountManager } from './AccountManager';
import { JobManager } from './JobManager';
import { DownloadManager } from './DownloadManager';
import { RetryManager } from './RetryManager';
import { Logger } from '../logging/logger';
import { IFlowProvider } from '../providers/IFlowProvider';
import { FlowProvider } from '../providers/FlowProvider';
import { MockFlowProvider } from '../providers/MockFlowProvider';
import { Job, WorkerSession } from '../../shared/types/job';
import { GoogleAccount } from '../../shared/types/account';
import { QueueManager } from './QueueManager';
import { LivePreviewManager } from '../preview/LivePreviewManager';

export class WorkerManager {
  private static workers: Map<string, WorkerSession> = new Map();
  private static flowProvider: IFlowProvider = new FlowProvider();

  public static setFlowProvider(provider: IFlowProvider): void {
    this.flowProvider = provider;
  }

  public static getFlowProvider(): IFlowProvider {
    return this.flowProvider;
  }

  /**
   * Broadcasts worker session updates to Electron renderer windows.
   */
  public static notifyWorkerUpdated(worker: WorkerSession): void {
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('worker:updated', worker);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }
  }

  /**
   * Verifies if an account is strictly ready to receive Flow jobs immediately.
   */
  public static canStartWorker(account: GoogleAccount): boolean {
    if (account.status === 'PAUSED' || account.status === 'ERROR' || account.status === 'REMOVED') {
      return false;
    }
    // Must be authenticated
    const isGoogleConnected =
      Boolean(account.email) ||
      account.status === 'CONNECTED' ||
      account.status === 'FLOW_READY' ||
      account.status === 'GOOGLE_AUTHENTICATED' ||
      account.status === 'OPEN';

    if (!isGoogleConnected) return false;

    // Simulation provider is always ready
    if (this.flowProvider.providerName === 'MockFlowProvider') {
      return true;
    }

    return account.flowStatus === 'READY' || account.status === 'FLOW_READY';
  }

  /**
   * Checks if an account is capable of being initialized into a Flow worker.
   */
  public static isAccountCandidate(account: GoogleAccount): boolean {
    if (account.status === 'PAUSED' || account.status === 'ERROR' || account.status === 'REMOVED') {
      return false;
    }
    return Boolean(
      account.email ||
      account.status === 'CONNECTED' ||
      account.status === 'FLOW_READY' ||
      account.status === 'GOOGLE_AUTHENTICATED' ||
      account.status === 'OPEN'
    );
  }

  /**
   * Explicitly registers an account as an idle worker and triggers queue dispatch.
   */
  public static register(accountId: string): WorkerSession | null {
    const account = AccountManager.getAccount(accountId);
    if (!account) return null;

    let worker = this.workers.get(accountId);
    if (!worker) {
      worker = {
        workerId: `worker_${accountId.replace('acct_', '')}`,
        accountId: account.id,
        accountDisplayName: account.displayName,
        accountEmail: account.email,
        status: 'IDLE',
        currentJobId: null,
        currentJobPrompt: null,
        currentProgress: 0,
        lastActiveAt: new Date().toISOString(),
        jobsCompleted: 0,
        jobsFailed: 0,
        lastError: null
      };
      this.workers.set(accountId, worker);
    } else {
      worker.status = 'IDLE';
      worker.accountDisplayName = account.displayName;
      worker.accountEmail = account.email;
    }

    this.notifyWorkerUpdated(worker);
    Logger.info('WorkerManager', `Worker ${worker.workerId} registered and IDLE for account ${account.displayName}`, accountId);

    // Notify queue manager that a worker is available
    QueueManager.onWorkerAvailable(accountId);
    return worker;
  }

  /**
   * Synchronizes worker pool with all eligible Google accounts.
   */
  public static syncWorkers(): WorkerSession[] {
    const accounts = AccountManager.listAccounts();
    const candidateAccounts = accounts.filter((a) => this.isAccountCandidate(a));

    candidateAccounts.forEach((acct) => {
      let worker = this.workers.get(acct.id);
      if (!worker) {
        worker = {
          workerId: `worker_${acct.id.replace('acct_', '')}`,
          accountId: acct.id,
          accountDisplayName: acct.displayName,
          accountEmail: acct.email,
          status: 'IDLE',
          currentJobId: null,
          currentJobPrompt: null,
          currentProgress: 0,
          lastActiveAt: new Date().toISOString(),
          jobsCompleted: 0,
          jobsFailed: 0,
          lastError: null
        };
        this.workers.set(acct.id, worker);
        this.notifyWorkerUpdated(worker);
      } else {
        worker.accountDisplayName = acct.displayName;
        worker.accountEmail = acct.email;
      }
    });

    // Remove workers for disconnected or removed accounts
    const candidateIds = new Set(candidateAccounts.map((a) => a.id));
    for (const [accountId, worker] of this.workers.entries()) {
      if (!candidateIds.has(accountId) && worker.status === 'IDLE') {
        this.workers.delete(accountId);
      }
    }

    return Array.from(this.workers.values());
  }

  public static listWorkers(): WorkerSession[] {
    this.syncWorkers();
    return Array.from(this.workers.values());
  }

  public static getIdleWorkers(): WorkerSession[] {
    this.syncWorkers();
    return Array.from(this.workers.values()).filter((w) => w.status === 'IDLE');
  }

  public static getActiveWorkerCount(): number {
    return Array.from(this.workers.values()).filter((w) => w.status !== 'IDLE').length;
  }

  /**
   * Reserves a worker atomically to prevent concurrent job dispatch races.
   */
  public static reserveWorker(workerId: string, jobId: string, jobPrompt: string): boolean {
    const worker = Array.from(this.workers.values()).find((w) => w.workerId === workerId);
    if (!worker || worker.status !== 'IDLE') {
      return false;
    }

    worker.status = 'ASSIGNED';
    worker.currentJobId = jobId;
    worker.currentJobPrompt = jobPrompt;
    worker.currentProgress = 0;
    worker.lastActiveAt = new Date().toISOString();
    this.notifyWorkerUpdated(worker);

    AccountManager.updateAccount(worker.accountId, {
      status: 'BUSY',
      browserStatus: 'BUSY'
    });

    return true;
  }

  /**
   * Executes a job strictly on its assigned account's worker through all required stages.
   */
  public static async executeJob(worker: WorkerSession, job: Job): Promise<void> {
    const account = AccountManager.getAccount(worker.accountId);
    if (!account) {
      JobManager.updateJob(job.jobId, {
        status: 'FAILED',
        statusDetail: 'Assigned account no longer exists',
        error: 'Assigned account not found'
      });
      this.releaseWorker(worker);
      QueueManager.process();
      return;
    }

    Logger.info('WorkerManager', `[WORKER START] Executing job ${job.jobId} on worker ${worker.workerId} (${account.displayName})`, worker.accountId, job.jobId);

    const isSandbox = this.flowProvider.providerName === 'MockFlowProvider';
    LivePreviewManager.registerJob(job, isSandbox);
    LivePreviewManager.updateJobStage(job.jobId, 'STARTING', 'Preparing environment and browser profile');

    // 1. Stage: STARTING
    JobManager.updateJob(job.jobId, {
      status: 'STARTING',
      statusDetail: 'Preparing environment and browser profile',
      assignedAccountId: worker.accountId,
      assignedWorkerId: worker.workerId,
      workerId: worker.workerId,
      startedAt: new Date().toISOString(),
      progress: 5
    });

    try {
      // 2. Stage: Check / Initialize Google Flow if not already ready
      const isAlreadyFlowReady =
        account.flowStatus === 'READY' ||
        account.flowStatus === 'FLOW_READY' ||
        account.flowStatus === 'FLOW_HOME' ||
        account.flowStatus === 'NEW_PROJECT_READY' ||
        account.flowStatus === 'GENERATION_READY';

      if (!isAlreadyFlowReady && this.flowProvider.providerName !== 'MockFlowProvider') {
        Logger.info('WorkerManager', `[FLOW INITIALIZING] Account ${account.displayName} not yet Flow Ready. Launching Flow...`, worker.accountId, job.jobId);
        
        worker.status = 'INITIALIZING_FLOW';
        this.notifyWorkerUpdated(worker);

        LivePreviewManager.updateJobStage(job.jobId, 'STARTING', 'Navigating to Google Flow workspace');

        JobManager.updateJob(job.jobId, {
          status: 'FLOW_INITIALIZING',
          statusDetail: 'Navigating to Google Flow workspace',
          progress: 10
        });

        const flowResult = await FlowProvider.openFlowForAccount(worker.accountId);
        const isVerifiedFlowState =
          flowResult.success ||
          flowResult.state === 'READY' ||
          flowResult.state === 'FLOW_READY' ||
          flowResult.state === 'FLOW_HOME' ||
          flowResult.state === 'NEW_PROJECT_READY' ||
          flowResult.state === 'GENERATION_READY';

        if (!isVerifiedFlowState) {
          if (flowResult.state === 'MANUAL_ACTION_REQUIRED' || flowResult.state === 'ONBOARDING_REQUIRED') {
            JobManager.updateJob(job.jobId, {
              status: 'MANUAL_ACTION_REQUIRED',
              statusDetail: 'Google verification or terms consent required in browser window',
              error: flowResult.error || 'Manual action required'
            });
            LivePreviewManager.updateJobStage(job.jobId, 'FAILED', 'Manual action required');
            worker.jobsFailed++;
            return;
          }
          throw new Error(flowResult.error || 'FLOW_PAGE_LOADING_TIMEOUT: Failed to confirm Google Flow workspace readiness');
        }

        JobManager.updateJob(job.jobId, {
          status: 'FLOW_READY',
          statusDetail: 'Google Flow verified and ready',
          progress: 20
        });
      }

      // 3. Stage: SUBMITTING / GENERATING
      worker.status = 'RUNNING_FLOW';
      this.notifyWorkerUpdated(worker);
      LivePreviewManager.updateJobStage(job.jobId, 'GENERATING', 'Submitting prompt to Flow generator');

      JobManager.updateJob(job.jobId, {
        status: 'SUBMITTING',
        statusDetail: 'Submitting prompt to Flow generator',
        progress: 25
      });

      const destinationPath = DownloadManager.generateShotOutputPath(job.projectId, job.shotId);

      // Execute generation (Video or Image)
      const isImage = job.generationType === 'IMAGE';
      const typeLabel = isImage ? 'Image' : 'Video';

      const result = await this.flowProvider.executeJob(
        worker.accountId,
        job.prompt,
        destinationPath,
        {
          type: job.generationType || 'VIDEO',
          inputMode: job.inputMode || 'NONE',
          model: job.model || undefined,
          duration: job.duration,
          aspectRatio: job.aspectRatio,
          generationCount: job.generationCount || 1,
          downloadQuality: job.downloadQuality || '720p'
        },
        (progressPercent, statusMsg) => {
          worker.currentProgress = progressPercent;
          this.notifyWorkerUpdated(worker);
          
          let jobStatus: any = 'GENERATING';
          let mediaStatus: any = 'GENERATING';

          if (progressPercent <= 15) {
            jobStatus = 'OPENING_FLOW';
            mediaStatus = 'STARTING';
          } else if (progressPercent <= 25) {
            jobStatus = 'CREATING_PROJECT';
            mediaStatus = 'STARTING';
          } else if (progressPercent <= 35) {
            jobStatus = 'OPENING_PROJECT';
            mediaStatus = 'STARTING';
          } else if (progressPercent <= 45) {
            jobStatus = 'FINDING_COMPOSER';
            mediaStatus = 'STARTING';
          } else if (progressPercent <= 52) {
            jobStatus = 'APPLYING_SETTINGS';
            mediaStatus = 'STARTING';
          } else if (progressPercent <= 56) {
            jobStatus = 'PROMPT_ENTERED';
            mediaStatus = 'STARTING';
          } else if (progressPercent <= 59) {
            jobStatus = 'READY_TO_SUBMIT';
            mediaStatus = 'STARTING';
          } else if (progressPercent <= 65) {
            jobStatus = 'SUBMITTING';
            mediaStatus = 'GENERATING';
          } else if (progressPercent <= 78) {
            jobStatus = 'GENERATING';
            mediaStatus = 'GENERATING';
          } else if (progressPercent <= 88) {
            jobStatus = 'RESULT_DETECTED';
            mediaStatus = 'RESULT_DETECTED';
          } else if (progressPercent <= 96) {
            jobStatus = 'DOWNLOADING';
            mediaStatus = 'DOWNLOADING';
          } else if (progressPercent < 100) {
            jobStatus = 'VERIFYING_DOWNLOAD';
            mediaStatus = 'DOWNLOADING';
          }

          LivePreviewManager.updateJobStage(job.jobId, mediaStatus, statusMsg);

          JobManager.updateJob(job.jobId, {
            status: jobStatus,
            statusDetail: statusMsg || `Generating ${typeLabel.toLowerCase()} (${progressPercent}%)`,
            progress: progressPercent
          });
        }
      );

      // 4. Stage: DOWNLOADING & VERIFICATION
      if (result.success && result.outputPath && DownloadManager.verifyFile(result.outputPath)) {
        const outputPaths = result.outputPaths && result.outputPaths.length > 0 ? result.outputPaths : [result.outputPath];

        LivePreviewManager.attachCompletedOutput(job.jobId, result.outputPath, outputPaths);

        JobManager.updateJob(job.jobId, {
          status: 'COMPLETED',
          statusDetail: `${typeLabel} generated and downloaded successfully`,
          progress: 100,
          completedAt: new Date().toISOString(),
          outputPath: result.outputPath,
          outputPaths,
          error: null
        });

        worker.jobsCompleted++;
        Logger.success('WorkerManager', `[JOB COMPLETED] Job ${job.jobId} finished successfully! Saved to ${result.outputPath}`, worker.accountId, job.jobId);
        QueueManager.onJobCompleted(job.jobId);
      } else if (result.isHumanVerificationRequired) {
        AccountManager.updateAccount(worker.accountId, {
          status: 'MANUAL_ACTION_REQUIRED',
          lastError: 'Manual Google verification required'
        });

        LivePreviewManager.updateJobStage(job.jobId, 'FAILED', 'Google security verification challenge active');

        JobManager.updateJob(job.jobId, {
          status: 'MANUAL_ACTION_REQUIRED',
          statusDetail: 'Google security verification challenge active',
          error: 'Manual Google verification or challenge triggered. Automation paused.'
        });

        worker.jobsFailed++;
        worker.lastError = 'Manual verification required';
      } else {
        const diagError = result.diagnosticError || null;
        LivePreviewManager.updateJobStage(job.jobId, 'FAILED', result.error || 'Generation failed', {
          error: result.error,
          diagnosticError: diagError
        });

        JobManager.updateJob(job.jobId, {
          status: 'FAILED',
          statusDetail: `Execution failed: ${result.error || 'Unknown error'}`,
          error: result.error || 'Video generation failed or output corrupted',
          diagnosticError: diagError
        });
        worker.jobsFailed++;
        worker.diagnosticError = diagError;
        QueueManager.onJobFailed(job.jobId);
      }
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      Logger.error('WorkerManager', `[JOB ERROR] Job ${job.jobId} failed: ${errorMsg}`, worker.accountId, job.jobId);

      LivePreviewManager.updateJobStage(job.jobId, 'FAILED', errorMsg, { error: errorMsg });

      const isRecoverable = RetryManager.isRecoverable(errorMsg);
      const canRetry = isRecoverable && job.retryCount < job.maxRetries;

      if (canRetry) {
        const nextRetry = job.retryCount + 1;
        const delay = RetryManager.getBackoffDelayMs(nextRetry);

        Logger.warn('WorkerManager', `Scheduling retry ${nextRetry}/${job.maxRetries} for job ${job.jobId} in ${delay / 1000}s`, worker.accountId, job.jobId);

        JobManager.updateJob(job.jobId, {
          status: 'RETRYING',
          statusDetail: `Encountered error. Retrying (${nextRetry}/${job.maxRetries}) in ${delay / 1000}s`,
          retryCount: nextRetry,
          error: `Error: ${errorMsg}`
        });

        setTimeout(() => {
          JobManager.updateJob(job.jobId, {
            status: 'QUEUED',
            statusDetail: 'Re-queued for retry',
            progress: 0
          });
          QueueManager.process();
        }, delay);
      } else {
        JobManager.updateJob(job.jobId, {
          status: 'FAILED',
          statusDetail: `Execution failed: ${errorMsg}`,
          error: errorMsg
        });
        worker.jobsFailed++;
        QueueManager.onJobFailed(job.jobId);
      }
    } finally {
      // 5. Always release worker and trigger next queue assignment
      this.releaseWorker(worker);
      QueueManager.process();
    }
  }

  /**
   * Releases worker state back to IDLE.
   */
  public static releaseWorker(worker: WorkerSession): void {
    worker.status = 'IDLE';
    worker.currentJobId = null;
    worker.currentJobPrompt = null;
    worker.currentProgress = 0;
    worker.lastActiveAt = new Date().toISOString();
    this.notifyWorkerUpdated(worker);

    const currentAcct = AccountManager.getAccount(worker.accountId);
    if (currentAcct && (currentAcct.status === 'BUSY' || currentAcct.status === 'OPENING_FLOW')) {
      AccountManager.updateAccount(worker.accountId, {
        status: currentAcct.flowStatus === 'READY' ? 'FLOW_READY' : 'CONNECTED',
        browserStatus: 'OPEN'
      });
    }
  }
}
