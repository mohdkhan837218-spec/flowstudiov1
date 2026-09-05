import { create } from 'zustand';
import { GenerationType, InputMode, DownloadQuality, FlowCapabilities, DEFAULT_MOCK_CAPABILITIES } from '../../shared/types/generation';

export type GenerationMode = 'STORYBOARD' | 'DIRECT';

interface GenerationState {
  mode: GenerationMode;
  type: GenerationType;
  inputMode: InputMode;
  prompt: string;
  model: string;
  aspectRatio: string;
  duration: number;
  generationCount: number;
  downloadQuality: DownloadQuality;
  assignedAccountId: string | null;
  capabilities: FlowCapabilities;
  isLoadingCapabilities: boolean;
  isGenerating: boolean;
  lastCreatedJobId: string | null;
  error: string | null;

  setMode: (mode: GenerationMode) => void;
  setType: (type: GenerationType) => void;
  setInputMode: (inputMode: InputMode) => void;
  setPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setAspectRatio: (ratio: string) => void;
  setDuration: (duration: number) => void;
  setGenerationCount: (count: number) => void;
  setDownloadQuality: (quality: DownloadQuality) => void;
  setAssignedAccountId: (id: string | null) => void;

  loadCapabilities: (accountId?: string) => Promise<void>;
  refreshCapabilities: (accountId: string) => Promise<void>;
  openNewProject: (accountId: string) => Promise<void>;
  inspectWorkspace: (accountId: string) => Promise<any>;
  generateDirectJob: () => Promise<boolean>;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  mode: 'STORYBOARD',
  type: 'VIDEO',
  inputMode: 'NONE',
  prompt: '',
  model: 'Omni Flash',
  aspectRatio: '16:9',
  duration: 10,
  generationCount: 1,
  downloadQuality: '720p',
  assignedAccountId: null,
  capabilities: DEFAULT_MOCK_CAPABILITIES,
  isLoadingCapabilities: false,
  isGenerating: false,
  lastCreatedJobId: null,
  error: null,

  setMode: (mode) => set({ mode, error: null }),
  setType: (type) => {
    const caps = get().capabilities;
    if (type === 'IMAGE') {
      const defaultImgRatio = caps.image.aspectRatios[0]?.value || '16:9';
      set({ type, aspectRatio: defaultImgRatio, duration: 0 });
    } else {
      const defaultVidRatio = caps.video.aspectRatios[0]?.value || '16:9';
      const defaultVidDur = caps.video.durations[0]?.value || 10;
      set({ type, aspectRatio: defaultVidRatio, duration: defaultVidDur });
    }
  },
  setInputMode: (inputMode) => set({ inputMode }),
  setPrompt: (prompt) => set({ prompt, error: null }),
  setModel: (model) => set({ model }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setDuration: (duration) => set({ duration }),
  setGenerationCount: (generationCount) => set({ generationCount }),
  setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
  setAssignedAccountId: (assignedAccountId) => {
    set({ assignedAccountId });
    if (assignedAccountId) {
      get().loadCapabilities(assignedAccountId);
    }
  },

  loadCapabilities: async (accountId?: string) => {
    set({ isLoadingCapabilities: true });
    try {
      if (window.flowWorkspace?.generation) {
        const caps = await window.flowWorkspace.generation.getCapabilities(accountId);
        set({ capabilities: caps, isLoadingCapabilities: false });
      } else {
        set({ capabilities: DEFAULT_MOCK_CAPABILITIES, isLoadingCapabilities: false });
      }
    } catch {
      set({ capabilities: DEFAULT_MOCK_CAPABILITIES, isLoadingCapabilities: false });
    }
  },

  refreshCapabilities: async (accountId: string) => {
    set({ isLoadingCapabilities: true });
    try {
      if (window.flowWorkspace?.generation) {
        const caps = await window.flowWorkspace.generation.refreshCapabilities(accountId);
        set({ capabilities: caps, isLoadingCapabilities: false });
      }
    } catch (err: any) {
      set({ error: `Failed refreshing capabilities: ${err.message}`, isLoadingCapabilities: false });
    }
  },

  openNewProject: async (accountId: string) => {
    set({ isLoadingCapabilities: true });
    try {
      if (window.flowWorkspace?.generation) {
        const res = await window.flowWorkspace.generation.openNewProject(accountId);
        if (res.success) {
          await get().loadCapabilities(accountId);
        } else {
          set({ error: res.error || 'Failed opening New Project workspace' });
        }
      }
      set({ isLoadingCapabilities: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingCapabilities: false });
    }
  },

  inspectWorkspace: async (accountId: string) => {
    try {
      if (window.flowWorkspace?.generation) {
        return await window.flowWorkspace.generation.inspectWorkspace(accountId);
      }
      return null;
    } catch {
      return null;
    }
  },

  generateDirectJob: async () => {
    const { prompt, type, inputMode, model, aspectRatio, duration, generationCount, downloadQuality, assignedAccountId } = get();
    if (!prompt.trim()) {
      set({ error: 'Please enter a visual prompt for direct generation' });
      return false;
    }

    set({ isGenerating: true, error: null });
    try {
      if (window.flowWorkspace?.generation) {
        const job = await window.flowWorkspace.generation.createDirectJob({
          prompt: prompt.trim(),
          type,
          inputMode,
          model: model === 'Auto' ? undefined : model,
          aspectRatio,
          duration: type === 'IMAGE' ? undefined : duration,
          generationCount,
          downloadQuality,
          assignedAccountId: assignedAccountId || undefined
        });

        set({ isGenerating: false, lastCreatedJobId: job.jobId, prompt: '' });
        return true;
      }
      set({ isGenerating: false });
      return false;
    } catch (err: any) {
      set({ isGenerating: false, error: err.message || 'Direct generation failed' });
      return false;
    }
  }
}));
