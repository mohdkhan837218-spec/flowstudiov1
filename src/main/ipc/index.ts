import { registerAccountIpc } from './accountIpc';
import { registerProjectIpc } from './projectIpc';
import { registerJobIpc } from './jobIpc';
import { registerQueueIpc } from './queueIpc';
import { registerGroqIpc } from './groqIpc';
import { registerSettingsIpc } from './settingsIpc';
import { registerActivityIpc } from './activityIpc';
import { registerGenerationIpc } from './generationIpc';
import { registerDiagnosticIpc } from './diagnosticIpc';
import { registerLivePreviewIpc } from './livePreviewIpc';
import { Logger } from '../logging/logger';

export function registerAllIpc(): void {
  registerAccountIpc();
  registerProjectIpc();
  registerJobIpc();
  registerQueueIpc();
  registerGroqIpc();
  registerSettingsIpc();
  registerActivityIpc();
  registerGenerationIpc();
  registerDiagnosticIpc();
  registerLivePreviewIpc();
  Logger.info('IPC', 'Registered all subsystem IPC channels safely');
}
