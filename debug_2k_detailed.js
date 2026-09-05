const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function debug2kUpscaleDetailed() {
  const profilePath = getAccountProfilePath('acc_2');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('trpc') && !url.includes('BatchLog') && !url.includes('fetchUser')) {
      try {
        const text = await res.text();
        console.log(`[API RESPONSE]: ${url}\n${text}\n`);
      } catch (e) {}
    }
  });

  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await sleep(5000);
  }

  // Hover first tile
  const tileCoord = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
    if (tiles.length === 0) return null;
    const r = tiles[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  if (tileCoord) {
    await page.mouse.move(tileCoord.x, tileCoord.y);
    await sleep(600);

    // Find and click 3 dots
    const moreBtn = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
      const btns = Array.from(tiles[0].querySelectorAll('button'));
      const more = btns.find(b => {
        const r = b.getBoundingClientRect();
        const txt = (b.innerText || '').toLowerCase();
        return r.width < 60 && r.height < 60 && (txt.includes('more') || txt.includes('…') || b.innerHTML.includes('more_vert'));
      });
      if (more) {
        const r = more.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });

    if (moreBtn) {
      console.log('Clicking 3 dots...');
      await page.mouse.click(moreBtn.x, moreBtn.y);
      await sleep(600);

      const dlBtn = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"]'));
        const dl = items.find(i => (i.innerText || '').toLowerCase().includes('download'));
        if (dl) {
          const r = dl.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        return null;
      });

      if (dlBtn) {
        console.log('Hovering Download...');
        await page.mouse.move(dlBtn.x, dlBtn.y);
        await sleep(600);

        const opt2K = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"], div[role="menu"] div'));
          const target = items.find(i => {
            const txt = (i.innerText || '').toLowerCase();
            return (txt.includes('2k') || txt.includes('upscaled')) && !txt.includes('4k');
          });
          if (target) {
            const r = target.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: target.innerText };
          }
          return null;
        });

        if (opt2K) {
          console.log(`Clicking Option: "${opt2K.text.replace(/\n/g, ' ')}"...`);
          await page.mouse.click(opt2K.x, opt2K.y);
          await sleep(5000);
        }
      }
    }
  }

  await browser.close();
}

debug2kUpscaleDetailed().catch(console.error);
