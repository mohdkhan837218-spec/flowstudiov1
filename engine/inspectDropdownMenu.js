const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function inspectDropdownMenu() {
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

  console.log('1. Clicking the EXACT Model pill button...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (txt.includes('Nano Banana') || txt.includes('Video') || b.getAttribute('aria-haspopup') === 'menu');
    });

    if (pill) {
      pill.click();
      return { found: true, text: pill.innerText };
    }
    return { found: false };
  });

  console.log('Pill click result:', clicked);
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Inspecting all elements inside open Radix Dropdown / Menu...');
  const menuItems = await page.evaluate(() => {
    function getDetails(el) {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        text: (el.innerText || '').trim(),
        className: String(el.className || ''),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        outerHTML: el.outerHTML.substring(0, 250)
      };
    }

    const items = Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemradio"], [role="tab"], [data-radix-collection-item], div[class*="menu"], div[class*="popover"], div[class*="content"] *')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 15 && el.innerText && el.innerText.trim().length > 0;
    }).map(getDetails);

    return items;
  });

  fs.writeFileSync('./menu_items_inspection.json', JSON.stringify(menuItems, null, 2), 'utf8');
  console.log('Saved menu items inspection to menu_items_inspection.json!');
  console.log('Total Menu Items Found:', menuItems.length);
  console.log('Sample Items:', menuItems.slice(0, 10));

  // Switch to Video / Omni Flash
  console.log('3. Clicking Video and Omni Flash...');
  const selected = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    
    // Click Video tab or button
    const videoBtn = all.find(el => {
      const txt = (el.innerText || '').trim();
      return (txt === 'Video' || txt.includes('Video')) && el.getBoundingClientRect().height < 60;
    });

    if (videoBtn) {
      videoBtn.click();
    }

    // Click Omni Flash or Veo
    const omniBtn = all.find(el => {
      const txt = (el.innerText || '').trim();
      return txt.includes('Omni Flash') || txt.includes('Veo');
    });

    if (omniBtn) {
      omniBtn.click();
      return true;
    }
    return false;
  });

  console.log('Selection execution:', selected);
  await new Promise(r => setTimeout(r, 3000));

  const afterSwitchPill = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && b.getBoundingClientRect().right > (window.innerWidth / 2);
    });
    return pill ? pill.innerText : 'NOT_FOUND';
  });

  console.log('Pill Text After Switch:', afterSwitchPill);

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

inspectDropdownMenu().catch(console.error);
