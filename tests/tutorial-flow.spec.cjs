const {test,expect}=require('@playwright/test');
const URL='http://127.0.0.1:4173/';

async function visit(page,viewport={width:1366,height:768}){
  await page.setViewportSize(viewport);
  await page.goto(URL,{waitUntil:'networkidle'});
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#help-btn')).toBeVisible();
}
async function finishSlides(page){
  await page.locator('#help-btn').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await expect(page.locator('#guide-play')).toBeHidden();
  for(let i=1;i<6;i++)await page.locator('#help-next').click();
  await expect(page.locator('#guide-counter')).toHaveText('6 de 6');
  await expect(page.locator('#guide-play')).toBeVisible();
  await expect(page.locator('#help-close')).toBeVisible();
}
async function newFarm(page){
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('body')).toHaveClass(/play-session/);
}

test('Tutorial apenas no menu: seis etapas e retorno sem criar ou apagar save',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await visit(page);
  await expect(page.locator('#help-btn strong')).toHaveText('Tutorial');
  await finishSlides(page);
  await page.screenshot({path:'screenshots/tutorial-final-opcoes-desktop-1366x768.png',animations:'disabled'});
  await page.locator('#help-close').click();
  await expect(page.locator('#help-dialog')).toBeHidden();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#help-btn')).toBeFocused();
  expect(await page.evaluate(()=>localStorage.getItem('tillfolk-v01'))).toBeNull();
  await page.locator('#help-btn').click();
  await expect(page.locator('#guide-counter')).toHaveText('1 de 6');
  await expect(page.locator('#guide-play')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Tutorial completo, sem save: Continuar jogando abre nova fazenda',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await visit(page);
  await expect(page.locator('#continue')).toBeDisabled();
  await finishSlides(page);
  await page.locator('#guide-play').click();
  await expect(page.locator('#help-dialog')).toBeHidden();
  await expect(page.locator('#mode-dialog')).toBeVisible();
  await expect(page.locator('#menu')).toBeVisible();
  await page.locator('[data-game-mode="relaxed"]').click();
  await expect(page.locator('#starter-dialog')).toBeVisible();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/play-session/);
  const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
  expect(current?.workers?.length).toBeGreaterThanOrEqual(2);
  await page.screenshot({path:'screenshots/tutorial-continua-primeira-fazenda.png',animations:'disabled'});
  expect(errors).toEqual([]);
});

test('Tutorial completo, com save: continua a partida existente sem substituir a fazenda',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await visit(page);
  await newFarm(page);
  await page.locator('#menu-btn').click();
  await expect(page.locator('#game-options-dialog')).toBeVisible();
  await page.locator('#game-return-title').click();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#continue')).toBeEnabled();
  const original=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    return {seed:s.world.seed,workerIds:s.workers.map(w=>w.id),farmName:s.farmName};
  });
  await finishSlides(page);
  await page.screenshot({path:'screenshots/tutorial-save-final-1366x768.png',animations:'disabled'});
  await page.locator('#guide-play').click();
  await expect(page.locator('#help-dialog')).toBeHidden();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/play-session/);
  const resumed=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    return {seed:s.world.seed,workerIds:s.workers.map(w=>w.id),farmName:s.farmName};
  });
  expect(resumed).toEqual(original);
  expect(errors).toEqual([]);
});

test('Tutorial mobile: escolhas finais legíveis e sem sair da tela',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await visit(page,{width:390,height:844});
  await finishSlides(page);
  const metrics=await page.evaluate(()=>{
    const d=document.querySelector('#help-dialog').getBoundingClientRect();
    const play=document.querySelector('#guide-play').getBoundingClientRect();
    const back=document.querySelector('#help-close').getBoundingClientRect();
    return {dialogRight:d.right,dialogBottom:d.bottom,
      playLeft:play.left,playRight:play.right,playBottom:play.bottom,
      backLeft:back.left,backRight:back.right,backBottom:back.bottom,
      width:innerWidth,height:innerHeight};
  });
  expect(metrics.dialogRight).toBeLessThanOrEqual(metrics.width+1);
  for(const name of ['play','back']){
    expect(metrics[name+'Left']).toBeGreaterThanOrEqual(-1);
    expect(metrics[name+'Right']).toBeLessThanOrEqual(metrics.width+1);
    expect(metrics[name+'Bottom']).toBeLessThanOrEqual(metrics.height+1);
  }
  await page.screenshot({path:'screenshots/tutorial-final-opcoes-mobile-390x844.png',animations:'disabled'});
  await page.locator('#help-close').click();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#help-dialog')).toBeHidden();
  expect(errors).toEqual([]);
});
