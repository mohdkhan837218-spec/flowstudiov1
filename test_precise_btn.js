const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testPreciseSmallBtn() {
  console.log('🔬 Testing Precise Small Button Finder (width < 60)...');
  
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

  // 1. Get first tile and hover
  const tileCoord = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
    if (tiles.length === 0) return null;
    const r = tiles[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  if (tileCoord) {
    console.log('Hovering tile...');
    await page.mouse.move(tileCoord.x, tileCoord.y);
    await new Promise(r => setTimeout(r, 800));

    // Find small button with width < 60 inside/near tile
    const moreBtn = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const smallBtns = allBtns.filter(b => {
        const r = b.getBoundingClientRect();
        return r.width > 15 && r.width < 50 && r.height > 15 && r.height < 50;
      });

      const more = smallBtns.find(b => {
        const txt = (b.innerText || '').toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        const html = b.innerHTML.toLowerCase();
        return txt.includes('more') || aria.includes('more') || aria.includes('option') || html.includes('more_vert');
      }) || smallBtns[smallBtns.length - 1];

      if (more) {
        const r = more.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, aria: more.getAttribute('aria-label') || '', txt: more.innerText };
      }
      return null;
    });

    console.log('Precise More Button:', JSON.stringify(moreBtn));

    if (moreBtn) {
      console.log(`Clicking More Button at (${moreBtn.x}, ${moreBtn.y})...`);
      await page.mouse.click(moreBtn.x, moreBtn.y);
      await new Promise(r => setTimeout(r, 1000));

      const menuItems = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], button'));
        return all.filter(i => {
          const r = i.getBoundingClientRect();
          return r.width > 60 && r.height > 20;
        }).map(i => {
          const r = i.getBoundingClientRect();
          return { text: i.innerText.trim().replace(/\n/g, ' '), x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
      });

      console.log('\n========================================');
      console.log('MENU ITEMS:', JSON.stringify(menuItems, null, 2));
      console.log('========================================\n');

      const dlItem = menuItems.find(i => i.text.toLowerCase().includes('download'));
      if (dlItem) {
        console.log(`Hovering Download at (${dlItem.x}, ${dlItem.y})...`);
        await page.mouse.move(dlItem.x, dlItem.y);
        await new Promise(r => setTimeout(r, 800));

        const subItems = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], button'));
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

testPreciseSmallBtn().catch(console.error);
