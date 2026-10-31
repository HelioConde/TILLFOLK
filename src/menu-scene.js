"use strict";
/* TILLFOLK — cenário do menu criado só com sprites já licenciados do projeto. */
(() => {
  const canvas=document.querySelector("#title-scene");
  const menu=document.querySelector("#menu");
  if(!canvas||!menu)return;
  const ctx=canvas.getContext("2d",{alpha:false});
  const W=960,H=540,asset="./public/assets/sprout-lands/";
  const sources={
    grass:"terrain/grass.png",soil:"terrain/soil.png",
    dark:"terrain/dark-soil.png",till:"terrain/tilled-dirt.png",
    crops:"farming/crops.png",trees:"environment/trees-and-bushes.png",
    well:"structures/water-well.png",
    chest:"structures/chest.png",barn:"structures/barn.png",
    roof:"structures/wood-roof.png",walls:"structures/wood-walls.png",
    door:"structures/wood-door.png",
    furniture:"structures/furniture.png",paths:"structures/paths.png",
    worker:"characters/worker-variants.png",actions:"characters/worker-actions.png",
    waterfx:"characters/watering-effects.png",treeMotion:"environment/tree-animations.png"
  };
  const imgs={};
  let loaded=0,failures=[];
  const all=Object.keys(sources);
  for(const [id,file] of Object.entries(sources)){
    const img=new Image();
    img.onload=()=>{loaded++;render();};
    img.onerror=()=>{failures.push(file);console.warn("TILLFOLK: sprite não carregado:",file);render();};
    img.src=asset+file;imgs[id]=img;
  }
  function ready(id){return imgs[id]?.complete&&imgs[id].naturalWidth>0;}
  function stamp(id,sx,sy,sw,sh,x,y,w=sw,h=sh,target=ctx){
    if(!ready(id))return;
    const img=imgs[id];
    if(sx<0||sy<0||sx+sw>img.naturalWidth||sy+sh>img.naturalHeight)return;
    target.drawImage(img,sx,sy,sw,sh,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  const grass=(x,y,n)=>stamp("grass",((n%6)+6)%6*16,80,16,16,x,y,16,16);
  const soil=(x,y)=>stamp("soil",0,80,16,16,x,y,16,16);
  function earth(x,y){stamp(ready("dark")?"dark":"soil",0,80,16,16,x,y,16,16);}
  function tree(x,y,kind=0,scale=1){
    if(kind===2){stamp("trees",144,48,48,48,x-25*scale,y-48*scale,72*scale,72*scale);return;}
    // Cada copa completa ocupa sua célula original de 32px no atlas.
    // O primeiro arbusto é uma exceção: tem 16px de largura.
    if(kind===0){stamp("trees",0,0,16,32,x-8*scale,y-30*scale,27*scale,43*scale);return;}
    const sx=({1:16,3:80,4:112,5:144})[kind]??48;
    stamp("trees",sx,0,32,32,x-16*scale,y-30*scale,48*scale,43*scale);
  }
  function lane(x0,y0,width,height,texture="soil"){
    for(let y=y0;y<y0+height;y+=16)for(let x=x0;x<x0+width;x+=16){
      stamp(texture,0,80,16,16,x,y,16,16);
    }
  }
  function farmhouse(){
    const builder=window.TillfolkHouse;
    if(!builder)return;
    // Tiles Slime-Harvest: uma única escala para paredes, telhado, porta e janela.
    return builder.draw(ctx,{roof:imgs.roof,walls:imgs.walls,door:imgs.door},
      628,78,{scale:2});
  }
  // Animação determinística do cenário: um ciclo de trabalho de 36 segundos.
  // O jogo real (fila de tarefas, IA, inventários) não é alterado por esta cena.
  const CYCLE=36000;
  const clamp01=n=>Math.max(0,Math.min(1,n));
  const lerp=(a,b,t)=>a+(b-a)*clamp01(t);
  function pingPong(t){
    const n=((t%1)+1)%1;
    return n<.5?n*2:(1-n)*2;
  }
  function sceneState(ms=0){
    const t=((Math.max(0,ms)%CYCLE)+CYCLE)%CYCLE;
    const falling=t>=12100&&t<13900;
    const chopped=t>=13900&&t<18200;
    const growing=t>=18200&&t<27900;
    const treeState=t<12100?"mature":falling?"falling":chopped?"stump":growing?"growing":"mature";
    const treeGrowth=treeState==="growing"?clamp01((t-18200)/9700):treeState==="stump"?0:1;
    const loggerWalking=t<5900||t>=27500;
    const loggerX=t<5900?lerp(676,754,t/5900):t<27500?754:lerp(754,676,(t-27500)/8500);
    const field=(t+2800)%14000;
    const gardenerWalking=field<3000||field>=10400;
    const gardenerX=field<3000?lerp(492,559,field/3000):field<10400?559:lerp(559,492,(field-10400)/3600);
    const gardenerAction=field<3000||field>=10400?"walk":field<7000?"hoe":"water";
    return {
      t,tree:{phase:treeState,growth:treeGrowth,shake:t>=5900&&t<12100?Math.sin(t/65)*2.1:0,
        fall:falling?clamp01((t-12100)/1800):0},
      logger:{x:loggerX,y:394+Math.sin(t/620)*2,action:t>=5900&&t<12100?"chop":loggerWalking?"walk":"idle",
        facing:t>=27500?"left":"right"},
      gardener:{x:gardenerX,y:365+Math.sin(t/420)*1.5,
        action:gardenerAction,facing:field>=10400?"left":"right"},
      cropStage:1+Math.floor((t%30000)/7500),
      // O começo do jogo e a abertura não apresentam animais.
      animals:[]
    };
  }
  function bed(x,y,row,stage=3){
    for(let col=0;col<11;col++){
      for(let dy=0;dy<2;dy++)earth(x+col*18,y+dy*14);
      // O avanço visual da lavoura ocorre em estágios, sem modificar a partida.
      const step=Math.max(0,Math.min(4,stage-((col+row)%3===0?1:0)));
      stamp("crops",step*16,Math.min(14,row)*16,16,16,x+col*18,y-5,21,26);
    }
  }
  function workerFrame(x,y,index,frame=0,moving=false,facing="down",w=58,h=60,target=ctx){
    if(!ready("worker"))return;
    const img=imgs.worker;
    // Mesmo mapeamento de caminhada do gameplay (4 direções + 4 em movimento).
    // Os 48px do quadro incluem margens transparentes; recortar o corpo impede
    // a aparência de personagem minúsculo no cenário.
    const dirs={down:0,up:1,right:2,left:3};
    const row=(moving?4:0)+(dirs[facing]??0);
    stamp("worker",(frame%8)*48+11,row*48+12,26,24,x,y,w,h,target);
  }
  // As miniaturas de Sobrevivência e Fazenda tranquila continuam usando
  // o mesmo recorte legível, sem interferir na animação do cenário principal.
  function walking(x,y,index=0,frame=0,target=ctx,w=56,h=56){
    workerFrame(x,y,index,frame,false,"down",w,h,target);
  }
  function workingFrame(x,y,action="hoe",facing="right",frame=0,w=60,h=62){
    // worker-actions: duas colunas por ação; grupos de quatro direções.
    const dirs={down:0,up:1,left:2,right:3};
    const group=action==="chop"?4:0;
    stamp("actions",(frame%2)*48,(group+dirs[facing])*48,48,48,x-14,y-18,w+29,h+30);
  }
  function growableTree(stage){
    const x=841,y=447;
    const treeInfo=stage.tree;
    if(treeInfo.phase==="stump"){
      // O toco do próprio atlas permanece após o corte.
      stamp("trees",32,96,16,16,x-11,y-14,24,23);
    }else if(treeInfo.phase==="growing"){
      stamp("trees",32,96,16,16,x-11,y-14,24,23);
      tree(x,y,1,.23+treeInfo.growth*1.02);
    }else if(treeInfo.phase==="falling"){
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(-Math.PI*.45*treeInfo.fall);
      tree(0,0,1,1.25);
      ctx.restore();
    }else{
      tree(x+treeInfo.shake,y,1,1.25);
    }
  }
  function ambientParticles(stage){
    if(stage.tree.phase==="falling"||stage.logger.action==="chop"){
      const n=stage.tree.phase==="falling"?11:5;
      for(let i=0;i<n;i++){
        const p=(stage.t/8+i*23)%94;
        ctx.fillStyle=i%3===0?"#9dbd60":i%3===1?"#cbdf86":"#7d9d52";
        ctx.fillRect(Math.round(821+Math.sin(i*19)*30+p*.15),
          Math.round(433+(i%4)*5-(p%33)),3+(i%2),3);
      }
    }
    if(stage.gardener.action==="water"){
      // Quadros de respingos originais, ao lado do regador.
      const frame=Math.floor(stage.t/115)%9;
      stamp("waterfx",frame*48,0,48,48,stage.gardener.x+28,stage.gardener.y+27,45,45);
    }
  }
  function paint(ms=0){
    const stage=sceneState(ms);
    ctx.imageSmoothingEnabled=false;
    // Todos os pixels do fundo são tiles do pack original.
    ctx.fillStyle="#aad282";ctx.fillRect(0,0,W,H);
    for(let iy=0;iy<34;iy++)for(let ix=0;ix<60;ix++){
      const p=(ix*13+iy*7+(ix*iy)%11)%12;
      grass(ix*16,iy*16,p<8?p%3:3+p%3);
    }
    // Trilha orgânica entre a casa, o poço e a horta. SEM CERCAS.
    for(let y=235;y<540;y+=16)for(let x=480;x<925;x+=16){
      const shift=Math.round(Math.sin(y/57)*24),center=695+shift;
      if(Math.abs(x-center)<49||(y>305&&y<340&&x>550&&x<855))soil(x,y);
    }
    for(const [x,y,k,z] of [
      [394,132,2,1.6],[446,119,1,1.4],[493,112,0,1.5],
      [547,124,2,1.12],[613,104,3,1.3],
      // Clareira aberta, com prioridade visual para a fazenda e os trabalhadores.
      [402,250,0,1.1],[447,252,2,.95],[933,263,1,1.3]
    ])tree(x,y,k,z);
    farmhouse();
    stamp("well",0,0,32,32,823,326,80,80);
    stamp("chest",0,0,32,32,560,332,42,42);
    stamp("furniture",16,16,16,16,887,320,30,30);
    stamp("furniture",48,32,16,16,590,333,28,28);
    for(let row=0;row<5;row++){
      bed(462,322+row*32,[0,1,3,5,8][row],Math.max(0,Math.min(4,stage.cropStage+row%2)));
    }
    for(let i=0;i<8;i++)stamp("crops",64,0,16,16,646+i*24,374,22,27);
    for(let i=0;i<7;i++)stamp("furniture",48,16,16,16,695+i*27,384,22,24);
    // Primeiro plano vivo: árvore de corte e dois trabalhadores.
    growableTree(stage);
    const frame=Math.floor(ms/190)%4;
    if(stage.gardener.action==="walk")
      workerFrame(stage.gardener.x,stage.gardener.y,0,frame,true,stage.gardener.facing,61,64);
    else
      workingFrame(stage.gardener.x,stage.gardener.y,"hoe",
        stage.gardener.facing,Math.floor(ms/250),61,64);
    if(stage.logger.action==="chop")
      workingFrame(stage.logger.x,stage.logger.y,"chop","right",Math.floor(ms/240),62,64);
    else
      workerFrame(stage.logger.x,stage.logger.y,1,frame,stage.logger.action==="walk",
        stage.logger.facing,62,64);
    ambientParticles(stage);
    for(const [x,y,k,z] of [
      [377,455,2,1.3],[412,524,0,1.1],[930,445,4,1.3],[600,532,0,.82]
    ])tree(x,y,k,z);
  }
  function preview(canvas){
    const c=canvas.getContext("2d");c.imageSmoothingEnabled=false;
    c.fillStyle="#aed581";c.fillRect(0,0,192,72);
    const t=(id,sx,sy,sw,sh,x,y,w,h)=>stamp(id,sx,sy,sw,sh,x,y,w,h,c);
    const which=canvas.dataset.preview;
    if(which==="workers"){
      for(let x=0;x<192;x+=16)t("grass",0,80,16,16,x,56,16,16);
      for(let i=0;i<3;i++)walking(10+i*62,4,i,0,c,62,63);
    }else if(which==="crops"){
      for(let x=0;x<192;x+=16){t("dark",0,80,16,16,x,38,16,16);t("dark",0,80,16,16,x,54,16,16);}
      for(let i=0;i<9;i++)t("crops",64,(i%5)*16,16,16,3+i*21,13,23,30);
    }else if(which==="mode-survival"){
      // Faixas de cultivo e colheita em um cenário com árvores ao fundo.
      for(let x=0;x<192;x+=16)for(let y=0;y<72;y+=16)t("grass",0,80,16,16,x,y,16,16);
      for(let x=24;x<178;x+=16){t("dark",0,80,16,16,x,42,16,16);t("dark",0,80,16,16,x,58,16,16);}
      for(let x=27;x<177;x+=23)t("crops",48,3*16,16,16,x,24,22,27);
      walking(53,7,0,0,c,51,57);
      t("chest",0,0,32,32,138,20,42,43);
    }else if(which==="mode-relaxed"){
      // Miniatura própria, com recortes INTEIROS do atlas original.
      // Antes: trees (144,48,48,48) ultrapassava a imagem, e (16,0,16,32)
      // mostrava apenas metade da copa. Também havia objetos fora do card.
      for(let y=0;y<72;y+=16){
        const h=Math.min(16,72-y);
        for(let x=0;x<192;x+=16)t("grass",16,80,16,h,x,y,16,h);
      }
      // Caminho atrás do personagem, terminando exatamente na borda inferior.
      for(let x=70;x<=118;x+=16)t("soil",0,80,16,16,x,56,16,16);
      // Duas árvores completas (frame original 32×32, sem cortar a copa).
      t("trees",16,0,32,32,12,8,48,48);
      t("trees",16,0,32,32,134,6,42,42);
      // Poço e colono inteiros, com margem interna em todas as direções.
      t("well",0,0,32,32,147,41,30,30);
      walking(74,6,1,0,c,50,54);
    }else{
      for(let x=0;x<192;x+=16)t("grass",0,80,16,16,x,55,16,16);
      t("well",0,0,32,32,17,5,65,65);
      t("chest",0,0,32,32,101,35,37,37);
      t("furniture",96,32,16,16,146,34,31,32);
    }
  }
  // 15 FPS: animações legíveis sem renderizar milhares de tiles a 60 FPS.
  // A cena usa um relógio próprio: abas ocultas e animação desativada não
  // aceleram o crescimento ou a queda da árvore quando o menu volta.
  let latest=-1,elapsed=0,lastTick=0,lastLoaded=-1;
  const motionOff=()=>menu.classList.contains("no-title-motion")||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function render(t){
    if(menu.hidden)return;
    const now=Number.isFinite(t)?t:performance.now();
    const paused=motionOff();
    if(paused)elapsed=0;
    else if(lastTick)elapsed+=Math.max(0,Math.min(220,now-lastTick));
    lastTick=now;
    const tick=paused?0:Math.floor(elapsed/75);
    if(tick===latest&&lastLoaded===loaded)return;
    latest=tick;lastLoaded=loaded;
    paint(paused?0:elapsed);
    document.querySelectorAll(".mode-art").forEach(preview);
  }
  function loop(t){
    if(!document.hidden&&!menu.hidden)render(t);
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange",()=>{
    lastTick=0;
    if(!document.hidden){latest=-1;render();}
  });
  window.addEventListener("pageshow",()=>{latest=-1;lastTick=0;render();});
  document.querySelector("#title-motion")?.addEventListener("change",()=>{
    latest=-1;lastTick=0;render();
  });
  // Interface somente de leitura para testes determinísticos de quadros.
  window.TillfolkMenuScene=Object.freeze({
    sample:(millis=0)=>sceneState(millis),
    // Captura de um instante para o QA visual sem esperar 36 segundos reais.
    drawAt:(millis=0)=>{if(!menu.hidden)paint(millis);},
    cycleMs:CYCLE,
    sources:Object.freeze({...sources}),
    assetHealth:()=>({ready:all.filter(ready).length,total:all.length,failed:[...failures]})
  });
  render();requestAnimationFrame(loop);

})();