const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testModelAndBatchSwitch() {
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

    // A. Switch to Video mode
    console.log('2. Clicking Video Tab...');
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

    // B. Switch Model (e.g. Veo 3.1 - Fast or Omni Flash)
    console.log('3. Clicking Model Dropdown...');
    const modelDropdown = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="combobox"], div[role="button"], div'));
      const dd = all.find(el => {
        const txt = (el.innerText || '').trim();
        const r = el.getBoundingClientRect();
        return (txt.includes('Omni Flash') || txt.includes('Veo 3.1') || txt.includes('Nano Banana')) && r.height > 25 && r.height < 50 && r.width > 120;
      });

      if (dd) {
        const r = dd.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: dd.innerText };
      }
      return null;
    });

    console.log('Model Dropdown found:', modelDropdown);
    if (modelDropdown) {
      await page.mouse.click(modelDropdown.x, modelDropdown.y);
      await new Promise(r => setTimeout(r, 1000));

      // Click model option (e.g. Veo 3.1 - Fast or Omni Flash)
      const targetModel = 'Veo 3.1 – Fast'; // or Omni Flash
      const modelOption = await page.evaluate((target) => {
        const all = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], button, div, span'));
        const opt = all.find(el => {
          const txt = (el.innerText || '').trim();
          const cleanTxt = txt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const cleanTarget = target.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return cleanTxt.includes(cleanTarget) && el.getBoundingClientRect().height < 50;
        });

        if (opt) {
          const r = opt.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: opt.innerText };
        }
        return null;
      }, targetModel);

      console.log('Model Option found:', modelOption);
      if (modelOption) {
        await page.mouse.click(modelOption.x, modelOption.y);
        console.log(`Clicked Model: ${modelOption.text}!`);
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // C. Switch Duration: 10s
    console.log('4. Clicking 10s Duration...');
    const dur10s = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], div, span'));
      const d = all.find(el => (el.innerText || '').trim() === '10s');
      if (d) {
        const r = d.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (dur10s) {
      await page.mouse.click(dur10s.x, dur10s.y);
      console.log('Clicked 10s Duration!');
      await new Promise(r => setTimeout(r, 600));
    }

    // D. Switch Batch Count: x1 (Exact 1 output video!)
    console.log('5. Clicking x1 Batch Count...');
    const countX1 = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], div, span'));
      const x = all.find(el => (el.innerText || '').trim() === 'x1');
      if (x) {
        const r = x.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (countX1) {
      await page.mouse.click(countX1.x, countX1.y);
      console.log('Clicked x1 Output Batch Count!');
      await new Promise(r => setTimeout(r, 600));
    }

    // E. Aspect Ratio: 16:9
    console.log('6. Clicking 16:9 Aspect Ratio...');
    const aspect169 = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      const a = all.find(el => (el.innerText || '').trim() === '16:9');
      if (a) {
        const r = a.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (aspect169) {
      await page.mouse.click(aspect169.x, aspect169.y);
      console.log('Clicked 16:9!');
      await new Promise(r => setTimeout(r, 600));
    }

    // F. Dismiss popup
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

    console.log('FINAL PILL ON CANVAS AFTER FULL SWITCH:\n', finalPill);
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testModelAndBatchSwitch().catch(console.error);
