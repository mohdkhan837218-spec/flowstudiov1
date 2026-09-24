const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Instantly terminates a process and all its child processes on Windows
 * using native taskkill (10ms execution, 0 PowerShell lag).
 */
function killProcessTree(pid) {
  if (!pid || typeof pid !== 'number') return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore', timeout: 3000 });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch (e) {}
}

function cleanStaleProfileLocks(profilePath, killChrome = true) {
  if (!profilePath || typeof profilePath !== 'string') return;

  // 1. Safely remove Chromium lock files immediately from root and all profile subdirectories
  try {
    const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
    const checkDirs = [profilePath, path.join(profilePath, 'Default')];

    if (fs.existsSync(profilePath)) {
      try {
        const subdirs = fs.readdirSync(profilePath);
        for (const sub of subdirs) {
          if (sub.startsWith('Profile')) {
            checkDirs.push(path.join(profilePath, sub));
          }
        }
      } catch (e) {}
    }

    for (const d of checkDirs) {
      if (!fs.existsSync(d)) continue;
      for (const file of lockNames) {
        const p = path.join(d, file);
        if (fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (err) {}
        }
      }
    }
  } catch (e) {}

  // 2. Terminate Chrome instances for this exact profile if requested
  if (killChrome && process.platform === 'win32') {
    try {
      const quotedProfilePath = String(profilePath).replace(/'/g, "''");
      const psScript = `
        $targetProfile = '${quotedProfilePath}'
        $procs = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'"
        foreach ($p in $procs) {
          if ($p.CommandLine -and $p.CommandLine.IndexOf($targetProfile, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
          }
        }
      `;
      execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'ignore', timeout: 3000 });
    } catch (e) {}
  }
}

module.exports = { cleanStaleProfileLocks, killProcessTree };

