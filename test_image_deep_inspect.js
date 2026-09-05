const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testImageGenerationDeepInspect() {
  console.log('🔬 DEEP INSPECTION: Live Image Generation & Download Tracking in Google Flow...');
  
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

  // Listen to network requests for images
  const mediaUrls = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('getMediaUrlRedirect') || url.includes('media') || url.includes('blob:') || url.includes('labs.google')) {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('image') || url.includes('getMediaUrlRedirect')) {
        mediaUrls.push({ url, contentType: ct, status: response.status() });
        console.log(`📡 [NETWORK MEDIA EVENT] ${ct} -> ${url.substring(0, 100)}...`);
      }
    }
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

  // 1. Snapshot existing images before prompt
  const initialImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(i => i.src);
  });
  console.log(`Initial Images count on page: ${initialImgs.length}`);

  // 2. Switch to Image Mode
  console.log('1. Switching to Image Mode...');
  const pillCoord = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const r = b.getBoundingClientRect();
      const txt = (b.innerText || '').toLowerCase();
      return r.top > (window.innerHeight - 250) && (txt.includes('video') || txt.includes('banana') || txt.includes('720p') || txt.includes('x1'));
    });
    if (pill) {
      const r = pill.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
    }
    return null;
  });

  if (pillCoord) {
    await page.mouse.click(pillCoord.x, pillCoord.y);
    await new Promise(r => setTimeout(r, 800));

    // Click Image in popover
    await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('div, section, aside'));
      const popovers = allElements.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 200 && r.width < 450 && r.height > 150 && r.height < 550 && r.top > 200 && r.top < 850 && r.left > 500;
      });
      if (popovers.length > 0) {
        const btns = Array.from(popovers[0].querySelectorAll('button, [role="tab"]'));
        const imgBtn = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'image' || (b.innerText || '').trim().toLowerCase() === 'image image');
        if (imgBtn) imgBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 600));
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. Type Prompt in Slate box
  const testPrompt = `Cyberpunk electric dragon glowing neon ${Date.now()}`;
  console.log(`2. Typing Prompt: "${testPrompt}"...`);
  
  const focused = await page.evaluate(() => {
    const editor = document.querySelector('div[role="textbox"][contenteditable="true"]');
    if (editor) {
      editor.focus();
      return true;
    }
    return false;
  });

  if (focused) {
    // Select all & type
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(testPrompt, { delay: 20 });
    await new Promise(r => setTimeout(r, 500));
  }

  // 4. Click Submit Button (Arrow)
  console.log('3. Submitting Generation Request...');
  const submitted = await page.evaluate(() => {
    const submitBtn = document.querySelector('button[aria-label*="Create" i], button[aria-label*="Submit" i], button[aria-label*="Generate" i], button:has(svg polygon), button:has(svg path[d*="M5 12h14"])');
    if (submitBtn) {
      submitBtn.click();
      return true;
    }
    return false;
  });

  if (!submitted) {
    await page.keyboard.press('Enter');
  }

  console.log('Generation Submitted! Now monitoring every 1s for 30s...\n');

  // 5. Deep Monitoring Loop
  for (let sec = 1; sec <= 30; sec++) {
    await new Promise(r => setTimeout(r, 1000));

    const status = await page.evaluate((knownImgs) => {
      // Find all tiles
      const tiles = Array.from(document.querySelectorAll('div[data-tile-id], div[class*="tile"], div[class*="card"], div[class*="node"], [role="group"]'));
      
      const tileDetails = tiles.slice(0, 3).map((t, idx) => {
        const imgs = Array.from(t.querySelectorAll('img')).map(i => ({
          src: i.src,
          complete: i.complete,
          naturalWidth: i.naturalWidth,
          naturalHeight: i.naturalHeight,
          className: i.className
        }));

        const spinners = Array.from(t.querySelectorAll('svg[class*="spin"], [class*="spinner"], [aria-label*="generating" i], [aria-label*="loading" i]')).length;
        const progressBars = Array.from(t.querySelectorAll('[role="progressbar"], [aria-valuenow], [data-progress]')).map(p => p.getAttribute('aria-valuenow') || p.getAttribute('data-progress'));
        
        return {
          tileIndex: idx,
          text: t.innerText.substring(0, 100).replace(/\n/g, ' '),
          imagesCount: imgs.length,
          images: imgs,
          spinners,
          progressBars
        };
      });

      // Brand new images anywhere in DOM
      const allDomImgs = Array.from(document.querySelectorAll('img'));
      const newImgs = allDomImgs.filter(i => !knownImgs.includes(i.src) && i.src.startsWith('http')).map(i => ({
        src: i.src,
        complete: i.complete,
        naturalWidth: i.naturalWidth,
        naturalHeight: i.naturalHeight
      }));

      return {
        tileDetails,
        newImgsCount: newImgs.length,
        newImgs
      };
    }, initialImgs);

    console.log(`⏱️ [${sec}s]: NewImgs: ${status.newImgsCount} | Tiles: ${status.tileDetails.length}`);
    if (status.newImgsCount > 0) {
      console.log(`🎉 NEW IMAGE FOUND at ${sec}s:`, JSON.stringify(status.newImgs, null, 2));
      break;
    }
    if (status.tileDetails.length > 0 && status.tileDetails[0].images.length > 0) {
      console.log(`🎉 TILE IMAGE FOUND at ${sec}s:`, JSON.stringify(status.tileDetails[0], null, 2));
      break;
    }
  }

  console.log('\n========================================');
  console.log('NETWORK CAPTURED MEDIA URLS:');
  console.log(JSON.stringify(mediaUrls, null, 2));
  console.log('========================================\n');

  await browser.close();
}

testImageGenerationDeepInspect().catch(console.error);
