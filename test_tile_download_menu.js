const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testTileMenuDownload() {
  console.log('🔬 Testing Tile 3-Dots Download Menu for 1K / 2K...');
  
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

  // Listen to browser downloads
  const client = await page.target().createCDPSession();
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads');
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

  // 1. Locate the first tile on canvas
  console.log('1. Locating First Tile and its 3-dots menu...');
  const menuBtn = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
    if (tiles.length === 0) return null;
    
    // Find first tile with an image or video
    const t = tiles[0];
    const r = t.getBoundingClientRect();
    
    // Hover over tile to make 3-dots visible
    t.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    t.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    // Find 3-dots button inside tile
    const btns = Array.from(t.querySelectorAll('button'));
    const moreBtn = btns.find(b => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const txt = (b.innerText || '').toLowerCase();
      return aria.includes('more') || aria.includes('option') || aria.includes('menu') || txt.includes('more_vert') || txt.includes('…') || txt.includes('...');
    }) || btns[btns.length - 1];

    if (moreBtn) {
      const mr = moreBtn.getBoundingClientRect();
      return { x: mr.x + mr.width / 2, y: mr.y + mr.height / 2, tileX: r.x + r.width / 2, tileY: r.y + r.height / 2 };
    }
    return { tileX: r.x + r.width / 2, tileY: r.y + r.height / 2 };
  });

  console.log('Tile Menu Coords:', JSON.stringify(menuBtn));

  if (menuBtn) {
    // Hover over tile
    await page.mouse.move(menuBtn.tileX, menuBtn.tileY);
    await new Promise(r => setTimeout(r, 500));

    if (menuBtn.x) {
      console.log(`Clicking 3-dots at (${menuBtn.x}, ${menuBtn.y})...`);
      await page.mouse.click(menuBtn.x, menuBtn.y);
      await new Promise(r => setTimeout(r, 800));

      // Inspect open menu
      const menuItems = await page.evaluate(() => {
        const menus = Array.from(document.querySelectorAll('div[role="menu"], [data-radix-popper-content-wrapper], div[data-state="open"]'));
        const items = [];
        menus.forEach(m => {
          const btns = Array.from(m.querySelectorAll('button, [role="menuitem"], div[class*="item"]'));
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

      // Hover over "Download"
      const downloadItem = menuItems.find(i => i.text.toLowerCase().includes('download'));
      if (downloadItem) {
        console.log(`Hovering over Download at (${downloadItem.x}, ${downloadItem.y})...`);
        await page.mouse.move(downloadItem.x, downloadItem.y);
        await new Promise(r => setTimeout(r, 800));

        // Inspect sub-menu (1K, 2K, 4K)
        const subMenuItems = await page.evaluate(() => {
          const menus = Array.from(document.querySelectorAll('div[role="menu"], [data-radix-popper-content-wrapper], div[data-state="open"]'));
          const items = [];
          menus.forEach(m => {
            const btns = Array.from(m.querySelectorAll('button, [role="menuitem"], div[class*="item"]'));
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

        console.log('Download Sub-Menu Items (1K / 2K):', JSON.stringify(subMenuItems, null, 2));
      }
    }
  }

  await browser.close();
}

testTileMenuDownload().catch(console.error);
