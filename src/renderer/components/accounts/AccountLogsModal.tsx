import React from 'react';
import { Modal } from '../common/Modal';
import { GoogleAccount } from '../../../shared/types/account';
import { useActivityStore } from '../../stores/activityStore';
import { Terminal, Clock } from 'lucide-react';

interface AccountLogsModalProps {
  account: GoogleAccount | null;
  onClose: () => void;
}

export const AccountLogsModal: React.FC<AccountLogsModalProps> = ({ account, onClose }) => {
  const { logs } = useActivityStore();
  if (!account) return null;

  const accountLogs = logs.filter((l) => l.accountId === account.id);

  return (
    <Modal
      isOpen={!!account}
      onClose={onClose}
      title={`Activity Logs — ${account.displayName}`}
      subtitle={`Internal ID: ${account.id} | Profile: ${account.profilePath}`}
      maxWidth="lg"
    >
      <div className="space-y-3">
        <div className="max-h-96 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-950/80 border border-white/5 font-mono text-xs">
          {accountLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Terminal className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p>No logged events for this account yet.</p>
            </div>
          ) : (
            accountLogs.map((log) => {
              const severityColors: Record<string, string> = {
                TRACE: 'text-neutral-500',
                DEBUG: 'text-slate-400',
                INFO: 'text-blue-400',
                SUCCESS: 'text-emerald-400',
                WARNING: 'text-amber-400',
                ERROR: 'text-rose-400',
                CRITICAL: 'text-red-500'
              };

              return (
                <div key={log.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-bold ${severityColors[log.severity]}`}>{log.severity}</span>
                  </div>
                  <div className="text-slate-200">{log.message}</div>
                  {log.metadata && (
                    <pre className="text-[10px] text-slate-400 overflow-x-auto bg-black/40 p-1.5 rounded">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
