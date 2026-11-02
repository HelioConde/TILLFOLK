"use strict";
const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";
const key="tillfolk-v01";
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
async function start(page){
  await page.goto(URL,{waitUntil:"load"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("#world")).toBeVisible();
}
async function stage(page,mutate){
  const s=await read(page);
  const cx=Math.floor(s.spawn.x),cy=Math.floor(s.spawn.y);
  const obstacles=new Set(s.world.objects.map(o=>o.x+","+o.y));
  const water=new Set(s.world.water.map(o=>o.x+","+o.y));
  const tile=s.plots.find(p=>Math.abs(p.x-cx)<8&&Math.abs(p.y-cy)<8&&
    !obstacles.has(p.x+","+p.y)&&!water.has(p.x+","+p.y)&&
    !s.workers.some(w=>Math.floor(w.x)===p.x&&Math.floor(w.y)===p.y));
  expect(tile).toBeTruthy();
  s.orders=[];s.minutes=360;s.sessionSpeed=1;s.colonyLife=s.colonyLife||{};
  s.colonyLife.lastAutoMinute=0;
  s.workers.forEach(w=>{w.neg=[];w.resting=false;w.atRest=false;w.energy=100;
    w.task=null;w.route=[];w.routeTask=null;w.haul=null;});
  mutate(s,tile);
  await page.addInitScript(()=>{
    const cached=sessionStorage.getItem("tillfolk-farm-e2e");
    if(cached!==null){localStorage.setItem("tillfolk-v01",cached);
      localStorage.setItem("tillfolk-session-mode","play");
      sessionStorage.removeItem("tillfolk-farm-e2e");}
  });
  await page.evaluate(data=>sessionStorage.setItem("tillfolk-farm-e2e",data),JSON.stringify(s));
  await page.reload({waitUntil:"load"});
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  await expect(page.locator("#world")).toBeVisible();
  return {x:tile.x,y:tile.y};
}
test("após primeira colheita a equipe semeia novamente canteiro autorizado, sem clique extra",async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await start(page);
  const tile=await stage(page,(s,p)=>{
    s.tutorial.stats.carry=1;s.colonyLife.farmTrained=false;
    s.colonyLife.autoFarm=false;s.colonyLife.autoFarmUserSet=false;
    p.tilled=true;p.farmManaged=undefined;p.seeded=false;p.produce=false;p.dirty=false;
    s.cropSeeds.potato=2;s.seeds=2;s.selectedCrop="potato";
  });
  await expect.poll(async()=>{
    const s=await read(page),p=s.plots.find(p=>p.x===tile.x&&p.y===tile.y);
    return p?.seeded||s.orders.some(o=>o.x===tile.x&&o.y===tile.y&&
      o.type==="sow"&&o.autoFarm===true);
  },{timeout:20000}).toBe(true);
  const after=await read(page);
  expect(after.colonyLife.autoFarm).toBe(true);
  expect(after.colonyLife.farmTrained).toBe(true);
  expect(after.plots.find(p=>p.x===tile.x&&p.y===tile.y).farmManaged).toBe(true);
  expect(after.seeds).toBeLessThanOrEqual(2);
  await page.screenshot({path:"screenshots/farm-automatic-1366x768.png",animations:"disabled"});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:"screenshots/farm-automatic-390x844.png",animations:"disabled"});
  expect(errors).toEqual([]);
});
test("não cultiva solo não autorizado e respeita automação desligada",async({page})=>{
  test.setTimeout(70000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await start(page);
  const tile=await stage(page,(s,p)=>{
    s.colonyLife.farmTrained=true;s.colonyLife.autoFarm=false;s.colonyLife.autoFarmUserSet=true;
    p.tilled=true;p.farmManaged=true;p.dirty=false;
    s.cropSeeds.potato=2;s.seeds=2;
  });
  await page.waitForTimeout(1500);
  const s=await read(page);
  expect(s.colonyLife.autoFarm).toBe(false);
  expect(s.orders.some(o=>o.x===tile.x&&o.y===tile.y&&o.autoFarm)).toBe(false);
  expect(s.plots.find(p=>p.x===tile.x&&p.y===tile.y).seeded).toBe(false);
  expect(errors).toEqual([]);
});
