const {test,expect}=require("@playwright/test");

test("Backup JSON: exportar e restaurar a mesma fazenda sem servidor",async({page})=>{
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#farm-name").fill("Vale Seguro");
  await page.locator("#starter-confirm").click();
  const previous=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(previous.farmName).toBe("Vale Seguro");
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#title-settings").click();
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.locator("#save-export").click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^tillfolk-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const fs=require("node:fs"),buffer=fs.readFileSync(await download.path());
  const envelope=JSON.parse(buffer.toString("utf8"));
  expect(envelope.format).toBe("tillfolk-save");
  expect(envelope.version).toBe(1);
  expect(envelope.state.farmName).toBe("Vale Seguro");
  await page.evaluate(()=>localStorage.removeItem("tillfolk-v01"));
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#save-import-file").setInputFiles({
    name:"backup.json",mimeType:"application/json",buffer
  });
  await expect(page.locator("#save-backup-status")).toContainText("Partida importada");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")).farmName)).toBe("Vale Seguro");
  await expect(page.locator("#continue")).toBeEnabled();
  await page.locator("#title-settings-dialog .modal-x").click();
  await page.locator("#continue").click();
  await expect(page.locator("#farm-title")).toHaveText("Vale Seguro");
});

test("Backup inválido é recusado sem sobrescrever save existente",async({page})=>{
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  const before=await page.evaluate(()=>localStorage.getItem("tillfolk-v01"));
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#title-settings").click();
  await page.locator("#save-import-file").setInputFiles({
    name:"corrompido.json",mimeType:"application/json",
    buffer:Buffer.from('{"format":"tillfolk-save","version":1,"state":{"workers":[]}}')
  });
  await expect(page.locator("#save-backup-status")).toContainText("Importação cancelada");
  expect(await page.evaluate(()=>localStorage.getItem("tillfolk-v01"))).toBe(before);
  await page.screenshot({path:"screenshots/configuracoes-backup-390x844.png",animations:"disabled"});
});

test("Backup: formato legado sem envelope continua importável",async({page})=>{
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  const json=await page.evaluate(()=>localStorage.getItem("tillfolk-v01"));
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#title-settings").click();
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#save-import-file").setInputFiles({
    name:"partida-antiga.json",mimeType:"application/json",buffer:Buffer.from(json)
  });
  await expect(page.locator("#save-backup-status")).toContainText("Partida importada");
});
