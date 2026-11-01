const {test,expect}=require("@playwright/test");
async function expectPawAimsAtGuidePoint(paw){
 const alignment=await paw.evaluate(el=>{
  const image=el.querySelector("img"),rect=image.getBoundingClientRect();
  const width=image.offsetWidth,height=image.offsetHeight;
  const transform=getComputedStyle(image).transform;
  const matrix=transform==="none"?new DOMMatrixReadOnly():new DOMMatrixReadOnly(transform);
  const tipX=-3*width/16,tipY=-6.5*height/16;
  const fingerX=matrix.a*tipX+matrix.c*tipY;
  const fingerY=matrix.b*tipX+matrix.d*tipY;
  const dx=Number(el.dataset.aimX)-(rect.left+rect.width/2);
  const dy=Number(el.dataset.aimY)-(rect.top+rect.height/2);
  return (fingerX*dx+fingerY*dy)/(Math.hypot(fingerX,fingerY)*Math.hypot(dx,dy));
 });
 expect(alignment).toBeGreaterThan(.94);
}
async function expectPawTargetsElement(paw,selector){
 const target=await paw.evaluate((el,targetSelector)=>{
  const element=document.querySelector(targetSelector);
  const visual=element?.querySelector(".tool-glyph")||element;
  const box=visual.getBoundingClientRect();
  return {x:Number(el.dataset.aimX),y:Number(el.dataset.aimY),
   expectedX:box.left+box.width*.48,expectedY:box.top+box.height*.48};
 },selector);
 expect(target.x).toBeCloseTo(target.expectedX,0);
 expect(target.y).toBeCloseTo(target.expectedY,0);
}
test("A patinha Sprout Lands conduz coleta, Objetos, Work Station e colocação",async({page},testInfo)=>{
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
 const image=paw.locator("img");
 await page.screenshot({path:testInfo.outputPath("objects-pointer-after-desktop.png"),animations:"disabled"});
 await expect(paw).toHaveClass(/over-target/);
 await expectPawAimsAtGuidePoint(paw);
 await expectPawTargetsElement(paw,'[data-tool="construir"]');
 await page.setViewportSize({width:390,height:844});
 await expect(paw).toHaveClass(/over-target/);
 await expectPawAimsAtGuidePoint(paw);
 await page.screenshot({path:testInfo.outputPath("objects-pointer-after-mobile.png"),animations:"disabled"});
 await page.setViewportSize({width:1600,height:900});
 await page.locator('[data-tool="construir"]').click();
 await expect(paw).toContainText("Escolha Work Station");
 await expect(paw).toHaveClass(/over-target/);
 await expectPawAimsAtGuidePoint(paw);
 await page.locator('[data-build-layer="station"]').click();
 await expect(paw).toContainText(/Clique aqui para colocar a bancada|Mostrar objetivo no mapa/);
 await expect(paw).toHaveClass(/over-map/);
 await expectPawAimsAtGuidePoint(paw);
 expect(errors).toEqual([]);
});

test("A patinha acompanha as etapas agrícolas, saída e a Oficina sobre o diálogo",async({page})=>{
 // Onze recargas reais do jogo: o tempo total do teste não pode ficar no
 // padrão de 30 s, especialmente no runner sem cache de imagens.
 test.setTimeout(150000);
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
   state.tutorial.version=6;
   // Controla os materiais para testar a indicação do botão da oficina.
   state.inventory.twigs=100;state.inventory.gravel=100;state.inventory.grass=100;state.inventory.wood=100;
   state.inventory.stone=100;
   state.firstHarvest=true;state.tutorial.stats.harvest=1;
   if(Number(requested)>=10){
     state.crafting.station={x:38,y:24};state.workstations=[{x:38,y:24}];
   }
   localStorage.setItem("tillfolk-v01",JSON.stringify(state));
 });
 for(const index of Array.from({length:13},(_,index)=>index)){
   await page.evaluate(step=>sessionStorage.setItem("tillfolk-paw-test-step",String(step)),index);
   await page.reload({waitUntil:"domcontentloaded"});
   await expect(page.locator("#mission-card")).toBeVisible();
   await expect(paw).toBeVisible();
   await expect(paw).not.toBeEmpty();
   await expect(paw).toHaveClass(/over-map|over-target/);
   await expectPawAimsAtGuidePoint(paw);
 }
 await page.evaluate(()=>sessionStorage.setItem("tillfolk-paw-test-step","10"));
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator("#open-workshop").click();
 await expect(page.locator("#workshop-dialog")).toBeVisible();
 await expect(paw).toBeVisible();
 await expect(paw).toContainText(/Fabrique esta ferramenta|Reúna os materiais/);
 expect(await paw.evaluate(el=>el.parentElement?.id)).toBe("workshop-dialog");
 await expect(paw).toHaveClass(/over-target/);
 await expectPawAimsAtGuidePoint(paw);
 await page.screenshot({path:"screenshots/tutorial-maozinha-na-oficina.png",animations:"disabled"});
 expect(errors).toEqual([]);
});

