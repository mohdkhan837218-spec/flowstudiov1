const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function diagnoseDeepUpload() {
  console.log('🔬 Deep Diagnostic for Google Flow Image Upload & Attachment...');
  
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
  await new Promise(r => setTimeout(r, 6000));

  if (!page.url().includes('/project/')) {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/project/"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 5000));
  }

  const testImgPath = path.join(__dirname, 'test_sample.png');
  const baseName = path.basename(testImgPath);
  const cleanName = baseName.replace(/\.[^/.]+$/, '').toLowerCase();

  console.log('Step 1: Inspecting Prompt Bar & Buttons...');
  const promptInfo = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]')).map(b => ({
      text: b.innerText,
      aria: b.getAttribute('aria-label')
    }));
    return { hasTb: !!tb, buttonsCount: btns.length, sampleBtns: btns.slice(0, 10) };
  });
  console.log('Prompt bar info:', JSON.stringify(promptInfo, null, 2));

  console.log('Step 2: Clicking Add Asset (+) button...');
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

  console.log('Step 3: Uploading file to input[type="file"] and dispatching change event...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(testImgPath);
    await page.evaluate(() => {
      const inp = document.querySelector('input[type="file"]');
      if (inp) {
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    console.log('File uploaded & change events dispatched!');
  } else {
    console.log('File input not found directly. Checking upload button...');
  }

  // Wait 5 seconds and screenshot drawer
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(__dirname, 'deep_step3_drawer.png') });

  console.log('Step 4: Checking items in drawer after upload...');
  const drawerState = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return { error: 'no dialog open' };
    const imgs = Array.from(dialog.querySelectorAll('img')).map(i => ({
      alt: i.alt,
      src: i.src.substring(0, 60),
      complete: i.complete,
      width: i.naturalWidth
    }));
    const options = Array.from(dialog.querySelectorAll('[role="option"]')).map(o => ({
      selected: o.getAttribute('aria-selected'),
      text: o.innerText
    }));
    return { imgCount: imgs.length, imgs: imgs.slice(0, 5), optionsCount: options.length, options: options.slice(0, 5) };
  });
  console.log('Drawer State:', JSON.stringify(drawerState, null, 2));

  console.log('Step 5: Closing drawer and testing prompt bar @ mention...');
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (tb) { tb.focus(); tb.click(); }
  });
  await new Promise(r => setTimeout(r, 300));

  // Clear text
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 300));

  // Type @
  await page.keyboard.type('@', { delay: 60 });
  await new Promise(r => setTimeout(r, 1200));

  // Check mention popover content
  const mentionPopover = await page.evaluate(() => {
    const pop = document.querySelector('[role="dialog"], [role="menu"], div[data-radix-popper-content-wrapper], div[class*="popover"]');
    if (!pop) return { error: 'no popover' };
    const items = Array.from(pop.querySelectorAll('[role="option"], div[class*="item"], div[role="menuitem"]')).map(item => item.innerText);
    return { text: pop.innerText.substring(0, 300), items: items.slice(0, 5) };
  });
  console.log('Mention Popover info:', JSON.stringify(mentionPopover, null, 2));

  // Select top item with Enter
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot final prompt bar
  await page.screenshot({ path: path.join(__dirname, 'deep_step5_promptbar.png') });

  const finalCheck = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      text: tb ? tb.innerText : '',
      html: tb ? tb.innerHTML : ''
    };
  });
  console.log('Final Prompt Bar:', JSON.stringify(finalCheck, null, 2));

  await browser.close();
  console.log('Deep diagnosis completed.');
}

diagnoseDeepUpload().catch(console.error);
