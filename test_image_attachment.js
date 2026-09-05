const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testImageAttachment() {
  console.log('🔬 Testing Image Attachment Flow on Google Flow Canvas...');
  
  const profilePath = getAccountProfilePath('acc_2');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    args: ['--start-maximized', '--no-first-run', '--no-default-browser-check']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  console.log('Navigated to Google Flow. Waiting for workspace...');
  await new Promise(r => setTimeout(r, 6000));

  // If on gallery, open first project
  if (!page.url().includes('/project/')) {
    console.log('Opening project canvas...');
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 5000));
  }

  // Create a small dummy test image
  const testImgPath = path.join(__dirname, 'test_sample.png');
  if (!fs.existsSync(testImgPath)) {
    // 1x1 png base64
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    fs.writeFileSync(testImgPath, Buffer.from(b64, 'base64'));
  }

  console.log('1. Clicking + (Add Asset) button in prompt bar...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const plusBtn = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('add_2') || txt === '+' || aria.includes('add asset') || aria.includes('upload');
    });
    if (plusBtn) plusBtn.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Uploading test image to input[type="file"]...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(testImgPath);
    console.log('✓ File uploaded to input[type="file"]. Waiting 3s for UI update...');
    await new Promise(r => setTimeout(r, 3000));
  } else {
    console.log('input[type="file"] not found directly.');
  }

  // Take screenshot of modal / drawer
  const screenshotPath = path.join(__dirname, 'test_drawer.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  // Check drawer items
  const drawerItems = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('div[role="dialog"], [role="menu"]');
    const images = Array.from(document.querySelectorAll('div[role="dialog"] img, div[data-testid="virtuoso-item-list"] img'));
    const buttons = Array.from(document.querySelectorAll('div[role="dialog"] button'));
    return {
      dialogCount: dialogs.length,
      imageCount: images.length,
      buttons: buttons.map(b => b.innerText || b.getAttribute('aria-label'))
    };
  });
  console.log('Drawer inspect:', JSON.stringify(drawerItems, null, 2));

  await browser.close();
  console.log('Test completed.');
}

testImageAttachment().catch(console.error);
