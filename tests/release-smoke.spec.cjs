const {test,expect}=require("@playwright/test");
const fs=require("node:fs");

test("Release visual: menu, recrutamento, mundo, gestão e ordens em quatro telas",async({page})=>{
  test.setTimeout(90000);
  const errors=[],assets=[];
  page.on("pageerror",error=>errors.push(String(error)));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  page.on("response",response=>{
    if(response.status()>=400&&/\.(png|webp|jpg|svg|css|js)(\?|$)/i.test(response.url()))
      assets.push(response.status()+" "+response.url());
  });
  fs.mkdirSync("screenshots",{recursive:true});
  const views=[
    {width:1600,height:900},
    {width:1366,height:768},
    {width:1024,height:768},
    {width:390,height:844}
  ];
  for(const view of views){
    await page.setViewportSize(view);
    await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
    await expect(page.locator("#menu")).toBeVisible();
    await page.screenshot({path:`screenshots/release-menu-${view.width}x${view.height}.png`,animations:"disabled"});
    await page.locator("#new-game").click();
    await page.locator('[data-game-mode="relaxed"]').click();
    await expect(page.locator("#starter-dialog")).toBeVisible();
    await page.screenshot({path:`screenshots/release-recrutamento-${view.width}x${view.height}.png`,animations:"disabled"});
    await page.locator("#starter-confirm").click();
    await expect(page.locator("#world")).toBeVisible();
    await page.screenshot({path:`screenshots/release-fazenda-${view.width}x${view.height}.png`,animations:"disabled"});
    await page.locator("#open-tasks").click();
    await expect(page.locator("#farm-sidebar")).toBeVisible();
    await page.screenshot({path:`screenshots/release-gestao-${view.width}x${view.height}.png`,animations:"disabled"});
    await page.locator("#drawer-close").click();
    await page.locator("#orders-btn").click();
    await expect(page.locator("#orders-panel")).toBeVisible();
    await page.screenshot({path:`screenshots/release-ordens-${view.width}x${view.height}.png`,animations:"disabled"});
    await page.locator("#orders-btn").click();
    const extents=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth,
      worldWidth:document.querySelector("#world").width
    }));
    expect(extents.width).toBeLessThanOrEqual(extents.viewport+2);
    expect(extents.worldWidth).toBe(2560); // 80 tiles de 32 pixels
  }
  expect(assets).toEqual([]);
  expect(errors).toEqual([]);
});
