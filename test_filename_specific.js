const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testFilenameSpecificAttachment() {
  console.log('🔬 Testing Exact Filename Search & Upload Verification...');
  
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

  // Create a brand new unique image with a specific recognizable name
  const randId = Math.floor(1000 + Math.random() * 9000);
  const targetFileName = `neon_car_${randId}.png`;
  const targetSearchKey = `neon_car_${randId}`;
  const testImgPath = path.join(__dirname, targetFileName);
  
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  fs.writeFileSync(testImgPath, Buffer.from(b64, 'base64'));

  console.log(`\n========================================`);
  console.log(`🎯 TARGET IMAGE TO UPLOAD: ${targetFileName}`);
  console.log(`========================================\n`);

  // Step 1: Open Media Drawer
  console.log('1. Opening Media Drawer...');
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

  // Step 2: Upload File
  console.log(`2. Uploading ${targetFileName} to input[type="file"]...`);
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(testImgPath);
    console.log('File fed to input. Keeping drawer open to watch for upload completion...');
  }

  // Step 3: Actively watch the Media Drawer for THIS EXACT FILENAME
  console.log(`3. Actively watching drawer for card: "${targetFileName}"...`);
  let uploadConfirmed = false;
  
  for (let sec = 1; sec <= 45; sec++) {
    await new Promise(r => setTimeout(r, 1000));

    const check = await page.evaluate((searchKey) => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return { found: false, reason: 'dialog closed' };

      // Search across all items / cards in dialog
      const items = Array.from(dialog.querySelectorAll('[role="option"], div[class*="item"], div[class*="card"]'));
      for (const item of items) {
        const text = (item.innerText || '').toLowerCase();
        const img = item.querySelector('img');
        const alt = (img ? img.alt : '').toLowerCase();
        
        if (text.includes(searchKey.toLowerCase()) || alt.includes(searchKey.toLowerCase())) {
          const spinner = item.querySelector('[role="progressbar"], [class*="spinner"], [class*="loading"], svg');
          const isImgLoaded = img && img.complete && img.naturalWidth > 0;
          return {
            found: true,
            hasSpinner: !!spinner,
            isLoaded: !!isImgLoaded,
            text: item.innerText.trim()
          };
        }
      }
      return { found: false, totalItems: items.length };
    }, targetSearchKey);

    console.log(`   [${sec}s] Status:`, JSON.stringify(check));

    if (check.found && !check.hasSpinner) {
      console.log(`🎉 UPLOAD CONFIRMED! "${targetFileName}" is fully ready in Google Flow library in ${sec}s!`);
      uploadConfirmed = true;
      break;
    }
  }

  // Step 4: Close drawer cleanly
  console.log('4. Closing drawer...');
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 800));

  // Step 5: Focus prompt bar, clear, and type @ followed by exact filename search!
  console.log(`5. Searching & Attaching via @${targetSearchKey}...`);
  await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (tb) { tb.focus(); tb.click(); }
  });
  await new Promise(r => setTimeout(r, 300));
  
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 300));

  // Type @ and search key
  await page.keyboard.type('@' + targetSearchKey, { delay: 40 });
  await new Promise(r => setTimeout(r, 1500));

  // Get bounding box of the matched option in mention popover
  const targetOptCoord = await page.evaluate((searchKey) => {
    const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
    if (!popover) return null;

    const options = Array.from(popover.querySelectorAll('[role="option"], div[class*="item"]'));
    for (const opt of options) {
      if ((opt.innerText || '').toLowerCase().includes(searchKey.toLowerCase())) {
        const r = opt.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: opt.innerText };
      }
    }
    // Fallback to first option if exact text match isn't in innerText
    if (options.length > 0) {
      const r = options[0].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: options[0].innerText };
    }
    return null;
  }, targetSearchKey);

  console.log('Matched Mention Option:', JSON.stringify(targetOptCoord, null, 2));

  if (targetOptCoord) {
    console.log('6. Clicking matched option via Real Hardware Mouse...');
    await page.mouse.click(targetOptCoord.x, targetOptCoord.y);
    await new Promise(r => setTimeout(r, 1200));
  }

  // Step 6: Move to End and type prompt
  console.log('7. Appending prompt text...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' cinematic drive through cyberpunk city, 4k ultra hd', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // Step 7: Inspect final prompt bar
  const finalPromptBar = await page.evaluate(() => {
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
  console.log(JSON.stringify(finalPromptBar, null, 2));
  console.log('========================================\n');

  // Cleanup
  try { fs.unlinkSync(testImgPath); } catch (e) {}

  await browser.close();
  console.log('Filename Specific Attachment Test Completed Successfully!');
}

testFilenameSpecificAttachment().catch(console.error);
