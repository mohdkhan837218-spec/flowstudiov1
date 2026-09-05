const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testTileUpscaleDownloadLive() {
  console.log('🔬 Testing Tile 3-Dots Menu Upscale Download Live...');
  
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

  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads');
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 5000));
  }

  // 1. Locate the top-left tile on the canvas
  console.log('1. Locating First Tile...');
  const tileInfo = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
    if (tiles.length === 0) return null;
    const t = tiles[0];
    const r = t.getBoundingClientRect();
    return {
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      topX: r.x + r.width - 30,
      topY: r.y + 25,
      text: t.innerText.substring(0, 50).replace(/\n/g, ' ')
    };
  });

  console.log('Tile Info:', JSON.stringify(tileInfo));

  if (tileInfo) {
    // Hover over tile to reveal 3-dots
    console.log('Hovering over tile...');
    await page.mouse.move(tileInfo.x, tileInfo.y);
    await new Promise(r => setTimeout(r, 600));

    // Inspect buttons in tile
    const threeDotsCoord = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
      if (tiles.length === 0) return null;
      const t = tiles[0];
      const btns = Array.from(t.querySelectorAll('button, div[role="button"]'));
      
      // Top right buttons
      for (const b of btns) {
        const txt = (b.innerText || '').toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        if (txt.includes('more') || txt.includes('…') || txt.includes('...') || aria.includes('more') || aria.includes('option') || aria.includes('menu')) {
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: b.innerText };
        }
      }

      // Fallback: check buttons near top right of tile
      const tr = t.getBoundingClientRect();
      for (const b of btns) {
        const br = b.getBoundingClientRect();
        if (br.top >= tr.top && br.top <= tr.top + 50 && br.right >= tr.right - 80) {
          return { x: br.x + br.width / 2, y: br.y + br.height / 2, text: b.innerText };
        }
      }

      return null;
    });

    console.log('3-Dots Button Coordinates:', JSON.stringify(threeDotsCoord));

    const clickX = threeDotsCoord ? threeDotsCoord.x : tileInfo.topX;
    const clickY = threeDotsCoord ? threeDotsCoord.y : tileInfo.topY;

    console.log(`2. Clicking 3-Dots at (${clickX}, ${clickY})...`);
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1000));

    // Inspect opened menu
    const menuItems = await page.evaluate(() => {
      const popovers = Array.from(document.querySelectorAll('div[role="menu"], [data-radix-popper-content-wrapper], div[data-state="open"]'));
      const items = [];
      popovers.forEach(p => {
        const btns = Array.from(p.querySelectorAll('button, [role="menuitem"], div[class*="item"]'));
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

    console.log('Opened 3-Dots Menu Items:', JSON.stringify(menuItems, null, 2));

    // Find and hover/click Download item
    const downloadItem = menuItems.find(i => i.text.toLowerCase().includes('download'));
    if (downloadItem) {
      console.log(`\n3. Hovering/Clicking "Download" at (${downloadItem.x}, ${downloadItem.y})...`);
      await page.mouse.move(downloadItem.x, downloadItem.y);
      await new Promise(r => setTimeout(r, 600));

      // Inspect sub-menu
      const subMenuItems = await page.evaluate(() => {
        const popovers = Array.from(document.querySelectorAll('div[role="menu"], [data-radix-popper-content-wrapper], div[data-state="open"]'));
        const items = [];
        popovers.forEach(p => {
          const btns = Array.from(p.querySelectorAll('button, [role="menuitem"], div[class*="item"]'));
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

      console.log('\nSub-Menu Options (1K / 2K / 4K):', JSON.stringify(subMenuItems, null, 2));

      // Look for 2K Upscaled option
      const opt2K = subMenuItems.find(i => i.text.toLowerCase().includes('2k'));
      if (opt2K) {
        console.log(`\n4. Clicking "2K (Upscaled)" option at (${opt2K.x}, ${opt2K.y})...`);
        await page.mouse.click(opt2K.x, opt2K.y);
        console.log('✓ Clicked 2K! Waiting 5s for download trigger...');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  await browser.close();
}

testTileUpscaleDownloadLive().catch(console.error);
