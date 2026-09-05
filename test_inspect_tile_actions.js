const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testInspectTileActions() {
  console.log('🔬 Inspecting Tile Action Bar on Hover/Click...');
  
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

  // Find first tile coords
  const tileRect = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
    if (tiles.length === 0) return null;
    const r = tiles[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, left: r.left, right: r.right, bottom: r.bottom };
  });

  console.log('Tile Rect:', JSON.stringify(tileRect));

  if (tileRect) {
    // Hover over tile center
    console.log('1. Hovering over tile center...');
    await page.mouse.move(tileRect.x, tileRect.y);
    await new Promise(r => setTimeout(r, 800));

    // Inspect ALL buttons on page near this tile
    const buttonsNearTile = await page.evaluate((tr) => {
      const allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      return allBtns.filter(b => {
        const r = b.getBoundingClientRect();
        return r.top >= tr.top - 50 && r.bottom <= tr.bottom + 50 && r.left >= tr.left - 50 && r.right <= tr.right + 50;
      }).map(b => {
        const r = b.getBoundingClientRect();
        return {
          text: b.innerText.replace(/\n/g, ' '),
          aria: b.getAttribute('aria-label') || '',
          x: r.x + r.width / 2,
          y: r.y + r.height / 2
        };
      });
    }, tileRect);

    console.log('Buttons Near Tile on Hover:', JSON.stringify(buttonsNearTile, null, 2));

    // Find the 3-dots button
    const dotsBtn = buttonsNearTile.find(b => b.text.includes('more') || b.text.includes('…') || b.aria.includes('more') || b.aria.includes('option') || b.aria.includes('menu')) || buttonsNearTile[buttonsNearTile.length - 1];

    if (dotsBtn) {
      console.log(`2. Clicking 3-dots button at (${dotsBtn.x}, ${dotsBtn.y})...`);
      await page.mouse.click(dotsBtn.x, dotsBtn.y);
      await new Promise(r => setTimeout(r, 1000));

      // Inspect menu items
      const menuItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], button'));
        return items.filter(i => {
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

      console.log('\n========================================');
      console.log('OPENED TILE MENU ITEMS:');
      console.log(JSON.stringify(menuItems, null, 2));
      console.log('========================================\n');

      const dlItem = menuItems.find(i => i.text.toLowerCase().includes('download'));
      if (dlItem) {
        console.log(`3. Hovering over Download at (${dlItem.x}, ${dlItem.y})...`);
        await page.mouse.move(dlItem.x, dlItem.y);
        await new Promise(r => setTimeout(r, 800));

        // Submenu items (1K, 2K, 4K)
        const subItems = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], button'));
          return items.filter(i => {
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

        console.log('\n========================================');
        console.log('UPSCALE SUBMENU ITEMS:');
        console.log(JSON.stringify(subItems, null, 2));
        console.log('========================================\n');
      }
    }
  }

  await browser.close();
}

testInspectTileActions().catch(console.error);
