const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const { execFile } = require('child_process');
const { getAccounts } = require('./accountStore');
const { cleanStaleProfileLocks } = require('./processHelper');
const { dbService } = require('./db');
const { FFmpegService } = require('./ffmpegService');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

// In-memory telemetry buffer of runtime errors with exact stage tracking
const runtimeErrors = [];

/**
 * Records a granular runtime error with stage, account, prompt, and recommended action.
 */
function recordRuntimeError({
  stage = 'Pipeline Execution',
  message = 'Unknown operational error',
  stack = '',
  accountName = 'N/A',
  accountEmail = 'N/A',
  promptText = 'N/A',
  suggestion = '',
  rawDetails = null
} = {}) {
  const errEntry = {
    id: 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    displayTime: new Date().toLocaleTimeString(),
    stage,
    message: String(message),
    stack: stack ? String(stack).substring(0, 1000) : '',
    accountName: String(accountName),
    accountEmail: String(accountEmail),
    promptText: promptText ? String(promptText).substring(0, 120) : 'N/A',
    suggestion: suggestion || getSuggestedFix(stage, message),
    rawDetails: rawDetails ? JSON.stringify(rawDetails, null, 2) : ''
  };

  runtimeErrors.unshift(errEntry);
  if (runtimeErrors.length > 40) {
    runtimeErrors.pop();
  }
  return errEntry;
}

function getSuggestedFix(stage, message) {
  const m = (message || '').toLowerCase();
  if (stage === 'Canvas Navigation' || m.includes('canvas') || m.includes('project')) {
    return 'Ensure your Google account is signed in and has access to Google Flow Studio. Check if a welcome banner is blocking the canvas.';
  }
  if (stage === 'Prompt Input' || m.includes('prosemirror') || m.includes('prompt')) {
    return 'Google Flow prompt box was not responsive. The editor has been auto-refocused. Re-submitting or restarting worker resolves this.';
  }
  if (stage === 'Video Generation' || m.includes('safety') || m.includes('policy')) {
    return 'Google Safety Filter flagged this prompt. Modify keywords to comply with Google GenAI policy.';
  }
  if (stage === 'Video Download & Save' || m.includes('download') || m.includes('save') || m.includes('folder')) {
    return 'Verify that your Download Directory exists and has write permissions. Check Storage Health in Diagnostics.';
  }
  if (stage === 'Account Auth' || m.includes('login') || m.includes('cookie') || m.includes('403')) {
    return 'Session expired. Go to Accounts tab and re-login or import fresh profile from Chrome.';
  }
  return 'Review the exact error trace, release profile locks in Diagnostics, or click 1-Click Auto-Heal.';
}

function getRuntimeErrors() {
  return [...runtimeErrors];
}

function clearRuntimeErrors() {
  runtimeErrors.length = 0;
  return { success: true };
}

/**
 * Pings a URL and returns latency, status, and reachability.
 */
