export type GenerationType = 'VIDEO' | 'IMAGE';
export type InputMode = 'NONE' | 'FRAMES' | 'INGREDIENTS';
export type DownloadQuality = '720p' | '1080p' | '4k' | '270p_gif';

export interface FlowModelOption {
  id: string;
  label: string;
  type: GenerationType;
  available: boolean;
  source?: string;
}

export interface AspectRatioOption {
  value: string; // e.g. "9:16", "16:9", "1:1", "4:3"
  label: string;
  available: boolean;
}

export interface DurationOption {
  value: number; // e.g. 4, 6, 8, 10
  label: string; // e.g. "4s", "6s", "8s", "10s"
  available: boolean;
}

export interface DownloadQualityOption {
  id: DownloadQuality;
  label: string;
  available: boolean;
}

export interface FlowControlRecord {
  controlType: 'MODE_SWITCHER' | 'MODEL_SELECTOR' | 'ASPECT_RATIO' | 'DURATION' | 'GENERATION_COUNT' | 'INPUT_MODE' | 'PROMPT_COMPOSER' | 'SUBMIT_BUTTON';
  visibleLabel: string;
  role?: string;
  ariaLabel?: string;
  title?: string;
  tagName: string;
  attributes?: Record<string, string>;
  textContent?: string;
  accessibleName?: string;
  domPath?: string;
  shadowPath?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  visible: boolean;
  enabled: boolean;
}

export interface OptionRecord {
  displayName: string;
  normalizedName: string;
  role: string;
  accessibleName?: string;
  visibleText: string;
  value?: string;
  dataAttributes?: Record<string, string>;
  ariaAttributes?: Record<string, string>;
  domPath?: string;
  parentControl: string;
  mode: 'VIDEO' | 'IMAGE';
  visible: boolean;
  enabled: boolean;
  selected: boolean;
}

export interface FlowCapabilitySnapshot {
  timestamp: string;
  accountId?: string;
  mode: 'VIDEO' | 'IMAGE';
  models: Array<{
    displayName: string;
    accessibleName?: string;
    internalValue?: string;
    enabled: boolean;
    selected?: boolean;
  }>;
  aspectRatios: Array<{
    value: string;
    displayName: string;
    enabled: boolean;
    selected?: boolean;
  }>;
  durations: Array<{
    value: number;
    displayName: string;
    enabled: boolean;
    selected?: boolean;
  }>;
  generationCounts: Array<{
    value: number;
    displayName: string;
    enabled: boolean;
    selected?: boolean;
  }>;
  inputModes: Array<{
    mode: InputMode;
    displayName: string;
    enabled: boolean;
    selected?: boolean;
  }>;
  summaryText?: string;
  creditText?: string;
}

export interface SelectionResult {
  success: boolean;
  controlType: string;
  requested: string | number;
  selected: string | number;
  verified: boolean;
  error?: string;
}

export interface FlowCapabilities {
  accountId: string;
  lastCheckedAt: string;
  generationTypes: GenerationType[];
  inputModes?: InputMode[];
  generationCounts?: number[];
  video: {
    models: FlowModelOption[];
    aspectRatios: AspectRatioOption[];
    durations: DurationOption[];
    generationCounts?: number[];
    inputModes?: InputMode[];
  };
  image: {
    models: FlowModelOption[];
    aspectRatios: AspectRatioOption[];
    generationCounts?: number[];
  };
  downloadQualities?: DownloadQualityOption[];
  rawDetectedControls?: string[];
  snapshot?: FlowCapabilitySnapshot;
}

export interface GenerationSettings {
  type: GenerationType;
  inputMode?: InputMode;
  model?: string;
  aspectRatio?: string;
  duration?: number;
  generationCount?: number;
  downloadQuality?: DownloadQuality;
}

export interface CreateDirectJobInput {
  prompt: string;
  type: GenerationType;
  inputMode?: InputMode;
  model?: string;
  aspectRatio?: string;
  duration?: number;
  generationCount?: number;
  downloadQuality?: DownloadQuality;
  assignedAccountId?: string | null;
  metadata?: Record<string, any>;
}

export const DEFAULT_MOCK_CAPABILITIES: FlowCapabilities = {
  accountId: 'default',
  lastCheckedAt: new Date().toISOString(),
  generationTypes: ['VIDEO', 'IMAGE'],
  inputModes: ['NONE', 'FRAMES', 'INGREDIENTS'],
  generationCounts: [1, 2, 3, 4],
  video: {
    models: [
      { id: 'omni-flash', label: 'Omni Flash', type: 'VIDEO', available: true },
      { id: 'veo-3-1-lite', label: 'Veo 3.1 - Lite', type: 'VIDEO', available: true },
      { id: 'veo-3-1-fast', label: 'Veo 3.1 - Fast', type: 'VIDEO', available: true },
      { id: 'veo-3-1-quality', label: 'Veo 3.1 - Quality', type: 'VIDEO', available: true }
    ],
    aspectRatios: [
      { value: '16:9', label: '16:9 (Landscape)', available: true },
      { value: '9:16', label: '9:16 (Vertical Short)', available: true }
    ],
    durations: [
      { value: 4, label: '4s', available: true },
      { value: 6, label: '6s', available: true },
      { value: 8, label: '8s', available: true },
      { value: 10, label: '10s', available: true }
    ],
    generationCounts: [1, 2, 3, 4],
    inputModes: ['NONE', 'FRAMES', 'INGREDIENTS']
  },
  image: {
    models: [
      { id: 'nano-banana-2', label: 'Nano Banana 2', type: 'IMAGE', available: true },
      { id: 'imagen-3', label: 'Imagen 3', type: 'IMAGE', available: true }
    ],
    aspectRatios: [
      { value: '16:9', label: '16:9 (Landscape)', available: true },
      { value: '4:3', label: '4:3 (Standard)', available: true },
      { value: '1:1', label: '1:1 (Square)', available: true },
      { value: '3:4', label: '3:4 (Portrait)', available: true },
      { value: '9:16', label: '9:16 (Vertical)', available: true }
    ],
    generationCounts: [1, 2, 3, 4]
  },
  downloadQualities: [
    { id: '720p', label: '720p — Original Size', available: true },
    { id: '1080p', label: '1080p — Upscaled', available: true },
    { id: '4k', label: '4K — Upscaled', available: true },
    { id: '270p_gif', label: '270p — Animated GIF', available: true }
  ]
};
