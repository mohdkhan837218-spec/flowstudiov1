const fs = require('fs');
const path = require('path');
const os = require('os');

function getChromeUserDataDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Google', 'Chrome', 'User Data');
}

function getChromeExecutablePath() {
  try {
    const { dbService } = require('./db');
    const customPath = dbService.getSetting('chrome_path');
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }
  } catch (e) {}

  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

function detectChromeProfiles() {
  const userDataDir = getChromeUserDataDir();
  const profiles = [];

  if (!fs.existsSync(userDataDir)) {
    return profiles;
  }

  // Try reading Local State for friendly profile names
  const localStatePath = path.join(userDataDir, 'Local State');
  let profileInfoCache = {};
  if (fs.existsSync(localStatePath)) {
    try {
      const localStateContent = fs.readFileSync(localStatePath, 'utf8');
      const localState = JSON.parse(localStateContent);
      if (localState?.profile?.info_cache) {
        profileInfoCache = localState.profile.info_cache;
      }
    } catch (e) {
      console.warn('Could not parse Local State:', e.message);
    }
  }

  try {
    const entries = fs.readdirSync(userDataDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name;
        // Check for Default or Profile X
        if (dirName === 'Default' || dirName.startsWith('Profile ')) {
          const profilePath = path.join(userDataDir, dirName);
          const prefPath = path.join(profilePath, 'Preferences');
          
          let displayName = dirName;
          let email = '';

          // If Local State has metadata
          if (profileInfoCache[dirName]) {
            displayName = profileInfoCache[dirName].name || dirName;
            email = profileInfoCache[dirName].user_name || '';
          } else if (fs.existsSync(prefPath)) {
            try {
              const pref = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
              displayName = pref?.profile?.name || dirName;
              email = pref?.account_tracker_service_last_update?.accounts?.[0]?.email || '';
            } catch (e) {
              // use fallback
            }
          }

          profiles.push({
            id: dirName,
            dirName: dirName,
            displayName: displayName !== dirName ? `${displayName} (${dirName})` : dirName,
            email: email,
            path: profilePath,
            selected: true,
            status: 'Ready',
            credits: 'Unknown'
          });
        }
      }
    }
  } catch (err) {
    console.error('Error scanning profiles:', err);
  }

  // Sort: Default first, then Profile 1, 2, 3...
  profiles.sort((a, b) => {
    if (a.dirName === 'Default') return -1;
    if (b.dirName === 'Default') return 1;
    const numA = parseInt(a.dirName.replace('Profile ', ''), 10) || 999;
    const numB = parseInt(b.dirName.replace('Profile ', ''), 10) || 999;
    return numA - numB;
  });

  return profiles;
}

module.exports = {
  getChromeUserDataDir,
  getChromeExecutablePath,
  detectChromeProfiles
};
