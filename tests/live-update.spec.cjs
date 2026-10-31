const {test,expect}=require("@playwright/test");
const ROOT="http://127.0.0.1:4173/";

test("nova publicação é detectada e atualiza o menu automaticamente",async({page})=>{
  let release="dev";
  await page.route("**/version.json*",route=>{
    const version=page.url().includes("_v=")?"dev":release;
    return route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify({version})});
  });
  await page.goto(ROOT,{waitUntil:"networkidle"});
  await expect(page.locator("#live-update-notice")).toBeHidden();
  release="release-abcdef123456";
  await page.evaluate(()=>window.TillfolkLiveUpdate.checkForUpdates());
  await expect(page.locator("#live-update-notice")).toBeVisible();
  await expect(page).toHaveURL(/_v=release-abcd/,{timeout:9000});
  await expect(page.locator("#live-update-notice")).toBeHidden();
});

test("uma partida em andamento não é reiniciada automaticamente e salva antes do clique",async({page})=>{
  let release="dev";
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/version.json*",route=>
    route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify({version:page.url().includes("_v=")?"dev":release})}));
  await page.goto(ROOT,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await page.locator('[data-speed="0"]').click();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(state).toBeTruthy();
  release="release-fedcba987654";
  await page.evaluate(()=>window.TillfolkLiveUpdate.checkForUpdates());
  await expect(page.locator("#live-update-notice")).toBeVisible();
  await page.waitForTimeout(3400);
  expect(page.url()).not.toContain("_v=");
  await page.locator("#live-update-reload").click();
  await expect(page).toHaveURL(/_v=release-fedc/,{timeout:12000});
  await expect(page.locator("body")).toHaveClass(/play-session/);
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(restored.farmName).toBe(state.farmName);
  expect(restored.tutorial.step).toBe(state.tutorial.step);
  expect(restored.day).toBe(state.day);
  expect(errors).toEqual([]);
});
