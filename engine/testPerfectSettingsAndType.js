const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testPerfectSettingsAndType() {
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

  console.log('1. Opening Settings Popup...');
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
    await new Promise(r => setTimeout(r, 1200));

    // 2. Select Video Tab
    console.log('2. Selecting Video Tab...');
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
      await new Promise(r => setTimeout(r, 800));
    }

    // 3. Select 16:9
    console.log('3. Selecting 16:9 Aspect Ratio...');
    const aspect169 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"], div, span'));
      const a = btns.find(b => (b.innerText || '').trim() === '16:9');
      if (a) {
        const r = a.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (aspect169) {
      await page.mouse.click(aspect169.x, aspect169.y);
      await new Promise(r => setTimeout(r, 800));
    }

    // 4. Select Duration: 10s
    console.log('4. Selecting 10s Duration...');
    const dur10s = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div, span'));
      const d = btns.find(b => (b.innerText || '').trim() === '10s');
      if (d) {
        const r = d.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (dur10s) {
      await page.mouse.click(dur10s.x, dur10s.y);
      console.log('Clicked 10s button!');
      await new Promise(r => setTimeout(r, 800));
    }

    // 5. Select Count: x1
    console.log('5. Selecting x1 batch count...');
    const countX1 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div, span'));
      const x = btns.find(b => (b.innerText || '').trim() === 'x1');
      if (x) {
        const r = x.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (countX1) {
      await page.mouse.click(countX1.x, countX1.y);
      await new Promise(r => setTimeout(r, 800));
    }

    // 6. Explicitly close popup by clicking outside or pressing Escape
    console.log('6. Closing popup...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
    // Click outside canvas area to guarantee closure
    await page.mouse.click(100, 300);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 7. Focus Prompt Box and type
  console.log('7. Focusing and typing prompt...');
  const promptBox = await page.evaluate(() => {
    const el = document.querySelector('div[contenteditable="true"], textarea, [data-placeholder]');
    if (el) {
      el.focus();
      el.click();
      const r = el.getBoundingClientRect();
      return { x: r.x + 50, y: r.y + r.height / 2 };
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
    console.log('Typing:', promptText);
    await page.keyboard.type(promptText, { delay: 25 });
    await new Promise(r => setTimeout(r, 1500));
    console.log('Prompt typed successfully!');
  }

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
  console.log('Test complete!');
}

testPerfectSettingsAndType().catch(console.error);
