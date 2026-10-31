const { chromium } = require('playwright');
const fs = require('fs');

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport to desktop size
  await page.setViewportSize({ width: 1600, height: 900 });

  const baseUrl = 'http://127.0.0.1:4173/';
  const outDir = 'screenshots/audit';

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('1. Capturing main menu...');
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/01-main-menu-desktop.png`, fullPage: true });

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/01-main-menu-mobile.png`, fullPage: true });

  console.log('2. Capturing mode selection...');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.click('#new-game');
  await page.waitForSelector('.mode-dialog[open]', { state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/02-mode-selection-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/02-mode-selection-mobile.png`, fullPage: true });

  console.log('3. Capturing starter selection...');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.click('[data-game-mode="survival"]');
  await page.waitForSelector('.starter-dialog[open]', { state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/03-starter-selection-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/03-starter-selection-mobile.png`, fullPage: true });

  console.log('4. Capturing gameplay (survival mode)...');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.click('#starter-confirm');
  await page.waitForSelector('#world:not([hidden])', { state: 'visible' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/04-gameplay-desktop.png`, fullPage: true });

  // Open worker panel
  await page.click('#open-workers');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/05-worker-panel-desktop.png`, fullPage: true });
  await page.click('#drawer-close');

  // Open tasks panel
  await page.click('#open-tasks');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/06-tasks-panel-desktop.png`, fullPage: true });
  await page.click('#drawer-close');

  // Open orders panel
  await page.click('#orders-btn');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/07-orders-panel-desktop.png`, fullPage: true });
  await page.click('#orders-btn');

  // Open construction panel
  await page.click('[data-tool="construir"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/08-construction-panel-desktop.png`, fullPage: true });
  await page.click('[data-tool="universal"]');

  // Open workshop
  await page.click('#open-workshop');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/09-workshop-desktop.png`, fullPage: true });
  await page.click('.modal-x');

  // Open stock
  await page.click('#open-stock');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/10-stock-desktop.png`, fullPage: true });
  await page.click('.modal-x');

  // Game options
  await page.click('#menu-btn');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/11-game-options-desktop.png`, fullPage: true });
  await page.click('.modal-x');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/04-gameplay-mobile.png`, fullPage: true });

  // Mobile worker panel
  await page.click('#open-workers');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/05-worker-panel-mobile.png`, fullPage: true });
  await page.click('#drawer-close');

  console.log('5. Capturing tutorial...');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.click('#help-btn');
  await page.waitForSelector('.help-guide[open]', { state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/12-tutorial-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/12-tutorial-mobile.png`, fullPage: true });

  console.log('6. Capturing map...');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.click('#new-game');
  await page.click('[data-game-mode="survival"]');
  await page.click('#starter-confirm');
  await page.waitForSelector('#world:not([hidden])', { state: 'visible' });
  await page.waitForTimeout(2000);

  // Open full map
  await page.click('#open-full-map');
  await page.waitForSelector('.map-modal[open]', { state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/13-full-map-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/13-full-map-mobile.png`, fullPage: true });

  // Minimap area
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.click('#new-game');
  await page.click('[data-game-mode="survival"]');
  await page.click('#starter-confirm');
  await page.waitForSelector('#world:not([hidden])', { state: 'visible' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/14-minimap-area-desktop.png`, clip: { x: 1300, y: 100, width: 300, height: 400 } });

  // HUD detail
  await page.screenshot({ path: `${outDir}/15-hud-topbar-desktop.png`, clip: { x: 0, y: 0, width: 1600, height: 120 } });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${outDir}/15-hud-topbar-mobile.png`, clip: { x: 0, y: 0, width: 390, height: 200 } });

  await browser.close();
  console.log('All screenshots captured!');
}

takeScreenshots().catch(console.error);