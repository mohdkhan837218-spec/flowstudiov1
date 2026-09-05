const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testModelSwitcher() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');

  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 2000));

  console.log('Launching browser with crash bubble disabled...');
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
  console.log('Opening project URL:', projectUrl);
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('Finding Model / Pill button at bottom...');
  const pillClicked = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('button, div[role="button"], div, span'));
    const pill = allElements.find(el => {
      const txt = (el.innerText || '').trim();
      const rect = el.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (txt.includes('Nano Banana') || txt.includes('Video') || txt.includes('Omni') || txt.includes('Veo'));
    });

    if (pill) {
      pill.click();
      return { found: true, text: pill.innerText, tag: pill.tagName };
    }
    return { found: false };
  });

  console.log('Pill Click Result:', pillClicked);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Inspecting opened Model & Settings popup...');
  const popupInspection = await page.evaluate(() => {
    function getInfo(el) {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.innerText || '').trim(),
        className: String(el.className || ''),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        outerHTML: el.outerHTML.substring(0, 200)
      };
    }

    const popupItems = Array.from(document.querySelectorAll('div[role="dialog"], div[class*="popup"], div[class*="menu"], div[class*="popover"], [data-radix-popper-content-wrapper], button, div[role="tab"]')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20;
    }).map(getInfo);

    return popupItems;
  });

  fs.writeFileSync('./model_popup_inspection.json', JSON.stringify(popupInspection, null, 2), 'utf8');
  console.log('Saved model popup inspection to model_popup_inspection.json!');
  console.log('Popup Items Count:', popupInspection.length);

  // Attempt switching to Video tab and Omni Flash
  console.log('Attempting to click "Video" tab and "Omni Flash"...');
  const switched = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, div[role="tab"], div[role="button"], span, div'));
    const videoTab = all.find(el => (el.innerText || '').trim() === 'Video');
    if (videoTab) {
      videoTab.click();
    }

    const omniOption = all.find(el => (el.innerText || '').includes('Omni Flash') || (el.innerText || '').includes('Veo'));
    if (omniOption) {
      omniOption.click();
      return true;
    }
    return false;
  });

  console.log('Model Switch Result:', switched);
  await new Promise(r => setTimeout(r, 3000));

  const newPillText = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, div, span'));
    const pill = all.find(el => {
      const txt = (el.innerText || '').trim();
      const rect = el.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (txt.includes('Video') || txt.includes('Omni') || txt.includes('Nano'));
    });
    return pill ? pill.innerText : 'NOT_FOUND';
  });

  console.log('New Pill Text on Canvas:', newPillText);

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testModelSwitcher().catch(console.error);
