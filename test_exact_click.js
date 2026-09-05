const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testExactClick() {
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

  // 1. Click +
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const plusBtn = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('add_2') || txt === '+' || aria.includes('add asset') || aria.includes('upload');
    });
    if (plusBtn) plusBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // 2. Get bounding box of first image in dialog
  const imgCoord = await page.evaluate(() => {
    const img = document.querySelector('div[role="dialog"] img, div[data-testid="virtuoso-item-list"] img');
    if (img) {
      const r = img.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  });

  if (imgCoord) {
    console.log('Clicking thumbnail at:', imgCoord);
    await page.mouse.click(imgCoord.x, imgCoord.y);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 3. Find and click "Add to Prompt" button
  const addBtnCoord = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="dialog"] button, button'));
    const b = btns.find(btn => (btn.innerText || '').toLowerCase().includes('add to prompt'));
    if (b) {
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: b.innerText, disabled: b.disabled };
    }
    return null;
  });
  console.log('Add button info:', addBtnCoord);

  if (addBtnCoord && !addBtnCoord.disabled) {
    await page.mouse.click(addBtnCoord.x, addBtnCoord.y);
    console.log('✓ Clicked Add to Prompt button via mouse coordinates!');
    await new Promise(r => setTimeout(r, 2000));
  }

  // 4. Check prompt bar
  const result = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      text: tb ? tb.innerText : '',
      html: tb ? tb.innerHTML : ''
    };
  });
  console.log('Prompt Bar after attachment:', JSON.stringify(result, null, 2));

  await browser.close();
}

testExactClick().catch(console.error);
