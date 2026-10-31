"use strict";
const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";

test("o curso d'água permanece ligado à lagoa no mapa renderizado",async({page},testInfo)=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:1366,height:768});
 await page.goto(URL,{waitUntil:"networkidle"});
 await page.locator("#tutorial-start").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("#menu")).toBeHidden();
 await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem("__worldWaterFixture");
  if(fixture){
   localStorage.setItem("tillfolk-v01",fixture);
   sessionStorage.removeItem("__worldWaterFixture");
  }
 });
 await page.evaluate(()=>{
  const save=JSON.parse(localStorage.getItem("tillfolk-v01"));
  save.world=window.TillfolkWild.create(2170,80,50);
  save.world.water=save.world.water.filter(tile=>
   !(tile.x===50&&tile.y>=14&&tile.y<=19));
  save.orders.push({id:"order-on-dry-rib",type:"clear",x:50,y:16,priority:5});
  save.workers[0].x=41.5;save.workers[0].y=25.5;
  save.spawn={x:40,y:25};
  sessionStorage.setItem("__worldWaterFixture",JSON.stringify(save));
 });
 await page.reload({waitUntil:"networkidle"});
 if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
 await expect(page.locator("#menu")).toBeHidden();
 const water=await page.evaluate(()=>{
  const save=JSON.parse(localStorage.getItem("tillfolk-v01")),world=save.world;
  const directions=[[1,0],[-1,0],[0,1],[0,-1]];
  const remaining=new Set(world.water.map(tile=>tile.x+","+tile.y));
  let components=0;
  while(remaining.size){
   components++;
   const first=remaining.values().next().value,queue=[first];
   remaining.delete(first);
   for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i].split(",").map(Number);
    for(const [dx,dy] of directions){
     const next=(x+dx)+","+(y+dy);
     if(remaining.delete(next))queue.push(next);
    }
   }
  }
  return {count:world.water.length,components,workerTile:world.water.some(tile=>
   tile.x===Math.floor(save.workers[0].x)&&tile.y===Math.floor(save.workers[0].y)),
  dryRib:Array.from({length:6},(_,index)=>window.TillfolkWild.waterAt(world,50,14+index)),
   staleOrder:save.orders.some(order=>order.id==="order-on-dry-rib")};
 });
 expect(water.count).toBeGreaterThan(0);
 expect(water.components).toBe(1);
 expect(water.workerTile).toBe(false);
 expect(water.dryRib).toEqual([true,true,true,true,true,true]);
 expect(water.staleOrder).toBe(false);
 await page.screenshot({path:testInfo.outputPath("water-connected.png"),animations:"disabled"});
 expect(errors).toEqual([]);
});
