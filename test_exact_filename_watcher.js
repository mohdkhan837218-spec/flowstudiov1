const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testExactFilenameWatcher() {
  console.log('🔬 Testing Exact Filename Upload Watcher on Google Flow...');
  
  const profilePath = getAccountProfilePath('acc_2');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    args: ['--start-maximized', '--no-first-run', '--no-default-browser-check']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 5000));
  }

  // Create a uniquely named test image
  const uniqueName = `test_img_${Date.now()}.png`;
  const testImgPath = path.join(__dirname, uniqueName);
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  fs.writeFileSync(testImgPath, Buffer.from(b64, 'base64'));

  console.log(`1. Uploading unique file: ${uniqueName}...`);
  
  // Open drawer
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const plusBtn = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('add_2') || txt === '+' || aria.includes('add asset') || aria.includes('upload');
    });
    if (plusBtn) plusBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(testImgPath);
    console.log('Uploaded to input[type="file"]. Now actively watching for exact filename on server...');
  }

  // Actively wait for THAT EXACT filename to finish uploading on Google Flow
  let found = false;
  for (let s = 1; s <= 45; s++) {
    await new Promise(r => setTimeout(r, 1000));
    
    const status = await page.evaluate((targetName) => {
      const cleanTarget = targetName.toLowerCase();
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return { found: false, reason: 'no dialog' };
      
      const cards = Array.from(dialog.querySelectorAll('[role="option"], div[class*="item"], div[class*="card"]'));
      for (const card of cards) {
        const cardText = (card.innerText || '').toLowerCase();
        const img = card.querySelector('img');
        const altText = (img ? img.alt : '').toLowerCase();
        
        if (cardText.includes(cleanTarget) || altText.includes(cleanTarget)) {
          const hasSpinner = card.querySelector('[role="progressbar"], [class*="spinner"], [class*="loading"], svg');
          const isImgReady = img && img.complete && img.naturalWidth > 0;
          return {
            found: true,
            hasSpinner: !!hasSpinner,
            isImgReady: !!isImgReady,
            cardText: card.innerText.trim()
          };
        }
      }
      return { found: false, totalCards: cards.length };
    }, uniqueName);

    console.log(`Second ${s}:`, JSON.stringify(status));
    if (status.found && !status.hasSpinner && status.isImgReady) {
      console.log(`🎉 MATCH FOUND! Image "${uniqueName}" is 100% ready on server after ${s}s!`);
      found = true;
      break;
    }
  }

  // Cleanup dummy file
  try { fs.unlinkSync(testImgPath); } catch (e) {}

  await browser.close();
  console.log('Test completed. Found result:', found);
}

testExactFilenameWatcher().catch(console.error);
