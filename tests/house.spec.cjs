const {test,expect}=require("@playwright/test");
const BASE="http://127.0.0.1:4173/";
async function newGame(page){
 await page.goto(BASE,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("#world")).toBeVisible();
}
async function clickTile(page,x,y){
 await page.locator("#world").evaluate((canvas,cell)=>{
  const b=canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,
    clientX:b.left+(cell.x+.5)*b.width/80,clientY:b.top+(cell.y+.5)*b.height/50}));
 },{x,y});
}
test("Objetos mostra somente Cabana e Work Station e permite planejar bancada",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:1600,height:900});await newGame(page);
 await page.locator('[data-tool="construir"]').click();
 await expect(page.locator("#construction-panel")).toBeVisible();
 await expect(page.locator('#construction-panel [data-build-layer]')).toHaveCount(2);
 await expect(page.locator('[data-build-layer="home"]')).toBeVisible();
 await expect(page.locator('[data-build-layer="station"]')).toBeVisible();
 for(const key of ["floor","walls","roof","field"])
  await expect(page.locator('[data-build-layer="'+key+'"]')).toHaveCount(0);
 await expect(page.locator("#build-undo")).toHaveCount(0);
 await page.locator('[data-build-layer="station"]').click();
 const cell=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem("tillfolk-v01")),w=window.TillfolkWild;
  return s.plots.filter(p=>p.x>=34&&p.x<=46&&p.y>=20&&p.y<=31&&
   w.terrainAt(s.world,p.x,p.y).buildable&&!w.waterAt(s.world,p.x,p.y)&&
   !w.at(s.world,p.x,p.y)&&!p.dirty&&!p.tilled&&!p.seeded&&!p.produce)
   .sort((a,b)=>Math.hypot(a.x-40,a.y-25)-Math.hypot(b.x-40,b.y-25))[0];
 });
 expect(cell).toBeTruthy();
 await clickTile(page,cell.x,cell.y);
 const orders=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")).orders);
 expect(orders.some(o=>o.type==="buildStation"&&o.x===cell.x&&o.y===cell.y)).toBe(true);
 await page.reload({waitUntil:"networkidle"});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")).orders);
 expect(saved.some(o=>o.type==="buildStation"&&o.x===cell.x&&o.y===cell.y)).toBe(true);
 await page.screenshot({path:"screenshots/objetos-cabana-workstation.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
test("Objetos em tela pequena e atalho B/Escape",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});await newGame(page);
 await page.keyboard.press("b");
 await expect(page.locator("#construction-panel")).toBeVisible();
 await expect(page.locator('#construction-panel [data-build-layer]')).toHaveCount(2);
 await page.locator('[data-build-layer="station"]').click();
 await expect(page.locator('[data-build-layer="station"]')).toHaveAttribute("aria-pressed","true");
 await page.screenshot({path:"screenshots/objetos-mobile.png",animations:"disabled"});
 await page.keyboard.press("Escape");
 await expect(page.locator("#construction-panel")).toBeHidden();
 expect(errors).toEqual([]);
});
