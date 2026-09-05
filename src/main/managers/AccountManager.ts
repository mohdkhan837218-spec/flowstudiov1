import { AppDatabase } from '../database/db';
import { ProfileManager } from './ProfileManager';
import { BrowserManager } from './BrowserManager';
import { Logger } from '../logging/logger';
import { GoogleAccount, AccountStatus, BrowserStatus, FlowState, CreateAccountInput, UpdateAccountInput } from '../../shared/types/account';
import { BrowserWindow } from 'electron';
import { FlowProvider } from '../providers/FlowProvider';

export class AccountManager {
  private static loginPollers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Broadcasts account updates to all active Electron windows.
   */
  private static notifyRenderer(account: GoogleAccount): void {
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('account:updated', account);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }
  }

  /**
   * Broadcasts account removal to all active Electron windows.
   */
  private static notifyRemoval(accountId: string): void {
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('account:removed', accountId);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }
  }

  /**
   * Lists all Google accounts.
   */
  public static listAccounts(): GoogleAccount[] {
    const accounts = AppDatabase.getAccounts();
    // Reconcile browser status with running sessions
    return accounts.map((acct) => {
      const isRunning = BrowserManager.isRunning(acct.id);
      const browserStatus: BrowserStatus = isRunning ? 'OPEN' : 'CLOSED';
      if (acct.browserStatus !== browserStatus && acct.status !== 'CONNECTING') {
        acct.browserStatus = browserStatus;
        AppDatabase.saveAccount(acct);
      }
      return acct;
    });
  }

  /**
   * Gets a specific account by ID.
   */
  public static getAccount(id: string): GoogleAccount | null {
    const account = AppDatabase.getAccount(id);
    if (account) {
      account.browserStatus = BrowserManager.isRunning(id) ? 'OPEN' : 'CLOSED';
    }
    return account;
  }

  /**
   * Creates a new account and provisions its isolated persistent profile.
   */
  public static createAccount(input: CreateAccountInput): GoogleAccount {
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const existingCount = AppDatabase.getAccounts().length + 1;
    const paddedIndex = String(existingCount).padStart(2, '0');
    const id = `acct_${paddedIndex}_${uniqueSuffix}`;

    const profilePath = ProfileManager.ensureProfile(id);
    const now = new Date().toISOString();

    const account: GoogleAccount = {
      id,
      displayName: input.displayName.trim() || `Google Account ${paddedIndex}`,
      email: null,
      profilePath,
      status: 'NEW',
      browserStatus: 'CLOSED',
      flowStatus: 'UNKNOWN',
      lastVerifiedAt: null,
      lastActiveAt: null,
      createdAt: now,
      updatedAt: now,
      lastError: null,
      queueCount: 0,
      currentJobName: null
    };

    AppDatabase.saveAccount(account);
    Logger.info('AccountManager', `Created account ${account.displayName} (${account.id}) with isolated profile at ${profilePath}`, account.id);
    this.notifyRenderer(account);

    return account;
  }

  /**
   * Updates an existing account's properties with validation.
   */
  public static updateAccount(id: string, updates: UpdateAccountInput): GoogleAccount {
    const account = this.getAccount(id);
    if (!account) {
      throw new Error(`Account not found: ${id}`);
    }

    if (updates.displayName !== undefined) account.displayName = updates.displayName.trim();
    if (updates.status !== undefined) account.status = updates.status;
    if (updates.browserStatus !== undefined) account.browserStatus = updates.browserStatus;
    if (updates.flowStatus !== undefined) account.flowStatus = updates.flowStatus;
    if (updates.flowUrl !== undefined) account.flowUrl = updates.flowUrl;
    if (updates.email !== undefined) account.email = updates.email;
    if (updates.lastError !== undefined) account.lastError = updates.lastError;
    if (updates.lastVerifiedAt !== undefined) account.lastVerifiedAt = updates.lastVerifiedAt;
    if (updates.lastActiveAt !== undefined) account.lastActiveAt = updates.lastActiveAt;
    if (updates.metadata !== undefined) account.metadata = { ...account.metadata, ...updates.metadata };

    account.updatedAt = new Date().toISOString();
    AppDatabase.saveAccount(account);
    this.notifyRenderer(account);

    return account;
  }

  /**
   * Connects a Google account by launching a real browser window (using native Chrome/Edge)
   * and monitoring authoritative Google auth cookies (SID, HSID, SSID) and /ListAccounts.
   */
  public static async connectAccount(id: string): Promise<{ success: boolean; error?: string }> {
    const account = this.getAccount(id);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Stop existing poller if running
    if (this.loginPollers.has(id)) {
      clearInterval(this.loginPollers.get(id));
      this.loginPollers.delete(id);
    }

    this.updateAccount(id, {
      status: 'CONNECTING',
      browserStatus: 'LAUNCHING',
      lastError: null
    });

    try {
      const session = await BrowserManager.launchProfile(id, {
        headless: false,
        startUrl: 'https://accounts.google.com/ServiceLogin'
      });

      this.updateAccount(id, { browserStatus: 'OPEN' });

      // Clean up if the browser closes before auth
      BrowserManager.onSessionClose(id, () => {
        if (this.loginPollers.has(id)) {
          clearInterval(this.loginPollers.get(id));
          this.loginPollers.delete(id);
        }
        const current = this.getAccount(id);
        if (current && current.status === 'CONNECTING') {
          this.updateAccount(id, {
            status: current.email ? 'CONNECTED' : 'DISCONNECTED',
            browserStatus: 'CLOSED'
          });
        }
      });

      // Poll browser context for authoritative Google session cookies (SID, HSID, SSID)
      let pollCount = 0;
      const maxPolls = 300; // 5 minutes maximum timeout

      const poller = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls || !BrowserManager.isRunning(id)) {
          clearInterval(poller);
          this.loginPollers.delete(id);
          const current = this.getAccount(id);
          if (current && current.status === 'CONNECTING') {
            this.updateAccount(id, {
              status: current.email ? 'CONNECTED' : 'DISCONNECTED',
              lastError: pollCount > maxPolls ? 'Authentication connection timed out' : null
            });
          }
          return;
        }

        try {
          const context = session.context;
          const cookies = await context.cookies(['https://accounts.google.com', 'https://google.com']);
          
          // Authoritative Google login detection
          const hasSID = cookies.some((c) => c.name === 'SID' && c.value.length > 5);
          const hasHSID = cookies.some((c) => c.name === 'HSID' && c.value.length > 5);
          const hasSSID = cookies.some((c) => c.name === 'SSID' && c.value.length > 5);

          if (hasSID && (hasHSID || hasSSID)) {
            // User is signed in! Query ListAccounts endpoint or page for email
            let detectedEmail: string | null = null;
            let detectedName: string | null = null;

            try {
              // 1. Check ListAccounts endpoint from within page context
              const listAccountsResult = await session.page.evaluate(async () => {
                try {
                  const res = await fetch('https://accounts.google.com/ListAccounts?source=ogb&origin=https%3A%2F%2Fwww.google.com', {
                    credentials: 'include'
                  });
                  const text = await res.text();
                  // Format: )]}'\n[["account", ...]]
                  const cleaned = text.replace(/^[^[]*/, '');
                  const data = JSON.parse(cleaned);
                  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
                    const accInfo = data[0];
                    // accInfo typically has [name, email, photoUrl, ...]
                    const email = accInfo.find((item: any) => typeof item === 'string' && item.includes('@'));
                    const name = typeof accInfo[1] === 'string' ? accInfo[1] : null;
                    return { email, name };
                  }
                } catch {
                  // Fallback to DOM
                }
                return null;
              });

              if (listAccountsResult?.email) {
                detectedEmail = listAccountsResult.email;
                detectedName = listAccountsResult.name;
              }
            } catch {
              // Ignore eval error
            }

            // 2. Fallback to DOM elements if ListAccounts was unavailable
            if (!detectedEmail) {
              try {
                detectedEmail = await session.page.evaluate(() => {
                  const el = document.querySelector('[data-email], [aria-label*="@gmail.com"], [aria-label*="@"]');
                  if (el) {
                    const attr = el.getAttribute('data-email') || el.getAttribute('aria-label') || '';
                    const match = attr.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
                    if (match) return match[1];
                  }
                  const bodyMatch = (document.body?.innerText || '').match(/([a-zA-Z0-9._%+-]+@gmail\.com)/i);
                  return bodyMatch ? bodyMatch[1] : null;
                });
              } catch {
                // Ignore DOM check error
              }
            }

            // Authentication confirmed!
            clearInterval(poller);
            this.loginPollers.delete(id);

            const now = new Date().toISOString();
            this.updateAccount(id, {
              status: 'GOOGLE_AUTHENTICATED',
              email: detectedEmail || account.email || 'Google Authenticated',
              displayName: detectedName || account.displayName,
              lastVerifiedAt: now,
              lastActiveAt: now,
              lastError: null
            });

            Logger.success(
              'AccountManager',
              `Account ${account.displayName} authenticated with authoritative Google session cookies (${detectedEmail || 'Active'}). Initiating Google Flow session...`,
              id
            );

            // Auto-navigate to Google Flow in this verified persistent browser session
            FlowProvider.openFlowForAccount(id).catch((flowErr) => {
              Logger.warn('AccountManager', `Initial Flow navigation note: ${flowErr.message}`, id);
            });
          }
        } catch {
          // Page may be navigating during login sequence
        }
      }, 1000);

      this.loginPollers.set(id, poller);

      return { success: true };
    } catch (err: any) {
      this.updateAccount(id, {
        status: 'ERROR',
        browserStatus: 'ERROR',
        lastError: err.message || String(err)
      });
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Opens or focuses Google Flow for an account and updates its readiness.
   */
  public static async openFlow(id: string): Promise<{ success: boolean; state: FlowState; error?: string }> {
    return await FlowProvider.openFlowForAccount(id);
  }

  /**
   * Checks the current Flow readiness of an active account session.
   */
  public static async checkFlow(id: string): Promise<{ state: FlowState }> {
    const state = await FlowProvider.checkReadiness(id);
    return { state };
  }

  /**
   * Opens the account's persistent browser profile directly.
   */
  public static async openProfile(id: string): Promise<{ success: boolean; error?: string }> {
    const account = this.getAccount(id);
    if (!account) return { success: false, error: 'Account not found' };

    try {
      this.updateAccount(id, { browserStatus: 'LAUNCHING' });

      await BrowserManager.launchProfile(id, {
        headless: false,
        startUrl: 'https://myaccount.google.com/'
      });

      const now = new Date().toISOString();
      this.updateAccount(id, {
        browserStatus: 'OPEN',
        lastActiveAt: now
      });

      BrowserManager.onSessionClose(id, () => {
        this.updateAccount(id, { browserStatus: 'CLOSED' });
      });

      return { success: true };
    } catch (err: any) {
      this.updateAccount(id, {
        browserStatus: 'ERROR',
        lastError: err.message || String(err)
      });
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Closes the active browser instance for the account.
   */
  public static async closeProfile(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await BrowserManager.closeProfile(id);
      this.updateAccount(id, { browserStatus: 'CLOSED' });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Pauses an account from receiving jobs.
   */
  public static pauseAccount(id: string): { success: boolean; error?: string } {
    const account = this.getAccount(id);
    if (!account) return { success: false, error: 'Account not found' };

    this.updateAccount(id, { status: 'PAUSED' });
    Logger.info('AccountManager', `Paused account ${account.displayName}`, id);
    return { success: true };
  }

  /**
   * Resumes an account from paused state.
   */
  public static resumeAccount(id: string): { success: boolean; error?: string } {
    const account = this.getAccount(id);
    if (!account) return { success: false, error: 'Account not found' };

    const newStatus: AccountStatus = account.email || account.lastVerifiedAt ? 'CONNECTED' : 'DISCONNECTED';
    this.updateAccount(id, { status: newStatus });
    Logger.info('AccountManager', `Resumed account ${account.displayName} to ${newStatus}`, id);
    return { success: true };
  }

  /**
   * Safely deletes an account and its isolated browser profile.
   */
  public static async removeAccount(id: string): Promise<{ success: boolean; error?: string }> {
    const account = this.getAccount(id);
    if (!account) return { success: false, error: 'Account not found' };

    try {
      // 1. Close browser if open
      await BrowserManager.closeProfile(id);

      // 2. Delete isolated profile directory
      ProfileManager.deleteProfile(id);

      // 3. Remove from database
      AppDatabase.deleteAccount(id);

      Logger.info('AccountManager', `Removed account ${account.displayName} and deleted profile data`, id);
      this.notifyRemoval(id);

      return { success: true };
    } catch (err: any) {
      Logger.error('AccountManager', `Failed removing account ${id}`, id, null, { error: String(err) });
      return { success: false, error: err.message || String(err) };
    }
  }
}
