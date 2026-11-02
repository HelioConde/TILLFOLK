const {test,expect}=require("@playwright/test");
const ROOT="http://127.0.0.1:4173/";
async function openGame(page){
 await page.goto(ROOT,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("body")).toHaveClass(/play-session/);
}
test("Estoque informa quando não há canteiros para regar",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:1366,height:768});
 await openGame(page);
 await page.locator("#open-stock").click();
 await expect(page.locator("#queue-dry-plots")).toBeDisabled();
 await expect(page.locator("#water-orders-info")).toContainText("Nenhum canteiro");
 await page.screenshot({path:"screenshots/irrigacao-lote-vazio-desktop.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
test("jogador ordena regas uma única vez e salva a fila sem gastar água",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 await openGame(page);
 await page.addInitScript(()=>{
  if(sessionStorage.getItem("irrigation-batch-fixture"))return;
  const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
  if(!s||!s.plots?.length)return;
  const x=Math.floor(s.spawn.x),y=Math.floor(s.spawn.y);
  const plot=s.plots.find(p=>p.x===x&&p.y===y);
  if(!plot)return;
  Object.assign(plot,{tilled:true,dirty:false,crop:"potato",seeded:true,watered:false,
    waterings:0,growth:0,produce:false});
  s.orders=[];
  s.water=4;
  for(const worker of s.workers){
   worker.neg=[];
   worker.inventory=worker.inventory||{tools:{},items:{}};
   worker.inventory.tools=worker.inventory.tools||{};
   worker.inventory.tools.wateringCan=true;
  }
  localStorage.setItem("tillfolk-v01",JSON.stringify(s));
  sessionStorage.setItem("irrigation-batch-fixture","1");
 });
 await page.reload({waitUntil:"networkidle"});
 await expect(page.locator("body")).toHaveClass(/play-session/);
 await page.locator('[data-speed="0"]').click();
 await page.locator("#open-stock").click();
 await expect(page.locator("#queue-dry-plots")).toBeEnabled();
 await expect(page.locator("#queue-dry-plots")).toContainText("1 canteiro(s)");
 await page.locator("#queue-dry-plots").click();
 await expect(page.locator("#queue-dry-plots")).toBeDisabled();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 expect(saved.orders.filter(o=>o.type==="water")).toHaveLength(1);
 expect(saved.water).toBe(4);
 await page.screenshot({path:"screenshots/irrigacao-lote-mobile-390x844.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
