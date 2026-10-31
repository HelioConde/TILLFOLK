# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tutorial-paw.spec.cjs >> A primeira área arada fica afastada da Work Station quando há solo livre
- Location: tests\tutorial-paw.spec.cjs:301:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#mission-chapter')
Expected: "MISSÃO 5 / 11"
Received: "MISSÃO 1 / 11"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('#mission-chapter') with timeout 5000ms
  - waiting for locator('#mission-chapter')
    13 × locator resolved to <span id="mission-chapter" class="mission-chapter">MISSÃO 1 / 11</span>
       - unexpected value "MISSÃO 1 / 11"

```

```yaml
- text: MISSÃO 1 / 11
```

# Test source

```ts
  226 | test("A Work Station sugere o espaço central válido, mesmo com o colono longe",async({page})=>{
  227 |  await page.setViewportSize({width:1600,height:900});
  228 |  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  229 |  await page.locator("#new-game").click();
  230 |  await page.locator('[data-game-mode="relaxed"]').click();
  231 |  await page.locator("#starter-confirm").click();
  232 |  const result=await page.evaluate(()=>{
  233 |   const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
  234 |   const spawn=state.spawn;
  235 |   const nearCenter={x:spawn.x+1,y:spawn.y};
  236 |   const nearWorker={x:spawn.x+16,y:spawn.y};
  237 |   const candidates=[nearCenter,nearWorker];
  238 |   state.inventory.twigs=10;state.orders=[];state.plots=candidates;
  239 |   state.workers[0].x=nearWorker.x;state.workers[0].y=nearWorker.y;
  240 |   const canvas=document.querySelector("#world"),viewport=document.querySelector(".canvas-scroll").getBoundingClientRect();
  241 |   const guide=()=>window.TillfolkTutorialPointer.guide({playing:true,state,
  242 |    quest:window.TillfolkMissions.STEPS[0],selectedTool:"construir",
  243 |    buildLayer:"station",canvas,cameraZoom:1,
  244 |    stationSiteValid:(x,y)=>candidates.some(p=>p.x===x&&p.y===y)});
  245 |   guide();
  246 |   const paw=document.querySelector("#tillfolk-tutorial-paw");
  247 |   const suggested=paw.dataset.targetCell;
  248 |   const rect=canvas.getBoundingClientRect();
  249 |   const farX=rect.left+rect.width*(nearWorker.x+.5)/80;
  250 |   const previousPan=parseFloat(canvas.style.getPropertyValue("--pan-x"))||0;
  251 |   canvas.style.setProperty("--pan-x",`${previousPan+viewport.left+viewport.width/2-farX}px`);
  252 |   guide();
  253 |   return {nearCenter,nearWorker,suggested,afterPan:paw.dataset.targetCell||null,
  254 |    label:paw.querySelector(".tillfolk-paw-caption").textContent};
  255 |  });
  256 |  expect(result.suggested).toBe(`${result.nearCenter.x},${result.nearCenter.y}`);
  257 |  expect(result.suggested).not.toBe(`${result.nearWorker.x},${result.nearWorker.y}`);
  258 |  expect(result.afterPan).toBeNull();
  259 |  expect(result.label).toBe("Mostrar espaço livre perto do centro");
  260 | });
  261 | 
  262 | test("A missão da enxada aponta primeiro para a Work Station antes dos materiais",async({page},testInfo)=>{
  263 |  await page.setViewportSize({width:1600,height:900});
  264 |  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  265 |  await page.locator("#new-game").click();
  266 |  await page.locator('[data-game-mode="relaxed"]').click();
  267 |  await page.locator("#starter-confirm").click();
  268 |  await page.addInitScript(()=>{
  269 |   const raw=localStorage.getItem("tillfolk-v01");
  270 |   if(!raw)return;
  271 |   const state=JSON.parse(raw);
  272 |   state.tutorial.active=true;state.tutorial.finished=false;state.tutorial.step=1;state.tutorial.version=5;
  273 |   state.crafting.station={x:40,y:25};state.workstations=[{x:40,y:25}];
  274 |   state.inventory.twigs=10;state.inventory.grass=0;
  275 |   localStorage.setItem("tillfolk-v01",JSON.stringify(state));
  276 |  });
  277 |  await page.reload({waitUntil:"networkidle"});
  278 |  const paw=page.locator("#tillfolk-tutorial-paw");
  279 |  await page.screenshot({path:testInfo.outputPath("hoe-workstation-after-desktop.png"),animations:"disabled"});
  280 |  await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 2 / 11");
  281 |  await expect(paw).toContainText(/Clique na Work Station para fabricar a enxada/);
  282 |  await expect(paw).toHaveClass(/over-map/);
  283 |  await expect(paw).toHaveAttribute("data-target-cell","40,25");
  284 |  await page.setViewportSize({width:390,height:844});
  285 |  await expect(paw).toBeVisible();
  286 |  await expect(paw).toContainText(/Clique na Work Station para fabricar a enxada|Abra a Oficina para fabricar/);
  287 |  await page.screenshot({path:testInfo.outputPath("hoe-workstation-after-mobile.png"),animations:"disabled"});
  288 |  await page.setViewportSize({width:1600,height:900});
  289 |  const stationPoint=await page.locator("#world").evaluate(canvas=>{
  290 |   const rect=canvas.getBoundingClientRect();
  291 |   return {x:rect.left+rect.width*(40.5/80),y:rect.top+rect.height*(25.5/50)};
  292 |  });
  293 |  await page.mouse.click(stationPoint.x,stationPoint.y);
  294 |  await expect(page.locator("#workshop-dialog")).toBeVisible();
  295 |  await expect(paw).toContainText("Feche a Oficina e recolha fibras da grama");
  296 |  await page.locator("#workshop-dialog .modal-x").click();
  297 |  await expect(paw).toContainText("Recolha fibras da grama");
  298 |  await expect(paw).toHaveClass(/over-map/);
  299 | });
  300 | 
  301 | test("A primeira área arada fica afastada da Work Station quando há solo livre",async({page},testInfo)=>{
  302 |  await page.setViewportSize({width:1600,height:900});
  303 |  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  304 |  await page.locator("#new-game").click();
  305 |  await page.locator('[data-game-mode="relaxed"]').click();
  306 |  await page.locator("#starter-confirm").click();
  307 |  const setup=await page.evaluate(()=>{
  308 |   const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
  309 |   const station={x:state.spawn.x,y:state.spawn.y};
  310 |   const available=state.plots.filter(p=>!p.dirty&&!p.tilled&&!p.seeded&&
  311 |    !window.TillfolkWild.waterAt(state.world,p.x,p.y)&&
  312 |    !window.TillfolkWild.at(state.world,p.x,p.y)&&
  313 |    window.TillfolkWild.terrainAt(state.world,p.x,p.y).farmable);
  314 |   const nearest=available.map(p=>({p,d:Math.hypot(p.x-station.x,p.y-station.y)}))
  315 |    .sort((a,b)=>a.d-b.d)[0];
  316 |   const distant=available.find(p=>Math.hypot(p.x-station.x,p.y-station.y)>=4);
  317 |   if(!nearest||!distant)throw new Error("O mapa precisa ter solo livre perto e longe da Work Station.");
  318 |   state.tutorial.active=true;state.tutorial.finished=false;state.tutorial.step=4;state.tutorial.version=5;
  319 |   state.crafting.station=station;state.workstations=[station];
  320 |   state.workers.forEach(w=>{w.x=station.x;w.y=station.y;w.task=null;w.route=[];});
  321 |   localStorage.setItem("tillfolk-v01",JSON.stringify(state));
  322 |   return {station,nearestDistance:nearest.d};
  323 |  });
  324 |  await page.reload({waitUntil:"networkidle"});
  325 |  const paw=page.locator("#tillfolk-tutorial-paw");
> 326 |  await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO 5 / 11");
      |                                                 ^ Error: expect(locator).toHaveText(expected) failed
  327 |  await expect(paw).toContainText("Prepare este solo para plantar");
  328 |  await expect(paw).toHaveClass(/over-map/);
  329 |  const target=await paw.getAttribute("data-target-cell");
  330 |  expect(target).toBeTruthy();
  331 |  const [x,y]=target.split(",").map(Number);
  332 |  expect(Math.hypot(x-setup.station.x,y-setup.station.y)).toBeGreaterThanOrEqual(4);
  333 |  expect(setup.nearestDistance).toBeLessThan(4);
  334 |  await page.screenshot({path:testInfo.outputPath("till-plot-away-from-workstation.png"),animations:"disabled"});
  335 | });
  336 | 
```