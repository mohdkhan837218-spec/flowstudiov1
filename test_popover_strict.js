const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testPopoverInternalButtons() {
  console.log('🔬 Testing STRICT Popover Internal Button Targeting...');
  
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

  // 1. Click Pill
  console.log('1. Clicking Bottom Settings Pill...');
  const pillRes = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const r = b.getBoundingClientRect();
      const txt = (b.innerText || '').toLowerCase();
      return r.top > (window.innerHeight - 250) && (txt.includes('video') || txt.includes('banana') || txt.includes('720p') || txt.includes('x1'));
    });
    if (pill) {
      const r = pill.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
    }
    return null;
  });

  console.log('Pill:', JSON.stringify(pillRes));
  if (pillRes) {
    await page.mouse.click(pillRes.x, pillRes.y);
    await new Promise(r => setTimeout(r, 1200));
  }

  // 2. Find ALL popovers strictly by bounding box (must be above the pill, x > 600, y > 300)
  console.log('2. Finding Floating Popover Container...');
  const popoverData = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('div, section, aside'));
    const popovers = allElements.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
    });

    return popovers.map(p => {
      const btns = Array.from(p.querySelectorAll('button, [role="tab"], div[role="radio"], div[role="button"]')).map(b => {
        const br = b.getBoundingClientRect();
        return {
          text: b.innerText.trim().replace(/\n/g, ' '),
          x: br.x + br.width / 2,
          y: br.y + br.height / 2,
          w: br.width,
          h: br.height
        };
      });
      return {
        text: p.innerText.substring(0, 200).replace(/\n/g, ' | '),
        buttons: btns
      };
    });
  });

  console.log('Detected Floating Popover:', JSON.stringify(popoverData, null, 2));

  // 3. Click Image Button inside the popover
  if (popoverData.length > 0) {
    const p = popoverData[0];
    const imageBtn = p.buttons.find(b => b.text.toLowerCase().includes('image') && !b.text.toLowerCase().includes('video'));
    if (imageBtn) {
      console.log(`\n3. Clicking Image toggle at (${imageBtn.x}, ${imageBtn.y})...`);
      await page.mouse.click(imageBtn.x, imageBtn.y);
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // 4. Re-inspect popover in Image mode
  const imagePopover = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('div, section, aside'));
    const popovers = allElements.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
    });

    if (popovers.length === 0) return null;
    const p = popovers[0];
    return {
      fullText: p.innerText.replace(/\n/g, ' | '),
      buttons: Array.from(p.querySelectorAll('button, div[role="button"], div[role="radio"]')).map(b => {
        const br = b.getBoundingClientRect();
        return {
          text: b.innerText.trim().replace(/\n/g, ' '),
          x: br.x + br.width / 2,
          y: br.y + br.height / 2
        };
      })
    };
  });

  console.log('\n========================================');
  console.log('IMAGE MODE POPOVER CONTROLS:');
  console.log(JSON.stringify(imagePopover, null, 2));
  console.log('========================================\n');

  // 5. Open Model Dropdown inside Image mode
  if (imagePopover) {
    const modelBtn = imagePopover.buttons.find(b => b.text.includes('Banana') || b.text.includes('Nano'));
    if (modelBtn) {
      console.log(`4. Clicking Model Dropdown at (${modelBtn.x}, ${modelBtn.y})...`);
      await page.mouse.click(modelBtn.x, modelBtn.y);
      await new Promise(r => setTimeout(r, 1000));

      // Find open dropdown menu items
      const menuItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div[role="menu"] [role="menuitem"], div[role="menu"] button, div[data-state="open"] div[class*="item"], div[data-state="open"] button'));
        return items.map(i => {
          const r = i.getBoundingClientRect();
          return {
            text: i.innerText.trim().replace(/\n/g, ' '),
            x: r.x + r.width / 2,
            y: r.y + r.height / 2
          };
        });
      });

      console.log('Model Menu Items:', JSON.stringify(menuItems, null, 2));

      // Click "Nano Banana Pro"
      const targetModel = menuItems.find(m => m.text.toLowerCase().includes('pro'));
      if (targetModel) {
        console.log(`5. Clicking "${targetModel.text}" at (${targetModel.x}, ${targetModel.y})...`);
        await page.mouse.click(targetModel.x, targetModel.y);
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }

  // Close with escape
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 800));

  // 6. Verify final bottom pill
  const finalPill = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const r = b.getBoundingClientRect();
      return r.top > (window.innerHeight - 250) && (b.innerText.includes('Banana') || b.innerText.includes('Image') || b.innerText.includes('Video'));
    });
    return pill ? pill.innerText.replace(/\n/g, ' · ') : 'none';
  });

  console.log('\n========================================');
  console.log('FINAL BOTTOM PILL:');
  console.log(finalPill);
  console.log('========================================\n');

  await browser.close();
}

testPopoverInternalButtons().catch(console.error);
