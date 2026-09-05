const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testExactSearchDualFrames() {
  console.log('🔬 Testing Exact Search Mention Selection for 2 Different Frame Images...');
  
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

  // Create 2 completely different unique files
  const rand1 = Math.floor(1000 + Math.random() * 9000);
  const rand2 = Math.floor(1000 + Math.random() * 9000);
  const name1 = `alpha_start_${rand1}.png`;
  const name2 = `omega_end_${rand2}.png`;
  const key1 = `alpha_start_${rand1}`;
  const key2 = `omega_end_${rand2}`;

  const path1 = path.join(__dirname, name1);
  const path2 = path.join(__dirname, name2);

  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  fs.writeFileSync(path1, Buffer.from(b64, 'base64'));
  fs.writeFileSync(path2, Buffer.from(b64, 'base64'));

  // Step 1: Upload Both Files
  console.log(`1. Uploading Start Frame: ${name1}...`);
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

  let fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(path1);
    console.log('File 1 fed to input. Waiting 4s...');
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log(`2. Uploading End Frame: ${name2}...`);
  fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(path2);
    console.log('File 2 fed to input. Waiting 4s...');
    await new Promise(r => setTimeout(r, 4000));
  }

  // Close drawer
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 800));

  // Step 2: Clear Prompt Bar
  console.log('3. Clearing prompt bar...');
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

  // Step 3: Attach First File via @ + exact search key!
  console.log(`4. Attaching First File via @${key1}...`);
  await page.keyboard.type('@' + key1, { delay: 40 });
  await new Promise(r => setTimeout(r, 1500));
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1200));

  // Move to End and add space
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' ', { delay: 20 });
  await new Promise(r => setTimeout(r, 300));

  // Step 4: Attach Second File via @ + exact search key!
  console.log(`5. Attaching Second File via @${key2}...`);
  await page.keyboard.type('@' + key2, { delay: 40 });
  await new Promise(r => setTimeout(r, 1500));
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1200));

  // Move to End & append prompt
  console.log('6. Appending prompt text after both chips...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' smooth morph from alpha start to omega end 4k', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // Step 5: Final Check
  const finalCheck = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const chips = Array.from(tb ? tb.querySelectorAll('[data-slate-inline="true"], [contenteditable="false"]') : []);
    return {
      chipCount: chips.length,
      chipTexts: chips.map(c => c.innerText.trim()).filter(Boolean),
      fullPromptText: tb ? tb.innerText.trim() : '',
      html: tb ? tb.innerHTML : ''
    };
  });

  console.log('\n========================================');
  console.log('EXACT SEARCH DUAL FRAMES RESULT:');
  console.log(JSON.stringify(finalCheck, null, 2));
  console.log('========================================\n');

  try { fs.unlinkSync(path1); } catch (e) {}
  try { fs.unlinkSync(path2); } catch (e) {}

  await browser.close();
}

testExactSearchDualFrames().catch(console.error);
