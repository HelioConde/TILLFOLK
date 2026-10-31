const {test,expect}=require('@playwright/test');

async function startFarm(page){
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('body')).toHaveClass(/play-session/);
  await page.waitForTimeout(250);
}
test('HUD Sprout v3: compactação real, painel de inventário e indicador de estados',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.setViewportSize({width:1366,height:768});
  await startFarm(page);
  const measure=await page.evaluate(()=>{
    const header=document.querySelector('.topbar').getBoundingClientRect();
    const dock=document.querySelector('.tooltray').getBoundingClientRect();
    const region=document.querySelector('.scene-head').getBoundingClientRect();
    const style=getComputedStyle(document.querySelector('.tool.active span'));
    return {header:header.height,region:region.width,
      dock:{left:dock.left,right:dock.right,bottom:dock.bottom,height:dock.height},
      slot:style.backgroundImage,width:innerWidth,height:innerHeight};
  });
  expect(measure.header).toBeLessThanOrEqual(68);
  expect(measure.region).toBeLessThanOrEqual(330);
  expect(measure.dock.height).toBeLessThanOrEqual(95);
  expect(measure.dock.left).toBeGreaterThanOrEqual(-1);
  expect(measure.dock.right).toBeLessThanOrEqual(measure.width+1);
  expect(measure.dock.bottom).toBeLessThanOrEqual(measure.height+1);
  expect(measure.slot).toContain('url(');
  await page.screenshot({path:'screenshots/hud-refinado-desktop-1366x768.png',animations:'disabled'});
  await page.locator('#open-workers').click();
  await expect(page.locator('.resource-slot')).toHaveCount(8);
  await expect(page.locator('.worker-status').first()).toBeVisible();
  await expect(page.locator('.worker-bar').first()).toHaveAttribute('role','progressbar');
  await page.screenshot({path:'screenshots/hud-refinado-equipe-1366x768.png',animations:'disabled'});
  await page.locator('#drawer-close').click();
  await page.locator('#world').hover({position:{x:510,y:320}});
  await page.screenshot({path:'screenshots/hud-refinado-terreno-1366x768.png',animations:'disabled'});
  expect(errors).toEqual([]);
});
test('HUD Sprout v3: 390px com slots e controles dentro da viewport',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.setViewportSize({width:390,height:844});
  await startFarm(page);
  const rects=await page.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect();
    return {header:r('.topbar').toJSON(),dock:r('.tooltray').toJSON(),
      slots:[...document.querySelectorAll('.tool')].map(el=>el.getBoundingClientRect().toJSON()),
      width:innerWidth,height:innerHeight};
  });
  expect(rects.dock.left).toBeGreaterThanOrEqual(-1);
  expect(rects.dock.right).toBeLessThanOrEqual(rects.width+1);
  expect(rects.dock.bottom).toBeLessThanOrEqual(rects.height+1);
  expect(rects.slots.every(r=>r.left>=-1&&r.right<=rects.width+1&&r.height>=48)).toBe(true);
  await page.screenshot({path:'screenshots/hud-refinado-mobile-390x844.png',animations:'disabled'});
  await page.locator('#open-workers').click();
  await expect(page.locator('.resource-slot')).toHaveCount(8);
  await page.screenshot({path:'screenshots/hud-refinado-mobile-inventario.png',animations:'disabled'});
  expect(errors).toEqual([]);
});
