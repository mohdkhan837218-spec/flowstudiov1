const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testDomMentionPicker() {
  console.log('🔬 Testing DOM-Matched Popover Option Finder & Real Click...');
  
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

  // Function to attach an exact filename by searching popover items
  async function attachExactFile(targetName) {
    console.log(`\n--- Attaching target file: "${targetName}" ---`);
    await page.keyboard.type('@', { delay: 50 });
    await new Promise(r => setTimeout(r, 1500));

    // Find the option in popover that matches targetName
    const match = await page.evaluate((name) => {
      const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
      if (!popover) return { found: false, reason: 'no popover' };

      const options = Array.from(popover.querySelectorAll('[role="option"], div[class*="item"]'));
      console.log('Available options:', options.map(o => o.innerText));

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const text = (opt.innerText || '').toLowerCase();
        if (text.includes(name.toLowerCase())) {
          const r = opt.getBoundingClientRect();
          return {
            found: true,
            index: i,
            x: r.x + r.width / 2,
            y: r.y + r.height / 2,
            text: opt.innerText.trim()
          };
        }
      }
      return { found: false, totalOptions: options.length };
    }, targetName);

    console.log('Match Result:', JSON.stringify(match));

    if (match.found) {
      console.log(`Clicking option at (${match.x}, ${match.y})...`);
      await page.mouse.click(match.x, match.y);
      await new Promise(r => setTimeout(r, 1000));
      return true;
    } else {
      console.log('Fallback: Pressing ArrowDown + Enter...');
      await page.keyboard.press('ArrowDown');
      await new Promise(r => setTimeout(r, 200));
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 1000));
      return false;
    }
  }

  // 1. Attach alpha_start_5005.png
  await attachExactFile('alpha_start_5005.png');

  // Space
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' ', { delay: 30 });
  await new Promise(r => setTimeout(r, 300));

  // 2. Attach omega_end_1465.png
  await attachExactFile('omega_end_1465.png');

  // Space & Prompt
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' cinematic slow-motion transformation 4k', { delay: 20 });
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
  console.log('FINAL DOM PICKER VERIFICATION:');
  console.log(JSON.stringify(finalCheck, null, 2));
  console.log('========================================\n');

  await browser.close();
}

testDomMentionPicker().catch(console.error);
