const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testTileClickDownload() {
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

  console.log('1. Clicking on the most recent video tile on canvas...');
  // Video tiles are at top-left grid (x: ~400, y: ~200)
  await page.mouse.click(400, 200);
  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Inspecting all Download buttons / actions on screen...');
  const downloadButtons = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, a, div[role="button"], span')).filter(el => {
      const txt = (el.innerText || '').trim();
      const aria = el.getAttribute('aria-label') || '';
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 20 && (txt.includes('Download') || aria.includes('Download') || el.innerHTML.includes('download') || el.innerHTML.includes('arrow_downward') || el.innerHTML.includes('more_vert'));
    }).map(el => ({
      tag: el.tagName,
      text: (el.innerText || '').trim(),
      aria: el.getAttribute('aria-label') || '',
      rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) },
      outerHTML: el.outerHTML.substring(0, 150)
    }));

    return all;
  });

  console.log('Download Buttons Found:', JSON.stringify(downloadButtons, null, 2));

  const dlBtn = downloadButtons.find(b => b.text.includes('Download') || b.aria.includes('Download') || b.outerHTML.includes('download'));
  if (dlBtn) {
    console.log('Clicking Download Button:', dlBtn);
    await page.mouse.click(dlBtn.rect.x + dlBtn.rect.width / 2, dlBtn.rect.y + dlBtn.rect.height / 2);
    await new Promise(r => setTimeout(r, 1000));

    // Check if quality picker opened (720p / 1080p)
    const qualityOption = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('*')).filter(el => {
        const txt = (el.innerText || '').trim();
        const r = el.getBoundingClientRect();
        return (txt === '720p' || txt.includes('720p') || txt.includes('Original') || txt === '1080p') && r.height > 15 && r.height < 60;
      });
      if (items.length > 0) {
        const r = items[0].getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: items[0].innerText };
      }
      return null;
    });

    console.log('Quality option:', qualityOption);
    if (qualityOption) {
      await page.mouse.click(qualityOption.x, qualityOption.y);
      console.log('Clicked Quality Option!');
    }

    console.log('Waiting 8s for download to complete...');
    await new Promise(r => setTimeout(r, 8000));

    const files = fs.readdirSync(downloadDir);
    console.log('FILES IN MASTER DOWNLOAD FOLDER:\n', files);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testTileClickDownload().catch(console.error);
