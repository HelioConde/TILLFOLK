const {test,expect}=require("@playwright/test");
const ROOT="http://127.0.0.1:4173/";
async function openGame(page){
 await page.goto(ROOT,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("#menu")).toBeHidden();
 await expect(page.locator("#world")).toBeVisible();
}
test("catálogo agrícola mostra 19 sprites e salva a cultura escolhida",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:1366,height:768});
 await openGame(page);
 await page.locator("#orders-btn").click();
 await page.locator("#open-crop-catalog").click();
 await expect(page.locator("#crop-catalog-grid button")).toHaveCount(19);
 await page.locator('[data-choose-crop="tomato"]').click();
 await expect(page.locator('[data-choose-crop="tomato"]')).toHaveAttribute("aria-pressed","true");
 await page.screenshot({path:"screenshots/crop-catalog-19-variedades.png",animations:"disabled"});
 const save=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 expect(save.selectedCrop).toBe("tomato");
 await page.locator("#crop-catalog-dialog .modal-x").click();
 expect(errors).toEqual([]);
});
test("work station exibe artes e receitas mesmo antes da construção",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 await openGame(page);
 await page.locator('[data-tool="construir"]').click();
 await page.locator("#open-workshop").click();
 await expect(page.locator("#workshop-tools button")).toHaveCount(await page.evaluate(()=>window.TillfolkCrafting.RECIPES.length));
 await expect(page.locator("#workshop-recipes button")).toHaveCount(19);
 await expect(page.locator('[data-craft-tool="axe"]')).toBeDisabled();
 await expect(page.locator("#workshop-status")).toContainText("30 gravetos");
 const actual=await page.locator(".farm-item-atlas").evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));
 expect(actual.width).toBeGreaterThan(0);
 await page.screenshot({path:"screenshots/workstation-mobile-390x844.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
test("receitas da Work Station produzem machado e sementes com consumo real",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await openGame(page);
 // Aplicar a fixture no próximo carregamento, após pagehide salvar o jogo atual.
 // Assim o teste não disputa com o autosave real do navegador.
 await page.addInitScript(()=>{
  if(sessionStorage.getItem("workshop-fixture-loaded"))return;
  const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
  if(!s)return;
  s.crafting.station={x:38,y:24};s.workstations=[{x:38,y:24}];
  s.inventory.twigs=50;s.inventory.grass=20;s.inventory.wood=20;s.inventory.stone=10;
  s.cropProduce.tomato=4;s.food=10;
  localStorage.setItem("tillfolk-v01",JSON.stringify(s));
  sessionStorage.setItem("workshop-fixture-loaded","1");
 });
 await page.reload({waitUntil:"networkidle"});
 await expect(page.locator("#menu")).toBeHidden();
 await page.locator('[data-tool="construir"]').click();
 await page.locator("#open-workshop").click();
 const loaded=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 expect(loaded.crafting?.station).toEqual({x:38,y:24});
 expect(loaded.inventory.twigs).toBe(50);
 expect(loaded.inventory.grass).toBe(20);
 await expect(page.locator('[data-craft-tool="axe"]')).toBeEnabled();
 await page.locator('[data-craft-tool="axe"]').click();
 await expect(page.locator('[data-craft-tool="axe"]')).toBeDisabled();
 await expect(page.locator('[data-craft-crop="tomato"]')).toBeEnabled();
 await page.locator('[data-craft-crop="tomato"]').click();
 const save=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 expect(save.crafting.equipment.axe).toBe(true);
 expect(save.inventory.twigs).toBe(42);
 expect(save.inventory.grass).toBe(17);
 expect(save.cropProduce.tomato).toBe(2);
 expect(save.cropSeeds.tomato).toBe(3);
 expect(save.food).toBe(8);
 await page.screenshot({path:"screenshots/workstation-com-receitas.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
