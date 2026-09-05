const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testCompleteFlowCycle() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');

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

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('1. Checking & Configuring Settings on Canvas...');
  
  // Step A: Click Pill to open settings
  const pillCoordinates = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (b.innerText.includes('Video') || b.innerText.includes('Nano') || b.getAttribute('aria-haspopup') === 'menu');
    });
    if (pill) {
      const r = pill.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
    }
    return null;
  });

  console.log('Pill coordinates:', pillCoordinates);

  if (pillCoordinates) {
    await page.mouse.click(pillCoordinates.x, pillCoordinates.y);
    await new Promise(r => setTimeout(r, 1200));

    // Step B: Click Video Tab
    const videoTab = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="tab"]'));
      const v = btns.find(b => (b.innerText || '').trim().includes('Video'));
      if (v) {
        const r = v.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });

    if (videoTab) {
      await page.mouse.click(videoTab.x, videoTab.y);
      console.log('Clicked Video tab!');
      await new Promise(r => setTimeout(r, 800));
    }

    // Step C: Click 16:9
    const aspect169 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      const a = btns.find(b => (b.innerText || '').trim() === '16:9');
      if (a) {
        const r = a.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });

    if (aspect169) {
      await page.mouse.click(aspect169.x, aspect169.y);
      console.log('Clicked 16:9 Aspect Ratio!');
      await new Promise(r => setTimeout(r, 800));
    }

    // Step D: Click Duration 10s or 8s
    const durBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div, span'));
      const d = btns.find(b => (b.innerText || '').trim() === '10s' || (b.innerText || '').trim() === '8s');
      if (d) {
        const r = d.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: d.innerText };
      }
      return null;
    });

    if (durBtn) {
      await page.mouse.click(durBtn.x, durBtn.y);
      console.log('Clicked Duration:', durBtn.text);
      await new Promise(r => setTimeout(r, 800));
    }

    // Step E: Click x1 Multiplier
    const x1Btn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div, span'));
      const x = btns.find(b => (b.innerText || '').trim() === 'x1');
      if (x) {
        const r = x.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });

    if (x1Btn) {
      await page.mouse.click(x1Btn.x, x1Btn.y);
      console.log('Clicked x1 Multiplier!');
      await new Promise(r => setTimeout(r, 800));
    }

    // Step F: GUARANTEED POPUP CLOSURE
    console.log('Closing Popover safely...');
    let closed = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const isOpen = await page.evaluate(() => {
        return !!document.querySelector('[data-radix-popper-content-wrapper], div[role="dialog"], div[data-state="open"]');
      });

      if (!isOpen) {
        closed = true;
        console.log(`Popover confirmed CLOSED on attempt ${attempt}!`);
        break;
      }

      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 400));
      if (attempt >= 2) {
        // Click on neutral space above prompt bar
        await page.mouse.click(600, 200);
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // Step 2: Focus Prompt Input & Type Prompt
  console.log('2. Focusing and typing prompt...');
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

    const testPrompt = 'A majestic golden eagle soaring over snow covered mountain peaks 4k cinematic';
    console.log(`Typing: "${testPrompt}"`);
    await page.keyboard.type(testPrompt, { delay: 18 });
    await new Promise(r => setTimeout(r, 1200));

    // Step 3: Check Arrow button status and click
    const arrowStatus = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const arrowBtn = allBtns.find(b => {
        const svg = b.querySelector('svg, path, i');
        const rect = b.getBoundingClientRect();
        return svg && rect.top > (window.innerHeight - 160) && rect.right > (window.innerWidth / 2) && rect.width > 20;
      });

      if (arrowBtn) {
        const r = arrowBtn.getBoundingClientRect();
        return {
          found: true,
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
          disabled: arrowBtn.getAttribute('aria-disabled'),
          outerHTML: arrowBtn.outerHTML.substring(0, 150)
        };
      }
      return { found: false };
    });

    console.log('Submit Arrow Status:', arrowStatus);

    if (arrowStatus.found) {
      await page.mouse.click(arrowStatus.x, arrowStatus.y);
      console.log('>>> CLICKED SUBMIT ARROW! <<<');
      await new Promise(r => setTimeout(r, 4000));

      const generationTile = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('*')).filter(el => {
          const txt = (el.innerText || '').toLowerCase();
          return txt.includes('generating') || txt.includes('rendering') || txt.includes('queued') || el.className.includes('spinner') || el.className.includes('progress');
        });
        return tiles.length > 0 ? 'GENERATION_ACTIVE' : 'NO_TILE';
      });

      console.log('Generation Activity Check:', generationTile);
    }
  }

  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
  console.log('Test completed!');
}

testCompleteFlowCycle().catch(console.error);
