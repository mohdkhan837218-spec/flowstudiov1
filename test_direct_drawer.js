const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testDirectDrawerInsert() {
  console.log('🔬 Testing Direct Drawer Click Insertion (No @ Mention Required)...');
  
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
  const testImgName = `robot_portrait_${randNum}.png`;
  const testImgPath = path.join(__dirname, testImgName);
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  fs.writeFileSync(testImgPath, Buffer.from(b64, 'base64'));

  console.log('1. Clearing prompt bar...');
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

  console.log('2. Opening Media Drawer via + button...');
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

  console.log('3. Uploading file to input[type="file"]...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(testImgPath);
    console.log('Uploaded. Watching drawer for card to finish loading...');
  }

  // Wait for card in drawer
  let cardCoord = null;
  for (let s = 1; s <= 20; s++) {
    await new Promise(r => setTimeout(r, 1000));
    
    cardCoord = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return null;
      const firstCard = dialog.querySelector('[role="option"], div[class*="item"]');
      if (firstCard) {
        const spinner = firstCard.querySelector('[role="progressbar"], [class*="spinner"], [class*="loading"], svg');
        if (!spinner) {
          const r = firstCard.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: firstCard.innerText };
        }
      }
      return null;
    });

    if (cardCoord && s >= 2) {
      console.log(`✓ Card ready in drawer at second ${s}:`, JSON.stringify(cardCoord));
      break;
    }
  }

  if (cardCoord) {
    console.log('4. Clicking card directly in drawer with real mouse...');
    await page.mouse.click(cardCoord.x, cardCoord.y);
    await new Promise(r => setTimeout(r, 1500));
  }

  // Check if drawer is still open and close it if so
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // Type prompt text
  console.log('5. Appending prompt text...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' robot walking through neon city, 4k ultra hd video', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // Final check
  const finalCheck = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const chip = tb ? tb.querySelector('[data-slate-inline="true"], [contenteditable="false"]') : null;
    return {
      hasChip: !!chip,
      chipText: chip ? chip.innerText.trim() : null,
      fullText: tb ? tb.innerText.trim() : '',
      html: tb ? tb.innerHTML : ''
    };
  });

  console.log('\n========================================');
  console.log('DIRECT DRAWER ATTACHMENT RESULT:');
  console.log(JSON.stringify(finalCheck, null, 2));
  console.log('========================================\n');

  try { fs.unlinkSync(testImgPath); } catch (e) {}

  await browser.close();
}

testDirectDrawerInsert().catch(console.error);
