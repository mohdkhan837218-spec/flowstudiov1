const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testAtMention() {
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

  console.log('1. Focusing prompt bar...');
  await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (tb) { tb.focus(); tb.click(); }
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('2. Typing @ to open asset mention popup...');
  await page.keyboard.type('@', { delay: 100 });
  await new Promise(r => setTimeout(r, 1500));

  // Check what popover opened
  const popover = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('[role="dialog"], [role="menu"], div[data-radix-popper-content-wrapper], div[class*="popover"], div[class*="menu"]'));
    return {
      count: list.length,
      html: list.map(l => l.innerText)
    };
  });
  console.log('Mention popover detected:', JSON.stringify(popover, null, 2));

  console.log('3. Pressing Enter to select first asset in mention list...');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1500));

  // Check prompt bar
  const tbContent = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      text: tb ? tb.innerText : '',
      html: tb ? tb.innerHTML : ''
    };
  });
  console.log('Prompt bar after @ + Enter:', JSON.stringify(tbContent, null, 2));

  await browser.close();
}

testAtMention().catch(console.error);
