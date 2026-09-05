const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testClickExactMore() {
  console.log('🔬 Testing EXACT (508, 100) More Button Click & Submenu...');
  
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

  // Hover over tile center to make 3-dots appear
  console.log('1. Hovering Tile center...');
  await page.mouse.move(388, 156);
  await new Promise(r => setTimeout(r, 600));

  // Find exact "more_vert" button coordinates
  const moreBtnCoord = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => (b.innerText || '').trim() === 'more_vert More' || (b.innerText || '').trim() === 'more_vert' || (b.getAttribute('aria-label') || '').toLowerCase() === 'more');
    if (target) {
      const r = target.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: target.innerText };
    }
    return null;
  });

  console.log('More button coordinates:', JSON.stringify(moreBtnCoord));

  if (moreBtnCoord) {
    console.log(`2. Clicking More Button at (${moreBtnCoord.x}, ${moreBtnCoord.y})...`);
    await page.mouse.click(moreBtnCoord.x, moreBtnCoord.y);
    await new Promise(r => setTimeout(r, 1000));

    // Inspect opened menu items
    const menuItems = await page.evaluate(() => {
      const popovers = Array.from(document.querySelectorAll('div[role="menu"], [data-radix-popper-content-wrapper], div[data-state="open"], body > div'));
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
    console.log('OPENED 3-DOTS MENU ITEMS:');
    console.log(JSON.stringify(menuItems, null, 2));
    console.log('========================================\n');

    // Hover over "Download"
    const dlItem = menuItems.find(i => i.text.toLowerCase().includes('download'));
    if (dlItem) {
      console.log(`3. Hovering over Download at (${dlItem.x}, ${dlItem.y})...`);
      await page.mouse.move(dlItem.x, dlItem.y);
      await new Promise(r => setTimeout(r, 800));

      const subMenuItems = await page.evaluate(() => {
        const allItems = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"]'));
        return allItems.filter(i => {
          const txt = i.innerText.trim();
          return (txt.includes('1K') || txt.includes('2K') || txt.includes('4K') || txt.includes('Original') || txt.includes('Upscaled'));
        }).map(i => {
          const r = i.getBoundingClientRect();
          return { text: i.innerText.trim().replace(/\n/g, ' '), x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
      });

      console.log('SUBMENU (1K / 2K / 4K):', JSON.stringify(subMenuItems, null, 2));
    }
  }

  await browser.close();
}

testClickExactMore().catch(console.error);
