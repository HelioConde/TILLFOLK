async function continueIfMenuVisible(page){
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  await expect(page.locator("#menu")).toBeHidden();
}
const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";

async function visit(page,viewport={width:1366,height:768}){
 await page.setViewportSize(viewport);
 await page.goto(URL,{waitUntil:"networkidle"});
 await expect(page.locator("#menu")).toBeVisible();
}
async function startFarm(page,button="tutorial-start"){
 await page.locator("#"+button).click();
 await expect(page.locator("#mode-dialog")).toBeVisible();
 await page.locator('[data-game-mode="relaxed"]').click();
 await expect(page.locator("#starter-dialog")).toBeVisible();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("body")).toHaveClass(/play-session/);
 await expect(page.locator("#menu")).toBeHidden();
 await expect(page.locator("#mission-card")).toBeVisible();
}
async function jumpToFinalMission(page){
 await page.evaluate(()=>{
  const save=JSON.parse(localStorage.getItem("tillfolk-v01"));
  save.tutorial={active:true,step:7,finished:false,version:1,
   stats:{grass:1,seed:1,till:1,sow:1,water:1,harvest:1,carry:1,plan:0}};
  localStorage.setItem("tillfolk-v01",JSON.stringify(save));
 });
 await page.reload({waitUntil:"networkidle"});
 await continueIfMenuVisible(page);
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 11 / 11");
}
async function finishBuildingMission(page){
 await page.locator('[data-tool="construir"]').click();
 await page.locator('[data-build-layer="field"]').click();
 // Escolha um canteiro realmente válido do mundo, sem depender do mapa aleatório.
 const result=await page.evaluate(()=>{
  const save=JSON.parse(localStorage.getItem("tillfolk-v01"));
  const wild=window.TillfolkWild,orders=new Set(save.orders.map(o=>o.x+","+o.y));
  const p=save.plots.find(plot=>
    plot.x>1&&plot.y>1&&plot.x<79&&plot.y<49&&
    !plot.tilled&&!plot.seeded&&!plot.produce&&!plot.dirty&&
    !orders.has(plot.x+","+plot.y)&&!wild.at(save.world,plot.x,plot.y)&&
    !wild.waterAt(save.world,plot.x,plot.y)&&wild.terrainAt(save.world,plot.x,plot.y).farmable);
  if(!p)return "not-found";
  const canvas=document.querySelector("#world"),r=canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,
    clientX:r.left+(p.x+.5)/80*r.width,clientY:r.top+(p.y+.5)/50*r.height}));
  return "clicked";
 });
 expect(result).toBe("clicked");
 await expect(page.locator("#tutorial-done-dialog")).toBeVisible();
 await expect(page.locator("#mission-card")).toBeHidden();
}

test("Como jogar permanece um guia independente, sem substituir saves",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await visit(page);
 await expect(page.locator("#help-btn strong")).toHaveText("Como jogar");
 await expect(page.locator("#tutorial-start strong")).toHaveText("Tutorial");
 await page.locator("#help-btn").click();
 await expect(page.locator("#help-dialog")).toBeVisible();
 await expect(page.locator(".guide-art")).toHaveCount(6);
 for(let i=1;i<6;i++)await page.locator("#help-next").click();
 await expect(page.locator("#guide-counter")).toHaveText("6 de 6");
 await expect(page.locator("#help-close")).toBeVisible();
 await page.screenshot({path:"screenshots/como-jogar-final.png",animations:"disabled"});
 await page.locator("#help-close").click();
 await expect(page.locator("#menu")).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem("tillfolk-v01"))).toBeNull();
 expect(errors).toEqual([]);
});

test("Tutorial inicia no jogo: objetivos, ajuda ao passar mouse e localização",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await visit(page);
 await startFarm(page);
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 1 / 11");
 await expect(page.locator("#mission-count")).toHaveText("0 / 1");
 await expect(page.locator("#mission-help")).toBeHidden();
 await page.locator("#mission-card").hover();
 await expect(page.locator("#mission-help")).toBeVisible();
 await page.locator("#mission-locate").click();
 await expect(page.locator("#mission-card")).toBeVisible();
 await page.screenshot({path:"screenshots/tutorial-missao-desktop.png",animations:"disabled"});
 expect(errors).toEqual([]);
});

test("Nova Fazenda tem missões e Continuar preserva o progresso no celular",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await visit(page,{width:390,height:844});
 await startFarm(page,"new-game");
 await page.locator("#mission-details-toggle").click();
 await expect(page.locator("#mission-details-toggle")).toHaveAttribute("aria-expanded","true");
 await expect(page.locator("#mission-help")).toBeVisible();
 await page.screenshot({path:"screenshots/tutorial-missao-mobile.png",animations:"disabled"});
 await page.reload({waitUntil:"networkidle"});
 await expect(page.locator("#continue")).toBeEnabled();
 await continueIfMenuVisible(page);
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 1 / 11");
 expect(errors).toEqual([]);
});

test("A última missão abre escolhas e respeita Continuar ou Menu",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await visit(page);
 await startFarm(page);
 await jumpToFinalMission(page);
 await finishBuildingMission(page);
 await page.screenshot({path:"screenshots/tutorial-concluido-escolhas.png",animations:"disabled"});
 await page.locator("#tutorial-continue-game").click();
 await expect(page.locator("#tutorial-done-dialog")).toBeHidden();
 await expect(page.locator("#menu")).toBeHidden();
 await jumpToFinalMission(page);
 await finishBuildingMission(page);
 await page.locator("#tutorial-back-menu").click();
 await expect(page.locator("#menu")).toBeVisible();
 await expect(page.locator("#continue")).toBeEnabled();
 await continueIfMenuVisible(page);
 await expect(page.locator("#tutorial-done-dialog")).toBeHidden();
 await expect(page.locator("#mission-card")).toBeHidden();
 expect(errors).toEqual([]);
});
