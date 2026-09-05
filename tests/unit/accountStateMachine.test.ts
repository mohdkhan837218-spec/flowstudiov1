import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppDatabase } from '../../src/main/database/db';
import { AccountManager } from '../../src/main/managers/AccountManager';
import { PathSecurity } from '../../src/main/security/paths';

describe('Account Database & State Machine', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
  });

  it('should create an account with default NEW status', () => {
    const account = AccountManager.createAccount({ displayName: 'Test Account Alpha' });
    expect(account.id).toBeDefined();
    expect(account.displayName).toBe('Test Account Alpha');
    expect(account.status).toBe('NEW');
    expect(account.browserStatus).toBe('CLOSED');
    expect(account.email).toBeNull();
  });

  it('should update account properties and persist in SQLite', () => {
    const account = AccountManager.createAccount({ displayName: 'Test Account Beta' });
    
    const updated = AccountManager.updateAccount(account.id, {
      status: 'CONNECTED',
      email: 'beta.tester@gmail.com',
      lastVerifiedAt: new Date().toISOString()
    });

    expect(updated.status).toBe('CONNECTED');
    expect(updated.email).toBe('beta.tester@gmail.com');

    const fetched = AccountManager.getAccount(account.id);
    expect(fetched?.status).toBe('CONNECTED');
    expect(fetched?.email).toBe('beta.tester@gmail.com');
  });

  it('should pause and resume account state correctly', () => {
    const account = AccountManager.createAccount({ displayName: 'Test Account Gamma' });
    AccountManager.updateAccount(account.id, { status: 'CONNECTED', email: 'gamma@gmail.com' });

    AccountManager.pauseAccount(account.id);
    expect(AccountManager.getAccount(account.id)?.status).toBe('PAUSED');

    AccountManager.resumeAccount(account.id);
    expect(AccountManager.getAccount(account.id)?.status).toBe('CONNECTED');
  });

  it('should remove account and clean up database', async () => {
    const account = AccountManager.createAccount({ displayName: 'Test Account Delta' });
    const removeRes = await AccountManager.removeAccount(account.id);
    expect(removeRes.success).toBe(true);

    const fetched = AccountManager.getAccount(account.id);
    expect(fetched).toBeNull();
  });
});
