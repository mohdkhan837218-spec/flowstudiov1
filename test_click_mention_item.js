const puppeteer = require('puppeteer-core');
const path = require('path');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testClickMentionItem() {
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

  // 3. Click the first [role="option"] inside the mention popper!
  console.log('2. Clicking first [role="option"] inside mention popover...');
  const clicked = await page.evaluate(() => {
    const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
    if (popover) {
      const firstOpt = popover.querySelector('[role="option"], div[class*="item"], img');
      if (firstOpt) {
        firstOpt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        firstOpt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        firstOpt.click();
        return { clicked: true, text: firstOpt.innerText };
      }
    }
    return { clicked: false };
  });
  console.log('Mention item click status:', JSON.stringify(clicked, null, 2));
  await new Promise(r => setTimeout(r, 1500));

  // 4. Type prompt text
  console.log('3. Typing prompt text...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' cinematic 4k drone shot of mountain peak', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // 5. Final Prompt Bar Inspection
  const result = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const chip = tb ? tb.querySelector('[data-slate-inline="true"], [contenteditable="false"]') : null;
    return {
      hasChip: !!chip,
      chipText: chip ? chip.innerText.trim() : null,
      fullText: tb ? tb.innerText.trim() : ''
    };
  });
  console.log('Final Result:', JSON.stringify(result, null, 2));

  await browser.close();
}

testClickMentionItem().catch(console.error);
