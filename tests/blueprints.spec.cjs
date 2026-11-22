const {findFreeSite}=require("./helpers/world-sites.cjs");
async function continueIfMenuVisible(page){
  if(await page.locator('#menu').isVisible())await page.locator('#continue').click();
  await expect(page.locator('#menu')).toBeHidden();
}
const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
async function start(page,width=1366,height=768){
  await page.setViewportSize({width,height});
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('body')).toHaveClass(/play-session/);
  await page.locator('[data-speed="0"]').click();
  await page.locator('[data-tool="construir"]').click();
  await expect(page.locator('#construction-panel')).toBeVisible();
}
const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
async function freeCells(page){return findFreeSite(page,{width:2,height:2,kind:"both"});}
async function mouseTile(page,x,y,type='click'){
 await page.locator('#world').evaluate((el,{x,y,type})=>{
  const rect=el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent(type,{
    bubbles:true,cancelable:true,button:type==='contextmenu'?2:0,
    clientX:rect.left+rect.width*(x+.5)/(el.width/32),
    clientY:rect.top+rect.height*(y+.5)/(el.height/32)
  }));
 },{x,y,type});
}
async function hoverTile(page,x,y){
 await page.locator('#world').evaluate((el,{x,y})=>{
  const r=el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent('pointermove',{
   bubbles:true,pointerType:'mouse',pointerId:1,
   clientX:r.left+r.width*(x+.5)/(el.width/32),
   clientY:r.top+r.height*(y+.5)/(el.height/32)
  }));
 },{x,y});
 await page.waitForTimeout(200);
}
test('Blueprint azul transparente usa sprites reais e prevê canteiro antes do clique',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page);
 await expect(page.locator('[data-build-layer="home"]')).toBeVisible();
 await expect(page.locator('[data-build-layer="field"]')).toBeVisible();
 await page.locator('[data-build-layer="field"]').click();
 const cell=await freeCells(page);expect(cell).not.toBeNull();
 await hoverTile(page,cell.x,cell.y);
 const colors=await page.evaluate(({x,y})=>{
   const c=document.querySelector('#world');
   const rgb=c.getContext('2d').getImageData(x*32+2,y*32+2,1,1).data;
   return {rgb:[...rgb],planned:!!window.TillfolkBlueprints};
 },cell);
 expect(colors.planned).toBe(true);
 expect(colors.rgb[2]).toBeGreaterThan(colors.rgb[0]);
 expect((await save(page)).orders).toHaveLength(0);
 await page.screenshot({path:'screenshots/blueprint-canteiro-preview-1366x768.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
test('Canteiro cria arar e semear; ghost persistente e cancelamento direito limpam as ordens',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page);
 await page.locator('[data-build-layer="field"]').click();
 const cell=await freeCells(page);expect(cell).not.toBeNull();
 await mouseTile(page,cell.x,cell.y);
 let s=await save(page),planned=s.orders.filter(o=>o.x===cell.x&&o.y===cell.y);
 expect(planned.map(o=>o.type)).toEqual(['till','sow']);
 await page.screenshot({path:'screenshots/blueprint-canteiro-pendente-1366x768.png',animations:'disabled'});
 await page.reload({waitUntil:'networkidle'});
 await continueIfMenuVisible(page);
 s=await save(page);expect(s.orders.filter(o=>o.x===cell.x&&o.y===cell.y)).toHaveLength(2);
 await page.locator('[data-tool="construir"]').click();
 await page.locator('[data-build-layer="field"]').click();
 await mouseTile(page,cell.x,cell.y,'contextmenu');
 s=await save(page);
 expect(s.orders.filter(o=>o.x===cell.x&&o.y===cell.y)).toHaveLength(0);
 expect(s.plots.find(p=>p.x===cell.x&&p.y===cell.y).selected).toBe(false);
 await page.screenshot({path:'screenshots/blueprint-canteiro-cancelado-1366x768.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
test('Cabana 2x2: prévia azul, fila dos trabalhadores, salvar e desfazer',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,1600,900);
 const cell=await freeCells(page);expect(cell).not.toBeNull();
 await page.locator('[data-build-layer="home"]').click();
 await hoverTile(page,cell.x,cell.y);
 await page.screenshot({path:'screenshots/blueprint-cabana-preview-1600x900.png',animations:'disabled'});
 await mouseTile(page,cell.x,cell.y);
 let s=await save(page);
 expect(s.orders.some(o=>o.type==='buildHome'&&o.x===cell.x&&o.y===cell.y)).toBe(true);
 expect(s.homes.some(h=>h.x===cell.x&&h.y===cell.y)).toBe(false);
 await page.screenshot({path:'screenshots/blueprint-cabana-pendente-1600x900.png',animations:'disabled'});
 // A versão atual usa clique direito para cancelar plantas individuais;
 // o botão Desfazer área é exclusivo para arrastos recentes.
 await page.locator('[data-tool="construir"]').click();
 await page.locator('[data-build-layer="home"]').click();
 await mouseTile(page,cell.x+1,cell.y+1,'contextmenu');
 s=await save(page);
 expect(s.orders.some(o=>o.type==='buildHome'&&o.x===cell.x&&o.y===cell.y)).toBe(false);
 // O menu Objetos se fecha após o contexto, inclusive em cancelamentos.
 // Reativar a ferramenta antes de criar a nova ordem.
 await page.locator('[data-tool="construir"]').click();
 await page.locator('[data-build-layer="home"]').click();
 await mouseTile(page,cell.x,cell.y);
 await page.reload({waitUntil:'networkidle'});
 await continueIfMenuVisible(page);
 s=await save(page);
 expect(s.orders.some(o=>o.type==='buildHome'&&o.x===cell.x&&o.y===cell.y)).toBe(true);
 expect(errors).toEqual([]);
});
test('Canteiros adjacentes no celular mantêm ordens independentes e cancelamento seguro',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,390,844);
 await page.locator('[data-build-layer="field"]').click();
 const cell=await freeCells(page);expect(cell).not.toBeNull();
 for(const dx of [0,1]){
   if(dx){await page.locator('[data-tool="construir"]').click();
     await page.locator('[data-build-layer="field"]').click();}
   await mouseTile(page,cell.x+dx,cell.y);
 }
 let s=await save(page);
 expect(s.orders.filter(o=>['till','sow'].includes(o.type)).length).toBe(4);
 await page.screenshot({path:'screenshots/blueprint-canteiros-mobile-390x844.png',animations:'disabled'});
 await page.locator('[data-tool="construir"]').click();
 await page.locator('[data-build-layer="field"]').click();
 await mouseTile(page,cell.x,cell.y,'contextmenu');
 await mouseTile(page,cell.x+1,cell.y,'contextmenu');
 s=await save(page);
 expect(s.orders.filter(o=>['till','sow'].includes(o.type))).toHaveLength(0);
 expect(errors).toEqual([]);
});

