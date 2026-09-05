const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function inspectFlowFramesUI() {
  console.log('🔬 DEEP INSPECTION: Google Flow "Frames" / "First-Last Frame" UI & Workflow...');
  
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

  // 1. Inspect all Buttons, Dropdowns, and Settings in Google Flow
  console.log('\n--- 1. Inspecting All Generation Modes in Settings ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const tuneBtn = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('tune') || aria.includes('settings') || txt.includes('settings') || txt.includes('text to video') || txt.includes('frames') || txt.includes('ingredients');
    });
    if (tuneBtn) tuneBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const settingsOptions = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('div[role="dialog"], div[data-radix-popper-content-wrapper], div[role="menu"]');
    const results = [];
    dialogs.forEach(d => {
      const btns = Array.from(d.querySelectorAll('button, div[role="menuitem"], div[role="option"], [role="radio"]'));
      results.push({
        dialogText: d.innerText.substring(0, 300),
        items: btns.map(b => ({
          text: b.innerText.trim(),
          aria: b.getAttribute('aria-label') || '',
          role: b.getAttribute('role') || ''
        }))
      });
    });
    return results;
  });

  console.log('Settings Dialogs & Options:', JSON.stringify(settingsOptions, null, 2));

  // 2. Click "Frames" mode in Settings if available
  console.log('\n--- 2. Switching to Frames Mode ---');
  const switchedToFrames = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="dialog"] button, div[data-radix-popper-content-wrapper] button, button'));
    const framesBtn = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      return txt.includes('frames') || txt.includes('first & last') || txt.includes('start & end');
    });
    if (framesBtn) {
      framesBtn.click();
      return { success: true, text: framesBtn.innerText };
    }
    return { success: false };
  });

  console.log('Switched to Frames Mode:', JSON.stringify(switchedToFrames));
  await new Promise(r => setTimeout(r, 2000));

  // 3. Inspect the UI layout around the prompt bar in Frames mode!
  console.log('\n--- 3. Inspecting Prompt Bar & Slots in Frames Mode ---');
  const framesLayout = await page.evaluate(() => {
    const promptArea = document.querySelector('div[class*="prompt"], div[class*="input"], form');
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      aria: b.getAttribute('aria-label') || '',
      classes: b.className
    }));

    const slots = Array.from(document.querySelectorAll('div[class*="slot"], div[class*="frame"], div[class*="image"], div[class*="upload"], div[class*="drop"]')).map(s => ({
      text: s.innerText.trim(),
      className: s.className,
      aria: s.getAttribute('aria-label') || ''
    }));

    const textbox = document.querySelector('div[contenteditable="true"], div[role="textbox"]');

    return {
      allButtonsAround: allButtons.filter(b => b.text.includes('Add') || b.text.includes('Frame') || b.text.includes('Image') || b.text.includes('Start') || b.text.includes('End') || b.aria.includes('frame')),
      slots: slots.filter(s => s.text.length > 0 && s.text.length < 100),
      promptBoxHTML: textbox ? textbox.outerHTML : 'none'
    };
  });

  console.log('Frames Layout Details:', JSON.stringify(framesLayout, null, 2));

  // 4. Open Media Drawer to inspect all cards in Library
  console.log('\n--- 4. Inspecting Media Drawer Assets ---');
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

  const drawerCards = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return { found: false };
    const cards = Array.from(dialog.querySelectorAll('[role="option"], div[class*="item"], div[class*="card"]'));
    return {
      found: true,
      cardCount: cards.length,
      sampleCards: cards.slice(0, 10).map(c => ({
        text: c.innerText.trim(),
        hasImg: !!c.querySelector('img'),
        imgSrc: c.querySelector('img') ? c.querySelector('img').src.substring(0, 80) : null
      }))
    };
  });

  console.log('Drawer Cards:', JSON.stringify(drawerCards, null, 2));

  // 5. Try Mention Popover with search
  console.log('\n--- 5. Testing Mention Popover Search ---');
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (tb) { tb.focus(); tb.click(); }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.type('@', { delay: 50 });
  await new Promise(r => setTimeout(r, 1500));

  const mentionList = await page.evaluate(() => {
    const popover = document.querySelector('div[data-radix-popper-content-wrapper], div[role="dialog"], div[role="menu"]');
    if (!popover) return { found: false };
    const options = Array.from(popover.querySelectorAll('[role="option"], div[class*="item"]'));
    return {
      found: true,
      optionsCount: options.length,
      options: options.map(o => o.innerText.trim())
    };
  });

  console.log('Mention Popover List:', JSON.stringify(mentionList, null, 2));

  await browser.close();
}

inspectFlowFramesUI().catch(console.error);
