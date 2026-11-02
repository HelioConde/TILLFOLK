const {test,expect}=require("@playwright/test");
const ROOT="http://127.0.0.1:4173/";
async function startFarm(page){
 await page.goto(ROOT,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("body")).toHaveClass(/play-session/);
}
test("novo jogo começa às 06h e mostra o amanhecer na HUD",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width:1366,height:768});
 await startFarm(page);
 await expect(page.locator("#clock")).toHaveText(/^06:0[0-5]$/);
 await expect(page.locator("#day-night-phase")).toHaveAttribute("data-phase","dawn");
 const runtime=await page.evaluate(()=>{
   const clock=window.TillfolkDayNight;
   return {minutes:clock.elapsedMinutes(1),start:clock.DAY_START,
     phase22:clock.phase(22*60),phase6:clock.phase(6*60)};
 });
 expect(runtime).toEqual({minutes:.75,start:360,phase22:"night",phase6:"dawn"});
 await page.screenshot({path:"screenshots/relogio-amanhecer-6h-desktop.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
test("painel de colonos mantém o despertar às 06h e sono de oito horas",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await startFarm(page);
 await page.locator("#colony-life-open").click();
 await expect(page.locator("#colony-life-dialog")).toBeVisible();
 const selector=page.locator("#colony-life-workers select[data-colony-shift]").first();
 await expect(selector).toHaveValue("day");
 await expect(selector.locator('option[value="day"]')).toContainText("22h–6h (8h)");
 await expect(selector.locator('option[value="night"]')).toContainText("8h–16h (8h)");
 await expect(selector.locator('option[value="flex"]')).toHaveCount(0);
 const sleeping=await page.evaluate(()=>{
   const life=window.TillfolkColonyLife;
   const w={energy:100,shift:"day",resting:false};
   return [life.sleepRequired(w,22*60),life.sleepRequired(w,5*60+59),
     life.sleepRequired(w,6*60),life.sleepRequired({...w,energy:1},12*60)];
 });
 expect(sleeping).toEqual([true,true,false,false]);
 await page.screenshot({path:"screenshots/turno-sono-8h-mobile.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
test("save antigo com turno flexível migra sem apagar colono",async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await startFarm(page);
 const migration=await page.evaluate(()=>{
   const old={day:9,workers:[{id:1,name:"Sim",shift:"flex",energy:30,morale:50,resting:false}],
     colonyLife:{researchLevel:0}};
   const before=JSON.parse(JSON.stringify(old));
   window.TillfolkColonyLife.normalize(old);
   return {before:before.workers[0].shift,after:old.workers[0].shift,
     id:old.workers[0].id,day:old.day};
 });
 expect(migration).toEqual({before:"flex",after:"day",id:1,day:9});
});
