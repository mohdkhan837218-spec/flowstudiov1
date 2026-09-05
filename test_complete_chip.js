const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testCompleteChipAndPrompt() {
  console.log('🔬 Testing End-to-End Image Upload + Chip Attachment + Prompt Submission...');
  
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

  // Create unique image
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const testImgName = `hero_character_${randNum}.png`;
  const testImgPath = path.join(__dirname, testImgName);
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  fs.writeFileSync(testImgPath, Buffer.from(b64, 'base64'));

  // 1. Open Drawer & Upload
  console.log('1. Opening Drawer & Uploading image...');
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
    console.log('Uploaded to input. Waiting 3s for indexing...');
    await new Promise(r => setTimeout(r, 3000));
  }

  // Close drawer
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 600));

  // 2. Focus prompt bar, clear, and type @
  console.log('2. Attaching chip via @ mention...');
  await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (tb) { tb.focus(); tb.click(); }
  });
  await new Promise(r => setTimeout(r, 200));

  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 200));

  await page.keyboard.type('@', { delay: 50 });
  await new Promise(r => setTimeout(r, 1200));

  // 3. Click first mention option with hardware mouse
  const optCoord = await page.evaluate(() => {
    const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
    if (popover) {
      const firstOpt = popover.querySelector('[role="option"], div[class*="item"]');
      if (firstOpt) {
        const r = firstOpt.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
    }
    return null;
  });

  if (optCoord) {
    console.log('Clicking mention option with mouse at:', optCoord);
    await page.mouse.click(optCoord.x, optCoord.y);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 4. Type prompt text WITHOUT clicking the center of the textbox
  console.log('3. Typing prompt text after chip...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' cinematic slow-motion walking scene, 4k ultra hd', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // 5. Verify final prompt bar
  const finalCheck = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const chip = tb ? tb.querySelector('[data-slate-inline="true"], [contenteditable="false"]') : null;
    return {
      hasChip: !!chip,
      chipText: chip ? chip.innerText.trim() : null,
      fullPromptText: tb ? tb.innerText.trim() : '',
      html: tb ? tb.innerHTML : ''
    };
  });

  console.log('\n========================================');
  console.log('FINAL PROMPT BAR VERIFICATION:');
  console.log(JSON.stringify(finalCheck, null, 2));
  console.log('========================================\n');

  try { fs.unlinkSync(testImgPath); } catch (e) {}

  await browser.close();
}

testCompleteChipAndPrompt().catch(console.error);
