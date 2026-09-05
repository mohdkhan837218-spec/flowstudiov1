import { create } from 'zustand';
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/types/settings';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  isSaving: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setScale: (scale: number) => Promise<void>;
  setDensity: (density: 'comfortable' | 'standard' | 'compact') => Promise<void>;
  selectDownloadDir: () => Promise<void>;
}

export const applyScaleToDOM = (scale: number, density: 'comfortable' | 'standard' | 'compact' = 'standard') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const clampedScale = Math.min(Math.max(Math.round(scale * 100) / 100, 0.75), 1.30);
  root.style.setProperty('--ui-scale', String(clampedScale));

  const densityMap: Record<string, string> = {
    comfortable: '1.15',
    standard: '1.0',
    compact: '0.85'
  };
  root.style.setProperty('--density-factor', densityMap[density] || '1.0');
  root.setAttribute('data-density', density);
  root.setAttribute('data-scale', `${Math.round(clampedScale * 100)}%`);
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isSaving: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      if (window.flowWorkspace) {
        const settings = await window.flowWorkspace.settings.get();
        const fullSettings = { ...DEFAULT_SETTINGS, ...settings };
        applyScaleToDOM(fullSettings.uiScale, fullSettings.uiDensity);
        set({ settings: fullSettings, isLoading: false });
      } else {
        applyScaleToDOM(DEFAULT_SETTINGS.uiScale, DEFAULT_SETTINGS.uiDensity);
        set({ isLoading: false });
      }
    } catch {
      applyScaleToDOM(DEFAULT_SETTINGS.uiScale, DEFAULT_SETTINGS.uiDensity);
      set({ isLoading: false });
    }
  },

  updateSettings: async (patch: Partial<AppSettings>) => {
    set({ isSaving: true });
    try {
      const nextScale = patch.uiScale ?? get().settings.uiScale;
      const nextDensity = patch.uiDensity ?? get().settings.uiDensity;
      applyScaleToDOM(nextScale, nextDensity);

      if (window.flowWorkspace) {
        const updated = await window.flowWorkspace.settings.update(patch);
        set({ settings: { ...DEFAULT_SETTINGS, ...updated }, isSaving: false });
      } else {
        set((state) => ({ settings: { ...state.settings, ...patch }, isSaving: false }));
      }
    } catch {
      set({ isSaving: false });
    }
  },

  setScale: async (scale: number) => {
    const clamped = Math.min(Math.max(Math.round(scale * 100) / 100, 0.75), 1.30);
    await get().updateSettings({ uiScale: clamped });
  },

  setDensity: async (density: 'comfortable' | 'standard' | 'compact') => {
    await get().updateSettings({ uiDensity: density });
  },

  selectDownloadDir: async () => {
    if (window.flowWorkspace) {
      const selected = await window.flowWorkspace.settings.selectDownloadDirectory();
      if (selected) {
        set((state) => ({
          settings: { ...state.settings, downloadDirectory: selected }
        }));
      }
    }
  }
}));
