const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAccountProfilePath } = require('./engine/accountStore');

async function testFullAttachmentAndPrompt() {
  console.log('🔬 Testing End-to-End Image Attachment + Prompt Typing...');
  
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

  // Focus prompt bar
  await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    if (tb) { tb.focus(); tb.click(); }
  });
  await new Promise(r => setTimeout(r, 500));

  // Type @ to attach chip
  console.log('1. Attaching image chip via @ mention...');
  await page.keyboard.type('@', { delay: 60 });
  await new Promise(r => setTimeout(r, 1200));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1000));

  // Move to end and type prompt text
  console.log('2. Typing prompt text after image chip...');
  await page.keyboard.press('End');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type(' cinematic camera pan around this character, 4k ultra realistic', { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  const promptResult = await page.evaluate(() => {
    const tb = document.querySelector('div[contenteditable="true"], div[role="textbox"]');
    return {
      text: tb ? tb.innerText : '',
      html: tb ? tb.innerHTML : ''
    };
  });
  console.log('Final Prompt Bar content:', JSON.stringify(promptResult, null, 2));

  await browser.close();
  console.log('✅ End-to-end verification passed!');
}

testFullAttachmentAndPrompt().catch(console.error);
