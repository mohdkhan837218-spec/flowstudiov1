const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');
const { FlowAutomationEngine } = require('./flowAutomation');

async function testFullSettingsSync() {
  console.log('Testing full settings synchronization with flowAutomation engine...');

  const engine = new FlowAutomationEngine({
    onLog: (data) => console.log(`[LOG] ${data.message}`),
    onProgress: (data) => console.log(`[PROGRESS]`, data)
  });

  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads', 'GoogleFlow_Videos');

  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 2000));

  const account = { id: 'acc_1', name: 'Google Account 1' };
  const launched = await engine.launchBrowserForAccount(account, downloadDir);
  if (!launched) {
    console.error('Failed to launch browser');
    return;
  }

  await engine.openFlowStudio();

  const settingsToApply = {
    model: 'Omni Flash',
    duration: '6s',
    aspectRatio: '9:16',
    quality: '720p'
  };

  console.log('Applying settings:', settingsToApply);
  await engine.configureGenerationSettings(settingsToApply);

  // Check pill on canvas
  const pillResult = await engine.page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const p = btns.find(b => {
      const r = b.getBoundingClientRect();
      return r.top > (window.innerHeight - 200) && r.right > (window.innerWidth / 3) && (b.innerText.includes('Video') || b.getAttribute('aria-haspopup'));
    });
    return p ? p.innerText.replace(/\n/g, ' ') : null;
  });

  console.log('==============================================');
  console.log('FINAL VERIFIED PILL ON CANVAS:', pillResult);
  console.log('==============================================');

  await new Promise(r => setTimeout(r, 5000));
  await engine.closeBrowser();
}

testFullSettingsSync().catch(console.error);