test("A patinha aponta para o alvo e diminui junto com o zoom",async({page},testInfo)=>{
 await page.setViewportSize({width:1600,height:900});
 await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 const paw=page.locator("#tillfolk-tutorial-paw");
 const image=paw.locator("img");
 await expect(paw).toContainText("Recolha este graveto");
 await expect(paw).toHaveClass(/over-map/);
 const fullSize=await image.evaluate(el=>el.offsetWidth);
 const direction=await image.evaluate(el=>getComputedStyle(el).transform);
 expect(direction).not.toBe("none");
 await expectPawAimsAtGuidePoint(paw);
 await page.screenshot({path:testInfo.outputPath("paw-target-desktop.png"),animations:"disabled"});

 await page.locator("#zoom-out").click();
 await expect(page.locator("#zoom-value")).toHaveText("75%");
 await expect.poll(()=>paw.evaluate(el=>{
  const onMap=el.classList.contains("over-map");
  const base=parseFloat(getComputedStyle(el).getPropertyValue("--paw-base-size"))||44;
  return Math.abs(el.querySelector("img").offsetWidth-(onMap?base*.75:base))<.5;
 })).toBe(true);
 const zoomedOutSize=await image.evaluate(el=>el.offsetWidth);
 const zoomedOutOnMap=await paw.evaluate(el=>el.classList.contains("over-map"));
 const desktopBase=parseFloat(await paw.evaluate(el=>getComputedStyle(el).getPropertyValue("--paw-base-size")));
 expect(zoomedOutSize).toBeCloseTo(zoomedOutOnMap?desktopBase*.75:desktopBase,0);
 await page.screenshot({path:testInfo.outputPath("paw-zoom-out-desktop.png"),animations:"disabled"});

 await page.setViewportSize({width:390,height:844});
 await expect(paw).toBeVisible();
 await expect(paw).toHaveClass(/over-map|over-target/);
 await expect.poll(()=>paw.evaluate(el=>{
  const onMap=el.classList.contains("over-map"),width=el.querySelector("img").offsetWidth;
  const base=parseFloat(getComputedStyle(el).getPropertyValue("--paw-base-size"))||35;
  return Math.abs(width-(onMap?base*.75:base))<.5;
 })).toBe(true);
 const mobileSize=await image.evaluate(el=>el.offsetWidth);
 const mobileOnMap=await paw.evaluate(el=>el.classList.contains("over-map"));
 const mobileBase=parseFloat(await paw.evaluate(el=>getComputedStyle(el).getPropertyValue("--paw-base-size")));
 expect(mobileSize).toBeCloseTo(mobileOnMap?mobileBase*.75:mobileBase,0);
 await expectPawAimsAtGuidePoint(paw);
 await page.screenshot({path:testInfo.outputPath("paw-zoom-out-mobile.png"),animations:"disabled"});

 await page.setViewportSize({width:1600,height:900});
 for(let i=0;i<5;i++)await page.locator("#zoom-in").click();
 await expect(page.locator("#zoom-value")).toHaveText("200%");
 await expect.poll(()=>paw.evaluate(el=>{
  const onMap=el.classList.contains("over-map"),width=el.querySelector("img").offsetWidth;
  const base=parseFloat(getComputedStyle(el).getPropertyValue("--paw-base-size"))||44;
  return Math.abs(width-(onMap?base*2:base))<.5;
 })).toBe(true);
 const zoomedInSize=await image.evaluate(el=>el.offsetWidth);
 const zoomedInOnMap=await paw.evaluate(el=>el.classList.contains("over-map"));
 const zoomedInBase=parseFloat(await paw.evaluate(el=>getComputedStyle(el).getPropertyValue("--paw-base-size")));
 expect(zoomedInSize).toBeCloseTo(zoomedInOnMap?zoomedInBase*2:zoomedInBase,0);
 await page.screenshot({path:testInfo.outputPath("paw-zoom-in-desktop.png"),animations:"disabled"});
});

