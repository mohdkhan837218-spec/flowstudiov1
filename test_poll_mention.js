const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testBackgroundUploadAndAtMention() {
  console.log('🔬 Testing Background Upload ➡️ @ Mention Detection...');
  
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

  // Create test image
  const uniqueName = `flow_asset_${Date.now()}.png`;
  const testImgPath = path.join(__dirname, uniqueName);
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  fs.writeFileSync(testImgPath, Buffer.from(b64, 'base64'));

  console.log(`1. Uploading ${uniqueName} via + button...`);
  // Open Add Asset
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const plusBtn = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('add_2') || txt === '+' || aria.includes('add asset') || aria.includes('upload');
    });
    if (plusBtn) plusBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(testImgPath);
    console.log('File uploaded to input. Waiting for Google Flow server processing...');
  }

  // Close any drawer if open
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // Now, poll @ mention in prompt bar until the file appears in the mention list!
  console.log('2. Polling @ mention list for newly uploaded file...');
  let chipAttached = false;
  
  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    
    // Focus and type @
    await page.evaluate(() => {
      const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
      if (tb) { tb.focus(); tb.click(); }
    });
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 200));

    await page.keyboard.type('@', { delay: 40 });
    await new Promise(r => setTimeout(r, 1200));

    // Check if the newly uploaded file appears in the mention popover
    const matchStatus = await page.evaluate((targetFile) => {
      const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
      if (!popover) return { found: false, reason: 'no popover' };
      
      const options = Array.from(popover.querySelectorAll('[role="option"], div[class*="item"]'));
      for (const opt of options) {
        if ((opt.innerText || '').toLowerCase().includes(targetFile.toLowerCase())) {
          // Click this exact option!
          opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          opt.click();
          return { found: true, text: opt.innerText };
        }
      }
      return { found: false, count: options.length, firstFew: options.slice(0, 3).map(o => o.innerText) };
    }, uniqueName);

    console.log(`Poll ${attempt} (after ${attempt * 2}s):`, JSON.stringify(matchStatus));

    if (matchStatus.found) {
      console.log(`🎉 MATCH FOUND! "${uniqueName}" appeared in Google Flow and was clicked!`);
      chipAttached = true;
      break;
    } else {
      // If not found yet, close popover and retry next second
      await page.keyboard.press('Escape');
    }
  }

  // Type prompt text
  if (chipAttached) {
    await page.keyboard.press('End');
    await new Promise(r => setTimeout(r, 200));
    await page.keyboard.type(' beautiful cinematic animation of this character, 4k ultra hd', { delay: 20 });
    await new Promise(r => setTimeout(r, 1000));
  }

  const finalCheck = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      text: tb ? tb.innerText : '',
      html: tb ? tb.innerHTML : ''
    };
  });
  console.log('Final Prompt Bar State:', JSON.stringify(finalCheck, null, 2));

  // Cleanup
  try { fs.unlinkSync(testImgPath); } catch (e) {}

  await browser.close();
}

testBackgroundUploadAndAtMention().catch(console.error);
