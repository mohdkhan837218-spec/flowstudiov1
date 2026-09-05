const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testTileInnerMore() {
  console.log('🔬 Testing STRICT Tile Inner More Button (508, 100)...');
  
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

  // 1. Locate first tile and hover
  const tileInfo = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
    if (tiles.length === 0) return null;
    const t = tiles[0];
    const r = t.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  if (tileInfo) {
    console.log('Hovering tile at:', JSON.stringify(tileInfo));
    await page.mouse.move(tileInfo.x, tileInfo.y);
    await new Promise(r => setTimeout(r, 800));

    // Find inner More button strictly inside tiles[0]
    const innerMoreBtn = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
      if (tiles.length === 0) return null;
      const t = tiles[0];
      const btns = Array.from(t.querySelectorAll('button'));
      const more = btns.find(b => {
        const r = b.getBoundingClientRect();
        const txt = (b.innerText || '').toLowerCase();
        return r.width < 50 && r.height < 50 && (txt.includes('more') || txt.includes('…') || b.innerHTML.includes('more_vert'));
      });
      if (more) {
        const r = more.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: more.innerText, w: r.width, h: r.height };
      }
      return null;
    });

    console.log('Inner More Button Info:', JSON.stringify(innerMoreBtn));

    if (innerMoreBtn) {
      console.log(`Clicking Inner More Button at (${innerMoreBtn.x}, ${innerMoreBtn.y})...`);
      await page.mouse.click(innerMoreBtn.x, innerMoreBtn.y);
      await new Promise(r => setTimeout(r, 1200));

      const menuItems = await page.evaluate(() => {
        const popovers = Array.from(document.querySelectorAll('div[role="menu"], [data-radix-popper-content-wrapper], div[data-state="open"]'));
        const found = [];
        popovers.forEach(p => {
          const items = Array.from(p.querySelectorAll('[role="menuitem"], button, div[class*="item"]'));
          items.forEach(i => {
            const txt = i.innerText.trim();
            if (txt.length > 0 && txt.length < 50) {
              const r = i.getBoundingClientRect();
              found.push({ text: txt.replace(/\n/g, ' '), x: r.x + r.width / 2, y: r.y + r.height / 2 });
            }
          });
        });
        return found;
      });

      console.log('\n========================================');
      console.log('OPENED TILE MENU ITEMS:');
      console.log(JSON.stringify(menuItems, null, 2));
      console.log('========================================\n');

      const dlItem = menuItems.find(i => i.text.toLowerCase().includes('download'));
      if (dlItem) {
        console.log(`Hovering Download at (${dlItem.x}, ${dlItem.y})...`);
        await page.mouse.move(dlItem.x, dlItem.y);
        await new Promise(r => setTimeout(r, 800));

        const subItems = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"]'));
          return all.filter(i => {
            const txt = i.innerText.trim();
            return txt.includes('1K') || txt.includes('2K') || txt.includes('4K') || txt.includes('Original') || txt.includes('Upscaled');
          }).map(i => {
            const r = i.getBoundingClientRect();
            return { text: i.innerText.trim().replace(/\n/g, ' '), x: r.x + r.width / 2, y: r.y + r.height / 2 };
          });
        });

        console.log('SUBMENU (1K / 2K):', JSON.stringify(subItems, null, 2));

        const opt2K = subItems.find(i => i.text.toLowerCase().includes('2k'));
        if (opt2K) {
          console.log(`\n🎉 Clicking 2K Upscaled at (${opt2K.x}, ${opt2K.y})...`);
          await page.mouse.click(opt2K.x, opt2K.y);
          console.log('✓ 2K Upscale Triggered!');
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }
  }

  await browser.close();
}

testTileInnerMore().catch(console.error);
