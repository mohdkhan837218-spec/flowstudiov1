const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function inspectAspectRatioButtons() {
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

  console.log('1. Opening settings pill...');
  const pillCoords = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2) && (b.innerText.includes('Video') || b.innerText.includes('Nano') || b.getAttribute('aria-haspopup'));
    });
    if (pill) {
      const r = pill.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: pill.innerText };
    }
    return null;
  });

  console.log('Pill Coords:', pillCoords);

  if (pillCoords) {
    await page.mouse.click(pillCoords.x, pillCoords.y);
    await new Promise(r => setTimeout(r, 1500));

    console.log('2. Inspecting all Aspect Ratio elements in popup...');
    const popupInfo = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], div[role="radio"], div[role="tab"], span'));
      const relevant = all.filter(el => {
        const r = el.getBoundingClientRect();
        const txt = (el.innerText || '').trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        return r.y > 800 && r.y < 1300 && r.x > 800 && (
          txt.includes('16:9') || txt.includes('9:16') || txt.includes('1:1') ||
          aria.includes('16:9') || aria.includes('9:16') ||
          txt.includes('10s') || txt.includes('8s') || txt.includes('6s') || txt.includes('4s') ||
          txt.includes('x1') || txt.includes('x2') || txt.includes('x4')
        );
      });

      return relevant.map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.innerText || '').trim(),
          aria: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          x: Math.round(r.x + r.width / 2),
          y: Math.round(r.y + r.height / 2),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      });
    });

    console.log('Found Popup Elements:', JSON.stringify(popupInfo, null, 2));

    // Test clicking 9:16
    const btn916 = popupInfo.find(el => (el.text.includes('9:16') || (el.aria && el.aria.includes('9:16'))));
    if (btn916) {
      console.log(`3. Clicking 9:16 button at (${btn916.x}, ${btn916.y})...`);
      await page.mouse.click(btn916.x, btn916.y);
      await new Promise(r => setTimeout(r, 800));

      // Dismiss popup
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 300));
      await page.mouse.click(300, 35);
      await new Promise(r => setTimeout(r, 600));

      // Check new pill text
      const newPillText = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const pill = btns.find(b => {
          const rect = b.getBoundingClientRect();
          return rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2) && (b.innerText.includes('Video') || b.getAttribute('aria-haspopup'));
        });
        return pill ? pill.innerText : null;
      });

      console.log('Pill Text AFTER selecting 9:16:', newPillText);
    }
  }

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
}

inspectAspectRatioButtons().catch(console.error);