function probeUrl(targetUrl, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    try {
      const urlObj = new URL(targetUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.request(
        targetUrl,
        {
          method: 'GET',
          timeout: timeoutMs,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        },
        (res) => {
          const latencyMs = Date.now() - startTime;
          res.on('data', () => {});
          res.on('end', () => {
            resolve({
              reachable: true,
              statusCode: res.statusCode,
              latencyMs,
              message: res.statusCode === 200 ? 'Connected (200 OK)' : `HTTP ${res.statusCode}`
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({
          reachable: false,
          statusCode: null,
          latencyMs: Date.now() - startTime,
          message: 'Connection timed out (> 6s)'
        });
      });

      req.on('error', (err) => {
        resolve({
          reachable: false,
          statusCode: null,
          latencyMs: Date.now() - startTime,
          message: err.message || 'Network error'
        });
      });

      req.end();
    } catch (e) {
      resolve({
        reachable: false,
        statusCode: null,
        latencyMs: 0,
        message: e.message
      });
    }
  });
}

/**
 * Verifies storage folder write permissions.
 */
function probeStorage(folderPath) {
  if (!folderPath) {
    folderPath = path.join(os.homedir(), 'Downloads', 'GoogleFlow_Videos');
  }

  const result = {
    folderPath,
    exists: false,
    writable: false,
    error: null
  };

  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    result.exists = true;

    const testFile = path.join(folderPath, `.probe_write_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.tmp`);
    fs.writeFileSync(testFile, 'write_test_ok');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      result.writable = true;
    }
  } catch (err) {
    result.error = err.message;
  }

  return result;
}

/**
 * Probes FFmpeg binary availability.
 */
function probeFFmpeg() {
  return new Promise((resolve) => {
    try {
      const ffmpegService = new FFmpegService();
      const ffmpegPath = ffmpegService.ffmpegPath || (FFmpegService.getFFmpegPath ? FFmpegService.getFFmpegPath() : 'ffmpeg');
      if (!ffmpegPath) {
        return resolve({
          available: false,
          version: null,
          path: null,
          message: 'FFmpeg binary not found'
        });
      }

      execFile(ffmpegPath, ['-version'], { timeout: 4000, windowsHide: true }, (error, stdout) => {
        if (error) {
          return resolve({
            available: false,
            version: null,
            path: ffmpegPath,
            message: error.message
          });
        }
        const firstLine = (stdout || '').split('\n')[0] || 'FFmpeg ready';
        resolve({
          available: true,
          version: firstLine.trim(),
          path: ffmpegPath,
          message: 'Available & Operational'
        });
      });
    } catch (err) {
      resolve({
        available: false,
        version: null,
        path: null,
        message: err.message
      });
    }
  });
}

/**
 * Checks all Google Accounts for profile locks, cookies, and credit levels.
 */
function checkAccountsHealth() {
  const accounts = getAccounts();
  const summary = {
    total: accounts.length,
    ready: 0,
    needLogin: 0,
    exhausted: 0,
    lockedCount: 0,
    totalCredits: 0,
    details: []
  };

  accounts.forEach((acc) => {
    const accDir = path.join(PROFILES_DIR, acc.dirName || acc.id);
    let isLocked = false;
    let hasCookies = false;
    let lockReason = null;

    if (fs.existsSync(accDir)) {
      const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
      const checkDirs = [accDir, path.join(accDir, 'Default')];
      if (acc.chromeProfileDir && acc.chromeProfileDir !== 'Default') {
        checkDirs.push(path.join(accDir, acc.chromeProfileDir));
      }

      for (const dir of checkDirs) {
        if (!fs.existsSync(dir)) continue;
        for (const name of lockNames) {
          const p = path.join(dir, name);
          if (fs.existsSync(p)) {
            isLocked = true;
            lockReason = `Lockfile present (${name})`;
            break;
          }
        }
        if (isLocked) break;
      }

      const cookiesPath1 = path.join(accDir, 'Default', 'Network', 'Cookies');
      const cookiesPath2 = path.join(accDir, 'Default', 'Cookies');
      const cookiesPath3 = acc.chromeProfileDir ? path.join(accDir, acc.chromeProfileDir, 'Network', 'Cookies') : null;
      hasCookies = fs.existsSync(cookiesPath1) || fs.existsSync(cookiesPath2) || (cookiesPath3 && fs.existsSync(cookiesPath3));
    }

    if (isLocked) summary.lockedCount++;

    const creds = typeof acc.credits === 'number' ? acc.credits : 0;
    summary.totalCredits += creds;

    if (acc.status === 'Exhausted' || (creds === 0 && acc.lastChecked && acc.lastChecked !== 'Imported from Chrome')) {
      summary.exhausted++;
    } else if (acc.status === 'Need Login' || (!hasCookies && !acc.email)) {
      summary.needLogin++;
    } else {
      summary.ready++;
    }

    summary.details.push({
      id: acc.id,
      name: acc.name,
      email: acc.email || 'No email',
      googleName: acc.googleName || acc.name,
      status: acc.status,
      credits: creds,
      isLocked,
      lockReason,
      hasCookies,
      chromeProfileDir: acc.chromeProfileDir || 'Default'
    });
  });

  return summary;
}

/**
 * Cleans up stale Chrome singleton locks across all profiles instantaneously.
 */
function releaseAllChromeLocks() {
  let cleaned = 0;
  if (!fs.existsSync(PROFILES_DIR)) return { success: true, cleanedCount: 0 };

  try {
    // 1. Instantly remove lockfiles across all profile folders (< 5ms)
    const entries = fs.readdirSync(PROFILES_DIR);
    for (const entry of entries) {
      const fullPath = path.join(PROFILES_DIR, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        cleanStaleProfileLocks(fullPath, false);
        cleaned++;
      }
    }

    // 2. Terminate any orphaned Chrome processes pointing to profiles in one single pass
    if (process.platform === 'win32') {
      try {
        const quotedProfilesDir = String(PROFILES_DIR).replace(/'/g, "''");
        const psScript = `
          $profilesDir = '${quotedProfilesDir}'
          $procs = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'"
          foreach ($p in $procs) {
            if ($p.CommandLine -and $p.CommandLine.IndexOf($profilesDir, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
              Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
            }
          }
        `;
        const { execFileSync } = require('child_process');
        execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'ignore', timeout: 3000 });
      } catch (err) {}
    }
  } catch (e) {
    console.warn('[releaseAllChromeLocks Error]:', e.message);
  }

  return { success: true, cleanedCount: cleaned };
}

