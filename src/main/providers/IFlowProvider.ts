import { GenerationType, InputMode, DownloadQuality } from '../../shared/types/generation';

export interface FlowGenerationOptions {
  type?: GenerationType;
  inputMode?: InputMode;
  model?: string | null;
  duration?: number;
  aspectRatio?: string;
  generationCount?: number;
  downloadQuality?: DownloadQuality | string;
}

import { FlowDiagnosticError } from '../../shared/types/diagnostics';

export interface FlowExecutionResult {
  success: boolean;
  outputPath?: string | null;
  outputPaths?: string[];
  error?: string | null;
  isHumanVerificationRequired?: boolean;
  diagnosticError?: FlowDiagnosticError;
}

export interface IFlowProvider {
  readonly providerName: string;
  executeJob(
    accountId: string,
    prompt: string,
    targetOutputPath: string,
    options: FlowGenerationOptions,
    onProgress?: (progressPercent: number, statusMessage: string) => void
  ): Promise<FlowExecutionResult>;
}
