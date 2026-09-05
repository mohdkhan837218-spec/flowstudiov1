import { create } from 'zustand';
import { ActivityLogEntry, LogSeverity } from '../../shared/types/activity';

interface ActivityState {
  logs: ActivityLogEntry[];
  isLoading: boolean;
  severityFilter: LogSeverity | 'ALL';
  componentFilter: string;
  loadLogs: () => Promise<void>;
  addLog: (log: ActivityLogEntry) => void;
  clearLogs: () => Promise<void>;
  setSeverityFilter: (severity: LogSeverity | 'ALL') => void;
  setComponentFilter: (component: string) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  logs: [],
  isLoading: false,
  severityFilter: 'ALL',
  componentFilter: 'ALL',

  loadLogs: async () => {
    set({ isLoading: true });
    try {
      if (window.flowWorkspace) {
        const logs = await window.flowWorkspace.activity.list(300);
        set({ logs, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addLog: (log: ActivityLogEntry) => {
    set((state) => ({
      logs: [log, ...state.logs.slice(0, 499)]
    }));
  },

  clearLogs: async () => {
    if (window.flowWorkspace) {
      await window.flowWorkspace.activity.clear();
      set({ logs: [] });
    }
  },

  setSeverityFilter: (severityFilter) => set({ severityFilter }),
  setComponentFilter: (componentFilter) => set({ componentFilter })
}));