/**
 * Analyzes failed prompts and queue tasks to diagnose exact problems.
 */
function analyzeQueueProblems() {
  let failedTasks = [];
  try {
    failedTasks = dbService.getFailedTasks() || [];
  } catch (e) {
    failedTasks = [];
  }

  const issues = [];
  failedTasks.slice(0, 20).forEach((task) => {
    const err = (task.error_reason || '').toLowerCase();
    let category = 'Unknown Error';
    let suggestion = 'Review execution logs and retry.';
    let severity = 'error';

    if (err.includes('safety') || err.includes('policy') || err.includes('violation')) {
      category = '🛡️ Google Prompt Safety Policy';
      suggestion = 'Prompt triggered Google GenAI content policy. Rephrase or remove sensitive keywords.';
      severity = 'warning';
    } else if (err.includes('dropped') || err.includes('rejected by server') || err.includes('generation tile') || err.includes('rejected')) {
      category = '⏱️ Canvas Generation Timeout';
      suggestion = 'Google Flow did not create a video card within 50s (Agent mode was active or server lagged). Agent mode is now auto-disabled; click Auto-Heal or Start Generation to retry.';
      severity = 'warning';
    } else if (err.includes('credit') || err.includes('exhausted') || err.includes('insufficient')) {
      category = '💳 Account Credits Exhausted';
      suggestion = 'This account has 0 credits. Add another account or wait for the daily quota reset.';
      severity = 'error';
    } else if (err.includes('processsingleton') || err.includes('lock file') || err.includes('ebusy')) {
      category = '🔒 Chrome Profile Lock Conflict';
      suggestion = 'Chrome was open during generation. Close the Chrome browser window and click "Release Chrome Locks".';
      severity = 'warning';
    } else if (err.includes('timeout') || err.includes('waiting')) {
      category = '⏱️ Generation Timeout';
      suggestion = 'Google Flow servers took too long to respond. The system will automatically retry with an active account.';
      severity = 'warning';
    } else if (err.includes('login') || err.includes('sign in') || err.includes('auth')) {
      category = '🔑 Account Login Required';
      suggestion = 'Google session expired. Click "Sign In" on the account card to refresh authentication.';
      severity = 'error';
    }

    issues.push({
      id: task.id,
      promptText: task.prompt_text,
      promptIndex: task.prompt_index,
      assignedAccount: task.assigned_account_name || 'Unassigned',
      rawError: task.error_reason,
      category,
      suggestion,
      severity,
      createdAt: task.created_at
    });
  });

  return {
    totalFailed: failedTasks.length,
    issues
  };
}

/**
 * Runs full 5-pillar health audit.
 */
