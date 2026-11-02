"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const BASE="http://127.0.0.1:4173/";
const snap=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));

async function continueIfMenuVisible(page){
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  await expect(page.locator("#menu")).toBeHidden();
}
async function start(page){
  await page.goto(BASE,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("#world")).toBeVisible();
}
async function tile(page,x,y,type="click"){
  await page.locator("#world").evaluate((canvas,p)=>{
    const r=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent(p.type,{
      bubbles:true,cancelable:true,button:p.type==="contextmenu"?2:0,
      clientX:r.left+(p.x+.5)*r.width/(canvas.width/32),
      clientY:r.top+(p.y+.5)*r.height/(canvas.height/32)
    }));
  },{x,y,type});
}
async function selectOrder(page,type){
  if(type==="buildHome"){
    await page.locator('[data-tool="construir"]').click();
    await page.locator('[data-build-layer="home"]').click();
    return;
  }
  await page.locator("#orders-btn").click();
  await page.locator('[data-order-type="'+type+'"]').click();
}
async function freeSite(page,size=1){
  return page.evaluate(size=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    const cx=Math.floor(s.spawn.x),cy=Math.floor(s.spawn.y);
    const objects=new Set(s.world.objects.map(o=>o.x+","+o.y));
    const water=new Set(s.world.water.map(o=>o.x+","+o.y));
    const plots=new Map(s.plots.map(p=>[p.x+","+p.y,p]));
    for(let radius=2;radius<=18;radius++){
      for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
        let good=true;
        for(let dy=0;dy<size&&good;dy++)for(let dx=0;dx<size;dx++){
          const tx=x+dx,ty=y+dy,p=plots.get(tx+","+ty);
          const terrain=window.TillfolkWild.terrainAt(s.world,tx,ty);
          if(!p||!terrain||(size===2?!terrain.buildable:!terrain.farmable)||
             p.tilled||p.seeded||p.produce||p.dirty||p.selected||
             objects.has(tx+","+ty)||water.has(tx+","+ty)||
             s.workers.some(w=>Math.floor(w.x)===tx&&Math.floor(w.y)===ty)||
             s.animals.some(a=>Math.floor(a.x)===tx&&Math.floor(a.y)===ty)){
            good=false;break;
          }
        }
        if(good)return {x,y};
      }
    }
    return null;
  },size);
}
async function reloadScenario(page,mutate){
  const staged=await reloadWithSave(page,async s=>{
    s.orders=[];
    s.minutes=360;
    for(const w of s.workers){
      w.neg=[];w.task=null;w.haul=null;w.progress=0;w.route=[];w.routeTask=null;
      w.resting=false;w.atRest=false;w.energy=100;
    }
    await mutate(s);
  });
  await continueIfMenuVisible(page);
  return staged;
}

test("A colônia começa sem rebanho, mas com fauna selvagem, lagoa e recursos não mágicos",async({page})=>{
  await start(page);
  const s=await snap(page);
  expect(s.seeds).toBe(0);
  expect(s.water).toBe(0);
  expect(s.inventory.manure).toBe(0);
  expect(s.world.water.length).toBeGreaterThan(0);
  expect(s.animals.filter(a=>!a.wild)).toEqual([]);
  expect(s.animals.filter(a=>a.wild).length).toBeGreaterThan(0);
  expect(s.homes).toEqual([]);
  await expect(page.locator('[data-order-type="collectManure"]')).toBeHidden();
  await expect(page.locator('[data-order-type="collectWater"]')).toHaveCount(0);
  expect(await page.evaluate(()=>window.TillfolkOrders.TYPES.includes("collectWater"))).toBe(true);
  await expect(page.locator('[data-build-layer="home"]')).toHaveCount(1);
  await page.screenshot({path:"screenshots/colonia-recursos-1600x900.png",animations:"disabled"});
});

test("A ordem explícita de coleta de água exige caminhar até a lagoa",async({page})=>{
  test.setTimeout(90000);
  await start(page);
  const initial=await snap(page);
  const pond=[...initial.world.water].sort((a,b)=>
    Math.abs(a.x-initial.spawn.x)+Math.abs(a.y-initial.spawn.y)-
    Math.abs(b.x-initial.spawn.x)-Math.abs(b.y-initial.spawn.y))[0];
  expect(pond).toBeTruthy();
  await reloadScenario(page,s=>{
    s.water=0;
    s.orders=[{id:pond.x+"-"+pond.y+":collectWater",type:"collectWater",x:pond.x,y:pond.y}];
  });
  expect((await snap(page)).orders.some(o=>o.type==="collectWater")).toBe(true);
  expect((await snap(page)).water).toBe(0);
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>(await snap(page)).water,{timeout:65000,intervals:[300,600]})
    .toBeGreaterThan(0);
  expect((await snap(page)).water).toBe(4);
  expect((await snap(page)).orders.some(o=>o.type==="collectWater")).toBe(false);
});

