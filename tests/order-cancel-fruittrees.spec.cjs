const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
const snap=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
async function start(page,width=1366,height=768){
  await page.setViewportSize({width,height});
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('body')).toHaveClass(/play-session/);
}
const dispatchTile=(page,x,y,type='click')=>page.locator('#world').evaluate(
 (canvas,{x,y,type})=>{
   const rect=canvas.getBoundingClientRect();
   return canvas.dispatchEvent(new MouseEvent(type,{
     bubbles:true,cancelable:true,button:type==='contextmenu'?2:0,
     clientX:rect.left+rect.width*(x+.5)/(canvas.width/32),
     clientY:rect.top+rect.height*(y+.5)/(canvas.height/32)
   }));
 },{x,y,type});
async function freeCells(page,count=3){
 return page.evaluate(count=>{
   const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
   const cells=[];
   for(let y=24;y<29;y++)for(let x=37;x<44;x++){
     const p=s.plots.find(p=>p.x===x&&p.y===y);
     if(p&&!window.TillfolkWild.at(s.world,x,y)&&
        !window.TillfolkWild.waterAt(s.world,x,y)&&
        !s.orders.some(o=>o.x===x&&o.y===y))cells.push({x,y});
   }
   for(let i=0;i<cells.length-count+1;i++){
     const row=cells.slice(i,i+count);
     if(row.every((p,j)=>p.y===row[0].y&&p.x===row[0].x+j))return row;
   }
   return cells.slice(0,count);
 },count);
}
test('Clique direito cancela ordem e remove o destaque persistente, sem remover o cultivo',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page);
 const [{x,y}]=await freeCells(page);
 await dispatchTile(page,x,y);
 let s=await snap(page);
 expect(s.orders.some(o=>o.x===x&&o.y===y)).toBe(true);
 expect(s.plots.find(p=>p.x===x&&p.y===y).selected).toBe(true);
 await page.screenshot({path:'screenshots/ordem-antes-cancelar-direito-1366x768.png',animations:'disabled'});
 await dispatchTile(page,x,y,'contextmenu');
 s=await snap(page);
 expect(s.orders.some(o=>o.x===x&&o.y===y)).toBe(false);
 expect(s.plots.find(p=>p.x===x&&p.y===y).selected).toBe(false);
 await page.screenshot({path:'screenshots/ordem-depois-cancelar-direito-1366x768.png',animations:'disabled'});
 await dispatchTile(page,x,y);
 s=await snap(page);expect(s.orders).toHaveLength(1);
 await page.evaluate(({x,y})=>{
   const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
   s.plots.find(p=>p.x===x&&p.y===y).tilled=true;
   localStorage.setItem('tillfolk-v01',JSON.stringify(s));
 },{x,y});
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#continue').click();
 s=await snap(page);
 expect(s.orders.some(o=>o.x===x&&o.y===y)).toBe(false);
 expect(s.plots.find(p=>p.x===x&&p.y===y).selected).toBe(false);
 expect(s.plots.find(p=>p.x===x&&p.y===y).tilled).toBe(true);
 await page.screenshot({path:'screenshots/ordem-concluida-sem-marcacao-1366x768.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
test('Botão direito arrastado cancela área, sem alterar a ferramenta selecionada',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,1600,900);
 const cells=await freeCells(page,3);
 expect(cells).toHaveLength(3);
 expect(cells[0].y).toBe(cells[2].y);
 for(const {x,y} of cells)await dispatchTile(page,x,y);
 expect((await snap(page)).orders).toHaveLength(3);
 const at=await page.locator('#world').evaluate((canvas,cells)=>{
   const r=canvas.getBoundingClientRect();
   return cells.map(({x,y})=>({
     screenX:r.left+r.width*(x+.5)/(canvas.width/32),
     screenY:r.top+r.height*(y+.5)/(canvas.height/32)
   }));
 },cells);
 await page.mouse.move(at[0].screenX,at[0].screenY);
 await page.mouse.down({button:'right'});
 await page.mouse.move(at[2].screenX,at[2].screenY,{steps:7});
 await page.mouse.up({button:'right'});
 await expect.poll(async()=>(await snap(page)).orders.length,{timeout:3500}).toBe(0);
 const s=await snap(page);
 expect(cells.every(({x,y})=>!s.plots.find(p=>p.x===x&&p.y===y).selected)).toBe(true);
 await expect(page.locator('.tool.active[data-tool="universal"]')).toBeVisible();
 await page.screenshot({path:'screenshots/cancelamento-area-direito-1600x900.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
test('Árvores frutíferas não são geradas e saves legados são convertidos sem excluir madeira',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,1366,768);
 let s=await snap(page);
 const trees=s.world.objects.filter(o=>o.kind==='tree');
 expect(trees.length).toBeGreaterThan(5);
 expect(trees.every(o=>[0,1,6].includes(o.variant))).toBe(true);
 const indices=trees.slice(0,4).map(o=>[o.x,o.y]);
 await page.evaluate(indices=>{
   const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
   for(let i=0;i<indices.length;i++){
     const [x,y]=indices[i],tree=s.world.objects.find(o=>o.x===x&&o.y===y&&o.kind==='tree');
     tree.variant=i+2;
   }
   localStorage.setItem('tillfolk-v01',JSON.stringify(s));
 },indices);
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#continue').click();
 s=await snap(page);
 expect(s.world.objects.filter(o=>o.kind==='tree').length).toBe(trees.length);
 expect(s.world.objects.filter(o=>o.kind==='tree').every(o=>[0,1,6].includes(o.variant))).toBe(true);
 expect(indices.every(([x,y])=>s.world.objects.some(o=>o.kind==='tree'&&o.x===x&&o.y===y))).toBe(true);
 const frames=await page.evaluate(()=>[2,3,4,5].map(i=>window.TillfolkWild.spriteFrame('tree',i)));
 expect(frames.every(f=>f&&!(f[0]>=48&&f[0]<=144&&f[1]===0))).toBe(true);
 await page.screenshot({path:'screenshots/floresta-sem-arvores-frutiferas-1366x768.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
test('Saves antigos com marcação sem tarefa voltam ao solo natural',async({page})=>{
 await start(page,390,844);
 const [{x,y}]=await freeCells(page);
 await page.evaluate(({x,y})=>{
   const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
   s.orders=[];
   s.plots.find(p=>p.x===x&&p.y===y).selected=true;
   localStorage.setItem('tillfolk-v01',JSON.stringify(s));
 },{x,y});
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#continue').click();
 const s=await snap(page);
 expect(s.plots.find(p=>p.x===x&&p.y===y).selected).toBe(false);
 await page.screenshot({path:'screenshots/mobile-390x844-sem-marcacao-fantasma.png',animations:'disabled'});
});
