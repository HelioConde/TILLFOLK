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
    well:"structures/water-well.png",fences:"structures/fences.png",
    chest:"structures/chest.png",barn:"structures/barn.png",
    roof:"structures/wood-roof.png",walls:"structures/wood-walls.png",
    furniture:"structures/furniture.png",paths:"structures/paths.png",
    chicken:"animals/chicken.png",worker:"characters/worker-variants.png"
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
    const sx=[0,16,32,48,64,80][(kind+6)%6];
    stamp("trees",sx,0,16,32,x-8*scale,y-30*scale,27*scale,43*scale);
  }
  function lane(x0,y0,width,height,texture="soil"){
    for(let y=y0;y<y0+height;y+=16)for(let x=x0;x<x0+width;x+=16){
      stamp(texture,0,80,16,16,x,y,16,16);
    }
  }
  function farmhouse(){
    const x=657,y=150;
    // Paredes, portas e janelas do atlas original Sprout Lands.
    for(let row=0;row<6;row++)for(let col=0;col<11;col++){
      stamp("walls",16,16,16,16,x+col*18,y+58+row*16,18,16);
    }
    for(let j=0;j<4;j++)for(let i=0;i<6;i++){
      // Mosaico de telhado real (folha de telhas, 112×80).
      stamp("roof",48+(i%4)*16,32+(j%3)*16,16,16,x-17+i*39,y+j*18,41,20);
    }
    for(let i=0;i<6;i++)stamp("roof",48+(i%4)*16,64,16,16,x-17+i*39,y+61,41,22);
    // Fachada e entrada.
    stamp("walls",0,0,32,32,x+10,y+90,42,44);
    stamp("walls",48,0,32,32,x+141,y+92,42,44);
    stamp("walls",48,32,16,16,x+88,y+101,39,47);
    stamp("furniture",0,16,16,16,x-13,y+136,26,26);
    stamp("furniture",32,16,16,16,x+201,y+136,26,26);
    stamp("chest",0,0,32,32,x-55,y+128,35,37);
    stamp("chest",48,0,32,32,x+210,y+132,34,33);
  }
  function bed(x,y,row,stage=3){
    for(let col=0;col<11;col++){
      for(let dy=0;dy<2;dy++)earth(x+col*18,y+dy*14);
      stamp("crops",Math.min(stage,4)*16,Math.min(14,row)*16,16,16,x+col*18,y-5,21,26);
    }
  }
  function fence(x,y,count,vertical=false){
    for(let i=0;i<count;i++){
      stamp("fences",vertical?0:32,0,16,16,x+(vertical?0:i*16),y+(vertical?i*16:0),16,16);
    }
  }
  function walking(x,y,index=0,frame=0,target=ctx,w=56,h=56){
    if(!ready("worker"))return;
    const img=imgs.worker;
    const appearance=Math.min(index,Math.max(0,Math.floor(img.naturalHeight/192)-1));
    stamp("worker",frame*48,appearance*192,48,48,x,y,w,h,target);
  }
  function paint(){
    ctx.imageSmoothingEnabled=false;
    // Todos os pixels do fundo são tiles do pack original.
    ctx.fillStyle="#aad282";ctx.fillRect(0,0,W,H);
    for(let iy=0;iy<34;iy++)for(let ix=0;ix<60;ix++){
      const p=(ix*13+iy*7+(ix*iy)%11)%12;
      grass(ix*16,iy*16,p<8?p%3:3+p%3);
    }
    // Trilha ligando a casa, o poço e a horta.
    for(let y=235;y<540;y+=16)for(let x=480;x<925;x+=16){
      const shift=Math.round(Math.sin(y/57)*24), center=695+shift;
      if(Math.abs(x-center)<49 ||(y>305&&y<340&&x>550&&x<855))soil(x,y);
    }
    // Bosque e árvores frutíferas ao fundo.
    for(const [x,y,k,s] of [
      [394,132,2,1.6],[446,119,1,1.4],[493,112,0,1.5],
      [547,124,2,1.12],[613,104,3,1.3],[690,112,4,1.1],
      [806,110,2,1.3],[879,134,3,1.5],[938,119,2,1.5],
      [402,250,0,1.1],[447,252,2,.95],[933,263,1,1.3]
    ])tree(x,y,k,s);
    farmhouse();
    // Ferramentas e depósito.
    stamp("well",0,0,32,32,823,326,80,80);
    stamp("chest",0,0,32,32,757,309,46,46);
    stamp("furniture",16,16,16,16,887,320,30,30);
    stamp("furniture",48,32,16,16,750,282,28,28);
    // Horta com várias fases de crescimento.
    for(let row=0;row<5;row++)bed(462,322+row*32,[0,1,3,5,8][row],Math.min(4,row+1));
    fence(448,304,15);fence(446,488,15);
    fence(447,305,12,true);fence(687,349,9,true);
    // Plantação de flores e arbustos à beira da casa.
    for(let i=0;i<8;i++){
      stamp("crops",64,0,16,16,650+i*24,296,22,27);
    }
    for(let i=0;i<7;i++)stamp("furniture",48,16,16,16,692+i*28,293,22,24);
    // Funcionários e animais: frames reais, sem emojis.
    const frame=Math.floor(performance.now()/260)%4;
    walking(521,370,0,frame,ctx,68,68);
    walking(716,398,1,frame,ctx,64,64);
    stamp("chicken",0,0,16,16,804,464,31,31);
    for(const [x,y,k,s] of [
      [377,455,2,1.3],[412,524,0,1.1],[883,505,2,1.3],
      [930,445,4,1.3],[600,532,0,.82]
    ])tree(x,y,k,s);
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
    }else{
      for(let x=0;x<192;x+=16)t("grass",0,80,16,16,x,55,16,16);
      t("well",0,0,32,32,17,5,65,65);
      t("chest",0,0,32,32,101,35,37,37);
      t("furniture",96,32,16,16,146,34,31,32);
    }
  }
  let latest=-1;
  function render(t){
    if(menu.hidden)return;
    // Reconstruir a cena somente quando os sprites terminarem de carregar
    // ou quando o frame dos personagens mudar.
    const frame=Math.floor((t||performance.now())/260);
    if(frame===latest && loaded!==all.length)return;
    latest=frame;
    paint();
    document.querySelectorAll(".title-card-preview").forEach(preview);
  }
  function loop(t){
    if(!document.hidden && !menu.hidden &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches)render(t);
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
  window.addEventListener("pageshow",()=>render());
  render();
  requestAnimationFrame(loop);
})();