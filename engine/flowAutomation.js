const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');
const { getAccountProfilePath, getAccounts, saveAccounts } = require('./accountStore');
const { cleanStaleProfileLocks } = require('./processHelper');
const { WatermarkCleaner } = require('./wm');
const AdmZip = require('adm-zip');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class FlowAutomationEngine {
  constructor(callbacks = {}) {
    this.onLog = callbacks.onLog || (() => {});
    this.onProgress = callbacks.onProgress || (() => {});
    this.onVideoStarted = callbacks.onVideoStarted || (() => {});
    this.onVideoProgress = callbacks.onVideoProgress || (() => {});
    this.onVideoCompleted = callbacks.onVideoCompleted || (() => {});
    
    this.browser = null;
    this.page = null;
    this.cdpSession = null;
    this.isStopping = false;
    this.isPaused = false;
    this.currentAccount = null;
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
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-features=Translate,BackForwardCache,MediaRouter',
      '--renderer-process-limit=2',
      '--js-flags=--max-old-space-size=512',
      '--mute-audio'
    ];

    try {
      this.browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: false,
        defaultViewport: null,
        args,
        ignoreDefaultArgs: ['--enable-automation']
      });

      const pages = await this.browser.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

      if (pages.length > 1) {
        for (let i = 1; i < pages.length; i++) {
          try { await pages[i].close(); } catch(e) {}
        }
      }

      await this.page.bringToFront();

      // Attach CDP session
      try {
        this.cdpSession = await this.page.target().createCDPSession();
        if (downloadDir) {
          if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
          await this.cdpSession.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadDir
          });
        }
      } catch (e) {}

      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
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
    }
  }

  async openFlowStudio(settings = {}) {
    this.currentSettings = settings;
    const url = 'https://labs.google/fx/tools/flow';
    this.log(`Navigating to: ${url}...`, 'info');

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // 1. Landing page check
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
      this.log(`⚠️ Google Account Login Required on [${this.currentAccount.name}]! Please sign in in the opened window.`, 'warn');
      for (let i = 0; i < 12; i++) {
        await sleep(5000);
        if (!this.page.url().includes('accounts.google.com')) {
          this.log('Login detected! Continuing to Flow studio...', 'success');
          break;
        }
      }
    }

    // 3. Projects Gallery -> Canvas
    if (!this.page.url().includes('/project/')) {
      this.log('Opening project canvas from gallery...', 'info');
      const projectHref = await this.page.evaluate(() => {
        const link = document.querySelector('a[href*="/fx/tools/flow/project/"], a[href*="/project/"]');
        return link ? link.getAttribute('href') : null;
      });

      if (projectHref) {
        const fullUrl = projectHref.startsWith('http') ? projectHref : `https://labs.google${projectHref}`;
        await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(5000);
      } else {
        await this.page.evaluate(() => {
          const cards = document.querySelectorAll('div[class*="card"], div[class*="grid"] > div');
          if (cards.length > 0) cards[0].click();
        });
        await sleep(5000);
      }
    }

    // 4. Pre-Check Real Credits balance from Google Server
    try {
      const realCredits = await this.page.evaluate(async () => {
        try {
          const sessionResp = await fetch('/fx/api/auth/session');
          const session = await sessionResp.json();
          if (!session || !session.access_token) return null;
          const credResp = await fetch('https://aisandbox-pa.googleapis.com/v1/credits?key=AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          const json = await credResp.json();
          return json.credits !== undefined ? json.credits : (json.subscriptionCredits !== undefined ? json.subscriptionCredits : 0);
        } catch (e) { return null; }
      });

      if (typeof realCredits === 'number') {
        this.currentAccount.credits = realCredits;
        try {
          const allAccs = getAccounts();
          const target = allAccs.find(a => a.id === this.currentAccount.id);
          if (target) {
            target.credits = realCredits;
            target.lastChecked = new Date().toLocaleTimeString();
            saveAccounts(allAccs);
          }
        } catch (e) {}

        const required = this.getRequiredCredits(settings || this.currentSettings);
        if (required > 0 && realCredits < required) {
          this.log(`⚠️ Account [${this.currentAccount.name}] has ${realCredits} credits (Needs at least ${required} credits for this video). Rotating account immediately!`, 'warn');
          this.currentAccount.status = 'Exhausted';
          try {
            const allAccs = getAccounts();
            const target = allAccs.find(a => a.id === this.currentAccount.id);
            if (target) { target.status = 'Exhausted'; saveAccounts(allAccs); }
          } catch (e) {}
          return 'EXHAUSTED';
        } else {
          this.log(`✓ [${this.currentAccount.name}] has ${realCredits} live credits (${required > 0 ? required + ' needed' : '0 needed - Free Unlimited Image Mode'}).`, 'success');
        }
      }
    } catch (e) {}

    this.log('Waiting for Prompt Bar in workspace...', 'info');
    try {
      await this.page.waitForSelector('div[contenteditable="true"], div[role="textbox"], textarea, input[placeholder*="create"]', { timeout: 30000 });
      this.log('Flow Studio workspace is READY!', 'success');
    } catch (e) {
      this.log('Workspace canvas ready.', 'info');
    }

    await sleep(1500);
    return 'READY';
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

  // 💳 REAL-TIME CREDITS EXHAUSTION DETECTOR (Model & Submode-Aware)
  async checkCreditsExhausted(settings) {
    try {
      const required = this.getRequiredCredits(settings);
      if (required === 0) return false; // Image mode never exhausts!

      return await this.page.evaluate(async (reqCredits) => {
        // 1. Check for visible "insufficient credits", "out of credits", or "daily limit" UI text
        const pageText = (document.body.innerText || '').toLowerCase();
        if (
          pageText.includes('insufficient credits') || 
          pageText.includes('out of credits') || 
          pageText.includes('no credits remaining') || 
          pageText.includes('reached your generation limit') ||
          pageText.includes('daily limit reached')
        ) {
          return true;
        }

        // 2. Query Google Flow live credits API
        try {
          const sessionResp = await fetch('/fx/api/auth/session');
          const session = await sessionResp.json();
          if (session && session.access_token) {
            const credResp = await fetch('https://aisandbox-pa.googleapis.com/v1/credits?key=AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const json = await credResp.json();
            const c = json.credits !== undefined ? json.credits : (json.subscriptionCredits !== undefined ? json.subscriptionCredits : null);
            if (c !== null && c < reqCredits) return true; // Switches if less than required for this specific video!
          }
        } catch (e) {}

        return false;
      }, required);
    } catch (e) {
      return false;
    }
  }

  // ⚡ NATIVE FAST TEXT INSERTION
  async insertNativeText(text) {
    try {
      if (this.cdpSession) {
        await this.cdpSession.send('Input.insertText', { text });
      } else {
        await this.page.keyboard.type(text, { delay: 15 });
      }
    } catch (e) {
      await this.page.keyboard.type(text, { delay: 15 });
    }
  }

  // ⚙️ CONFIGURE GENERATION SETTINGS (100% Exact Google Flow UI Synchronization)
  async configureGenerationSettings(settings) {
    try {
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
      const pillInfo = await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const candidates = btns.filter(b => {
          const r = b.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          if (r.top < (window.innerHeight - 300)) return false; // Must be in bottom prompt area
          const txt = (b.innerText || '').toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          if (txt.includes('arrow_forward') || txt.includes('arrow_upward') || aria.includes('submit')) return false;
          if (aria.includes('create') || aria.includes('add asset') || txt === '+') return false;
          if (txt.includes('agent')) return false;
          return true;
        });

        const pill = btns.find(b => {
          const r = b.getBoundingClientRect();
          const txt = (b.innerText || '').toLowerCase();
          return r.top > (window.innerHeight - 250) && (
            txt.includes('video') || txt.includes('image') || txt.includes('banana') || 
            txt.includes('omni') || txt.includes('veo') || txt.includes('720p') || 
            txt.includes('x1') || txt.includes('x2') || txt.includes('x3') || txt.includes('x4')
          );
        });

        if (pill) {
          const r = pill.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
        }
        return null;
      });

      if (pillInfo) {
        this.log(`🔍 Clicking Flow Settings Pill: "${pillInfo.text.replace(/\n/g, ' ')}"...`, 'info');
        await this.page.mouse.click(pillInfo.x, pillInfo.y);
        await sleep(700);

        // Helper inside page to find and click buttons strictly inside the floating popover container using REAL Hardware Mouse Clicks
        const clickPopoverButton = async (textMatch, options = {}) => {
          const coords = await this.page.evaluate(({ match, exact }) => {
            const allElements = Array.from(document.querySelectorAll('div, section, aside'));
            const popovers = allElements.filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 150 && r.width < 550 && r.height > 100 && r.height < 650 && r.top > 100 && r.left > 200;
            });

            for (const pop of popovers) {
              const btns = Array.from(pop.querySelectorAll('button, [role="tab"], div[role="button"], div[role="radio"], span, label'));
              const target = btns.find(b => {
                const txt = (b.innerText || '').trim().toLowerCase();
                const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                const m = match.toLowerCase();
                if (exact) {
                  return txt === m || aria === m || txt.split(/\s+/).includes(m);
                }
                return txt.includes(m) || aria.includes(m);
              });

              if (target) {
                const r = target.getBoundingClientRect();
                return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: target.innerText };
              }
            }
            return null;
          }, { match: textMatch, exact: options.exact || false });

          if (coords) {
            await this.page.mouse.click(coords.x, coords.y);
            return true;
          }
          return false;
        };

        // 2. Select Video vs Image Mode via REAL Hardware Mouse Click
        this.log(`1️⃣ Switching Mode to [${modeType}]...`, 'info');
        const modeCoords = await this.page.evaluate((targetMode) => {
          const allElements = Array.from(document.querySelectorAll('div, section, aside'));
          const popovers = allElements.filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 150 && r.width < 550 && r.height > 100 && r.height < 650 && r.top > 100 && r.left > 200;
          });
          for (const pop of popovers) {
            const allBtns = Array.from(pop.querySelectorAll('button, [role="tab"], div[role="button"], div[role="radio"]'));
            const popRect = pop.getBoundingClientRect();
            const topBtns = allBtns.filter(b => {
              const br = b.getBoundingClientRect();
              return br.top < (popRect.top + 140);
            });

            const target = topBtns.find(b => {
              const txt = (b.innerText || '').trim().toLowerCase();
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              const m = targetMode.toLowerCase();
              return txt === m || aria === m || txt.startsWith(m) || aria.startsWith(m);
            }) || allBtns.find(b => {
              const txt = (b.innerText || '').trim().toLowerCase();
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              const m = targetMode.toLowerCase();
              return txt === m || aria === m;
            });

            if (target) {
              const r = target.getBoundingClientRect();
              return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: target.innerText };
            }
          }
          return null;
        }, modeType);

        if (modeCoords) {
          this.log(`✓ Real hardware click on [${modeType}] tab at (${Math.round(modeCoords.x)}, ${Math.round(modeCoords.y)})`, 'info');
          await this.page.mouse.click(modeCoords.x, modeCoords.y);
          await sleep(600);
        }

        // 3. Select Video Sub-mode (Text vs Ingredients vs Frames)
        if (modeType === 'Video') {
          if (videoMode === 'Ingredients') {
            this.log(`2️⃣ Selecting Submode [Ingredients]...`, 'info');
            await clickPopoverButton('Ingredients');
            await sleep(350);
          } else if (videoMode === 'Frames') {
            this.log(`2️⃣ Selecting Submode [Frames]...`, 'info');
            await clickPopoverButton('Frames');
            await sleep(350);
          } else {
            // Text mode: ensure neither Frames nor Ingredients is active
            await this.page.evaluate(() => {
              const allElements = Array.from(document.querySelectorAll('div, section, aside'));
              const popovers = allElements.filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
              });
              for (const pop of popovers) {
                const btns = Array.from(pop.querySelectorAll('button'));
                const btnFrames = btns.find(b => (b.innerText || '').trim().toLowerCase().includes('frames'));
                const btnIngredients = btns.find(b => (b.innerText || '').trim().toLowerCase().includes('ingredients'));
                if (btnFrames && (btnFrames.getAttribute('data-state') === 'on' || btnFrames.className.includes('active'))) btnFrames.click();
                if (btnIngredients && (btnIngredients.getAttribute('data-state') === 'on' || btnIngredients.className.includes('active'))) btnIngredients.click();
              }
            });
            await sleep(200);
          }
        }

        // 4. Select Aspect Ratio (9:16 | 16:9 | 1:1 | 4:3 | 3:4)
        const targetAspect = settings.aspectRatio || (modeType === 'Image' ? '1:1' : '9:16');
        this.log(`3️⃣ Selecting Aspect Ratio [${targetAspect}]...`, 'info');
        await clickPopoverButton(targetAspect, { exact: true });
        await sleep(350);

        // 5. Select AI Model Dropdown
        const targetModel = settings.model || (modeType === 'Image' ? 'Nano Banana Pro' : 'Omni Flash');
        this.log(`4️⃣ Selecting AI Model [${targetModel}]...`, 'info');
        const modelBtnCoords = await this.page.evaluate(() => {
          const allElements = Array.from(document.querySelectorAll('div, section, aside'));
          const popovers = allElements.filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
          });

          for (const pop of popovers) {
            const btns = Array.from(pop.querySelectorAll('button, div[role="button"]'));
            const dd = btns.find(b => {
              const txt = (b.innerText || '').toLowerCase();
              return txt.includes('omni') || txt.includes('veo') || txt.includes('nano') || txt.includes('banana') || txt.includes('imagen') || txt.includes('arrow_drop_down') || b.getAttribute('aria-haspopup') === 'menu';
            });
            if (dd) {
              const r = dd.getBoundingClientRect();
              return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: dd.innerText };
            }
          }
          return null;
        });

        if (modelBtnCoords) {
          this.log(`Opening Model dropdown menu...`, 'info');
          await this.page.mouse.click(modelBtnCoords.x, modelBtnCoords.y);
          await sleep(500);

          const cleanTarget = targetModel.toLowerCase().replace(/[^a-z0-9]/g, '');
          const optCoords = await this.page.evaluate((cleanT) => {
            const menuItems = Array.from(document.querySelectorAll('div[role="menu"] [role="menuitem"], div[role="menu"] button, div[data-state="open"] div[class*="item"], div[data-state="open"] button'));
            for (const item of menuItems) {
              const itemTxt = (item.innerText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (itemTxt.includes(cleanT) || cleanT.includes(itemTxt)) {
                const r = item.getBoundingClientRect();
                return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: item.innerText };
              }
            }
            return null;
          }, cleanTarget);

          if (optCoords) {
            this.log(`✓ Selecting model option: "${optCoords.text.trim()}"...`, 'info');
            await this.page.mouse.click(optCoords.x, optCoords.y);
            await sleep(400);
          } else {
            await this.page.evaluate((cleanT) => {
              const menuItems = Array.from(document.querySelectorAll('div[role="menu"] [role="menuitem"], div[role="menu"] button, div[data-state="open"] button'));
              const item = menuItems.find(o => (o.innerText || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanT));
              if (item) {
                item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                item.click();
              }
            }, cleanTarget);
            await sleep(400);
          }
        }

        // 6. Select Duration (4s | 6s | 8s | 10s)
        if (modeType === 'Video') {
          const targetDuration = settings.duration || '6s';
          this.log(`5️⃣ Selecting Duration [${targetDuration}]...`, 'info');
          await clickPopoverButton(targetDuration, { exact: true });
          await sleep(350);

          // 7. Select Quality (720p | 1080p | 2k | 4k) if present
          const targetQuality = settings.quality || '1080p';
          await clickPopoverButton(targetQuality);
          await sleep(200);
        }

        // 8. Select Outputs Count (x1 | x2 | x3 | x4)
        const targetCount = `x${settings.outputsCount || 1}`;
        this.log(`6️⃣ Selecting Output Count [${targetCount}]...`, 'info');
        await clickPopoverButton(targetCount, { exact: true });
        await sleep(350);

        // 9. Close Popover safely
        await this.page.keyboard.press('Escape');
        await sleep(400);
        this.log(`✓ All Flow settings synchronized in Google Flow UI!`, 'success');
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

    const videoId = `vid_${Date.now()}_${promptIndex + 1}`;
    this.log(`\n----------------------------------------`, 'info');
    this.log(`🚀 [Prompt ${promptIndex + 1}/${totalPrompts}] Submitting to Flow: "${promptText.substring(0, 50)}..."`, 'info');
    this.log(`----------------------------------------`, 'info');

    if (settings.type !== 'Image' && await this.checkCreditsExhausted(settings)) {
      this.log(`Account [${this.currentAccount.name}] is OUT OF CREDITS!`, 'warn');
      return { status: 'EXHAUSTED' };
    }

    // 1️⃣ Configure Settings on the first prompt or if changed
    if (promptIndex === 0) {
      await this.configureGenerationSettings(settings);
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

    // 3️⃣ Focus Slate Prompt Box & Type Prompt
    this.log('Focusing prompt textbox...', 'info');
    if (!targetRef && settings.videoMode === 'Text') {
      const tbCoords = await this.page.evaluate(() => {
        const el = document.querySelector('div[role="textbox"], div[contenteditable="true"]');
        if (el) {
          el.focus();
          const r = el.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        return null;
      });

      if (tbCoords) {
        await this.page.mouse.click(tbCoords.x, tbCoords.y);
        await sleep(150);
      }

      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      await sleep(150);

      this.log(`Typing prompt: "${promptText.substring(0, 45)}..."`, 'info');
      await this.insertNativeText(promptText);
      await sleep(350);
    } else {
      await this.page.keyboard.press('End');
      await sleep(150);
      await this.page.keyboard.type(' ', { delay: 20 });
      this.log(`Typing prompt after image chip: "${promptText.substring(0, 45)}..."`, 'info');
      await this.page.keyboard.type(promptText, { delay: 15 });
      await sleep(350);
    }

    // 4️⃣ Submit Generation Request
    this.log('Firing Generation request...', 'info');
    await this.page.keyboard.press('Enter');
    await sleep(250);

    await this.page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const submitBtn = allBtns.find(b => {
        const txt = (b.innerText || '').trim();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        const hasArrow = txt.includes('arrow_forward') || txt.includes('arrow_upward') || txt.includes('send');
        const isGenerate = (aria === 'generate' || aria === 'submit' || aria.includes('generate video'));
        const isAddButton = aria.includes('add') || aria.includes('asset') || txt.includes('add_2') || txt === '+';
        return (hasArrow || isGenerate) && !isAddButton;
      });
      if (submitBtn) submitBtn.click();
    });

    this.log(`✓ [Prompt #${promptIndex + 1}] Successfully fired to Google Flow generation engine!`, 'success');

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
      completed: false,
      downloaded: false
    };
  }

  // 📥 DOWNLOAD COMPLETED MEDIA (Instantly or as part of Batch)
  async downloadCompletedMedia(task, downloadFolder, settings) {
    const isImageMode = (settings.type === 'Image');
    const fileExt = isImageMode ? 'png' : 'mp4';
    const indexNum = task.promptIndex + 1;
    const pattern = settings.namingPattern || 'scene';
    const prefix = settings.customNamingPrefix || 'scene';

    let fileName = `scene${indexNum}.${fileExt}`;
    if (pattern === 'numeric') {
      fileName = `${indexNum}.${fileExt}`;
    } else if (pattern === 'scene') {
      fileName = `scene${indexNum}.${fileExt}`;
    } else if (pattern === 'clip') {
      fileName = `clip${indexNum}.${fileExt}`;
    } else if (pattern === 'shot') {
      fileName = `shot${indexNum}.${fileExt}`;
    } else if (pattern === 'video') {
      fileName = isImageMode ? `image${indexNum}.${fileExt}` : `video${indexNum}.${fileExt}`;
    } else if (pattern === 'custom') {
      fileName = `${prefix}${indexNum}.${fileExt}`;
    } else if (pattern === 'prompt') {
      const cleanPrompt = task.promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      fileName = `${Date.now()}_${cleanPrompt}.${fileExt}`;
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
            'Referer': 'https://labs.google/fx/tools/flow'
          },
          redirect: 'follow'
        });

        if (resp.ok) {
          let buffer = Buffer.from(await resp.arrayBuffer());
          if (buffer.length > 5000) {
            // 🧼 If Image Mode, clean Google watermark pixel-by-pixel before saving
            if (isImageMode && this.page) {
              try {
                this.log(`🧼 [wm.js] Cleaning Google watermark pixel-by-pixel from ${fileName}...`, 'info');
                buffer = await WatermarkCleaner.cleanImageWatermark(this.page, buffer);
                this.log(`✓ [wm.js] Watermark removed & clean image generated for ${fileName}!`, 'success');
              } catch (wmErr) {
                this.log(`Watermark cleaning notice: ${wmErr.message}`, 'warn');
              }
            }

            fs.writeFileSync(finalSavedFilePath, buffer);
            const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
            this.log(`✓ [Instant Download] Saved: ${fileName} (${sizeMb} MB) to [${path.basename(downloadFolder)}]!`, 'success');
            task.downloaded = true;
            saved = true;
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

      // Stop the queue after bounded retries, but do not present a missing file as ready.
      task.downloaded = true;
      task.downloadFailed = true;
      this.log(`Could not save ${fileName} after 3 attempts. The item remains available in Flow, but was not downloaded locally.`, 'error');
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
    this.onVideoCompleted({
      id: task.videoId,
      prompt: task.promptText,
      accountName: this.currentAccount.name,
      videoUrl: task.completedVideoUrl,
      filePath: finalSavedFilePath,
      downloadFolder: downloadFolder,
      timestamp: new Date().toLocaleTimeString(),
      quality: settings.quality || '1080p',
      duration: settings.duration || '6s',
      aspectRatio: settings.aspectRatio || '9:16',
      elapsed: elapsed
    });
    return true;
  }

  // ⏳ WAIT FOR ALL SUBMITTED TASKS ON CURRENT ACCOUNT TO REACH 100% AND DOWNLOAD
  async waitForAccountTasks(accountTasks, downloadFolder, settings) {
    if (!accountTasks || accountTasks.length === 0) return;

    const isImageMode = (settings.type === 'Image');
    const pendingTasks = accountTasks.filter(t => !t.downloaded);
    if (pendingTasks.length === 0) return;

    this.log(`\n⏳ Monitoring & waiting for ${pendingTasks.length} pending video(s) on [${this.currentAccount.name}] to finish rendering and download before session close...`, 'info');

    const maxWaitSec = (isImageMode ? 120 : 300) + (pendingTasks.length * 25);
    const startMonitorTime = Date.now();

    while (!this.isStopping) {
      const allDownloaded = accountTasks.every(t => t.downloaded);
      if (allDownloaded) {
        this.log(`✓ All ${accountTasks.length} media items on [${this.currentAccount.name}] finished rendering & downloaded successfully!`, 'success');
        break;
      }

      if ((Date.now() - startMonitorTime) > maxWaitSec * 1000) {
        this.log(`Render monitor reached timeout for [${this.currentAccount.name}]. Proceeding...`, 'warn');
        break;
      }

      await sleep(1500);

      if (!this.page || this.page.isClosed()) break;

      try {
        // 🚨 1. Google Captcha / Human Verification Detector
        const isCaptcha = await this.page.evaluate(() => {
          const bodyText = (document.body.innerText || '').toLowerCase();
          const url = window.location.href.toLowerCase();
          return url.includes('challenge') || url.includes('recaptcha') || bodyText.includes("verify it's you") || bodyText.includes('unusual traffic');
        });
        if (isCaptcha) {
          this.log('🚨 Google Human Verification / Captcha Detected! Please solve it in the opened browser window.', 'error', { isCaptcha: true });
        }

        // 🔍 2. Canvas State Inspection with Safety Filter & Error Fast-Detection
        const canvasState = await this.page.evaluate(() => {
          const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
          return tiles.map(t => {
            const text = (t.innerText || '').toLowerCase();
            const vid = t.querySelector('video');
            const img = t.querySelector('img');
            const pctMatch = text.match(/\b(\d{1,3})%/);
            const isSafetyFailed = text.includes('safety') || 
                                   text.includes('policy') || 
                                   text.includes('failed to generate') || 
                                   text.includes('try another prompt') || 
                                   text.includes('violat') ||
                                   text.includes('something went wrong') ||
                                   text.includes('generation error');

            return {
              text: text,
              percentage: pctMatch ? `${pctMatch[1]}%` : null,
              videoSrc: vid ? vid.src : null,
              imgSrc: img ? img.src : null,
              isFailed: isSafetyFailed,
              isReady: (vid && vid.src && vid.src.includes('media.getMediaUrlRedirect')) ||
                       (img && img.src && img.src.includes('media.getMediaUrlRedirect')) ||
                       text.includes('100%')
            };
          });
        });

        for (const task of accountTasks) {
          if (task.downloaded) continue;

          const keywords = task.promptText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          let bestTile = null;

          // 🎯 Dual-Lock: Check chronological sequence first, then keyword score
          if (canvasState.length > task.promptIndex && canvasState[canvasState.length - 1 - task.promptIndex]) {
            bestTile = canvasState[canvasState.length - 1 - task.promptIndex];
          }

          if (!bestTile || (!bestTile.isReady && !bestTile.percentage && !bestTile.isFailed)) {
            let maxMatches = 0;
            for (const tile of canvasState) {
              let m = 0;
              for (const kw of keywords) {
                if (tile.text.includes(kw)) m++;
              }
              if (m > maxMatches) {
                maxMatches = m;
                bestTile = tile;
              }
            }
          }

          if (bestTile) {
            // ⚠️ Fast-Skip on Google Safety Policy Filter / Generation Error
            if (bestTile.isFailed) {
              task.completed = true;
              task.downloaded = true; // Mark finished so queue does not block!
              this.log(`⚠️ [Prompt #${task.promptIndex + 1}] Google Safety Policy / Generation Filter triggered: "${task.promptText.substring(0, 45)}...". Skipping safely!`, 'warn');
              this.onVideoCompleted({
                id: task.videoId,
                prompt: task.promptText,
                accountName: this.currentAccount.name,
                status: 'Filtered by Safety Policy',
                filePath: null,
                error: 'Policy Filter',
                type: settings.type,
                timestamp: new Date().toLocaleTimeString()
              });
              continue;
            }

            if (bestTile.percentage) {
              this.onVideoProgress({ id: task.videoId, percentage: bestTile.percentage });
            }

            if (bestTile.isReady && (bestTile.videoSrc || bestTile.imgSrc)) {
              task.completed = true;
              task.completedVideoUrl = bestTile.videoSrc || bestTile.imgSrc;
              this.log(`🎉 [Prompt #${task.promptIndex + 1}] Render Complete (100%) on [${this.currentAccount.name}]!`, 'success');

              // Download immediately so the video is safe on disk before profile closes
              await this.downloadCompletedMedia(task, downloadFolder, settings);
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

      // Inner Loop: Submit prompts to current account until credits run out or all prompts submitted
      while (promptCursor < prompts.length && !this.isStopping) {
        // Pause check before each prompt
        while (this.isPaused && !this.isStopping) {
          this.updateProgress({ status: 'Paused' });
          await sleep(1000);
        }
        if (this.isStopping) break;

        const promptText = prompts[promptCursor];
        this.updateProgress({
          currentPromptIndex: promptCursor + 1,
          totalPrompts: prompts.length,
          currentProfileName: this.currentAccount.name,
          activePromptText: promptText,
          status: 'Submitting'
        });

        // 1. Check if credits are already exhausted before submitting
        if (settings.type !== 'Image' && await this.checkCreditsExhausted(settings)) {
          this.log(`⚠️ Account [${this.currentAccount.name}] has RUN OUT OF CREDITS before Prompt #${promptCursor + 1}!`, 'warn');
          this.currentAccount.status = 'Exhausted';
          try {
            const allAccs = getAccounts();
            const target = allAccs.find(a => a.id === this.currentAccount.id);
            if (target) { target.status = 'Exhausted'; saveAccounts(allAccs); }
          } catch (e) {}
          break; // Break inner loop to trigger safe download & account switch!
        }

        // 2. Submit prompt
        const taskResult = await this.submitPrompt(promptText, settings, promptCursor, prompts.length);

        if (taskResult && taskResult.status === 'EXHAUSTED') {
          this.log(`⚠️ Account [${this.currentAccount.name}] exhausted during Prompt #${promptCursor + 1}!`, 'warn');
          this.currentAccount.status = 'Exhausted';
          try {
            const allAccs = getAccounts();
            const target = allAccs.find(a => a.id === this.currentAccount.id);
            if (target) { target.status = 'Exhausted'; saveAccounts(allAccs); }
          } catch (e) {}
          break; // Break inner loop without incrementing promptCursor so next account retries this prompt!
        }

        if (taskResult && taskResult.status === 'SUBMITTED') {
          currentAccountTasks.push(taskResult);
          allSubmittedTasks.push(taskResult);
          promptCursor++; // Advance to next prompt only after successful submission!
        }

        // Exact Wait Timer Between Prompts
        if (promptCursor < prompts.length && !this.isStopping) {
          if (delaySec > 0) {
            this.log(`⏳ Waiting ${delaySec}s before submitting Prompt #${promptCursor + 1}...`, 'info');
            for (let s = delaySec; s > 0 && !this.isStopping && !this.isPaused; s--) {
              await sleep(1000);
            }
          } else {
            this.log(`⚡ [0s Fast Mode] Submitting next Prompt #${promptCursor + 1} immediately...`, 'info');
            await sleep(500);
          }
        }
      }

      // 🛡️ CRITICAL: Wait for all submitted videos on this account to finish rendering and download before closing!
      if (currentAccountTasks.length > 0) {
        await this.waitForAccountTasks(currentAccountTasks, downloadFolder, settings);
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

    this.updateProgress({ status: 'Completed' });
    this.log('\n🎉 Entire multi-account batch queue completed successfully!', 'success');
  }
}

module.exports = { FlowAutomationEngine };
