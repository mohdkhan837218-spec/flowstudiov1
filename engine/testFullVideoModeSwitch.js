const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testFullVideoModeSwitch() {
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

  console.log('1. Finding Model Pill and opening popup with native mouse click...');
  const pillBox = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (txt.includes('Nano Banana') || txt.includes('Video') || b.getAttribute('aria-haspopup') === 'menu');
    });

    if (pill) {
      const rect = pill.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    return null;
  });

  if (pillBox) {
    await page.mouse.click(pillBox.x, pillBox.y);
    await new Promise(r => setTimeout(r, 1500));

    console.log('2. Clicking "Video" tab button with native mouse...');
    const videoBtnBox = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="tab"]'));
      const vBtn = btns.find(b => (b.innerText || '').trim().includes('Video'));
      if (vBtn) {
        const rect = vBtn.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }
      return null;
    });

    if (videoBtnBox) {
      await page.mouse.click(videoBtnBox.x, videoBtnBox.y);
      console.log('Clicked Video tab!');
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log('3. Clicking Aspect Ratio (16:9)...');
    const aspectBox = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], div, span'));
      const asp = all.find(b => {
        const txt = (b.innerText || '').trim();
        return txt === '16:9' || txt.includes('16:9');
      });
      if (asp) {
        const rect = asp.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }
      return null;
    });

    if (aspectBox) {
      await page.mouse.click(aspectBox.x, aspectBox.y);
      console.log('Clicked 16:9 aspect ratio!');
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('4. Closing popup via Escape...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1500));

    const finalPillText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pill = btns.find(b => {
        const rect = b.getBoundingClientRect();
        return rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2);
      });
      return pill ? pill.innerText : 'NOT_FOUND';
    });

    console.log('FINAL PILL TEXT ON CANVAS:', finalPillText);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testFullVideoModeSwitch().catch(console.error);
