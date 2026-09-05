import { describe, it, expect, beforeEach } from 'vitest';
import { useTerminalStore } from '../../src/renderer/stores/terminalStore';
import { FlowDiagnosticBundle } from '../../src/main/diagnostics/FlowDiagnosticBundle';
import { ActivityLogEntry } from '../../src/shared/types/activity';

describe('Error Terminal & Forensic Console Unit Tests', () => {
  beforeEach(() => {
    useTerminalStore.getState().clearDisplay();
    useTerminalStore.getState().setSearchQuery('');
    useTerminalStore.getState().setSeverityFilter('ALL');
    useTerminalStore.getState().setCategoryFilter('ALL');
    useTerminalStore.getState().setLiveDebug(false);
    FlowDiagnosticBundle.clearHistory();
  });

  it('ingests structured logs and maintains proper filtering', () => {
    const store = useTerminalStore.getState();

    const sampleLog: ActivityLogEntry = {
      id: 'log_1',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      component: 'FlowProjectManager',
      category: 'PROJECT',
      stage: 'OPEN_PROJECT',
      action: 'NAVIGATE',
      message: 'Project opened successfully',
      jobId: 'job_123'
    };

    store.addLog(sampleLog);
    expect(useTerminalStore.getState().logs.length).toBe(1);
    expect(useTerminalStore.getState().filteredLogs.length).toBe(1);
  });

  it('hides TRACE and DEBUG logs when Live Debug mode is OFF, and reveals them when ON', () => {
    const store = useTerminalStore.getState();

    store.addLog({
      id: 'log_debug',
      timestamp: new Date().toISOString(),
      severity: 'DEBUG',
      component: 'FlowWorkspaceInspector',
      category: 'COMPOSER',
      message: 'Composer container verified in DOM'
    });

    store.addLog({
      id: 'log_info',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      component: 'FlowProjectManager',
      category: 'PROJECT',
      message: 'Project workspace loaded'
    });

    // Default: liveDebug = false -> only INFO visible
    expect(useTerminalStore.getState().filteredLogs.length).toBe(1);
    expect(useTerminalStore.getState().filteredLogs[0].severity).toBe('INFO');

    // Turn ON Live Debug
    store.setLiveDebug(true);
    expect(useTerminalStore.getState().filteredLogs.length).toBe(2);
  });

  it('filters logs by severity levels (ERRORS / WARNINGS)', () => {
    const store = useTerminalStore.getState();

    store.addLog({
      id: 'l1',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      component: 'FlowWorkspace',
      message: 'Workspace ok'
    });
    store.addLog({
      id: 'l2',
      timestamp: new Date().toISOString(),
      severity: 'WARNING',
      component: 'DOMResolver',
      message: 'Selector candidate 1 failed'
    });
    store.addLog({
      id: 'l3',
      timestamp: new Date().toISOString(),
      severity: 'ERROR',
      component: 'FlowModeResolver',
      message: 'VIDEO mode button not verified'
    });

    store.setSeverityFilter('ERRORS');
    expect(useTerminalStore.getState().filteredLogs.length).toBe(1);
    expect(useTerminalStore.getState().filteredLogs[0].severity).toBe('ERROR');

    store.setSeverityFilter('WARNINGS');
    expect(useTerminalStore.getState().filteredLogs.length).toBe(1);
    expect(useTerminalStore.getState().filteredLogs[0].severity).toBe('WARNING');
  });

  it('filters logs by category and text search query', () => {
    const store = useTerminalStore.getState();

    store.addLog({
      id: 'c1',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      component: 'FlowProjectManager',
      category: 'NAVIGATION',
      message: 'Navigating to project URL'
    });
    store.addLog({
      id: 'c2',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      component: 'FlowSubmissionManager',
      category: 'SUBMISSION',
      message: 'Submitting prompt'
    });

    store.setCategoryFilter('NAVIGATION');
    expect(useTerminalStore.getState().filteredLogs.length).toBe(1);
    expect(useTerminalStore.getState().filteredLogs[0].category).toBe('NAVIGATION');

    store.setCategoryFilter('ALL');
    store.setSearchQuery('Submitting');
    expect(useTerminalStore.getState().filteredLogs.length).toBe(1);
    expect(useTerminalStore.getState().filteredLogs[0].message).toContain('Submitting');
  });

  it('buffers logs while paused without updating display, and flushes on resume', () => {
    const store = useTerminalStore.getState();

    store.togglePause();
    expect(useTerminalStore.getState().isPaused).toBe(true);

    store.addLog({
      id: 'p1',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      component: 'WorkerManager',
      message: 'Worker heartbeat'
    });

    expect(useTerminalStore.getState().hasNewLogsWhilePaused).toBe(true);
    expect(useTerminalStore.getState().unreadCountWhilePaused).toBe(1);
    expect(useTerminalStore.getState().filteredLogs.length).toBe(0);

    store.togglePause();
    expect(useTerminalStore.getState().isPaused).toBe(false);
    expect(useTerminalStore.getState().filteredLogs.length).toBe(1);
  });

  it('simulates forensic errors with exact error chains and root-cause confidence', () => {
    const wrongRouteErr = FlowDiagnosticBundle.simulateDiagnosticError('WRONG_ROUTE');
    expect(wrongRouteErr.code).toBe('FLOW_WRONG_ROUTE');
    expect(wrongRouteErr.confidence).toBe('HIGH');
    expect(wrongRouteErr.retryStrategy).toBe('RETURN_TO_GENERATION_WORKSPACE');
    expect(wrongRouteErr.timeline.length).toBeGreaterThan(0);

    const videoErr = FlowDiagnosticBundle.simulateDiagnosticError('VIDEO_BUTTON_MISSING');
    expect(videoErr.code).toBe('FLOW_MODE_BUTTON_NOT_FOUND');
    expect(videoErr.discoveryMethods?.length).toBeGreaterThan(0);
    expect(videoErr.stateTransition?.result).toBe('FLOW_MODE_TRANSITION_FAILED');

    const timeoutErr = FlowDiagnosticBundle.simulateDiagnosticError('GENERATION_TIMEOUT');
    expect(timeoutErr.code).toBe('FLOW_GENERATION_TIMEOUT');
    expect(timeoutErr.resultDetection?.status).toBe('TIMEOUT');
  });

  it('sanitizes sensitive data in debug bundles and error exports', () => {
    const sensitive = {
      token: 'secret_token_12345',
      password: 'mypassword',
      cookie: 'session_cookie=abcde',
      safeField: 'normal_data'
    };

    const clean = FlowDiagnosticBundle.sanitizeData(sensitive);
    expect(clean.token).toBe('[REDACTED]');
    expect(clean.password).toBe('[REDACTED]');
    expect(clean.cookie).toBe('[REDACTED]');
    expect(clean.safeField).toBe('normal_data');
  });
});
