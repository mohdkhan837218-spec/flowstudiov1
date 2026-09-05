const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testInspectAllMediaAndDownload() {
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

  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('1. Finding all media tiles on the entire canvas...');
  const mediaTiles = await page.evaluate(() => {
    // Media tiles in Google Flow have images/videos and a small icon/menu in corner
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const r = el.getBoundingClientRect();
      const hasImgOrVideo = el.querySelector('img, video, canvas, svg');
      return r.width > 150 && r.height > 100 && r.y < window.innerHeight - 150 && r.x > 200 && hasImgOrVideo;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
      };
    });
    return elements;
  });

  console.log('Found Media Tiles:', mediaTiles.slice(0, 5));

  if (mediaTiles.length > 0) {
    const tile = mediaTiles[0];
    console.log('Hovering on top-left of tile:', tile.rect);
    await page.mouse.move(tile.rect.x + tile.rect.width / 2, tile.rect.y + tile.rect.height / 2);
    await new Promise(r => setTimeout(r, 1000));

    // Right-click or check buttons
    console.log('2. Right-clicking the video tile to test context menu...');
    await page.mouse.click(tile.rect.x + tile.rect.width / 2, tile.rect.y + tile.rect.height / 2, { button: 'right' });
    await new Promise(r => setTimeout(r, 1000));

    const rightClickMenu = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="menuitem"], div, span, button')).filter(el => {
        const txt = (el.innerText || '').trim();
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 15 && (txt.includes('Download') || txt.includes('Delete') || txt.includes('Duplicate') || txt.includes('Copy'));
      }).map(el => ({
        text: el.innerText.trim(),
        rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }
      }));
    });

    console.log('Right-click context menu options:', rightClickMenu);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testInspectAllMediaAndDownload().catch(console.error);
