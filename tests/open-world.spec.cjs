"use strict";
const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";

async function startFarm(page){
 await page.locator("#tutorial-start").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("#menu")).toBeHidden();
}

async function continueGame(page){
 if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
 await expect(page.locator("#menu")).toBeHidden();
}

test("mundo aberto remove o anel novo e migra saves antigos em desktop e mobile",async({page},testInfo)=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:1366,height:768});
 await page.goto(URL,{waitUntil:"networkidle"});
 await startFarm(page);
 const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 expect(initial.world.boundary).toBeUndefined();
 expect(initial.world.objects.some(object=>["ridge","gateLog"].includes(object.kind))).toBe(false);
 await page.screenshot({path:testInfo.outputPath("open-world-desktop.png"),animations:"disabled"});

 await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem("__openWorldLegacyFixture");
  if(fixture){
   localStorage.setItem("tillfolk-v01",fixture);
   sessionStorage.removeItem("__openWorldLegacyFixture");
  }
 });
 await page.evaluate(()=>{
  const save=JSON.parse(localStorage.getItem("tillfolk-v01"));
  const world=save.world,region=window.TillfolkWild.valleyBounds(world.width,world.height);
  world.objects=world.objects.filter(object=>!window.TillfolkWild.ringTile(region,object.x,object.y));
  world.water=world.water.filter(tile=>!window.TillfolkWild.ringTile(region,tile.x,tile.y));
  const original=window.TillfolkBiomes.generate(world.seed,world.width,world.height);
  const cells=world.biomeMap.split("");
  for(let y=region.top+1;y<region.bottom;y++)for(let x=region.left+1;x<region.right;x++)
   cells[y*world.width+x]="g";
  world.biomeMap=cells.join("");
  world.boundary=region;
  for(let y=region.top;y<=region.bottom;y++)for(let x=region.left;x<=region.right;x++){
   if(window.TillfolkWild.ringTile(region,x,y))
    world.objects.push({x,y,kind:x===region.gate.x&&y===region.gate.y?"gateLog":"ridge",variant:0,age:0});
  }
  save.orders=[{id:"old-gate-order",type:"clear",x:region.gate.x,y:region.gate.y,priority:5}];
  sessionStorage.setItem("__openWorldLegacyFixture",JSON.stringify(save));
  sessionStorage.setItem("__openWorldExpectedBiomeMap",original);
 });
 await page.reload({waitUntil:"networkidle"});
 await continueGame(page);
 const migrated=await page.evaluate(()=>({
  save:JSON.parse(localStorage.getItem("tillfolk-v01")),
  expected:sessionStorage.getItem("__openWorldExpectedBiomeMap")
 }));
 expect(migrated.save.world.boundary).toBeUndefined();
 expect(migrated.save.world.objects.some(object=>["ridge","gateLog"].includes(object.kind))).toBe(false);
 expect(migrated.save.world.biomeMap).toBe(migrated.expected);
 expect(migrated.save.orders.some(order=>order.id==="old-gate-order")).toBe(false);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:testInfo.outputPath("open-world-mobile.png"),animations:"disabled"});
 expect(errors).toEqual([]);
});
