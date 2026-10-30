"use strict";
// Cena composta exclusivamente com imagens pixel art já disponíveis no repositório.
// Nenhuma imagem gerada ou desenho vetorial substitui os sprites originais.
(() => {
  const main=document.querySelector("#title-scene"),host=document.querySelector("#menu");
  if(!main||!host)return;
  const ctx=main.getContext("2d",{alpha:false}), W=960,H=540, TILE=16;
  ctx.imageSmoothingEnabled=false;
  const base="./public/assets/sprout-lands/";
  const images={
    grass:base+"terrain/grass.png",
    soil:base+"terrain/soil.png",
    till:base+"terrain/tilled-dirt.png",
    crops:base+"farming/crops.png",
    trees:base+"environment/trees-and-bushes.png",
    well:base+"structures/water-well.png",
    fences:base+"structures/fences.png",
    chest:base+"structures/chest.png",
    barn:base+"structures/barn.png",
    chicken:base+"animals/chicken.png",
    worker:base+"characters/worker-variants.png",
    roof:"./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/Building parts/Wooden_House_Roof_Tilset.png",
    walls:"./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/Building parts/Wooden_House_Walls_Tilset.png",
    furniture:"./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/Building parts/Basic_Furniture.png",
    paths:"./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/Building parts/Paths.png"
  };
  const sprites={};
  for(const [key,url] of Object.entries(images)){
    const img=new Image();sprites[key]=img;
    img.addEventListener("load",render);
    img.addEventListener("error",()=>console.warn("Sprite indisponível no menu:",url));
    img.src=url;
  }
  const ready=(name)=>sprites[name]?.complete&&sprites[name].naturalWidth>0;
  function stamp(name,sx,sy,sw,sh,x,y,w=sw,h=sh,context=ctx){
    if(!ready(name))return;
    const source=sprites[name];
    if(sx<0||sy<0||sx+sw>source.naturalWidth||sy+sh>source.naturalHeight)return;
    context.drawImage(source,sx,sy,sw,sh,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  function turf(x,y,variation=0){stamp("grass",(variation%6)*16,80,16,16,x,y);}
  function dirt(x,y){stamp("soil",0,80,16,16,x,y);}
  function farmTile(x,y){stamp("till",0,80,16,16,x,y);}
  function tree(x,y,kind=0,size=1){
    // Árvores frutíferas, arbustos e árvores grandes do atlas Sprout Lands.
    if(kind===2)stamp("trees",144,48,48,48,x-20*size,y-54*size,78*size,78*size);
    else if(kind===1)stamp("trees",32,0,32,32,x-14*size,y-28*size,43*size,43*size);
    else stamp("trees",0,0,32,32,x-15*size,y-30*size,43*size,43*size);
  }
  function fenceHoriz(x,y,length){
    for(let a=0;a<length;a++)stamp("fences",32,0,16,16,x+a*16,y,16,16);
  }
  function fenceVert(x,y,length){
    for(let a=0;a<length;a++)stamp("fences",0,0,16,16,x,y+a*16,16,16);
  }
  function house(){
    const x=643,y=144,w=200,h=129;
    // Mosaico de telhas, paredes, janelas e objetos do pacote premium.
    for(let row=0;row<5;row++){
      for(let col=0;col<9;col++){
        stamp("walls",16,16,16,16,x+col*24,y+55+row*16,24,16);
      }
    }
    for(let j=0;j<3;j++)for(let i=0;i<4;i++)
      stamp("roof",48,32,32,16,x-12+i*56,y+j*20,58,24);
    for(let i=0;i<4;i++)stamp("roof",48,48,32,16,x-12+i*56,y+55,58,19);
    stamp("walls",0,0,32,32,x+16,y+76,48,48);
    stamp("walls",0,0,32,32,x+142,y+76,48,48);
    stamp("walls",48,16,32,32,x+91,y+78,43,52);
    // Flores, vasos e móveis são recortes do pacote original.
    stamp("furniture",0,16,16,16,x+3,y+119,28,28);
    stamp("furniture",32,16,16,16,x+176,y+120,28,28);
    stamp("chest",0,0,32,32,x-46,y+118,42,42);
    stamp("chest",32,0,32,32,x+205,y+121,38,38);
    stamp("furniture",96,32,16,16,x+122,y+139,26,26);
    return {x,y,w,h};
  }
  const crops=[
    [3,0],[3,32],[3,48],[3,64],[3,80],[3,128],
    [3,144],[3,160],[3,176],[3,192],[3,208]
  ];
  function plotRow(x,y,length,type=1,stage=3){
    for(let i=0;i<length;i++){
      farmTile(x+i*20,y);farmTile(x+i*20,y+16);
      stamp("crops",Math.min(stage,3)*16,(type%11)*16,16,16,x+i*20,y-7,20,22);
    }
  }
  function drawFarm(){
    ctx.fillStyle="#a9cf7a";ctx.fillRect(0,0,W,H);
    for(let j=0;j<34;j++)for(let i=0;i<60;i++){
      const k=((i*17+j*31+(i*j)%11)%12);
      turf(i*16,j*16,k>8?5:k%5);
    }
    // Caminhos arenosos usando os tiles reais de solo do Sprout Lands.
    for(let j=18;j<31;j++)for(let i=31;i<58;i++){
      const path=Math.abs(i-45-Math.sin(j*.44)*3)<3 || (j>=23&&j<=25);
      if(path)dirt(i*16,j*16);
    }
    // Canteiros e plantio de culturas distintas.
    for(let row=0;row<4;row++) plotRow(440,310+row*38,12,[2,3,4,7][row],row===0?3:row===1?2:3);
    for(let row=0;row<3;row++)plotRow(440,198+row*26,7,5+row,3);
    fenceHoriz(427,290,17);fenceHoriz(428,470,17);fenceVert(427,290,12);
    fenceVert(706,299,7);
    for(let i=0;i<13;i++){stamp("furniture",64,16,16,16,430+i*15,284,12,12);}
    house();
    for(const [x,y,t,s] of [
      [400,115,2,1.25],[474,113,0,1],[550,101,1,1.18],
      [859,143,2,1.22],[915,194,1,1.1],[876,377,0,1.5],
      [830,470,2,1.18],[380,480,2,1.35],[269,370,1,1.25],
      [210,90,0,1.4],[298,160,1,.9],[923,68,2,.9],
      [568,488,0,.8],[608,495,1,.74]])tree(x,y,t,s);
    stamp("well",0,0,32,32,784,382,71,71);
    stamp("chest",0,0,32,32,770,317,40,40);
    stamp("furniture",48,32,16,16,826,319,28,28);
    stamp("chicken",0,0,16,16,722,457,22,22);
    for(let i=0;i<9;i++){
      stamp("paths",0,0,16,16,604+i*18,489+(i%3)*4,24,24);
    }
    // Personagens originais do Sprout Lands, sem emojis ou avatares gerados.
    const t=Math.floor(performance.now()/300)%3;
    const walk=(x,y,appearance=0)=>{
      const img=sprites.worker;
      if(!ready("worker"))return;
      const maxRows=Math.floor(img.naturalHeight/192);
      stamp("worker",t*48,Math.min(appearance,maxRows-1)*192,48,48,x-27,y-62,60,60);
    };
    walk(570,360,0);walk(734,358,1);
    // Pequenas flores originais como decoração orgânica.
    for(let i=0;i<28;i++){
      const x=378+(i*71)%561,y=84+(i*49)%423;
      if(x>437&&x<699&&y>298&&y<470)continue;
      stamp("grass",((i%3)+3)*16,80,16,16,x,y,16,16);
    }
  }
  function preview(canvas){
    const c=canvas.getContext("2d");c.imageSmoothingEnabled=false;
    c.fillStyle="#9cc882";c.fillRect(0,0,192,72);
    const kind=canvas.dataset.preview;
    const s=(name,sx,sy,sw,sh,x,y,w,h)=>stamp(name,sx,sy,sw,sh,x,y,w,h,c);
    if(kind==="workers"){
      for(let i=0;i<3;i++)s("worker",0,i*192,48,48,18+i*60,7,53,60);
      s("fences",32,0,16,16,0,51,192,21);
    } else if(kind==="crops"){
      for(let x=0;x<192;x+=16){s("till",0,80,16,16,x,37,16,16);s("till",0,80,16,16,x,53,16,16);}
      for(let i=0;i<9;i++)s("crops",48,(i%5)*16,16,16,i*21,18,21,26);
    }else{
      s("well",0,0,32,32,20,10,62,62);
      s("chest",0,0,32,32,111,35,38,38);
      s("furniture",96,32,16,16,159,40,28,28);
      s("trees",0,0,32,32,107,-6,43,43);
    }
  }
  let last=0;
  function render(time=0){
    if(!host.hidden){
      if(!time||time-last>120){
        ctx.imageSmoothingEnabled=false;
        drawFarm();
        document.querySelectorAll(".title-card-preview").forEach(preview);
        last=time||performance.now();
      }
    }
  }
  // Animação dos personagens discreta, suspensa quando a aba fica oculta.
  function loop(t){
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!document.hidden && !host.hidden && !reduced)render(t);
    requestAnimationFrame(loop);
  }
  window.addEventListener("pageshow",()=>render());
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
  requestAnimationFrame(loop);
  render();
})();