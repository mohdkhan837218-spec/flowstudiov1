import { describe, it, expect, afterAll } from 'vitest';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { PathSecurity } from '../../src/main/security/paths';
import { ProfileManager } from '../../src/main/managers/ProfileManager';

describe('Browser Profile Isolation', () => {
  const accountA = 'acct_test_isolation_a';
  const accountB = 'acct_test_isolation_b';

  afterAll(async () => {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      ProfileManager.deleteProfile(accountA);
      ProfileManager.deleteProfile(accountB);
    } catch {
      // Cleanup
    }
  });

  it('should maintain independent profile directories for Account A and Account B', async () => {
    PathSecurity.initialize();
    const dirA = ProfileManager.ensureProfile(accountA);
    const dirB = ProfileManager.ensureProfile(accountB);

    expect(dirA).not.toBe(dirB);
    expect(fs.existsSync(dirA)).toBe(true);
    expect(fs.existsSync(dirB)).toBe(true);
  });

  it('should launch persistent contexts with isolated cookie and session state', async () => {
    const dirA = ProfileManager.getProfilePath(accountA);
    const dirB = ProfileManager.getProfilePath(accountB);

    const futureExpiry = Math.floor(Date.now() / 1000) + 86400; // 24 hours in future

    // Launch Context A
    const contextA = await chromium.launchPersistentContext(dirA, {
      headless: true
    });
    
    // Set persistent cookie on Account A
    await contextA.addCookies([
      {
        name: 'flow_auth_session',
        value: 'session_token_alpha_123',
        domain: '.google.com',
        path: '/',
        expires: futureExpiry
      }
    ]);

    const cookiesA = await contextA.cookies('https://google.com');
    const authCookieA = cookiesA.find((c) => c.name === 'flow_auth_session');
    expect(authCookieA?.value).toBe('session_token_alpha_123');

    // Launch Context B
    const contextB = await chromium.launchPersistentContext(dirB, {
      headless: true
    });

    // Verify Context B DOES NOT see Account A's cookies
    const cookiesB = await contextB.cookies('https://google.com');
    const authCookieB = cookiesB.find((c) => c.name === 'flow_auth_session');
    expect(authCookieB).toBeUndefined();

    // Close both contexts
    await contextA.close();
    await contextB.close();

    // Delay for Chromium to flush cookie database to disk
    await new Promise((r) => setTimeout(r, 1000));

    // Reopen Context A and verify session cookie persistence
    const reopenedContextA = await chromium.launchPersistentContext(dirA, {
      headless: true
    });

    const persistedCookiesA = await reopenedContextA.cookies('https://google.com');
    const persistedAuthCookieA = persistedCookiesA.find((c) => c.name === 'flow_auth_session');
    expect(persistedAuthCookieA?.value).toBe('session_token_alpha_123');

    await reopenedContextA.close();
  }, 35000);
});