test("Fertilização continua bloqueada pela fauna selvagem e funciona com rebanho doméstico",async({page})=>{
  await start(page);
  const empty=await snap(page);
  expect(empty.animals.filter(a=>!a.wild)).toEqual([]);
  const noAnimal=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    return window.TillfolkOrders.status({type:"fertilize",x:96,y:60},
      {x:96,y:60,tilled:true,fertilized:false,seeded:false,dirty:false},null,s);
  });
  expect(noAnimal.state).toBe("blocked");
  const place=await freeSite(page);
  await reloadScenario(page,s=>{
    s.animals.push({id:3001,kind:"cow",x:place.x+.5,y:place.y+.5,manure:1,
      timer:0,placedByPlayer:true,wild:false});
  });
  const saved=await snap(page);
  expect(saved.animals.filter(a=>!a.wild)).toHaveLength(1);
  await expect(page.locator('[data-order-type="collectManure"]')).toBeVisible();
  await selectOrder(page,"collectManure");
  await tile(page,place.x,place.y);
  expect((await snap(page)).orders.some(o=>o.type==="collectManure")).toBe(true);
  const checked=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    const plot={x:96,y:60,tilled:true,fertilized:false,seeded:false,dirty:false};
    const active=window.TillfolkOrders.status({type:"fertilize",x:96,y:60},plot,null,s);
    const depleted=structuredClone(s);depleted.animals.forEach(a=>a.manure=0);
    const blocked=window.TillfolkOrders.status({type:"fertilize",x:96,y:60},plot,null,depleted);
    depleted.inventory.manure=1;
    const stocked=window.TillfolkOrders.status({type:"fertilize",x:96,y:60},plot,null,depleted);
    return {active,blocked,stocked};
  });
  expect(checked.active.state).toBe("ready");
  expect(checked.blocked.state).toBe("blocked");
  expect(checked.stocked.state).toBe("ready");
});

test("Moradia dá vagas reais: recrutar só com uma terceira cabana e comida",async({page})=>{
  await start(page);
  const plot=await freeSite(page,2);expect(plot).not.toBeNull();
  await selectOrder(page,"buildHome");
  await tile(page,plot.x,plot.y);
  expect((await snap(page)).orders.some(o=>o.type==="buildHome")).toBe(true);
  expect((await snap(page)).homes).toHaveLength(0);
  await page.locator("#open-workers").click();
  await page.locator("#hire-btn").click();
  await expect(page.locator("#housing-status")).toContainText("Construa mais 3 casa");
  await expect(page.locator('[data-hire="0"]')).toBeDisabled();
  await page.locator("#hire-dialog .modal-x").click();
  const initial=await snap(page),cx=Math.floor(initial.spawn.x),cy=Math.floor(initial.spawn.y);
  await reloadScenario(page,s=>{
    s.homes=[{x:cx+4,y:cy+4,residentId:null,legacy:false},
      {x:cx+7,y:cy+4,residentId:null,legacy:false}];
  });
  await page.locator("#open-workers").click();await page.locator("#hire-btn").click();
  await expect(page.locator("#housing-status")).toContainText("Construa mais 1 casa");
  await expect(page.locator('[data-hire="0"]')).toBeDisabled();
  await page.locator("#hire-dialog .modal-x").click();
  await reloadScenario(page,s=>{
    s.homes.push({x:cx+10,y:cy+4,residentId:null,legacy:false});
    s.food=100;s.foodLedger=s.foodLedger||{};
    s.foodLedger.generic=100;s.foodLedger.stock={};
  });
  await page.locator("#open-workers").click();await page.locator("#hire-btn").click();
  await expect(page.locator("#housing-status")).toContainText("1 vaga(s) livre(s)");
  await expect(page.locator('[data-hire="0"]')).toBeEnabled();
  await page.locator('[data-hire="0"]').click();
  const state=await snap(page);
  expect(state.workers).toHaveLength(3);
  expect(state.homes).toHaveLength(3);
  expect(new Set(state.homes.map(h=>h.residentId)).size).toBe(3);
});