test("A coleta de gravetos prioriza o spawn e não troca para o objeto visível pela câmera",async({page})=>{
 await page.setViewportSize({width:1600,height:900});
 await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 const result=await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
  const spawn=state.spawn;
  const nearTwig={kind:"twig",x:spawn.x+1,y:spawn.y};
  const farTwig={kind:"twig",x:spawn.x+20,y:spawn.y};
  state.world.objects=[nearTwig,farTwig];
  state.inventory.twigs=0;state.orders=[];
  state.workers[0].x=farTwig.x;state.workers[0].y=farTwig.y;
  const canvas=document.querySelector("#world"),viewport=document.querySelector(".canvas-scroll").getBoundingClientRect();
  const guide=()=>window.TillfolkTutorialPointer.guide({playing:true,state,
   quest:window.TillfolkMissions.STEPS[0],selectedTool:"universal",
   buildLayer:"station",canvas,cameraZoom:1,stationSiteValid:()=>true});
  guide();
  const paw=document.querySelector("#tillfolk-tutorial-paw");
  const initialTarget=paw.dataset.targetCell;
  window.TillfolkTutorialPointer.guide({playing:true,state,
   quest:window.TillfolkMissions.STEPS[1],selectedTool:"universal",
   buildLayer:"station",canvas,cameraZoom:1,stationSiteValid:()=>true});
  const craftingTwigTarget=paw.dataset.targetCell;
  const mapPoint=cell=>{
   const rect=canvas.getBoundingClientRect();
   return {x:rect.left+rect.width*(cell.x+.5)/(canvas.width/32),y:rect.top+rect.height*(cell.y+.5)/(canvas.height/32)};
  };
  const farPoint=mapPoint(farTwig),previousPan=parseFloat(canvas.style.getPropertyValue("--pan-x"))||0;
  canvas.style.setProperty("--pan-x",`${previousPan+viewport.left+viewport.width/2-farPoint.x}px`);
  guide();
  const afterPanTarget=paw.dataset.targetCell||null;
  window.TillfolkTutorialPointer.guide({playing:true,state,
   quest:window.TillfolkMissions.STEPS[1],selectedTool:"universal",
   buildLayer:"station",canvas,cameraZoom:1,stationSiteValid:()=>true});
  return {spawn,nearTwig,farTwig,initialTarget,craftingTwigTarget,afterPanTarget,
   afterPanCraftingTarget:paw.dataset.targetCell||null,
   label:paw.querySelector(".tillfolk-paw-caption").textContent,
   farVisible:(()=>{const p=mapPoint(farTwig);return p.x>=viewport.left&&p.x<=viewport.right&&p.y>=viewport.top&&p.y<=viewport.bottom})()};
 });
 expect(result.initialTarget).toBe(`${result.nearTwig.x},${result.nearTwig.y}`);
 expect(result.craftingTwigTarget).toBe(`${result.nearTwig.x},${result.nearTwig.y}`);
 expect(result.farVisible).toBe(true);
 expect(result.afterPanTarget).toBeNull();
 expect(result.afterPanCraftingTarget).toBeNull();
 expect(result.label).toMatch(/Mostrar o graveto perto do início|Mostrar objetivo no mapa/);
});

