import { create } from 'zustand';
import { GenerationMedia, LiveGenerationStats } from '../../shared/types/preview';

interface LiveGenerationState {
  activeGenerations: GenerationMedia[];
  recentGenerations: GenerationMedia[];
  stats: LiveGenerationStats;
  selectedJobId: string | null;
  filter: string; // 'ALL' | 'GENERATING' | 'IMAGES' | 'VIDEOS' | 'COMPLETED' | 'FAILED' | 'SANDBOX' | 'REAL'
  searchQuery: string;
  sortBy: 'newest' | 'oldest' | 'worker' | 'status' | 'project';
  isLoading: boolean;

  loadGenerations: () => Promise<void>;
  selectGeneration: (jobId: string | null) => void;
  setFilter: (filter: string) => void;
  setSearchQuery: (searchQuery: string) => void;
  setSortBy: (sortBy: 'newest' | 'oldest' | 'worker' | 'status' | 'project') => void;
  removePreview: (jobId: string) => Promise<void>;
  setupSubscriptions: () => () => void;
}

export const useLiveGenerationStore = create<LiveGenerationState>((set, get) => ({
  activeGenerations: [],
  recentGenerations: [],
  stats: {
    activeCount: 0,
    videoCount: 0,
    imageCount: 0,
    completedCount: 0,
    failedCount: 0
  },
  selectedJobId: null,
  filter: 'ALL',
  searchQuery: '',
  sortBy: 'newest',
  isLoading: false,

  loadGenerations: async () => {
    try {
      set({ isLoading: true });
      const [active, recent, stats] = await Promise.all([
        window.flowWorkspace.preview.getActive(),
        window.flowWorkspace.preview.getRecent(30),
        window.flowWorkspace.preview.getStats()
      ]);

      set({
        activeGenerations: active,
        recentGenerations: recent,
        stats,
        isLoading: false,
        // Auto-select first active if none selected and active exist
        selectedJobId: get().selectedJobId || (active.length > 0 ? active[0].jobId : recent.length > 0 ? recent[0].jobId : null)
      });
    } catch (err) {
      console.error('Failed to load live generations:', err);
      set({ isLoading: false });
    }
  },

  selectGeneration: (jobId: string | null) => {
    set({ selectedJobId: jobId });
  },

  setFilter: (filter: string) => {
    set({ filter });
  },

  setSearchQuery: (searchQuery: string) => {
    set({ searchQuery });
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
  },

  removePreview: async (jobId: string) => {
    try {
      await window.flowWorkspace.preview.remove(jobId);
      set((state) => ({
        activeGenerations: state.activeGenerations.filter((m) => m.jobId !== jobId),
        recentGenerations: state.recentGenerations.filter((m) => m.jobId !== jobId),
        selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId
      }));
    } catch (err) {
      console.error('Failed to remove generation preview:', err);
    }
  },

  setupSubscriptions: () => {
    const unsubUpdate = window.flowWorkspace.events.onGenerationUpdated((media: GenerationMedia) => {
      set((state) => {
        const isActive =
          media.status !== 'COMPLETED' &&
          media.status !== 'FAILED' &&
          media.status !== 'CANCELLED';

        let newActive = [...state.activeGenerations];
        let newRecent = [...state.recentGenerations];

        const activeIdx = newActive.findIndex((m) => m.jobId === media.jobId);
        if (isActive) {
          if (activeIdx >= 0) {
            newActive[activeIdx] = media;
          } else {
            newActive.unshift(media);
          }
        } else {
          if (activeIdx >= 0) {
            newActive.splice(activeIdx, 1);
          }
          const recentIdx = newRecent.findIndex((m) => m.jobId === media.jobId);
          if (recentIdx >= 0) {
            newRecent[recentIdx] = media;
          } else {
            newRecent.unshift(media);
          }
        }

        return {
          activeGenerations: newActive,
          recentGenerations: newRecent,
          stats: {
            activeCount: newActive.length,
            videoCount: newActive.filter((m) => m.generationType === 'VIDEO').length,
            imageCount: newActive.filter((m) => m.generationType === 'IMAGE').length,
            completedCount: newRecent.filter((m) => m.status === 'COMPLETED').length,
            failedCount: newRecent.filter((m) => m.status === 'FAILED').length
          }
        };
      });
    });

    const unsubRemove = window.flowWorkspace.events.onGenerationRemoved((jobId: string) => {
      set((state) => ({
        activeGenerations: state.activeGenerations.filter((m) => m.jobId !== jobId),
        recentGenerations: state.recentGenerations.filter((m) => m.jobId !== jobId),
        selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId
      }));
    });

    return () => {
      unsubUpdate();
      unsubRemove();
    };
  }
}));
