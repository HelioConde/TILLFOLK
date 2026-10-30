const {test,expect}=require('@playwright/test');
const screenSizes=[
 {width:1600,height:900},{width:1366,height:768},
 {width:1125,height:790},{width:1024,height:768},
 {width:800,height:900},{width:390,height:844},{width:1366,height:600}
];
test('TILLFOLK: menu visível em todas as resoluções',async({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  for(const view of screenSizes){
    await page.setViewportSize(view);
    await page.waitForTimeout(250);
    const nav=page.locator('#menu .title-navigation');
    await expect(nav).toBeVisible();
    await expect(page.locator('#new-game')).toBeVisible();
    const limits=await page.evaluate(()=>{
      const menu=document.querySelector('#menu');
      const nav=menu.querySelector('.title-navigation').getBoundingClientRect();
      const first=menu.querySelector('#new-game').getBoundingClientRect();
      const last=menu.querySelector('#title-exit').getBoundingClientRect();
      return {navLeft:nav.left,navRight:nav.right,navTop:nav.top,
        firstLeft:first.left,firstRight:first.right,lastBottom:last.bottom,
        viewportWidth:innerWidth,htmlWidth:document.documentElement.scrollWidth};
    });
    expect(limits.navLeft).toBeGreaterThanOrEqual(0);
    expect(limits.firstLeft).toBeGreaterThanOrEqual(0);
    expect(limits.navRight).toBeLessThanOrEqual(view.width+1);
    expect(limits.firstRight).toBeLessThanOrEqual(view.width+1);
    expect(limits.htmlWidth).toBeLessThanOrEqual(view.width+1);
    if(view.width>850) expect(limits.lastBottom).toBeLessThanOrEqual(view.height+1);
    await page.screenshot({path:'screenshots/menu-'+view.width+'x'+view.height+'.png',fullPage:false,animations:'disabled'});
  }
  await page.setViewportSize({width:1125,height:790});
  await page.locator('#new-game').click();
  await expect(page.locator('#mode-dialog')).toBeVisible();
  await page.screenshot({path:'screenshots/modos-1125x790.png',animations:'disabled'});
  await page.locator('[data-game-mode="survival"]').click();
  await expect(page.locator('#starter-dialog')).toBeVisible();
  await page.screenshot({path:'screenshots/recrutamento-1125x790.png',animations:'disabled'});
});
test('Foco de teclado e movimento reduzido',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').focus();
  await expect(page.locator('#new-game')).toBeFocused();
  const focus=await page.locator('#new-game').evaluate(el=>getComputedStyle(el).outlineStyle);
  expect(focus).not.toBe('none');
});

test('Cena jogável: fotografar mundo, movimentação e atlas dos colonos', async ({page}) => {
  await page.setViewportSize({width:1366,height:768});
  const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#world')).toBeVisible();
  await page.waitForTimeout(3200);
  await page.screenshot({path:'screenshots/jogo-1366x768.png',animations:'disabled'});
  await page.setViewportSize({width:1600,height:900});
  await page.waitForTimeout(400);
  await page.screenshot({path:'screenshots/jogo-1600x900.png',animations:'disabled'});
  await page.locator('#focus-game').click();
  await expect(page.locator('body')).toHaveClass(/focus-game/);
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.screenshot({path:'screenshots/jogo-imersivo-1600x900.png',animations:'disabled'});
  await page.locator('#focus-game').click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.locator('#world').click({position:{x:570,y:340}});
  await page.waitForTimeout(600);
  await page.screenshot({path:'screenshots/jogo-cultivo-1600x900.png',animations:'disabled'});
  const asset=await page.evaluate(async()=>{
    const image=new Image(); image.src='./public/assets/sprout-lands/characters/worker-variants.png';
    await image.decode();
    const tile=48, cols=Math.min(8,Math.floor(image.width/tile)), rows=Math.min(16,Math.floor(image.height/tile));
    const board=document.createElement('canvas');board.width=cols*tile*3;board.height=rows*tile*3;
    const cx=board.getContext('2d');cx.imageSmoothingEnabled=false;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)cx.drawImage(image,x*tile,y*tile,tile,tile,x*tile*3,y*tile*3,tile*3,tile*3);
    board.id='atlas-debug';board.style.cssText='position:fixed;top:0;left:0;z-index:99999;max-width:none;width:'+board.width+'px;height:'+board.height+'px';
    document.body.appendChild(board);
    return {width:image.width,height:image.height,cols,rows};
  });
  await page.locator('#atlas-debug').screenshot({path:'screenshots/atlas-personagens.png'});
  await page.locator('#atlas-debug').evaluate(el=>el.remove());
  expect(asset.cols).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('Fazenda jogável: capturas do HUD, sprites e fluxo de cultivo',async({page})=>{
  const assetErrors=[];
  page.on('response',response=>{
    if(response.status()>=400&&/\\.(png|css|js|ttf|svg)(\\?|$)/i.test(response.url()))
      assetErrors.push(response.status()+' '+response.url());
  });
  await page.setViewportSize({width:1600,height:900});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="survival"]').click();
  await expect(page.locator('#starter-dialog')).toBeVisible();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#world')).toBeVisible();
  await page.waitForTimeout(3200);
  const pixels=await page.locator('#world').evaluate(canvas=>{
    const ctx=canvas.getContext('2d');
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let nonzero=0,bright=0;
    for(let i=0;i<data.length;i+=160){if(data[i+3]>0)nonzero++;if(data[i]>110)bright++;}
    return {nonzero,bright};
  });
  expect(pixels.nonzero).toBeGreaterThan(100);
  expect(pixels.bright).toBeGreaterThan(100);
  await page.screenshot({path:'screenshots/jogo-1600x900.png',animations:'disabled'});
  const canvas=page.locator('#world');
  const r=await canvas.boundingBox();
  await page.mouse.click(r.x+r.width*(15.5/28),r.y+r.height*(11.5/18));
  await expect(page.locator('#task-count')).not.toHaveText('0');
  await page.screenshot({path:'screenshots/jogo-tarefa-1600x900.png',animations:'disabled'});
  for(const view of [{width:1125,height:790},{width:390,height:844}]){
    await page.setViewportSize(view);
    await page.waitForTimeout(400);
    await expect(page.locator('#world')).toBeVisible();
    await page.screenshot({path:'screenshots/jogo-'+view.width+'x'+view.height+'.png',animations:'disabled'});
  }
  expect(assetErrors).toEqual([]);
});


test('Menu acessível: foco isolado, retorno e continuar usando armazenamento local',async({page})=>{
  await page.setViewportSize({width:1125,height:790});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await expect(page.locator('.app-shell')).toHaveAttribute('inert','');
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert','');
  await page.locator('#menu-btn').click();
  await expect(page.locator('.app-shell')).toHaveAttribute('inert','');
  await expect(page.locator('#new-game')).toBeFocused();
  await expect(page.locator('#continue')).toBeEnabled();
  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('#continue')).toBeEnabled();
  await page.locator('#continue').click();
  await expect(page.locator('#menu')).toBeHidden();
});

test('Movimento reduzido e preferência de animação persistida',async({page})=>{
  await page.setViewportSize({width:1024,height:768});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#title-settings').click();
  await page.locator('#title-motion').uncheck();
  await expect(page.locator('#menu')).toHaveClass(/no-title-motion/);
  await expect(page.locator('#title-motion')).toHaveAttribute('aria-checked','false');
  await page.locator('#title-settings-dialog .modal-x').click();
  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('#menu')).toHaveClass(/no-title-motion/);
  await expect(page.locator('#title-fullscreen')).toHaveAttribute('aria-pressed','false');
});
