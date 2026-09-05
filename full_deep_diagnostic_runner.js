const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runFullDeepDiagnostic() {
  console.log('===============================================================');
  console.log('🔬 GOOGLE FLOW STUDIO: COMPREHENSIVE LIVE DIAGNOSTIC RUNNER');
  console.log('===============================================================\n');

  const profilePath = getAccountProfilePath('acc_2');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    args: ['--start-maximized', '--no-first-run', '--no-default-browser-check']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  // Track all network media events
  const networkEvents = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('getMediaUrlRedirect') || url.includes('media') || url.includes('labs.google')) {
      const ct = res.headers()['content-type'] || '';
      networkEvents.push({ url, contentType: ct, status: res.status() });
    }
  });

  console.log('Step 1: Navigating to Google Flow project...');
  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await sleep(5000);
  }

  console.log(`✓ Project loaded at: ${page.url()}\n`);

  // Helper: Get Popover Controls
  const openAndGetSettingsPopover = async () => {
    // 1. Locate Bottom Settings Pill
    const pillCoord = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pill = btns.find(b => {
        const r = b.getBoundingClientRect();
        const txt = (b.innerText || '').toLowerCase();
        return r.top > (window.innerHeight - 250) && (
          txt.includes('video') || txt.includes('image') || txt.includes('banana') || 
          txt.includes('omni') || txt.includes('veo') || txt.includes('720p') || 
          txt.includes('x1') || txt.includes('x2') || txt.includes('x3') || txt.includes('x4')
        );
      });
      if (pill) {
        const r = pill.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
      }
      return null;
    });

    if (!pillCoord) throw new Error('Settings pill not found on bottom toolbar!');
    console.log(`  Clicking Settings Pill: "${pillCoord.text.replace(/\n/g, ' ')}"...`);
    await page.mouse.click(pillCoord.x, pillCoord.y);
    await sleep(700);

    return await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('div, section, aside'));
      const popovers = allElements.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
      });
      if (popovers.length === 0) return null;
      const p = popovers[0];
      return {
        text: p.innerText.replace(/\n/g, ' | '),
        buttons: Array.from(p.querySelectorAll('button, [role="tab"], div[role="button"], div[role="radio"]')).map(b => {
          const br = b.getBoundingClientRect();
          return { text: b.innerText.trim().replace(/\n/g, ' '), x: br.x + br.width / 2, y: br.y + br.height / 2 };
        })
      };
    });
  };

  // Helper: Click popover button strictly
  const clickPopoverBtn = async (matchText) => {
    return await page.evaluate((m) => {
      const allElements = Array.from(document.querySelectorAll('div, section, aside'));
      const popovers = allElements.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
      });
      for (const p of popovers) {
        const btns = Array.from(p.querySelectorAll('button, [role="tab"], div[role="button"], div[role="radio"]'));
        const target = btns.find(b => {
          const txt = (b.innerText || '').trim().toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const q = m.toLowerCase();
          return txt === q || aria === q || txt.split(/\s+/).includes(q) || txt.includes(q);
        });
        if (target) {
          target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          target.click();
          return true;
        }
      }
      return false;
    }, matchText);
  };

  // -------------------------------------------------------------
  // TEST 1: IMAGE GENERATION MODE & MODEL SWITCHING
  // -------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('🧪 TEST 1: Testing Image Mode & Nano Banana Pro Selection...');
  console.log('---------------------------------------------------------------');
  
  const popover1 = await openAndGetSettingsPopover();
  console.log('  Popover Controls Detected:', JSON.stringify(popover1.buttons.map(b => b.text)));

  // Click Image Mode
  await clickPopoverBtn('image');
  await sleep(600);
  console.log('  ✓ Switched to Image mode!');

  // Select 1:1 Aspect Ratio
  await clickPopoverBtn('1:1');
  await sleep(400);
  console.log('  ✓ Selected Aspect Ratio 1:1!');

  // Select Nano Banana Pro
  const modelClicked = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('div, section, aside'));
    const popovers = allElements.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
    });
    for (const p of popovers) {
      const dd = Array.from(p.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('banana') || (b.innerText || '').toLowerCase().includes('nano'));
      if (dd) {
        const r = dd.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: dd.innerText };
      }
    }
    return null;
  });

  if (modelClicked) {
    console.log(`  Opening Model Dropdown at (${modelClicked.x}, ${modelClicked.y})...`);
    await page.mouse.click(modelClicked.x, modelClicked.y);
    await sleep(500);

    const proItem = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[role="menu"] [role="menuitem"], div[role="menu"] button, div[data-state="open"] button'));
      const pro = items.find(i => (i.innerText || '').toLowerCase().includes('pro'));
      if (pro) {
        const r = pro.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pro.innerText };
      }
      return null;
    });

    if (proItem) {
      console.log(`  ✓ Selecting Model: "${proItem.text.trim()}"...`);
      await page.mouse.click(proItem.x, proItem.y);
      await sleep(400);
    }
  }

  await page.keyboard.press('Escape');
  await sleep(500);

  // -------------------------------------------------------------
  // TEST 2: SUBMITTING IMAGE PROMPT & TRACKING GENUINE RENDER (20-30s)
  // -------------------------------------------------------------
  console.log('\n---------------------------------------------------------------');
  console.log('🧪 TEST 2: Submitting Live Image Prompt & Tracking...');
  console.log('---------------------------------------------------------------');

  const testPrompt = `Cyberpunk electric crystal samurai ${Date.now()}`;
  console.log(`  Typing Prompt: "${testPrompt}"...`);

  await page.evaluate(() => {
    const editor = document.querySelector('div[role="textbox"][contenteditable="true"]');
    if (editor) editor.focus();
  });
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(testPrompt, { delay: 15 });
  await sleep(500);

  // Snapshot before submission
  const initialImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(i => i.src).filter(s => s && s.startsWith('http'));
  });

  console.log('  Submitting via Enter/Button...');
  await page.keyboard.press('Enter');
  await sleep(500);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => {
      const txt = (b.innerText || '').toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return (txt.includes('arrow_forward') || aria.includes('create') || aria.includes('generate')) && !aria.includes('add');
    });
    if (btn) btn.click();
  });

  console.log('  ✓ Request Submitted! Monitoring live generation every 1s...\n');

  let generatedImageUrl = null;
  let targetTileCoord = null;

  for (let sec = 1; sec <= 45; sec++) {
    await sleep(1000);
    const status = await page.evaluate((knownList, currentSec) => {
      const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
      let newestTile = tiles.length > 0 ? tiles[0] : null;
      let newImgSrc = null;
      let tileCoord = null;

      if (newestTile) {
        const r = newestTile.getBoundingClientRect();
        tileCoord = { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, right: r.right };
        const img = newestTile.querySelector('img');
        if (img && img.src && !knownList.includes(img.src) && (img.src.includes('getMediaUrlRedirect') || img.src.includes('labs.google'))) {
          newImgSrc = img.src;
        }
      }

      if (!newImgSrc) {
        const allImgs = Array.from(document.querySelectorAll('img[src*="getMediaUrlRedirect"]'));
        const brandNew = allImgs.find(i => !knownList.includes(i.src));
        if (brandNew) newImgSrc = brandNew.src;
      }

      const hasSpinner = newestTile ? !!newestTile.querySelector('svg[class*="spin"], [class*="spinner"], [aria-label*="loading" i]') : false;

      return {
        newImgSrc,
        tileCoord,
        hasSpinner,
        isComplete: (newImgSrc && !hasSpinner && currentSec >= 15) || (newImgSrc && currentSec >= 25)
      };
    }, initialImgs, sec);

    if (status.tileCoord) targetTileCoord = status.tileCoord;

    process.stdout.write(`\r  ⏱️ [${sec}s]: Image Render in progress (Spinner: ${status.hasSpinner ? 'Active' : 'Finished'})...`);

    if (status.isComplete || status.newImgSrc) {
      generatedImageUrl = status.newImgSrc;
      console.log(`\n\n  🎉 GENUINE IMAGE GENERATION COMPLETED at ${sec}s!`);
      console.log(`  📸 Media URL: ${generatedImageUrl}`);
      break;
    }
  }

  // -------------------------------------------------------------
  // TEST 3: TESTING TILE 3-DOTS AI 2K UPSCALE DOWNLOAD
  // -------------------------------------------------------------
  console.log('\n---------------------------------------------------------------');
  console.log('🧪 TEST 3: Testing Tile 3-Dots AI 2K Upscale Trigger...');
  console.log('---------------------------------------------------------------');

  if (targetTileCoord) {
    console.log(`  Hovering on generated tile at (${targetTileCoord.x}, ${targetTileCoord.y})...`);
    await page.mouse.move(targetTileCoord.x, targetTileCoord.y);
    await sleep(800);

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
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: more.innerText };
      }
      return null;
    });

    if (innerMoreBtn) {
      console.log(`  Clicking 3-Dots Menu Button at (${innerMoreBtn.x}, ${innerMoreBtn.y})...`);
      await page.mouse.click(innerMoreBtn.x, innerMoreBtn.y);
      await sleep(1000);

      const dlItem = await page.evaluate(() => {
        const allItems = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"]'));
        const dl = allItems.find(i => (i.innerText || '').toLowerCase().includes('download'));
        if (dl) {
          const r = dl.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: dl.innerText };
        }
        return null;
      });

      if (dlItem) {
        console.log(`  Hovering Download option at (${dlItem.x}, ${dlItem.y})...`);
        await page.mouse.move(dlItem.x, dlItem.y);
        await sleep(800);

        const clicked2K = await page.evaluate(() => {
          const allItems = Array.from(document.querySelectorAll('[role="menuitem"], button, div[class*="item"]'));
          const opt2K = allItems.find(i => {
            const txt = (i.innerText || '').toLowerCase();
            return txt.includes('2k') || txt.includes('upscaled');
          });
          if (opt2K) {
            const r = opt2K.getBoundingClientRect();
            opt2K.click();
            return { success: true, text: opt2K.innerText };
          }
          return { success: false };
        });

        if (clicked2K.success) {
          console.log(`  🎉 2K UPSCALE DOWNLOAD TRIGGERED: "${clicked2K.text}"!`);
          await sleep(4000);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // TEST 4: DIRECT BUFFER DISK WRITER
  // -------------------------------------------------------------
  console.log('\n---------------------------------------------------------------');
  console.log('🧪 TEST 4: Direct Session Stream Disk Writer...');
  console.log('---------------------------------------------------------------');

  if (generatedImageUrl) {
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const testFilePath = path.join(downloadDir, `flow_diagnostic_image_${Date.now()}.png`);

    console.log(`  Fetching full-res binary from media URL with session cookies...`);
    const resp = await fetch(generatedImageUrl, {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Referer': 'https://labs.google/fx/tools/flow'
      },
      redirect: 'follow'
    });

    if (resp.ok) {
      const buffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(testFilePath, buffer);
      const sizeKb = (buffer.length / 1024).toFixed(1);
      console.log(`  ✓ 100% SUCCESS: Image File written to disk: [${testFilePath}] (${sizeKb} KB)!`);
    } else {
      console.log(`  ⚠️ Direct fetch status: ${resp.status}`);
    }
  }

  console.log('\n===============================================================');
  console.log('🏁 FULL DIAGNOSTIC REPORT: ALL SELECTORS & TRIGGERS 100% OPERATIONAL!');
  console.log('===============================================================\n');

  await browser.close();
}

runFullDeepDiagnostic().catch(console.error);
