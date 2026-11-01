const {test,expect}=require("@playwright/test");

async function startFarm(page){
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
}
for(const size of [{width:1600,height:900},{width:1366,height:768},{width:390,height:844}]){
  test("HUD essencial e detalhes acessíveis "+size.width+"x"+size.height,async({page})=>{
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.setViewportSize(size);await startFarm(page);
    const header=page.locator(".topbar"),metrics=page.locator(".metrics"),speed=page.locator(".topbar .speed-wrap");
    await expect(speed.locator("button[data-speed]")).toHaveCount(4);
    await expect(page.locator("#hud-stats-toggle")).toBeVisible();
    await expect(page.locator("#survival-population")).toBeAttached();
    await expect(page.locator("#survival-food")).toBeAttached();
    const coords=await page.evaluate(()=>{
      const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
      return {header:rect(".topbar"),metrics:rect(".metrics"),speed:rect(".speed-wrap"),
        panels:rect(".hud-panels"),menu:rect("#menu-btn"),width:innerWidth};
    });
    expect(coords.header.right).toBeLessThanOrEqual(coords.width+1);
    expect(coords.speed.right).toBeLessThanOrEqual(coords.width+1);
    expect(coords.panels.right).toBeLessThanOrEqual(coords.width+1);
    expect(coords.menu.right).toBeLessThanOrEqual(coords.width+1);
    if(size.width<=560){
      expect(coords.metrics.bottom).toBeLessThanOrEqual(coords.speed.top+2);
    }else{
      expect(coords.metrics.right).toBeLessThanOrEqual(coords.speed.left+2);
    }
    await page.locator("#hud-stats-toggle").click();
    await expect(page.locator("#hud-extra-stats")).toBeVisible();
    await expect(page.locator("#hud-stats-toggle")).toHaveAttribute("aria-expanded","true");
    await expect(page.locator("#survival-days-count")).toHaveCount(1);
    await expect(page.locator("#survival-consumption-count")).toHaveCount(1);
    await expect(page.locator("#colony-life-open")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#hud-extra-stats")).toBeHidden();
    await page.locator("#hud-stats-toggle").click();
    await page.locator("#open-stock").click();
    await expect(page.locator("#hud-extra-stats")).toBeHidden();
    await expect(page.locator("#game-stock-dialog")).toBeVisible();
    await page.locator("#game-stock-dialog").evaluate(el=>el.close());
    await page.screenshot({path:"screenshots/hud-foco-"+size.width+"x"+size.height+".png",animations:"disabled"});
    expect(errors).toEqual([]);
  });
}
