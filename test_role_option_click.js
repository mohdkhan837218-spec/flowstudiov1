const puppeteer = require('puppeteer-core');
const path = require('path');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testRoleOptionClick() {
  console.log('🔬 Testing div[role="option"] click + "Add to Prompt" button...');
  
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

  // 1. Open drawer
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

  // 2. Click first option card in drawer
  console.log('Clicking first div[role="option"] card...');
  const clicked = await page.evaluate(() => {
    const option = document.querySelector('div[role="dialog"] div[role="option"]');
    if (option) {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      option.click();
      return true;
    }
    return false;
  });
  console.log('Option click result:', clicked);
  await new Promise(r => setTimeout(r, 1000));

  // 3. Click "Add to Prompt" button
  console.log('Clicking "Add to Prompt" button...');
  const addBtnStatus = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="dialog"] button, button'));
    const addBtn = btns.find(b => (b.innerText || '').toLowerCase().includes('add to prompt'));
    if (addBtn) {
      const disabled = addBtn.disabled || addBtn.getAttribute('aria-disabled') === 'true';
      if (!disabled) {
        addBtn.click();
        return { clicked: true, disabled: false };
      }
      return { clicked: false, disabled: true };
    }
    return { clicked: false, notFound: true };
  });
  console.log('Add to Prompt status:', JSON.stringify(addBtnStatus, null, 2));
  await new Promise(r => setTimeout(r, 2000));

  // 4. Check prompt bar content
  const promptBar = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      text: tb ? tb.innerText : '',
      html: tb ? tb.innerHTML : ''
    };
  });
  console.log('Prompt Bar result:', JSON.stringify(promptBar, null, 2));

  await browser.close();
}

testRoleOptionClick().catch(console.error);
