"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const URL="http://127.0.0.1:4173/";
test("colono limitado recebe seu único trabalho; generalista executa o outro",async({page})=>{
  test.setTimeout(45000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
  const points=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    const Wild=window.TillfolkWild;
    return s.plots.filter(p=>Math.abs(p.x-s.spawn.x)<=4&&Math.abs(p.y-s.spawn.y)<=4&&
      Wild.terrainAt(s.world,p.x,p.y).farmable&&!Wild.waterAt(s.world,p.x,p.y)&&
      !Wild.at(s.world,p.x,p.y)&&!p.tilled&&!p.seeded)
      .sort((a,b)=>Math.hypot(a.x-s.spawn.x,a.y-s.spawn.y)-
        Math.hypot(b.x-s.spawn.x,b.y-s.spawn.y)).slice(0,2).map(p=>({x:p.x,y:p.y}));
  });
  expect(points).toHaveLength(2);
  await reloadWithSave(page,s=>{
    const [clear,till]=points;
    s.workers[0].neg=[];s.workers[1].neg=["clear"];
    for(const w of s.workers){
      w.task=null;w.progress=0;w.route=[];w.routeTask=null;
      w.resting=false;w.atRest=false;
      w.inventory.tools.hoe=true;w.energy=100;
    }
    s.crafting.equipment.hoe=true;
    s.minutes=360;s.orders=[];
    s.world.objects=s.world.objects.filter(o=>
      !points.some(p=>p.x===o.x&&p.y===o.y));
    s.world.objects.push({kind:"grass",x:clear.x,y:clear.y,variant:0,age:0});
    s.orders=[
      {id:clear.x+"-"+clear.y+":clear",type:"clear",x:clear.x,y:clear.y,priority:1},
      {id:till.x+"-"+till.y+":till",type:"till",x:till.x,y:till.y,priority:9}
    ];
  });
  await expect(page.locator("body")).toHaveClass(/play-session/);
  await expect.poll(async()=>{
    return page.evaluate(()=>{
      window.TillfolkPrepareUpdate();
      return JSON.parse(localStorage.getItem("tillfolk-v01")).workers.map(w=>w.task?.split(":")[1]||null);
    });
  },{timeout:12000,intervals:[100,150,200]}).toEqual(["clear","till"]);
  await page.screenshot({path:"screenshots/alocacao-colonos-tarefas-validas.png",animations:"disabled"});
  expect(errors).toEqual([]);
});
