import React from 'react';
import {
  LayoutDashboard,
  Users,
  Clapperboard,
  Activity,
  Settings,
  Sparkles,
  Terminal,
  Layers
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAccountStore } from '../../stores/accountStore';
import { useLiveGenerationStore } from '../../stores/liveGenerationStore';
import { useTerminalStore } from '../../stores/terminalStore';
import { useQueueStore } from '../../stores/queueStore';

export type NavTab = 'dashboard' | 'accounts' | 'projects' | 'queue' | 'live' | 'activity' | 'terminal' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { accounts } = useAccountStore();
  const { stats } = useLiveGenerationStore();
  const { logs } = useTerminalStore();
  const { summary } = useQueueStore();

  const connectedCount = accounts.filter(
    (a) => a.status === 'CONNECTED' || a.status === 'FLOW_READY' || a.status === 'GOOGLE_AUTHENTICATED' || Boolean(a.email)
  ).length;
  const errorCount = logs.filter((l) => l.severity === 'ERROR' || l.severity === 'CRITICAL').length;
  const activeJobsCount = (summary?.queued || 0) + (summary?.running || 0);

  const mainNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'accounts' as NavTab,
      label: 'Accounts',
      icon: Users,
      badge: accounts.length > 0 ? `${connectedCount}/${accounts.length}` : undefined,
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
    },
    {
      id: 'projects' as NavTab,
      label: 'Projects',
      icon: Clapperboard
    },
    {
      id: 'queue' as NavTab,
      label: 'Studio & Queue',
      icon: Layers,
      badge: stats.activeCount > 0 ? `${stats.activeCount}` : activeJobsCount > 0 ? `${activeJobsCount}` : undefined,
      badgeColor: stats.activeCount > 0 ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/25'
    },
    {
      id: 'activity' as NavTab,
      label: 'Live Activity',
      icon: Activity
    },
    {
      id: 'terminal' as NavTab,
      label: 'Error Terminal',
      icon: Terminal,
      badge: errorCount > 0 ? `${errorCount}` : undefined,
      badgeColor: 'bg-rose-500/25 text-rose-300 border border-rose-500/35 font-mono'
    }
  ];

  return (
    <aside className="w-60 min-w-[240px] max-w-[240px] border-r border-white/[0.07] bg-[#090d16] flex flex-col justify-between shrink-0 h-screen select-none z-20">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-white/[0.07] shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-950/60 border border-white/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>FLOW STUDIO</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                PRO
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase truncate">
              Video Automation
            </div>
          </div>
        </div>

        {/* Main Navigation List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Menu
          </div>

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || (item.id === 'queue' && currentTab === 'live');
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={clsx(
                  'w-full h-10 flex items-center justify-between px-3 rounded-xl text-[13px] font-medium transition-all duration-150 relative group saas-focus',
                  isActive
                    ? 'bg-indigo-600/20 text-white border border-indigo-500/35 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-sm shadow-indigo-500/50" />
                )}

                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={clsx(
                      'w-4.5 h-4.5 shrink-0 transition-colors',
                      isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={clsx(
                      'text-[11px] px-2 py-0.5 rounded-md font-mono font-medium shrink-0',
                      item.badgeColor || (isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800/80 text-slate-400')
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Section: Standard SaaS Settings Button */}
        <div className="p-3 border-t border-white/[0.07] shrink-0 bg-[#070a12]">
          <button
            onClick={() => onTabChange('settings')}
            className={clsx(
              'w-full h-10 flex items-center justify-between px-3 rounded-xl text-[13px] font-medium transition-all duration-150 relative group saas-focus',
              currentTab === 'settings'
                ? 'bg-indigo-600/20 text-white border border-indigo-500/35 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            )}
          >
            {currentTab === 'settings' && (
              <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />
            )}
            <div className="flex items-center gap-3">
              <Settings
                className={clsx(
                  'w-4.5 h-4.5 shrink-0 transition-colors',
                  currentTab === 'settings' ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              <span>Settings</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">v1.2</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
