const {test,expect}=require("@playwright/test");
const ROOT="http://127.0.0.1:4173/";
async function start(page){
 await page.goto(ROOT,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("body")).toHaveClass(/play-session/);
 await page.locator("#menu-btn").click();
 await page.locator("#game-open-settings").click();
 await expect(page.locator("#game-backup-import")).toBeVisible();
}
test("backup baixado pode ser importado sem perder progresso",async({page})=>{
 test.setTimeout(60000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width:1600,height:900});
 await start(page);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 const pendingDownload=page.waitForEvent("download");
 await page.locator("#game-backup-download").click();
 const download=await pendingDownload;
 expect(download.suggestedFilename()).toMatch(/backup\.json$/);
 await expect(page.locator("#game-backup-status")).toContainText("Backup JSON solicitado");
 await page.screenshot({path:"screenshots/backup-partida-desktop.png",animations:"disabled"});
 const imported={...before,farmName:"Vale Importado QA",day:14,minutes:8*60};
 const payload={format:"tillfolk-save-backup/v1",game:"TILLFOLK",state:imported};
 page.on("dialog",dialog=>dialog.accept());
 // A importação faz reload voluntário. Aguardar navegação antes de acessar
 // localStorage evita o erro transitório "Execution context was destroyed".
 const navigated=page.waitForEvent("framenavigated",frame=>frame===page.mainFrame());
 await page.locator("#game-backup-import").setInputFiles({
  name:"tillfolk-qa.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(payload),"utf8")
 });
 await navigated;
 await page.waitForLoadState("networkidle");
 await expect.poll(async()=>page.evaluate(()=>
   JSON.parse(localStorage.getItem("tillfolk-v01"))?.farmName),
  {timeout:30000}).toBe("Vale Importado QA");
 await expect(page.locator("body")).toHaveClass(/play-session/);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 expect(after.day).toBe(14);
 expect(after.workers.map(w=>w.name)).toEqual(before.workers.map(w=>w.name));
 expect(after.world.seed).toBe(before.world.seed);
 expect(after.food).toBe(before.food);
 expect(errors).toEqual([]);
});
test("importação bloqueada até o jogador exportar backup da partida atual",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await start(page);
 const raw=await page.evaluate(()=>localStorage.getItem("tillfolk-v01"));
 await page.locator("#game-backup-import").setInputFiles({
  name:"novo.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify({format:"tillfolk-save-backup/v1",
    state:{...JSON.parse(raw),farmName:"Teste Substituição"}}),"utf8")
 });
 await expect(page.locator("#game-backup-status")).toContainText("Baixe o backup");
 await expect(page.locator("#game-backup-status")).toHaveAttribute("data-error","true");
 expect((await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")))).farmName)
  .not.toBe("Teste Substituição");
 await page.screenshot({path:"screenshots/backup-importacao-segura-mobile.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
