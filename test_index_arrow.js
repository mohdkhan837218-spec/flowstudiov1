const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testIndexArrowSelection() {
  console.log('🔬 Testing 100% Safe Index-Based ArrowDown Navigation (Handles Spaces & Symbols)...');
  
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

  // Clear prompt
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

  async function attachBySmartIndex(targetFileName) {
    console.log(`\n--- Attaching: "${targetFileName}" ---`);
    await page.keyboard.type('@', { delay: 60 });
    await new Promise(r => setTimeout(r, 1500));

    // Find index of target option
    const targetInfo = await page.evaluate((fname) => {
      const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
      if (!popover) return { found: false, index: 0 };
      const options = Array.from(popover.querySelectorAll('[role="option"], div[class*="item"]'));
      
      const cleanTarget = fname.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (let i = 0; i < options.length; i++) {
        const text = (options[i].innerText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (text.includes(cleanTarget) || cleanTarget.includes(text)) {
          return { found: true, index: i, matchText: options[i].innerText.trim() };
        }
      }
      return { found: false, index: 0, total: options.length };
    }, targetFileName);

    console.log('Target Search Result:', JSON.stringify(targetInfo));

    const indexToNavigate = targetInfo.found ? targetInfo.index : 0;
    console.log(`Navigating ArrowDown ${indexToNavigate + 1} times...`);
    
    for (let i = 0; i <= indexToNavigate; i++) {
      await page.keyboard.press('ArrowDown');
      await new Promise(r => setTimeout(r, 150));
    }
    
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1200));
  }

  // 1. Attach alpha_start_5005.png
  await attachBySmartIndex('alpha_start_5005.png');

  // Space
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' ', { delay: 30 });
  await new Promise(r => setTimeout(r, 300));

  // 2. Attach omega_end_1465.png
  await attachBySmartIndex('omega_end_1465.png');

  // Prompt
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' cinematic slow-motion drone flyover 4k', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // Final check
  const finalCheck = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const chips = Array.from(tb ? tb.querySelectorAll('[data-slate-inline="true"], [contenteditable="false"]') : []);
    return {
      chipCount: chips.length,
      chipTexts: chips.map(c => c.innerText.trim()).filter(Boolean),
      fullPromptText: tb ? tb.innerText.trim() : ''
    };
  });

  console.log('\n========================================');
  console.log('INDEX ARROW DUAL FRAMES RESULT:');
  console.log(JSON.stringify(finalCheck, null, 2));
  console.log('========================================\n');

  await browser.close();
}

testIndexArrowSelection().catch(console.error);
