const {test,expect}=require("@playwright/test");
const BASE="http://127.0.0.1:4173/";
async function start(page){
  await page.goto(BASE,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("#world")).toBeVisible();
}
async function tapMap(page,x=40,y=25){
  await page.locator("#world").evaluate((canvas,pos)=>{
    const rect=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,
      clientX:rect.left+rect.width*(pos.x+.5)/80,
      clientY:rect.top+rect.height*(pos.y+.5)/50}));
  },{x,y});
}
test("Objetos: botão do HUD alterna o painel e toque no mapa o recolhe",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await start(page);
  const objects=page.locator("#construction-panel");
  const button=page.locator('[data-tool="construir"]');
  await expect(page.locator("#build-exit")).toHaveCount(0);
  await button.click();await expect(objects).toBeVisible();
  await button.click();await expect(objects).toBeHidden();
  await button.click();await expect(objects).toBeVisible();
  await page.locator('[data-build-layer="station"]').click();
  await expect(objects).toBeVisible(); // selecionar o objeto não deve fechar antes de posicionar
  await tapMap(page);
  await expect(objects).toBeHidden();
  await button.click();await expect(objects).toBeVisible();
  await page.locator('[data-tool="inspecionar"]').click();
  await expect(objects).toBeHidden();
  expect(errors).toEqual([]);
});
test("Ordens fecha ao clicar no mapa, no HUD ou ao abrir Objetos",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await start(page);
  const orders=page.locator("#orders-panel");
  const toggle=page.locator("#orders-btn");
  await toggle.click();
  await expect(orders).toBeVisible();
  await tapMap(page);
  await expect(orders).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  await toggle.click();
  await page.locator('[data-tool="construir"]').click();
  await expect(orders).toBeHidden();
  await expect(page.locator("#construction-panel")).toBeVisible();
  await toggle.click();
  await expect(page.locator("#construction-panel")).toBeHidden();
  await expect(orders).toBeVisible();
  await page.locator('[data-tool="universal"]').click();
  await expect(orders).toBeHidden();
  await toggle.click();
  await page.locator('[data-speed="3"]').click();
  await expect(orders).toBeHidden();
  expect(errors).toEqual([]);
});
