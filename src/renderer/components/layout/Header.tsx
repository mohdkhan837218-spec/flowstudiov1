import React from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '../common/Button';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onAddAccountClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onAddAccountClick }) => {
  return (
    <header className="h-10 pl-4 pr-36 border-b border-white/[0.07] bg-[#090d16] flex items-center justify-between shrink-0 app-drag z-30 select-none">
      {/* Left: Page Title */}
      <div className="flex items-center gap-2 app-no-drag min-w-0">
        <span className="text-xs font-bold text-white tracking-tight">
          {title || 'Dashboard'}
        </span>
      </div>

      {/* Right: + Add Account Button (Positioned safely to the LEFT of Windows minimize/close buttons) */}
      <div className="flex items-center gap-2 app-no-drag shrink-0">
        {onAddAccountClick && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddAccountClick}
            icon={<UserPlus className="w-3.5 h-3.5" />}
            className="h-6.5 text-[11px] px-2.5 font-semibold shadow-sm"
          >
            Add Account
          </Button>
        )}
      </div>
    </header>
  );
};
