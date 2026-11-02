const {test,expect}=require("@playwright/test");
const ROOT="http://127.0.0.1:4173/";

async function openFarm(page){
  await page.goto(ROOT,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
}

test("19 culturas informam regas e meta de safra em 1366x768",async({page})=>{
  const errors=[];page.on("pageerror",err=>errors.push(err.message));
  await page.setViewportSize({width:1366,height:768});
  await openFarm(page);
  expect(await page.evaluate(()=>Boolean(window.TillfolkCropCare&&window.TillfolkFarmPlanning))).toBe(true);
  await page.locator("#open-stock").click();
  await expect(page.locator("#crop-stock-grid [data-select-crop]")).toHaveCount(19);
  await expect(page.locator('[data-select-crop="potato"]')).toContainText("1 rega(s) por safra");
  await expect(page.locator('[data-select-crop="pumpkin"]')).toContainText("3 rega(s) por safra");
  await expect(page.locator("#food-outlook")).toContainText("Meta orientativa:");
  await expect(page.locator("#food-outlook")).toContainText("colheita(s) de Batata/dia");
  await page.screenshot({path:"screenshots/agricultura-irrigacao-e-metas-1366x768.png",animations:"disabled"});
  expect(errors).toEqual([]);
});

test("colônia com 5 pessoas projeta mais alimento, mesmo no celular",async({page})=>{
  const errors=[];page.on("pageerror",err=>errors.push(err.message));
  await page.setViewportSize({width:390,height:844});
  await openFarm(page);
  const target=await page.evaluate(()=>{
    const planning=window.TillfolkFarmPlanning;
    const simulated={workers:Array.from({length:5},(_,id)=>({id}))};
    return planning.forecast(simulated,"pumpkin");
  });
  expect(target.people).toBe(5);
  expect(target.harvestsPerDay).toBe(2);
  expect(target.wateringsPerDay).toBe(6);
  await page.locator("#open-stock").click();
  await expect(page.locator('[data-select-crop="pumpkin"]')).toContainText("3 rega(s) por safra");
  const box=await page.locator("#game-stock-dialog").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(391);
  await page.screenshot({path:"screenshots/agricultura-irrigacao-mobile-390x844.png",animations:"disabled"});
  expect(errors).toEqual([]);
});

test("rega antiga preserva crescimento; nova espécie trava até a rega seguinte",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await openFarm(page);
  const proof=await page.evaluate(()=>{
    const Care=window.TillfolkCropCare;
    const old={crop:"pumpkin",seeded:true,watered:true,growth:.7};
    Care.normalize(old);
    const preserved={growth:old.growth,waterings:old.waterings};
    const current={seeded:false,watered:false,produce:false,growth:0};
    Care.sow(current,"pumpkin");
    Care.irrigate(current);Care.advance(current,1);
    return {preserved,stage:{growth:current.growth,watered:current.watered,waterings:current.waterings}};
  });
  expect(proof.preserved.growth).toBe(.7);
  expect(proof.preserved.waterings).toBe(3);
  expect(proof.stage.growth).toBeCloseTo(1/3);
  expect(proof.stage.watered).toBe(false);
  expect(proof.stage.waterings).toBe(1);
});
