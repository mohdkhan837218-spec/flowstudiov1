import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import { AppDatabase } from '../../src/main/database/db';
import { FlowProjectManager } from '../../src/main/managers/FlowProjectManager';
import { JobManager } from '../../src/main/managers/JobManager';
import { WorkerManager } from '../../src/main/managers/WorkerManager';
import { AccountManager } from '../../src/main/managers/AccountManager';
import { QueueManager } from '../../src/main/managers/QueueManager';
import { MockFlowProvider } from '../../src/main/providers/MockFlowProvider';
import { PathSecurity } from '../../src/main/security/paths';

describe('Google Flow Project Manager & End-to-End Pipeline', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
    WorkerManager.setFlowProvider(new MockFlowProvider());
  });

  it('should generate safe Flow project names without illegal filesystem characters', () => {
    const name1 = FlowProjectManager.generateProjectName('Dog Rescue Story: Part 1?');
    expect(name1).toContain('FLOW AUTO — Dog Rescue Story Part 1');
    expect(name1).not.toContain(':');
    expect(name1).not.toContain('?');

    const name2 = FlowProjectManager.generateProjectName();
    expect(name2).toContain('FLOW AUTO — Direct Prompt');
  });

  it('should enforce atomic project locking across workers', () => {
    const projId = 'flow_proj_test_lock_01';
    const lock1 = FlowProjectManager.lockProject(projId, 'worker_01');
    expect(lock1).toBe(true);

    // Another worker cannot acquire the same project lock simultaneously
    const lock2 = FlowProjectManager.lockProject(projId, 'worker_02');
    expect(lock2).toBe(false);

    // After release, worker_02 can acquire
    FlowProjectManager.releaseProject(projId);
    const lock3 = FlowProjectManager.lockProject(projId, 'worker_02');
    expect(lock3).toBe(true);
    FlowProjectManager.releaseProject(projId);
  });

  it('should save and retrieve Flow project records from database', () => {
    const record = {
      flowProjectId: 'flow_proj_rec_01',
      applicationProjectId: 'app_proj_100',
      accountId: 'acct_100',
      flowProjectName: 'FLOW AUTO — Golden Retriever Story',
      flowProjectUrl: 'https://labs.google/fx/tools/flow/project/flow_proj_rec_01',
      flowProjectStatus: 'READY' as const,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };

    AppDatabase.saveFlowProject(record);
    const fetched = AppDatabase.getFlowProject('flow_proj_rec_01');
    expect(fetched).toBeDefined();
    expect(fetched?.flowProjectName).toBe('FLOW AUTO — Golden Retriever Story');
    expect(fetched?.flowProjectUrl).toContain('flow_proj_rec_01');

    const fetchedForApp = AppDatabase.getFlowProjectForApp('app_proj_100', 'acct_100');
    expect(fetchedForApp).toBeDefined();
    expect(fetchedForApp?.flowProjectId).toBe('flow_proj_rec_01');
  });

  it('should execute complete multi-shot Storyboard workflow in single Flow Project from Queue to Download to Completed', async () => {
    // 1. Create Google Account and Worker
    const account = AccountManager.createAccount({ displayName: 'Flow Pipeline Worker' });
    AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      flowStatus: 'READY'
    });
    const worker = WorkerManager.register(account.id);
    expect(worker).toBeDefined();

    // 2. Create Storyboard Project with 3 shots
    const project = JobManager.createProject({
      name: 'Sci-Fi Cyberpunk Adventure',
      description: 'A cinematic drone sequence through neon rain alleys',
      sourcePrompt: 'Create a cyberpunk chase sequence',
      shots: [
        {
          id: 'shot_001',
          prompt: 'Wide establishing drone shot of neon skyscrapers in rain',
          generationType: 'VIDEO',
          duration: 10,
          aspectRatio: '16:9',
          notes: 'Drone Forward'
        },
        {
          id: 'shot_002',
          prompt: 'Close up of female protagonist putting on holographic goggles',
          generationType: 'VIDEO',
          duration: 6,
          aspectRatio: '16:9',
          notes: 'Tracking'
        },
        {
          id: 'shot_003',
          prompt: 'Hover vehicle accelerating into futuristic highway tunnel',
          generationType: 'VIDEO',
          duration: 10,
          aspectRatio: '16:9',
          notes: 'Pan'
        }
      ]
    });

    expect(project.totalShots).toBe(3);

    // 3. Register Flow project for this application project
    const flowProjectRecord = {
      flowProjectId: `flow_${project.id}`,
      applicationProjectId: project.id,
      accountId: account.id,
      flowProjectName: `FLOW AUTO — ${project.name}`,
      flowProjectUrl: `https://labs.google/fx/tools/flow/project/flow_${project.id}`,
      flowProjectStatus: 'READY' as const,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };
    AppDatabase.saveFlowProject(flowProjectRecord);

    // 4. Pause QueueManager to test direct WorkerManager execution loop
    QueueManager.pause();
    JobManager.enqueueProjectShots(project.id);
    const queuedJobs = JobManager.getJobs(project.id);
    expect(queuedJobs.length).toBe(3);

    // 5. Execute each job through the Worker pipeline
    for (const job of queuedJobs) {
      await WorkerManager.executeJob(worker!, job);
      const finished = JobManager.getJob(job.jobId);
      expect(finished?.status).toBe('COMPLETED');
      expect(finished?.outputPath).toBeDefined();
      expect(fs.existsSync(finished!.outputPath!)).toBe(true);
      expect(fs.statSync(finished!.outputPath!).size).toBeGreaterThan(0);
    }

    const completedJobs = JobManager.getJobs(project.id);
    const allCompleted = completedJobs.every((j) => j.status === 'COMPLETED');
    expect(allCompleted).toBe(true);
    expect(worker?.jobsCompleted).toBeGreaterThanOrEqual(3);
    QueueManager.resume();
  }, 25000);
});
