const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testDrawerAttachment() {
  console.log('🔬 Testing Direct Drawer "Add to Prompt" Button Attachment...');
  
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

  console.log('1. Opening Asset Drawer...');
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
    console.log('Uploaded. Waiting for drawer update...');
    await new Promise(r => setTimeout(r, 4000));
  }

  // Take screenshot of drawer with uploaded image
  await page.screenshot({ path: path.join(__dirname, 'drawer_after_upload.png') });

  console.log('3. Clicking on the newly uploaded image thumbnail in drawer...');
  const clickedThumb = await page.evaluate(() => {
    const img = document.querySelector('div[role="dialog"] img, div[data-testid="virtuoso-item-list"] img');
    if (img) {
      // Find clickable parent or button
      const parentBtn = img.closest('button') || img.closest('div[role="button"]') || img.parentElement;
      if (parentBtn) parentBtn.click();
      else img.click();
      return true;
    }
    return false;
  });
  console.log('Clicked thumbnail result:', clickedThumb);
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot after clicking thumbnail
  await page.screenshot({ path: path.join(__dirname, 'drawer_after_thumb_click.png') });

  console.log('4. Finding and clicking "Add to Prompt" button in drawer...');
  const clickedAddBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="dialog"] button, button'));
    const addBtn = btns.find(b => {
      const txt = (b.innerText || '').toLowerCase().trim();
      return txt.includes('add to prompt') || txt.includes('add to canvas') || txt.includes('insert');
    });
    if (addBtn) {
      addBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
      addBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      addBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      addBtn.click();
      return { found: true, text: addBtn.innerText, disabled: addBtn.disabled };
    }
    return { found: false };
  });
  console.log('Add to prompt button execution:', JSON.stringify(clickedAddBtn, null, 2));

  await new Promise(r => setTimeout(r, 2000));

  // Check prompt bar
  const finalPromptBar = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      text: tb ? tb.innerText : '',
      html: tb ? tb.innerHTML : ''
    };
  });
  console.log('Final Prompt Bar after drawer button:', JSON.stringify(finalPromptBar, null, 2));

  await browser.close();
}

testDrawerAttachment().catch(console.error);
