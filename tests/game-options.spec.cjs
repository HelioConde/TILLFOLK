const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";
async function enterGame(page){
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("#menu")).toBeHidden();
}
const savedSpeed=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")).sessionSpeed);

for(const viewport of [{width:1600,height:900},{width:390,height:844}]){
  test(`Pausa acessível e legível em ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await enterGame(page);
    await page.locator("#menu-btn").click();
    const dialog=page.locator("#game-options-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("#game-resume")).toBeFocused();
    await expect(page.locator('[data-speed="0"]')).toHaveAttribute("aria-pressed","true");
    const rect=await dialog.boundingBox(),close=await dialog.locator(".modal-x").boundingBox();
    expect(rect).toBeTruthy();expect(close).toBeTruthy();
    expect(close.x).toBeGreaterThan(rect.x+rect.width*.65);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width+1);
    expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height+1);
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:`screenshots/pausa-renovada-${viewport.width}x${viewport.height}.png`,animations:"disabled"});
    await page.locator("#game-open-settings").click();
    await expect(page.locator("#game-settings-panel")).toBeVisible();
    await expect(page.locator("#game-options-main")).toBeHidden();
    await page.locator("#game-settings-back").click();
    await expect(page.locator("#game-options-main")).toBeVisible();
    await page.locator("#game-resume").click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-speed="1"]')).toHaveAttribute("aria-pressed","true");
  });
}

test("estoque e mapa abertos pela pausa não retomam a simulação antes de voltar",async({page})=>{
  await enterGame(page);
  await page.locator('[data-speed="3"]').click();
  await page.locator("#menu-btn").click();
  expect(await savedSpeed(page)).toBe(3);
  await page.locator("#game-open-stock").click();
  await expect(page.locator("#game-stock-dialog")).toBeVisible();
  await expect(page.locator("#game-options-dialog")).toBeHidden();
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute("aria-pressed","true");
  await page.locator("#game-stock-dialog .modal-x").click();
  await expect(page.locator("#game-options-dialog")).toBeVisible();
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute("aria-pressed","true");
  await page.locator("#game-open-map").click();
  await expect(page.locator("#full-map-dialog")).toBeVisible();
  await page.locator("#full-map-close").click();
  await expect(page.locator("#game-options-dialog")).toBeVisible();
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute("aria-pressed","true");
  await page.locator("#game-return-title").click();
  await expect(page.locator("#menu")).toBeVisible();
  expect(await savedSpeed(page)).toBe(3);
  await page.locator("#continue").click();
  await expect(page.locator('[data-speed="3"]')).toHaveAttribute("aria-pressed","true");
});

test("clicar em região do mapa a partir da pausa volta ao jogo e à velocidade original",async({page})=>{
  await enterGame(page);
  await page.locator("#menu-btn").click();
  await page.locator("#game-open-map").click();
  await expect(page.locator("#full-map-dialog")).toBeVisible();
  await page.locator("#full-map-canvas").click({position:{x:40,y:40}});
  await expect(page.locator("#full-map-dialog")).toBeHidden();
  await expect(page.locator("#game-options-dialog")).toBeHidden();
  await expect(page.locator('[data-speed="1"]')).toHaveAttribute("aria-pressed","true");
});
