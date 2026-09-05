const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testClickMoreVert() {
  console.log('🔬 Testing Exact "more_vert" Click & Upscale Menu...');
  
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

  // 1. Locate the first tile on the canvas
  console.log('1. Hovering Tile & Locating "more_vert" button...');
  const moreVertCoord = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
    if (tiles.length === 0) return null;
    const t = tiles[0];
    
    // Trigger hover events
    t.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    t.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    const btns = Array.from(t.querySelectorAll('button, div[role="button"]'));
    const moreBtn = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('more_vert') || aria.includes('more') || aria.includes('option');
    });

    if (moreBtn) {
      const r = moreBtn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: moreBtn.innerText };
    }
    return null;
  });

  console.log('More_vert Coord:', JSON.stringify(moreVertCoord));

  if (moreVertCoord) {
    console.log(`2. Clicking More_vert at (${moreVertCoord.x}, ${moreVertCoord.y})...`);
    await page.mouse.click(moreVertCoord.x, moreVertCoord.y);
    await new Promise(r => setTimeout(r, 1000));

    // Inspect opened menu items
    const menuData = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('div[role="menu"] [role="menuitem"], div[data-state="open"] [role="menuitem"], [role="menuitem"], div[class*="menuitem"]'));
      return allElements.map(el => {
        const r = el.getBoundingClientRect();
        return {
          text: el.innerText.trim().replace(/\n/g, ' '),
          x: r.x + r.width / 2,
          y: r.y + r.height / 2
        };
      });
    });

    console.log('Opened Menu Items:', JSON.stringify(menuData, null, 2));

    const downloadItem = menuData.find(i => i.text.toLowerCase().includes('download'));
    if (downloadItem) {
      console.log(`\n3. Hovering over "Download" at (${downloadItem.x}, ${downloadItem.y})...`);
      await page.mouse.move(downloadItem.x, downloadItem.y);
      await new Promise(r => setTimeout(r, 800));

      const subMenuItems = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('div[role="menu"] [role="menuitem"], [role="menuitem"], div[class*="menuitem"]'));
        return allElements.map(el => {
          const r = el.getBoundingClientRect();
          return {
            text: el.innerText.trim().replace(/\n/g, ' '),
            x: r.x + r.width / 2,
            y: r.y + r.height / 2
          };
        });
      });

      console.log('\nAll Active Sub-Menu Options:', JSON.stringify(subMenuItems, null, 2));
    }
  }

  await browser.close();
}

testClickMoreVert().catch(console.error);
