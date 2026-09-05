const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testImageModeSwitchingLive() {
  console.log('🔬 Testing Exact Image Mode & Model Switching in Google Flow...');
  
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

  // 1. Find and Click Settings Pill
  console.log('1. Locating and Clicking Settings Pill...');
  const pillCoord = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const r = b.getBoundingClientRect();
      const txt = (b.innerText || '').toLowerCase();
      return r.top > (window.innerHeight - 300) && (txt.includes('video') || txt.includes('image') || txt.includes('banana') || txt.includes('720p') || txt.includes('x1'));
    });
    if (pill) {
      const r = pill.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
    }
    return null;
  });

  console.log('Pill Coordinates:', JSON.stringify(pillCoord));
  if (pillCoord) {
    await page.mouse.click(pillCoord.x, pillCoord.y);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 2. Click "Image" Tab
  console.log('2. Clicking "Image" Mode Tab in popover...');
  const clickedImageTab = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('div[data-state="open"], div[role="dialog"], [data-radix-popper-content-wrapper], body'));
    for (const d of dialogs) {
      const btns = Array.from(d.querySelectorAll('button, [role="tab"], div[role="button"]'));
      const imgBtn = btns.find(b => {
        const txt = (b.innerText || '').trim().toLowerCase();
        return txt === 'image' || (txt.includes('image') && !txt.includes('image to') && !txt.includes('reference'));
      });
      if (imgBtn) {
        const r = imgBtn.getBoundingClientRect();
        return { found: true, x: r.x + r.width / 2, y: r.y + r.height / 2, text: imgBtn.innerText };
      }
    }
    return { found: false };
  });

  console.log('Image Tab Result:', JSON.stringify(clickedImageTab));
  if (clickedImageTab.found) {
    await page.mouse.click(clickedImageTab.x, clickedImageTab.y);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 3. Inspect the popover after switching to Image mode
  console.log('3. Inspecting Popover Controls in Image Mode...');
  const imageControls = await page.evaluate(() => {
    const popover = document.querySelector('div[data-state="open"], div[role="dialog"], [data-radix-popper-content-wrapper]');
    if (!popover) return { found: false };
    const allBtns = Array.from(popover.querySelectorAll('button, div[role="button"], div[role="combobox"], [role="radio"]')).map(b => {
      const r = b.getBoundingClientRect();
      return {
        text: b.innerText.trim().replace(/\n/g, ' '),
        aria: b.getAttribute('aria-label') || '',
        x: r.x + r.width / 2,
        y: r.y + r.height / 2
      };
    });
    return {
      found: true,
      text: popover.innerText.replace(/\n/g, ' | '),
      buttons: allBtns
    };
  });

  console.log('Image Mode Controls in Popover:', JSON.stringify(imageControls, null, 2));

  // 4. Click Model Dropdown Button
  console.log('4. Clicking Model Dropdown Button...');
  const modelBtn = imageControls.buttons.find(b => b.text.includes('Banana') || b.text.includes('Nano') || b.aria.includes('model'));
  if (modelBtn) {
    console.log(`Clicking Model Dropdown at (${modelBtn.x}, ${modelBtn.y})...`);
    await page.mouse.click(modelBtn.x, modelBtn.y);
    await new Promise(r => setTimeout(r, 1000));

    // Inspect open model menu items
    const modelMenuItems = await page.evaluate(() => {
      const menus = Array.from(document.querySelectorAll('div[role="menu"], [role="listbox"], div[data-state="open"]'));
      const items = [];
      menus.forEach(m => {
        const btns = Array.from(m.querySelectorAll('button, [role="menuitem"], [role="option"], div[class*="item"]'));
        btns.forEach(b => {
          const r = b.getBoundingClientRect();
          items.push({
            text: b.innerText.trim().replace(/\n/g, ' '),
            x: r.x + r.width / 2,
            y: r.y + r.height / 2
          });
        });
      });
      return items;
    });

    console.log('Model Menu Items:', JSON.stringify(modelMenuItems, null, 2));

    // Click "Nano Banana Pro"
    const targetModelItem = modelMenuItems.find(i => i.text.toLowerCase().includes('nano banana pro') || i.text.toLowerCase().includes('pro'));
    if (targetModelItem) {
      console.log(`Clicking "${targetModelItem.text}" at (${targetModelItem.x}, ${targetModelItem.y})...`);
      await page.mouse.click(targetModelItem.x, targetModelItem.y);
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // 5. Select Aspect Ratio (e.g. 9:16)
  console.log('5. Selecting Aspect Ratio 9:16...');
  await page.evaluate(() => {
    const popover = document.querySelector('div[data-state="open"], div[role="dialog"]');
    if (popover) {
      const btns = Array.from(popover.querySelectorAll('button, [role="radio"]'));
      const ratioBtn = btns.find(b => (b.innerText || '').includes('9:16'));
      if (ratioBtn) ratioBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // 6. Close popover
  console.log('6. Closing popover with Escape...');
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 800));

  // 7. Verify Pill at bottom now shows Nano Banana Pro
  const finalPillText = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const r = b.getBoundingClientRect();
      const txt = (b.innerText || '').toLowerCase();
      return r.top > (window.innerHeight - 300) && (txt.includes('banana') || txt.includes('image') || txt.includes('video'));
    });
    return pill ? pill.innerText.replace(/\n/g, ' · ') : 'none';
  });

  console.log('\n========================================');
  console.log('FINAL BOTTOM PILL STATE:');
  console.log(finalPillText);
  console.log('========================================\n');

  await browser.close();
}

testImageModeSwitchingLive().catch(console.error);
