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
