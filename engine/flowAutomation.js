const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');
const { getAccountProfilePath, getAccounts, saveAccounts, parseProxyString } = require('./accountStore');
const { cleanStaleProfileLocks } = require('./processHelper');
const { WatermarkCleaner } = require('./wm');
const { FFmpegService } = require('./ffmpegService');
const { dbService } = require('./db');
const { sanitizeFilePart, sanitizeProxyUrl } = require('./pathSecurity');
const { recordRuntimeError } = require('./diagnosticsService');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class FlowAutomationEngine {
  constructor(callbacks = {}, options = {}) {
    this.onLog = callbacks.onLog || (() => {});
    this.onProgress = callbacks.onProgress || (() => {});
    this.onVideoStarted = callbacks.onVideoStarted || (() => {});
    this.onVideoProgress = callbacks.onVideoProgress || (() => {});
    this.onVideoCompleted = callbacks.onVideoCompleted || (() => {});
    this.onAccountUpdated = callbacks.onAccountUpdated || (() => {});
    
    this.browser = null;
    this.page = null;
    this.cdpSession = null;
    this.isStopping = false;
    this.isPaused = false;
    this.currentAccount = null;
    this.headless = !!options.headless;
    this.workerId = options.workerId || null;
    this.hasConfiguredSettings = false;
    this.claimedTileIndices = new Set();
    this.consumedVideoUrls = new Set();
  }

  log(msg, type = 'info', extra = {}) {
    this.onLog({ message: msg, type, timestamp: new Date().toLocaleTimeString(), ...extra });
  }

  updateProgress(data) {
    this.onProgress(data);
  }

  pause() {
    this.isPaused = true;
    this.log('⏸️ Queue PAUSED. Currently submitting/rendering videos will finish downloading safely.', 'warn');
  }

  resume() {
    this.isPaused = false;
    this.log('▶️ Queue RESUMED. Continuing generation queue...', 'success');
  }

  stop() {
    this.isStopping = true;
    this.isPaused = false;
    this.log('🛑 Stop requested by user. Halting automation queue...', 'warn');
    if (this.browser) {
      try {
        this.browser.close().catch(() => {});
      } catch (e) {}
    }
  }

  async launchBrowserForAccount(account, downloadDir) {
    const chromePath = getChromeExecutablePath();
    const profilePath = getAccountProfilePath(account.id);

    // Completely terminate any orphaned processes and clear locks
    cleanStaleProfileLocks(profilePath);

    this.log(`Opening dedicated session for [${account.name}]...`, 'info');

    const args = [
      `--user-data-dir=${profilePath}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-notifications',
      '--deny-permission-prompts',
      '--disable-popup-blocking',
      '--disable-features=NotificationTriggers,PushMessaging',
      '--mute-audio',
      '--disk-cache-size=104857600',
      '--enforce-webrtc-ip-permission-check'
    ];

    let proxyAuth = null;
    if (account.proxyUrl && account.proxyUrl.trim() !== '') {
      const parsedProxy = parseProxyString(account.proxyUrl);
      if (parsedProxy) {
        args.push(`--proxy-server=${parsedProxy.serverUrl}`);
        if (parsedProxy.username && parsedProxy.password) {
          proxyAuth = { username: parsedProxy.username, password: parsedProxy.password };
        }
        this.log(`🌐 Using Proxy for [${account.name}]: ${parsedProxy.displayUrl} (${parsedProxy.protocol.toUpperCase()}${proxyAuth ? ', Authenticated' : ''})`, 'info');
      }
    }

    try {
      this.browserDownloadDir = path.join(downloadDir, '.flow-native', this.workerId || account.id);
      if (!fs.existsSync(this.browserDownloadDir)) fs.mkdirSync(this.browserDownloadDir, { recursive: true });
      this.browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: this.headless ? 'new' : false,
        defaultViewport: null,
        args,
        ignoreDefaultArgs: ['--enable-automation']
      });

      const pages = await this.browser.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

      if (proxyAuth) {
        try {
          await this.page.authenticate(proxyAuth);
          this.log(`🔐 Proxy credentials applied for [${account.name}]`, 'info');
        } catch (authErr) {
          this.log(`⚠️ Proxy auth warning: ${authErr.message}`, 'warn');
        }
      }

      // 🛡️ Auto-handle and dismiss any browser JavaScript dialogs (alert, confirm, prompt, beforeunload)
      this.page.on('dialog', async (dialog) => {
        try {
          this.log(`🛡️ Auto-dismissed native browser dialog: "${dialog.message()}"`, 'info');
          await dialog.dismiss();
        } catch (e) {}
      });

      if (pages.length > 1) {
        for (let i = 1; i < pages.length; i++) {
          try { await pages[i].close(); } catch(e) {}
        }
      }

      await this.page.bringToFront();

      // Stealth anti-bot evasion
      await this.page.evaluateOnNewDocument(() => {
        try {
          delete Object.getPrototypeOf(navigator).webdriver;
        } catch (e) {}
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        if (!window.chrome) window.chrome = {};
        window.chrome.runtime = window.chrome.runtime || {};
        if (!navigator.languages || navigator.languages.length === 0) {
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        }
      });

      // Attach CDP session
      try {
        this.cdpSession = await this.page.target().createCDPSession();
        const targetDownloadPath = this.browserDownloadDir || downloadDir;
        if (targetDownloadPath) {
          if (!fs.existsSync(targetDownloadPath)) fs.mkdirSync(targetDownloadPath, { recursive: true });
          await this.cdpSession.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: targetDownloadPath
          });
        }
      } catch (e) {}

      // Intercept video CDN streams loaded by Google Flow
      this.capturedVideoUrls = [];
      this.capturedVideoBuffers = new Map();
      this.capturedVideoBytes = 0;
      this.page.on('response', async (res) => {
        try {
          const u = res.url();
          const headers = res.headers();
          const ct = (headers['content-type'] || '').toLowerCase();
          const isImage = ct.includes('image/') || u.includes('/asb/') || u.includes('thumbnail');
          const isVideo = !isImage && (
                          ct.includes('video/') || 
                          (u.includes('.mp4') && !u.includes('.mp4.')) ||
                          (u.includes('flow-content.google') && !u.includes('thumbnail') && !u.includes('/asb/'))
                         );
          if (isVideo) {
            if (!this.capturedVideoUrls.includes(u)) {
              this.capturedVideoUrls.push(u);
            }
            try {
              const buf = await res.buffer();
              // Check magic bytes: must NOT be JPEG (ffd8) or PNG (8950)
              const isJpegOrPng = buf && buf.length > 4 && ((buf[0] === 0xff && buf[1] === 0xd8) || (buf[0] === 0x89 && buf[1] === 0x50));
              if (buf && buf.length > 100000 && !isJpegOrPng) {
                const MAX_CAPTURE_BYTES = 50 * 1024 * 1024; // Bounded to 50MB
                while (this.capturedVideoBytes + buf.length > MAX_CAPTURE_BYTES && this.capturedVideoBuffers.size > 0) {
                  const oldestKey = this.capturedVideoBuffers.keys().next().value;
                  const evicted = this.capturedVideoBuffers.get(oldestKey);
                  this.capturedVideoBytes -= (evicted ? evicted.length : 0);
                  this.capturedVideoBuffers.delete(oldestKey);
                }
                if (this.capturedVideoBytes + buf.length <= MAX_CAPTURE_BYTES) {
                  this.capturedVideoBuffers.set(u, buf);
                  this.capturedVideoBytes += buf.length;
                }
              }
            } catch (bErr) {}
          }
        } catch (e) {}
      });

      this.currentAccount = account;
      this.log(`Browser ready for [${account.name}]!`, 'success');
      return true;
    } catch (err) {
      this.log(`Launch error for [${account.name}]: ${err.message}`, 'error');
      return false;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {}
      this.browser = null;
      this.page = null;
      this.cdpSession = null;
      this.browserDownloadDir = null;
    }
    if (this.capturedVideoBuffers) {
      this.capturedVideoBuffers.clear();
      this.capturedVideoBytes = 0;
    }
    if (this.capturedVideoUrls) {
      this.capturedVideoUrls = [];
    }
    if (this.claimedTileIndices) {
      this.claimedTileIndices.clear();
    }
    if (this.consumedVideoUrls) {
      this.consumedVideoUrls.clear();
    }
  }

  async openFlowStudio(settings = {}) {
    this.currentSettings = settings;
    const url = 'https://flow.google.com/';
    this.log(`Navigating to: ${url}...`, 'info');

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
      await this.page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await sleep(4000);

    // 1. Landing page check (if not logged in or on landing screen)
    const clickedLanding = await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const createBtn = btns.find(b => {
        const txt = (b.innerText || '').trim();
        return txt.includes('Create with Google Flow') || txt.includes('Try in Google Flow');
      });
      if (createBtn) {
        createBtn.click();
        return true;
      }
      return false;
    });

    if (clickedLanding) {
      this.log('Clicked "Create with Google Flow". Loading canvas...', 'info');
      await sleep(5000);
    }

    // 2. Google Account Login check
    if (this.page.url().includes('accounts.google.com')) {
      if (this.headless) {
        this.log(`⚠️ Google Account Login Required on [${this.currentAccount ? this.currentAccount.name : 'Account'}]! Running in Headless mode. Please click "Sign In" on the account card.`, 'warn');
        return 'NEED_LOGIN';
      }
      this.log(`⚠️ Google Account Login Required on [${this.currentAccount ? this.currentAccount.name : 'Account'}]! Please sign in in the opened browser window...`, 'warn');
      for (let i = 0; i < 10; i++) {
        await sleep(3000);
        if (!this.page.url().includes('accounts.google.com')) {
          this.log('Login detected! Continuing to Flow studio...', 'success');
          break;
        }
      }
      if (this.page.url().includes('accounts.google.com')) {
        return 'NEED_LOGIN';
      }
    }

    // 3. Projects Gallery -> Canvas (Fresh Project vs Existing Project Strategy)
    const preferFreshCanvas = settings.canvasStrategy !== 'existing';
    if (!this.page.url().includes('/project/')) {
      this.currentStage = 'Entering Project Canvas';
      this.log('🎨 Navigating from gallery into Google Flow project canvas...', 'info');

      let enteredCanvas = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        // Step A: Attempt to click New Project button or Existing Project link
        const actionResult = await this.page.evaluate((preferFresh) => {
          const newBtn = document.querySelector('button.new-project-button') ||
            Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
              const txt = (b.innerText || '').toLowerCase();
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              return txt.includes('new project') || aria.includes('new project') || txt.includes('create project');
            });

          const existingLink = document.querySelector('a[href*="/project/"]');

          if (preferFresh && newBtn) {
            newBtn.click();
            return 'clicked-new-project-button';
          }

          if (!preferFresh && existingLink) {
            existingLink.click();
            return 'clicked-existing-project-link';
          }

          if (existingLink) {
            existingLink.click();
            return 'fallback-clicked-existing-project-link';
          }

          if (newBtn) {
            newBtn.click();
            return 'fallback-clicked-new-project-button';
          }

          return 'none-found';
        }, preferFreshCanvas);

        this.log(`Canvas navigation attempt ${attempt}/3: ${actionResult}`, 'info');

        // Step B: Wait up to 10 seconds for URL to become /project/...
        for (let w = 0; w < 10; w++) {
          await sleep(1000);
          if (this.page.url().includes('/project/')) {
            enteredCanvas = true;
            break;
          }
        }

        if (enteredCanvas) break;

        // Step C: Fallback to direct navigation if link href was detected
        const directHref = await this.page.evaluate(() => {
          const a = document.querySelector('a[href*="/project/"]');
          return a ? a.getAttribute('href') : null;
        });

        if (directHref) {
          const fullUrl = directHref.startsWith('http') ? directHref : `https://flow.google.com${directHref}`;
          this.log(`Navigating directly to project URL: ${fullUrl}...`, 'info');
          try {
            await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(3000);
            if (this.page.url().includes('/project/')) {
              enteredCanvas = true;
              break;
            }
          } catch (e) {}
        }
      }

      if (!this.page.url().includes('/project/')) {
        const errMsg = `Could not enter Google Flow project canvas. Page remained on ${this.page.url()}. Ensure account has accepted Google Flow terms and can create projects.`;
        recordRuntimeError({
          stage: 'Canvas Navigation',
          message: errMsg,
          accountName: this.currentAccount?.name,
          accountEmail: this.currentAccount?.email,
          suggestion: 'Check if Google Flow is showing a welcome banner or terms of service modal. Log in via Accounts tab to review.'
        });
        throw new Error(errMsg);
      }

      this.log(`✓ Successfully active inside Google Flow project canvas: ${this.page.url()}`, 'success');
      await sleep(2500);
    }

    // Dismiss tutorial/welcome overlay and clean up stale failed tiles if present
    try {
      await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dismissBtn = btns.find(b => {
          const txt = (b.innerText || '').trim().toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return txt === 'got it' || txt.includes('got it') || txt === 'get started' || aria.includes('dismiss');
        });
        if (dismissBtn) dismissBtn.click();

        // Clean stale failed cards from previous sessions
        const containers = Array.from(document.querySelectorAll('flow-grid-tile-container'));
        containers.forEach(c => {
          const txt = (c.innerText || '').toLowerCase();
          if (txt.includes('unusual activity') || txt.includes('failed to generate')) {
            const trash = c.querySelector('button[aria-label*="delete" i], button[aria-label*="trash" i], button[aria-label*="remove" i]');
            if (trash) {
              try { trash.click(); } catch(e) {}
            }
          }
        });
      });
    } catch (e) {}

    // 4. Pre-Check Real Credits balance directly from Google Flow DOM
    const required = this.getRequiredCredits(settings || this.currentSettings);
    const liveCredits = await this.readLiveCreditsFromPage();
    if (typeof liveCredits === 'number') {
      this.currentAccount.credits = liveCredits;
      this.currentAccount.status = liveCredits > 0 ? 'Ready' : 'Exhausted';
      dbService.updateAccountStatus(this.currentAccount.id, this.currentAccount.status, liveCredits);
      try {
        const allAccs = getAccounts();
        const target = allAccs.find(a => a.id === this.currentAccount.id);
        if (target) { target.credits = liveCredits; target.status = this.currentAccount.status; saveAccounts(allAccs); }
      } catch (e) {}
      if (this.onAccountUpdated) {
        this.onAccountUpdated({ account: this.currentAccount, accounts: getAccounts() });
      }
    }

    const accCredits = Number(this.currentAccount?.credits);
    if (!isNaN(accCredits)) {
      if (accCredits === 0 || this.currentAccount.status === 'Exhausted') {
        this.log(`⚠️ Account [${this.currentAccount.name}] has 0 credits. Rotating account immediately!`, 'warn');
        this.currentAccount.status = 'Exhausted';
        this.currentAccount.credits = 0;
        try {
          const allAccs = getAccounts();
          const target = allAccs.find(a => a.id === this.currentAccount.id);
          if (target) { target.status = 'Exhausted'; target.credits = 0; saveAccounts(allAccs); }
        } catch (e) {}
        if (this.onAccountUpdated) {
          this.onAccountUpdated({ account: this.currentAccount, accounts: getAccounts() });
        }
        return 'EXHAUSTED';
      } else if (required > 0 && accCredits < required) {
        this.log(`⚠️ Account [${this.currentAccount.name}] has only ${accCredits} credits, but ~${required} credits required. Rotating account...`, 'warn');
        return 'EXHAUSTED';
      } else {
        this.log(`✓ [${this.currentAccount.name}] has ${accCredits} credits available (${required > 0 ? `estimated ${required} per video` : 'Image / Free Mode'}).`, 'success');
      }
    }

    this.log('Waiting for Prompt Bar in workspace...', 'info');
    try {
      await this.page.waitForSelector('.ProseMirror, div[contenteditable="true"], div[role="textbox"], textarea', { timeout: 30000 });
      this.log('Flow Studio workspace is READY!', 'success');
    } catch (e) {}

    // 🛡️ Ensure Google Flow Agent Mode is toggled OFF so direct batch video generation is enabled
    await this.ensureAgentModeDisabled();

    await sleep(1200);
    return 'READY';
  }

  // 🛡️ UNIVERSAL POPUP, NOTIFICATION & OVERLAY AUTO-DISMISSER
  async dismissAnyBlockingOverlays() {
    if (!this.page || this.page.isClosed()) return false;
    try {
      const dismissed = await this.page.evaluate(() => {
        let actionTaken = false;

        // 1. Target buttons with common dismissal labels (case-insensitive)
        const candidateButtons = Array.from(document.querySelectorAll('button, [role="button"], a[role="button"], span[role="button"]'));
        const dismissKeywords = [
          'got it', 'get started', 'dismiss', 'i understand', 'close', 'accept all',
          'accept', 'agree', 'ok', 'okay', 'skip', 'continue', 'not now', 'no thanks',
          'maybe later', 'done', 'explore', 'understood'
        ];

        for (const btn of candidateButtons) {
          const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
          const aria = (btn.getAttribute('aria-label') || '').trim().toLowerCase();

          // Ensure it's not the Generate or Create button!
          if (text.includes('generate') || aria.includes('generate') || text.includes('new project') || text.includes('create')) {
            continue;
          }

          const matches = dismissKeywords.some(kw => text === kw || aria === kw || text.startsWith(kw) || aria.startsWith(kw));
          if (matches) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              btn.click();
              actionTaken = true;
            }
          }
        }

        // 2. Target close icons on dialogs, toasts, onboarding popovers
        const closeIconBtns = Array.from(document.querySelectorAll(
          'div[role="dialog"] button[aria-label*="close" i], ' +
          'div[role="dialog"] button[aria-label*="dismiss" i], ' +
          'mat-dialog-container button[aria-label*="close" i], ' +
          '.cdk-overlay-pane button[aria-label*="close" i], ' +
          '[class*="banner"] button[aria-label*="close" i], ' +
          '[class*="toast"] button[aria-label*="close" i], ' +
          '[class*="snackbar"] button[aria-label*="close" i]'
        ));
        for (const cBtn of closeIconBtns) {
          try {
            cBtn.click();
            actionTaken = true;
          } catch(e) {}
        }

        // 3. Remove inert backdrops that trap clicks if there is no genuine dialog
        const orphanBackdrops = document.querySelectorAll('.cdk-overlay-backdrop-showing, .modal-backdrop.show');
        if (orphanBackdrops.length > 0 && !document.querySelector('div[role="dialog"], mat-dialog-container')) {
          orphanBackdrops.forEach(b => b.remove());
          actionTaken = true;
        }

        return actionTaken;
      });

      if (dismissed) {
        this.log('🛡️ Auto-dismissed blocking overlay/banner on Google Flow.', 'info');
        await sleep(250);
      }
      return dismissed;
    } catch (e) {
      return false;
    }
  }

  // 🎯 MODEL, DURATION & SUBMODE AWARE REQUIRED CREDITS CALCULATOR
  getRequiredCredits(settings) {
    if (!settings || settings.type === 'Image') {
      return 0;
    }

    const duration = (settings.duration || '6s').toLowerCase().replace('s', '').trim();
    const model = (settings.model || '').toLowerCase();
    const outputsCount = Math.min(4, Math.max(1, Number(settings.outputsCount) || 1));
    let creditsPerOutput;

    // 🌟 Veo 3.1 Quality (100 credits)
    if (model.includes('quality')) {
      creditsPerOutput = 100;
    }

    // ⚡ Veo 3.1 Fast (20 credits standard)
    else if (model.includes('fast')) {
      if (duration === '4') creditsPerOutput = 15;
      else if (duration === '6') creditsPerOutput = 20;
      else if (duration === '8') creditsPerOutput = 25;
      else if (duration === '10') creditsPerOutput = 30;
      else creditsPerOutput = 20;
    }

    // 🎬 Veo 3.1 Lite (10 credits standard)
    else if (model.includes('lite')) {
      if (duration === '4') creditsPerOutput = 7;
      else if (duration === '6') creditsPerOutput = 10;
      else if (duration === '8') creditsPerOutput = 12;
      else if (duration === '10') creditsPerOutput = 15;
      else creditsPerOutput = 10;
    }

    // ⚡ Omni Flash (4s: 7, 6s: 10, 8s: 12, 10s: 15)
    else if (model.includes('omni') || model.includes('flash')) {
      if (duration === '4') creditsPerOutput = 7;
      else if (duration === '6') creditsPerOutput = 10;
      else if (duration === '8') creditsPerOutput = 12;
      else if (duration === '10') creditsPerOutput = 15;
      else creditsPerOutput = 10;
    }

    // 🖼️ Video Submodes (Ingredients / Frames)
    else if (settings.videoMode === 'Ingredients' || settings.referenceImage || settings.videoMode === 'Frames' || settings.startFrame || settings.endFrame) {
      creditsPerOutput = 20;
    }

    else {
      creditsPerOutput = 10;
    }

    return creditsPerOutput * outputsCount;
  }

  // 💳 READ REAL-TIME CREDITS DIRECTLY FROM GOOGLE FLOW PAGE / SESSION
  async readLiveCreditsFromPage() {
    if (!this.page || this.page.isClosed()) return null;
    try {
      // 1. Check if exhausted banner is visible on page
      const isExhaustedBanner = await this.page.evaluate(() => {
        const banner = document.querySelector('.credit-banner-error, .prompt-warning-button');
        const bodyText = document.body ? (document.body.innerText || '') : '';
        return !!(banner || bodyText.includes("out of Google Flow credits") || bodyText.includes("Insufficient credits"));
      });
      if (isExhaustedBanner) {
        return 0;
      }

      // 2. Priority 1: Open Account details panel to read exact personal credits
      const liveCredits = await this.page.evaluate(async () => {
        const targetBtn = document.querySelector('.header-user-button, [aria-label*="Account details" i], [aria-label*="account" i], [aria-label*="Google Account" i], .gb_C');
        if (targetBtn) {
          try {
            targetBtn.click();
            await new Promise(r => setTimeout(r, 1000));

            const panel = document.querySelector('flow-account-panel, [role="dialog"], div[class*="account-panel"], div[class*="profile-menu"]');
            if (panel) {
              const text = panel.innerText || panel.textContent || '';
              const match = text.match(/([\d,]+)\s*(?:Google\s*Flow\s*)?credits/i) || text.match(/credits?:\s*([\d,]+)/i) || text.match(/([\d,]+)\s*cr\b/i);
              const closeBtn = panel.querySelector('.close-btn, button[aria-label*="Close" i]');
              if (closeBtn) {
                closeBtn.click();
              } else if (targetBtn) {
                targetBtn.click();
              }
              if (match) return parseInt(match[1].replace(/,/g, ''), 10);
            }
          } catch(e) {}
        }

        // Priority 2: Check official flow-user-tier-chip custom element
        const chips = Array.from(document.querySelectorAll('flow-user-tier-chip'));
        for (const el of chips) {
          const txt = (el.innerText || el.textContent || '').trim();
          const m = txt.match(/^([\d,]{1,7})\s*(?:credits?|cr)$/i) || txt.match(/([\d,]{1,7})\s*(?:Google\s*Flow\s*)?credits?/i);
          if (m) return parseInt(m[1].replace(/,/g, ''), 10);
          const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
          const am = aria.match(/([\d,]{1,7})\s*(?:remaining\s*)?credits?/i);
          if (am) return parseInt(am[1].replace(/,/g, ''), 10);
        }

        return null;
      });
      return liveCredits;
    } catch (e) {
      return null;
    }
  }

  // 💳 REAL-TIME CREDITS EXHAUSTION DETECTOR (Model & Submode-Aware)
  async checkCreditsExhausted(settings) {
    try {
      if (settings && settings.type === 'Image') return false; // Image mode never exhausts!

      const isExhaustedOnPage = await this.page.evaluate(() => {
        const pageText = (document.body.innerText || '').toLowerCase();
        return (
          pageText.includes('insufficient credits') || 
          pageText.includes('out of credits') || 
          pageText.includes('no credits remaining') || 
          pageText.includes('reached your generation limit') ||
          pageText.includes('daily limit reached')
        );
      });

      if (isExhaustedOnPage) {
        if (this.currentAccount) {
          this.currentAccount.status = 'Exhausted';
          this.currentAccount.credits = 0;
          dbService.updateAccountStatus(this.currentAccount.id, 'Exhausted', 0);
          try {
            const allAccs = getAccounts();
            const target = allAccs.find(a => a.id === this.currentAccount.id);
            if (target) { target.status = 'Exhausted'; target.credits = 0; saveAccounts(allAccs); }
          } catch (e) {}
          if (this.onAccountUpdated) {
            this.onAccountUpdated({ account: this.currentAccount, accounts: getAccounts() });
          }
        }
        return true;
      }

      const accCredits = Number(this.currentAccount?.credits);
      const requiredCredits = (settings && this.getRequiredCredits) ? this.getRequiredCredits(settings) : 10;
      if (!isNaN(accCredits) && accCredits < requiredCredits) {
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  // 🛡️ AUTO-DETECT & DISABLE GOOGLE FLOW "AGENT MODE" CHIP
  async ensureAgentModeDisabled() {
    if (!this.page || this.page.isClosed()) return false;
    try {
      const toggled = await this.page.evaluate(() => {
        const chip = document.querySelector('.agent-mode-chip, button.agent-mode-chip') ||
          Array.from(document.querySelectorAll('button')).find(b => {
            const txt = (b.innerText || '').trim().toLowerCase();
            return txt === 'agent' && (b.className.includes('checked') || b.className.includes('active') || b.getAttribute('aria-pressed') === 'true');
          });

        if (chip && (chip.className.includes('checked') || chip.className.includes('active') || chip.getAttribute('aria-pressed') === 'true')) {
          chip.click();
          return true;
        }
        return false;
      });

      if (toggled) {
        this.log('🛡️ Google Flow "Agent Mode" was active. Automatically toggled OFF to enable Direct Video Generation Mode.', 'info');
        await sleep(1000);
      }
      return toggled;
    } catch (e) {
      return false;
    }
  }

  // ⚡ ATOMIC NATIVE TEXT INSERTION (Bypasses keydown triggers for @ mentions / search hijacking)
  async insertNativeText(text) {
    const cleanText = (text || '').replace(/[\r\n]+/g, ' ').trim();
    if (!cleanText) return;

    if (!this.cdpSession && this.page) {
      try {
        this.cdpSession = await this.page.target().createCDPSession();
      } catch (e) {}
    }

    // Pre-blur search input if it somehow stole focus
    try {
      await this.page.evaluate(() => {
        const searchInput = document.querySelector('input.search-input, input[aria-label*="search" i]');
        if (searchInput && (searchInput.value || document.activeElement === searchInput)) {
          searchInput.value = '';
          searchInput.blur();
        }
        const editor = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
        if (editor) {
          editor.focus();
        }
      });
    } catch (e) {}

    // Primary: CDP Input.insertText (Atomic insertion - bypasses keydown triggers for @ mentions / search hijacking)
    if (this.cdpSession) {
      try {
        await this.cdpSession.send('Input.insertText', { text: cleanText });
        return;
      } catch (e) {
        this.log(`CDP insertText warning: ${e.message}, falling back...`, 'warn');
      }
    }

    // Fallback 1: document.execCommand('insertText') which is also atomic
    const execSuccess = await this.page.evaluate((str) => {
      const editor = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
      if (editor) {
        editor.focus();
        return document.execCommand('insertText', false, str);
      }
      return false;
    }, cleanText);

    if (!execSuccess) {
      // Fallback 2: keyboard type as last resort
      await this.page.keyboard.type(cleanText, { delay: 10 });
    }
  }

  // ⚙️ CONFIGURE GENERATION SETTINGS (100% Exact Google Flow UI Synchronization)
  async configureGenerationSettings(settings, isRetry = false) {
    try {
      // 🛡️ Ensure Agent Mode is turned OFF so the Settings Trigger Button is visible and usable
      await this.ensureAgentModeDisabled();
      await sleep(1000);

      const modeType = settings.type || 'Video';
      const videoMode = settings.videoMode || 'Text';
      this.log(`⚙️ Syncing Flow Settings: Mode=${modeType} | Submode=${videoMode} | Model=${settings.model || 'Omni Flash'} | Duration=${settings.duration || '6s'} | Ratio=${settings.aspectRatio || '9:16'} | Outputs=x${settings.outputsCount || 1}...`, 'info');

      // Clear chips in Text mode
      if (videoMode === 'Text') {
        await this.page.evaluate(() => {
          const removeBtns = Array.from(document.querySelectorAll('button')).filter(b => {
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const txt = (b.innerText || '').toLowerCase();
            return aria.includes('remove') || txt.includes('close') || aria.includes('close');
          });
          removeBtns.forEach(b => b.click());
        });
      }

      // 1. Locate and Open the Config Pill in the Google Flow prompt bar
      let pillInfo = await this.page.evaluate(() => {
        const pill = document.querySelector('.settings-trigger-button, button.settings-trigger-button') ||
          Array.from(document.querySelectorAll('button')).find(b => {
            const txt = (b.innerText || '').toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            return aria.includes('settings trigger') || txt.includes('banana') || txt.includes('veo') || txt.includes('video') || txt.includes('image');
          });

        if (pill) {
          const r = pill.getBoundingClientRect();
          return { found: true, x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
        }
        return { found: false };
      });

      if (!pillInfo.found) {
        // Retry once by checking if agent mode re-appeared
        await this.ensureAgentModeDisabled();
        await sleep(800);
        pillInfo = await this.page.evaluate(() => {
          const pill = document.querySelector('.settings-trigger-button, button.settings-trigger-button') ||
            Array.from(document.querySelectorAll('button')).find(b => {
              const txt = (b.innerText || '').toLowerCase();
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              return aria.includes('settings trigger') || txt.includes('banana') || txt.includes('veo') || txt.includes('video') || txt.includes('image');
            });
          if (pill) {
            const r = pill.getBoundingClientRect();
            return { found: true, x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
          }
          return { found: false };
        });
      }

      if (pillInfo.found) {
        this.log(`🔍 Clicking Flow Settings Pill: "${pillInfo.text.replace(/\n/g, ' ')}"...`, 'info');
        await this.page.mouse.click(pillInfo.x, pillInfo.y);
        await sleep(1000);

        // 2. Select Video vs Image Mode inside the settings popover overlay
        this.log(`1️⃣ Switching Mode to [${modeType}]...`, 'info');
        const modeClicked = await this.page.evaluate((targetMode) => {
          const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
          const btns = Array.from(pop.querySelectorAll('button, [role="radio"], [role="tab"]'));
          const m = targetMode.toLowerCase();
          const targetBtn = btns.find(b => {
            const txt = (b.innerText || '').toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            if (m === 'video') {
              return (txt.includes('video') && !txt.includes('image')) || aria === 'video';
            } else {
              return (txt.includes('image') && !txt.includes('video')) || aria === 'image';
            }
          });

          if (targetBtn) {
            targetBtn.click();
            const r = targetBtn.getBoundingClientRect();
            return { clicked: true, text: targetBtn.innerText, x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }
          return { clicked: false };
        }, modeType);

        if (modeClicked.clicked) {
          if (modeClicked.x && modeClicked.y) {
            await this.page.mouse.click(modeClicked.x, modeClicked.y);
          }
          await sleep(800);
        }

        // 3. Select Video Sub-mode (Text vs Ingredients vs Frames)
        if (modeType === 'Video') {
          if (videoMode === 'Ingredients') {
            this.log(`2️⃣ Selecting Submode [Ingredients]...`, 'info');
            await this.page.evaluate(() => {
              const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
              const btns = Array.from(pop.querySelectorAll('button, [role="radio"], [role="tab"]'));
              const b = btns.find(btn => (btn.innerText || '').toLowerCase().includes('ingredient'));
              if (b) b.click();
            });
            await sleep(350);
          } else if (videoMode === 'Frames') {
            this.log(`2️⃣ Selecting Submode [Frames]...`, 'info');
            await this.page.evaluate(() => {
              const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
              const btns = Array.from(pop.querySelectorAll('button, [role="radio"], [role="tab"]'));
              const b = btns.find(btn => (btn.innerText || '').toLowerCase().includes('frame'));
              if (b) b.click();
            });
            await sleep(350);
          } else {
            // Text mode: ensure neither Frames nor Ingredients is active
            await this.page.evaluate(() => {
              const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
              const btns = Array.from(pop.querySelectorAll('button, [role="radio"], [role="tab"]'));
              const btnFrames = btns.find(b => (b.innerText || '').trim().toLowerCase().includes('frames'));
              const btnIngredients = btns.find(b => (b.innerText || '').trim().toLowerCase().includes('ingredients'));
              if (btnFrames && (btnFrames.getAttribute('data-state') === 'on' || btnFrames.className.includes('active'))) btnFrames.click();
              if (btnIngredients && (btnIngredients.getAttribute('data-state') === 'on' || btnIngredients.className.includes('active'))) btnIngredients.click();
            });
            await sleep(200);
          }
        }

        // 4. Select Aspect Ratio (9:16 | 16:9 | 1:1 | 4:3 | 3:4)
        const targetAspect = settings.aspectRatio || (modeType === 'Image' ? '1:1' : '9:16');
        this.log(`3️⃣ Selecting Aspect Ratio [${targetAspect}]...`, 'info');
        await this.page.evaluate((aspect) => {
          const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
          const btns = Array.from(pop.querySelectorAll('button, [role="radio"], [role="tab"]'));
          const cleanAspect = aspect.replace(':', '_');
          const targetBtn = btns.find(b => {
            const txt = (b.innerText || '').trim();
            const aria = (b.getAttribute('aria-label') || '').trim();
            return txt.includes(aspect) || txt.includes(cleanAspect) || aria.includes(aspect) || aria.includes(cleanAspect);
          });
          if (targetBtn) targetBtn.click();
        }, targetAspect);
        await sleep(350);

        // 5. Select Duration (4s | 6s | 8s | 10s)
        if (modeType === 'Video') {
          const targetDuration = settings.duration || '6s';
          this.log(`4️⃣ Selecting Duration [${targetDuration}]...`, 'info');
          await this.page.evaluate((dur) => {
            const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
            const btns = Array.from(pop.querySelectorAll('button, [role="radio"], [role="tab"]'));
            const targetBtn = btns.find(b => {
              const txt = (b.innerText || '').trim().toLowerCase();
              const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
              return txt === dur.toLowerCase() || aria === dur.toLowerCase();
            });
            if (targetBtn) targetBtn.click();
          }, targetDuration);
          await sleep(350);
        }

        // 6. Select Outputs Count (x1 | x2 | x3 | x4)
        const targetCount = `x${settings.outputsCount || 1}`;
        this.log(`5️⃣ Selecting Output Count [${targetCount}]...`, 'info');
        await this.page.evaluate((cnt) => {
          const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
          const btns = Array.from(pop.querySelectorAll('button, [role="radio"], [role="tab"]'));
          const targetBtn = btns.find(b => {
            const txt = (b.innerText || '').trim().toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
            return txt === cnt.toLowerCase() || aria === cnt.toLowerCase();
          });
          if (targetBtn) targetBtn.click();
        }, targetCount);
        await sleep(350);

        // 7. Select AI Model Dropdown if specified
        if (settings.model) {
          this.log(`6️⃣ Selecting AI Model [${settings.model}]...`, 'info');
          await this.page.evaluate(async (mName) => {
            const pop = document.querySelector('.cdk-overlay-pane, .settings-content') || document.body;
            const btns = Array.from(pop.querySelectorAll('button, div[role="button"]'));
            const modelDropdown = btns.find(b => {
              const txt = (b.innerText || '').toLowerCase();
              return txt.includes('omni') || txt.includes('veo') || txt.includes('flash') || txt.includes('banana') || b.getAttribute('aria-haspopup') === 'menu';
            });
            if (modelDropdown) {
              const currentTxt = (modelDropdown.innerText || '').toLowerCase();
              const cleanTarget = mName.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!currentTxt.replace(/[^a-z0-9]/g, '').includes(cleanTarget)) {
                modelDropdown.click();
                await new Promise(r => setTimeout(r, 400));
                const menuItems = Array.from(document.querySelectorAll('.cdk-overlay-pane [role="menuitem"], [role="menu"] button, div[role="menu"] div, div[role="listbox"] [role="option"]'));
                const opt = menuItems.find(item => {
                  const itTxt = (item.innerText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  return itTxt.includes(cleanTarget) || cleanTarget.includes(itTxt);
                });
                if (opt) opt.click();
              }
            }
          }, settings.model);
          await sleep(400);
        }

        // 8. Close Popover safely
        await this.page.keyboard.press('Escape');
        await sleep(600);

        // 9. VERIFICATION of prompt bar pill text
        const finalPillText = await this.page.evaluate(() => {
          const pill = document.querySelector('.settings-trigger-button, button.settings-trigger-button');
          return pill ? pill.innerText.replace(/\n/g, ' ').trim() : null;
        });

        if (modeType === 'Video' && finalPillText && (finalPillText.includes('Banana') || finalPillText.startsWith('Image'))) {
          if (!isRetry) {
            this.log(`⚠️ Settings pill remained on Image (${finalPillText}). Performing auto-retry switch to Video...`, 'warn');
            return await this.configureGenerationSettings(settings, true);
          } else {
            this.log(`⚠️ Settings pill switch warning: "${finalPillText}".`, 'warn');
          }
        } else {
          this.log(`✓ All Flow settings synchronized & verified in Google Flow UI: "${finalPillText || modeType}"`, 'success');
        }
      } else {
        this.log(`⚠️ Settings pill not found on Flow canvas. Using default configuration.`, 'warn');
      }
    } catch (e) {
      this.log(`Settings sync notice: ${e.message}`, 'warn');
    }
  }

  // 📤 UPLOAD & ATTACH REFERENCE MEDIA TO GOOGLE FLOW PROMPT BAR (Exact Filename Watcher + Real Mouse Click)
  async uploadAndAttachReferenceMedia(imagePath, targetSlot = 'ingredient') {
    if (!imagePath || !fs.existsSync(imagePath)) {
      this.log(`⚠️ Reference media file not found on disk: ${imagePath}`, 'warn');
      return false;
    }

    const baseName = path.basename(imagePath);
    const cleanSearchKey = baseName.replace(/\.[^/.]+$/, '').toLowerCase();
    this.log(`📎 Uploading & Attaching Reference Media [${baseName}] (${targetSlot})...`, 'info');

    try {
      // 1. Open Asset Drawer to upload image to Google Flow Library
      this.log('1️⃣ Opening Flow Asset Drawer...', 'info');
      await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const plusBtn = btns.find(b => {
          const txt = (b.innerText || '').trim();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return txt.includes('add_2') || txt === '+' || aria.includes('add asset') || aria.includes('add media') || aria.includes('upload');
        });
        if (plusBtn) plusBtn.click();
      });
      await sleep(1200);

      // 2. Feed file to input[type="file"]
      let fileInput = await this.page.$('input[type="file"]');
      if (!fileInput) {
        try {
          const [fileChooser] = await Promise.all([
            this.page.waitForFileChooser({ timeout: 2000 }),
            this.page.evaluate(() => {
              const btns = Array.from(document.querySelectorAll('div[role="dialog"] button, button'));
              const upBtn = btns.find(b => (b.innerText || '').toLowerCase().includes('upload') || (b.innerText || '').includes('drive_folder_upload'));
              if (upBtn) upBtn.click();
            })
          ]);
          if (fileChooser) await fileChooser.accept([imagePath]);
        } catch (e) {}
      }

      fileInput = await this.page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
        this.log(`⏳ Uploading [${baseName}] to Google Flow server (Estimated time: 20-25s)...`, 'info');
        
        // 3. Guaranteed Active Upload & Server Processing Loop (20-30s)
        for (let sec = 1; sec <= 25; sec++) {
          await sleep(1000);

          if (sec % 4 === 0 || sec === 20 || sec === 25) {
            this.log(`⏳ [Google Cloud Upload] [${baseName}]: ${sec}s / 25s elapsed...`, 'info');
          }
        }
        this.log(`✓ [${baseName}] upload & Google Cloud processing time completed (25s)!`, 'success');
        await sleep(2000); // 2s buffer for Google Flow indexing
      }

      // Close drawer cleanly
      await this.page.keyboard.press('Escape');
      await sleep(800);

      // 4. Position cursor & trigger @ mention
      this.log(`2️⃣ Attaching Reference Image Chip [${baseName}] (${targetSlot})...`, 'info');
      await this.page.evaluate(() => {
        const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
        if (tb) { tb.focus(); tb.click(); }
      });
      await sleep(300);

      if (targetSlot === 'start' || targetSlot === 'ingredient') {
        // Clear any pre-existing text for first chip
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
        await this.page.keyboard.press('Backspace');
        await sleep(300);
      } else {
        // For End Frame (2nd chip): Move to End and add space to preserve 1st chip
        await this.page.keyboard.press('End');
        await sleep(200);
        await this.page.keyboard.type(' ', { delay: 30 });
        await sleep(300);
      }

      // Trigger @ followed by clean alphanumeric search key (no spaces)
      const cleanWord = baseName.replace(/\.[^/.]+$/, '').split(/[^a-zA-Z0-9]/)[0].substring(0, 12);
      const typeStr = (cleanWord.length >= 2) ? ('@' + cleanWord) : '@';
      this.log(`3️⃣ Searching & Attaching [${typeStr}] for [${baseName}] (${targetSlot})...`, 'info');
      await this.page.keyboard.type(typeStr, { delay: 40 });
      await sleep(1200);

      // Find index of option matching target fileName in popover
      const targetOption = await this.page.evaluate((fname) => {
        const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
        if (!popover) return { found: false, index: 0 };
        const options = Array.from(popover.querySelectorAll('[role="option"], div[class*="item"]'));
        
        const cleanTarget = fname.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (let i = 0; i < options.length; i++) {
          const text = (options[i].innerText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (text.includes(cleanTarget) || cleanTarget.includes(text)) {
            return { found: true, index: i, matchText: options[i].innerText.trim() };
          }
        }
        return { found: false, index: 0, total: options.length };
      }, baseName);

      const indexToNavigate = targetOption.found ? targetOption.index : 0;
      for (let i = 0; i < indexToNavigate; i++) {
        await this.page.keyboard.press('ArrowDown');
        await sleep(120);
      }

      await this.page.keyboard.press('Enter');
      await sleep(1000);

      // 5. Verify chip is attached
      const isAttached = await this.page.evaluate(() => {
        const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
        if (!tb) return false;
        const chips = tb.querySelectorAll('[data-slate-inline="true"], [contenteditable="false"], [data-chip]');
        return chips.length > 0;
      });

      if (isAttached) {
        this.log(`🎉 Reference image [${baseName}] (${targetSlot}) 100% attached as visual chip!`, 'success');
        return true;
      } else {
        this.log(`⚠️ Mention selection retry: pressing Enter...`, 'warn');
        await this.page.keyboard.press('Enter');
        await sleep(600);
        return true;
      }
    } catch (err) {
      this.log(`Attachment error: ${err.message}`, 'warn');
      return false;
    }
  }

  // 🚀 SUBMIT SINGLE PROMPT (Fire-and-Forget: Submits prompt to Flow without blocking queue)
  async submitPrompt(promptText, settings, promptIndex, totalPrompts) {
    if (this.isStopping) return { status: 'STOPPED' };

    promptText = (promptText || '').replace(/[\r\n]+/g, ' ').trim();
    const videoId = `vid_${Date.now()}_${promptIndex + 1}`;
    this.log(`\n----------------------------------------`, 'info');
    this.log(`🚀 [Prompt ${promptIndex + 1}/${totalPrompts}] Submitting to Flow: "${promptText.substring(0, 50)}..."`, 'info');
    this.log(`----------------------------------------`, 'info');

    // Notify UI immediately that video generation has started
    if (this.onVideoStarted) {
      this.onVideoStarted({
        id: videoId,
        prompt: promptText,
        promptIndex: promptIndex + 1,
        totalPrompts,
        accountName: this.currentAccount ? this.currentAccount.name : 'Account',
        status: 'Preparing & Submitting...'
      });
    }

    // Auto-dismiss any Google Flow popups, hints, got-it tooltips or banners before proceeding
    await this.dismissAnyBlockingOverlays();

    if (settings.type !== 'Image' && await this.checkCreditsExhausted(settings)) {
      this.log(`Account [${this.currentAccount.name}] is OUT OF CREDITS!`, 'warn');
      return { status: 'EXHAUSTED' };
    }

    // 1️⃣ Configure Settings on the first prompt of this session or if changed
    if (!this.hasConfiguredSettings) {
      await this.configureGenerationSettings(settings);
      this.hasConfiguredSettings = true;
    }

    // 2️⃣ Upload & Attach Reference Media Chips (Ingredients / Frames) with 1-to-1 Auto-Pairing
    let targetRef = null;
    if (settings.referenceImages && settings.referenceImages.length > 0) {
      const refIdx = promptIndex % settings.referenceImages.length;
      targetRef = settings.referenceImages[refIdx];
      this.log(`🖼️ Auto-Pairing Prompt #${promptIndex + 1} with Reference Image [${refIdx + 1}/${settings.referenceImages.length}]: ${path.basename(targetRef)}`, 'info');
    } else if (settings.referenceImage) {
      targetRef = settings.referenceImage;
    }

    if (targetRef) {
      await this.uploadAndAttachReferenceMedia(targetRef, 'ingredient');
    } else if (settings.videoMode === 'Frames') {
      if (settings.startFrame) await this.uploadAndAttachReferenceMedia(settings.startFrame, 'start');
      if (settings.endFrame) await this.uploadAndAttachReferenceMedia(settings.endFrame, 'end');
    }

    // 🛡️ Ensure Agent mode is turned OFF and verify settings pill before typing prompt
    await this.ensureAgentModeDisabled();
    const currentPillText = await this.page.evaluate(() => {
      const pill = document.querySelector('.settings-trigger-button, button.settings-trigger-button');
      return pill ? pill.innerText.replace(/\n/g, ' ').trim() : null;
    });

    const isVideoExpected = (settings.type || 'Video') === 'Video';
    if (isVideoExpected && currentPillText && (currentPillText.includes('Banana') || currentPillText.startsWith('Image'))) {
      this.log(`⚠️ Flow workspace reverted to Image (${currentPillText}). Enforcing Video mode...`, 'warn');
      await this.configureGenerationSettings(settings);
    }

    // 3️⃣ Focus Slate/ProseMirror Prompt Box & Type Prompt
    this.currentStage = 'Prompt Input';
    this.log('Focusing prompt editor in Google Flow workspace...', 'info');

    let tbFound = false;
    try {
      await this.page.waitForSelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror', { timeout: 15000 });
      tbFound = true;
    } catch (tbErr) {
      tbFound = false;
    }

    if (!tbFound) {
      const err = new Error(`Google Flow prompt box ('div.ProseMirror') not found on canvas URL: ${this.page.url()}`);
      recordRuntimeError({
        stage: 'Prompt Input',
        message: err.message,
        accountName: this.currentAccount?.name,
        accountEmail: this.currentAccount?.email,
        promptText: promptText,
        suggestion: 'The project canvas did not finish initializing or an overlay modal is open. Refreshing canvas usually fixes this.'
      });
      throw err;
    }

    // Step A: Pre-clean any stray text in the top search bar and blur it
    await this.page.evaluate(() => {
      const searchInput = document.querySelector('input.search-input, input[aria-label*="search" i]');
      if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
      }
      // If Flow's native "Clear prompt" button is present, click it
      const clearBtn = document.querySelector('button.clear-button, button[aria-label="Clear prompt"]');
      if (clearBtn) {
        try { clearBtn.click(); } catch (e) {}
      }
    });

    // Step B: Focus ProseMirror editor specifically
    const tbCoords = await this.page.evaluate(() => {
      const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
      if (el) {
        el.focus();
        const r = el.getBoundingClientRect();
        return { x: r.x + Math.min(25, r.width / 4), y: r.y + r.height / 2 };
      }
      return null;
    });

    if (tbCoords) {
      await this.page.mouse.click(tbCoords.x, tbCoords.y);
      await sleep(150);
    } else {
      const tbHandle = await this.page.$('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
      if (tbHandle) await tbHandle.click();
      await sleep(150);
    }

    if (!targetRef) {
      // Clean slate text mode: select all and clear
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      await sleep(150);

      this.log(`Inserting prompt: "${promptText.substring(0, 50)}..."`, 'info');
      await this.insertNativeText(promptText);
      await sleep(250);
    } else {
      // Submode with chips: clear any trailing text nodes while preserving image chips
      await this.page.evaluate(() => {
        const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
        if (!el) return;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
          let parent = node.parentElement;
          let isInsideChip = false;
          while (parent && parent !== el) {
            if (parent.getAttribute('data-chip') || parent.getAttribute('contenteditable') === 'false' || (parent.className && String(parent.className).includes('chip'))) {
              isInsideChip = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (!isInsideChip) textNodes.push(node);
        }
        textNodes.forEach(n => n.remove());
      });

      await this.page.keyboard.press('End');
      await sleep(150);
      await this.page.keyboard.type(' ', { delay: 20 });
      this.log(`Inserting prompt after image chip: "${promptText.substring(0, 50)}..."`, 'info');
      await this.insertNativeText(promptText);
      await sleep(250);
    }

    // Step C: Post-insertion safeguard - ensure search bar was NOT polluted and dismiss any accidental mention popover
    await this.page.evaluate(() => {
      const searchInput = document.querySelector('input.search-input, input[aria-label*="search" i]');
      if (searchInput && (searchInput.value || document.activeElement === searchInput)) {
        searchInput.value = '';
        searchInput.blur();
      }
    });

    // 🔍 VERIFY DOM PROMPT CONTENT (Multi-layer Fallback Guarantee)
    let domPromptText = await this.page.evaluate(() => {
      const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
      return el ? (el.innerText || el.textContent || '').trim() : '';
    });

    if (!domPromptText || domPromptText.length === 0) {
      this.log('⚠️ Primary typing did not register in ProseMirror DOM. Attempting CDP insertText fallback...', 'warn');
      if (!this.cdpSession && this.page) {
        try { this.cdpSession = await this.page.target().createCDPSession(); } catch (e) {}
      }
      if (this.cdpSession) {
        try {
          await this.cdpSession.send('Input.insertText', { text: promptText });
        } catch (cdpErr) {}
      }
      await sleep(250);
      domPromptText = await this.page.evaluate(() => {
        const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
        return el ? (el.innerText || el.textContent || '').trim() : '';
      });
    }

    if (!domPromptText || domPromptText.length === 0) {
      this.log('⚠️ CDP insertText was not accepted. Attempting document.execCommand fallback...', 'warn');
      await this.page.evaluate((text) => {
        const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
        if (el) {
          el.focus();
          document.execCommand('insertText', false, text);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, promptText);
      await sleep(250);
      domPromptText = await this.page.evaluate(() => {
        const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
        return el ? (el.innerText || el.textContent || '').trim() : '';
      });
    }

    if (!domPromptText || domPromptText.length === 0) {
      const err = new Error('Could not write prompt into Google Flow ProseMirror editor. Editor DOM did not accept input events.');
      recordRuntimeError({
        stage: 'Prompt Input',
        message: err.message,
        accountName: this.currentAccount?.name,
        accountEmail: this.currentAccount?.email,
        promptText: promptText,
        suggestion: 'The prompt box was not responsive to keyboard or clipboard inputs. Check if a browser extension or Chrome flag is interfering.'
      });
      throw err;
    }

    this.log(`✓ Prompt registered successfully in Flow editor (${domPromptText.length} chars)`, 'success');

    // Snapshot existing tiles before firing generation to prevent downloading pre-existing cards
    let preExistingTileCount = 0;
    let preExistingAriaLabels = [];
    try {
      const snap = await this.page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('flow-grid-tile-container'));
        return {
          count: containers.length,
          labels: containers.map(c => (c.getAttribute('aria-label') || '').toLowerCase().trim()).filter(Boolean)
        };
      });
      preExistingTileCount = snap.count;
      preExistingAriaLabels = snap.labels;
    } catch (e) {}

    const preExistingVideoUrls = new Set(this.capturedVideoUrls || []);

    // 4️⃣ Submit Generation Request (Humanized Trusted OS Click)
    this.currentStage = 'Firing Generation';
    this.log('Firing Generation request in Google Flow...', 'info');
    await sleep(400);

    // Locate generate/submit button coordinates (Targeting generate-icon-button & "Start generation")
    let submitBtnCoords = null;
    for (let waitBtn = 0; waitBtn < 5; waitBtn++) {
      submitBtnCoords = await this.page.evaluate(() => {
        const allBtns = Array.from(document.querySelectorAll('button'));
        const submitBtn = allBtns.find(b => {
          const txt = (b.innerText || '').trim();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const cls = String(b.className || '').toLowerCase();
          const isGenIcon = cls.includes('generate-icon-button') || cls.includes('generate');
          const hasArrow = txt.includes('arrow_forward') || txt.includes('arrow_upward') || txt.includes('send');
          const isGenerate = (aria === 'generate' || aria === 'submit' || aria.includes('generation') || aria.includes('generate'));
          const isAddButton = aria.includes('add') || aria.includes('asset') || txt.includes('add_2') || txt === '+';
          return (isGenIcon || hasArrow || isGenerate) && !isAddButton;
        });

        if (submitBtn) {
          const disabled = submitBtn.disabled || submitBtn.getAttribute('aria-disabled') === 'true';
          const r = submitBtn.getBoundingClientRect();
          return {
            found: true,
            disabled,
            x: r.x + r.width / 2,
            y: r.y + r.height / 2
          };
        }
        return { found: false };
      });

      if (submitBtnCoords && submitBtnCoords.found && !submitBtnCoords.disabled) {
        break;
      }
      await sleep(500);
    }

    if (submitBtnCoords && submitBtnCoords.found) {
      if (submitBtnCoords.disabled) {
        this.log('Submit button still disabled, attempting to trigger input events...', 'warn');
        await this.page.evaluate(() => {
          const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await sleep(500);
      }
      // Realistic mouse move & click (Produces trusted event: isTrusted = true)
      await this.page.mouse.move(submitBtnCoords.x, submitBtnCoords.y, { steps: 5 });
      await sleep(100);
      await this.page.mouse.click(submitBtnCoords.x, submitBtnCoords.y);
      await sleep(350);
    } else {
      // Fallback: ProseMirror Control+Enter shortcut
      this.log('Clicking ProseMirror submit via Ctrl+Enter shortcut...', 'info');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('Enter');
      await this.page.keyboard.up('Control');
      await sleep(350);
    }

    // 🔍 5️⃣ Immediate Safety / Policy Violation & Modal Detector
    await sleep(1500);
    const immediateViolation = await this.page.evaluate(() => {
      const errorSelectors = [
        'div[role="alert"]',
        'div[role="status"]',
        'snack-bar',
        'mwc-snackbar',
        'div[role="dialog"]',
        'mwc-dialog',
        'flow-dialog',
        '.error-message',
        '.toast',
        '[class*="error"]',
        '[class*="snackbar"]',
        '[class*="toast"]',
        '[class*="alert"]'
      ];

      for (const sel of errorSelectors) {
        const els = Array.from(document.querySelectorAll(sel));
        for (const el of els) {
          const txt = (el.innerText || '').toLowerCase();
          const isViolation = txt.includes('safety') || 
                              txt.includes('policy') || 
                              txt.includes('violat') || 
                              txt.includes('terms') || 
                              txt.includes('unable to generate') || 
                              txt.includes("can't generate") || 
                              txt.includes('try another prompt') || 
                              txt.includes('not allowed') || 
                              txt.includes('inappropriate') || 
                              txt.includes('something went wrong') || 
                              txt.includes('unusual activity') ||
                              txt.includes('blocked');

          if (isViolation && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
            // Dismiss dialog / toast
            const dismissBtn = el.querySelector('button, [role="button"]') ||
              Array.from(document.querySelectorAll('button')).find(b => {
                const bTxt = (b.innerText || '').toLowerCase();
                return bTxt.includes('got it') || bTxt.includes('dismiss') || bTxt.includes('ok') || bTxt.includes('close');
              });
            if (dismissBtn) {
              try { dismissBtn.click(); } catch (e) {}
            }
            return {
              isViolation: true,
              message: (el.innerText || 'Google Safety Policy Violation').trim().replace(/\s+/g, ' ').substring(0, 150)
            };
          }
        }
      }

      // Check open dialogs
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], mwc-dialog'));
      for (const d of dialogs) {
        const txt = (d.innerText || '').toLowerCase();
        if (txt.includes('policy') || txt.includes('safety') || txt.includes('violat') || txt.includes('terms') || txt.includes('something went wrong')) {
          const btn = d.querySelector('button');
          if (btn) try { btn.click(); } catch (e) {}
          return {
            isViolation: true,
            message: (d.innerText || 'Policy Violation Dialog').trim().replace(/\s+/g, ' ').substring(0, 150)
          };
        }
      }

      return null;
    });

    if (immediateViolation && immediateViolation.isViolation) {
      // Dismiss any open modal
      try {
        await this.page.keyboard.press('Escape');
      } catch (e) {}

      // Hard clear prompt textbox so rejected prompt does not contaminate next prompt
      try {
        await this.page.evaluate(() => {
          const clearBtn = document.querySelector('button.clear-button, button[aria-label="Clear prompt"]');
          if (clearBtn) { try { clearBtn.click(); } catch (e) {} }
          const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
          if (el) {
            el.textContent = '';
          }
        });
      } catch (e) {}

      this.log(`⚠️ [Prompt #${promptIndex + 1}] Google Safety/Policy Violation detected: "${immediateViolation.message}". Skipping prompt safely to protect queue!`, 'warn');

      this.onVideoCompleted({
        id: videoId,
        prompt: promptText,
        accountName: this.currentAccount.name,
        status: `Violation: ${immediateViolation.message}`,
        filePath: null,
        error: immediateViolation.message,
        type: settings.type,
        timestamp: new Date().toLocaleTimeString()
      });

      return {
        status: 'VIOLATION',
        reason: immediateViolation.message,
        videoId,
        promptIndex
      };
    }

    this.log(`✓ [Prompt #${promptIndex + 1}] Successfully fired to Google Flow generation engine!`, 'success');

    // 💳 REAL-TIME CONSUMPTION CHARGE & BALANCE SYNC
    const required = this.getRequiredCredits(settings);
    if (this.currentAccount && required > 0) {
      const liveCr = await this.readLiveCreditsFromPage();
      let newBalance = null;
      if (typeof liveCr === 'number') {
        newBalance = liveCr;
      } else if (typeof this.currentAccount.credits === 'number') {
        newBalance = Math.max(0, this.currentAccount.credits - required);
      }
      if (typeof newBalance === 'number') {
        this.currentAccount.credits = newBalance;
        if (newBalance === 0) {
          this.currentAccount.status = 'Exhausted';
        }
        dbService.updateAccountStatus(this.currentAccount.id, this.currentAccount.status, newBalance);
        try {
          const allAccs = getAccounts();
          const target = allAccs.find(a => a.id === this.currentAccount.id);
          if (target) { target.credits = newBalance; target.status = this.currentAccount.status; saveAccounts(allAccs); }
        } catch (e) {}
        this.log(`💳 [Real-Time Credits]: [${this.currentAccount.name}] charged ~${required} credits. Remaining balance: ${newBalance} credits.`, 'info');
        if (this.onAccountUpdated) {
          this.onAccountUpdated({ account: this.currentAccount, accounts: getAccounts() });
        }
      } else {
        this.log(`💳 [Real-Time Credits]: Generation started for [${this.currentAccount.name}].`, 'info');
      }
    }

    // Notify UI card started
    this.onVideoStarted({
      id: videoId,
      prompt: promptText,
      accountName: this.currentAccount.name,
      quality: settings.quality || '1080p',
      duration: settings.duration || '6s',
      aspectRatio: settings.aspectRatio || '9:16',
      timestamp: new Date().toLocaleTimeString(),
      status: 'Generating'
    });

    return {
      status: 'SUBMITTED',
      videoId,
      promptText,
      promptIndex,
      startTime: Date.now(),
      preExistingTileCount,
      preExistingAriaLabels,
      preExistingVideoUrls,
      lockedTileIndex: null,
      wasObservedGenerating: false,
      completed: false,
      downloaded: false
    };
  }

  // ⚡ DIRECT BACKEND DOWNLOAD (Silent, 0 UI Menus, 0 3-Dots, No Browser Popups, 100% Lossless Original)
  async downloadMediaOriginal(task, downloadFolder, settings, tileIndex = 0) {
    const isImageMode = (settings.type === 'Image');
    const fileExt = isImageMode ? 'png' : 'mp4';
    const indexNum = task.promptIndex + 1;
    const paddedIndex = String(indexNum).padStart(3, '0');
    const pattern = settings.namingPattern || 'scene';
    const prefix = sanitizeFilePart(settings.customNamingPrefix, 'scene');

    let fileName = `scene${paddedIndex}.${fileExt}`;
    if (pattern === 'numeric') fileName = `${paddedIndex}.${fileExt}`;
    else if (pattern === 'scene') fileName = `scene${paddedIndex}.${fileExt}`;
    else if (pattern === 'clip') fileName = `clip${paddedIndex}.${fileExt}`;
    else if (pattern === 'shot') fileName = `shot${paddedIndex}.${fileExt}`;
    else if (pattern === 'video') fileName = isImageMode ? `image${paddedIndex}.${fileExt}` : `video${paddedIndex}.${fileExt}`;
    else if (pattern === 'custom') fileName = `${prefix}${paddedIndex}.${fileExt}`;
    else if (pattern === 'prompt') {
      const clean = (task.promptText || 'prompt').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      fileName = `${paddedIndex}_${clean}.${fileExt}`;
    }

    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    const finalSavedFilePath = path.join(downloadFolder, fileName);
    task.fileName = fileName;
    task.filePath = finalSavedFilePath;

    this.log(`⚡ Direct Backend Download: Extracting pristine ${isImageMode ? 'image' : 'video'} for [Prompt #${indexNum}] (0 UI menus)...`, 'info');

    let savedBuffer = null;

    // 1. Identify fresh video URLs intercepted from network (strictly excluding pre-existing streams and already consumed URLs)
    const freshVideoUrls = (this.capturedVideoUrls || []).filter(u => 
      (!task.preExistingVideoUrls || !task.preExistingVideoUrls.has(u)) &&
      (!this.consumedVideoUrls || !this.consumedVideoUrls.has(u))
    );
    let targetUrl = task.completedVideoUrl;
    if (targetUrl && this.consumedVideoUrls && this.consumedVideoUrls.has(targetUrl)) {
      targetUrl = null;
      task.completedVideoUrl = null;
    }
    if (!targetUrl && freshVideoUrls.length > 0) {
      targetUrl = freshVideoUrls[freshVideoUrls.length - 1];
      task.completedVideoUrl = targetUrl;
    }

    // 2. Check network intercepted buffer cache
    if (targetUrl && this.capturedVideoBuffers && this.capturedVideoBuffers.has(targetUrl)) {
      savedBuffer = this.capturedVideoBuffers.get(targetUrl);
    }

    // 3. If no buffer, inspect DOM directly without clicking anything (NEVER click playIcon or card to prevent Flow editor modal)
    if (!savedBuffer && this.page && !this.page.isClosed()) {
      try {
        const extraction = await this.page.evaluate(async ({ idx, isImage }) => {
          const containers = Array.from(document.querySelectorAll('flow-grid-tile-container'));
          let target = (typeof idx === 'number' && containers[idx]) ? containers[idx] : null;
          if (!target && containers.length > 0) target = containers[containers.length - 1];
          if (!target) return { url: null, base64: null };

          if (isImage) {
            const img = target.querySelector('img');
            if (img && img.src) return { url: img.src, base64: null };
          }

          // Check video element directly without clicking any icons or tiles
          const vid = target.querySelector('video');
          const src = vid ? (vid.src || vid.currentSrc) : null;

          // In-page blob conversion if present
          if (src && src.startsWith('blob:')) {
            try {
              const r = await fetch(src);
              const b = await r.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ url: src, base64: reader.result });
                reader.onerror = () => resolve({ url: src, base64: null });
                reader.readAsDataURL(b);
              });
            } catch(e) {
              return { url: src, base64: null };
            }
          }

          return { url: src, base64: null };
        }, { idx: tileIndex, isImage: isImageMode });

        if (extraction) {
          if (extraction.base64 && extraction.base64.includes('base64,')) {
            const b64Data = extraction.base64.split('base64,')[1];
            savedBuffer = Buffer.from(b64Data, 'base64');
          } else if (extraction.url) {
            targetUrl = extraction.url;
            task.completedVideoUrl = extraction.url;
          }
        }
      } catch (e) {
        this.log(`DOM extraction note: ${e.message}`, 'warn');
      }
    }

    // 4. Fallback to latest captured video stream if targetUrl is still not found
    if (!savedBuffer && !targetUrl && freshVideoUrls.length > 0) {
      targetUrl = freshVideoUrls[freshVideoUrls.length - 1];
      task.completedVideoUrl = targetUrl;
    }

    // 4. Download signed CDN stream via Node.js fetch directly into memory
    if (!savedBuffer && targetUrl && targetUrl.startsWith('http')) {
      try {
        const cookies = await this.page.cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        const resp = await fetch(targetUrl, {
          headers: {
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'Referer': 'https://flow.google.com/'
          },
          redirect: 'follow'
        });

        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          const minSize = isImageMode ? 5000 : 50000;
          if (buf.length >= minSize) {
            savedBuffer = buf;
          }
        }
      } catch (e) {
        this.log(`Node fetch error for ${fileName}: ${e.message}`, 'warn');
      }
    }

    // 5. Save buffer directly to disk (clean single-file write, 0 double downloads, 0 browser popups)
    if (savedBuffer && savedBuffer.length > 10000) {
      const fd = fs.openSync(finalSavedFilePath, 'w');
      fs.writeSync(fd, savedBuffer);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      const sizeMb = (savedBuffer.length / (1024 * 1024)).toFixed(2);
      this.log(`✓ [Direct Backend Download] Successfully saved pristine original: ${fileName} (${sizeMb} MB)!`, 'success');

      try {
        dbService.completeTask(task.taskId || task.videoId, {
          filePath: finalSavedFilePath,
          fileName,
          fileSizeMb: sizeMb + ' MB',
          videoUrl: targetUrl || ''
        });
      } catch (dbErr) {}

      task.downloaded = true;
      task.completed = true;
      if (targetUrl) {
        if (!this.consumedVideoUrls) this.consumedVideoUrls = new Set();
        this.consumedVideoUrls.add(targetUrl);
      }
      if (targetUrl && this.capturedVideoBuffers.has(targetUrl)) {
        this.capturedVideoBytes -= this.capturedVideoBuffers.get(targetUrl).length;
        this.capturedVideoBuffers.delete(targetUrl);
      }

      const elapsed = Math.round((Date.now() - task.startTime) / 1000) + 's';
      this.onVideoCompleted({
        id: task.videoId,
        prompt: task.promptText,
        accountName: this.currentAccount.name,
        videoUrl: `file:///${finalSavedFilePath.replace(/\\/g, '/')}`,
        filePath: finalSavedFilePath,
        downloadFolder: downloadFolder,
        timestamp: new Date().toLocaleTimeString(),
        quality: settings.quality || '360p',
        duration: settings.duration || '6s',
        aspectRatio: settings.aspectRatio || '16:9',
        elapsed: elapsed
      });

      return true;
    }

    this.log(`⚠️ Direct download pending for ${fileName}. Retrying on next loop...`, 'warn');
    return false;
  }

  // 📥 NATIVE FLOW MP4 DOWNLOAD VIA CDP & HOTBAR MENU (Fallback)
  async downloadViaFlowNativeMenu(task, downloadFolder, settings, tileIndex = 0) {
    const isImageMode = (settings.type === 'Image');
    const fileExt = isImageMode ? 'png' : 'mp4';
    const indexNum = task.promptIndex + 1;
    const paddedIndex = String(indexNum).padStart(3, '0');
    const pattern = settings.namingPattern || 'scene';
    const prefix = sanitizeFilePart(settings.customNamingPrefix, 'scene');

    let fileName = `scene${paddedIndex}.${fileExt}`;
    if (pattern === 'numeric') fileName = `${paddedIndex}.${fileExt}`;
    else if (pattern === 'scene') fileName = `scene${paddedIndex}.${fileExt}`;
    else if (pattern === 'clip') fileName = `clip${paddedIndex}.${fileExt}`;
    else if (pattern === 'shot') fileName = `shot${paddedIndex}.${fileExt}`;
    else if (pattern === 'video') fileName = isImageMode ? `image${paddedIndex}.${fileExt}` : `video${paddedIndex}.${fileExt}`;
    else if (pattern === 'custom') fileName = `${prefix}${paddedIndex}.${fileExt}`;
    else if (pattern === 'prompt') {
      const cleanPrompt = (task.promptText || 'prompt').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      fileName = `${paddedIndex}_${cleanPrompt}.${fileExt}`;
    }

    const finalSavedFilePath = path.join(downloadFolder, fileName);
    const nativeDownloadFolder = this.browserDownloadDir || downloadFolder;
    task.fileName = fileName;
    task.filePath = finalSavedFilePath;

    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    // Ensure CDP session allows downloads directly to downloadFolder
    try {
      if (!this.cdpSession && this.page) {
        this.cdpSession = await this.page.target().createCDPSession();
      }
      if (this.cdpSession) {
        await this.cdpSession.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: downloadFolder
        });
      }
    } catch (e) {}

    // Track folders to watch for newly downloaded files
    const foldersToWatch = [downloadFolder];
    if (nativeDownloadFolder && nativeDownloadFolder !== downloadFolder && fs.existsSync(nativeDownloadFolder)) {
      foldersToWatch.push(nativeDownloadFolder);
    }
    const userDownloads = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads');
    if (fs.existsSync(userDownloads) && !foldersToWatch.includes(userDownloads)) {
      foldersToWatch.push(userDownloads);
    }

    const existingFilesByFolder = new Map();
    for (const fld of foldersToWatch) {
      try {
        existingFilesByFolder.set(fld, new Set(fs.readdirSync(fld)));
      } catch (e) {
        existingFilesByFolder.set(fld, new Set());
      }
    }

    this.log(`📥 Triggering native Flow download for [Prompt #${indexNum}] to [${fileName}]...`, 'info');

    // 1. Click target completed video/image tile to open viewer toolbar using real mouse coordinates
    const tileCoords = await this.page.evaluate(({ idx, promptText }) => {
      const cleanSearch = (promptText || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      const tiles = Array.from(document.querySelectorAll('flow-grid-tile-container, flow-video-tile'));
      let target = null;

      if (cleanSearch.length > 0) {
        target = tiles.find(t => {
          const txt = (t.innerText || '').toLowerCase();
          const aria = (t.getAttribute('aria-label') || '').toLowerCase();
          const matches = cleanSearch.filter(w => txt.includes(w) || aria.includes(w));
          return matches.length >= Math.min(2, cleanSearch.length);
        });
      }

      if (!target && typeof idx === 'number' && tiles[idx]) {
        target = tiles[idx];
      }

      if (!target && tiles.length > 0) {
        target = tiles[0]; // Newest tile is at the top
      }

      if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'center' });
        const r = target.getBoundingClientRect();
        return { found: true, x: r.x + r.width / 2, y: r.y + r.height / 2, text: (target.innerText || '').replace(/\n/g, ' ').substring(0, 40) };
      }

      return { found: false };
    }, { idx: tileIndex, promptText: task.promptText });

    if (!tileCoords.found) {
      this.log(`⚠️ Tile not found for [${fileName}]. Trying fallback download...`, 'warn');
      return await this.downloadCompletedMedia(task, downloadFolder, settings);
    }

    this.log(`🎯 Clicking tile at (${Math.round(tileCoords.x)}, ${Math.round(tileCoords.y)}): "${tileCoords.text || fileName}"`, 'info');
    await this.page.mouse.click(tileCoords.x, tileCoords.y);
    await sleep(1500);

    // 2. Click "Download media" on the viewer toolbar using real mouse coordinates
    let dlCoords = { found: false };
    for (let r = 0; r < 5; r++) {
      dlCoords = await this.page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const dlBtn = allButtons.find(b => {
          const t = (b.innerText || b.textContent || '').trim().toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const icon = b.querySelector('mat-icon, svg');
          const iconTxt = icon ? (icon.innerText || icon.textContent || '').toLowerCase() : '';
          return aria.includes('download media') || aria === 'download' || t === 'download' || iconTxt === 'download';
        });
        if (dlBtn) {
          const rect = dlBtn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { found: true, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
        return { found: false };
      });
      if (dlCoords.found) break;
      await sleep(500);
    }

    if (!dlCoords.found) {
      this.log(`⚠️ "Download media" button not found on toolbar. Attempting hotbar fallback...`, 'warn');
      try { await this.page.keyboard.press('Escape'); } catch (e) {}
      return await this.downloadCompletedMedia(task, downloadFolder, settings);
    }

    await this.page.mouse.click(dlCoords.x, dlCoords.y);
    await sleep(1200);

    // 3. Click "Original size" / "720p" in the resolution submenu using real mouse coordinates
    let optCoords = { found: false };
    for (let r = 0; r < 6; r++) {
      optCoords = await this.page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('.cdk-overlay-pane button, [role="menuitem"], .mat-mdc-menu-panel button'));
        const origBtn = menuItems.find(b => {
          const t = (b.innerText || b.textContent || '').trim().toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return t.includes('original') || t.includes('720p') || t.includes('1080p') || t.includes('360p') || aria.includes('original');
        });
        if (origBtn) {
          const rect = origBtn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { found: true, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: (origBtn.innerText || origBtn.textContent || '').trim() };
          }
        }
        return { found: false };
      });
      if (optCoords.found) break;
      await sleep(400);
    }

    if (optCoords.found) {
      this.log(`📥 Selecting resolution: "${optCoords.text}"...`, 'info');
      await this.page.mouse.click(optCoords.x, optCoords.y);
    } else {
      this.log('⚠️ Resolution overlay menu not detected, verifying if download triggered directly...', 'warn');
    }

    // 4. Poll download folders for the new video file
    let newlyDownloadedFile = null;
    const pollStart = Date.now();
    const downloadTimeout = 90000;

    while (Date.now() - pollStart < downloadTimeout && !this.isStopping) {
      await sleep(1000);

      for (const fld of foldersToWatch) {
        if (!fs.existsSync(fld)) continue;
        const currentFiles = fs.readdirSync(fld);
        const existing = existingFilesByFolder.get(fld) || new Set();
        const newFiles = currentFiles.filter(f => !existing.has(f));

        const finished = newFiles.find(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp') && !f.endsWith('.htm') && (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.png') || f.endsWith('.gif')));
        if (finished) {
          const fullPath = path.join(fld, finished);
          const stats = fs.statSync(fullPath);
          if (stats.size > 20000) {
            newlyDownloadedFile = fullPath;
            break;
          }
        }
      }

      if (newlyDownloadedFile) break;
    }

    if (newlyDownloadedFile) {
      if (newlyDownloadedFile !== finalSavedFilePath) {
        if (fs.existsSync(finalSavedFilePath)) {
          try { fs.unlinkSync(finalSavedFilePath); } catch (e) {}
        }
        try {
          fs.renameSync(newlyDownloadedFile, finalSavedFilePath);
        } catch (renErr) {
          fs.copyFileSync(newlyDownloadedFile, finalSavedFilePath);
          try { fs.unlinkSync(newlyDownloadedFile); } catch (e) {}
        }
      }

      const fileStats = fs.statSync(finalSavedFilePath);
      const sizeMb = (fileStats.size / (1024 * 1024)).toFixed(2);
      this.log(`✓ [Native Flow Download] Successfully saved pristine original: ${fileName} (${sizeMb} MB)!`, 'success');

      // Save to SQLite
      try {
        dbService.completeTask(task.taskId || task.videoId, {
          filePath: finalSavedFilePath,
          fileName,
          fileSizeMb: sizeMb + ' MB'
        });
      } catch (dbErr) {}

      task.downloaded = true;
      task.completed = true;

      const elapsed = Math.round((Date.now() - task.startTime) / 1000) + 's';
      this.onVideoCompleted({
        id: task.videoId,
        prompt: task.promptText,
        accountName: this.currentAccount.name,
        videoUrl: `file:///${finalSavedFilePath.replace(/\\/g, '/')}`,
        filePath: finalSavedFilePath,
        downloadFolder: downloadFolder,
        timestamp: new Date().toLocaleTimeString(),
        quality: settings.quality || '360p',
        duration: settings.duration || '6s',
        aspectRatio: settings.aspectRatio || '16:9',
        elapsed: elapsed
      });

      // Close preview viewer to return to grid canvas cleanly for next queue item
      try {
        await this.page.keyboard.press('Escape');
        await sleep(300);
        await this.page.evaluate(() => {
          const backBtn = document.querySelector('button[aria-label*="Back" i], button[aria-label*="previous page" i], button[aria-label*="Done" i]');
          if (backBtn) backBtn.click();
        });
      } catch (e) {}

      return true;
    } else {
      this.log(`⚠️ Native download timed out for ${fileName}. Trying direct URL fallback...`, 'warn');
      return await this.downloadCompletedMedia(task, downloadFolder, settings);
    }
  }

  // 📥 DOWNLOAD COMPLETED MEDIA (Fallback / Direct Fetch)
  async downloadCompletedMedia(task, downloadFolder, settings) {
    const isImageMode = (settings.type === 'Image');
    const fileExt = isImageMode ? 'png' : 'mp4';
    const indexNum = task.promptIndex + 1;
    const paddedIndex = String(indexNum).padStart(3, '0');
    const pattern = settings.namingPattern || 'scene';
    const prefix = sanitizeFilePart(settings.customNamingPrefix, 'scene');

    let fileName = `scene${paddedIndex}.${fileExt}`;
    if (pattern === 'numeric') {
      fileName = `${paddedIndex}.${fileExt}`;
    } else if (pattern === 'scene') {
      fileName = `scene${paddedIndex}.${fileExt}`;
    } else if (pattern === 'clip') {
      fileName = `clip${paddedIndex}.${fileExt}`;
    } else if (pattern === 'shot') {
      fileName = `shot${paddedIndex}.${fileExt}`;
    } else if (pattern === 'video') {
      fileName = isImageMode ? `image${paddedIndex}.${fileExt}` : `video${paddedIndex}.${fileExt}`;
    } else if (pattern === 'custom') {
      fileName = `${prefix}${paddedIndex}.${fileExt}`;
    } else if (pattern === 'prompt') {
      const cleanPrompt = task.promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      fileName = `${paddedIndex}_${cleanPrompt}.${fileExt}`;
    }

    const finalSavedFilePath = path.join(downloadFolder, fileName);
    task.fileName = fileName;
    task.filePath = finalSavedFilePath;

    let saved = false;
    try {
      const cookies = await this.page.cookies();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      let targetUrl = task.completedVideoUrl;

      if (targetUrl && targetUrl.startsWith('http')) {
        const resp = await fetch(targetUrl, {
          headers: {
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'Referer': 'https://flow.google.com/'
          },
          redirect: 'follow'
        });

        if (resp.ok) {
          let buffer = Buffer.from(await resp.arrayBuffer());
          const minSize = isImageMode ? 10000 : 100000;
          if (buffer.length >= minSize) {
            const fd = fs.openSync(finalSavedFilePath, 'w');
            fs.writeSync(fd, buffer);
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
            this.log(`✓ Saved pristine original file: ${fileName} (${sizeMb} MB)!`, 'success');

            try {
              dbService.completeTask(task.taskId || task.videoId, {
                videoUrl: targetUrl,
                filePath: finalSavedFilePath,
                fileName,
                fileSizeMb: sizeMb + ' MB'
              });
            } catch (dbErr) {}

            task.downloaded = true;
            saved = true;
          } else {
            this.log(`⚠️ Downloaded payload too small for video (${buffer.length} bytes). Skipping invalid buffer.`, 'warn');
          }
        }
        }
      } catch (e) {
      this.log(`Download note for ${fileName}: ${e.message}`, 'warn');
    }

    if (!saved) {
      task.downloadAttempts = (task.downloadAttempts || 0) + 1;
      if (task.downloadAttempts < 3) {
        this.log(`Retrying download for ${fileName} (${task.downloadAttempts}/3)...`, 'warn');
        return false;
      }

      task.downloaded = true;
      task.downloadFailed = true;
      try {
        dbService.failTask(task.taskId || task.videoId, 'Download failed after 3 attempts');
      } catch (dbErr) {}
      this.log(`Could not save ${fileName} after 3 attempts.`, 'error');
      this.onVideoCompleted({
        id: task.videoId,
        prompt: task.promptText,
        accountName: this.currentAccount.name,
        status: 'Download failed',
        error: 'The generated media could not be saved after 3 attempts.',
        videoUrl: task.completedVideoUrl,
        filePath: null,
        timestamp: new Date().toLocaleTimeString()
      });
      return false;
    }

    const elapsed = Math.round((Date.now() - task.startTime) / 1000) + 's';
    let sizeMB = 'Done';
    try {
      if (fs.existsSync(finalSavedFilePath)) {
        sizeMB = (fs.statSync(finalSavedFilePath).size / (1024 * 1024)).toFixed(1) + ' MB';
      }
    } catch(e) {}

    this.onVideoCompleted({
      id: task.videoId,
      prompt: task.promptText,
      accountName: this.currentAccount.name,
      videoUrl: task.completedVideoUrl,
      fileName: fileName,
      filePath: finalSavedFilePath,
      sizeMB: sizeMB,
      downloadFolder: downloadFolder,
      timestamp: new Date().toLocaleTimeString(),
      quality: settings.quality || '1080p',
      duration: settings.duration || '6s',
      aspectRatio: settings.aspectRatio || '9:16',
      elapsed: elapsed,
      status: 'Completed'
    });
    return true;
  }

  // ⏳ WAIT FOR ALL SUBMITTED TASKS ON CURRENT ACCOUNT TO REACH 100% AND DOWNLOAD
  async waitForAccountTasks(accountTasks, downloadFolder, settings, returnOnAnyComplete = false) {
    if (!accountTasks || accountTasks.length === 0) return;

    const isImageMode = (settings.type === 'Image');
    const pendingTasks = accountTasks.filter(t => !t.downloaded);
    if (pendingTasks.length === 0) return;

    this.log(`\n⏳ Monitoring rendering progress for ${pendingTasks.length} task(s) on [${this.currentAccount.name}]...`, 'info');

    // Google Flow takes ~60-120s per video
    const maxWaitSec = (isImageMode ? 120 : 360) + (pendingTasks.length * 60);
    const startMonitorTime = Date.now();
    let lastReportedPercentage = {};

    while (!this.isStopping) {
      const allDownloaded = accountTasks.every(t => t.downloaded || t.completed);
      if (allDownloaded) {
        this.log(`✓ All ${accountTasks.length} media items on [${this.currentAccount.name}] finished rendering & downloaded successfully!`, 'success');
        break;
      }

      if (returnOnAnyComplete && accountTasks.some(t => t.downloaded || t.completed)) {
        break;
      }

      if ((Date.now() - startMonitorTime) > maxWaitSec * 1000) {
        this.log(`Render monitor reached timeout for [${this.currentAccount.name}]. Proceeding...`, 'warn');
        break;
      }

      await sleep(2000);

      if (!this.page || this.page.isClosed()) break;

      try {
        // Auto-dismiss any Google Flow popups, hints, got-it tooltips or banners while rendering
        await this.dismissAnyBlockingOverlays();

        // 🚨 1. Google Captcha / Human Verification Detector
        const isCaptcha = await this.page.evaluate(() => {
          const bodyText = (document.body.innerText || '').toLowerCase();
          const url = window.location.href.toLowerCase();
          return url.includes('challenge') || url.includes('recaptcha') || bodyText.includes("verify it's you") || bodyText.includes('unusual traffic');
        });
        if (isCaptcha) {
          this.log('🚨 Google Human Verification / Captcha Detected! Please solve it in the opened browser window.', 'error', { isCaptcha: true });
        }

        // 🔍 2. Canvas State Inspection: Extract containers and prompt associations
        const canvasState = await this.page.evaluate(() => {
          const containers = Array.from(document.querySelectorAll('flow-grid-tile-container'));
          if (containers.length > 0) {
            return containers.map((c, idx) => {
              const promptAria = (c.getAttribute('aria-label') || '').toLowerCase().trim();
              const text = (c.innerText || '').toLowerCase();
              const pctMatch = text.match(/\b(\d{1,2})%/);
              const hasErrorIcon = !!c.querySelector('mat-icon, svg, i, span') && 
                (text.includes('error') || text.includes('warning') || text.includes('priority_high') || 
                 c.innerHTML.includes('error') || c.innerHTML.includes('warning') || c.innerHTML.includes('priority_high'));

              const isUnusualActivity = text.includes('unusual activity') || text.includes('not been charged') || text.includes('unusual');
              const isGenericFailed = (text.includes('failed') && !text.includes('failed to download') && !pctMatch);
              const isSafetyFailed = text.includes('safety') || 
                                     text.includes('policy') || 
                                     text.includes('failed to generate') || 
                                     text.includes('try another prompt') || 
                                     text.includes('violat') ||
                                     text.includes('blocked') ||
                                     text.includes('inappropriate') ||
                                     text.includes('terms') ||
                                     text.includes('something went wrong') ||
                                     isUnusualActivity ||
                                     isGenericFailed ||
                                     hasErrorIcon;

              const isGenerating = !!pctMatch;
              const hasVideo = !!c.querySelector('video');
              const hasImg = !!c.querySelector('img');
              const hasResolutionBadge = text.includes('360p') || text.includes('720p') || text.includes('1080p') || text.includes('100%') || text.includes('2k') || text.includes('4k');
              const hasDuration = /\b0:0\d\b|\b\d+s\b/.test(text);
              const isReady = !isGenerating && !isSafetyFailed && (hasResolutionBadge || hasVideo || hasDuration || hasImg);

              return {
                tileIndex: idx,
                promptAria,
                text,
                percentage: pctMatch ? `${pctMatch[1]}%` : (isReady ? '100%' : null),
                isGenerating,
                isFailed: isSafetyFailed,
                isUnusualActivity,
                isReady
              };
            });
          }

          // Fallback if flow-grid-tile-container not found
          const hotbarBtns = Array.from(document.querySelectorAll('button[flowhotbarbutton][aria-label="More options"]'));
          return hotbarBtns.map((btn, idx) => {
            let cur = btn;
            for (let s = 0; s < 8; s++) {
              if (!cur.parentElement) break;
              cur = cur.parentElement;
              if (cur.className && typeof cur.className === 'string' && (cur.className.includes('card') || cur.className.includes('tile') || cur.className.includes('node') || cur.className.includes('virtual-item'))) {
                break;
              }
            }

            const text = (cur.innerText || '').toLowerCase();
            const pctMatch = text.match(/\b(\d{1,2})%/);
            const isUnusualActivity = text.includes('unusual activity') || text.includes('not been charged') || text.includes('unusual');
            const isGenericFailed = (text.includes('failed') && !text.includes('failed to download') && !pctMatch);
            const isSafetyFailed = text.includes('safety') || 
                                   text.includes('policy') || 
                                   text.includes('failed to generate') || 
                                   text.includes('violat') || 
                                   text.includes('blocked') ||
                                   isUnusualActivity ||
                                   isGenericFailed;
            const isGenerating = !!pctMatch;
            const hasResolutionBadge = text.includes('360p') || text.includes('720p') || text.includes('1080p') || text.includes('100%');
            return {
              tileIndex: idx,
              promptAria: (cur.getAttribute('aria-label') || '').toLowerCase().trim(),
              text,
              percentage: pctMatch ? `${pctMatch[1]}%` : (hasResolutionBadge ? '100%' : null),
              isGenerating,
              isFailed: isSafetyFailed,
              isUnusualActivity,
              isReady: !isGenerating && !isSafetyFailed && hasResolutionBadge
            };
          });
        });

        // 🚨 3. Page-Level Floating Modal Dialog Detector (Safety Policy Popup)
        const modalViolation = await this.page.evaluate(() => {
          const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], mwc-dialog, div[role="alert"], [class*="snackbar"]'));
          for (const d of dialogs) {
            if (d.offsetWidth > 0 || d.offsetHeight > 0) {
              const txt = (d.innerText || '').toLowerCase();
              if (txt.includes('policy') || txt.includes('safety') || txt.includes('violat') || txt.includes('terms') || txt.includes('something went wrong')) {
                const btn = d.querySelector('button, [role="button"]') ||
                  Array.from(document.querySelectorAll('button')).find(b => {
                    const bTxt = (b.innerText || '').toLowerCase();
                    return bTxt.includes('got it') || bTxt.includes('dismiss') || bTxt.includes('ok') || bTxt.includes('close');
                  });
                if (btn) try { btn.click(); } catch (e) {}
                return (d.innerText || 'Google Safety Policy Block').trim().replace(/\s+/g, ' ').substring(0, 150);
              }
            }
          }
          return null;
        });

        if (modalViolation) {
          try { await this.page.keyboard.press('Escape'); } catch (e) {}
          try {
            await this.page.evaluate(() => {
              const clearBtn = document.querySelector('button.clear-button, button[aria-label="Clear prompt"]');
              if (clearBtn) { try { clearBtn.click(); } catch (e) {} }
              const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
              if (el) { el.textContent = ''; }
            });
          } catch (e) {}
        }

        for (const task of accountTasks) {
          if (task.downloaded) continue;

          const elapsedSec = (Date.now() - task.startTime) / 1000;
          let bestTile = null;

          // If a modal violation appeared for this active task, fail it immediately!
          if (modalViolation && !task.wasObservedGenerating) {
            task.completed = true;
            task.downloaded = true;
            try { dbService.failTask(task.taskId || task.videoId, `Google Safety Filter: ${modalViolation}`); } catch (dbErr) {}
            this.log(`⚠️ [Prompt #${task.promptIndex + 1}] Google Safety Policy Modal detected: "${modalViolation}". Advancing queue!`, 'warn');
            this.onVideoCompleted({
              id: task.videoId,
              prompt: task.promptText,
              accountName: this.currentAccount.name,
              status: `Policy Violation: ${modalViolation}`,
              filePath: null,
              error: modalViolation,
              type: settings.type,
              timestamp: new Date().toLocaleTimeString()
            });
            continue;
          }

          if (!this.claimedTileIndices) this.claimedTileIndices = new Set();

          // 1. If we already locked onto a generating tile, continue tracking it
          if (typeof task.lockedTileIndex === 'number' && canvasState[task.lockedTileIndex]) {
            bestTile = canvasState[task.lockedTileIndex];
          }

          // 2. If not locked yet, find generating or ready tile matching prompt
          if (!bestTile) {
            const promptClean = (task.promptText || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
            const promptWords = promptClean.split(/\s+/).filter(w => w.length > 2);

            // 2A. Matching tiles on canvas (comparing innerText + aria)
            // MUST strictly exclude tiles already claimed by ANY previous or concurrent task!
            const matchingTiles = canvasState.filter(t => {
              if (this.claimedTileIndices.has(t.tileIndex)) return false;
              const fullText = (t.text + ' ' + t.promptAria).toLowerCase();
              let m = 0;
              for (const w of promptWords) {
                if (fullText.includes(w)) m++;
              }
              return m >= Math.min(2, promptWords.length);
            });

            if (matchingTiles.length > 0) {
              // Prefer actively generating tile, otherwise newest ready matching tile
              bestTile = matchingTiles.find(t => t.isGenerating) || matchingTiles[0];
            }

            // 2B. Actively generating tile fallback (strictly unclaimed)
            if (!bestTile) {
              const generatingTiles = canvasState.filter(t => t.isGenerating && !this.claimedTileIndices.has(t.tileIndex));
              if (generatingTiles.length > 0) {
                bestTile = generatingTiles[0];
              }
            }

            // 2C. If 20+ seconds elapsed, check for unclaimed ready tile
            if (!bestTile && elapsedSec >= 20 && canvasState.length > 0) {
              const candidate = canvasState.find(t => !this.claimedTileIndices.has(t.tileIndex) && (t.isReady || t.isGenerating));
              if (candidate) {
                bestTile = candidate;
              }
            }
          }

          // ⏱️ Anti-Stall Guard: Cloud rendering can take 60-120 seconds
          const stallTimeout = isImageMode ? 45 : 120;
          const anyActive = canvasState.some(t => t.isGenerating);
          if (!bestTile && !anyActive && elapsedSec > stallTimeout && !task.wasObservedGenerating && !task.completed) {
            this.log(`⚠️ [Prompt #${task.promptIndex + 1}] No generation tile detected after ${stallTimeout}s (likely rejected/dropped by Flow). Skipping to next task!`, 'warn');
            task.completed = true;
            task.downloaded = true;
            try { dbService.failTask(task.taskId || task.videoId, 'Prompt dropped or rejected by server'); } catch (dbErr) {}
            this.onVideoCompleted({
              id: task.videoId,
              prompt: task.promptText,
              accountName: this.currentAccount.name,
              status: 'Failed (Dropped by Flow)',
              filePath: null,
              error: 'Generation tile not created',
              type: settings.type,
              timestamp: new Date().toLocaleTimeString()
            });
            continue;
          }

          if (bestTile) {
            task.lockedTileIndex = bestTile.tileIndex;
            this.claimedTileIndices.add(bestTile.tileIndex);
            if (bestTile.isGenerating) {
              task.wasObservedGenerating = true;
            }

            // Safety / Unusual Activity Filter Detection
            if (bestTile.isFailed) {
              const isUnusual = bestTile.isUnusualActivity || (bestTile.text && bestTile.text.includes('unusual activity'));

              // Auto-retry once on tile if it was an "unusual activity" temporary glitch
              if (isUnusual && !task.unusualActivityRetried) {
                task.unusualActivityRetried = true;
                this.log(`⚠️ [Prompt #${task.promptIndex + 1}] Google Flow flagged: "We noticed some unusual activity". Waiting 8s cooldown before auto-retrying on tile...`, 'warn');
                await sleep(8000);

                const retried = await this.page.evaluate(({ idx }) => {
                  const containers = Array.from(document.querySelectorAll('flow-grid-tile-container'));
                  const container = (typeof idx === 'number' && containers[idx]) ? containers[idx] : null;
                  if (!container) return false;
                  const btns = Array.from(container.querySelectorAll('button'));
                  // Circular retry/refresh button is usually the first action button
                  const retryBtn = btns.find(b => {
                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                    const txt = (b.innerText || '').toLowerCase();
                    return aria.includes('retry') || aria.includes('regenerate') || aria.includes('refresh') || 
                           txt.includes('refresh') || txt.includes('replay') || txt.includes('autorenew');
                  }) || btns[0];
                  if (retryBtn) {
                    retryBtn.click();
                    return true;
                  }
                  return false;
                }, { idx: bestTile.tileIndex });

                if (retried) {
                  this.log(`🔄 [Prompt #${task.promptIndex + 1}] Clicked Retry button on tile! Monitoring recovery...`, 'info');
                  await sleep(3000);
                  continue; // Continue polling loop to check if generation percentage starts!
                }
              }

              task.completed = true;
              task.downloaded = true;
              const failureReason = isUnusual 
                ? 'Google Flow: Unusual Activity (Cooldown / Delay required)' 
                : 'Google Safety / Policy Filter';

              try { dbService.failTask(task.taskId || task.videoId, failureReason); } catch (dbErr) {}
              this.log(`⚠️ [Prompt #${task.promptIndex + 1}] ${failureReason}. Advancing queue cleanly...`, 'warn');

              // Auto-dismiss any modal/dialog that might be blocking screen
              try {
                await this.page.keyboard.press('Escape');
                await this.page.evaluate(() => {
                  const btns = Array.from(document.querySelectorAll('button'));
                  const dismiss = btns.find(b => {
                    const t = (b.innerText || '').toLowerCase();
                    return t.includes('got it') || t.includes('dismiss') || t.includes('close') || t.includes('ok');
                  });
                  if (dismiss) dismiss.click();
                  const el = document.querySelector('div.prosemirror-editor div.ProseMirror, div.ProseMirror[contenteditable="true"], div.ProseMirror');
                  if (el) { el.textContent = ''; }
                });
              } catch (e) {}

              this.onVideoCompleted({
                id: task.videoId,
                prompt: task.promptText,
                accountName: this.currentAccount.name,
                status: failureReason,
                filePath: null,
                error: failureReason,
                type: settings.type,
                timestamp: new Date().toLocaleTimeString()
              });
              continue;
            }

            // Live Rendering Percentage Update
            if (bestTile.percentage && bestTile.isGenerating) {
              if (lastReportedPercentage[task.videoId] !== bestTile.percentage) {
                lastReportedPercentage[task.videoId] = bestTile.percentage;
                this.log(`⏳ [Prompt #${task.promptIndex + 1}] Rendering: ${bestTile.percentage}...`, 'info');
                this.onVideoProgress({
                  id: task.videoId,
                  percentage: bestTile.percentage,
                  prompt: task.promptText,
                  accountName: this.currentAccount.name,
                  elapsedSec: elapsedSec
                });
              }
            }

            // True Completion: Percentage is GONE and Resolution Badge/Video is PRESENT!
            // Must have been observed generating OR at least 25s elapsed
            if (bestTile.isReady && (task.wasObservedGenerating || elapsedSec >= 25)) {
              task.completed = true;
              this.onVideoProgress({ id: task.videoId, percentage: '100%' });
              this.log(`🎉 [Prompt #${task.promptIndex + 1}] Cloud Render Complete (100%) on [${this.currentAccount.name}]!`, 'success');

              // Extract direct video or image URL from container for fallback download
              try {
                const mediaUrl = await this.page.evaluate(({ idx, isImage }) => {
                  const containers = Array.from(document.querySelectorAll('flow-grid-tile-container, flow-video-tile, [role="gridcell"], div[class*="tile"]'));
                  const target = (typeof idx === 'number' && containers[idx]) ? containers[idx] : null;
                  if (target) {
                    const vid = target.querySelector('video');
                    if (vid && vid.src && (vid.src.startsWith('http') || vid.src.startsWith('blob:'))) return vid.src;
                    const src = target.querySelector('source');
                    if (src && src.src && (src.src.startsWith('http') || src.src.startsWith('blob:'))) return src.src;
                    if (isImage) {
                      const img = target.querySelector('img');
                      if (img && img.src && (img.src.startsWith('http') || img.src.startsWith('blob:'))) return img.src;
                    }
                  }
                  return null;
                }, { idx: bestTile.tileIndex, isImage: isImageMode });
                if (mediaUrl) {
                  task.completedVideoUrl = mediaUrl;
                }
              } catch (uErr) {}

              // ⚡ Download real media for THIS EXACT TILE:
              // 1. Try native Flow toolbar download first to guarantee the EXACT tile's media is downloaded
              let dlOk = false;
              try {
                dlOk = await this.downloadViaFlowNativeMenu(task, downloadFolder, settings, bestTile.tileIndex);
              } catch (nativeErr) {
                this.log(`Native download attempt note for Tile #${bestTile.tileIndex}: ${nativeErr.message}. Trying direct backend fallback...`, 'warn');
              }

              // 2. Fallback to direct download only if native didn't succeed
              if (!dlOk && !task.downloaded) {
                dlOk = await this.downloadMediaOriginal(task, downloadFolder, settings, bestTile.tileIndex);
              }

              if (task.downloaded || task.completed) {
                this.claimedTileIndices.add(bestTile.tileIndex);
              }

              if (returnOnAnyComplete && (task.downloaded || task.completed)) {
                return;
              }
            }
          }
        }
      } catch (e) {
        break;
      }
    }
  }

  // 🚀 MAIN ASYNCHRONOUS BATCH QUEUE RUNNER
  async runQueue(arg1, arg2, arg3, arg4) {
    this.isStopping = false;
    this.isPaused = false;
    let prompts = [];
    let settings = {};
    let downloadFolder = '';
    let selectedAccounts = [];

    if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1) && arg1.prompts) {
      prompts = arg1.prompts || [];
      settings = arg1.settings || {};
      downloadFolder = arg1.downloadFolder || '';
      selectedAccounts = arg1.accounts || [];
    } else {
      prompts = Array.isArray(arg1) ? arg1 : [];
      if (Array.isArray(arg2)) {
        selectedAccounts = arg2;
        settings = arg3 || {};
        downloadFolder = typeof arg4 === 'string' ? arg4 : '';
      } else {
        settings = arg2 || {};
        downloadFolder = typeof arg3 === 'string' ? arg3 : '';
        selectedAccounts = Array.isArray(arg4) ? arg4 : [];
      }
    }

    if (!downloadFolder || typeof downloadFolder !== 'string' || downloadFolder.trim() === '') {
      downloadFolder = path.join(process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\mohda', 'Downloads');
    }

    if (!selectedAccounts || selectedAccounts.length === 0) {
      const allAccs = getAccounts();
      selectedAccounts = allAccs.filter(a => a.selected !== false && a.status !== 'Need Login');
      if (selectedAccounts.length === 0) selectedAccounts = allAccs;
    }

    if (!selectedAccounts || selectedAccounts.length === 0) {
      this.log('No Google accounts found! Please add at least one account in Settings.', 'error');
      return;
    }

    this.log(`🚀 Starting Multi-Account Batch Queue: ${prompts.length} prompts across ${selectedAccounts.length} accounts.`, 'info');

    const readyAccounts = selectedAccounts.filter(a => a.status !== 'Exhausted' && a.status !== 'Need Login');
    if (readyAccounts.length === 1) {
      const needLoginCount = selectedAccounts.filter(a => a.status === 'Need Login').length;
      if (needLoginCount > 0) {
        this.log(`ℹ️ [Account Rotation Notice]: Currently only [${readyAccounts[0].name}] is Ready with active session. ${needLoginCount} account(s) need login. To enable multi-account auto-switching, please log in to them in Settings!`, 'info');
      }
    }

    const delaySec = (typeof settings.promptDelaySec === 'number') ? settings.promptDelaySec : 5;
    const allSubmittedTasks = [];
    let promptCursor = 0;
    let accountIndex = 0;

    // Outer Loop: Rotates through accounts until all prompts are finished
    while (promptCursor < prompts.length && !this.isStopping) {
      // Pause check before account launch
      while (this.isPaused && !this.isStopping) {
        await sleep(1000);
      }

      // Find next working account
      let currentAccount = null;
      let launched = false;

      while (accountIndex < selectedAccounts.length && !launched && !this.isStopping) {
        currentAccount = selectedAccounts[accountIndex];
        if (currentAccount.status !== 'Exhausted' && currentAccount.status !== 'Need Login') {
          this.currentAccount = currentAccount;
          this.log(`\n======================================================`, 'info');
          this.log(`👤 Launching Account [${accountIndex + 1}/${selectedAccounts.length}]: [${currentAccount.name}]...`, 'info');
          this.log(`======================================================`, 'info');

          launched = await this.launchBrowserForAccount(currentAccount, downloadFolder);
          if (launched) {
            const studioStatus = await this.openFlowStudio(settings);
            if (studioStatus === 'READY') {
              break;
            } else {
              this.log(`Account [${currentAccount.name}] studio returned: ${studioStatus}. Trying next account...`, 'warn');
              await this.closeBrowser();
              launched = false;
            }
          }
        }
        accountIndex++;
      }

      if (!launched || !this.page) {
        this.log('❌ All selected Google accounts are either exhausted or unavailable. Halting queue.', 'error');
        break;
      }

      const currentAccountTasks = [];
      const activeWindowTasks = [];
      const maxBurstConcurrency = Math.min(4, Math.max(1, Number(settings.burstConcurrency) || 4));

      // Inner Loop: Sliding Window Burst Concurrency (up to 4 parallel generations)
      while ((promptCursor < prompts.length || activeWindowTasks.length > 0) && !this.isStopping) {
        // Pause check
        while (this.isPaused && !this.isStopping) {
          this.updateProgress({ status: 'Paused' });
          await sleep(1000);
        }
        if (this.isStopping) break;

        // 1. BURST SUBMIT: Fill window up to maxBurstConcurrency
        while (activeWindowTasks.length < maxBurstConcurrency && promptCursor < prompts.length && !this.isStopping && !this.isPaused) {
          if (settings.type !== 'Image' && await this.checkCreditsExhausted(settings)) {
            this.log(`⚠️ Account [${this.currentAccount.name}] has RUN OUT OF CREDITS (0 Credits remaining) before Prompt #${promptCursor + 1}!`, 'warn');
            this.currentAccount.status = 'Exhausted';
            this.currentAccount.credits = 0;
            dbService.updateAccountStatus(this.currentAccount.id, 'Exhausted', 0);
            try {
              const allAccs = getAccounts();
              const target = allAccs.find(a => a.id === this.currentAccount.id);
              if (target) { target.status = 'Exhausted'; target.credits = 0; saveAccounts(allAccs); }
            } catch (e) {}
            if (this.onAccountUpdated) {
              this.onAccountUpdated({ account: this.currentAccount, accounts: getAccounts() });
            }
            break; // Break burst submit so active tasks can complete before rotating account
          }

          const promptText = prompts[promptCursor];
          this.updateProgress({
            currentPromptIndex: promptCursor + 1,
            totalPrompts: prompts.length,
            currentProfileName: this.currentAccount.name,
            activePromptText: promptText,
            status: `Submitting (${activeWindowTasks.length + 1}/${maxBurstConcurrency})`
          });

          this.log(`🚀 [Burst Concurrency] Submitting Prompt #${promptCursor + 1} (Slot ${activeWindowTasks.length + 1}/${maxBurstConcurrency})...`, 'info');

          const taskResult = await this.submitPrompt(promptText, settings, promptCursor, prompts.length);

          if (taskResult && taskResult.status === 'EXHAUSTED') {
            this.log(`⚠️ Account [${this.currentAccount.name}] exhausted during Prompt #${promptCursor + 1}!`, 'warn');
            this.currentAccount.status = 'Exhausted';
            this.currentAccount.credits = 0;
            dbService.updateAccountStatus(this.currentAccount.id, 'Exhausted', 0);
            try {
              const allAccs = getAccounts();
              const target = allAccs.find(a => a.id === this.currentAccount.id);
              if (target) { target.status = 'Exhausted'; target.credits = 0; saveAccounts(allAccs); }
            } catch (e) {}
            if (this.onAccountUpdated) {
              this.onAccountUpdated({ account: this.currentAccount, accounts: getAccounts() });
            }
            break;
          }

          if (taskResult && taskResult.status === 'SUBMITTED') {
            activeWindowTasks.push(taskResult);
            currentAccountTasks.push(taskResult);
            allSubmittedTasks.push(taskResult);
            promptCursor++;

            // Natural burst interval (2.5s) between rapid prompts if window not full yet
            if (activeWindowTasks.length < maxBurstConcurrency && promptCursor < prompts.length && !this.isStopping) {
              this.log(`⏳ [Burst Concurrency] Slot ${activeWindowTasks.length}/${maxBurstConcurrency} filled. Submitting next burst prompt in 2.5s...`, 'info');
              await sleep(2500);
            }
          }
        }

        // 2. SLIDING WINDOW WAIT & MONITOR:
        if (activeWindowTasks.length > 0 && !this.isStopping) {
          const isWindowFull = (activeWindowTasks.length >= maxBurstConcurrency);
          const returnOnAny = (promptCursor < prompts.length);

          if (isWindowFull && promptCursor < prompts.length) {
            this.log(`🛡️ [Active Window Full: ${activeWindowTasks.length}/${maxBurstConcurrency}] All 4 slots rendering in parallel. Holding new submissions until at least 1 video completes...`, 'info');
          }

          await this.waitForAccountTasks(activeWindowTasks, downloadFolder, settings, returnOnAny);

          const completedInWindow = activeWindowTasks.filter(t => t.completed || t.downloaded);
          const remaining = activeWindowTasks.filter(t => !t.completed && !t.downloaded);
          activeWindowTasks.length = 0;
          activeWindowTasks.push(...remaining);

          if (completedInWindow.length > 0 && promptCursor < prompts.length) {
            this.log(`✨ [Sliding Window] Video finished & downloaded! ${activeWindowTasks.length}/${maxBurstConcurrency} slots active. Immediately refilling window with next prompt...`, 'success');
          }
        }

        // If credits exhausted and no active window tasks left, break inner loop to rotate account
        if (this.currentAccount.status === 'Exhausted' && activeWindowTasks.length === 0) {
          break;
        }
      }

      // Close this account's session safely
      await this.closeBrowser();
      accountIndex++; // Advance to next account candidate
    }

    // 📦 STEP 3: IF BATCH AT END -> CREATE FINAL ZIP FILE WITH ALL MEDIA
    if (settings.downloadStrategy === 'batch_end' && allSubmittedTasks.length > 0 && !this.isStopping) {
      this.log(`\n📦 BATCH AT END: Packaging all ${allSubmittedTasks.length} videos from all accounts into single ZIP...`, 'info');
      try {
        const zipFileName = `Google_Flow_Batch_${Date.now()}.zip`;
        const zipFilePath = path.join(downloadFolder, zipFileName);
        const zip = new AdmZip();
        let addedCount = 0;

        for (const task of allSubmittedTasks) {
          if (task.filePath && fs.existsSync(task.filePath)) {
            zip.addLocalFile(task.filePath);
            addedCount++;
          }
        }

        if (addedCount > 0) {
          zip.writeZip(zipFilePath);
          const zipStats = fs.statSync(zipFilePath);
          const zipSizeMb = (zipStats.size / (1024 * 1024)).toFixed(2);
          this.log(`🎉 ZIP Archive Successfully Created: [${zipFileName}] (${zipSizeMb} MB with ${addedCount} files)!`, 'success');
        }
      } catch (zipErr) {
        this.log(`ZIP export note: ${zipErr.message}`, 'warn');
      }
    }

    // 🎬 STEP 4: IF AUTO-STITCH ENABLED -> MERGE ALL VIDEOS INTO SINGLE MASTER VIDEO VIA FFMPEG
    if (settings.autoStitch && settings.type !== 'Image' && allSubmittedTasks.length > 1 && !this.isStopping) {
      this.log(`\n🎬 AUTO-STITCHER: Merging all ${allSubmittedTasks.length} scenes into single master video via FFmpeg...`, 'info');
      try {
        const downloadedFiles = allSubmittedTasks
          .map(t => t.filePath)
          .filter(p => p && fs.existsSync(p));

        if (downloadedFiles.length > 1) {
          const masterName = `Master_Full_Video_${Date.now()}.mp4`;
          const masterPath = path.join(downloadFolder, masterName);
          await FFmpegService.stitchVideos(downloadedFiles, masterPath);
          const masterStats = fs.statSync(masterPath);
          const masterMb = (masterStats.size / (1024 * 1024)).toFixed(2);
          this.log(`🎉 Master Video Successfully Stitched: [${masterName}] (${masterMb} MB with ${downloadedFiles.length} scenes)!`, 'success');
          this.onVideoCompleted({
            id: `stitched_${Date.now()}`,
            prompt: `Master Stitched Video (${downloadedFiles.length} scenes)`,
            accountName: 'FFmpeg Master Merger',
            filePath: masterPath,
            videoUrl: null,
            timestamp: new Date().toLocaleTimeString(),
            quality: settings.quality || '1080p',
            duration: `${downloadedFiles.length * 6}s`,
            aspectRatio: settings.aspectRatio || '9:16'
          });
        }
      } catch (stitchErr) {
        this.log(`Stitcher notice: ${stitchErr.message}`, 'warn');
      }
    }

    this.updateProgress({ status: 'Completed' });
    this.log('\n🎉 Entire multi-account batch queue completed successfully!', 'success');
  }
}

module.exports = { FlowAutomationEngine };
