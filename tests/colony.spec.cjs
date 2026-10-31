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
      clientX:r.left+(p.x+.5)*r.width/(canvas.width/32),
      clientY:r.top+(p.y+.5)*r.height/(canvas.height/32)
    }));
  },{x,y});
}
test('A colônia começa sem animais, com lagoa e recursos não mágicos',async({page})=>{
  await start(page);
  const s=await snap(page);
  expect(s.seeds).toBe(0);
  expect(s.water).toBe(0);
  expect(s.inventory.manure).toBe(0);
  expect(s.world.water.length).toBeGreaterThan(0);
  expect(s.animals).toEqual([]);
  await expect(page.locator('[data-order-type="collectManure"]')).toBeHidden();
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
test('Fertilização fica bloqueada sem esterco e funciona quando animais forem introduzidos',async({page})=>{
  await start(page);
  const empty=await snap(page);
  expect(empty.animals).toEqual([]);
  const noAnimal=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    return window.TillfolkOrders.status(
      {type:'fertilize',x:13,y:11},
      {x:13,y:11,tilled:true,fertilized:false,seeded:false,dirty:false},
      null,s);
  });
  expect(noAnimal.state).toBe('blocked');
  // Um animal só pode surgir em uma fase posterior; simular esse desbloqueio no teste.
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.animals=[{id:2,kind:'cow',x:16.5,y:9.5,manure:1,timer:0,placedByPlayer:true}];
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  const initial=await snap(page);
  expect(initial.animals).toHaveLength(1);
  await expect(page.locator('[data-order-type="collectManure"]')).toBeAttached();
  const cow=initial.animals[0];
  await selectOrder(page,'collectManure');
  await tile(page,Math.floor(cow.x),Math.floor(cow.y));
  const s=await snap(page);
  expect(s.orders.some(o=>o.type==='collectManure')).toBe(true);
  const before=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.animals.forEach(a=>a.manure=0);
    return window.TillfolkOrders.status(
      {type:'fertilize',x:13,y:11},
      {x:13,y:11,tilled:true,fertilized:false,seeded:false,dirty:false},
      null,s);
  });
  const automatic=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    return window.TillfolkOrders.status({type:'fertilize'},
      {tilled:true,fertilized:false,seeded:false,dirty:false},null,s);
  });
  expect(automatic.state).toBe('ready');
  expect(automatic.reason).toContain('Buscar esterco');
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

test('Irrigação viaja à lagoa automaticamente e retorna ao canteiro',async({page})=>{
  test.setTimeout(60000);
  await start(page);
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    const p=s.plots.find(p=>p.x===13&&p.y===11);
    p.tilled=true;p.seeded=true;p.watered=false;
    s.workers[0].neg=[];
    s.water=0;
    s.orders=[{id:'13-11:water',type:'water',x:13,y:11}];
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>{
    const s=await snap(page);return s.journal.some(x=>x.includes('encheu o balde na lagoa'));
  },{timeout:24000,intervals:[250,500]}).toBe(true);
  await expect.poll(async()=>{
    const s=await snap(page);return s.plots.find(p=>p.x===13&&p.y===11).watered;
  },{timeout:36000,intervals:[300,600]}).toBe(true);
  const result=await snap(page);
  expect(result.water).toBe(0);
  expect(result.orders).toEqual([]);
  await page.screenshot({path:'screenshots/colonia-rega-apos-coleta.png',animations:'disabled'});
});
test('Fertilização busca esterco da vaca e entrega na plantação',async({page})=>{
  test.setTimeout(55000);
  await start(page);
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    const p=s.plots.find(p=>p.x===13&&p.y===11);
    p.tilled=true;p.fertilized=false;
    s.workers[0].neg=[];
    s.inventory.manure=0;
    // Animal é introduzido apenas neste cenário de fase posterior.
    s.animals=[{id:2,kind:'cow',x:16.5,y:9.5,manure:1,timer:0,placedByPlayer:true}];
    s.orders=[{id:'13-11:fertilize',type:'fertilize',x:13,y:11}];
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=> (await snap(page)).plots.find(p=>p.x===13&&p.y===11).fertilized,
    {timeout:35000,intervals:[300,600]}).toBe(true);
  const result=await snap(page);
  expect(result.animals[0].manure).toBe(0);
  expect(result.orders).toEqual([]);
});

test('Cabana é concluída por trabalhador com madeira, não ao clicar',async({page})=>{
  test.setTimeout(70000);
  await start(page);
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.workers[0].neg=[];localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  await selectOrder(page,'buildHome');
  await tile(page,12,11);
  const before=await snap(page);
  expect(before.homes).toHaveLength(0);
  expect(before.orders).toEqual([{id:'12-11:buildHome',type:'buildHome',x:12,y:11}]);
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>(await snap(page)).homes.length,{timeout:50000,intervals:[400,800]}).toBe(1);
  const after=await snap(page);
  expect(after.inventory.wood).toBe(before.inventory.wood-8);
  expect(after.homes[0].residentId).toBe(after.workers[0].id);
  expect(after.orders).toEqual([]);
  await page.screenshot({path:'screenshots/colonia-cabana-concluida-1600x900.png',animations:'disabled'});
});
test('Carregar save anterior remove vaca inicial automática, sem apagar animais futuros',async({page})=>{
  await start(page);
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.animals=[
      {id:1,kind:'cow',x:16.5,y:9.5,manure:2,timer:30},
      {id:3,kind:'cow',x:20.5,y:11.5,manure:1,timer:0,placedByPlayer:true}
    ];
    s.orders.push({id:'16-9:collectManure',type:'collectManure',x:16,y:9});
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  const migrated=await snap(page);
  expect(migrated.animals).toHaveLength(1);
  expect(migrated.animals[0].id).toBe(3);
  expect(migrated.orders.some(o=>o.type==='collectManure'&&o.x===16&&o.y===9)).toBe(false);
});