test("A Work Station sugere o espaço central válido, mesmo com o colono longe",async({page})=>{
 await page.setViewportSize({width:1600,height:900});
 await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 const result=await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
  const spawn=state.spawn;
  const nearCenter={x:spawn.x+1,y:spawn.y};
  const nearWorker={x:spawn.x+16,y:spawn.y};
  const candidates=[nearCenter,nearWorker];
  state.inventory.twigs=10;state.orders=[];state.plots=candidates;
  state.workers[0].x=nearWorker.x;state.workers[0].y=nearWorker.y;
  const canvas=document.querySelector("#world"),viewport=document.querySelector(".canvas-scroll").getBoundingClientRect();
  const guide=()=>window.TillfolkTutorialPointer.guide({playing:true,state,
   quest:window.TillfolkMissions.STEPS[0],selectedTool:"construir",
   buildLayer:"station",canvas,cameraZoom:1,
   stationSiteValid:(x,y)=>candidates.some(p=>p.x===x&&p.y===y)});
  guide();
  const paw=document.querySelector("#tillfolk-tutorial-paw");
  const suggested=paw.dataset.targetCell;
  const rect=canvas.getBoundingClientRect();
  const farX=rect.left+rect.width*(nearWorker.x+.5)/(canvas.width/32);
  const previousPan=parseFloat(canvas.style.getPropertyValue("--pan-x"))||0;
  canvas.style.setProperty("--pan-x",`${previousPan+viewport.left+viewport.width/2-farX}px`);
  guide();
  // O deslocamento da câmera altera o bounding rect do canvas.
  // Medir novamente depois do pan, como o guia faz.
  const shiftedRect=canvas.getBoundingClientRect();
  const point={x:shiftedRect.left+shiftedRect.width*(nearCenter.x+.5)/(canvas.width/32),
   y:shiftedRect.top+shiftedRect.height*(nearCenter.y+.5)/(canvas.height/32)};
  const stillVisible=point.x>=viewport.left+24&&point.x<=viewport.right-24&&
   point.y>=viewport.top+24&&point.y<=viewport.bottom-25;
  return {nearCenter,nearWorker,suggested,afterPan:paw.dataset.targetCell||null,
   stillVisible,label:paw.querySelector(".tillfolk-paw-caption").textContent};
 });
 expect(result.suggested).toBe(`${result.nearCenter.x},${result.nearCenter.y}`);
 expect(result.suggested).not.toBe(`${result.nearWorker.x},${result.nearWorker.y}`);
 if(result.stillVisible){
   expect(result.afterPan).toBe(result.suggested);
   expect(result.label).toBe("Clique aqui para colocar a bancada");
 }else{
   expect(result.afterPan).toBeNull();
   expect(result.label).toBe("Mostrar espaço livre perto do centro");
 }
});

