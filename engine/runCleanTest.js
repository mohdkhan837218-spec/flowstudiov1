const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromeExecutablePath } = require('./profileDetector');

async function runCleanTest() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');

  console.log('1. Closing manual Chrome window if open to release lock...');
  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Launching Chrome with dedicated acc_1 session...');
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
  console.log('3. Navigating to:', projectUrl);
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('4. Checking Prompt Bar and typing...');
  const inputFocused = await page.evaluate(() => {
    const el = document.querySelector('div[contenteditable="true"], textarea, [data-placeholder], div[placeholder*="create"]');
    if (el) {
      el.focus();
      el.click();
      return true;
    }
    return false;
  });

  console.log('Prompt Bar Focused:', inputFocused);
  if (inputFocused) {
    await page.keyboard.type('A majestic cinematic drone shot of green valleys 4k', { delay: 25 });
    await new Promise(r => setTimeout(r, 2000));
    console.log('Successfully typed prompt into prompt bar!');
  }

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
  console.log('Test completed successfully!');
}

runCleanTest().catch(console.error);
