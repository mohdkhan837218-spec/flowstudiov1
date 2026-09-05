const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function inspect2kBehavior() {
  const profilePath = getAccountProfilePath('acc_2');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('trpc') || url.includes('media') || url.includes('download')) {
      console.log(`[API RESPONSE]: ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`  BODY: ${text.substring(0, 150)}`);
      } catch (e) {}
    }
  });

  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await sleep(5000);
  }

  // Hover tile
  await page.mouse.move(324, 156);
  await sleep(800);

  // Click 3 dots
  await page.mouse.click(380, 100);
  await sleep(800);

  // Hover Download
  await page.mouse.move(381, 318);
  await sleep(800);

  // Click 2K
  console.log('CLICKING 2K UPSCALED...');
  await page.mouse.click(547, 396);
  await sleep(3000);

  // Check DOM state: Are there any modals, toasts, or new rendering tiles?
  const domInfo = await page.evaluate(() => {
    const toasts = Array.from(document.querySelectorAll('[role="status"], [class*="toast"], [class*="alert"], [class*="notification"]')).map(t => t.innerText);
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [class*="modal"]')).map(d => d.innerText);
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]')).map(t => t.innerText);
    return { toasts, dialogs, tilesCount: tiles.length, newestTileText: tiles[0] };
  });

  console.log('DOM INFO AFTER 2K CLICK:', JSON.stringify(domInfo, null, 2));

  await sleep(10000);
  await browser.close();
}

inspect2kBehavior().catch(console.error);
