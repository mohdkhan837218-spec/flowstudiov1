import React, { useState } from 'react';
import {
  Users,
  Sparkles,
  ArrowUpRight,
  UserPlus,
  Film,
  Layers,
  Activity,
  Zap,
  Play,
  Shield,
  CheckCircle2,
  Clock,
  Send
} from 'lucide-react';
import { AccountCard } from '../components/accounts/AccountCard';
import { Button } from '../components/common/Button';
import { useAccountStore } from '../stores/accountStore';
import { useActivityStore } from '../stores/activityStore';
import { useQueueStore } from '../stores/queueStore';
import { useLiveGenerationStore } from '../stores/liveGenerationStore';
import { GoogleAccount } from '../../shared/types/account';

interface DashboardPageProps {
  onAddAccountClick: () => void;
  onNavigateToAccounts: () => void;
  onNavigateToActivity: () => void;
  onNavigateToLive?: () => void;
  onViewLogs: (account: GoogleAccount) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onAddAccountClick,
  onNavigateToAccounts,
  onNavigateToActivity,
  onNavigateToLive,
  onViewLogs
}) => {
  const { accounts } = useAccountStore();
  const { logs } = useActivityStore();
  const { summary, processQueue, loadQueue } = useQueueStore();
  const { activeGenerations, recentGenerations, stats } = useLiveGenerationStore();

  // Quick Prompt Dispatch State
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickAspectRatio, setQuickAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [quickDuration, setQuickDuration] = useState<5 | 10>(10);
  const [isDispatching, setIsDispatching] = useState(false);

  const handleQuickDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim() || isDispatching) return;

    setIsDispatching(true);
    try {
      if (window.flowWorkspace?.generation?.createDirectJob) {
        await window.flowWorkspace.generation.createDirectJob({
          prompt: quickPrompt.trim(),
          aspectRatio: quickAspectRatio,
          duration: quickDuration,
          type: 'VIDEO'
        });
        setQuickPrompt('');
        await loadQueue();
        if (onNavigateToLive) onNavigateToLive();
      }
    } catch (err) {
      console.error('Quick dispatch error:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const connectedAccounts = accounts.filter(
    (a) =>
      a.status === 'CONNECTED' ||
      a.status === 'FLOW_READY' ||
      a.status === 'GOOGLE_AUTHENTICATED' ||
      a.status === 'OPEN' ||
      Boolean(a.email)
  );
  const flowReadyAccounts = accounts.filter((a) => a.flowStatus === 'READY' || a.status === 'FLOW_READY');

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto overflow-y-auto">
      {/* Top 4 Polished SaaS Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="saas-card p-3.5 rounded-xl flex items-center justify-between hover:border-emerald-500/30 transition-all">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Google Auth</span>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {connectedAccounts.length} / {accounts.length}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {accounts.length > 0 ? `${Math.round((connectedAccounts.length / accounts.length) * 100)}% Connected` : 'No profiles'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-950/40 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="saas-card p-3.5 rounded-xl flex items-center justify-between hover:border-indigo-500/30 transition-all">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flow Workers</span>
            <div className="text-lg font-bold font-mono text-indigo-300">
              {flowReadyAccounts.length} / {connectedAccounts.length || 1}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {flowReadyAccounts.length > 0 ? 'Workers ready' : 'Needs Flow launch'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-950/40 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="saas-card p-3.5 rounded-xl flex items-center justify-between hover:border-cyan-500/30 transition-all">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Renderings</span>
            <div className="text-lg font-bold font-mono text-cyan-400">
              {stats.activeCount}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {stats.videoCount} video, {stats.imageCount} image
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-cyan-950/40 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <Film className="w-4 h-4" />
          </div>
        </div>

        <div className="saas-card p-3.5 rounded-xl flex items-center justify-between hover:border-purple-500/30 transition-all">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Queue Dispatch</span>
            <div className="text-lg font-bold font-mono text-purple-300">
              {summary.running} run / {summary.queued} q
            </div>
            <span className="text-[10px] text-slate-500 block">
              {summary.completed} completed today
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-950/40 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2-COLUMN PRO SAAS STUDIO LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: 65% (Quick Generator Bar + Connected Accounts Grid) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Quick Prompt Dispatch Box */}
          <div className="saas-card p-4 rounded-2xl bg-gradient-to-b from-[#111625] to-[#0c101c] border border-white/[0.08] shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Quick Video Prompt Dispatch</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/[0.05]">
                Direct to Least-Loaded Worker
              </span>
            </div>

            <form onSubmit={handleQuickDispatch} className="space-y-2.5">
              <div className="relative">
                <input
                  type="text"
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="Describe your video shot (e.g. Cinematic drone view of futuristic city at sunset, 4k)..."
                  className="w-full h-11 pl-3.5 pr-28 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!quickPrompt.trim() || isDispatching}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Send className="w-3 h-3" />
                  <span>Generate</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">Aspect Ratio:</span>
                  {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setQuickAspectRatio(ratio)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-all ${
                        quickAspectRatio === ratio
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Duration:</span>
                  {[5, 10].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setQuickDuration(dur as 5 | 10)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-all ${
                        quickDuration === dur
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Connected Google Account Profiles Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Connected Google Profiles ({accounts.length})
                </h2>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.2 rounded border border-white/[0.06]">
                  Concurrency: {summary.concurrencyLimit} workers
                </span>
              </div>
              <button
                onClick={onNavigateToAccounts}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <span>Manage All</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="saas-card p-8 rounded-xl text-center space-y-3">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs font-semibold text-slate-300">No Google Accounts Connected</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Add your first isolated Google account profile to enable automated video generation.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onAddAccountClick}
                  icon={<UserPlus className="w-3.5 h-3.5" />}
                  className="mx-auto"
                >
                  Add First Account
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {accounts.map((account) => (
                  <AccountCard key={account.id} account={account} onViewLogs={onViewLogs} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 35% (System Health + Recent Media Previews + Activity Stream) */}
        <div className="lg:col-span-4 space-y-4">
          {/* System & Worker Health Widget */}
          <div className="saas-card p-3.5 rounded-xl space-y-3 bg-[#0d121f]">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Engine & Fleet Status</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% OK
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sandbox Isolation</span>
                <span className="text-slate-200 font-mono font-medium">Protected (Chromium)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Workers</span>
                <span className="text-indigo-300 font-mono font-bold">
                  {summary.activeWorkers} / {summary.concurrencyLimit} Running
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${(summary.activeWorkers / (summary.concurrencyLimit || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Generations Gallery / Output Preview */}
          <div className="saas-card p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Recent Outputs ({recentGenerations.length})</span>
              </span>
              {onNavigateToLive && (
                <button
                  onClick={onNavigateToLive}
                  className="text-[10px] text-indigo-300 hover:text-indigo-200 flex items-center gap-0.5 font-medium"
                >
                  <span>Studio Gallery</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {recentGenerations.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs space-y-1">
                <Film className="w-5 h-5 mx-auto text-slate-600" />
                <div>No completed videos yet</div>
                <p className="text-[10px] text-slate-600">Generated media will appear here for instant preview.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentGenerations.slice(0, 3).map((media) => (
                  <div
                    key={media.jobId}
                    onClick={onNavigateToLive}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-white/[0.04] hover:border-indigo-500/40 cursor-pointer transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white font-bold">{media.jobId}</span>
                      <span className="text-emerald-400">✓ Completed</span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-1 italic">
                      "{media.prompt}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time System Activity Stream */}
          <div className="saas-card p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Audit Logs</span>
              </span>
              <button
                onClick={onNavigateToActivity}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
              >
                <span>Full Logs</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-white/[0.04] max-h-36 overflow-y-auto text-xs font-mono">
              {logs.length === 0 ? (
                <div className="text-center py-4 text-slate-500 font-sans text-xs">No activity recorded yet.</div>
              ) : (
                logs.slice(0, 4).map((log) => (
                  <div key={log.id} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <span className="text-[9px] text-slate-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-slate-300 truncate text-[10px]">{log.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
