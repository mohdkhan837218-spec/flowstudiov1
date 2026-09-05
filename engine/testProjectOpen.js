const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function testProjectOpen() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');

  console.log('Testing opening workspace from Projects Gallery...');
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

  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('Current URL on load:', page.url());

  // Check project links
  const projectHref = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/fx/tools/flow/project/"]');
    return link ? link.getAttribute('href') : null;
  });

  console.log('Found Project Link:', projectHref);

  if (projectHref) {
    console.log('Navigating directly to project workspace:', projectHref);
    await page.goto('https://labs.google' + projectHref, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 6000));
    console.log('Arrived at Project URL:', page.url());

    const hasPromptBar = await page.evaluate(() => {
      const el = document.querySelector('div[contenteditable="true"], textarea, [data-placeholder]');
      return {
        found: !!el,
        tag: el ? el.tagName : null,
        placeholder: el ? el.getAttribute('placeholder') || el.getAttribute('data-placeholder') : null
      };
    });

    console.log('Prompt Bar Status:', hasPromptBar);
  }

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

testProjectOpen().catch(console.error);
