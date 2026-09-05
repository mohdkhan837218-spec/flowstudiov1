const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testSelectAllVideoSettings() {
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

  console.log('1. Clicking Pill to open popup...');
  const pillBox = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pill = btns.find(b => {
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && (b.innerText.includes('Video') || b.innerText.includes('Nano') || b.getAttribute('aria-haspopup') === 'menu');
    });
    if (pill) {
      const r = pill.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  });

  if (pillBox) {
    await page.mouse.click(pillBox.x, pillBox.y);
    await new Promise(r => setTimeout(r, 1200));

    console.log('2. Inspecting all clickable buttons inside the popup...');
    const buttonsInPopup = await page.evaluate(() => {
      // Find the popup container
      const allDivs = Array.from(document.querySelectorAll('div, [role="dialog"], [data-radix-popper-content-wrapper]'));
      const popup = allDivs.find(d => {
        const txt = (d.innerText || '');
        const r = d.getBoundingClientRect();
        return r.width > 200 && r.height > 200 && (txt.includes('Video') || txt.includes('credits'));
      });

      if (!popup) return [];

      const clickable = Array.from(popup.querySelectorAll('button, div[role="button"], span, div')).filter(el => {
        const r = el.getBoundingClientRect();
        const txt = (el.innerText || '').trim();
        return r.width > 15 && r.height > 10 && txt.length > 0 && txt.length < 30 && el.children.length <= 1;
      }).map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.innerText || '').trim(),
          rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
        };
      });

      return clickable;
    });

    console.log('Buttons inside popup:', JSON.stringify(buttonsInPopup, null, 2));

    // A. Click Video Tab
    const videoBtn = buttonsInPopup.find(b => b.text === 'Video' || b.text.includes('Video'));
    if (videoBtn) {
      console.log('Clicking Video Tab at:', videoBtn.rect);
      await page.mouse.click(videoBtn.rect.x + videoBtn.rect.width / 2, videoBtn.rect.y + videoBtn.rect.height / 2);
      await new Promise(r => setTimeout(r, 800));
    }

    // B. Click 16:9
    const aspect169 = buttonsInPopup.find(b => b.text === '16:9' || b.text.includes('16:9'));
    if (aspect169) {
      console.log('Clicking 16:9 at:', aspect169.rect);
      await page.mouse.click(aspect169.rect.x + aspect169.rect.width / 2, aspect169.rect.y + aspect169.rect.height / 2);
      await new Promise(r => setTimeout(r, 600));
    }

    // C. Click 10s (or 8s)
    const durBtn = buttonsInPopup.find(b => b.text === '10s' || b.text === '8s');
    if (durBtn) {
      console.log('Clicking Duration at:', durBtn.rect, durBtn.text);
      await page.mouse.click(durBtn.rect.x + durBtn.rect.width / 2, durBtn.rect.y + durBtn.rect.height / 2);
      await new Promise(r => setTimeout(r, 600));
    }

    // D. Click x1 Multiplier
    const x1Btn = buttonsInPopup.find(b => b.text === 'x1');
    if (x1Btn) {
      console.log('Clicking x1 at:', x1Btn.rect);
      await page.mouse.click(x1Btn.rect.x + x1Btn.rect.width / 2, x1Btn.rect.y + x1Btn.rect.height / 2);
      await new Promise(r => setTimeout(r, 600));
    }

    // E. Model Dropdown (e.g. Omni Flash / Veo 3.1)
    const modelDropdown = buttonsInPopup.find(b => b.text.includes('Omni Flash') || b.text.includes('Veo') || b.text.includes('Nano Banana'));
    if (modelDropdown) {
      console.log('Clicking Model dropdown at:', modelDropdown.rect, modelDropdown.text);
      await page.mouse.click(modelDropdown.rect.x + modelDropdown.rect.width / 2, modelDropdown.rect.y + modelDropdown.rect.height / 2);
      await new Promise(r => setTimeout(r, 1000));

      // Click Model item in opened menu
      const modelItem = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('*')).filter(el => {
          const txt = (el.innerText || '').trim();
          const r = el.getBoundingClientRect();
          return (txt.includes('Omni Flash') || txt.includes('Veo 3.1 - Fast') || txt.includes('Veo 3.1 - Lite')) && r.height > 15 && r.height < 60;
        });
        if (all.length > 0) {
          const r = all[0].getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: all[0].innerText };
        }
        return null;
      });

      console.log('Model item in sub-dropdown:', modelItem);
      if (modelItem) {
        await page.mouse.click(modelItem.x, modelItem.y);
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // Dismiss popup
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));
    await page.mouse.click(300, 35);
    await new Promise(r => setTimeout(r, 800));

    const finalPill = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pill = btns.find(b => {
        const rect = b.getBoundingClientRect();
        return rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2) && b.getAttribute('aria-haspopup');
      });
      return pill ? pill.innerText : 'NOT_FOUND';
    });

    console.log('FINAL PILL ON CANVAS:\n', finalPill);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testSelectAllVideoSettings().catch(console.error);
