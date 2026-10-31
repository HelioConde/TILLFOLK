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
 // Ao recarregar, o jogo salva no pagehide. A fixture precisa ser aplicada
 // antes da leitura do save na nova página, não antes do unload da anterior.
 await page.addInitScript(()=>{
   const raw=localStorage.getItem("tillfolk-v01");
   if(!raw)return;
   const state=JSON.parse(raw);
   if(state.tutorial?.step!==0)return;
   state.inventory.twigs=10;
   localStorage.setItem("tillfolk-v01",JSON.stringify(state));
 });
 await page.reload({waitUntil:"networkidle"});
 await expect(paw).toContainText("Clique em Objetos");
 await page.locator('[data-tool="construir"]').click();
 await expect(paw).toContainText("Escolha Work Station");
 await page.locator('[data-build-layer="station"]').click();
 await expect(paw).toContainText(/Clique aqui para colocar a bancada|Mostrar objetivo no mapa/);
 expect(errors).toEqual([]);
});

test("A patinha acompanha as etapas agrícolas, saída e a Oficina sobre o diálogo",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width:1600,height:900});
 await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 const paw=page.locator("#tillfolk-tutorial-paw");
 await page.addInitScript(()=>{
   const requested=sessionStorage.getItem("tillfolk-paw-test-step");
   const raw=localStorage.getItem("tillfolk-v01");
   if(requested===null||!raw)return;
   const state=JSON.parse(raw);
   state.tutorial.active=true;state.tutorial.finished=false;state.tutorial.step=Number(requested);
   state.tutorial.version=4;
   // Controla os materiais para testar a indicação do botão da oficina.
   state.inventory.twigs=100;state.inventory.grass=100;state.inventory.wood=100;
   state.inventory.stone=100;
   state.firstHarvest=true;state.tutorial.stats.harvest=1;
   if(Number(requested)>=10){
     state.crafting.station={x:38,y:24};state.workstations=[{x:38,y:24}];
   }
   localStorage.setItem("tillfolk-v01",JSON.stringify(state));
 });
 for(const index of [4,5,7,8,9,11]){
   await page.evaluate(step=>sessionStorage.setItem("tillfolk-paw-test-step",String(step)),index);
   await page.reload({waitUntil:"networkidle"});
   await expect(page.locator("#mission-card")).toBeVisible();
   await expect(paw).toBeVisible();
   await expect(paw).not.toBeEmpty();
 }
 await page.evaluate(()=>sessionStorage.setItem("tillfolk-paw-test-step","10"));
 await page.reload({waitUntil:"networkidle"});
 await page.locator("#open-workshop").click();
 await expect(page.locator("#workshop-dialog")).toBeVisible();
 await expect(paw).toBeVisible();
 await expect(paw).toContainText(/Fabrique esta ferramenta|Reúna os materiais/);
 expect(await paw.evaluate(el=>el.parentElement?.id)).toBe("workshop-dialog");
 await page.screenshot({path:"screenshots/tutorial-maozinha-na-oficina.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
