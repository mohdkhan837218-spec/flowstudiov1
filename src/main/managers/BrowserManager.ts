import { chromium, BrowserContext, Page } from 'playwright';
import { ProfileManager } from './ProfileManager';
import { Logger } from '../logging/logger';
import { BrowserLaunchOptions } from '../../shared/types/browser';
import fs from 'fs';
import path from 'path';

export interface ActiveBrowserSession {
  accountId: string;
  context: BrowserContext;
  page: Page;
  flowPage?: Page;
  channelUsed: string;
  openedAt: Date;
  onCloseCallbacks: Array<() => void>;
}

export class BrowserManager {
  private static activeSessions: Map<string, ActiveBrowserSession> = new Map();

  /**
   * Discovers the best available browser engine on the user's operating system:
   * Prefers real Google Chrome -> Microsoft Edge -> Bundled Chromium.
   */
  public static resolveBrowserChannel(): { channel?: string; executablePath?: string } {
    // Windows common Chrome / Edge install paths
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

      const chromePaths = [
        path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
        path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
        path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe')
      ];

      for (const p of chromePaths) {
        if (fs.existsSync(p)) {
          Logger.debug('BrowserManager', `Found native Google Chrome at: ${p}`);
          return { channel: 'chrome' };
        }
      }

      const edgePaths = [
        path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
        path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe')
      ];

      for (const p of edgePaths) {
        if (fs.existsSync(p)) {
          Logger.debug('BrowserManager', `Found native Microsoft Edge at: ${p}`);
          return { channel: 'msedge' };
        }
      }
    } else if (process.platform === 'darwin') {
      if (fs.existsSync('/Applications/Google Chrome.app')) {
        return { channel: 'chrome' };
      }
      if (fs.existsSync('/Applications/Microsoft Edge.app')) {
        return { channel: 'msedge' };
      }
    } else if (process.platform === 'linux') {
      if (fs.existsSync('/usr/bin/google-chrome')) {
        return { channel: 'chrome' };
      }
      if (fs.existsSync('/usr/bin/microsoft-edge')) {
        return { channel: 'msedge' };
      }
    }

