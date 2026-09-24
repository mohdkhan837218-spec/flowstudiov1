const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');
const { getChromeExecutablePath } = require('./profileDetector');
const { cleanStaleProfileLocks } = require('./processHelper');
const { dbService } = require('./db');
const { assertAccountId, assertChromeProfileDirName, resolveInside, sanitizeProxyUrl } = require('./pathSecurity');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

function getAccounts() {
  const list = dbService.getAccounts();
  return Array.isArray(list) ? list : [];
}

function saveAccounts(accounts) {
  if (Array.isArray(accounts)) {
    for (const a of accounts) {
      assertAccountId(a && a.id);
      dbService.saveAccount(a);
    }
    try {
      fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(accounts, null, 2));
    } catch (e) {}
  }
}

function addAccount(customName) {
  const accounts = getAccounts();
  const nextNum = accounts.length + 1;
  const id = `acc_${Date.now()}`;
  const name = customName ? customName.trim() : `Google Account ${nextNum}`;

  const newAccount = {
    id,
    name,
    dirName: id,
    selected: true,
    status: 'Need Login',
    credits: null,
    proxyUrl: ''
  };

  const accountDir = path.join(PROFILES_DIR, id);
  if (!fs.existsSync(accountDir)) {
    fs.mkdirSync(accountDir, { recursive: true });
  }

  dbService.saveAccount(newAccount);
  const updated = dbService.getAccounts();
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(updated, null, 2));
  } catch (e) {}
  return updated;
}

function deleteAccount(id) {
  assertAccountId(id);
  dbService.deleteAccount(id);
  const accountDir = path.join(PROFILES_DIR, id);
  if (fs.existsSync(accountDir)) {
    try {
      fs.rmSync(accountDir, { recursive: true, force: true });
    } catch (e) {}
  }
  const remaining = dbService.getAccounts();
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(remaining, null, 2));
  } catch (e) {}
  return remaining;
}

function deleteAllAccounts() {
  const all = dbService.getAccounts();
  for (const a of all) {
    const accountDir = path.join(PROFILES_DIR, a.id);
    if (fs.existsSync(accountDir)) {
      try {
        fs.rmSync(accountDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }
  dbService.deleteAllAccounts();
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify([], null, 2));
  } catch (e) {}
  return [];
}

function updateAccountCredits(id, credits) {
  const res = dbService.updateAccountCredits(id, credits);
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(res, null, 2));
  } catch (e) {}
  return res;
}

function parseProxyString(proxyStr) {
  if (!proxyStr || typeof proxyStr !== 'string') return null;
  let str = proxyStr.trim();
  if (!str) return null;

  let protocol = 'http';
  let host = '';
  let port = '';
  let username = '';
  let password = '';

  if (/^https?:\/\//i.test(str)) {
    protocol = 'http';
    str = str.replace(/^https?:\/\//i, '');
  } else if (/^socks5:\/\//i.test(str)) {
    protocol = 'socks5';
    str = str.replace(/^socks5:\/\//i, '');
  } else if (/^socks4:\/\//i.test(str)) {
    protocol = 'socks4';
    str = str.replace(/^socks4:\/\//i, '');
  }

  if (str.includes('@')) {
    const [authPart, hostPart] = str.split('@');
    if (authPart.includes(':')) {
      const parts = authPart.split(':');
      username = decodeURIComponent(parts[0]);
      password = decodeURIComponent(parts.slice(1).join(':'));
    }
    const [h, prt] = hostPart.split(':');
    host = h;
    port = prt;
  } else {
    const parts = str.split(':');
    if (parts.length === 4) {
      host = parts[0];
      port = parts[1];
      username = parts[2];
      password = parts[3];
    } else if (parts.length === 2) {
      host = parts[0];
      port = parts[1];
    } else {
      host = str;
    }
  }

  if (!host) return null;
  const serverUrl = port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
  return {
    protocol,
    host,
    port,
    username,
    password,
    serverUrl,
    displayUrl: port ? `${host}:${port}` : host
  };
}

function updateAccountProxy(id, proxyUrl) {
  dbService.updateAccountProxy(id, proxyUrl);
  const remaining = dbService.getAccounts();
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(remaining, null, 2));
  } catch (e) {}
  return remaining;
}

function getAccountProfilePath(accountId) {
  assertAccountId(accountId);
  const profilePath = path.join(PROFILES_DIR, accountId);
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }
  return profilePath;
}

