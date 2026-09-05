import React from 'react';
import { clsx } from 'clsx';
import { AccountStatus, BrowserStatus, FlowState } from '../../../shared/types/account';
import { StatusIndicator } from '../common/StatusIndicator';

export interface StatusBadgeProps {
  status: AccountStatus | BrowserStatus | FlowState | string;
  type?: 'account' | 'browser' | 'flow';
  showDot?: boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'account',
  showDot = true,
  size = 'md'
}) => {
  return (
    <StatusIndicator
      status={status}
      size={size}
      showDot={showDot}
    />
  );
};
