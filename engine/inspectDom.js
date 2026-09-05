const puppeteer = require('puppeteer-core');
const { getChromeExecutablePath } = require('./engine/profileDetector');
const fs = require('fs');

async function inspectFlowElements() {
  const chromePath = getChromeExecutablePath();
  console.log('Launching Chrome with pipe: true to inspect DOM...');
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    pipe: true,
    args: ['--start-maximized', '--no-first-run', '--no-default-browser-check']
  });

  const pages = await browser.pages();
  const page = pages[0];
  
  console.log('Navigating to Google Flow...');
  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  console.log('Waiting 10s for JavaScript frameworks to hydrate...');
  await new Promise(r => setTimeout(r, 10000));

  const domAnalysis = await page.evaluate(() => {
    function getElementDetails(el) {
      const rect = el.getBoundingClientRect();
      return {
        tagName: el.tagName,
        id: el.id || null,
        className: el.className ? String(el.className) : null,
        innerText: el.innerText ? el.innerText.trim().substring(0, 100) : null,
        placeholder: el.placeholder || el.getAttribute('placeholder') || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        role: el.getAttribute('role') || null,
        contentEditable: el.getAttribute('contenteditable') || null,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        outerHTML: el.outerHTML.substring(0, 200)
      };
    }

    const allButtons = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]')).map(getElementDetails);
    const allInputs = Array.from(document.querySelectorAll('input, textarea, div[contenteditable="true"], [contenteditable=""]')).map(getElementDetails);
    const allClickable = Array.from(document.querySelectorAll('a, button, div, span')).filter(el => {
      const txt = el.innerText ? el.innerText.trim() : '';
      return txt.includes('Create') || txt.includes('Sign in') || txt.includes('Flow') || txt.includes('Video') || txt.includes('Project');
    }).map(getElementDetails);

    return {
      currentUrl: window.location.href,
      pageTitle: document.title,
      buttons: allButtons,
      inputs: allInputs,
      clickableKeywords: allClickable
    };
  });

  fs.writeFileSync('./dom_analysis.json', JSON.stringify(domAnalysis, null, 2), 'utf8');
  console.log('DOM analysis saved to dom_analysis.json!');
  console.log('Current URL:', domAnalysis.currentUrl);
  console.log('Total Buttons found:', domAnalysis.buttons.length);
  console.log('Total Inputs found:', domAnalysis.inputs.length);
  console.log('Clickable Keywords count:', domAnalysis.clickableKeywords.length);

  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
}

inspectFlowElements().catch(console.error);
