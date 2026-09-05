const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testDirectBufferDownload() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads', 'GoogleFlow_Videos');

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 2000));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    pipe: true,
    args: [
      `--user-data-dir=${targetDir}`,
      '--start-maximized',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0];

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('1. Finding latest video URL on canvas...');
  const latestVideoUrl = await page.evaluate(() => {
    const vids = Array.from(document.querySelectorAll('video'));
    return vids.length > 0 ? (vids[0].src || vids[0].currentSrc) : null;
  });

  console.log('Latest Video URL:', latestVideoUrl);

  if (latestVideoUrl) {
    console.log('2. Fetching video buffer directly inside authenticated browser session...');
    const base64Data = await page.evaluate(async (url) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        return null;
      }
    }, latestVideoUrl);

    if (base64Data) {
      const fileName = `google_flow_${Date.now()}.mp4`;
      const fullPath = path.join(downloadDir, fileName);
      fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
      console.log(`🎉 SUCCESS! Video saved directly to: ${fullPath}`);
      console.log(`File Size: ${(fs.statSync(fullPath).size / (1024 * 1024)).toFixed(2)} MB`);
    } else {
      console.log('Failed to fetch base64 data.');
    }
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testDirectBufferDownload().catch(console.error);
