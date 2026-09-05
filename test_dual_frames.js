const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testTwoFramesAttachment() {
  console.log('🔬 Testing Dual Frame Attachment (Start Frame + End Frame)...');
  
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

  // 1. Clear prompt bar
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

  // 2. Attach First Image Chip (Start Frame)
  console.log('2. Attaching Start Frame Chip via @...');
  await page.keyboard.type('@', { delay: 60 });
  await new Promise(r => setTimeout(r, 1200));
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1000));

  // Move to End & add space
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' ', { delay: 30 });
  await new Promise(r => setTimeout(r, 300));

  // 3. Attach Second Image Chip (End Frame) WITHOUT clearing prompt bar!
  console.log('3. Attaching End Frame Chip via @...');
  await page.keyboard.type('@', { delay: 60 });
  await new Promise(r => setTimeout(r, 1200));
  // Navigate to second item or first item
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1000));

  // Move to End & append prompt text
  console.log('4. Appending prompt text after both chips...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' smooth morph transition from start frame to end frame 4k', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Final verification of both chips in prompt bar
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
  console.log('DUAL FRAMES ATTACHMENT RESULT:');
  console.log(JSON.stringify(finalCheck, null, 2));
  console.log('========================================\n');

  await browser.close();
}

testTwoFramesAttachment().catch(console.error);
