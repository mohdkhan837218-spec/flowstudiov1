const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testFullAttachment() {
  console.log('🔬 Testing Full Image Attachment & Verification...');
  
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
  
  await new Promise(r => setTimeout(r, 5000));

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 5000));
  }

  const testImgPath = path.join(__dirname, 'test_sample.png');

  console.log('1. Opening Media Drawer...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const plusBtn = btns.find(b => {
      const txt = (b.innerText || '').trim();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('add_2') || txt === '+' || aria.includes('add asset') || aria.includes('upload');
    });
    if (plusBtn) plusBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Uploading image to input[type="file"]...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(testImgPath);
    console.log('Waiting 4s for upload processing...');
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('3. Selecting first image in drawer...');
  await page.evaluate(() => {
    const imgList = Array.from(document.querySelectorAll('div[role="dialog"] img, div[data-testid="virtuoso-item-list"] img'));
    if (imgList.length > 0) {
      imgList[0].click();
      console.log('Clicked image thumbnail in drawer');
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('4. Clicking "Add to Prompt" button...');
  const clickedAdd = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="dialog"] button, button'));
    const addBtn = btns.find(b => {
      const txt = (b.innerText || '').trim().toLowerCase();
      return txt.includes('add to prompt') || txt.includes('add to canvas') || txt.includes('insert');
    });
    if (addBtn) {
      addBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Add to Prompt button:', clickedAdd);

  await new Promise(r => setTimeout(r, 2000));

  console.log('5. Inspecting prompt bar for attached chip...');
  const chipInfo = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (!tb) return { found: false, error: 'no textbox' };
    const imgs = tb.querySelectorAll('img');
    const chips = tb.querySelectorAll('[data-chip], [data-entity-type], [contenteditable="false"], span[class*="chip"]');
    return {
      found: true,
      innerText: tb.innerText,
      innerHTML: tb.innerHTML,
      imgCount: imgs.length,
      chipCount: chips.length
    };
  });
  console.log('Prompt Bar Chip Inspection:', JSON.stringify(chipInfo, null, 2));

  // Take screenshot of prompt bar
  const screenshotPath = path.join(__dirname, 'test_attached_chip.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

testFullAttachment().catch(console.error);
