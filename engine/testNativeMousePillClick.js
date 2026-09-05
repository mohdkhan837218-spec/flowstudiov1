const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testNativeMousePillClick() {
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

  console.log('1. Finding Model Pill bounding box...');
  const pillBox = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (txt.includes('Nano Banana') || txt.includes('Video') || b.getAttribute('aria-haspopup') === 'menu');
    });

    if (pill) {
      const rect = pill.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: pill.innerText };
    }
    return null;
  });

  console.log('Pill Coordinates:', pillBox);

  if (pillBox) {
    console.log('2. Triggering native mouse click on Pill...');
    await page.mouse.click(pillBox.x, pillBox.y);
    await new Promise(r => setTimeout(r, 1500));

    console.log('3. Inspecting opened Popover / Menu elements...');
    const openedMenu = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        const txt = (el.innerText || '').trim();
        return rect.width > 20 && rect.height > 15 && rect.top > 100 && (txt.includes('Video') || txt.includes('Image') || txt.includes('Omni') || txt.includes('Veo') || txt.includes('10s'));
      }).map(el => ({
        tag: el.tagName,
        text: el.innerText ? el.innerText.trim() : '',
        rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }
      }));

      return elements;
    });

    console.log('Found Menu Elements:', openedMenu);
    fs.writeFileSync('./native_menu_inspection.json', JSON.stringify(openedMenu, null, 2), 'utf8');

    // Click Video tab with native mouse
    const videoElem = openedMenu.find(m => m.text === 'Video' || m.text.startsWith('Video'));
    if (videoElem) {
      console.log('Clicking Video tab at:', videoElem.rect);
      await page.mouse.click(videoElem.rect.x + videoElem.rect.width / 2, videoElem.rect.y + videoElem.rect.height / 2);
      await new Promise(r => setTimeout(r, 1500));
    }

    // Check updated menu options after clicking Video tab
    const afterVideoMenu = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        const txt = (el.innerText || '').trim();
        return rect.width > 30 && rect.height > 15 && (txt.includes('Omni Flash') || txt.includes('Veo') || txt.includes('10s') || txt.includes('16:9'));
      }).map(el => ({
        text: el.innerText.trim(),
        rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }
      }));
    });

    console.log('Video Mode Options:', afterVideoMenu);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testNativeMousePillClick().catch(console.error);
