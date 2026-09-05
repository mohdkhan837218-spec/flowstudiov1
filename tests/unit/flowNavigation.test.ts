import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '../../src/main/database/db';
import { AccountManager } from '../../src/main/managers/AccountManager';
import { BrowserManager } from '../../src/main/managers/BrowserManager';
import { FlowProvider } from '../../src/main/providers/FlowProvider';
import { WorkerManager } from '../../src/main/managers/WorkerManager';
import { PathSecurity } from '../../src/main/security/paths';

describe('Google Flow Navigation & Readiness Lifecycle', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
  });

  it('should centrally resolve Flow URL', () => {
    const url = FlowProvider.getFlowUrl();
    expect(url).toBeDefined();
    expect(url).toContain('flow');
  });

  it('should detect LOGIN_REQUIRED when URL redirects to Google sign-in', async () => {
    const mockPage: any = {
      url: () => 'https://accounts.google.com/ServiceLogin?service=flow',
      evaluate: async () => false
    };

    const readiness = await FlowProvider.isFlowReady(mockPage);
    expect(readiness.state).toBe('LOGIN_REQUIRED');
  });

  it('should detect MANUAL_ACTION_REQUIRED when security challenge or CAPTCHA is present', async () => {
    const mockPage: any = {
      url: () => 'https://accounts.google.com/v3/signin/challenge/pwd',
      evaluate: async () => false
    };

    const readiness = await FlowProvider.isFlowReady(mockPage);
    expect(readiness.state).toBe('MANUAL_ACTION_REQUIRED');
  });

  it('should detect ONBOARDING_REQUIRED when terms of service dialog is displayed', async () => {
    const mockPage: any = {
      url: () => 'https://labs.google/flow',
      evaluate: async (fn: any) => {
        return true; // Simulates finding "Terms of Service" or "Join Waitlist"
      }
    };

    const readiness = await FlowProvider.isFlowReady(mockPage);
    expect(readiness.state).toBe('ONBOARDING_REQUIRED');
  });

  it('should enforce that workers cannot start unless Flow is READY', () => {
    const account = AccountManager.createAccount({ displayName: 'Flow Worker Test' });
    AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      email: 'flow_user@gmail.com',
      flowStatus: 'UNKNOWN'
    });

    const updated = AccountManager.getAccount(account.id)!;
    // When flowStatus is UNKNOWN, worker cannot start
    expect(WorkerManager.canStartWorker(updated)).toBe(false);

    // When flowStatus becomes READY, worker becomes eligible
    AccountManager.updateAccount(account.id, {
      status: 'FLOW_READY',
      flowStatus: 'READY'
    });

    const readyAccount = AccountManager.getAccount(account.id)!;
    expect(WorkerManager.canStartWorker(readyAccount)).toBe(true);
  });
});
