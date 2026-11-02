const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";
async function begin(page){
 await page.goto(URL,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("#world")).toBeVisible();
}
test("IA usa módulo de pontuação sem criar tarefas nem alterar save",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width:1366,height:768});
 await begin(page);
 await page.locator('[data-speed="0"]').click();
 const data=await page.evaluate(()=>{
   const api=window.TillfolkTaskScoring;
   const before=localStorage.getItem("tillfolk-v01");
   const worker={id:1,x:10.5,y:10.5,energy:70,satiety:100,health:100};
   const jobs=[{id:"near",type:"clear",x:11,y:11},
     {id:"far",type:"clear",x:75,y:75}];
   const state={workers:[worker],food:8,priorities:{clear:5},orders:[]};
   const ranked=api.sort(jobs,worker,state,()=>1);
   return {top:ranked[0].id,jobs:jobs.map(x=>x.id),orders:state.orders.length,
     savedBefore:before,savedAfter:localStorage.getItem("tillfolk-v01")};
 });
 expect(data.top).toBe("near");
 expect(data.orders).toBe(0);
 expect(data.jobs).toEqual(["near","far"]);
 expect(data.savedAfter).toEqual(data.savedBefore);
 await page.screenshot({path:"screenshots/ia-distribuicao-desktop.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
test("fauna selvagem existe mas não destrava esterco no celular",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await begin(page);
 const result=await page.evaluate(()=>{
   const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
   const domestic=state.animals.filter(a=>!a.wild);
   const wild=state.animals.filter(a=>a.wild);
   const status=window.TillfolkOrders.status({type:"fertilize",x:13,y:11},
     {x:13,y:11,tilled:true,seeded:false,fertilized:false,dirty:false},null,state);
   return {wild:wild.length,domestic:domestic.length,status:status.state,reason:status.reason};
 });
 expect(result.wild).toBeGreaterThan(0);
 expect(result.domestic).toBe(0);
 expect(result.status).toBe("blocked");
 expect(result.reason).toMatch(/animais de criação/);
 await page.screenshot({path:"screenshots/fauna-selvagem-mobile.png",animations:"disabled"});
});