/**
 * Open interactive Chrome window for initial login
 */
function openLoginWindow(accountId, onLoggedInCallback) {
  assertAccountId(accountId);
  const chromePath = getChromeExecutablePath();
  const profilePath = getAccountProfilePath(accountId);

  cleanStaleProfileLocks(profilePath);

  const accounts = getAccounts();
  const account = accounts.find(a => a.id === accountId);

  // Pure genuine Chrome arguments without any automation flags that trigger Google blocks
  const args = [
    `--user-data-dir=${profilePath}`,
    '--no-first-run',
    '--no-default-browser-check'
  ];

  if (account && account.proxyUrl && account.proxyUrl.trim() !== '') {
    const parsed = parseProxyString(account.proxyUrl);
    if (parsed) {
      args.push(`--proxy-server=${parsed.serverUrl}`);
    }
  }

  // Open Google Flow directly so user sees Flow and can sign in smoothly
  args.push('https://flow.google.com/');

  try {
    const proc = spawn(chromePath, args);

    // Active watcher: Poll the profile every 2.5 seconds to see when user signs in to Google!
    let pollInterval = null;
    let pollCount = 0;
    let detectedLogin = false;

    const checkLoginStatus = () => {
      try {
        const prefPath = path.join(profilePath, 'Default', 'Preferences');
        if (fs.existsSync(prefPath)) {
          const prefData = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
          const info = prefData.account_info;
          if (Array.isArray(info) && info.length > 0 && info[0].email) {
            const accInfo = info[0];
            const accs = getAccounts();
            const target = accs.find(a => a.id === accountId);
            if (target) {
              target.email = accInfo.email;
              target.googleName = accInfo.given_name || accInfo.full_name || accInfo.email.split('@')[0];
              target.status = 'Ready';
              target.lastChecked = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              dbService.saveAccount(target);
              try {
                fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(getAccounts(), null, 2));
              } catch (e) {}

              if (onLoggedInCallback) {
                onLoggedInCallback({
                  success: true,
                  account: target,
                  accounts: getAccounts()
                });
              }
              return true;
            }
          }
        }
      } catch (e) {}
      return false;
    };

    pollInterval = setInterval(() => {
      pollCount++;
      if (pollCount > 120) { // Stop polling after 5 minutes
        clearInterval(pollInterval);
        return;
      }
      const loggedIn = checkLoginStatus();
      if (loggedIn) {
        detectedLogin = true;
        clearInterval(pollInterval);
      }
    }, 2500);

    proc.on('close', async () => {
      if (pollInterval) clearInterval(pollInterval);
      cleanStaleProfileLocks(profilePath);
      // Once Chrome is closed, fetch live credits without file lock collisions!
      try {
        const res = await fetchRealCredits(accountId);
        if (onLoggedInCallback) {
          onLoggedInCallback({
            success: true,
            account: (res && res.account) || getAccounts().find(a => a.id === accountId),
            accounts: getAccounts()
          });
        }
      } catch (e) {
        if (onLoggedInCallback) {
          onLoggedInCallback({
            success: true,
            account: getAccounts().find(a => a.id === accountId),
            accounts: getAccounts()
          });
        }
      }
    });

    proc.on('error', (err) => {
      console.error('Chrome spawn error:', err);
      if (pollInterval) clearInterval(pollInterval);
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 🔍 DETECT ALL REAL GOOGLE CHROME PROFILES INSTALLED ON THIS PC
 */
function getInstalledChromeProfiles() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return [];
  const chromeUserData = path.join(localAppData, 'Google', 'Chrome', 'User Data');
  const localStatePath = path.join(chromeUserData, 'Local State');
  if (!fs.existsSync(localStatePath)) return [];

  try {
    const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
    const infoCache = localState.profile ? localState.profile.info_cache : {};
    const profiles = [];

    for (const [dirName, p] of Object.entries(infoCache)) {
      let email = p.user_name || p.email || '';
      let gaiaName = p.gaia_name || p.gaia_given_name || '';

      // Fallback: Check Preferences in profile directory if email is missing from info_cache
      if (!email) {
        try {
          const prefPath = path.join(chromeUserData, dirName, 'Preferences');
          if (fs.existsSync(prefPath)) {
            const pref = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
            if (pref.account_info && Array.isArray(pref.account_info) && pref.account_info[0]) {
              email = pref.account_info[0].email || '';
              if (!gaiaName) gaiaName = pref.account_info[0].full_name || '';
            } else if (pref.google && pref.google.services && pref.google.services.signin && pref.google.services.signin.user_display_name) {
              if (!gaiaName) gaiaName = pref.google.services.signin.user_display_name;
            }
          }
        } catch (pe) {}
      }

      profiles.push({
        dirName,
        name: p.name || dirName,
        email,
        gaiaName: gaiaName || p.name || dirName
      });
    }
    return profiles;
  } catch (err) {
    console.error('[Error reading Chrome profiles]:', err.message);
    return [];
  }
}

/**
 * ⚡ 1-CLICK INSTANT IMPORT: COPY AUTHENTICATED CHROME SESSION
 */
async function importFromInstalledChrome(srcProfileDirName, destAccountId) {
  assertChromeProfileDirName(srcProfileDirName);
  if (destAccountId) assertAccountId(destAccountId);
  await dbService.ensureInit();
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) throw new Error('LOCALAPPDATA directory not found');
  const chromeUserData = path.join(localAppData, 'Google', 'Chrome', 'User Data');
  const srcDir = path.join(chromeUserData, srcProfileDirName);

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Chrome profile "${srcProfileDirName}" not found at: ${srcDir}`);
  }

  const profiles = getInstalledChromeProfiles();
  const matched = profiles.find(p => p.dirName === srcProfileDirName);

  let accounts = getAccounts();
  let acc = null;
  if (destAccountId) {
    acc = accounts.find(a => a.id === destAccountId);
  }
  if (!acc && matched && matched.email) {
    acc = accounts.find(a => a.email && a.email.toLowerCase().trim() === matched.email.toLowerCase().trim());
    if (acc) destAccountId = acc.id;
  }
  if (!acc && matched && matched.dirName) {
    acc = accounts.find(a => a.chromeProfileDir === matched.dirName);
    if (acc) destAccountId = acc.id;
  }
  if (!acc) {
    const uniqueId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const displayName = matched ? (matched.gaiaName || (matched.email ? matched.email.split('@')[0] : `Google Account ${accounts.length + 1}`)) : `Google Account ${accounts.length + 1}`;
    const accountDir = path.join(PROFILES_DIR, uniqueId);
    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true });
    }
    acc = {
      id: uniqueId,
      name: displayName,
      email: (matched && matched.email) || '',
      googleName: (matched && (matched.gaiaName || matched.name)) || displayName,
      dirName: uniqueId,
      selected: true,
      status: 'Ready',
      credits: null,
      proxyUrl: '',
      chromeProfileDir: srcProfileDirName,
      lastChecked: 'Imported from Chrome'
    };
    dbService.saveAccount(acc);
    accounts = getAccounts();
    destAccountId = acc.id;
  }

  const destDir = path.join(PROFILES_DIR, destAccountId, 'Default');
  const destRoot = path.join(PROFILES_DIR, destAccountId);

  cleanStaleProfileLocks(destRoot);
  fs.mkdirSync(destDir, { recursive: true });

  // Copy Local State so DPAPI cookie decryption succeeds on this Windows user
  const srcLocalState = path.join(chromeUserData, 'Local State');
  if (fs.existsSync(srcLocalState)) {
    try {
      fs.copyFileSync(srcLocalState, path.join(destRoot, 'Local State'));
    } catch (e) {}
  }

  const itemsToCopy = [
    'Network/Cookies',
    'Cookies',
    'Login Data',
    'Web Data',
    'Preferences',
    'Secure Preferences'
  ];

  let cookiesLocked = false;
  for (const item of itemsToCopy) {
    const s = path.join(srcDir, item);
    const d = path.join(destDir, item);
    if (fs.existsSync(s)) {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      try {
        fs.copyFileSync(s, d);
      } catch (e) {
        if (e.code === 'EBUSY' || (e.message && e.message.includes('busy or locked'))) {
          if (item.includes('Cookies')) cookiesLocked = true;
        }
        console.warn(`[Copy warning for ${item}]:`, e.message);
      }
    }
  }

  if (acc) {
    if (matched) {
      acc.email = matched.email || acc.email;
      acc.googleName = matched.gaiaName || matched.name || acc.googleName;
      acc.chromeProfileDir = srcProfileDirName;
    }
    acc.status = 'Need Login';
    acc.credits = 0;
    acc.lastChecked = cookiesLocked ? 'Imported from Chrome (Cookies Locked)' : 'Imported from Chrome';
    dbService.saveAccount(acc);
    try {
      fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(getAccounts(), null, 2));
    } catch (e) {}
  }

  return { success: true, account: acc, accounts: getAccounts(), cookiesLocked };
}

/**
 * ⚡ 1-CLICK INSTANT IMPORT ALL INSTALLED CHROME PROFILES
 */
async function importAllInstalledChromeProfiles() {
  await dbService.ensureInit();
  const profiles = getInstalledChromeProfiles();
  if (!profiles || profiles.length === 0) {
    return {
      success: false,
      error: 'No Google Chrome profiles detected on this machine.',
      totalFound: 0,
      importedCount: 0,
      accounts: getAccounts()
    };
  }

  const results = [];
  for (const prof of profiles) {
    try {
      const res = await importFromInstalledChrome(prof.dirName);
      results.push({
        dirName: prof.dirName,
        email: prof.email,
        name: prof.gaiaName || prof.name,
        success: res.success,
        cookiesLocked: res.cookiesLocked,
        account: res.account
      });
    } catch (err) {
      results.push({
        dirName: prof.dirName,
        email: prof.email,
        name: prof.gaiaName || prof.name,
        success: false,
        error: err.message
      });
    }
  }

  return {
    success: true,
    totalFound: profiles.length,
    importedCount: results.filter(r => r.success).length,
    results,
    accounts: getAccounts()
  };
}

const activeCreditFetches = new Map();

/**
 * Fetch real credits from Google Flow live workspace/account panel
 */
async function fetchRealCredits(accountId) {
  if (activeCreditFetches.has(accountId)) {
    return activeCreditFetches.get(accountId);
  }

  const fetchPromise = (async () => {
    const puppeteer = require('puppeteer-core');
    const chromePath = getChromeExecutablePath();
    const profilePath = getAccountProfilePath(accountId);
    await dbService.ensureInit();
    const accounts = getAccounts();
    const target = accounts.find(a => a.id === accountId);

    const args = [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ];

    if (target && target.proxyUrl && target.proxyUrl.trim() !== '') {
      args.push(`--proxy-server=${target.proxyUrl.trim()}`);
    }

    let browser = null;
    try {
      cleanStaleProfileLocks(profilePath);
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: chromePath,
        userDataDir: profilePath,
        defaultViewport: { width: 1920, height: 1080 },
        args
      });

      const page = await browser.newPage();

      // Navigate to Google Flow
      await page.goto('https://flow.google.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 4000));

      let curUrl = page.url();

      // 1. If on Google Flow /about landing page, click "Create with Google Flow" to proceed into studio
      if (curUrl.includes('/about')) {
        try {
          const clicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
            const createBtn = btns.find(b => {
              const txt = (b.innerText || b.textContent || '').trim();
              return txt.includes('Create with Google Flow') || txt.includes('Try in Google Flow') || txt.includes('Get started') || txt.includes('Launch Flow');
            });
            if (createBtn) {
              createBtn.click();
              return true;
            }
            return false;
          });
          if (clicked) {
            await new Promise(r => setTimeout(r, 5000));
            curUrl = page.url();
          }
        } catch (e) {}
      }

      // 2. Check if genuinely redirected to Google Login screen
      if (curUrl.includes('accounts.google.com') || curUrl.includes('/signin')) {
        await browser.close();
        if (target) {
          target.status = 'Need Login';
          target.credits = 0;
          target.lastChecked = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          dbService.saveAccount(target);
          try {
            fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(getAccounts(), null, 2));
          } catch (e) {}
        }
        return { 
          success: false, 
          explicitSignedOut: true, 
          error: 'Google login required. Please click "Sign In" on the card to log in to Google Flow.', 
          account: target, 
          accounts: getAccounts() 
        };
      }

      const result = await page.evaluate(async () => {
        try {
          // 1. Priority 1: Open Account Details panel - This is the 100% authoritative personal credit balance!
          const targetBtn = document.querySelector('.header-user-button, [aria-label*="Account details" i], [aria-label*="account" i], [aria-label*="Google Account" i], .gb_C');
          let panelEmail = null;
          let panelName = null;
          let parsedCredits = null;

          if (targetBtn) {
            try {
              targetBtn.click();
              await new Promise(r => setTimeout(r, 1200));

              const panel = document.querySelector('flow-account-panel, [role="dialog"], div[class*="account-panel"], div[class*="profile-menu"]');
              if (panel) {
                const text = panel.innerText || panel.textContent || '';
                const match = text.match(/([\d,]+)\s*(?:Google\s*Flow\s*)?credits/i) || text.match(/credits?:\s*([\d,]+)/i) || text.match(/([\d,]+)\s*cr\b/i);
                const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@gmail\.com|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                panelName = (lines.length > 1 && lines[1] !== 'close') ? lines[1] : null;
                if (emailMatch) panelEmail = emailMatch[1];

                const closeBtn = panel.querySelector('.close-btn, button[aria-label*="Close" i]');
                if (closeBtn) {
                  closeBtn.click();
                } else if (targetBtn) {
                  targetBtn.click();
                }

                if (match) {
                  parsedCredits = parseInt(match[1].replace(/,/g, ''), 10);
                }
              }
            } catch (e) {}
          }

          // 2. Priority 2: Check official flow-user-tier-chip custom element in workspace header
          if (parsedCredits === null) {
            const tierChips = Array.from(document.querySelectorAll('flow-user-tier-chip'));
            for (const el of tierChips) {
              const txt = (el.innerText || el.textContent || '').trim();
              const m = txt.match(/^([\d,]{1,7})\s*(?:credits?|cr)$/i) || txt.match(/([\d,]{1,7})\s*(?:Google\s*Flow\s*)?credits?/i);
              if (m) {
                parsedCredits = parseInt(m[1].replace(/,/g, ''), 10);
                break;
              }
              const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
              const am = aria.match(/([\d,]{1,7})\s*(?:remaining\s*)?credits?/i);
              if (am) {
                parsedCredits = parseInt(am[1].replace(/,/g, ''), 10);
                break;
              }
            }
          }

          // 3. Check for genuine quota exhaustion banner
          const bodyText = document.body ? (document.body.innerText || '') : '';
          const bannerError = document.querySelector('.credit-banner-error, .prompt-warning-button');
          if (bannerError || bodyText.includes("out of Google Flow credits") || bodyText.includes("Insufficient credits")) {
            parsedCredits = 0;
          }

          // 4. Verify login state
          const wiz = window.WIZ_global_data || {};
          const wizEmail = wiz.oPEP7c || null;
          const userEmail = panelEmail || wizEmail;

          if (!targetBtn && !userEmail) {
            const signInBtn = document.querySelector('a[href*="accounts.google.com"], button[aria-label*="Sign in" i]');
            if (signInBtn || (document.body && document.body.innerText && document.body.innerText.includes('Sign in'))) {
              return { loggedIn: false, explicitSignedOut: true, status: 'Need Login', credits: null };
            }
          }

          return {
            loggedIn: !!(targetBtn || userEmail || parsedCredits !== null),
            email: userEmail,
            name: panelName || (userEmail ? userEmail.split('@')[0] : null),
            credits: parsedCredits,
            status: (parsedCredits !== null && parsedCredits === 0) ? 'Exhausted' : 'Ready'
          };
        } catch (e) {
          return { loggedIn: false, error: e.message };
        }
      });

      await browser.close();

      if (target) {
        if (result.loggedIn) {
          if (typeof result.credits === 'number') {
            target.credits = result.credits;
            target.status = target.credits > 0 ? 'Ready' : 'Exhausted';
          } else {
            target.status = 'Ready';
          }
          if (result.email) target.email = result.email;
          if (result.name) target.googleName = result.name;
          target.lastChecked = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (result.explicitSignedOut || !result.loggedIn) {
          target.status = 'Need Login';
          target.credits = 0;
          target.lastChecked = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          target.lastChecked = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        dbService.saveAccount(target);
        try {
          fs.writeFileSync(path.join(__dirname, '..', 'accounts.json'), JSON.stringify(getAccounts(), null, 2));
        } catch (e) {}
      }
      return { success: true, account: target, accounts: getAccounts() };
    } catch (err) {
      if (browser) {
        try { await browser.close(); } catch (e) {}
      }
      if (err.message && (err.message.includes('ProcessSingleton') || err.message.includes('Lock file can not be created'))) {
        return { 
          success: false, 
          chromeOpen: true, 
          error: 'Google Chrome is currently open for this profile. Please close the opened Chrome browser window, then click Sync again.', 
          accounts: getAccounts() 
        };
      }
      return { success: false, error: err.message, accounts: getAccounts() };
    }
  })().finally(() => {
    activeCreditFetches.delete(accountId);
  });

  activeCreditFetches.set(accountId, fetchPromise);
  return fetchPromise;
}

async function refreshAllAccountCredits() {
  const accounts = getAccounts();
  for (const acc of accounts) {
    try {
      await fetchRealCredits(acc.id);
    } catch (e) {
      console.warn(`[Refresh credits error for ${acc.name}]:`, e.message);
    }
  }
  return getAccounts();
}

/**
 * 📦 EXPORT ALL ACCOUNTS & SESSION PROFILES TO A PORTABLE ZIP BUNDLE
 */
function exportSessionsBundle(exportZipPath) {
  try {
    const zip = new AdmZip();
    const accounts = getAccounts();
    zip.addFile('accounts_meta.json', Buffer.from(JSON.stringify(accounts, null, 2), 'utf8'));

    // Zip each profile's crucial cookies and storage files
    if (fs.existsSync(PROFILES_DIR)) {
      const dirs = fs.readdirSync(PROFILES_DIR);
      for (const d of dirs) {
        const fullProfilePath = path.join(PROFILES_DIR, d);
        if (fs.statSync(fullProfilePath).isDirectory()) {
          // Add default storage folders
          const defaultDir = path.join(fullProfilePath, 'Default');
          if (fs.existsSync(defaultDir)) {
            zip.addLocalFolder(defaultDir, `profiles/${d}/Default`);
          }
        }
      }
    }

    zip.writeZip(exportZipPath);
    return { success: true, path: exportZipPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 📥 IMPORT SESSIONS BUNDLE TO RESTORE ACCOUNTS WITHOUT RE-LOGGING IN
 */
function importSessionsBundle(importZipPath) {
  let stageDir = null;
  try {
    if (!fs.existsSync(importZipPath)) {
      throw new Error('Bundle file not found');
    }

    const zipStat = fs.statSync(importZipPath);
    const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024; // 100MB
    if (zipStat.size > MAX_ARCHIVE_BYTES) {
      throw new Error(`Bundle archive exceeds maximum allowed size of 100MB (${(zipStat.size / (1024 * 1024)).toFixed(1)}MB)`);
    }

    const zip = new AdmZip(importZipPath);
    const entries = zip.getEntries();
    const MAX_ENTRIES = 500;
    const MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024; // 250MB

    if (entries.length > MAX_ENTRIES) {
      throw new Error(`Bundle archive contains too many entries (${entries.length} > ${MAX_ENTRIES})`);
    }

    let totalUncompressedBytes = 0;
    const stagedFiles = [];

    for (const entry of entries) {
      const rawName = String(entry.entryName || '');
      const entryName = rawName.replace(/\\/g, '/');

      // Reject null bytes, Windows drive letters, and parent traversal
      if (entryName.includes('\0') || /^[a-zA-Z]:/.test(entryName) || entryName.startsWith('/')) {
        throw new Error(`Malformed or absolute bundle entry: ${rawName}`);
      }

      if (entry.isDirectory) continue;

      const entrySize = Number(entry.header ? entry.header.size : 0) || 0;
      if (entrySize < 0 || isNaN(entrySize)) {
        throw new Error(`Invalid entry size in bundle for: ${entryName}`);
      }
      totalUncompressedBytes += entrySize;
      if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new Error('Bundle total uncompressed size exceeds safe limit (250MB)');
      }

      if (entryName === 'accounts_meta.json') {
        stagedFiles.push({ entry, relativePath: entryName });
        continue;
      }

      const match = entryName.match(/^profiles\/(acc_[A-Za-z0-9_-]+)\/Default\/(.+)$/);
      if (!match) {
        throw new Error(`Unauthorized bundle entry structure: ${entryName}`);
      }

      const accountId = match[1];
      const subPath = match[2];
      assertAccountId(accountId);

      if (subPath.includes('..') || path.posix.isAbsolute(subPath) || subPath.includes('\0')) {
        throw new Error(`Directory traversal attempt in bundle entry: ${entryName}`);
      }

      stagedFiles.push({ entry, relativePath: entryName });
    }

    const metaEntry = zip.getEntry('accounts_meta.json');
    let accountsList = [];
    if (metaEntry) {
      const accountsJson = zip.readAsText(metaEntry);
      accountsList = JSON.parse(accountsJson);
      if (!Array.isArray(accountsList)) throw new Error('Invalid accounts metadata in bundle: expected an array');
      for (const account of accountsList) {
        if (!account || typeof account !== 'object') throw new Error('Invalid account entry in accounts_meta.json');
        assertAccountId(account.id);
      }
    }

    stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-studio-import-'));

    // Extract entries to stage directory first
    for (const { entry, relativePath } of stagedFiles) {
      const target = path.resolve(stageDir, relativePath);
      if (!resolveInside(stageDir, target)) {
        throw new Error(`Traversal detected in staged path: ${relativePath}`);
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, entry.getData());
    }

    // Save accounts into database
    for (const a of accountsList) {
      dbService.saveAccount(a);
    }

    // Restore files into application profiles
    const profilesRoot = path.resolve(__dirname, '..', 'profiles');
    for (const { relativePath } of stagedFiles) {
      if (relativePath === 'accounts_meta.json') continue;
      const source = path.resolve(stageDir, relativePath);
      const target = path.resolve(__dirname, '..', relativePath);
      if (!resolveInside(profilesRoot, target)) {
        throw new Error(`Unsafe restore target outside profiles: ${relativePath}`);
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }

    return { success: true, accounts: getAccounts() };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (stageDir && fs.existsSync(stageDir)) {
      try {
        fs.rmSync(stageDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}

module.exports = {
  getAccounts,
  saveAccounts,
  addAccount,
  deleteAccount,
  deleteAllAccounts,
  updateAccountCredits,
  updateAccountProxy,
  openLoginWindow,
  getAccountProfilePath,
  fetchRealCredits,
  refreshAllAccountCredits,
  exportSessionsBundle,
  importSessionsBundle,
  getInstalledChromeProfiles,
  importFromInstalledChrome,
  importAllInstalledChromeProfiles,
  parseProxyString
};
