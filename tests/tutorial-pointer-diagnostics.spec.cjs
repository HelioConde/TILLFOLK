const {test,expect}=require("@playwright/test");
test("Diagnóstico da patinha no tutorial, carregamento e primeira missão",async({page})=>{
  const errors=[],failures=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("response",r=>{if(/tutorial-pointer|Catpaw pointing|game.js/.test(r.url())&&r.status()>=400)failures.push({url:r.url(),status:r.status()});});
  await page.setViewportSize({width:1600,height:900});
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await page.waitForTimeout(900);
  const info=await page.evaluate(()=>{
    const el=document.querySelector("#tillfolk-tutorial-paw");
    const img=el?.querySelector("img");
    const mission=document.querySelector("#mission-card");
    const b=el?.getBoundingClientRect(),style=el?getComputedStyle(el):null;
    return {moduleLoaded:typeof window.TillfolkTutorialPointer?.guide==="function",
      playing:document.body.classList.contains("play-session"),missionHidden:mission?.hidden,
      missionText:mission?.innerText?.slice(0,180),missionStep:mission?.dataset.missionStep,
      pointerExists:Boolean(el),pointerHidden:el?.hidden,text:el?.innerText,
      position:b?{x:b.x,y:b.y,width:b.width,height:b.height}:null,
      display:style?.display,opacity:style?.opacity,visibility:style?.visibility,zIndex:style?.zIndex,
      imageSrc:img?.currentSrc,imageComplete:img?.complete,imageSize:img?.naturalWidth};
  });
  console.log("TILLFOLK_POINTER_DIAGNOSTICS",JSON.stringify({info,errors,failures},null,2));
  await page.screenshot({path:"screenshots/tutorial-pointer-diagnostic.png",animations:"disabled"});
  expect(info.playing).toBe(true);
  expect(info.moduleLoaded).toBe(true);
  expect(info.missionHidden).toBe(false);
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
  expect(info.pointerHidden).toBe(false);
  expect(info.imageSize).toBeGreaterThan(0);
});

test("Tooltip de ferramenta ausente não quebra ao passar sobre terreno vazio",async({page})=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width:1366,height:768});
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await page.locator('[data-speed="0"]').click();

  // Toda fazenda nova não possui enxada. A célula escolhida não tem objeto:
  // antes da correção, o pointermove acessava object.kind com object === null.
  const empty=await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
    return state.plots.find(p=>
      !window.TillfolkWild.at(state.world,p.x,p.y)&&
      !window.TillfolkWild.waterAt(state.world,p.x,p.y)&&
      window.TillfolkWild.terrainAt(state.world,p.x,p.y).farmable);
  });
  expect(empty).toBeTruthy();

  const hover=async()=>page.locator("#world").evaluate((canvas,cell)=>{
    const rect=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent("pointermove",{
      bubbles:true,pointerType:"mouse",pointerId:57,
      clientX:rect.left+rect.width*(cell.x+.5)/(canvas.width/32),
      clientY:rect.top+rect.height*(cell.y+.5)/(canvas.height/32)
    }));
  },empty);

  await hover(); // ferramenta Universal: próxima etapa é arar
  await expect(page.locator("#tile-tooltip")).toContainText(/Terreno.*enxada/i);
  await page.locator("#orders-btn").click();
  await page.locator('[data-order-type="till"]').click();
  await hover(); // Ordem explícita: também não pode gerar TypeError
  await expect(page.locator("#tile-tooltip")).toContainText(/Terreno.*enxada/i);
  expect(errors).toEqual([]);
});
