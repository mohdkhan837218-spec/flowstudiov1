const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function inspectFlowImageGeneration() {
  console.log('🔬 DEEP INSPECTION: Google Flow Image Generation Capabilities & Settings...');
  
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

  // 1. Open Settings Popover
  console.log('\n--- 1. Inspecting All Generation Models & Settings in Google Flow ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const tuneBtn = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('tune') || aria.includes('settings') || txt.includes('settings') || txt.includes('text to video') || txt.includes('video') || txt.includes('image');
    });
    if (tuneBtn) tuneBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Extract all text and buttons inside all open popovers
  const settingsData = await page.evaluate(() => {
    const popovers = Array.from(document.querySelectorAll('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]'));
    return popovers.map(p => {
      const allButtons = Array.from(p.querySelectorAll('button, [role="menuitem"], [role="option"], [role="radio"], div[class*="item"]')).map(b => ({
        text: b.innerText.trim(),
        aria: b.getAttribute('aria-label') || '',
        role: b.getAttribute('role') || ''
      }));
      return {
        fullText: p.innerText,
        interactiveItems: allButtons
      };
    });
  });

  console.log('Settings Data:', JSON.stringify(settingsData, null, 2));

  // 2. Check if there is an Image mode toggle or Imagen model
  const hasImageToggle = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"], [role="tab"]'));
    const imgBtn = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      return txt === 'image' || txt.includes('text to image') || txt.includes('imagen') || txt.includes('image to image');
    });
    if (imgBtn) {
      imgBtn.click();
      return { found: true, text: imgBtn.innerText };
    }
    return { found: false };
  });

  console.log('\nImage Mode Switch Attempt:', JSON.stringify(hasImageToggle));
  await new Promise(r => setTimeout(r, 2000));

  // 3. Inspect the UI layout after switching to Image mode
  const currentUILayout = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      placeholder: tb ? tb.innerText.trim() : '',
      allButtons: buttons
    };
  });

  console.log('\nCurrent UI Layout in Flow:', JSON.stringify(currentUILayout, null, 2));

  await browser.close();
}

inspectFlowImageGeneration().catch(console.error);