test('HUD com blueprint: velocidade, gestão e menu não se sobrepõem',async({page})=>{
  await start(page,1366,768);
  for(const size of [{width:1366,height:768},{width:390,height:844}]){
    await page.setViewportSize(size);
    await page.waitForTimeout(100);
    const geometry=await page.evaluate(()=>{
      const rect=selector=>{
        const r=document.querySelector(selector).getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};
      };
      return {metrics:rect('.metrics'),speed:rect('.topbar .speed-wrap'),
        panels:rect('.topbar .hud-panels'),menu:rect('#menu-btn'),
        clock:rect('#clock'),brand:rect('.topbar .brand'),
        viewport:window.innerWidth};
    });
    expect(geometry.speed.right).toBeLessThanOrEqual(geometry.viewport+1);
    expect(geometry.panels.right).toBeLessThanOrEqual(geometry.viewport+1);
    expect(geometry.menu.right).toBeLessThanOrEqual(geometry.viewport+1);
    if(size.width>840){
      expect(geometry.metrics.right).toBeLessThanOrEqual(geometry.speed.left+2);
      expect(geometry.speed.right).toBeLessThanOrEqual(geometry.panels.left+2);
    }else{
      expect(geometry.speed.top).toBeGreaterThanOrEqual(geometry.panels.bottom-2);
      // Em telas estreitas, a barra de velocidade ocupa a terceira linha.
      // Comparar apenas a coordenada X reprova um layout corretamente separado em Y.
      const overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
      expect(overlap(geometry.metrics,geometry.speed)).toBe(false);
      expect(geometry.speed.top).toBeGreaterThanOrEqual(geometry.metrics.bottom-2);
      expect(geometry.clock.right).toBeLessThanOrEqual(geometry.metrics.right+1);
      expect(geometry.brand.right).toBeLessThanOrEqual(geometry.panels.left+1);
    }
    await page.screenshot({path:'screenshots/blueprint-hud-'+size.width+'x'+size.height+'.png',animations:'disabled'});
  }
});
