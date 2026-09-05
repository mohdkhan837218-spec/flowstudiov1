const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testExactSubmitArrow() {
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

  console.log('1. Finding exact buttons in bottom bar...');
  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.filter(b => {
      const rect = b.getBoundingClientRect();
      return rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2);
    }).map(b => ({
      id: b.id,
      text: (b.innerText || '').trim(),
      className: b.className,
      ariaHasPopup: b.getAttribute('aria-haspopup'),
      ariaDisabled: b.getAttribute('aria-disabled'),
      rect: { x: Math.round(b.getBoundingClientRect().x), y: Math.round(b.getBoundingClientRect().y), width: Math.round(b.getBoundingClientRect().width), height: Math.round(b.getBoundingClientRect().height) },
      outerHTML: b.outerHTML.substring(0, 150)
    }));
  });

  console.log('All Bottom Right Buttons:', JSON.stringify(buttons, null, 2));

  console.log('2. Typing prompt into contenteditable box...');
  await page.evaluate(() => {
    const el = document.querySelector('div[contenteditable="true"], textarea');
    if (el) {
      el.focus();
    }
  });

  const promptCoords = await page.evaluate(() => {
    const el = document.querySelector('div[contenteditable="true"], textarea');
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.x + 80, y: r.y + r.height / 2 };
    }
    return null;
  });

  if (promptCoords) {
    await page.mouse.click(promptCoords.x, promptCoords.y);
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 300));

    await page.keyboard.type('A futuristic neon sports car driving through night city 4k', { delay: 18 });
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('3. Finding EXACT Submit Arrow button after typing...');
  const submitArrow = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    // The Submit Arrow is the button containing arrow_forward icon OR the rightmost button next to the pill, NOT the pill itself!
    const arrow = btns.find(b => {
      const rect = b.getBoundingClientRect();
      const isBottomRight = rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2);
      const isNotPill = !b.getAttribute('aria-haspopup') && !b.id.includes('radix');
      const hasArrow = b.innerHTML.includes('arrow_forward') || b.innerText.includes('Create') || b.querySelector('i, svg');
      return isBottomRight && isNotPill && hasArrow;
    });

    if (arrow) {
      const r = arrow.getBoundingClientRect();
      return {
        found: true,
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
        outerHTML: arrow.outerHTML.substring(0, 150)
      };
    }
    return { found: false };
  });

  console.log('Exact Submit Arrow:', submitArrow);

  if (submitArrow.found) {
    console.log('Clicking EXACT Submit Arrow...');
    await page.mouse.click(submitArrow.x, submitArrow.y);
    await new Promise(r => setTimeout(r, 3000));
  }

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

testExactSubmitArrow().catch(console.error);
