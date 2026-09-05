const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { getChromeExecutablePath } = require('./profileDetector');

async function inspectLoggedInGallery() {
  const chromePath = getChromeExecutablePath();
  const profilesDir = path.join(__dirname, '..', 'profiles');
  const accounts = fs.readdirSync(profilesDir);
  console.log('Available profile directories:', accounts);

  const targetDir = path.join(profilesDir, accounts[0] || 'acc_1');
  console.log('Using profile dir:', targetDir);

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
  console.log('Navigating to https://labs.google/fx/tools/flow ...');
  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'domcontentloaded' });

  console.log('Waiting 8 seconds for gallery to load...');
  await new Promise(r => setTimeout(r, 8000));

  const inspection = await page.evaluate(() => {
    function getInfo(el) {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        id: el.id || null,
        className: String(el.className || ''),
        innerText: (el.innerText || '').trim().substring(0, 100),
        href: el.getAttribute('href') || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        role: el.getAttribute('role') || null,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        outerHTML: el.outerHTML.substring(0, 300)
      };
    }

    const allClickable = Array.from(document.querySelectorAll('*')).filter(el => {
      const txt = (el.innerText || '').trim();
      const href = el.getAttribute('href') || '';
      return txt.includes('New project') || txt.includes('project') || href.includes('project') || txt.includes('Create');
    }).map(getInfo);

    const projectCards = Array.from(document.querySelectorAll('a[href*="/project/"], div[class*="card"], div[class*="project"], button, div[role="button"]')).map(getInfo);

    return {
      currentUrl: window.location.href,
      pageTitle: document.title,
      clickableMatches: allClickable,
      projectCards: projectCards.filter(c => c.rect.width > 20 && c.rect.height > 20)
    };
  });

  fs.writeFileSync('./gallery_inspection.json', JSON.stringify(inspection, null, 2), 'utf8');
  console.log('Saved inspection to gallery_inspection.json!');
  console.log('Current URL:', inspection.currentUrl);
  console.log('Found Clickable Matches:', inspection.clickableMatches.length);
  console.log('Found Project Cards / Buttons:', inspection.projectCards.length);

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
}

inspectLoggedInGallery().catch(console.error);
