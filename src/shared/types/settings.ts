export interface AppSettings {
  maxConcurrentWorkers: number;
  headless: boolean;
  defaultBrowserTimeout: number;
  navigationTimeout: number;
  downloadDirectory: string;
  flowUrl: string;
  groqApiKey?: string;
  groqModel: string;
  logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  theme: 'dark' | 'light' | 'system';
  uiScale: number;
  uiDensity: 'comfortable' | 'standard' | 'compact';
}

export const DEFAULT_FLOW_URL = 'https://labs.google/flow';

export const DEFAULT_SETTINGS: AppSettings = {
  maxConcurrentWorkers: 3,
  headless: false,
  defaultBrowserTimeout: 60000,
  navigationTimeout: 45000,
  downloadDirectory: '',
  flowUrl: DEFAULT_FLOW_URL,
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  logLevel: 'INFO',
  theme: 'dark',
  uiScale: 1.0,
  uiDensity: 'standard'
};
