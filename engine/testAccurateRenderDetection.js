const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testAccurateRenderDetection() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads', 'GoogleFlow_Videos');

  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 2000));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    pipe: true,
    args: [
      `--user-data-dir=${targetDir}`,
      '--start-maximized',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0];

  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('1. Checking current media state before submitting new prompt...');
  const initialMedia = await page.evaluate(() => {
    const allVideos = Array.from(document.querySelectorAll('video, div:has(> [class*="play"])'));
    return {
      count: allVideos.length,
      videoSrcs: Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc)
    };
  });

  console.log('Initial Media on Canvas:', initialMedia);

  console.log('2. Submitting a test video prompt...');
  const promptCoords = await page.evaluate(() => {
    const el = document.querySelector('div[contenteditable="true"], textarea, [data-placeholder]');
    if (el) {
      el.focus();
      const r = el.getBoundingClientRect();
      return { x: r.x + 80, y: r.y + r.height / 2 };
    }
    return null;
  });

  if (promptCoords) {
    await page.mouse.click(promptCoords.x, promptCoords.y);
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 300));

    await page.keyboard.type('A glowing neon hummingbird flying in dark enchanted forest 4k', { delay: 18 });
    await new Promise(r => setTimeout(r, 1000));

    // Submit arrow
    const submitArrow = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const arrow = allBtns.find(b => {
        const rect = b.getBoundingClientRect();
        const isBottomRight = rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2);
        const isNotPill = !b.getAttribute('aria-haspopup') && !b.id.includes('radix');
        const hasArrow = b.innerHTML.includes('arrow_forward') || b.innerText.includes('Create');
        return isBottomRight && isNotPill && hasArrow;
      });
      if (arrow) {
        const r = arrow.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });

    if (submitArrow) {
      await page.mouse.click(submitArrow.x, submitArrow.y);
      console.log('Prompt Submitted! Tracking generation state live...');
    }
  }

  // 3. Track accurate rendering state
  let elapsed = 0;
  const maxWait = 240;
  let isDone = false;

  while (elapsed < maxWait) {
    await new Promise(r => setTimeout(r, 5000));
    elapsed += 5;

    const state = await page.evaluate((initialSrcs) => {
      // Check if there is an active progress spinner / generating card
      const activeSpinner = document.querySelector('div[class*="spinner"], div[class*="progress"], svg[class*="spin"], [aria-label*="Generating"], [aria-label*="Loading"]');
      
      // Check for any NEW video element that was NOT in initialSrcs
      const currentVideos = Array.from(document.querySelectorAll('video'));
      const newVideo = currentVideos.find(v => {
        const src = v.src || v.currentSrc;
        return src && src.length > 0 && !initialSrcs.includes(src);
      });

      return {
        hasActiveSpinner: !!activeSpinner,
        currentVideoCount: currentVideos.length,
        newVideoFound: !!newVideo,
        newVideoSrc: newVideo ? (newVideo.src || newVideo.currentSrc) : null,
        pageTextSample: document.body.innerText.substring(0, 200)
      };
    }, initialMedia.videoSrcs);

    console.log(`[${elapsed}s] Active State:`, state);

    if (elapsed >= 20 && !state.hasActiveSpinner && (state.newVideoFound || state.currentVideoCount > initialMedia.count)) {
      console.log(`🎉 NEW VIDEO FINISHED RENDERING in ${elapsed} seconds!`);
      isDone = true;
      break;
    }
  }

  if (isDone) {
    console.log('4. Now triggering download of newly generated video...');
    // Click newly created video tile (top left of grid)
    await page.mouse.click(400, 200);
    await new Promise(r => setTimeout(r, 1500));

    // Click download button
    const downloaded = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dl = btns.find(b => {
        const r = b.getBoundingClientRect();
        return r.y < 80 && (b.innerText.includes('Download') || b.innerHTML.includes('download'));
      });
      if (dl) {
        dl.click();
        return true;
      }
      return false;
    });

    console.log('Download button clicked:', downloaded);
    await new Promise(r => setTimeout(r, 8000));

    const files = fs.readdirSync(downloadDir);
    console.log('Files in Download Directory:', files);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testAccurateRenderDetection().catch(console.error);