test("Regar sem água exige deslocamento real à lagoa e retorna à plantação",async({page})=>{
  test.setTimeout(110000);
  await start(page);
  const site=await freeSite(page);expect(site).not.toBeNull();
  await reloadScenario(page,s=>{
    const p=s.plots.find(p=>p.x===site.x&&p.y===site.y);
    p.tilled=true;p.seeded=true;p.watered=false;
    s.water=0;
    s.crafting.equipment.wateringCan=true;
    s.workers[0].inventory.tools.wateringCan=true;
    s.orders=[{id:site.x+"-"+site.y+":water",type:"water",x:site.x,y:site.y}];
  });
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>{
    const s=await snap(page);
    return s.journal.some(x=>x.includes("encheu o balde na lagoa"));
  },{timeout:60000,intervals:[400,900]}).toBe(true);
  await expect.poll(async()=>{
    const s=await snap(page);
    return s.plots.find(p=>p.x===site.x&&p.y===site.y).watered;
  },{timeout:85000,intervals:[400,900]}).toBe(true);
  const s=await snap(page);
  expect(s.water).toBe(0);
  expect(s.orders.some(o=>o.type==="water")).toBe(false);
  await page.screenshot({path:"screenshots/colonia-rega-apos-coleta.png",animations:"disabled"});
});

test("Fertilização busca esterco do animal doméstico, sem inventar recursos",async({page})=>{
  test.setTimeout(100000);
  await start(page);
  const plot=await freeSite(page);expect(plot).not.toBeNull();
  await reloadScenario(page,s=>{
    const p=s.plots.find(p=>p.x===plot.x&&p.y===plot.y);
    p.tilled=true;p.fertilized=false;
    s.inventory.manure=0;
    s.animals.push({id:3002,kind:"cow",x:plot.x+1.5,y:plot.y+1.5,manure:1,
      timer:0,placedByPlayer:true,wild:false});
    s.orders=[{id:plot.x+"-"+plot.y+":fertilize",type:"fertilize",x:plot.x,y:plot.y}];
  });
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>{
    const s=await snap(page);
    return s.plots.find(p=>p.x===plot.x&&p.y===plot.y).fertilized;
  },{timeout:75000,intervals:[500,900]}).toBe(true);
  const s=await snap(page);
  expect(s.animals.find(a=>a.id===3002).manure).toBe(0);
  expect(s.orders.some(o=>o.type==="fertilize")).toBe(false);
});

test("Cabana precisa de entregas físicas e trabalho, nunca nasce ao clicar",async({page})=>{
  test.setTimeout(110000);
  await start(page);
  const plot=await freeSite(page,2);expect(plot).not.toBeNull();
  await reloadScenario(page,s=>{s.inventory.wood=15;});
  await selectOrder(page,"buildHome");
  await tile(page,plot.x,plot.y);
  const before=await snap(page);
  expect(before.homes).toHaveLength(0);
  expect(before.orders.some(o=>o.type==="buildHome"&&o.x===plot.x&&o.y===plot.y)).toBe(true);
  await page.screenshot({path:"screenshots/colonia-casa-designada.png",animations:"disabled"});
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=> (await snap(page)).homes.length,
    {timeout:85000,intervals:[450,850]}).toBe(1);
  const after=await snap(page);
  expect(after.inventory.wood).toBe(before.inventory.wood-8);
  expect(after.homes[0].residentId).toBe(after.workers[0].id);
  expect(after.orders.some(o=>o.type==="buildHome")).toBe(false);
  await page.screenshot({path:"screenshots/colonia-cabana-concluida-1600x900.png",animations:"disabled"});
});

test("Save legado remove vaca inicial artificial sem apagar rebanho e fauna selvagem",async({page})=>{
  await start(page);
  const prior=await snap(page),wild=prior.animals.filter(a=>a.wild).length;
  await reloadScenario(page,s=>{
    s.animals=[
      ...s.animals.filter(a=>a.wild),
      {id:1,kind:"cow",x:16.5,y:9.5,manure:2,timer:30},
      {id:3,kind:"cow",x:s.spawn.x+3.5,y:s.spawn.y+1.5,
        manure:1,timer:0,placedByPlayer:true,wild:false}
    ];
    s.orders.push({id:"16-9:collectManure",type:"collectManure",x:16,y:9});
  });
  const migrated=await snap(page);
  expect(migrated.animals.filter(a=>a.wild)).toHaveLength(wild);
  expect(migrated.animals.filter(a=>!a.wild)).toHaveLength(1);
  expect(migrated.animals.find(a=>a.id===3)).toBeTruthy();
  expect(migrated.orders.some(o=>o.type==="collectManure"&&o.x===16&&o.y===9)).toBe(false);
});
