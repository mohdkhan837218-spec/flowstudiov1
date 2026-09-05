import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/AccountsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { QueuePage } from './pages/QueuePage';
import { LiveGenerationPage } from './pages/LiveGenerationPage';
import { ActivityPage } from './pages/ActivityPage';
import { ErrorTerminalPage } from './pages/ErrorTerminalPage';
import { SettingsPage } from './pages/SettingsPage';
import { AddAccountModal } from './components/accounts/AddAccountModal';
import { AccountLogsModal } from './components/accounts/AccountLogsModal';
import { useAccountStore } from './stores/accountStore';
import { useActivityStore } from './stores/activityStore';
import { useSettingsStore } from './stores/settingsStore';
import { useProjectStore } from './stores/projectStore';
import { useQueueStore } from './stores/queueStore';
import { useLiveGenerationStore } from './stores/liveGenerationStore';
import { GoogleAccount } from '../shared/types/account';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [inspectAccount, setInspectAccount] = useState<GoogleAccount | null>(null);

  const { loadAccounts, updateAccountLocally, removeAccountLocally } = useAccountStore();
  const { loadLogs, addLog } = useActivityStore();
  const { loadSettings } = useSettingsStore();
  const { loadProjects } = useProjectStore();
  const { loadQueue, updateJobLocally, updateWorkerLocally, updateSummaryLocally } = useQueueStore();
  const { loadGenerations } = useLiveGenerationStore();

  useEffect(() => {
    // Initial data fetch
    loadAccounts();
    loadLogs();
    loadSettings();
    loadProjects();
    loadQueue();
    loadGenerations();

    // Hook IPC real-time event listeners
    if (window.flowWorkspace) {
      const unsubAccountUpdated = window.flowWorkspace.events.onAccountUpdated((account) => {
        updateAccountLocally(account);
      });

      const unsubAccountRemoved = window.flowWorkspace.events.onAccountRemoved((id) => {
        removeAccountLocally(id);
      });

      const unsubLog = window.flowWorkspace.events.onActivityLog((log) => {
        addLog(log);
      });

      const unsubJob = window.flowWorkspace.events.onJobUpdated((job) => {
        updateJobLocally(job);
      });

      const unsubWorker = window.flowWorkspace.events.onWorkerUpdated((worker) => {
        updateWorkerLocally(worker);
      });

      const unsubQueue = window.flowWorkspace.events.onQueueUpdated((summary) => {
        updateSummaryLocally(summary);
      });

      return () => {
        unsubAccountUpdated();
        unsubAccountRemoved();
        unsubLog();
        unsubJob();
        unsubWorker();
        unsubQueue();
      };
    }
  }, [
    loadAccounts,
    loadLogs,
    loadSettings,
    loadProjects,
    loadQueue,
    loadGenerations,
    updateAccountLocally,
    removeAccountLocally,
    addLog,
    updateJobLocally,
    updateWorkerLocally,
    updateSummaryLocally
  ]);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of connected accounts and dispatch metrics'
    },
    accounts: {
      title: 'Accounts',
      subtitle: 'Manage persistent Chromium profiles with isolated sessions'
    },
    projects: {
      title: 'Projects',
      subtitle: 'Compose concepts, decompose prompts, and manage shot lists'
    },
    queue: {
      title: 'Studio & Queue',
      subtitle: 'Real-time video rendering streams and dispatch queue'
    },
    live: {
      title: 'Studio & Queue',
      subtitle: 'Real-time video rendering streams and dispatch queue'
    },
    activity: {
      title: 'Live Activity',
      subtitle: 'Audit log of worker execution and events'
    },
    terminal: {
      title: 'Error Terminal',
      subtitle: 'Live automation log stream and root-cause analysis'
    },
    settings: {
      title: 'Settings',
      subtitle: 'System preferences and configurations'
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Navigation Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          title={titles[currentTab].title}
          subtitle={titles[currentTab].subtitle}
          onAddAccountClick={() => setIsAddAccountOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-background/30">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onAddAccountClick={() => setIsAddAccountOpen(true)}
              onNavigateToAccounts={() => setCurrentTab('accounts')}
              onNavigateToActivity={() => setCurrentTab('activity')}
              onNavigateToLive={() => setCurrentTab('queue')}
              onViewLogs={(acct) => setInspectAccount(acct)}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountsPage
              onAddAccountClick={() => setIsAddAccountOpen(true)}
              onNavigateToLive={() => setCurrentTab('queue')}
              onViewLogs={(acct) => setInspectAccount(acct)}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsPage
              onNavigateToQueue={() => setCurrentTab('queue')}
              onNavigateToLive={() => setCurrentTab('queue')}
            />
          )}

          {(currentTab === 'queue' || currentTab === 'live') && (
            <QueuePage
              onNavigateToProjects={() => setCurrentTab('projects')}
            />
          )}

          {currentTab === 'activity' && <ActivityPage />}
          {currentTab === 'terminal' && <ErrorTerminalPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onSuccess={() => {
          loadAccounts();
          setCurrentTab('accounts');
        }}
      />

      {/* Account Activity Logs Modal */}
      <AccountLogsModal
        account={inspectAccount}
        onClose={() => setInspectAccount(null)}
      />
    </div>
  );
};
