const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testSafePopupDismiss() {
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

  console.log('1. Checking if any selected image chips/ingredients exist in prompt bar and removing them...');
  await page.evaluate(() => {
    // Find remove 'x' buttons on attached ingredients
    const removeBtns = Array.from(document.querySelectorAll('button[aria-label*="Remove"], button[aria-label*="remove"], button:has(> svg):has(~ span)'));
    removeBtns.forEach(b => {
      const rect = b.getBoundingClientRect();
      if (rect.top > (window.innerHeight - 200)) {
        b.click();
      }
    });
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('2. Opening Model Pill...');
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

    // Video Mode
    const videoTab = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="tab"]'));
      const v = btns.find(b => (b.innerText || '').trim().includes('Video'));
      return v ? { x: v.getBoundingClientRect().x + 20, y: v.getBoundingClientRect().y + 15 } : null;
    });
    if (videoTab) {
      await page.mouse.click(videoTab.x, videoTab.y);
      await new Promise(r => setTimeout(r, 500));
    }

    // 16:9 Aspect Ratio
    const aspect = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      const a = all.find(b => (b.innerText || '').trim() === '16:9');
      return a ? { x: a.getBoundingClientRect().x + 20, y: a.getBoundingClientRect().y + 15 } : null;
    });
    if (aspect) {
      await page.mouse.click(aspect.x, aspect.y);
      await new Promise(r => setTimeout(r, 500));
    }

    // 10s Duration
    const dur = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div, span'));
      const d = all.find(b => (b.innerText || '').trim() === '10s');
      return d ? { x: d.getBoundingClientRect().x + 15, y: d.getBoundingClientRect().y + 10 } : null;
    });
    if (dur) {
      await page.mouse.click(dur.x, dur.y);
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('3. Safe Popup Dismiss via Escape + Safe Header Click (x: 300, y: 35)...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
    // Click on safe top navigation bar (Header has NO media cards)
    await page.mouse.click(300, 35);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('4. Directly focusing prompt text editor and typing...');
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
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 300));

    const promptText = 'A cinematic shot of a majestic waterfall in tropical rainforest 4k';
    console.log('Typing clean prompt:', promptText);
    await page.keyboard.type(promptText, { delay: 20 });
    await new Promise(r => setTimeout(r, 1200));

    console.log('5. Clicking Submit Arrow...');
    const arrowBox = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const arrowBtn = allBtns.find(b => {
        const svg = b.querySelector('svg, path, i');
        const rect = b.getBoundingClientRect();
        return svg && rect.top > (window.innerHeight - 160) && rect.right > (window.innerWidth / 2) && rect.width > 20;
      });

      if (arrowBtn) {
        const rect = arrowBtn.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }
      return null;
    });

    if (arrowBox) {
      await page.mouse.click(arrowBox.x, arrowBox.y);
      console.log('Submitted successfully!');
    }
  }

  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
  console.log('Test completed!');
}

testSafePopupDismiss().catch(console.error);