    Logger.debug('BrowserManager', 'Defaulting to standard Playwright Chromium');
    return {};
  }

  /**
   * Launches or focuses a Playwright persistent context for the specified account
   * with anti-bot bypass flags and dedicated isolated user data storage.
   */
  public static async launchProfile(
    accountId: string,
    options: BrowserLaunchOptions = {}
  ): Promise<ActiveBrowserSession> {
    // 1. If already open, bring to front and return existing session
    const existing = this.activeSessions.get(accountId);
    if (existing) {
      Logger.info('BrowserManager', `Browser for ${accountId} already open, bringing to focus`, accountId);
      try {
        const targetPage = existing.flowPage || existing.page;
        if (!targetPage.isClosed()) {
          await targetPage.bringToFront();
        }
      } catch {
        // Ignored
      }
      return existing;
    }

    // 2. Ensure profile directory exists and acquire lock
    const profilePath = ProfileManager.ensureProfile(accountId);
    ProfileManager.acquireLock(accountId);

    Logger.info('BrowserManager', `Launching Chromium persistent context for account ${accountId}`, accountId);

    try {
      const isHeadless = options.headless ?? false;
      const browserTarget = this.resolveBrowserChannel();
      const channelUsed = browserTarget.channel || 'chromium';

      // Launch with stealth arguments to prevent Google bot-detection flags
      const launchArgs = [
        '--start-maximized',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ];

      let context: BrowserContext;

      try {
        context = await chromium.launchPersistentContext(profilePath, {
          ...(browserTarget.channel ? { channel: browserTarget.channel } : {}),
          headless: isHeadless,
          viewport: null, // Native full window viewport
          args: launchArgs,
          ignoreDefaultArgs: ['--enable-automation'],
          timeout: options.timeout ?? 60000
        });
      } catch (channelErr) {
        Logger.warn('BrowserManager', `Failed launching with channel ${channelUsed}, falling back to default Chromium`, accountId, null, { error: String(channelErr) });
        // Fallback without channel if native Chrome failed
        context = await chromium.launchPersistentContext(profilePath, {
          headless: isHeadless,
          viewport: null,
          args: launchArgs,
          ignoreDefaultArgs: ['--enable-automation'],
          timeout: options.timeout ?? 60000
        });
      }

      let page: Page;
      const pages = context.pages();
      if (pages.length > 0) {
        page = pages[0];
      } else {
        page = await context.newPage();
      }

      const session: ActiveBrowserSession = {
        accountId,
        context,
        page,
        channelUsed,
        openedAt: new Date(),
        onCloseCallbacks: []
      };

      // Listen for popup / new tab events and track Flow pages
      context.on('page', (newPage) => {
        Logger.debug('BrowserManager', `New tab/popup opened for account ${accountId}`, accountId);
        newPage.on('domcontentloaded', () => {
          const url = newPage.url();
          if (url.includes('labs.google') || url.includes('flow')) {
            Logger.info('BrowserManager', `Detected Flow tab for account ${accountId}`, accountId);
            session.flowPage = newPage;
          }
        });
      });

      if (options.startUrl) {
        try {
          await page.goto(options.startUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        } catch (navErr) {
          Logger.warn('BrowserManager', `Initial navigation to ${options.startUrl} notice:`, accountId, null, { error: String(navErr) });
        }
      }

      this.activeSessions.set(accountId, session);

      // Handle context close
      context.on('close', () => {
        Logger.info('BrowserManager', `Browser window closed for account ${accountId}`, accountId);
        ProfileManager.releaseLock(accountId);
        this.activeSessions.delete(accountId);
        session.onCloseCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error('Error in browser onClose callback:', e);
          }
        });
      });

      return session;
    } catch (err) {
      ProfileManager.releaseLock(accountId);
      this.activeSessions.delete(accountId);
      Logger.error('BrowserManager', `Failed to launch browser for account ${accountId}`, accountId, null, { error: String(err) });
      throw err;
    }
  }

  /**
   * Finds an existing Google Flow page or navigates an available page in the session.
   */
  public static async getOrCreateFlowPage(accountId: string, flowUrl: string): Promise<Page> {
    const session = await this.launchProfile(accountId, { headless: false });

    // 1. Check if we already have a tracked active flow page
    if (session.flowPage && !session.flowPage.isClosed()) {
      return session.flowPage;
    }

    // 2. Scan all currently open pages in this context
    const openPages = session.context.pages();
    for (const p of openPages) {
      if (!p.isClosed()) {
        const url = p.url();
        if (url.includes('labs.google') || url.includes('flow')) {
          session.flowPage = p;
          return p;
        }
      }
    }

    // 3. Check if primary page can be navigated
    if (!session.page.isClosed()) {
      const url = session.page.url();
      if (url === 'about:blank' || url.includes('myaccount.google.com') || url.includes('google.com')) {
        session.flowPage = session.page;
        return session.page;
      }
    }

    // 4. Create a new tab for Flow if primary page is in use
    const newTab = await session.context.newPage();
    session.flowPage = newTab;
    return newTab;
  }

  /**
   * Closes an active browser session gracefully.
   */
  public static async closeProfile(accountId: string): Promise<void> {
    const session = this.activeSessions.get(accountId);
    if (!session) {
      Logger.debug('BrowserManager', `No active browser session to close for ${accountId}`, accountId);
      return;
    }

    try {
      await session.context.close();
    } catch (err) {
      Logger.warn('BrowserManager', `Error while closing browser for ${accountId}`, accountId, null, { error: String(err) });
    } finally {
      this.activeSessions.delete(accountId);
      ProfileManager.releaseLock(accountId);
    }
  }

  /**
   * Registers a callback for when the browser session closes.
   */
  public static onSessionClose(accountId: string, callback: () => void): void {
    const session = this.activeSessions.get(accountId);
    if (session) {
      session.onCloseCallbacks.push(callback);
    }
  }

  /**
   * Checks if an account's browser is currently running.
   */
  public static isRunning(accountId: string): boolean {
    return this.activeSessions.has(accountId);
  }

  /**
   * Gets an active session for an account.
   */
  public static getSession(accountId: string): ActiveBrowserSession | undefined {
    return this.activeSessions.get(accountId);
  }

  /**
   * Closes all active browser sessions (e.g. during application shutdown).
   */
  public static async closeAll(): Promise<void> {
    Logger.info('BrowserManager', `Closing all active browser sessions (${this.activeSessions.size})`);
    const closePromises = Array.from(this.activeSessions.keys()).map((id) => this.closeProfile(id));
    await Promise.allSettled(closePromises);
  }
}
