const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testExactPopupCoordinates() {
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

  console.log('1. Clicking Pill at bottom right to open popup...');
  const pillBox = await page.evaluate(() => {
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

  console.log('Found Pill:', pillBox);

  if (pillBox) {
    await page.mouse.click(pillBox.x, pillBox.y);
    await new Promise(r => setTimeout(r, 1200));

    console.log('2. Finding all elements inside the opened popup...');
    const popupData = await page.evaluate(() => {
      // Find all buttons that appeared right above the pill
      const btns = Array.from(document.querySelectorAll('button, div[role="button"], div[role="tab"], span')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.y > 900 && r.y < 1260 && r.x > 900 && r.width > 20 && r.height > 15;
      }).map(el => ({
        tag: el.tagName,
        text: (el.innerText || '').trim(),
        rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }
      }));

      return btns;
    });

    console.log('Popup elements found:', popupData);

    // A. Click Video Tab
    const videoBtn = popupData.find(b => b.text === 'Video' || b.text.includes('Video'));
    if (videoBtn) {
      console.log('Clicking Video Tab:', videoBtn);
      await page.mouse.click(videoBtn.rect.x + videoBtn.rect.width / 2, videoBtn.rect.y + videoBtn.rect.height / 2);
      await new Promise(r => setTimeout(r, 800));
    }

    // Refresh elements after clicking Video tab
    const videoPopupElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, div[role="button"], div, span')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.y > 950 && r.y < 1270 && r.x > 950 && r.width > 20 && r.height > 15 && el.children.length <= 1;
      }).map(el => ({
        text: (el.innerText || '').trim(),
        rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }
      }));
    });

    console.log('Video Mode Elements:', videoPopupElements);

    // B. Click 16:9
    const aspect169 = videoPopupElements.find(b => b.text === '16:9');
    if (aspect169) {
      console.log('Clicking 16:9:', aspect169);
      await page.mouse.click(aspect169.rect.x + aspect169.rect.width / 2, aspect169.rect.y + aspect169.rect.height / 2);
      await new Promise(r => setTimeout(r, 600));
    }

    // C. Click 10s (Duration)
    const dur10s = videoPopupElements.find(b => b.text === '10s');
    if (dur10s) {
      console.log('Clicking 10s Duration:', dur10s);
      await page.mouse.click(dur10s.rect.x + dur10s.rect.width / 2, dur10s.rect.y + dur10s.rect.height / 2);
      await new Promise(r => setTimeout(r, 600));
    }

    // D. Click x1 (Output Count Multiplier)
    const countX1 = videoPopupElements.find(b => b.text === 'x1');
    if (countX1) {
      console.log('Clicking x1 Batch Count:', countX1);
      await page.mouse.click(countX1.rect.x + countX1.rect.width / 2, countX1.rect.y + countX1.rect.height / 2);
      await new Promise(r => setTimeout(r, 600));
    }

    // E. Model Dropdown (Omni Flash / Veo 3.1)
    const modelDropdown = videoPopupElements.find(b => b.text.includes('Omni Flash') || b.text.includes('Veo') || b.text.includes('Nano'));
    if (modelDropdown) {
      console.log('Clicking Model Dropdown:', modelDropdown);
      await page.mouse.click(modelDropdown.rect.x + modelDropdown.rect.width / 2, modelDropdown.rect.y + modelDropdown.rect.height / 2);
      await new Promise(r => setTimeout(r, 1000));

      // Click Model item in menu
      const modelOption = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('*')).filter(el => {
          const txt = (el.innerText || '').trim();
          const r = el.getBoundingClientRect();
          return (txt.includes('Veo 3.1 - Fast') || txt.includes('Omni Flash')) && r.height > 20 && r.height < 60;
        });
        if (items.length > 0) {
          const r = items[0].getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: items[0].innerText };
        }
        return null;
      });

      console.log('Model Option found:', modelOption);
      if (modelOption) {
        await page.mouse.click(modelOption.x, modelOption.y);
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // Safe Dismissal
    console.log('Closing popup safely...');
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

    console.log('FINAL CANVAS PILL TEXT:\n', finalPill);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testExactPopupCoordinates().catch(console.error);
