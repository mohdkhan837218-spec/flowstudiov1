import { BrowserWindow } from 'electron';
import { AppDatabase } from '../database/db';
import { Project, CreateProjectInput, ShotPlanItem } from '../../shared/types/project';
import { Job, JobStatus } from '../../shared/types/job';
import { CreateDirectJobInput } from '../../shared/types/generation';
import { DownloadManager } from './DownloadManager';
import { QueueManager } from './QueueManager';
import { Logger } from '../logging/logger';

export class JobManager {
  private static notifyJobUpdated(job: Job): void {
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('job:updated', job);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }
  }

  /**
   * Creates a single standalone Direct Prompt job (Mode B) bypassing Groq & Storyboard.
   */
  public static createDirectJob(input: CreateDirectJobInput): Job {
    const trimmedPrompt = (input.prompt || '').trim();
    if (!trimmedPrompt) {
      throw new Error('Prompt cannot be empty for direct generation');
    }

    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const jobId = `job_direct_${uniqueSuffix}`;
    const now = new Date().toISOString();

    const isImage = input.type === 'IMAGE';
    const duration = isImage ? 0 : Number(input.duration) || 10;
    const aspectRatio = input.aspectRatio || '16:9';
    const generationCount = Number(input.generationCount) || 1;
    const inputMode = input.inputMode || 'NONE';
    const downloadQuality = input.downloadQuality || '720p';

    const job: Job = {
      jobId,
      projectId: 'direct_prompt_project',
      shotId: `shot_${isImage ? 'img' : 'vid'}_${uniqueSuffix}`,
      prompt: trimmedPrompt,
      generationType: input.type || 'VIDEO',
      inputMode,
      model: input.model || 'Omni Flash',
      duration,
      aspectRatio,
      generationCount,
      downloadQuality,
      status: 'QUEUED',
      statusDetail: 'Direct job created, waiting for worker dispatch',
      progress: 0,
      assignedAccountId: input.assignedAccountId || null,
      assignedWorkerId: null,
      workerId: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      maxRetries: 3,
      outputPath: null,
      outputPaths: [],
      error: null,
      metadata: input.metadata
    };

    AppDatabase.saveJob(job);
    this.notifyJobUpdated(job);

    Logger.info(
      'JobManager',
      `[DIRECT PROMPT] Created ${job.generationType} job ${job.jobId} (Model: ${job.model}, Ratio: ${job.aspectRatio}, Duration: ${job.duration}s, Count: x${job.generationCount}, Input: ${job.inputMode})`
    );

    // Immediately trigger Queue dispatch
    QueueManager.onJobQueued();

    return job;
  }

  // ================= PROJECT MANAGEMENT =================

  public static listProjects(): Project[] {
    return AppDatabase.getProjects();
  }

  public static getProject(id: string): Project | null {
    return AppDatabase.getProject(id);
  }

  public static createProject(input: CreateProjectInput): Project {
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const existingCount = AppDatabase.getProjects().length + 1;
    const paddedIndex = String(existingCount).padStart(2, '0');
    const id = `proj_${paddedIndex}_${uniqueSuffix}`;

    const now = new Date().toISOString();
    const outputDir = input.outputDirectory || DownloadManager.getProjectOutputDir(id);

    const project: Project = {
      id,
      name: input.name.trim() || `Project ${paddedIndex}`,
      description: input.description || '',
      sourcePrompt: input.sourcePrompt,
      status: 'DRAFT',
      outputDirectory: outputDir,
      totalShots: input.shots.length,
      completedShots: 0,
      failedShots: 0,
      createdAt: now,
      updatedAt: now,
      shots: input.shots
    };

    AppDatabase.saveProject(project);
    Logger.info('JobManager', `Created project ${project.name} (${project.id}) with ${project.totalShots} shots`);
    return project;
  }

  public static deleteProject(id: string): boolean {
    AppDatabase.deleteProject(id);
    Logger.info('JobManager', `Deleted project ${id}`);
    return true;
  }

  public static enqueueProjectShots(projectId: string): { success: boolean; jobsCount: number } {
    const project = AppDatabase.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const now = new Date().toISOString();
    let jobsCreated = 0;

    project.shots.forEach((shot, index) => {
      const jobId = `job_${project.id.replace('proj_', '')}_${String(index + 1).padStart(3, '0')}`;
      
      const shotId = shot.id || (shot as any).shotId || `shot_${String(index + 1).padStart(3, '0')}`;

      const job: Job = {
        jobId,
        projectId: project.id,
        shotId,
        prompt: shot.prompt,
        generationType: shot.generationType || project.generationType || 'VIDEO',
        inputMode: 'NONE',
        model: shot.model || project.defaultModel || 'Omni Flash',
        duration: shot.duration || project.defaultDuration || 10,
        aspectRatio: shot.aspectRatio || project.defaultAspectRatio || '16:9',
        generationCount: 1,
        downloadQuality: '720p',
        status: 'QUEUED',
        statusDetail: 'Enqueued from storyboard, waiting for worker',
        progress: 0,
        assignedAccountId: null,
        assignedWorkerId: null,
        workerId: null,
        createdAt: now,
        startedAt: null,
        completedAt: null,
        retryCount: 0,
        maxRetries: 3,
        outputPath: null,
        outputPaths: [],
        flowProjectId: null,
        flowProjectUrl: null,
        error: null,
        metadata: { notes: shot.notes || '' }
      };

      AppDatabase.saveJob(job);
      this.notifyJobUpdated(job);
      jobsCreated++;
    });

    project.status = 'QUEUED';
    project.updatedAt = now;
    AppDatabase.saveProject(project);

    Logger.info('JobManager', `Enqueued ${jobsCreated} jobs for project ${project.name}`);
    
    // Automatically trigger queue processing immediately
    QueueManager.onJobQueued();

    return { success: true, jobsCount: jobsCreated };
  }

  // ================= JOB MANAGEMENT =================

  public static listJobs(projectId?: string): Job[] {
    return AppDatabase.getJobs(projectId);
  }

  public static getJobs(projectId?: string): Job[] {
    return this.listJobs(projectId);
  }

  public static getJob(jobId: string): Job | null {
    return AppDatabase.getJob(jobId);
  }

  public static updateJob(jobId: string, patch: Partial<Job>): Job {
    const job = AppDatabase.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const updated = { ...job, ...patch };
    AppDatabase.saveJob(updated);
    this.notifyJobUpdated(updated);

    // Update parent project counters if completed or failed
    if (patch.status === 'COMPLETED' || patch.status === 'FAILED') {
      this.reconcileProjectStats(updated.projectId);
    }

    return updated;
  }

  public static reconcileProjectStats(projectId: string): void {
    const project = AppDatabase.getProject(projectId);
    if (!project) return;

    const jobs = AppDatabase.getJobs(projectId);
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failed = jobs.filter((j) => j.status === 'FAILED').length;
    const running = jobs.filter((j) => j.status === 'RUNNING' || j.status === 'ASSIGNED' || j.status === 'STARTING' || j.status === 'DOWNLOADING').length;
    const queued = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'RETRYING').length;

    project.completedShots = completed;
    project.failedShots = failed;

    if (completed === project.totalShots && project.totalShots > 0) {
      project.status = 'COMPLETED';
    } else if (running > 0) {
      project.status = 'RUNNING';
    } else if (queued > 0) {
      project.status = 'QUEUED';
    } else if (failed > 0 && queued === 0 && running === 0) {
      project.status = 'FAILED';
    }

    project.updatedAt = new Date().toISOString();
    AppDatabase.saveProject(project);
  }

  public static cancelJob(jobId: string): boolean {
    const job = AppDatabase.getJob(jobId);
    if (!job) return false;

    this.updateJob(jobId, {
      status: 'CANCELLED',
      error: 'Job manually cancelled by user'
    });
    Logger.info('JobManager', `Cancelled job ${jobId}`, job.assignedAccountId, jobId);
    return true;
  }

  public static retryJob(jobId: string): boolean {
    const job = AppDatabase.getJob(jobId);
    if (!job) return false;

    this.updateJob(jobId, {
      status: 'QUEUED',
      statusDetail: 'Re-queued for manual retry',
      progress: 0,
      error: null,
      startedAt: null,
      completedAt: null
    });
    Logger.info('JobManager', `Reset job ${jobId} to QUEUED for retry`, job.assignedAccountId, jobId);
    QueueManager.onJobQueued();
    return true;
  }

  /**
   * Crash Recovery: Scans database for uncompleted jobs from previous process crash.
   */
  public static recoverDanglingJobs(): void {
    const allJobs = AppDatabase.getJobs();
    const dangling = allJobs.filter((j) =>
      j.status === 'RUNNING' ||
      j.status === 'STARTING' ||
      j.status === 'DOWNLOADING' ||
      j.status === 'ASSIGNED' ||
      j.status === 'FLOW_INITIALIZING' ||
      j.status === 'SUBMITTING' ||
      j.status === 'GENERATING' ||
      j.status === 'WAITING_FOR_WORKER'
    );

    if (dangling.length > 0) {
      Logger.warn('JobManager', `Crash Recovery: Detected ${dangling.length} unfinished jobs from previous session`);
      dangling.forEach((job) => {
        this.updateJob(job.jobId, {
          status: 'QUEUED',
          statusDetail: 'Recovered after application restart',
          progress: 0,
          error: 'Recovered after application restart',
          assignedAccountId: null,
          workerId: null
        });
      });
    }
  }
}
