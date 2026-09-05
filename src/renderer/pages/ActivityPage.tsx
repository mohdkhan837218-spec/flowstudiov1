import React, { useEffect, useState } from 'react';
import { Activity, Trash2, RefreshCw } from 'lucide-react';
import { useActivityStore } from '../stores/activityStore';
import { ForensicFlowDebugger } from '../components/diagnostics/ForensicFlowDebugger';
import { FlowDiagnosticError } from '../../shared/types/diagnostics';

export const ActivityPage: React.FC = () => {
  const { logs, isLoading, loadLogs, clearLogs } = useActivityStore();
  const [latestError, setLatestError] = useState<FlowDiagnosticError | null>(null);

  useEffect(() => {
    loadLogs();
    if (window.flowWorkspace?.diagnostics) {
      window.flowWorkspace.diagnostics.listErrors().then((res) => {
        if (res.success && res.errors && res.errors.length > 0) {
          setLatestError(res.errors[0]);
        }
      });
    }
  }, [loadLogs]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Three-Level Forensic Flow Debugger */}
      <ForensicFlowDebugger
        logs={logs}
        activeDiagnostic={latestError}
        onClearLogs={clearLogs}
        onRefreshLogs={loadLogs}
        onRetryJob={(jobId) => {
          window.flowWorkspace?.diagnostics?.retryJob(jobId);
        }}
      />
    </div>
  );
};
