const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function inspectWorkspaceCanvas() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'inspect_temp');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  console.log('Inspecting workspace canvas elements...');
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

  const projectUrl = 'https://labs.google/fx/tools/flow';
  console.log('Navigating to:', projectUrl);
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('Checking for prompt box or editor elements in DOM...');
  const canvasInspection = await page.evaluate(() => {
    function getInfo(el) {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        id: el.id || null,
        className: String(el.className || ''),
        innerText: (el.innerText || '').trim().substring(0, 100),
        placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        contentEditable: el.getAttribute('contenteditable') || null,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        outerHTML: el.outerHTML.substring(0, 300)
      };
    }

    const allInputs = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea, input, [data-placeholder]')).map(getInfo);
    const bottomButtons = Array.from(document.querySelectorAll('button, div[role="button"], span')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.top > (window.innerHeight - 200) && rect.width > 15;
    }).map(getInfo);

    return {
      url: window.location.href,
      inputs: allInputs,
      bottomButtons: bottomButtons
    };
  });

  fs.writeFileSync('./canvas_inspection.json', JSON.stringify(canvasInspection, null, 2), 'utf8');
  console.log('Saved inspection to canvas_inspection.json!');
  console.log('Inputs found:', canvasInspection.inputs.length);
  console.log('Bottom controls found:', canvasInspection.bottomButtons.length);

  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
}

inspectWorkspaceCanvas().catch(console.error);