test("A missão da enxada aponta cascalho e Mostrar no mapa localiza a pedrinha",async({page},testInfo)=>{
 await page.setViewportSize({width:1600,height:900});
 await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await page.addInitScript(()=>{
   const raw=localStorage.getItem("tillfolk-v01");if(!raw)return;
   const state=JSON.parse(raw);
   state.tutorial.active=true;state.tutorial.finished=false;state.tutorial.step=1;
   state.tutorial.version=6;state.inventory.twigs=10;
   state.inventory.gravel=Number(sessionStorage.getItem("pointer-gravel-ready")||0);
   const origin=state.spawn||{x:96,y:60};
   const pebble=state.world.objects.find(o=>o.kind==="pebble"&&
     Math.hypot(o.x-origin.x,o.y-origin.y)<12);
   if(!pebble)throw new Error("O mapa inicial precisa conter cascalho para o tutorial");
   state.crafting.station={x:origin.x+2,y:origin.y+2};
   state.workstations=[{x:origin.x+2,y:origin.y+2}];
   localStorage.setItem("tillfolk-v01",JSON.stringify(state));
 });
 await page.reload({waitUntil:"networkidle"});
 const paw=page.locator("#tillfolk-tutorial-paw");
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 2 / 13");
 await expect(paw).toBeVisible();
 await expect(paw).toContainText(/Recolha este cascalho|Mostrar a pedrinha mais próxima/);
 const cell=await paw.getAttribute("data-target-cell");
 expect(cell).toBeTruthy();
 const mapTarget=await page.evaluate(cell=>{
   const [x,y]=cell.split(",").map(Number),canvas=document.querySelector("#world");
   const rect=canvas.getBoundingClientRect();
   return {x:rect.left+rect.width*(x+.5)/(canvas.width/32),
     y:rect.top+rect.height*(y+.5)/(canvas.height/32)};
 },cell);
 const aim=await paw.evaluate(el=>({x:Number(el.dataset.aimX),y:Number(el.dataset.aimY)}));
 expect(aim.x).toBeCloseTo(mapTarget.x,0);
 expect(aim.y).toBeCloseTo(mapTarget.y,0);
 await page.screenshot({path:testInfo.outputPath("hoe-gravel-pointer-desktop.png"),animations:"disabled"});
 await page.locator("#mission-locate").click();
 await expect(paw).toContainText("Recolha este cascalho");
 await expect(paw).toHaveAttribute("data-target-cell",cell);
 await page.evaluate(()=>sessionStorage.setItem("pointer-gravel-ready","3"));
 await page.reload({waitUntil:"networkidle"});
 await expect(paw).toContainText("Abra a Oficina para fabricar");
 await page.locator("#open-workshop").click();
 await expect(page.locator("#workshop-dialog")).toBeVisible();
 await expect(paw).toContainText("Fabrique esta ferramenta");
 await expectPawTargetsElement(paw,'[data-craft-tool="hoe"]');
});

test("A primeira área arada fica afastada da Work Station quando há solo livre",async({page},testInfo)=>{
 await page.setViewportSize({width:1600,height:900});
 await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 const setup=await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
  const station={x:state.spawn.x,y:state.spawn.y};
  const available=state.plots.filter(p=>!p.dirty&&!p.tilled&&!p.seeded&&
   !window.TillfolkWild.waterAt(state.world,p.x,p.y)&&
   !window.TillfolkWild.at(state.world,p.x,p.y)&&
   window.TillfolkWild.terrainAt(state.world,p.x,p.y).farmable);
  const nearest=available.map(p=>({p,d:Math.hypot(p.x-station.x,p.y-station.y)}))
   .sort((a,b)=>a.d-b.d)[0];
  const distant=available.find(p=>Math.hypot(p.x-station.x,p.y-station.y)>=4);
  if(!nearest||!distant)throw new Error("O mapa precisa ter solo livre perto e longe da Work Station.");
  state.tutorial.active=true;state.tutorial.finished=false;state.tutorial.step=4;state.tutorial.version=6;
  state.crafting.station=station;state.workstations=[station];
  state.workers.forEach(w=>{w.x=station.x;w.y=station.y;w.task=null;w.route=[];});
  sessionStorage.setItem("__tillfolkTillFixture",JSON.stringify(state));
  return {station,nearestDistance:nearest.d};
 });
 // pagehide grava a sessão antiga; a fixture precisa entrar no início do reload.
 await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem("__tillfolkTillFixture");
  if(!fixture)return;
  localStorage.setItem("tillfolk-v01",fixture);
  sessionStorage.removeItem("__tillfolkTillFixture");
 });
 await page.reload({waitUntil:"networkidle"});
 const paw=page.locator("#tillfolk-tutorial-paw");
 await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 5 / 13");
 await expect(paw).toContainText("Prepare este solo para plantar");
 await expect(paw).toHaveClass(/over-map/);
 const target=await paw.getAttribute("data-target-cell");
 expect(target).toBeTruthy();
 const [x,y]=target.split(",").map(Number);
 expect(Math.hypot(x-setup.station.x,y-setup.station.y)).toBeGreaterThanOrEqual(4);
 expect(setup.nearestDistance).toBeLessThan(4);
 await page.screenshot({path:testInfo.outputPath("till-plot-away-from-workstation.png"),animations:"disabled"});
});
