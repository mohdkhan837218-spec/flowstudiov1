const puppeteer = require('puppeteer-core');
const path = require('path');
const { getAccountProfilePath } = require('./engine/accountStore');

async function inspectDrawerCards() {
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

  // Open drawer
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const plusBtn = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('add_2') || txt === '+' || aria.includes('add asset') || aria.includes('upload');
    });
    if (plusBtn) plusBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Inspect the first card elements in the drawer
  const cardDetails = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return { error: 'no dialog' };
    
    const items = Array.from(dialog.querySelectorAll('div[data-testid="virtuoso-item-list"] > div, div[role="dialog"] div[class*="item"], div[role="dialog"] div[class*="card"]'));
    return items.slice(0, 3).map(item => ({
      tag: item.tagName,
      className: item.className,
      role: item.getAttribute('role'),
      tabIndex: item.getAttribute('tabindex'),
      ariaSelected: item.getAttribute('aria-selected'),
      innerHTML: item.innerHTML.substring(0, 300)
    }));
  });

  console.log('Drawer Card Details:', JSON.stringify(cardDetails, null, 2));
  await browser.close();
}

inspectDrawerCards().catch(console.error);
