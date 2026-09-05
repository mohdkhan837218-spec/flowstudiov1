import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import { AppDatabase } from '../../src/main/database/db';
import { JobManager } from '../../src/main/managers/JobManager';
import { WorkerManager } from '../../src/main/managers/WorkerManager';
import { AccountManager } from '../../src/main/managers/AccountManager';
import { MockFlowProvider } from '../../src/main/providers/MockFlowProvider';
import { FlowComposerController, ComposerDetectionResult } from '../../src/main/providers/FlowComposerController';
import { FlowOptionResolver } from '../../src/main/providers/FlowOptionResolver';
import { PathSecurity } from '../../src/main/security/paths';
import { DEFAULT_MOCK_CAPABILITIES } from '../../src/shared/types/generation';

describe('Google Flow Generation Composer Controller & Mode-Specific Capabilities V2', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
    WorkerManager.setFlowProvider(new MockFlowProvider());
  });

  it('TEST A: should execute VIDEO generation with Omni Flash, 16:9, 10s, x1 for "make a video for moto patlu"', async () => {
    const account = AccountManager.createAccount({ displayName: 'Moto Patlu Video Worker' });
    AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      flowStatus: 'READY'
    });
    const worker = WorkerManager.register(account.id);
    expect(worker).toBeDefined();

    const testPrompt = 'make a video for moto patlu';
    const job = JobManager.createDirectJob({
      prompt: testPrompt,
      type: 'VIDEO',
      model: 'Omni Flash',
      duration: 10,
      aspectRatio: '16:9',
      generationCount: 1
    });

    expect(job.generationType).toBe('VIDEO');
    expect(job.model).toBe('Omni Flash');
    expect(job.duration).toBe(10);
    expect(job.aspectRatio).toBe('16:9');

    await WorkerManager.executeJob(worker!, job);

    const completed = JobManager.getJob(job.jobId);
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.outputPath).toBeDefined();
    expect(completed?.outputPath?.endsWith('.mp4')).toBe(true);
    expect(fs.existsSync(completed!.outputPath!)).toBe(true);
    expect(fs.statSync(completed!.outputPath!).size).toBeGreaterThan(0);
  }, 20000);

  it('TEST B: should execute IMAGE generation with Nano Banana 2, 16:9, x2 for "create a cartoon image"', async () => {
    const account = AccountManager.createAccount({ displayName: 'Cartoon Image Worker' });
    AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      flowStatus: 'READY'
    });
    const worker = WorkerManager.register(account.id);
    expect(worker).toBeDefined();

    const testPrompt = 'create a cartoon image';
    const job = JobManager.createDirectJob({
      prompt: testPrompt,
      type: 'IMAGE',
      model: 'Nano Banana 2',
      aspectRatio: '16:9',
      generationCount: 2
    });

    expect(job.generationType).toBe('IMAGE');
    expect(job.model).toBe('Nano Banana 2');
    expect(job.generationCount).toBe(2);

    await WorkerManager.executeJob(worker!, job);

    const completed = JobManager.getJob(job.jobId);
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.outputPaths).toBeDefined();
    expect(completed?.outputPaths?.length).toBe(2);
    completed?.outputPaths?.forEach((p) => {
      expect(p.endsWith('.png')).toBe(true);
      expect(fs.existsSync(p)).toBe(true);
    });
  }, 20000);

  it('TEST C: assertFlowStateMatchesJob should throw FLOW_MODE_MISMATCH if Video job meets Image composer', () => {
    const videoJob = {
      generationType: 'VIDEO' as const,
      model: 'Omni Flash',
      duration: 10,
      aspectRatio: '16:9'
    };

    const mockImageState: ComposerDetectionResult = {
      hasComposer: true,
      generationType: 'IMAGE',
      activeModel: 'Nano Banana 2',
      activeRatio: '16:9',
      activeCount: 2,
      detectedModels: ['Nano Banana 2'],
      detectedRatios: ['16:9'],
      detectedDurations: [],
      detectedCounts: [2],
      isGenerateReady: true
    };

    expect(() => {
      FlowComposerController.assertFlowStateMatchesJob(mockImageState, videoJob);
    }).toThrowError(/FLOW_MODE_MISMATCH/);
  });

  it('TEST D: assertFlowStateMatchesJob should throw FLOW_MODEL_MISMATCH if requested model differs from Flow composer', () => {
    const videoJob = {
      generationType: 'VIDEO' as const,
      model: 'Omni Flash',
      duration: 10,
      aspectRatio: '16:9'
    };

    const wrongModelState: ComposerDetectionResult = {
      hasComposer: true,
      generationType: 'VIDEO',
      activeModel: 'Veo 3.1 - Quality',
      activeRatio: '16:9',
      activeDuration: 10,
      detectedModels: ['Veo 3.1 - Quality'],
      detectedRatios: ['16:9'],
      detectedDurations: ['10s'],
      detectedCounts: [1],
      isGenerateReady: true
    };

    expect(() => {
      FlowComposerController.assertFlowStateMatchesJob(wrongModelState, videoJob);
    }).toThrowError(/FLOW_MODEL_MISMATCH/);
  });

  it('TEST E: assertFlowStateMatchesJob should throw FLOW_DURATION_MISMATCH if requested duration differs from Flow composer', () => {
    const videoJob = {
      generationType: 'VIDEO' as const,
      model: 'Omni Flash',
      duration: 10,
      aspectRatio: '16:9'
    };

    const wrongDurationState: ComposerDetectionResult = {
      hasComposer: true,
      generationType: 'VIDEO',
      activeModel: 'Omni Flash',
      activeRatio: '16:9',
      activeDuration: 6,
      detectedModels: ['Omni Flash'],
      detectedRatios: ['16:9'],
      detectedDurations: ['6s'],
      detectedCounts: [1],
      isGenerateReady: true
    };

    expect(() => {
      FlowComposerController.assertFlowStateMatchesJob(wrongDurationState, videoJob);
    }).toThrowError(/FLOW_DURATION_MISMATCH/);
  });

  it('TEST F: validateJobSettings should reject invalid mode-specific settings before enqueueing', () => {
    // 1. Image job with duration is invalid
    const invalidImage = FlowComposerController.validateJobSettings({
      prompt: 'A sunset landscape',
      generationType: 'IMAGE',
      duration: 10
    });
    expect(invalidImage.valid).toBe(false);
    expect(invalidImage.error).toContain('Duration controls are not valid for IMAGE');

    // 2. Video job with empty prompt is invalid
    const emptyPrompt = FlowComposerController.validateJobSettings({
      prompt: '',
      generationType: 'VIDEO'
    });
    expect(emptyPrompt.valid).toBe(false);
    expect(emptyPrompt.error).toContain('Prompt cannot be empty');

    // 3. Valid video settings pass
    const validVideo = FlowComposerController.validateJobSettings({
      prompt: 'A cinematic drone sequence',
      generationType: 'VIDEO',
      model: 'Omni Flash',
      duration: 10,
      aspectRatio: '16:9'
    });
    expect(validVideo.valid).toBe(true);

    // 4. Valid image settings pass
    const validImage = FlowComposerController.validateJobSettings({
      prompt: 'A cute mascot illustration',
      generationType: 'IMAGE',
      model: 'Nano Banana 2',
      aspectRatio: '16:9',
      generationCount: 2
    });
    expect(validImage.valid).toBe(true);
  });

  it('TEST G: FlowOptionResolver should accurately normalize labels and resolve exact matches', () => {
    expect(FlowOptionResolver.normalizeLabel('Veo 3.1 – Quality')).toBe('veo 3 1 quality');
    expect(FlowOptionResolver.normalizeLabel('Nano  Banana   2!')).toBe('nano banana 2');

    const options = [
      { displayName: 'Omni Flash', normalizedName: 'omni flash', visibleText: 'Omni Flash', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false },
      { displayName: 'Veo 3.1 - Quality', normalizedName: 'veo 3 1 quality', visibleText: 'Veo 3.1 - Quality', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false },
      { displayName: 'Veo 3.1 - Fast', normalizedName: 'veo 3 1 fast', visibleText: 'Veo 3.1 - Fast', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false }
    ];

    // Exact match
    const match1 = FlowOptionResolver.findExactOptionMatch(options, 'Omni Flash');
    expect(match1.displayName).toBe('Omni Flash');

    // Semantic alias match ("veo quality" -> "Veo 3.1 - Quality")
    const match2 = FlowOptionResolver.findExactOptionMatch(options, 'Veo Quality');
    expect(match2.displayName).toBe('Veo 3.1 - Quality');
  });

  it('TEST H: FlowOptionResolver should throw AMBIGUOUS_OPTION when multiple candidates match without an exact match', () => {
    const ambiguousOptions = [
      { displayName: 'Veo 3.1 - Fast', normalizedName: 'veo 3-1 fast', visibleText: 'Veo 3.1 - Fast', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false },
      { displayName: 'Veo 3.1 - Fast Preview', normalizedName: 'veo 3-1 fast preview', visibleText: 'Veo 3.1 - Fast Preview', role: 'option', parentControl: 'MODEL_SELECTOR', mode: 'VIDEO' as const, visible: true, enabled: true, selected: false }
    ];

    // Exact match succeeds
    const exact = FlowOptionResolver.findExactOptionMatch(ambiguousOptions, 'Veo 3.1 - Fast');
    expect(exact.displayName).toBe('Veo 3.1 - Fast');

    // Ambiguous fuzzy search "Fast" matches both -> must throw AMBIGUOUS_OPTION
    expect(() => {
      FlowOptionResolver.findExactOptionMatch(ambiguousOptions, 'Fast');
    }).toThrowError(/AMBIGUOUS_OPTION/);
  });
});

