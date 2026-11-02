const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");

async function startFarm(page){
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
}

test("estoque explica culturas sem disponibilizar sementes fictícias",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await startFarm(page);
  await page.locator("#open-stock").click();
  await expect(page.locator("#game-stock-dialog")).toBeVisible();
  await expect(page.locator("#crop-stock-grid [data-select-crop]")).toHaveCount(19);
  await expect(page.locator('[data-select-crop="wheat"]')).toBeDisabled();
  await expect(page.locator("#crop-choice-hint")).toContainText("Sem sementes");
  await page.screenshot({path:"screenshots/agricultura-escolha-sem-sementes.png",animations:"disabled"});
  expect(errors).toEqual([]);
});

test("jogador escolhe cultura existente e a seleção persiste no save",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await startFarm(page);
  // pagehide salva o estado da partida em andamento: aplicar fixture
  // no próximo boot, não antes do unload.
  await reloadWithSave(page,saved=>{
    saved.cropSeeds.potato=2;saved.cropSeeds.wheat=1;saved.seeds=3;
  });
  await expect(page.locator("body")).toHaveClass(/play-session/);
  await page.locator("#open-stock").click();
  await expect(page.locator('[data-select-crop="wheat"]')).toBeEnabled();
  await page.locator('[data-select-crop="wheat"]').click();
  await expect(page.locator('[data-select-crop="wheat"]')).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("#crop-choice-current")).toContainText("Trigo");
  const chosen=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")).selectedCrop);
  expect(chosen).toBe("wheat");
  await page.screenshot({path:"screenshots/agricultura-trigo-selecionado.png",animations:"disabled"});
  expect(errors).toEqual([]);
});

test("catálogo agrícola cabe no celular com foco visível",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startFarm(page);
  await page.locator("#open-stock").click();
  await expect(page.locator("#crop-stock-grid [data-select-crop]")).toHaveCount(19);
  const geometry=await page.evaluate(()=>{
    const dialog=document.querySelector("#game-stock-dialog").getBoundingClientRect();
    const grid=document.querySelector("#crop-stock-grid").getBoundingClientRect();
    return {dialogLeft:dialog.left,dialogRight:dialog.right,gridRight:grid.right,width:innerWidth};
  });
  expect(geometry.dialogLeft).toBeGreaterThanOrEqual(-1);
  expect(geometry.dialogRight).toBeLessThanOrEqual(geometry.width+1);
  expect(geometry.gridRight).toBeLessThanOrEqual(geometry.width+1);
  await page.screenshot({path:"screenshots/agricultura-catalogo-mobile.png",animations:"disabled"});
});
