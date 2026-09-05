import { create } from 'zustand';
import { ActivityLogEntry, LogSeverity } from '../../shared/types/activity';
import { FlowDiagnosticError, TerminalLogCategory } from '../../shared/types/diagnostics';

const MAX_DISPLAY_LOGS = 5000;

export interface TerminalFilterState {
  searchQuery: string;
  severityFilter: 'ALL' | 'ERRORS' | 'WARNINGS';
  categoryFilter: TerminalLogCategory;
  liveDebug: boolean; // default false -> hides TRACE and DEBUG
  selectedJobId?: string;
  selectedWorkerId?: string;
  selectedAccountId?: string;
}

export interface TerminalStoreState {
  logs: ActivityLogEntry[];
  filteredLogs: ActivityLogEntry[];
  filters: TerminalFilterState;
  isPaused: boolean;
  autoScroll: boolean;
  hasNewLogsWhilePaused: boolean;
  unreadCountWhilePaused: number;
  
  // Drawer & Inspector
  selectedLog: ActivityLogEntry | null;
  selectedError: FlowDiagnosticError | null;
  isDrawerOpen: boolean;
  isDrawerPinned: boolean;
  drawerWidth: number;
  activeDrawerTab: 'overview' | 'timeline' | 'element' | 'state' | 'dom' | 'screenshot' | 'recovery';
  
  // Simulator Modal
  isSimulatorOpen: boolean;

  // Actions
  initialize: () => () => void;
  addLog: (entry: ActivityLogEntry) => void;
  setSearchQuery: (query: string) => void;
  setSeverityFilter: (sev: 'ALL' | 'ERRORS' | 'WARNINGS') => void;
  setCategoryFilter: (cat: TerminalLogCategory) => void;
  setLiveDebug: (enabled: boolean) => void;
  setTargetFilter: (type: 'job' | 'worker' | 'account' | null, id?: string) => void;
  togglePause: () => void;
  setAutoScroll: (enabled: boolean) => void;
  clearDisplay: () => void;
  
  // Inspector Actions
  selectLog: (log: ActivityLogEntry) => Promise<void>;
  selectError: (error: FlowDiagnosticError) => void;
  closeDrawer: () => void;
  togglePinDrawer: () => void;
  setDrawerWidth: (width: number) => void;
  setActiveDrawerTab: (tab: 'overview' | 'timeline' | 'element' | 'state' | 'dom' | 'screenshot' | 'recovery') => void;
  setSimulatorOpen: (open: boolean) => void;
  
  // Exports
  exportLogs: (format: 'json' | 'txt' | 'csv') => void;
  exportDebugBundle: (errorId: string) => Promise<string | null>;
  copyErrorReport: (error: FlowDiagnosticError) => Promise<boolean>;
}

function filterLogs(logs: ActivityLogEntry[], filters: TerminalFilterState): ActivityLogEntry[] {
  return logs.filter((log) => {
    // 1. Live Debug Mode: if false, hide TRACE and DEBUG
    if (!filters.liveDebug && (log.severity === 'TRACE' || log.severity === 'DEBUG')) {
      return false;
    }

    // 2. Severity filter
    if (filters.severityFilter === 'ERRORS' && log.severity !== 'ERROR' && log.severity !== 'CRITICAL') {
      return false;
    }
    if (filters.severityFilter === 'WARNINGS' && log.severity !== 'WARNING') {
      return false;
    }

    // 3. Category filter
    if (filters.categoryFilter !== 'ALL') {
      const logCat = (log.category || log.component || '').toUpperCase();
      if (!logCat.includes(filters.categoryFilter)) {
        return false;
      }
    }

    // 4. Target filters (Job, Worker, Account)
    if (filters.selectedJobId && log.jobId !== filters.selectedJobId) {
      return false;
    }
    if (filters.selectedWorkerId && log.workerId !== filters.selectedWorkerId) {
      return false;
    }
    if (filters.selectedAccountId && log.accountId !== filters.selectedAccountId) {
      return false;
    }

    // 5. Text Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchCode = (log.errorCode || '').toLowerCase().includes(q);
      const matchComp = log.component.toLowerCase().includes(q);
      const matchStage = (log.stage || '').toLowerCase().includes(q);
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchJob = (log.jobId || '').toLowerCase().includes(q);
      const matchWorker = (log.workerId || '').toLowerCase().includes(q);
      const matchAccount = (log.accountId || '').toLowerCase().includes(q);
      const matchProject = (log.projectId || '').toLowerCase().includes(q);
      if (!matchMsg && !matchCode && !matchComp && !matchStage && !matchAction && !matchJob && !matchWorker && !matchAccount && !matchProject) {
        return false;
      }
    }

    return true;
  });
}

