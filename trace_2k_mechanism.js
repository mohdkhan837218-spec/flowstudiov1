const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function traceTile3Dots() {
  console.log('Testing exact Tile 3-dots button on Google Flow...');
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

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('trpc') || url.includes('media') || url.includes('upscale') || url.includes('download')) {
      console.log(`[RESPONSE] ${res.status()} ${url.substring(0, 120)}`);
      try {
        const text = await res.text();
        console.log(`  BODY: ${text.substring(0, 250)}`);
      } catch (e) {}
    }
  });

  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(4000);

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await sleep(6000);
  }

  // 1. Locate the first media tile
  const tile = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"]'));
    if (tiles.length === 0) return null;
    const t = tiles[0];
    const r = t.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  console.log('Tile rect:', tile);

  if (tile) {
    // Hover over tile center
    await page.mouse.move(tile.x + tile.w / 2, tile.y + tile.h / 2);
    await sleep(800);

    // Find the 3-dots button INSIDE this tile rect!
    const tile3Dots = await page.evaluate((tileRect) => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const insideBtns = allBtns.filter(b => {
        const r = b.getBoundingClientRect();
        return r.x >= tileRect.x - 10 && 
               r.x + r.width <= tileRect.x + tileRect.w + 10 && 
               r.y >= tileRect.y - 10 && 
               r.y + r.height <= tileRect.y + tileRect.h + 10;
      });

      console.log('Inside buttons count:', insideBtns.length);
      const dots = insideBtns.find(b => {
        const txt = (b.innerText || '').toLowerCase();
        const html = b.innerHTML.toLowerCase();
        return txt.includes('more') || txt.includes('…') || html.includes('more_vert');
      });

      if (dots) {
        const r = dots.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, txt: dots.innerText };
      }
      return null;
    }, tile);

    console.log('Tile 3-Dots inside rect:', tile3Dots);

    if (tile3Dots) {
      console.log(`Clicking tile 3-dots at (${tile3Dots.x}, ${tile3Dots.y})...`);
      await page.mouse.click(tile3Dots.x, tile3Dots.y);
      await sleep(1000);

      // Inspect menu items
      const menuItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], div[role="menu"] div, button'));
        return items.map(i => {
          const r = i.getBoundingClientRect();
          return {
            txt: i.innerText.replace(/\n/g, ' '),
            rect: { x: r.x, y: r.y, w: r.width, h: r.height }
          };
        }).filter(i => i.rect.w > 50 && i.rect.h > 15 && i.txt.length > 0 && i.rect.y > 0);
      });

      console.log('Tile Menu Items:', JSON.stringify(menuItems, null, 2));

      // Find Download option in menu
      const dlOption = menuItems.find(i => i.txt.toLowerCase().includes('download'));
      if (dlOption) {
        console.log(`\nHovering Download at (${dlOption.rect.x + dlOption.rect.w/2}, ${dlOption.rect.y + dlOption.rect.h/2})...`);
        await page.mouse.move(dlOption.rect.x + dlOption.rect.w/2, dlOption.rect.y + dlOption.rect.h/2);
        await sleep(1000);

        // Submenu items
        const subItems = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"], div[class*="item"], div[role="menu"] div, button'));
          return items.map(i => {
            const r = i.getBoundingClientRect();
            return {
              txt: i.innerText.replace(/\n/g, ' '),
              rect: { x: r.x, y: r.y, w: r.width, h: r.height }
            };
          }).filter(i => i.rect.w > 40 && i.rect.h > 15 && i.txt.length > 0);
        });

        console.log('Submenu Items:', JSON.stringify(subItems, null, 2));

        const opt2k = subItems.find(i => (i.txt.toLowerCase().includes('2k') || i.txt.toLowerCase().includes('upscaled')) && !i.txt.toLowerCase().includes('4k'));
        if (opt2k) {
          console.log(`\n🎉 CLICKING 2K UPSCALE OPTION: "${opt2k.txt}"...`);
          const beforeFiles = fs.readdirSync(downloadDir);
          await page.mouse.click(opt2k.rect.x + opt2k.rect.w/2, opt2k.rect.y + opt2k.rect.h/2);
          console.log('Clicked 2K! Waiting 15s to observe downloads and requests...');

          for (let s = 1; s <= 15; s++) {
            await sleep(1000);
            const curFiles = fs.readdirSync(downloadDir);
            const newF = curFiles.filter(f => !beforeFiles.includes(f));
            if (newF.length > 0) {
              console.log(`\n📥 DOWNLOADED: ${newF.join(', ')}`);
              for (const f of newF) {
                const sz = fs.statSync(path.join(downloadDir, f)).size;
                console.log(`   Size: ${(sz / (1024*1024)).toFixed(2)} MB (${sz} bytes)`);
              }
            }
          }
        }
      }
    }
  }

  await browser.close();
}

traceTile3Dots().catch(console.error);
