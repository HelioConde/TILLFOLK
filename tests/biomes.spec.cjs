async function continueIfMenuVisible(page){
  if(await page.locator('#menu').isVisible())await page.locator('#continue').click();
  await expect(page.locator('#menu')).toBeHidden();
}
const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
async function newGame(page){
 await page.goto(BASE,{waitUntil:'networkidle'});
 await page.locator('#new-game').click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator('#starter-confirm').click();
 await expect(page.locator('body')).toHaveClass(/play-session/);
}
test('Mapa 80x50 determinístico com seis biomas, claro inicial e zoom 600%',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.setViewportSize({width:1600,height:900});await newGame(page);
 const world=await page.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
   const groups=Object.fromEntries(['g','f','s','i','w','p'].map(id=>[id,
     Array.from(s.world.biomeMap).filter(c=>c===id).length]));
   const biome=window.TillfolkWild;
   return {width:s.world.width,height:s.world.height,version:s.world.version,
     length:s.world.biomeMap.length,groups,canvas:[document.querySelector('#world').width,
       document.querySelector('#world').height],workers:s.workers.map(w=>[w.x,w.y]),
     spawn:s.spawn,terrain:biome.terrainAt(s.world,40,25).name,
     center:biome.biomeAt(s.world,40,25)};
 });
 expect(world.width).toBe(80);expect(world.height).toBe(50);
 expect(world.length).toBe(4000);expect(world.version).toBeGreaterThanOrEqual(2);
 expect(world.canvas).toEqual([2560,1600]);
 expect(world.center).toBe('g');
 for(const name of ['g','f','s','i','w','p'])
   expect(world.groups[name],name).toBeGreaterThan(40);
 expect(world.workers.every(([x,y])=>Math.abs(x-40)<4&&Math.abs(y-25)<4)).toBe(true);
 const map=await page.locator('#world').boundingBox();
 expect(map.width).toBeGreaterThan(1600*1.4);
 await page.screenshot({path:'screenshots/biomas-map-1600x900.png',animations:'disabled'});
 await page.locator('#minimap').click({position:{x:155,y:32}});
 await page.screenshot({path:'screenshots/biomas-gelo-minimapa-1600x900.png',animations:'disabled'});
 for(let i=0;i<9;i++)await page.locator('#zoom-in').click();
 await expect(page.locator('#zoom-value')).toHaveText('600%');
 await page.waitForTimeout(400);
 await page.screenshot({path:'screenshots/biomas-zoom-600-1600x900.png',animations:'disabled'});
 await page.locator('#zoom-reset').click();
 await expect(page.locator('#zoom-value')).toHaveText('100%');
 expect(errors).toEqual([]);
});
test('Mapa e legenda mantêm layout responsivo em desktop e celular',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.setViewportSize({width:1366,height:768});await newGame(page);
 await expect(page.locator('#minimap')).toBeVisible();
 await page.screenshot({path:'screenshots/biomas-1366x768.png',animations:'disabled'});
 await page.setViewportSize({width:1920,height:1080});
 await page.waitForTimeout(250);
 await page.screenshot({path:'screenshots/biomas-1920x1080.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(250);
 await expect(page.locator('#minimap')).toBeHidden();
 await page.screenshot({path:'screenshots/biomas-390x844.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
test('Salvar e continuar migra mapa legado sem apagar recursos, cultivos ou trabalhadores',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.setViewportSize({width:1366,height:768});await newGame(page);
 const original=await page.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
   s.world.objects=s.world.objects.filter(o=>o.x<28&&o.y<18);
   s.world.water=s.world.water.filter(p=>p.x<28&&p.y<18);
   s.world.version=1;delete s.world.biomeMap;delete s.world.width;delete s.world.height;
   s.plots=s.plots.filter(p=>p.x<28&&p.y<18);
   s.workers.forEach((w,i)=>{w.x=13.5+i;w.y=9.5;});
   s.inventory.wood=87;s.seeds=7;s.food=55;
   const plot=s.plots.find(p=>p.x===11&&p.y===8);
   plot.tilled=true;plot.selected=true;
   s.orders=[{id:'11-8:sow',type:'sow',x:11,y:8}];
   delete s.spawn;
   localStorage.setItem('tillfolk-v01',JSON.stringify(s));
   return {wood:s.inventory.wood,plots:s.plots.length,workers:s.workers.length};
 });
 await page.reload({waitUntil:'networkidle'});
 await continueIfMenuVisible(page);
 const result=await page.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
   return {wood:s.inventory.wood,seeds:s.seeds,food:s.food,
    workers:s.workers.map(w=>[w.x,w.y]),count:s.plots.length,
    worldWidth:s.world.width,worldHeight:s.world.height,biomeLength:s.world.biomeMap?.length,
    tilled:s.plots.find(p=>p.x===11&&p.y===8)?.tilled,
    order:s.orders.some(o=>o.id==='11-8:sow'),spawn:s.spawn};
 });
 expect(result.worldWidth).toBe(80);expect(result.worldHeight).toBe(50);
 expect(result.biomeLength).toBe(4000);
 expect(result.count).toBeGreaterThan(original.plots);
 expect(result.wood).toBe(87);expect(result.seeds).toBe(7);expect(result.food).toBe(55);
 expect(result.tilled).toBe(true);expect(result.order).toBe(true);
 expect(result.spawn.x).toBe(14);
 await page.screenshot({path:'screenshots/biomas-save-legado-migrado.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
test('Biomas: gelo/veneno bloqueiam agricultura e terreno possui custo de locomoção',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.setViewportSize({width:1366,height:768});await newGame(page);
 const data=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
  const world=window.TillfolkWild,orders=window.TillfolkOrders;
  return ['g','f','s','i','w','p'].map(id=>{
    const index=s.world.biomeMap.indexOf(id);
    const x=index%80,y=Math.floor(index/80),terrain=world.terrainAt(s.world,x,y);
    const plot={x,y,dirty:false,tilled:false,seeded:false,watered:false};
    const check=orders.status({x,y,type:'till'},plot,null,s);
    return {id,name:terrain.name,moveCost:terrain.moveCost,
     farmable:terrain.farmable,buildable:terrain.buildable,state:check.state};
  });
 });
 for(const row of data){expect(row.moveCost).toBeGreaterThanOrEqual(1);}
 for(const id of ['i','p']){const row=data.find(r=>r.id===id);
   expect(row.farmable).toBe(false);expect(row.state).toBe('blocked');}
 expect(data.find(r=>r.id==='g').state).toBe('ready');
 expect(data.find(r=>r.id==='w').moveCost).toBeGreaterThan(1.2);
 expect(errors).toEqual([]);
});
