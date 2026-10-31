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


test('Câmera do vale: zoom, minimapa e navegação por teclado',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.setViewportSize({width:1366,height:768});
  await startFarm(page);
  await expect(page.locator('#minimap')).toBeVisible();
  await expect(page.locator('#zoom-value')).toHaveText('100%');
  const before=await page.locator('#world').boundingBox();
  await page.locator('#zoom-in').click();
  await expect(page.locator('#zoom-value')).toHaveText('125%');
  await expect.poll(async()=> (await page.locator('#world').boundingBox()).width,{timeout:3500})
    .toBeGreaterThan(before.width*1.2);
  const after=await page.locator('#world').boundingBox();
  expect(after.width).toBeGreaterThan(before.width*1.2);
  await page.locator('#minimap').click({position:{x:36,y:35}});
  const positioned=await page.locator('#world').boundingBox();
  expect(Math.abs(positioned.x-after.x)+Math.abs(positioned.y-after.y)).toBeGreaterThan(20);
  await page.screenshot({path:'screenshots/camera-minimapa-zoom-desktop.png',animations:'disabled'});
  await page.locator('#zoom-reset').click();
  await expect(page.locator('#zoom-value')).toHaveText('100%');
  await page.locator('#minimap-toggle').click();
  await expect(page.locator('#minimap')).toBeHidden();
  await page.keyboard.press('m');
  await expect(page.locator('#minimap')).toBeVisible();
  await page.keyboard.press('+');
  await expect(page.locator('#zoom-value')).toHaveText('125%');
  await page.keyboard.press('0');
  await expect(page.locator('#zoom-value')).toHaveText('100%');
  expect(errors).toEqual([]);
});

test('Câmera do vale: minimapa recolhido no celular, sem bloquear controles',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.setViewportSize({width:390,height:844});
  await startFarm(page);
  await expect(page.locator('#minimap')).toBeHidden();
  await expect(page.locator('#zoom-value')).toHaveText('100%');
  const initial=await page.locator('#world').boundingBox();
  await page.locator('#zoom-in').click();
  await expect.poll(async()=> (await page.locator('#world').boundingBox()).width,{timeout:3500})
    .toBeGreaterThan(initial.width*1.2);
  const zoomed=await page.locator('#world').boundingBox();
  expect(zoomed.width).toBeGreaterThan(initial.width*1.2);
  await page.locator('#minimap-toggle').click();
  await expect(page.locator('#minimap')).toBeVisible();
  const fits=await page.evaluate(()=>{
    const cam=document.querySelector('#camera-ui').getBoundingClientRect();
    const minimap=document.querySelector('#minimap').getBoundingClientRect();
    const region=document.querySelector('.scene-head').getBoundingClientRect();
    return {camRight:cam.right,miniRight:minimap.right,
      separated:cam.top>=region.bottom-2,width:innerWidth};
  });
  expect(fits.camRight).toBeLessThanOrEqual(fits.width+1);
  expect(fits.miniRight).toBeLessThanOrEqual(fits.width+1);
  expect(fits.separated).toBe(true);
  await page.screenshot({path:'screenshots/camera-minimapa-mobile.png',animations:'disabled'});
  await page.locator('#zoom-reset').click();
  await expect(page.locator('#zoom-value')).toHaveText('100%');
  expect(errors).toEqual([]);
});


test('Zoom estilo ONI: roda aproxima suavemente ao redor do cursor',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1366,height:768});
  await startFarm(page);
  const point={x:660,y:385};
  const initial=await page.locator('#world').boundingBox();
  const local=box=>({
    x:(point.x-box.x)/box.width,
    y:(point.y-box.y)/box.height
  });
  const before=local(initial);
  await page.mouse.move(point.x,point.y);
  await page.mouse.wheel(0,-120);
  await expect.poll(async()=>Number((await page.locator('#zoom-value').textContent()).replace('%','')),
    {timeout:3000}).toBeGreaterThan(115);
  await page.waitForTimeout(550);
  const after=await page.locator('#world').boundingBox(),anchored=local(after);
  expect(after.width).toBeGreaterThan(initial.width*1.12);
  expect(Math.abs(before.x-anchored.x)).toBeLessThan(.025);
  expect(Math.abs(before.y-anchored.y)).toBeLessThan(.025);
  await page.screenshot({path:'screenshots/oni-camera-zoom-no-cursor-1366x768.png',animations:'disabled'});
  await page.mouse.wheel(0,900);
  await expect.poll(async()=>await page.locator('#zoom-value').textContent(),{timeout:4000})
    .toBe('100%');
  expect(errors).toEqual([]);
});

test('Câmera ONI: WASD contínuo, H para centralizar e arrasto com mouse central',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1366,height:768});
  await startFarm(page);
  await page.locator('#zoom-in').click();
  await page.locator('#zoom-in').click();
  await page.waitForTimeout(420);
  const before=await page.locator('#world').boundingBox();
  await page.keyboard.down('d');
  await page.waitForTimeout(170);
  await page.keyboard.up('d');
  const moved=await page.locator('#world').boundingBox();
  expect(moved.x).toBeLessThan(before.x-20);
  await page.keyboard.press('h');
  const homed=await page.locator('#world').boundingBox();
  expect(Math.abs(homed.x-before.x)).toBeLessThan(15);
  await page.mouse.move(620,365);
  await page.mouse.down({button:'middle'});
  await page.mouse.move(530,325,{steps:8});
  await page.mouse.up({button:'middle'});
  const dragged=await page.locator('#world').boundingBox();
  expect(Math.abs(dragged.x-homed.x)+Math.abs(dragged.y-homed.y)).toBeGreaterThan(15);
  await page.screenshot({path:'screenshots/oni-camera-wasd-arrasto-1366x768.png',animations:'disabled'});
  expect(errors).toEqual([]);
});

test('Câmera ONI: limites do zoom e atalhos sem alterar as ferramentas',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1600,height:900});
  await startFarm(page);
  await page.mouse.move(700,430);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await page.mouse.wheel(0,-900);
  await expect.poll(async()=>Number((await page.locator('#zoom-value').textContent()).replace('%','')))
    .toBeGreaterThan(250);
  const high=Number((await page.locator('#zoom-value').textContent()).replace('%',''));
  expect(high).toBeLessThanOrEqual(400);
  await page.keyboard.press('0');
  await expect(page.locator('#zoom-value')).toHaveText('100%');
  await expect(page.locator('.tool.active[data-tool="universal"]')).toBeVisible();
  await page.keyboard.press('m');
  await expect(page.locator('#minimap')).toBeHidden();
  await page.keyboard.press('m');
  await expect(page.locator('#minimap')).toBeVisible();
  expect(errors).toEqual([]);
});
