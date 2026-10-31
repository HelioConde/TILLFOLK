async function continueIfMenuVisible(page){
  if(await page.locator('#menu').isVisible())await page.locator('#continue').click();
  await expect(page.locator('#menu')).toBeHidden();
}
const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:4173/';
async function startGame(page){
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#world')).toBeVisible();
  // Teste da construção avançada: conceder madeira; a NOVA partida nasce com zero.
  await page.evaluate(()=>{
    const save=JSON.parse(localStorage.getItem('tillfolk-v01'));
    save.inventory.wood=15;localStorage.setItem('tillfolk-v01',JSON.stringify(save));
  });
  await page.reload({waitUntil:'networkidle'});
  await continueIfMenuVisible(page);
}
async function clickTile(page,x,y,button='left'){
  await page.locator('#world').evaluate((canvas,{x,y,button})=>{
    const r=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent(button==='right'?'contextmenu':'click',{
      bubbles:true,cancelable:true,button:button==='right'?2:0,
      clientX:r.left+(x+.5)*r.width/(canvas.width/32),clientY:r.top+(y+.5)*r.height/(canvas.height/32)
    }));
  },{x,y,button});
}
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
test('Vale selvagem: construir casa, desfazer, salvar e proteger fundação',async({page})=>{
  const errors=[],notFound=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{
    if(r.status()>=400&&/\.(png|js|css)(\?|$)/i.test(r.url()))notFound.push(r.url());
  });
  await page.setViewportSize({width:1600,height:900});
  await startGame(page);
  await page.locator('[data-tool="construir"]').click();
  await expect(page.locator('#construction-panel')).toBeVisible();
  const start=await snapshot(page);
  expect(start.house.floor).toHaveLength(0);
  expect(start.world.objects.length).toBeGreaterThan(30);
  expect(start.inventory.wood).toBeGreaterThanOrEqual(5);
  await clickTile(page,13,11);
  let current=await snapshot(page);
  expect(current.house.floor).toContain('13-11');
  expect(current.house.anchor).toBe('13-11');
  expect(current.inventory.wood).toBe(start.inventory.wood-1);
  await clickTile(page,14,11);
  current=await snapshot(page);
  expect(current.house.floor).toContain('14-11');
  await page.locator('#build-undo').click();
  expect((await snapshot(page)).house.floor).not.toContain('14-11');
  await clickTile(page,14,11);
  await clickTile(page,13,11,'right');
  await expect(page.locator('#build-status')).toContainText('fundação original');
  await page.locator('[data-build-layer="walls"]').click();
  await clickTile(page,13,12);
  expect((await snapshot(page)).house.walls).toContain('13-12');
  await page.locator('[data-build-layer="roof"]').click();
  await clickTile(page,14,12);
  expect((await snapshot(page)).house.roof).toContain('14-12');
  await page.screenshot({path:'screenshots/casa-vale-desktop-1600x900.png',animations:'disabled'});
  await page.locator('#build-roof').click();
  expect((await snapshot(page)).house.roofHidden).toBe(true);
  await page.reload({waitUntil:'networkidle'});
  await continueIfMenuVisible(page);
  const resumed=await snapshot(page);
  expect(resumed.world.seed).toBe(start.world.seed);
  expect(resumed.house.floor).toContain('14-11');
  expect(resumed.house.walls).toContain('13-12');
  expect(resumed.house.roofHidden).toBe(true);
  expect(errors).toEqual([]);
  expect(notFound).toEqual([]);
});
test('Construtor mobile: câmera, atalhos, save antigo e UI',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startGame(page);
  await page.keyboard.press('b');
  await expect(page.locator('#construction-panel')).toBeVisible();
  await page.waitForTimeout(180);
  const focus=await page.evaluate(()=>{
    const r=document.querySelector('#world').getBoundingClientRect();
    return r.left+r.width*(13.5/28);
  });
  expect(focus).toBeGreaterThan(65);
  expect(focus).toBeLessThan(325);
  await page.screenshot({path:'screenshots/casa-vale-mobile-390x844.png',animations:'disabled'});
  await page.locator('[data-build-layer="roof"]').click();
  await expect(page.locator('[data-build-layer="roof"]')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#construction-panel')).toBeHidden();
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    delete s.house;localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await continueIfMenuVisible(page);
  expect((await snapshot(page)).house.floor).toHaveLength(0);
  expect((await snapshot(page)).inventory.wood).toBeGreaterThanOrEqual(0);
});
