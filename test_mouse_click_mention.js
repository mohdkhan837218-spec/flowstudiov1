const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testMouseClickMention() {
  console.log('🔬 Testing Real CDP Mouse Click on Mention Item...');
  
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

  // 1. Focus prompt textbox and clear
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

  // 2. Type @
  console.log('1. Typing @...');
  await page.keyboard.type('@', { delay: 60 });
  await new Promise(r => setTimeout(r, 1200));

  // 3. Get exact bounding box of first option in mention popover
  console.log('2. Finding bounding box of first mention option...');
  const optCoord = await page.evaluate(() => {
    const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
    if (popover) {
      const firstOpt = popover.querySelector('[role="option"], div[class*="item"]');
      if (firstOpt) {
        const r = firstOpt.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: firstOpt.innerText };
      }
    }
    return null;
  });

  console.log('Option bounding box:', JSON.stringify(optCoord, null, 2));

  if (optCoord) {
    console.log('3. Clicking with real mouse pointer at:', optCoord.x, optCoord.y);
    await page.mouse.click(optCoord.x, optCoord.y);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 4. Move to End and type prompt
  console.log('4. Typing prompt text...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' cinematic 4k video generation test', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // 5. Check final prompt bar
  const finalState = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const chip = tb ? tb.querySelector('[data-slate-inline="true"], [contenteditable="false"]') : null;
    return {
      hasChip: !!chip,
      chipText: chip ? chip.innerText.trim() : null,
      fullText: tb ? tb.innerText.trim() : ''
    };
  });

  console.log('Final Result:', JSON.stringify(finalState, null, 2));
  await browser.close();
}

testMouseClickMention().catch(console.error);
