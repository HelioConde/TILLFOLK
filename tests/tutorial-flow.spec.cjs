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
 // pagehide salva a sessão ativa; aplicar o fixture ANTES do script do jogo no reload.
 await page.addInitScript(()=>{
   const fixture=sessionStorage.getItem("__tutorialFinalFixture");
   if(fixture){
     localStorage.setItem("tillfolk-v01",fixture);
     sessionStorage.removeItem("__tutorialFinalFixture");
   }
 });
 await page.evaluate(()=>{
  const save=JSON.parse(localStorage.getItem("tillfolk-v01"));
  const steps=window.TillfolkMissions.STEPS;
  save.tutorial={active:true,step:steps.length-1,finished:false,version:4,
   stats:Object.fromEntries(steps.map((step,i)=>[step.key,i===steps.length-1?0:1]))};
  save.crafting.equipment.axe=true;
  const gate=save.world.boundary.gate;
  save.world.boundary.open=false;
  if(!save.world.objects.some(o=>o.kind==="gateLog"))
   save.world.objects.push({x:gate.x,y:gate.y,kind:"gateLog",variant:0,age:0});
  for(const w of save.workers){
   w.x=gate.x-1.5;w.y=gate.y+.5;w.neg=[];w.route=[];w.task=null;
   w.inventory=w.inventory||{tools:{},items:{}};w.inventory.tools.axe=true;
  }
  save.orders=[];
  sessionStorage.setItem("__tutorialFinalFixture",JSON.stringify(save));
 });
 await page.reload({waitUntil:"networkidle"});
 await continueIfMenuVisible(page);
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 12 / 12");
}
async function finishBuildingMission(page){
 await page.locator("#orders-btn").click();
 await page.locator('[data-order-type="clear"]').click();
 const gate=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem("tillfolk-v01"));return s.world.boundary.gate;
 });
 await page.locator("#world").evaluate((canvas,gate)=>{
  const rect=canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,
   clientX:rect.left+(gate.x+.5)/80*rect.width,
   clientY:rect.top+(gate.y+.5)/50*rect.height}));
 },gate);
 await page.locator('[data-speed="6"]').click();
 await expect(page.locator("#tutorial-done-dialog")).toBeVisible({timeout:55000});
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
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 1 / 12");
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
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 1 / 12");
 expect(errors).toEqual([]);
});

test("A última missão só termina ao cortar o tronco da passagem e respeita Continuar ou Menu",async({page})=>{
 test.setTimeout(140000);
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
