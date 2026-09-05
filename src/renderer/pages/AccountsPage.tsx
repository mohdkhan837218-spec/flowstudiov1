import React from 'react';
import { Plus, Users, UserPlus } from 'lucide-react';
import { AccountFilterBar } from '../components/accounts/AccountFilterBar';
import { AccountCard } from '../components/accounts/AccountCard';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { useAccountStore } from '../stores/accountStore';
import { GoogleAccount } from '../../shared/types/account';

interface AccountsPageProps {
  onAddAccountClick: () => void;
  onViewLogs: (account: GoogleAccount) => void;
  onNavigateToLive?: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
  onAddAccountClick,
  onViewLogs,
  onNavigateToLive
}) => {
  const { accounts, searchQuery, statusFilter, sortBy } = useAccountStore();

  // Filter & Search Logic
  const filteredAccounts = accounts.filter((account) => {
    if (statusFilter !== 'ALL') {
      if (account.status !== statusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = account.displayName.toLowerCase().includes(q);
      const matchEmail = (account.email || '').toLowerCase().includes(q);
      const matchId = account.id.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  // Sorting
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (sortBy === 'name') {
      return a.displayName.localeCompare(b.displayName);
    }
    if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    if (sortBy === 'lastActive') {
      const tA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const tB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      return tB - tA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto overflow-y-auto">
      {/* SaaS Page Header */}
      <PageHeader
        title="Google Accounts & Profiles"
        subtitle="Manage persistent Chromium environments, connection health, and Google Flow automation sessions."
        badge={
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-600/15 text-indigo-300 border border-indigo-500/30">
            {accounts.length} {accounts.length === 1 ? 'Profile' : 'Profiles'}
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="lg"
            onClick={onAddAccountClick}
            icon={<UserPlus className="w-4 h-4" />}
            className="min-w-[190px] shadow-sm"
          >
            Add Google Account
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <AccountFilterBar />

      {/* Account Cards Responsive Grid */}
      {sortedAccounts.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={accounts.length === 0 ? 'No Google accounts connected' : 'No matching accounts found'}
          description={
            accounts.length === 0
              ? 'Connect your Google accounts to initialize isolated browser sessions and enable automated video creation in Google Flow.'
              : 'Try clearing your search query or adjusting your status filters to find your account.'
          }
          actionLabel={accounts.length === 0 ? 'Add First Google Account' : undefined}
          onAction={accounts.length === 0 ? onAddAccountClick : undefined}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      ) : (
        <div className="responsive-account-grid">
          {sortedAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onViewLogs={onViewLogs}
              onNavigateToLive={onNavigateToLive}
            />
          ))}
        </div>
      )}
    </div>
  );
};
