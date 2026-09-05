const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getChromeExecutablePath } = require('./profileDetector');

async function testInspectVideoDownload() {
  const chromePath = getChromeExecutablePath();
  const targetDir = path.join(__dirname, '..', 'profiles', 'acc_1');
  const downloadDir = path.join(process.env.USERPROFILE || 'C:\\Users\\mohda', 'Downloads', 'GoogleFlow_Videos');

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 2000));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    pipe: true,
    args: [
      `--user-data-dir=${targetDir}`,
      '--start-maximized',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0];

  // Configure CDP download path
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  const projectUrl = 'https://labs.google/fx/tools/flow/project/8272b1c0-0df8-4228-b065-32d8c54df051';
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  console.log('1. Inspecting generated video cards on canvas...');
  const cardElements = await page.evaluate(() => {
    // Find all media cards / video tiles
    const allCards = Array.from(document.querySelectorAll('div[class*="card"], div[class*="item"], div:has(> video), div:has(> [class*="play"])'));
    return allCards.map((c, i) => {
      const r = c.getBoundingClientRect();
      return {
        index: i,
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        text: (c.innerText || '').substring(0, 50),
        hasVideo: !!c.querySelector('video'),
        buttons: Array.from(c.querySelectorAll('button, [role="button"]')).map(b => b.innerText || b.getAttribute('aria-label') || b.className)
      };
    }).filter(c => c.rect.width > 100 && c.rect.height > 100);
  });

  console.log('Found video cards:', cardElements);

  if (cardElements.length > 0) {
    const targetCard = cardElements[0];
    console.log('2. Hovering on the most recent video card at:', targetCard.rect);
    await page.mouse.move(targetCard.rect.x + targetCard.rect.width / 2, targetCard.rect.y + targetCard.rect.height / 2);
    await new Promise(r => setTimeout(r, 1000));

    console.log('3. Inspecting buttons that appeared on hover...');
    const hoverButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]')).filter(b => {
        const r = b.getBoundingClientRect();
        return r.width > 15 && r.height > 15 && r.y < window.innerHeight - 150;
      }).map(b => ({
        text: (b.innerText || '').trim(),
        ariaLabel: b.getAttribute('aria-label') || '',
        innerHTML: b.innerHTML.substring(0, 100),
        rect: { x: Math.round(b.getBoundingClientRect().x), y: Math.round(b.getBoundingClientRect().y), width: Math.round(b.getBoundingClientRect().width), height: Math.round(b.getBoundingClientRect().height) }
      }));
      return btns;
    });

    console.log('Hover buttons on card:', hoverButtons);

    // Look for more_vert / 3 dots / download button
    const dotBtn = hoverButtons.find(b => b.text.includes('more_vert') || b.ariaLabel.includes('More') || b.innerHTML.includes('more_vert') || b.text.includes('download'));
    if (dotBtn) {
      console.log('Clicking 3-dots / menu button on video card:', dotBtn);
      await page.mouse.click(dotBtn.rect.x + dotBtn.rect.width / 2, dotBtn.rect.y + dotBtn.rect.height / 2);
      await new Promise(r => setTimeout(r, 1000));

      console.log('4. Inspecting menu items in video context menu...');
      const menuItems = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('[role="menuitem"], div, span, button')).filter(el => {
          const txt = (el.innerText || '').trim();
          const r = el.getBoundingClientRect();
          return r.width > 20 && r.height > 15 && (txt === 'Download' || txt.includes('Download') || txt.includes('720p') || txt.includes('1080p') || txt === 'Delete' || txt.includes('Share'));
        }).map(el => ({
          text: (el.innerText || '').trim(),
          rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }
        }));
        return menuItems;
      });

      console.log('Context menu items:', menuItems);

      const downloadItem = menuItems.find(m => m.text === 'Download' || m.text.includes('Download'));
      if (downloadItem) {
        console.log('Clicking Download Option at:', downloadItem.rect);
        await page.mouse.click(downloadItem.rect.x + downloadItem.rect.width / 2, downloadItem.rect.y + downloadItem.rect.height / 2);
        await new Promise(r => setTimeout(r, 1000));

        // Submenu for quality if present
        const qualityItem = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('*')).filter(el => {
            const txt = (el.innerText || '').trim();
            const r = el.getBoundingClientRect();
            return (txt.includes('720p') || txt.includes('Original') || txt.includes('1080p')) && r.height > 15 && r.height < 60;
          });
          if (all.length > 0) {
            const r = all[0].getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: all[0].innerText };
          }
          return null;
        });

        console.log('Quality option:', qualityItem);
        if (qualityItem) {
          await page.mouse.click(qualityItem.x, qualityItem.y);
          console.log('Clicked Quality option!');
        }

        console.log('Waiting 5s for file to download to:', downloadDir);
        await new Promise(r => setTimeout(r, 5000));

        const downloadedFiles = fs.readdirSync(downloadDir);
        console.log('Files in Master Download Folder:', downloadedFiles);
      }
    }
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

testInspectVideoDownload().catch(console.error);
