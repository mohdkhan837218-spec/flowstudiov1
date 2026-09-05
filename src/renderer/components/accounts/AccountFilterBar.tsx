import React from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { AccountStatus } from '../../../shared/types/account';
import { useAccountStore } from '../../stores/accountStore';

export const AccountFilterBar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy
  } = useAccountStore();

  const filters: { id: AccountStatus | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All Accounts' },
    { id: 'CONNECTED', label: 'Connected' },
    { id: 'CONNECTING', label: 'Connecting' },
    { id: 'DISCONNECTED', label: 'Disconnected' },
    { id: 'PAUSED', label: 'Paused' },
    { id: 'ERROR', label: 'Error' }
  ];

  return (
    <div className="saas-card rounded-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 min-h-[54px]">
      {/* Search Input Field */}
      <div className="relative w-full md:w-80 shrink-0">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts by name or ID..."
          className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        {filters.map((f) => {
          const isActive = statusFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Sort Select Menu */}
      <div className="flex items-center gap-2 pl-2 border-t md:border-t-0 md:border-l border-white/[0.07] shrink-0">
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="h-9 min-w-[160px] bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="created">Sort: Created Date</option>
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
          <option value="lastActive">Sort: Last Active</option>
        </select>
      </div>
    </div>
  );
};
