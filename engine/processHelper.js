const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function cleanStaleProfileLocks(profilePath) {
  // 1. Terminate only Chrome instances for this exact Flow profile. The former
  // `*profiles*` check could also close unrelated Chrome windows using a profile.
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
    execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'ignore', timeout: 5000 });
  } catch (e) {}

  // 2. Remove lock files
  try {
    ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'].forEach(file => {
      const p = path.join(profilePath, file);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (err) {}
      }
    });
  } catch (e) {}
}

module.exports = { cleanStaleProfileLocks };