export const useTerminalStore = create<TerminalStoreState>((set, get) => ({
  logs: [],
  filteredLogs: [],
  filters: {
    searchQuery: '',
    severityFilter: 'ALL',
    categoryFilter: 'ALL',
    liveDebug: false
  },
  isPaused: false,
  autoScroll: true,
  hasNewLogsWhilePaused: false,
  unreadCountWhilePaused: 0,
  
  selectedLog: null,
  selectedError: null,
  isDrawerOpen: false,
  isDrawerPinned: false,
  drawerWidth: 460,
  activeDrawerTab: 'overview',
  isSimulatorOpen: false,

  initialize: () => {
    // Initial fetch of logs if available
    if (typeof window !== 'undefined' && window.flowWorkspace?.activity?.list) {
      window.flowWorkspace.activity.list(200).then((initialLogs) => {
        if (initialLogs && initialLogs.length > 0) {
          const sorted = [...initialLogs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          set((state) => ({
            logs: sorted,
            filteredLogs: filterLogs(sorted, state.filters)
          }));
        }
      }).catch(() => {});
    }

    // Subscribe to live terminal log events
    const unsub = window.flowWorkspace?.events?.onTerminalLog?.((newLog) => {
      get().addLog(newLog);
    });

    return () => {
      if (unsub) unsub();
    };
  },

  addLog: (entry: ActivityLogEntry) => {
    set((state) => {
      const isPaused = state.isPaused;
      const nextLogs = [...state.logs, entry];
      if (nextLogs.length > MAX_DISPLAY_LOGS) {
        nextLogs.splice(0, nextLogs.length - MAX_DISPLAY_LOGS);
      }

      if (isPaused) {
        return {
          logs: nextLogs,
          hasNewLogsWhilePaused: true,
          unreadCountWhilePaused: state.unreadCountWhilePaused + 1
        };
      }

      return {
        logs: nextLogs,
        filteredLogs: filterLogs(nextLogs, state.filters),
        hasNewLogsWhilePaused: false,
        unreadCountWhilePaused: 0
      };
    });
  },

  setSearchQuery: (query: string) => {
    set((state) => {
      const nextFilters = { ...state.filters, searchQuery: query };
      return {
        filters: nextFilters,
        filteredLogs: filterLogs(state.logs, nextFilters)
      };
    });
  },

  setSeverityFilter: (sev: 'ALL' | 'ERRORS' | 'WARNINGS') => {
    set((state) => {
      const nextFilters = { ...state.filters, severityFilter: sev };
      return {
        filters: nextFilters,
        filteredLogs: filterLogs(state.logs, nextFilters)
      };
    });
  },

  setCategoryFilter: (cat: TerminalLogCategory) => {
    set((state) => {
      const nextFilters = { ...state.filters, categoryFilter: cat };
      return {
        filters: nextFilters,
        filteredLogs: filterLogs(state.logs, nextFilters)
      };
    });
  },

  setLiveDebug: (enabled: boolean) => {
    set((state) => {
      const nextFilters = { ...state.filters, liveDebug: enabled };
      return {
        filters: nextFilters,
        filteredLogs: filterLogs(state.logs, nextFilters)
      };
    });
  },

  setTargetFilter: (type, id) => {
    set((state) => {
      const nextFilters = {
        ...state.filters,
        selectedJobId: type === 'job' ? id : undefined,
        selectedWorkerId: type === 'worker' ? id : undefined,
        selectedAccountId: type === 'account' ? id : undefined
      };
      return {
        filters: nextFilters,
        filteredLogs: filterLogs(state.logs, nextFilters)
      };
    });
  },

  togglePause: () => {
    set((state) => {
      const nextPaused = !state.isPaused;
      if (!nextPaused) {
        // Resuming: apply filters to all accumulated logs
        return {
          isPaused: false,
          hasNewLogsWhilePaused: false,
          unreadCountWhilePaused: 0,
          filteredLogs: filterLogs(state.logs, state.filters)
        };
      }
      return { isPaused: true };
    });
  },

  setAutoScroll: (enabled: boolean) => {
    set({ autoScroll: enabled });
  },

  clearDisplay: () => {
    set({
      logs: [],
      filteredLogs: [],
      hasNewLogsWhilePaused: false,
      unreadCountWhilePaused: 0
    });
  },

  selectLog: async (log: ActivityLogEntry) => {
    set({ selectedLog: log, isDrawerOpen: true });

    // Look up diagnostic error by errorId or jobId
    const searchId = log.errorId || log.errorCode || log.jobId;
    if (searchId && window.flowWorkspace?.diagnostics?.getJobError) {
      try {
        const res = await window.flowWorkspace.diagnostics.getJobError(searchId);
        if (res.success && res.error) {
          set({ selectedError: res.error });
          return;
        }
      } catch {}
    }

    // Fallback: Synthesize diagnostic error from log metadata if not registered
    if (log.severity === 'ERROR' || log.severity === 'CRITICAL' || log.errorCode) {
      const fallbackError: FlowDiagnosticError = {
        errorId: log.errorId || `err_${log.id}`,
        code: (log.errorCode as any) || 'UNKNOWN_ERROR',
        category: 'UNKNOWN_ERROR',
        severity: log.severity as any,
        stage: log.stage || log.component,
        step: log.action || 'EXECUTE_ACTION',
        message: log.message,
        humanExplanation: log.message,
        jobId: log.jobId || undefined,
        workerId: log.workerId || undefined,
        accountId: log.accountId || undefined,
        projectId: log.projectId || undefined,
        expected: {},
        actual: {},
        lastSuccessfulStep: 'LOG_RECORDED',
        currentAction: log.action || log.message,
        nextRecommendedAction: 'Inspect terminal timeline and retry operation',
        likelyRootCause: log.message,
        confidence: 'MEDIUM',
        evidence: [log.message],
        retryable: true,
        retryStrategy: 'REINSPECT_AND_RETRY',
        maxRetries: 3,
        attempt: 1,
        timestamp: log.timestamp,
        timeline: [
          {
            actionId: log.id,
            time: log.timestamp.split('T')[1]?.slice(0, 8) || '00:00:00',
            stage: log.stage || log.component,
            step: log.action || 'LOG_ENTRY',
            action: log.message,
            result: log.severity === 'ERROR' || log.severity === 'CRITICAL' ? 'FAILED' : 'SUCCESS'
          }
        ]
      };
      set({ selectedError: fallbackError });
    }
  },

  selectError: (error: FlowDiagnosticError) => {
    set({ selectedError: error, isDrawerOpen: true });
  },

  closeDrawer: () => {
    set({ isDrawerOpen: false, selectedLog: null });
  },

  togglePinDrawer: () => {
    set((state) => ({ isDrawerPinned: !state.isDrawerPinned }));
  },

  setDrawerWidth: (width: number) => {
    set({ drawerWidth: Math.max(340, Math.min(800, width)) });
  },

  setActiveDrawerTab: (tab) => {
    set({ activeDrawerTab: tab });
  },

  setSimulatorOpen: (open) => {
    set({ isSimulatorOpen: open });
  },

  exportLogs: (format) => {
    const { filteredLogs } = get();
    let content = '';
    let filename = `flow-terminal-logs-${Date.now()}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const header = 'Timestamp,Severity,Component,Category,Stage,Action,JobId,WorkerId,ErrorCode,Message\n';
      const rows = filteredLogs.map((l) =>
        [
          `"${l.timestamp}"`,
          `"${l.severity}"`,
          `"${l.component}"`,
          `"${l.category || ''}"`,
          `"${l.stage || ''}"`,
          `"${l.action || ''}"`,
          `"${l.jobId || ''}"`,
          `"${l.workerId || ''}"`,
          `"${l.errorCode || ''}"`,
          `"${(l.message || '').replace(/"/g, '""')}"`
        ].join(',')
      );
      content = header + rows.join('\n');
      filename += '.csv';
      mimeType = 'text/csv';
    } else {
      content = filteredLogs
        .map((l) => `[${l.timestamp}] [${l.severity.padEnd(8)}] [${l.component}] ${l.message}`)
        .join('\n');
      filename += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportDebugBundle: async (errorId: string) => {
    if (window.flowWorkspace?.diagnostics?.exportBundle) {
      const res = await window.flowWorkspace.diagnostics.exportBundle(errorId);
      return res.success && res.bundlePath ? res.bundlePath : null;
    }
    return null;
  },

  copyErrorReport: async (error: FlowDiagnosticError) => {
    const report = [
      '==================================================',
      'FLOW STUDIO FORENSIC ERROR REPORT',
      '==================================================',
      `Error Code:      ${error.code}`,
      `Severity:        ${error.severity}`,
      `Stage:           ${error.stage}`,
      `Step:            ${error.step}`,
      `Job ID:          ${error.jobId || 'N/A'}`,
      `Worker ID:       ${error.workerId || 'N/A'}`,
      `Account ID:      ${error.accountId || 'N/A'}`,
      `Project ID:      ${error.projectId || 'N/A'}`,
      `Flow URL:        ${error.flowUrl || 'N/A'}`,
      `Timestamp:       ${error.timestamp}`,
      '--------------------------------------------------',
      `Likely Cause:    ${error.likelyRootCause}`,
      `Confidence:      ${error.confidence}`,
      `Recovery Strat:  ${error.retryStrategy} (Max Retries: ${error.maxRetries})`,
      '--------------------------------------------------',
      'EVIDENCE:',
      ...(error.evidence || []).map((e) => `  - ${e}`),
      '--------------------------------------------------',
      'TIMELINE TRACE:',
      ...(error.timeline || []).map(
        (t) => `  [${t.time}] [${t.stage}] ${t.action} -> ${t.result}${t.detail ? ` (${t.detail})` : ''}`
      ),
      '=================================================='
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      return true;
    } catch {
      return false;
    }
  }
}));
