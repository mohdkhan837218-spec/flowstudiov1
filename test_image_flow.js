const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testImageGenerationFlow() {
  console.log('🔬 Testing End-to-End Image Generation Mode in Google Flow...');
  
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

  // 1. Open Settings Pill
  console.log('1. Opening Settings Popover...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      return (txt.includes('video') || txt.includes('image') || txt.includes('720p') || txt.includes('1080p')) && (txt.includes('crop') || txt.includes('x1') || txt.includes('4s') || txt.includes('8s'));
    });
    if (pill) {
      pill.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      pill.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      pill.click();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Click "Image" Tab
  console.log('2. Clicking "Image" Mode button in popover...');
  const clickedImage = await page.evaluate(() => {
    const popovers = Array.from(document.querySelectorAll('div[data-state="open"], div[role="dialog"], div[role="menu"], body'));
    for (const root of popovers) {
      const btns = Array.from(root.querySelectorAll('button, div[role="button"], [role="tab"]'));
      const imgBtn = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'image');
      if (imgBtn) {
        imgBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        imgBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        imgBtn.click();
        return true;
      }
    }
    return false;
  });

  console.log('Clicked Image Mode:', clickedImage);
  await new Promise(r => setTimeout(r, 1000));

  // Close Settings Popover
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 3. Clear prompt bar & Type prompt
  console.log('3. Typing prompt for Image generation...');
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

  await page.keyboard.type('A glowing crystal dragon sitting on ancient ruins, cinematic 8k wallpaper', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Submit Image Generation
  console.log('4. Submitting prompt...');
  const submitted = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const txt = (b.innerText || '').toLowerCase();
      return aria.includes('generate') || aria.includes('submit') || txt.includes('arrow_forward') || txt.includes('create') || txt.includes('generate');
    });
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      return true;
    }
    return false;
  });

  console.log('Submitted Image Prompt:', submitted);
  await new Promise(r => setTimeout(r, 8000));

  // 5. Inspect generated tiles
  const tilesInfo = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
    return {
      totalTiles: tiles.length,
      sampleTiles: tiles.slice(0, 3).map(t => ({
        text: t.innerText.substring(0, 100),
        imgs: Array.from(t.querySelectorAll('img')).map(i => i.src.substring(0, 80))
      }))
    };
  });

  console.log('\n========================================');
  console.log('IMAGE GENERATION TILES:');
  console.log(JSON.stringify(tilesInfo, null, 2));
  console.log('========================================\n');

  await browser.close();
}

testImageGenerationFlow().catch(console.error);
