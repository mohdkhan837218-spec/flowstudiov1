const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testPromptTyping() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');

  console.log('Launching browser to test prompt typing and mode selection on project canvas...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    pipe: true,
    args: [
      `--user-data-dir=${targetDir}`,
      '--start-maximized'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0];

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  console.log('Navigating to:', projectUrl);
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('Finding prompt input area...');
  const inputInfo = await page.evaluate(() => {
    const el = document.querySelector('div[contenteditable="true"], textarea, [data-placeholder], input[placeholder*="create"], div[placeholder*="create"]');
    if (el) {
      el.focus();
      el.click();
      return { found: true, tag: el.tagName, outerHTML: el.outerHTML.substring(0, 200) };
    }
    return { found: false };
  });

  console.log('Input focus result:', inputInfo);

  console.log('Typing sample prompt...');
  await page.keyboard.type('A majestic eagle soaring over snow mountains 4k', { delay: 30 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Checking submit arrow button state...');
  const arrowButtonInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const arrow = btns.find(b => {
      const rect = b.getBoundingClientRect();
      const hasSvg = b.querySelector('svg, i, path');
      return rect.top > (window.innerHeight - 150) && rect.right > (window.innerWidth / 2) && hasSvg;
    });

    if (arrow) {
      return {
        found: true,
        tag: arrow.tagName,
        ariaLabel: arrow.getAttribute('aria-label'),
        disabled: arrow.getAttribute('disabled'),
        outerHTML: arrow.outerHTML.substring(0, 200)
      };
    }
    return { found: false };
  });

  console.log('Submit Arrow Button Info:', arrowButtonInfo);

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testPromptTyping().catch(console.error);
