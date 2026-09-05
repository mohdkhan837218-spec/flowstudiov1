const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function dumpVideoPopupElements() {
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

  console.log('1. Opening Main Settings Pill...');
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

    // Click Video tab
    const videoTab = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="tab"]'));
      const v = btns.find(b => (b.innerText || '').trim().includes('Video'));
      return v ? { x: v.getBoundingClientRect().x + 20, y: v.getBoundingClientRect().y + 15 } : null;
    });
    if (videoTab) {
      await page.mouse.click(videoTab.x, videoTab.y);
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('2. Inspecting all interactive elements inside open video popup...');
    const allPopupElements = await page.evaluate(() => {
      const popover = document.querySelector('[data-radix-popper-content-wrapper], div[data-state="open"]');
      if (!popover) return [];
      
      const all = Array.from(popover.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 15 && rect.height > 10 && el.children.length <= 2;
      }).map(el => ({
        tag: el.tagName,
        text: (el.innerText || '').trim(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        dataState: el.getAttribute('data-state'),
        rect: {
          x: Math.round(el.getBoundingClientRect().x),
          y: Math.round(el.getBoundingClientRect().y),
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height)
        },
        outerHTML: el.outerHTML.substring(0, 150)
      }));

      return all;
    });

    fs.writeFileSync('./video_popup_dump.json', JSON.stringify(allPopupElements, null, 2), 'utf8');
    console.log('Saved dump to video_popup_dump.json! Found items:', allPopupElements.length);
    console.log(allPopupElements);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

dumpVideoPopupElements().catch(console.error);
