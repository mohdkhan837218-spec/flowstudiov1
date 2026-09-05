const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testDynamicTileMore() {
  console.log('🔬 Testing Dynamic Tile More Button Click & Submenu...');
  
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

  // 1. Get first tile rect
  const tileRect = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
    if (tiles.length === 0) return null;
    const t = tiles[0];
    const r = t.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, left: r.left, right: r.right, bottom: r.bottom };
  });

  console.log('Tile Rect:', JSON.stringify(tileRect));

  if (tileRect) {
    // Hover over tile
    await page.mouse.move(tileRect.x, tileRect.y);
    await new Promise(r => setTimeout(r, 800));

    // Find more button relative to tile
    const moreBtn = await page.evaluate((tr) => {
      const allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const nearBtns = allBtns.filter(b => {
        const r = b.getBoundingClientRect();
        return r.top >= tr.top - 20 && r.top <= tr.top + 60 && r.right >= tr.right - 80 && r.right <= tr.right + 20;
      });

      const target = nearBtns.find(b => (b.innerText || '').includes('more') || (b.getAttribute('aria-label') || '').toLowerCase().includes('more') || (b.innerText || '').includes('…')) || nearBtns[nearBtns.length - 1];

      if (target) {
        const r = target.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: target.innerText };
      }
      return null;
    }, tileRect);

    console.log('Detected More Button:', JSON.stringify(moreBtn));

    if (moreBtn) {
      console.log(`Clicking More Button at (${moreBtn.x}, ${moreBtn.y})...`);
      await page.mouse.click(moreBtn.x, moreBtn.y);
      await new Promise(r => setTimeout(r, 1000));

      // Inspect open menu
      const menuItems = await page.evaluate(() => {
        const allItems = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], button'));
        return allItems.filter(i => {
          const r = i.getBoundingClientRect();
          return r.width > 50 && r.height > 20 && (i.innerText.includes('Download') || i.innerText.includes('Favorite') || i.innerText.includes('Reuse') || i.innerText.includes('Trash') || i.innerText.includes('1K') || i.innerText.includes('2K'));
        }).map(i => {
          const r = i.getBoundingClientRect();
          return {
            text: i.innerText.trim().replace(/\n/g, ' '),
            x: r.x + r.width / 2,
            y: r.y + r.height / 2
          };
        });
      });

      console.log('Opened Menu Items:', JSON.stringify(menuItems, null, 2));

      const dlItem = menuItems.find(i => i.text.toLowerCase().includes('download'));
      if (dlItem) {
        console.log(`Hovering over Download at (${dlItem.x}, ${dlItem.y})...`);
        await page.mouse.move(dlItem.x, dlItem.y);
        await new Promise(r => setTimeout(r, 800));

        const subItems = await page.evaluate(() => {
          const allItems = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], button'));
          return allItems.filter(i => {
            const txt = i.innerText.trim();
            return txt.includes('1K') || txt.includes('2K') || txt.includes('4K') || txt.includes('Original') || txt.includes('Upscaled');
          }).map(i => {
            const r = i.getBoundingClientRect();
            return {
              text: i.innerText.trim().replace(/\n/g, ' '),
              x: r.x + r.width / 2,
              y: r.y + r.height / 2
            };
          });
        });

        console.log('Submenu Items:', JSON.stringify(subItems, null, 2));

        const opt2K = subItems.find(i => i.text.toLowerCase().includes('2k'));
        if (opt2K) {
          console.log(`\n🎉 Clicking 2K Upscaled at (${opt2K.x}, ${opt2K.y})...`);
          await page.mouse.click(opt2K.x, opt2K.y);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }
  }

  await browser.close();
}

testDynamicTileMore().catch(console.error);
