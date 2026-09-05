const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getChromeExecutablePath } = require('./profileDetector');
const { cleanStaleProfileLocks } = require('./processHelper');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

function getAccounts() {
  ensureDirectories();
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    const initial = [
      { id: 'acc_1', name: 'Google Account 1', dirName: 'acc_1', selected: true, status: 'Ready' },
      { id: 'acc_2', name: 'Google Account 2', dirName: 'acc_2', selected: true, status: 'Ready' },
      { id: 'acc_3', name: 'Google Account 3', dirName: 'acc_3', selected: true, status: 'Ready' }
    ];
    saveAccounts(initial);
    return initial;
  }

  try {
    const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveAccounts(accounts) {
  ensureDirectories();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
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
    status: 'Ready'
  };

  const accountDir = path.join(PROFILES_DIR, id);
  if (!fs.existsSync(accountDir)) {
    fs.mkdirSync(accountDir, { recursive: true });
  }

  accounts.push(newAccount);
  saveAccounts(accounts);
  return accounts;
}

function deleteAccount(id) {
  let accounts = getAccounts();
  accounts = accounts.filter(a => a.id !== id);
  saveAccounts(accounts);

  const accountDir = path.join(PROFILES_DIR, id);
  if (fs.existsSync(accountDir)) {
    try {
      fs.rmSync(accountDir, { recursive: true, force: true });
    } catch (e) {}
  }
  return accounts;
}

function openLoginWindow(accountId, onLoggedInCallback) {
  const puppeteer = require('puppeteer-core');
  const chromePath = getChromeExecutablePath();
  const profilePath = path.join(PROFILES_DIR, accountId);

  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }

  cleanStaleProfileLocks(profilePath);

  // Generate unique port for live CDP monitoring while Chrome is open
  const port = 9222 + Math.floor(Math.random() * 500);

  const args = [
    `--user-data-dir=${profilePath}`,
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    'https://labs.google/fx/tools/flow'
  ];

  try {
    const proc = spawn(chromePath, args);
    let pollInterval = null;
    let hasDetectedLogin = false;

    // Live Heartbeat Poller: Detects login in real time while user is inside Chrome!
    pollInterval = setInterval(async () => {
      if (hasDetectedLogin) return;
      try {
        const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });
        const pages = await browser.pages();
        const flowPage = pages.find(p => p.url().includes('labs.google'));
        
        if (flowPage) {
          const result = await flowPage.evaluate(async () => {
            try {
              const sessionResp = await fetch('/fx/api/auth/session');
              const session = await sessionResp.json();
              if (!session || !session.access_token) return null;
              
              const token = session.access_token;
              const email = session.user ? session.user.email : null;
              const name = session.user ? session.user.name : null;

              const credResp = await fetch('https://aisandbox-pa.googleapis.com/v1/credits?key=AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const credJson = await credResp.json();
              const credits = credJson.credits !== undefined ? credJson.credits : (credJson.subscriptionCredits !== undefined ? credJson.subscriptionCredits : 0);

              return { loggedIn: true, email, name, credits };
            } catch (e) { return null; }
          });

          if (result && result.loggedIn && result.email) {
            hasDetectedLogin = true;
            let accounts = getAccounts();
            const target = accounts.find(a => a.id === accountId);
            if (target) {
              target.credits = result.credits;
              target.email = result.email;
              target.googleName = result.name || target.name;
              target.status = 'Ready';
              target.lastChecked = new Date().toLocaleTimeString();
              saveAccounts(accounts);
            }
            if (onLoggedInCallback) {
              onLoggedInCallback({ success: true, account: target, accounts: getAccounts() });
            }
          }
        }
        await browser.disconnect();
      } catch (e) {
        // Chrome starting up or connecting
      }
    }, 2000);

    // Track when Chrome window is closed
    proc.on('close', async () => {
      if (pollInterval) clearInterval(pollInterval);
      await new Promise(r => setTimeout(r, 1200));
      cleanStaleProfileLocks(profilePath);
      
      const res = await fetchRealCredits(accountId);
      if (onLoggedInCallback) {
        onLoggedInCallback(res);
      }
    });

    proc.on('error', (err) => {
      if (pollInterval) clearInterval(pollInterval);
      console.error('Chrome spawn error:', err);
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getAccountProfilePath(accountId) {
  const profilePath = path.join(PROFILES_DIR, accountId);
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }
  return profilePath;
}

// ⚡ FETCH 100% OFFICIAL REAL CREDITS FROM GOOGLE FLOW AISANDBOX API
async function fetchRealCredits(accountId) {
  const puppeteer = require('puppeteer-core');
  const chromePath = getChromeExecutablePath();
  const profilePath = getAccountProfilePath(accountId);
  cleanStaleProfileLocks(profilePath);

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: chromePath,
      userDataDir: profilePath,
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'networkidle2', timeout: 30000 });

    const result = await page.evaluate(async () => {
      try {
        const sessionResp = await fetch('/fx/api/auth/session');
        const session = await sessionResp.json();
        if (!session || !session.access_token) {
          return { loggedIn: false };
        }
        const token = session.access_token;
        const email = session.user ? session.user.email : null;
        const name = session.user ? session.user.name : null;

        const credResp = await fetch('https://aisandbox-pa.googleapis.com/v1/credits?key=AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const credJson = await credResp.json();
        const credits = credJson.credits !== undefined ? credJson.credits : (credJson.subscriptionCredits !== undefined ? credJson.subscriptionCredits : 0);

        return {
          loggedIn: true,
          email,
          name,
          credits,
          status: credits > 0 ? 'Ready' : 'Exhausted'
        };
      } catch (e) {
        return { loggedIn: false, error: e.message };
      }
    });

    await browser.close();

    // Update account in accounts.json
    let accounts = getAccounts();
    const target = accounts.find(a => a.id === accountId);
    if (target) {
      if (result.loggedIn) {
        target.credits = result.credits;
        target.email = result.email || target.email;
        target.googleName = result.name || target.googleName;
        target.status = result.status;
        target.lastChecked = new Date().toLocaleTimeString();
      } else {
        target.status = 'Need Login';
        target.credits = 0;
      }
      saveAccounts(accounts);
    }
    return { success: true, account: target, accounts: getAccounts() };
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return { success: false, error: err.message, accounts: getAccounts() };
  }
}

async function refreshAllAccountCredits() {
  const accounts = getAccounts();
  for (const acc of accounts) {
    await fetchRealCredits(acc.id);
  }
  return getAccounts();
}

module.exports = {
  getAccounts,
  addAccount,
  deleteAccount,
  openLoginWindow,
  getAccountProfilePath,
  saveAccounts,
  fetchRealCredits,
  refreshAllAccountCredits
};
