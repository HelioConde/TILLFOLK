"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const {findFreeSite}=require("./helpers/world-sites.cjs");
const BASE="http://127.0.0.1:4173/";
const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
async function start(page){
  await page.goto(BASE,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
  await page.locator('[data-speed="0"]').click();
}
async function selectOrder(page,type){
  await page.locator("#orders-btn").click();
  await page.locator('[data-order-type="'+type+'"]').click();
}
async function point(page,x,y,type="click"){
  await page.locator("#world").evaluate((canvas,{x,y,type})=>{
    const r=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,
      button:type==="contextmenu"?2:0,
      clientX:r.left+(x+.5)*r.width/(canvas.width/32),
      clientY:r.top+(y+.5)*r.height/(canvas.height/32)}));
  },{x,y,type});
}
function nearestPond(state){
  const {x,y}=state.spawn;
  return state.world.water.slice().sort((a,b)=>
    (Math.abs(a.x-x)+Math.abs(a.y-y))-(Math.abs(b.x-x)+Math.abs(b.y-y)))[0];
}
test("mundo inicial possui fauna selvagem, mas não fornece água, esterco ou casas gratuitas",async({page})=>{
  await start(page);
  const s=await save(page);
  expect(s.seeds).toBe(0);
  expect(s.water).toBe(0);
  expect(s.inventory.manure).toBe(0);
  expect(s.world.water.length).toBeGreaterThan(0);
  expect(s.animals.filter(a=>a.wild).length).toBeGreaterThan(20);
  expect(s.animals.filter(a=>!a.wild)).toHaveLength(0);
  expect(s.homes).toEqual([]);
  await expect(page.locator('[data-order-type="collectWater"]')).toHaveCount(1);
  await expect(page.locator('[data-order-type="collectManure"]')).toHaveCount(1);
  await expect(page.locator('[data-build-layer="home"]')).toHaveCount(1);
});
test("coleta de água exige ordem manual e não abastece o estoque ao clicar",async({page})=>{
  await start(page);
  const before=await save(page),pond=nearestPond(before);
  expect(pond).toBeTruthy();
  await selectOrder(page,"collectWater");
  await point(page,pond.x,pond.y);
  const after=await save(page);
  expect(after.orders.some(o=>o.type==="collectWater"&&o.x===pond.x&&o.y===pond.y)).toBe(true);
  expect(after.water).toBe(0);
  const status=await page.evaluate(({x,y})=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    return window.TillfolkOrders.status({type:"collectWater",x,y},null,null,s);
  },pond);
  expect(status.state).toBe("ready");
});
test("fauna selvagem não disponibiliza esterco de animal doméstico",async({page})=>{
  await start(page);
  const before=await save(page);
  const blocked=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    return window.TillfolkOrders.status({type:"collectManure",x:96,y:60},null,null,s);
  });
  expect(blocked.state).toBe("blocked");
  const site=await findFreeSite(page,{kind:"home"});
  await reloadWithSave(page,s=>{
    s.animals.push({id:314,kind:"cow",x:site.x+.5,y:site.y+.5,manure:1,timer:0,placedByPlayer:true});
    s.sessionSpeed=0;
  });
  const after=await save(page);
  expect(after.animals.filter(a=>a.wild).length).toBe(before.animals.filter(a=>a.wild).length);
  expect(after.animals.filter(a=>!a.wild).map(a=>a.id)).toEqual([314]);
  const ready=await page.evaluate(({x,y})=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    return window.TillfolkOrders.status({type:"collectManure",x,y},null,null,s);
  },site);
  expect(ready.state).toBe("ready");
});
test("cabana é planejada por Objetos, não aparece concluída imediatamente e pode ser cancelada",async({page})=>{
  await start(page);
  const site=await findFreeSite(page,{width:2,height:2,kind:"both"});
  await page.locator('[data-tool="construir"]').click();
  await page.locator('[data-build-layer="home"]').click();
  await point(page,site.x,site.y);
  const staged=await save(page);
  expect(staged.orders.some(o=>o.type==="buildHome"&&o.x===site.x&&o.y===site.y)).toBe(true);
  expect(staged.homes).toHaveLength(0);
  await point(page,site.x+1,site.y+1,"contextmenu");
  const restored=await save(page);
  expect(restored.orders.some(o=>o.type==="buildHome"&&o.x===site.x&&o.y===site.y)).toBe(false);
  expect(restored.homes).toHaveLength(0);
});
test("save antigo remove vaca legada sem apagar fauna selvagem ou criação do jogador",async({page})=>{
  await start(page);
  const initial=await save(page),count=initial.animals.filter(a=>a.wild).length;
  await reloadWithSave(page,s=>{
    s.animals.push({id:1,kind:"cow",x:16.5,y:9.5,manure:2,timer:0});
    s.animals.push({id:3,kind:"cow",x:20.5,y:11.5,manure:1,timer:0,placedByPlayer:true});
    s.orders.push({id:"16-9:collectManure",type:"collectManure",x:16,y:9});
    s.sessionSpeed=0;
  });
  const migrated=await save(page);
  expect(migrated.animals.filter(a=>a.wild)).toHaveLength(count);
  expect(migrated.animals.filter(a=>!a.wild).map(a=>a.id)).toEqual([3]);
  expect(migrated.orders.some(o=>o.type==="collectManure"&&o.x===16&&o.y===9)).toBe(false);
});
test("necessidades e consumo respondem a uma população de 2, 3 e 5 colonos no navegador",async({page})=>{
  await start(page);
  const base=await save(page),a=base.workers[0];
  for(const n of [2,3,5]){
    const data=await page.evaluate(({n,example})=>{
      const workers=Array.from({length:n},(_,i)=>({...example,id:i+1,name:"Colono "+(i+1),health:100,satiety:100}));
      return window.TillfolkSurvival.getStats({workers,food:8,day:1,mode:"survival"});
    },{n,example:a});
    expect(data.population).toBe(n);
    expect(data.consumptionPerDay).toBe(n);
    expect(data.daysRemaining).toBeCloseTo(8/n);
  }
});
test("rega consome água somente com ferramenta, colono e ordem no canteiro",async({page})=>{
  test.setTimeout(65000);
  await start(page);
  const site=await findFreeSite(page,{kind:"field"});
  await reloadWithSave(page,s=>{
    const plot=s.plots.find(p=>p.x===site.x&&p.y===site.y);
    plot.tilled=true;plot.seeded=true;plot.crop="potato";plot.growth=0;
    plot.watered=false;plot.waterings=0;
    s.water=2;s.orders=[{id:site.x+"-"+site.y+":water",type:"water",x:site.x,y:site.y}];
    s.workers[0].neg=[];
    s.workers[0].inventory.tools.wateringCan=true;
    s.workers[0].x=site.x+.5;s.workers[0].y=site.y+1.5;
    s.sessionSpeed=0;
  });
  const staged=await save(page);
  const status=await page.evaluate(({x,y})=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    return window.TillfolkOrders.status({type:"water",x,y},s.plots.find(p=>p.x===x&&p.y===y),null,s);
  },site);
  expect(status.state).toBe("ready");
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>Boolean((await save(page)).plots.find(p=>p.x===site.x&&p.y===site.y).watered),
    {timeout:45000,intervals:[350,700]}).toBe(true);
  const completed=await save(page);
  expect(completed.water).toBe(staged.water-1);
  expect(completed.orders.some(o=>o.type==="water"&&o.x===site.x&&o.y===site.y)).toBe(false);
});