async function runFullHealthCheck(downloadFolder = null) {
  const timestamp = new Date().toLocaleTimeString();

  // 1. Accounts & Sessions
  const accountsHealth = checkAccountsHealth();

  // 2. Network & Google Flow Reachability
  const networkHealth = await probeUrl('https://flow.google.com/', 6000);

  // 3. Storage & Download Permissions
  const storageHealth = probeStorage(downloadFolder);

  // 4. FFmpeg Media Engine
  const ffmpegHealth = await probeFFmpeg();

  // 5. Queue & Prompt Safety Analysis
  const queueHealth = analyzeQueueProblems();

  // Overall Status Calculation
  let overallStatus = 'healthy'; // 'healthy' | 'warning' | 'critical'
  const alerts = [];

  if (!networkHealth.reachable) {
    overallStatus = 'critical';
    alerts.push({
      pillar: 'network',
      title: 'Google Flow Servers Unreachable',
      description: `Cannot connect to flow.google.com: ${networkHealth.message}. Check your internet connection or proxy.`,
      action: 'Check Network'
    });
  }

  if (accountsHealth.total === 0) {
    if (overallStatus !== 'critical') overallStatus = 'warning';
    alerts.push({
      pillar: 'accounts',
      title: 'No Google Accounts Connected',
      description: 'You need at least one logged-in Google Account to generate AI videos.',
      action: 'Add Account'
    });
  } else if (accountsHealth.ready === 0) {
    overallStatus = 'critical';
    alerts.push({
      pillar: 'accounts',
      title: 'No Ready Accounts (0 Available Credits)',
      description: 'All connected accounts either need login or have exhausted their credit quota.',
      action: 'Check Accounts'
    });
  }

  if (accountsHealth.lockedCount > 0) {
    if (overallStatus === 'healthy') overallStatus = 'warning';
    alerts.push({
      pillar: 'accounts',
      title: `${accountsHealth.lockedCount} Chrome Profile(s) Locked`,
      description: 'Chrome was left open or exited uncleanly. Click "Release Chrome Locks" to fix.',
      action: 'Release Locks'
    });
  }

  if (!storageHealth.writable) {
    overallStatus = 'critical';
    alerts.push({
      pillar: 'storage',
      title: 'Download Folder Not Writable',
      description: `Cannot write video files to "${storageHealth.folderPath}": ${storageHealth.error || 'Access Denied'}.`,
      action: 'Change Folder'
    });
  }

  if (!ffmpegHealth.available) {
    if (overallStatus === 'healthy') overallStatus = 'warning';
    alerts.push({
      pillar: 'ffmpeg',
      title: 'FFmpeg Not Available',
      description: ffmpegHealth.message,
      action: 'Verify FFmpeg'
    });
  }

  if (queueHealth.totalFailed > 0) {
    if (overallStatus === 'healthy') overallStatus = 'warning';
    alerts.push({
      pillar: 'queue',
      title: `${queueHealth.totalFailed} Failed Tasks in Queue`,
      description: 'Some prompts failed during generation. Click "Auto-Heal System" or inspect the issue details below.',
      action: 'Inspect Issues'
    });
  }

  return {
    timestamp,
    overallStatus,
    alerts,
    pillars: {
      accounts: accountsHealth,
      network: networkHealth,
      storage: storageHealth,
      ffmpeg: ffmpegHealth,
      queue: queueHealth
    },
    runtimeErrors: getRuntimeErrors()
  };
}

/**
 * 1-Click Auto-Heal Action.
 */
async function autoHealSystem(downloadFolder = null) {
  // 1. Clean locks
  const lockResult = releaseAllChromeLocks();

  // 2. Re-queue failed tasks that were due to transient lock/network issues
  let retriedCount = 0;
  try {
    const failedTasks = dbService.getFailedTasks() || [];
    const transientIds = failedTasks
      .filter(t => {
        const err = (t.error_reason || '').toLowerCase();
        return err.includes('lock') || err.includes('timeout') || err.includes('singleton') || err.includes('network') || err.includes('dropped') || err.includes('rejected') || err.includes('generation tile');
      })
      .map(t => t.id);

    if (transientIds.length > 0) {
      dbService.retryFailedTasks(transientIds);
      retriedCount = transientIds.length;
    }
  } catch (e) {}

  // 3. Run fresh health check
  const health = await runFullHealthCheck(downloadFolder);

  return {
    success: true,
    message: `System auto-healed! Released ${lockResult.cleanedCount} profile locks. Re-queued ${retriedCount} recoverable tasks.`,
    health
  };
}

module.exports = {
  runFullHealthCheck,
  releaseAllChromeLocks,
  autoHealSystem,
  checkAccountsHealth,
  probeUrl,
  probeStorage,
  probeFFmpeg,
  recordRuntimeError,
  getRuntimeErrors,
  clearRuntimeErrors
};
