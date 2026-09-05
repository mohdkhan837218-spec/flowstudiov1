const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testPopupCloseAndType() {
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

  console.log('1. Finding Pill and opening popup...');
  const pillBox = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (txt.includes('Video') || txt.includes('Nano') || b.getAttribute('aria-haspopup') === 'menu');
    });

    if (pill) {
      const rect = pill.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    return null;
  });

  if (pillBox) {
    await page.mouse.click(pillBox.x, pillBox.y);
    await new Promise(r => setTimeout(r, 1000));

    // Select Video
    const videoBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="tab"]'));
      const v = btns.find(b => (b.innerText || '').trim().includes('Video'));
      if (v) {
        const r = v.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (videoBtn) {
      await page.mouse.click(videoBtn.x, videoBtn.y);
      await new Promise(r => setTimeout(r, 600));
    }

    // Select 16:9
    const aspect = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], div, span'));
      const a = all.find(b => (b.innerText || '').trim() === '16:9');
      if (a) {
        const r = a.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (aspect) {
      await page.mouse.click(aspect.x, aspect.y);
      await new Promise(r => setTimeout(r, 600));
    }

    // Select 10s
    const dur = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div, span'));
      const d = btns.find(b => (b.innerText || '').trim() === '10s');
      if (d) {
        const r = d.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (dur) {
      await page.mouse.click(dur.x, dur.y);
      await new Promise(r => setTimeout(r, 600));
    }

    // Close popup by clicking the Pill button again!
    console.log('2. Closing popup by clicking the Pill button again...');
    await page.mouse.click(pillBox.x, pillBox.y);
    await new Promise(r => setTimeout(r, 1000));

    // Check if popup is closed
    const isPopupOpen = await page.evaluate(() => {
      const popover = document.querySelector('[data-radix-popper-content-wrapper], div[role="dialog"]');
      return !!popover;
    });
    console.log('Is Popup Still Open?', isPopupOpen);

    if (isPopupOpen) {
      // Force close by clicking empty canvas top left
      console.log('Clicking canvas top left to force close...');
      await page.mouse.click(400, 200);
      await new Promise(r => setTimeout(r, 800));
    }
  }

  console.log('3. Focusing and typing into prompt box...');
  const promptBox = await page.evaluate(() => {
    const el = document.querySelector('div[contenteditable="true"], textarea, [data-placeholder]');
    if (el) {
      el.focus();
      el.click();
      const r = el.getBoundingClientRect();
      return { x: r.x + 80, y: r.y + r.height / 2 };
    }
    return null;
  });

  if (promptBox) {
    await page.mouse.click(promptBox.x, promptBox.y);
    await new Promise(r => setTimeout(r, 400));
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 400));

    const promptText = 'A breathtaking cinematic drone shot of Swiss Alps in winter 4k';
    console.log('Typing:', promptText);
    await page.keyboard.type(promptText, { delay: 20 });
    await new Promise(r => setTimeout(r, 1500));

    console.log('4. Clicking Submit Arrow button...');
    const arrowBox = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const arrowBtn = btns.find(b => {
        const svg = b.querySelector('svg, path, i');
        const rect = b.getBoundingClientRect();
        return svg && rect.top > (window.innerHeight - 160) && rect.right > (window.innerWidth / 2) && rect.width > 20;
      });

      if (arrowBtn) {
        const rect = arrowBtn.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, disabled: arrowBtn.getAttribute('aria-disabled') };
      }
      return null;
    });

    console.log('Arrow Button Box:', arrowBox);
    if (arrowBox) {
      await page.mouse.click(arrowBox.x, arrowBox.y);
      console.log('Clicked Submit Arrow!');
    }
  }

  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
  console.log('Complete!');
}

testPopupCloseAndType().catch(console.error);
