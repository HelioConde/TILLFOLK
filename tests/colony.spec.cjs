const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
const snap=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
async function start(page){
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#world')).toBeVisible();
}
async function selectOrder(page,type){
  await page.locator('#orders-btn').click();
  await page.locator('[data-order-type="'+type+'"]').click();
}
async function tile(page,x,y){
  await page.locator('#world').evaluate((canvas,p)=>{
    const r=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click',{
      bubbles:true,cancelable:true,
      clientX:r.left+(p.x+.5)*r.width/28,
      clientY:r.top+(p.y+.5)*r.height/18
    }));
  },{x,y});
}
test('A colônia começa com lagoa, vaca e recursos não mágicos',async({page})=>{
  await start(page);
  const s=await snap(page);
  expect(s.seeds).toBe(0);
  expect(s.water).toBe(0);
  expect(s.inventory.manure).toBe(0);
  expect(s.world.water.length).toBeGreaterThan(0);
  expect(s.animals).toHaveLength(1);
  expect(s.animals[0].kind).toBe('cow');
  expect(s.animals[0].manure).toBeGreaterThan(0);
  expect(s.homes).toEqual([]);
  await expect(page.locator('[data-order-type="collectWater"]')).toHaveCount(1);
  await expect(page.locator('[data-order-type="collectManure"]')).toHaveCount(1);
  await expect(page.locator('[data-order-type="buildHome"]')).toHaveCount(1);
  await page.screenshot({path:'screenshots/colonia-recursos-1600x900.png',animations:'disabled'});
});
test('Água só entra no estoque após trabalho na margem da lagoa',async({page})=>{
  test.setTimeout(45000);
  await start(page);
  const s=await snap(page);
  const pond=s.world.water.slice().sort((a,b)=>{
    const dist=o=>Math.abs(o.x-14)+Math.abs(o.y-9);
    return dist(a)-dist(b);
  })[0];
  await selectOrder(page,'collectWater');
  await tile(page,pond.x,pond.y);
  expect((await snap(page)).orders).toEqual([{id:pond.x+'-'+pond.y+':collectWater',type:'collectWater',x:pond.x,y:pond.y}]);
  expect((await snap(page)).water).toBe(0);
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=> (await snap(page)).water,{timeout:33000,intervals:[250,350,500]})
    .toBeGreaterThan(0);
  expect((await snap(page)).water).toBe(4);
  expect((await snap(page)).orders).toEqual([]);
});
test('Fertilização precisa de esterco e a vaca permite ordem de coleta',async({page})=>{
  await start(page);
  const initial=await snap(page);
  const cow=initial.animals[0];
  await selectOrder(page,'collectManure');
  await tile(page,Math.floor(cow.x),Math.floor(cow.y));
  const s=await snap(page);
  expect(s.orders.some(o=>o.type==='collectManure')).toBe(true);
  const before=await page.evaluate(()=>window.TillfolkOrders.status(
    {type:'fertilize',x:13,y:11},
    {x:13,y:11,tilled:true,fertilized:false,seeded:false,dirty:false},
    null,
    JSON.parse(localStorage.getItem('tillfolk-v01'))
  ));
  expect(before.state).toBe('blocked');
  expect(before.reason).toContain('esterco');
  const after=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.inventory.manure=1;
    return window.TillfolkOrders.status({type:'fertilize'},
      {tilled:true,fertilized:false,seeded:false,dirty:false},null,s);
  });
  expect(after.state).toBe('ready');
});
test('Casas de madeira são ordens e contratação exige três casas para dois colonos',async({page})=>{
  await start(page);
  let state=await snap(page);
  const obstacle=new Set(state.world.objects.map(o=>o.x+','+o.y));
  const water=new Set(state.world.water.map(o=>o.x+','+o.y));
  const tiles=[[0,0],[0,1],[1,0],[1,1]];
  let site;
  for(let y=2;y<14&&!site;y++)for(let x=2;x<24&&!site;x++){
    if(tiles.every(([dx,dy])=>!obstacle.has((x+dx)+','+(y+dy))&&
      !water.has((x+dx)+','+(y+dy))&&
      !state.animals.some(a=>Math.floor(a.x)===x+dx&&Math.floor(a.y)===y+dy)))site={x,y};
  }
  expect(site).toBeTruthy();
  await selectOrder(page,'buildHome');
  await tile(page,site.x,site.y);
  state=await snap(page);
  expect(state.orders.some(o=>o.type==='buildHome')).toBe(true);
  expect(state.homes).toHaveLength(0);
  await page.screenshot({path:'screenshots/colonia-casa-designada.png',animations:'disabled'});
  await page.locator('#open-workers').click();
  await page.locator('#hire-btn').click();
  await expect(page.locator('#housing-status')).toContainText('Construa mais 3 casa');
  await expect(page.locator('[data-hire="0"]')).toBeDisabled();
  await page.locator('#hire-dialog .modal-x').click();
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.homes=[{x:4,y:4,residentId:null,legacy:false},{x:7,y:4,residentId:null,legacy:false}];
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});await page.locator('#continue').click();
  await page.locator('#open-workers').click();await page.locator('#hire-btn').click();
  await expect(page.locator('#housing-status')).toContainText('Construa mais 1 casa');
  await expect(page.locator('[data-hire="0"]')).toBeDisabled();
  await page.locator('#hire-dialog .modal-x').click();
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.homes.push({x:10,y:4,residentId:null,legacy:false});
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});await page.locator('#continue').click();
  await page.locator('#open-workers').click();await page.locator('#hire-btn').click();
  await expect(page.locator('#housing-status')).toContainText('1 vaga(s) livre(s)');
  await expect(page.locator('[data-hire="0"]')).toBeEnabled();
  await page.locator('[data-hire="0"]').click();
  state=await snap(page);
  expect(state.workers).toHaveLength(3);
  expect(state.homes).toHaveLength(3);
  expect(new Set(state.homes.map(h=>h.residentId)).size).toBe(3);
});
