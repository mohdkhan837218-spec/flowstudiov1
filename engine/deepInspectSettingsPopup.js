const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function deepInspectSettingsPopup() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');

  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 2000));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: [
      `--user-data-dir=${targetDir}`,
      '--start-maximized',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0];

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('1. Opening settings pill...');
  const pill = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const p = btns.find(b => {
      const r = b.getBoundingClientRect();
      return r.top > (window.innerHeight - 150) && r.right > (window.innerWidth / 2) && (b.innerText.includes('Video') || b.getAttribute('aria-haspopup'));
    });
    if (p) {
      const r = p.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: p.innerText };
    }
    return null;
  });

  console.log('Initial Pill:', pill);

  if (pill) {
    await page.mouse.click(pill.x, pill.y);
    await new Promise(r => setTimeout(r, 1500));

    console.log('2. Deeply analyzing all Tablists inside the Settings Popover...');
    const analysis = await page.evaluate(() => {
      const popover = document.querySelector('[data-radix-popper-content-wrapper], [role="dialog"], [data-state="open"]');
      if (!popover) return { error: 'Popover not found' };

      const tablists = Array.from(popover.querySelectorAll('[role="tablist"], [data-orientation="horizontal"]'));
      
      const tablistDetails = tablists.map((tl, index) => {
        const tabs = Array.from(tl.querySelectorAll('[role="tab"], button')).map(t => ({
          text: (t.innerText || '').trim(),
          ariaSelected: t.getAttribute('aria-selected') || t.getAttribute('data-state'),
          rect: {
            x: Math.round(t.getBoundingClientRect().x),
            y: Math.round(t.getBoundingClientRect().y),
            w: Math.round(t.getBoundingClientRect().width),
            h: Math.round(t.getBoundingClientRect().height)
          }
        }));
        return { index: index + 1, tabs };
      });

      // Find Model Dropdown in popover
      const modelTrigger = popover.querySelector('button[aria-haspopup="listbox"], button[role="combobox"], [data-state="closed"]');
      const allButtons = Array.from(popover.querySelectorAll('button')).map(b => ({
        text: (b.innerText || '').trim(),
        rect: {
          x: Math.round(b.getBoundingClientRect().x),
          y: Math.round(b.getBoundingClientRect().y),
          w: Math.round(b.getBoundingClientRect().width),
          h: Math.round(b.getBoundingClientRect().height)
        }
      }));

      return {
        popoverRect: {
          x: Math.round(popover.getBoundingClientRect().x),
          y: Math.round(popover.getBoundingClientRect().y),
          w: Math.round(popover.getBoundingClientRect().width),
          h: Math.round(popover.getBoundingClientRect().height)
        },
        tablists: tablistDetails,
        allButtons
      };
    });

    console.log('Deep Popover Analysis:', JSON.stringify(analysis, null, 2));

    // Test clicking 6s dynamically via its exact Tablist
    console.log('3. Testing dynamic switch to 6s...');
    const clickResult = await page.evaluate(() => {
      const popover = document.querySelector('[data-radix-popper-content-wrapper], [role="dialog"], [data-state="open"]');
      if (!popover) return { success: false, msg: 'No popover' };

      // Find button whose text is exactly '6s'
      const btn6s = Array.from(popover.querySelectorAll('[role="tab"], button')).find(b => (b.innerText || '').trim() === '6s');
      if (btn6s) {
        const r = btn6s.getBoundingClientRect();
        return { success: true, x: r.x + r.width / 2, y: r.y + r.height / 2, currentText: btn6s.innerText };
      }
      return { success: false, msg: '6s button not found in popover' };
    });

    console.log('Click Result for 6s:', clickResult);

    if (clickResult.success) {
      await page.mouse.click(clickResult.x, clickResult.y);
      await new Promise(r => setTimeout(r, 800));

      // Dismiss popup
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 300));
      await page.mouse.click(300, 35);
      await new Promise(r => setTimeout(r, 600));

      const updatedPill = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const p = btns.find(b => {
          const r = b.getBoundingClientRect();
          return r.top > (window.innerHeight - 150) && r.right > (window.innerWidth / 2) && (b.innerText.includes('Video') || b.getAttribute('aria-haspopup'));
        });
        return p ? p.innerText.replace(/\n/g, ' ') : null;
      });

      console.log('🎉 UPDATED PILL ON CANVAS:', updatedPill);
    }
  }

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
}

deepInspectSettingsPopup().catch(console.error);
