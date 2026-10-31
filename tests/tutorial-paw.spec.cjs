const {test,expect}=require("@playwright/test");
test("A patinha Sprout Lands conduz coleta, Objetos, Work Station e colocação",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width:1600,height:900});
 await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 const paw=page.locator("#tillfolk-tutorial-paw");
 await expect(paw).toBeVisible();
 await expect(paw.locator("img")).toHaveAttribute("src",/Catpaw pointing Mouse icon.png/);
 await expect(paw).toContainText(/Recolha este graveto|Mostrar objetivo no mapa/);
 await page.evaluate(()=>{
  const key="tillfolk-v01",state=JSON.parse(localStorage.getItem(key));
  state.inventory.twigs=window.TillfolkCrafting.STATION_COST;
  localStorage.setItem(key,JSON.stringify(state));
 });
 await page.reload({waitUntil:"networkidle"});
 await expect(paw).toContainText("Clique em Objetos");
 await page.locator('[data-tool="construir"]').click();
 await expect(paw).toContainText("Escolha Work Station");
 await page.locator('[data-build-layer="station"]').click();
 await expect(paw).toContainText(/Clique aqui para colocar a bancada|Mostrar objetivo no mapa/);
 expect(errors).toEqual([]);
});
