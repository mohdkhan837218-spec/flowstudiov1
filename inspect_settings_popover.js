const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function inspectSettingsPopover() {
  console.log('🔬 DEEP INSPECTION: Google Flow Settings Popover (Video vs Image & Models)...');
  
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

  // 1. Click the "Video · 720p · 4s" button
  console.log('1. Clicking the Settings/Tune Pill Button...');
  const clickedPill = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      return (txt.includes('video') || txt.includes('image') || txt.includes('720p') || txt.includes('1080p')) && (txt.includes('crop') || txt.includes('x1') || txt.includes('4s') || txt.includes('8s'));
    });
    if (pill) {
      pill.click();
      return { success: true, text: pill.innerText };
    }
    return { success: false };
  });

  console.log('Clicked Pill Result:', JSON.stringify(clickedPill));
  await new Promise(r => setTimeout(r, 1500));

  // 2. Extract everything inside the opened popover
  const popoverContent = await page.evaluate(() => {
    const popovers = Array.from(document.querySelectorAll('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]'));
    return popovers.map(p => {
      const items = Array.from(p.querySelectorAll('button, div[role="radio"], div[role="tab"], div[role="menuitem"], div[class*="item"], div[class*="chip"]')).map(el => ({
        text: el.innerText.trim(),
        role: el.getAttribute('role') || '',
        ariaChecked: el.getAttribute('aria-checked') || '',
        ariaSelected: el.getAttribute('aria-selected') || '',
        tabIndex: el.getAttribute('tabindex') || '',
        classes: el.className
      }));
      return {
        fullText: p.innerText,
        interactiveElements: items
      };
    });
  });

  console.log('\n========================================');
  console.log('SETTINGS POPOVER CONTENTS:');
  console.log(JSON.stringify(popoverContent, null, 2));
  console.log('========================================\n');

  // 3. Try to click "Image" tab/toggle inside the popover
  const clickImageRes = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[data-radix-popper-content-wrapper] button, div[role="dialog"] button, button'));
    const imgBtn = btns.find(b => {
      const txt = (b.innerText || '').trim().toLowerCase();
      return txt === 'image' || txt.includes('image');
    });
    if (imgBtn) {
      imgBtn.click();
      return { clicked: true, text: imgBtn.innerText };
    }
    return { clicked: false };
  });

  console.log('Click Image Mode Result:', JSON.stringify(clickImageRes));
  await new Promise(r => setTimeout(r, 1500));

  // 4. Extract popover after clicking "Image"
  const imagePopoverContent = await page.evaluate(() => {
    const popovers = Array.from(document.querySelectorAll('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]'));
    return popovers.map(p => ({
      fullText: p.innerText,
      items: Array.from(p.querySelectorAll('button, div[role="radio"], div[role="tab"], div[class*="chip"]')).map(el => el.innerText.trim())
    }));
  });

  console.log('\n========================================');
  console.log('IMAGE MODE POPOVER CONTENTS:');
  console.log(JSON.stringify(imagePopoverContent, null, 2));
  console.log('========================================\n');

  await browser.close();
}

inspectSettingsPopover().catch(console.error);
