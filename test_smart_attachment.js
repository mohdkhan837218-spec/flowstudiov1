const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testSmartAttachment() {
  console.log('🔬 Testing Smart Attachment & Prompting...');
  
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

  // 1. Focus prompt textbox and clear any old text (preserving nothing)
  console.log('1. Focusing prompt bar...');
  await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (tb) { tb.focus(); tb.click(); }
  });
  await new Promise(r => setTimeout(r, 300));

  // Select all and clear
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 300));

  // 2. Attach Image Chip via @ Mention
  console.log('2. Attaching Reference Image Chip via @ mention...');
  await page.keyboard.type('@', { delay: 50 });
  await new Promise(r => setTimeout(r, 1200));

  // Press enter to select first option in list
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 800));

  // 3. Move cursor to End and type prompt text
  console.log('3. Typing prompt text after image chip...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' a futuristic cyberpunk city with neon lights and flying cars', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Verify prompt bar
  const finalState = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const chip = tb ? tb.querySelector('[data-slate-inline="true"], [contenteditable="false"]') : null;
    return {
      hasChip: !!chip,
      chipText: chip ? chip.innerText.trim() : null,
      fullText: tb ? tb.innerText.trim() : '',
      html: tb ? tb.innerHTML : ''
    };
  });

  console.log('Prompt Bar Final State:', JSON.stringify(finalState, null, 2));

  await browser.close();
  console.log('Smart Attachment Test Finished!');
}

testSmartAttachment().catch(console.error);
