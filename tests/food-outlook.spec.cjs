const {test,expect}=require("@playwright/test");
async function startFarm(page){
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
}
test("estoque mostra autonomia sem confundir histórico e comida disponível",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await startFarm(page);
  await page.locator("#open-stock").click();
  await expect(page.locator("#food-outlook")).toContainText("Fazenda tranquila");
  await expect(page.locator("#crop-stock-grid")).toContainText("alimentos disponíveis");
  await expect(page.locator("#crop-stock-grid")).toContainText("colhidos no histórico");
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(data.food).toBeGreaterThan(0);
  expect(data.foodLedger.generic).toBe(data.food);
  await page.screenshot({path:"screenshots/prognostico-comida-desktop.png",animations:"disabled"});
  expect(errors).toEqual([]);
});
test("save legado não transforma histórico colhido em estoque para sementes",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await startFarm(page);
  await page.addInitScript(()=>{
    if(sessionStorage.getItem("food-ledger-fixture"))return;
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    if(!s)return;
    s.cropProduce.tomato=90;
    s.food=5;
    delete s.foodLedger;
    const ws={x:Math.floor(s.spawn.x)+2,y:Math.floor(s.spawn.y)+2};
    s.crafting.station=ws;s.workstations=[ws];
    localStorage.setItem("tillfolk-v01",JSON.stringify(s));
    sessionStorage.setItem("food-ledger-fixture","1");
  });
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator("body")).toHaveClass(/play-session/);
  await page.locator("#open-stock").click();
  await expect(page.locator("#crop-stock-grid")).toContainText("90 colhidos no histórico");
  await expect(page.locator("#crop-stock-grid")).toContainText("0 alimentos disponíveis");
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(save.food).toBe(5);
  expect(save.foodLedger.generic).toBe(5);
  expect(Object.values(save.foodLedger.stock).reduce((a,b)=>a+b,0)).toBe(0);
  await page.screenshot({path:"screenshots/estoque-save-antigo-mobile.png",animations:"disabled"});
  await page.locator("#game-stock-dialog .modal-x").click();
  await page.locator('[data-tool="construir"]').click();
  await page.locator("#open-workshop").click();
  await expect(page.locator('[data-craft-crop="tomato"]')).toBeDisabled();
  expect(errors).toEqual([]);
});
