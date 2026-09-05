const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function inspectBodyPopovers() {
  console.log('🔬 DEEP INSPECTION: Capturing Full DOM Dropdown on Pill Click...');
  
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

  // Get initial body children count
  const initialCount = await page.evaluate(() => document.body.children.length);

  // Click the pill
  console.log('1. Clicking the Settings/Tune Pill Button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      return (txt.includes('video') || txt.includes('image') || txt.includes('720p') || txt.includes('1080p')) && (txt.includes('crop') || txt.includes('x1') || txt.includes('4s') || txt.includes('8s'));
    });
    if (pill) pill.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Inspect the entire DOM for newly appeared floating containers
  const floatingElements = await page.evaluate(() => {
    const popovers = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"], [data-state="open"], div[style*="position: fixed"], div[style*="position: absolute"]'));
    return popovers.map(p => ({
      tagName: p.tagName,
      className: p.className,
      role: p.getAttribute('role'),
      innerText: p.innerText,
      innerHTML: p.innerHTML.substring(0, 500)
    })).filter(p => p.innerText && p.innerText.length > 5 && p.innerText.length < 1500);
  });

  console.log('\n========================================');
  console.log('FLOATING SETTINGS CONTAINERS:');
  console.log(JSON.stringify(floatingElements, null, 2));
  console.log('========================================\n');

  await browser.close();
}

inspectBodyPopovers().catch(console.error);
