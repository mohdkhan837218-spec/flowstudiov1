import fs from 'fs';
import path from 'path';
import { IFlowProvider, FlowGenerationOptions, FlowExecutionResult } from './IFlowProvider';
import { FlowComposerController } from './FlowComposerController';
import { Logger } from '../logging/logger';
import { FlowActionTracer } from '../diagnostics/FlowActionTracer';
import { FlowDiagnosticBundle } from '../diagnostics/FlowDiagnosticBundle';
import { FlowErrorCode } from '../../shared/types/diagnostics';
import { LivePreviewManager } from '../preview/LivePreviewManager';

export class MockFlowProvider implements IFlowProvider {
  public readonly providerName = 'MockFlowProvider';

  public async executeJob(
    accountId: string,
    prompt: string,
    targetOutputPath: string,
    options: FlowGenerationOptions,
    onProgress?: (progressPercent: number, statusMessage: string) => void
  ): Promise<FlowExecutionResult> {
    const isImage = options.type === 'IMAGE';
    const typeLabel = isImage ? 'IMAGE' : 'VIDEO';
    const count = options.generationCount || (isImage ? 2 : 1);
    const model = options.model || (isImage ? 'Nano Banana 2' : 'Omni Flash');
    const jobId = path.basename(targetOutputPath, path.extname(targetOutputPath)) || `job_${Date.now()}`;
    const tracer = FlowActionTracer.getOrCreate(jobId, accountId, `worker_${accountId}`);

    Logger.info(
      this.providerName,
      `[SIMULATION] Starting ${typeLabel} generation for account ${accountId} (Model: ${model}, Ratio: ${options.aspectRatio || '16:9'}, Count: x${count})`,
      accountId
    );

    const actOpenFlow = tracer.recordAction('OPEN_FLOW', 'CONNECT_SESSION', 'Open mock Google Flow session');
    tracer.completeAction(actOpenFlow, 'SUCCESS');

    const actProject = tracer.recordAction('ENSURE_PROJECT', 'OPEN_WORKSPACE', 'Open project workspace');
    tracer.completeAction(actProject, 'SUCCESS', 'FLOW AUTO');

    const actComposer = tracer.recordAction('LOCATE_COMPOSER', 'FIND_COMPOSER', 'Locate mock prompt composer');
    tracer.completeAction(actComposer, 'SUCCESS');

    // 1. Validate Job Settings
    const validation = FlowComposerController.validateJobSettings({
      prompt,
      generationType: options.type,
      model: options.model,
      duration: options.duration,
      aspectRatio: options.aspectRatio,
      generationCount: count
    });

    if (!validation.valid) {
      Logger.error(this.providerName, `Validation failed: ${validation.error}`, accountId);
      const actSettings = tracer.recordAction('APPLY_SETTINGS', 'VALIDATE_SETTINGS', 'Validate job settings');
      tracer.completeAction(actSettings, 'FAILED', validation.error);

      let code: FlowErrorCode = 'FLOW_CONFIGURATION_MISMATCH';
      if (validation.error?.includes('Duration')) code = 'FLOW_DURATION_MISMATCH';
      else if (validation.error?.includes('Model')) code = 'FLOW_MODEL_MISMATCH';
      else if (validation.error?.includes('Prompt')) code = 'FLOW_PROMPT_INPUT_FAILED';

      const diagError = tracer.createDiagnosticError({
        code,
        message: validation.error || 'Validation failed',
        expected: {
          generationType: options.type || 'VIDEO',
          model: options.model || undefined,
          aspectRatio: options.aspectRatio || undefined,
          duration: options.duration || undefined,
          generationCount: count,
          prompt: prompt || undefined
        },
        actual: {
          generationType: isImage ? 'IMAGE' : 'VIDEO',
          model: model || undefined,
          aspectRatio: options.aspectRatio || '16:9',
          duration: isImage ? undefined : options.duration || undefined,
          generationCount: count
        }
      });
      FlowDiagnosticBundle.storeError(diagError);

      return { success: false, error: validation.error, diagnosticError: diagError };
    }

    const steps = [
      { progress: 10, msg: 'Opening Google Flow persistent browser session...', delay: 60 },
      { progress: 20, msg: 'Ensuring Google Flow project workspace...', delay: 60 },
      { progress: 30, msg: 'Connected to Flow project workspace: FLOW AUTO', delay: 60 },
      { progress: 40, msg: 'Locating generation prompt composer...', delay: 60 },
      { progress: 50, msg: `Switching to ${typeLabel} mode & applying settings (Model: ${model}, ${options.aspectRatio || '16:9'}, x${count})...`, delay: 60 },
      { progress: 55, msg: 'Injecting and verifying prompt content...', delay: 60 },
      { progress: 58, msg: 'Waiting for circular submit arrow button...', delay: 60 },
      { progress: 60, msg: 'Capturing media inventory and submitting prompt...', delay: 80 },
      { progress: 65, msg: 'Canvas status: NO_RESULT_YET (waiting for diffusion rendering)...', delay: 80 },
      { progress: 70, msg: 'Prompt submitted. Rendering AI diffusion frames...', delay: 120 },
      { progress: 80, msg: `Detected ${count} new generation output(s)!`, delay: 80 },
      { progress: 90, msg: `Downloading ${count} media asset(s)...`, delay: 60 },
      { progress: 95, msg: 'Verifying file integrity and media format...', delay: 40 }
    ];

    for (const step of steps) {
      if (onProgress) onProgress(step.progress, step.msg);
      if (step.progress === 70) {
        // Create an SVG-based mock image or simulated preview fixture for sandbox testing
        const mockPreviewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e1b4b"/>
              <stop offset="50%" stop-color="#312e81"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="640" height="360" fill="url(#g)"/>
          <circle cx="320" cy="160" r="40" fill="#6366f1" opacity="0.8"/>
          <text x="320" y="240" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">FLOW STUDIO SANDBOX</text>
          <text x="320" y="265" font-family="monospace" font-size="12" fill="#94a3b8" text-anchor="middle">${typeLabel}: ${prompt.slice(0, 45)}...</text>
        </svg>`;
        const mockDataUrl = `data:image/svg+xml;base64,${Buffer.from(mockPreviewSvg).toString('base64')}`;
        LivePreviewManager.attachPreviewMedia(jobId, mockDataUrl, 'LOCAL_SANDBOX');
      }
      await new Promise((r) => setTimeout(r, step.delay));
    }

    // Ensure output directory exists
    const outDir = path.dirname(targetOutputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outputPaths: string[] = [];
    const ext = isImage ? '.png' : '.mp4';
    const baseWithoutExt = targetOutputPath.replace(/\.(mp4|png)$/i, '');

    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);

    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31
    ]);

    const fileContent = isImage ? pngHeader : mp4Header;

    for (let i = 0; i < count; i++) {
      const outputPath = count === 1 ? `${baseWithoutExt}${ext}` : `${baseWithoutExt}_var${i + 1}${ext}`;
      fs.writeFileSync(outputPath, fileContent);
      outputPaths.push(outputPath);
    }

    Logger.success(
      this.providerName,
      `[SIMULATION] Completed ${typeLabel} generation -> ${outputPaths.map((p) => path.basename(p)).join(', ')}`,
      accountId
    );

    return {
      success: true,
      outputPath: outputPaths[0],
      outputPaths
    };
  }
}
