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
async function freeCells(page){
 return page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
  const plots=new Set(s.plots.map(p=>p.x+','+p.y));
  const occupied=new Set(s.world.objects.map(o=>o.x+','+o.y));
  const waters=new Set(s.world.water.map(o=>o.x+','+o.y));
  for(let y=22;y<=28;y++)for(let x=36;x<=45;x++){
   const area=[[x,y],[x+1,y],[x,y+1],[x+1,y+1]];
   if(area.every(([a,b])=>plots.has(a+','+b)&&!occupied.has(a+','+b)&&!waters.has(a+','+b)&&
     window.TillfolkWild.terrainAt(s.world,a,b).farmable)&&
     !s.workers.some(w=>Math.floor(w.x)>=x&&Math.floor(w.x)<=x+1&&
       Math.floor(w.y)>=y&&Math.floor(w.y)<=y+1))return {x,y};
  }
  return null;
 });
}
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
 await page.locator('#build-undo').click();
 s=await save(page);
 expect(s.orders.some(o=>o.type==='buildHome'&&o.x===cell.x&&o.y===cell.y)).toBe(false);
 await mouseTile(page,cell.x,cell.y);
 await page.reload({waitUntil:'networkidle'});
 await continueIfMenuVisible(page);
 s=await save(page);
 expect(s.orders.some(o=>o.type==='buildHome'&&o.x===cell.x&&o.y===cell.y)).toBe(true);
 expect(errors).toEqual([]);
});
test('Plantação por arrasto no celular: várias células e desfazer sem danificar o save',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,390,844);
 await page.locator('[data-build-layer="field"]').click();
 const cell=await freeCells(page);expect(cell).not.toBeNull();
 const pos=await page.locator('#world').evaluate((el,{x,y})=>{
  const r=el.getBoundingClientRect();
  return [ [x,y],[x+1,y+1] ].map(([a,b])=>({
   x:r.left+r.width*(a+.5)/(el.width/32),
   y:r.top+r.height*(b+.5)/(el.height/32)
  }));
 },cell);
 // Mouse real em viewport mobile para testar a área pelo próprio motor;
 // o botão Área também permite executar o mesmo gesto com toque.
 await page.mouse.move(pos[0].x,pos[0].y);
 await page.mouse.down();
 await page.mouse.move(pos[1].x,pos[1].y,{steps:10});
 await page.mouse.up();
 let s=await save(page);
 expect(s.orders.filter(o=>['till','sow'].includes(o.type)).length).toBeGreaterThanOrEqual(4);
 await page.screenshot({path:'screenshots/blueprint-canteiros-mobile-390x844.png',animations:'disabled'});
 await page.locator('#build-undo').click();
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
      expect(geometry.metrics.right).toBeLessThanOrEqual(geometry.speed.left+2);
      expect(geometry.clock.right).toBeLessThanOrEqual(geometry.metrics.right+1);
      expect(geometry.brand.right).toBeLessThanOrEqual(geometry.panels.left+1);
    }
    await page.screenshot({path:'screenshots/blueprint-hud-'+size.width+'x'+size.height+'.png',animations:'disabled'});
  }
});
