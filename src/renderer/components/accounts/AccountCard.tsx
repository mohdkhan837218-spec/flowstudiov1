import React, { useState } from 'react';
import {
  ExternalLink,
  Play,
  Pause,
  Trash2,
  Power,
  Terminal,
  AlertTriangle,
  Clock,
  Globe,
  RefreshCw,
  Sparkles,
  MoreVertical,
  Cpu
} from 'lucide-react';
import { GoogleAccount } from '../../../shared/types/account';
import { StatusIndicator } from '../common/StatusIndicator';
import { Button } from '../common/Button';
import { useAccountStore } from '../../stores/accountStore';
import { useLiveGenerationStore } from '../../stores/liveGenerationStore';

interface AccountCardProps {
  account: GoogleAccount;
  onViewLogs?: (account: GoogleAccount) => void;
  onNavigateToLive?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onViewLogs, onNavigateToLive }) => {
  const { activeGenerations } = useLiveGenerationStore();
  const activeJob = activeGenerations.find((m) => m.accountId === account.id);
  const {
    openProfile,
    closeProfile,
    connectAccount,
    pauseAccount,
    resumeAccount,
    removeAccount,
    openFlow,
    checkFlow
  } = useAccountStore();

  const [isActing, setIsActing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleOpen = async () => {
    setIsActing(true);
    await openProfile(account.id);
    setIsActing(false);
  };

  const handleCloseBrowser = async () => {
    setIsActing(true);
    await closeProfile(account.id);
    setIsActing(false);
  };

  const handleConnect = async () => {
    setIsActing(true);
    await connectAccount(account.id);
    setIsActing(false);
  };

  const handleOpenFlow = async () => {
    setIsActing(true);
    await openFlow(account.id);
    setIsActing(false);
  };

  const handleCheckFlow = async () => {
    setIsActing(true);
    await checkFlow(account.id);
    setIsActing(false);
  };

  const handleTogglePause = async () => {
    setIsActing(true);
    if (account.status === 'PAUSED') {
      await resumeAccount(account.id);
    } else {
      await pauseAccount(account.id);
    }
    setIsActing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setIsActing(true);
    await removeAccount(account.id);
    setIsActing(false);
  };

  const isBrowserOpen = account.browserStatus === 'OPEN' || account.browserStatus === 'BUSY';
  const isGoogleConnected =
    account.status === 'CONNECTED' ||
    account.status === 'FLOW_READY' ||
    account.status === 'GOOGLE_AUTHENTICATED' ||
    account.status === 'OPEN' ||
    Boolean(account.email);
  const isFlowReady = account.flowStatus === 'READY' || account.status === 'FLOW_READY';

  return (
    <div className="saas-card rounded-xl p-3.5 relative flex flex-col justify-between w-full min-w-[280px] transition-all duration-150 hover:border-indigo-500/40 select-none space-y-3">
      <div className="space-y-2.5">
        {/* Top Header: Full Account Name, ID badge, Status Pill & Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold text-white tracking-tight truncate">
              {account.displayName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-white/[0.04]">
                {account.id}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate">
                {account.email || 'No email linked'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <StatusIndicator status={account.browserStatus} size="sm" />
            <div className="relative">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowMenu(!showMenu)}
                icon={<MoreVertical className="w-3.5 h-3.5 text-slate-400" />}
                className="h-6 w-6 p-0"
              />
              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 w-40 saas-modal rounded-lg p-1 shadow-2xl z-40 space-y-0.5"
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <button
                    onClick={() => {
                      handleCheckFlow();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-[11px] text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" />
                    <span>Check Flow Health</span>
                  </button>
                  {onViewLogs && (
                    <button
                      onClick={() => {
                        onViewLogs(account);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-md text-[11px] text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                    >
                      <Terminal className="w-3 h-3 text-slate-400" />
                      <span>Inspect Logs</span>
                    </button>
                  )}
                  <div className="border-t border-white/[0.06] my-0.5" />
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-[11px] text-rose-400 hover:bg-rose-950/40 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{confirmDelete ? 'Confirm Delete' : 'Delete Account'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auth & Flow Status Badges (Compact 2-Column) */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-2 rounded-lg bg-slate-950/70 border border-white/[0.04] flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Google Auth:</span>
            <StatusIndicator
              status={isGoogleConnected ? 'CONNECTED' : account.status}
              label={isGoogleConnected ? 'Connected' : 'Not Connected'}
              size="sm"
            />
          </div>

          <div className="p-2 rounded-lg bg-slate-950/70 border border-white/[0.04] flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Google Flow:</span>
            <StatusIndicator
              status={account.flowStatus || 'NOT_READY'}
              label={isFlowReady ? 'Ready' : 'Not Ready'}
              size="sm"
            />
          </div>
        </div>

        {/* Error Notice If Present */}
        {account.lastError && (
          <div className="p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-start gap-1.5 text-[10px] text-amber-200">
            <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400 mt-0.5" />
            <span className="line-clamp-1">{account.lastError}</span>
          </div>
        )}

        {/* Compact Metadata Strip */}
        <div className="px-2 py-1.5 rounded-lg bg-slate-950/50 border border-white/[0.03] flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Active: {account.lastActiveAt ? new Date(account.lastActiveAt).toLocaleTimeString() : 'Never'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-500" />
            <span>Worker: {isFlowReady ? 'Ready' : 'Idle'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="pt-2 border-t border-white/[0.05] space-y-1.5">
        {/* Active Generation Banner Button */}
        {activeJob && onNavigateToLive && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToLive}
            icon={<Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />}
            className="w-full h-7 text-[11px] bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
          >
            Generating Now →
          </Button>
        )}

        {/* Primary Action Button: Launch Flow / Connect */}
        {!isGoogleConnected ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnect}
            isLoading={isActing}
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            className="w-full h-7.5 text-xs font-semibold shadow-sm"
          >
            Connect Account
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenFlow}
            isLoading={isActing}
            icon={<Sparkles className="w-3.5 h-3.5 text-indigo-200" />}
            className="w-full h-7.5 text-xs font-semibold shadow-sm"
          >
            {isFlowReady ? 'Open Google Flow' : 'Launch Flow'}
          </Button>
        )}

        {/* Secondary Actions: Check Flow & Open/Close Browser */}
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCheckFlow}
            isLoading={isActing}
            icon={<RefreshCw className="w-3 h-3 text-cyan-400" />}
            className="h-6.5 text-[11px]"
          >
            Check Flow
          </Button>

          {isBrowserOpen ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseBrowser}
              isLoading={isActing}
              className="h-6.5 text-[11px] text-amber-400 border-amber-500/30"
              icon={<Power className="w-3 h-3" />}
            >
              Close Window
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpen}
              isLoading={isActing}
              icon={<Globe className="w-3 h-3 text-slate-400" />}
              className="h-6.5 text-[11px]"
            >
              Open Profile
            </Button>
          )}
        </div>

        {/* Bottom Tertiary Controls: Logs & Pause */}
        <div className="pt-1 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1">
            {onViewLogs && (
              <button
                onClick={() => onViewLogs(account)}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] flex items-center gap-1"
              >
                <Terminal className="w-3 h-3 text-slate-500" />
                <span>Logs</span>
              </button>
            )}

            {isGoogleConnected && (
              <button
                onClick={handleTogglePause}
                disabled={isActing}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] flex items-center gap-1"
              >
                {account.status === 'PAUSED' ? (
                  <>
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 text-amber-400" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            onClick={handleDelete}
            disabled={isActing}
            className={confirmDelete ? 'text-rose-400 font-bold px-1.5' : 'text-slate-500 hover:text-rose-400 p-0.5'}
          >
            {confirmDelete ? 'Confirm?' : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
};
