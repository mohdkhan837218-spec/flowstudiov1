const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function inspectModelDropdown() {
  console.log('🔬 DEEP INSPECTION: Google Flow Model Dropdown & Mode Switchers...');
  
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

  // Find all buttons in the bottom toolbar around prompt box
  console.log('1. Inspecting all prompt toolbar buttons...');
  const toolbarButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map((b, idx) => {
      const r = b.getBoundingClientRect();
      return {
        index: idx,
        text: b.innerText.trim().replace(/\n/g, ' · '),
        aria: b.getAttribute('aria-label') || '',
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
        bottom: r.bottom
      };
    }).filter(b => b.bottom > window.innerHeight - 300);
  });

  console.log('Toolbar Buttons:', JSON.stringify(toolbarButtons, null, 2));

  // Click each bottom button one by one and check what popover opens
  for (const b of toolbarButtons) {
    if (b.text.includes('Go Back') || b.text.includes('Create') || b.text.includes('Help')) continue;
    console.log(`\n--- Clicking Button: "${b.text}" at (${b.x}, ${b.y}) ---`);
    await page.mouse.click(b.x, b.y);
    await new Promise(r => setTimeout(r, 1000));

    const popoverInfo = await page.evaluate(() => {
      const popovers = Array.from(document.querySelectorAll('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"], [data-state="open"]'));
      return popovers.map(p => ({
        innerText: p.innerText.substring(0, 300).replace(/\n/g, ' | '),
        items: Array.from(p.querySelectorAll('button, div[role="menuitem"], div[role="option"], [role="radio"]')).map(i => i.innerText.trim())
      }));
    });

    console.log('Opened Popover Info:', JSON.stringify(popoverInfo, null, 2));

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
}

inspectModelDropdown().catch(console.error);
