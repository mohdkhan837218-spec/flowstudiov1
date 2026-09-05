const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function test2kUpscaleLive() {
  console.log('Testing 2K Upscale Hover & Click with Real Puppeteer Mouse...');
  const profilePath = getAccountProfilePath('acc_2');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  // Track network responses
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('upscale') || url.includes('media') || url.includes('trpc')) {
      console.log(`[NETWORK RESPONSE]: ${url.substring(0, 100)} (status: ${res.status()})`);
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

  // 1. Locate newest generated tile
  const tileInfo = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
    if (tiles.length === 0) return null;
    const t = tiles[0];
    const r = t.getBoundingClientRect();
    return {
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      left: r.left,
      width: r.width,
      height: r.height
    };
  });

  if (!tileInfo) {
    console.log('No tile found!');
    await browser.close();
    return;
  }

  console.log(`Tile located at (${tileInfo.x}, ${tileInfo.y}). Moving mouse to tile...`);
  await page.mouse.move(tileInfo.x, tileInfo.y);
  await sleep(800);

  // 2. Now find the 3-dots button inside this tile with real coordinates
  const moreBtnCoords = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
    if (tiles.length === 0) return null;
    const t = tiles[0];
    const btns = Array.from(t.querySelectorAll('button'));
    const more = btns.find(b => {
      const r = b.getBoundingClientRect();
      const txt = (b.innerText || '').toLowerCase();
      return r.width < 60 && r.height < 60 && (txt.includes('more') || txt.includes('…') || b.innerHTML.includes('more_vert'));
    });
    if (more) {
      const r = more.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: more.innerText };
    }
    return null;
  });

  console.log('3-Dots button coordinates:', moreBtnCoords);

  if (moreBtnCoords) {
    console.log(`Clicking 3-Dots Menu at (${moreBtnCoords.x}, ${moreBtnCoords.y})...`);
    await page.mouse.click(moreBtnCoords.x, moreBtnCoords.y);
    await sleep(1000);

    // 3. Find Download menu item
    const dlCoords = await page.evaluate(() => {
      const allItems = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"]'));
      const dl = allItems.find(i => (i.innerText || '').toLowerCase().includes('download'));
      if (dl) {
        const r = dl.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: dl.innerText };
      }
      return null;
    });

    console.log('Download Item Coordinates:', dlCoords);

    if (dlCoords) {
      console.log(`Hovering Download option at (${dlCoords.x}, ${dlCoords.y})...`);
      await page.mouse.move(dlCoords.x, dlCoords.y);
      await sleep(1000);

      // 4. Find 2K option
      const opt2KCoords = await page.evaluate(() => {
        const allItems = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"], div[role="menu"] div'));
        const opt = allItems.find(i => {
          const txt = (i.innerText || '').toLowerCase();
          return (txt.includes('2k') || txt.includes('upscaled')) && !txt.includes('4k');
        });
        if (opt) {
          const r = opt.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: opt.innerText };
        }
        return null;
      });

      console.log('2K Option Coordinates:', opt2KCoords);

      if (opt2KCoords) {
        console.log(`Clicking 2K Option at (${opt2KCoords.x}, ${opt2KCoords.y})...`);
        const filesBefore = fs.readdirSync(downloadDir);
        await page.mouse.click(opt2KCoords.x, opt2KCoords.y);
        console.log('Clicked! Monitoring download folder and network for 15 seconds...');

        for (let s = 1; s <= 15; s++) {
          await sleep(1000);
          const currentFiles = fs.readdirSync(downloadDir);
          const newFiles = currentFiles.filter(f => !filesBefore.includes(f));
          if (newFiles.length > 0) {
            console.log(`🎉 NEW FILE DETECTED in Downloads: ${newFiles.join(', ')}!`);
            break;
          }
          console.log(`  Waiting for 2K download [${s}s]...`);
        }
      }
    }
  }

  await sleep(3000);
  await browser.close();
}

test2kUpscaleLive().catch(console.error);
