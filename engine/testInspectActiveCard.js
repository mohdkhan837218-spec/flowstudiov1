const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testInspectActiveCard() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');

  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 3000));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: [
      `--user-data-dir=${targetDir}`,
      '--start-maximized',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0];

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('1. Gathering ALL existing media IDs on canvas...');
  const existingIds = await page.evaluate(() => {
    const ids = new Set();
    const all = Array.from(document.querySelectorAll('*'));
    all.forEach(el => {
      const src = el.src || el.currentSrc || el.getAttribute('data-media-id') || el.getAttribute('href') || '';
      const match = src.match(/name=([a-f0-9-]+)/);
      if (match) ids.add(match[1]);
      if (el.innerHTML) {
        const matches = el.innerHTML.match(/name=([a-f0-9-]{36})/g);
        if (matches) {
          matches.forEach(m => ids.add(m.replace('name=', '')));
        }
      }
    });
    return Array.from(ids);
  });

  console.log(`Found ${existingIds.length} existing media IDs on canvas:`, existingIds);

  console.log('2. Submitting prompt: "a cute red panda eating bamboo in snowfall 4k"...');
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

    await page.keyboard.type('a cute red panda eating bamboo in snowfall 4k', { delay: 15 });
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
      console.log('Submit Arrow Clicked! Tracking newly spawned card and media ID...');
    }
  }

  let elapsed = 0;
  const maxWait = 240;
  let foundNewMediaId = null;

  while (elapsed < maxWait) {
    await new Promise(r => setTimeout(r, 5000));
    elapsed += 5;

    const check = await page.evaluate((knownIds, elSec) => {
      let newId = null;
      let newUrl = null;
      let isVideoReady = false;

      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        const src = v.src || v.currentSrc || '';
        const match = src.match(/name=([a-f0-9-]+)/);
        if (match && !knownIds.includes(match[1])) {
          newId = match[1];
          newUrl = src;
          if (v.duration > 0 || v.readyState >= 2) {
            isVideoReady = true;
          }
          break;
        }
      }

      const activeSpinner = document.querySelector('div[class*="spinner"], div[class*="progress"], svg[class*="spin"], [aria-label*="Generating"]');

      return {
        elapsed: elSec,
        newId,
        newUrl,
        isVideoReady,
        hasSpinner: !!activeSpinner,
        totalVideosOnPage: videos.length
      };
    }, existingIds, elapsed);

    console.log(`[${elapsed}s] Canvas Status:`, check);

    if (elapsed >= 25 && check.newId && !check.hasSpinner) {
      console.log(`🎉 TRUE NEW VIDEO FINISHED RENDERING at ${elapsed}s! ID: ${check.newId}`);
      foundNewMediaId = check.newId;
      break;
    }
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testInspectActiveCard().catch(console.error);
