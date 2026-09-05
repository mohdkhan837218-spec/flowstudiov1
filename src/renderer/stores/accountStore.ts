import { create } from 'zustand';
import { GoogleAccount, AccountStatus } from '../../shared/types/account';

interface AccountState {
  accounts: GoogleAccount[];
  isLoading: boolean;
  searchQuery: string;
  statusFilter: AccountStatus | 'ALL';
  sortBy: 'name' | 'status' | 'lastActive' | 'created';
  error: string | null;

  // Actions
  loadAccounts: () => Promise<void>;
  createAccount: (displayName: string) => Promise<GoogleAccount>;
  connectAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
  openProfile: (id: string) => Promise<{ success: boolean; error?: string }>;
  closeProfile: (id: string) => Promise<{ success: boolean; error?: string }>;
  pauseAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
  resumeAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
  removeAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
  openFlow: (id: string) => Promise<{ success: boolean; state: string; error?: string }>;
  checkFlow: (id: string) => Promise<{ state: string }>;
  
  // Local state mutators from IPC events
  updateAccountLocally: (account: GoogleAccount) => void;
  removeAccountLocally: (accountId: string) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: AccountStatus | 'ALL') => void;
  setSortBy: (sort: 'name' | 'status' | 'lastActive' | 'created') => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,
  searchQuery: '',
  statusFilter: 'ALL',
  sortBy: 'created',
  error: null,

  loadAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      if (window.flowWorkspace) {
        const accounts = await window.flowWorkspace.accounts.list();
        set({ accounts, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed loading accounts', isLoading: false });
    }
  },

  createAccount: async (displayName: string) => {
    if (!window.flowWorkspace) throw new Error('API bridge not ready');
    const newAccount = await window.flowWorkspace.accounts.create({ displayName });
    set((state) => ({ accounts: [newAccount, ...state.accounts] }));
    return newAccount;
  },

  connectAccount: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, error: 'API not ready' };
    return await window.flowWorkspace.accounts.connect(id);
  },

  openProfile: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, error: 'API not ready' };
    return await window.flowWorkspace.accounts.open(id);
  },

  closeProfile: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, error: 'API not ready' };
    return await window.flowWorkspace.accounts.close(id);
  },

  pauseAccount: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, error: 'API not ready' };
    return await window.flowWorkspace.accounts.pause(id);
  },

  resumeAccount: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, error: 'API not ready' };
    return await window.flowWorkspace.accounts.resume(id);
  },

  removeAccount: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, error: 'API not ready' };
    const res = await window.flowWorkspace.accounts.remove(id);
    if (res.success) {
      set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) }));
    }
    return res;
  },

  openFlow: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, state: 'ERROR', error: 'API not ready' };
    return await window.flowWorkspace.accounts.openFlow(id);
  },

  checkFlow: async (id: string) => {
    if (!window.flowWorkspace) return { state: 'UNKNOWN' };
    return await window.flowWorkspace.accounts.checkFlow(id);
  },

  updateAccountLocally: (account: GoogleAccount) => {
    set((state) => {
      const exists = state.accounts.some((a) => a.id === account.id);
      if (exists) {
        return {
          accounts: state.accounts.map((a) => (a.id === account.id ? account : a))
        };
      } else {
        return { accounts: [account, ...state.accounts] };
      }
    });
  },

  removeAccountLocally: (accountId: string) => {
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== accountId)
    }));
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setStatusFilter: (statusFilter: AccountStatus | 'ALL') => set({ statusFilter }),
  setSortBy: (sortBy: 'name' | 'status' | 'lastActive' | 'created') => set({ sortBy })
}));
