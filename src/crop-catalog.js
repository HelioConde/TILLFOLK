"use strict";
// Catálogo local de 19 cultivos. Todo visual vem dos sprites já versionados no projeto.
(() => {
  const base="./public/assets/assets/crops/";
  // Imagens de sementes do próprio pacote premium (Objects/Items).
  const farmItemsPath="./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Objects/Items/Farming Plants items.png";
  let farmItems=null;
  function farmItemImage(){
    if(!farmItems&&typeof Image==="function"){
      farmItems=new Image();farmItems.decoding="async";farmItems.src=farmItemsPath;
    }
    return farmItems;
  }

  const specs=[
    ["bamboo","Bambu",16,32,7,2,3,1],["beetroot","Beterraba",16,16,7,1,3,3],
    ["berry","Frutinhas",16,16,7,1,3,1],["broccoli","Brócolis",16,32,7,1,4,2],
    ["carrot","Cenoura",16,16,7,2,3,4],["cauliflower","Couve-flor",16,16,7,1,4,2],
    ["celery","Aipo",16,32,7,1,3,2],["corn","Milho",16,32,8,2,4,3],
    ["eggplant","Berinjela",16,32,7,1,4,2],["grape","Uva",18,32,7,2,4,1],
    ["leek","Alho-poró",16,32,7,1,3,2],["lettuce","Alface",16,16,7,1,3,4],
    ["onion","Cebola",16,32,7,1,3,3],["pepper","Pimentão",16,32,11,2,4,2],
    ["potato","Batata",16,32,7,1,3,4],["pumpkin","Abóbora",16,16,7,3,5,2],
    ["radish","Rabanete",16,16,7,2,3,4],["tomato","Tomate",16,32,23,4,4,3],
    ["wheat","Trigo",18,32,8,9,3,4]
  ];
  const records=specs.map(([id,name,w,h,frames,iconFrames,food,weight])=>{
    const folder=base+id+"/";
    const growth=folder+"growth_basic/"+id+"_"+w+"x"+h+"_"+frames+"frames.png";
    const icon=folder+"icon/"+id+"_icon_16x16"+(iconFrames>1?"_"+iconFrames+"frames":"")+".png";
    return Object.freeze({id,name,w,h,frames,iconFrames,food,weight,growth,icon});
  });
  const ALL=Object.freeze(records);
  const byId=new Map(ALL.map(item=>[item.id,item]));
  const images=new Map();
  function imageFor(id,kind="growth"){
    const crop=byId.get(id);if(!crop)return null;
    const key=id+":"+kind;
    if(!images.has(key)){
      const image=new Image();
      image.decoding="async";image.src=crop[kind];
      images.set(key,image);
    }
    return images.get(key);
  }
  function normalizeStock(raw){
    const stock={};
    for(const crop of ALL){
      const num=Number(raw?.[crop.id]);
      stock[crop.id]=Number.isFinite(num)?Math.max(0,Math.floor(num)):0;
    }
    return stock;
  }
  // Percentual de maturação usa os frames existentes. Detecta linha ou grade.
  function framePosition(img,w,h,frame){
    const cols=Math.max(1,Math.floor(img.naturalWidth/w));
    const rows=Math.max(1,Math.floor(img.naturalHeight/h));
    const index=Math.max(0,Math.min(cols*rows-1,frame));
    return {x:index%cols*w,y:Math.floor(index/cols)*h};
  }
  function draw(ctx,cropId,growth,x,y,tile=32,harvested=false){
    const crop=byId.get(cropId);
    const image=imageFor(cropId);
    if(!crop||!image?.complete||image.naturalWidth<crop.w||image.naturalHeight<crop.h)return false;
    const frame=harvested?crop.frames-1:Math.max(0,Math.min(crop.frames-1,Math.floor(growth*(crop.frames-1))));
    const pos=framePosition(image,crop.w,crop.h,frame);
    const dw=Math.round(tile*(crop.w/16)*.85),dh=Math.round(tile*(crop.h/16)*.83);
    ctx.drawImage(image,pos.x,pos.y,crop.w,crop.h,
      Math.round(x+(tile-dw)/2),Math.round(y+tile-dh-4),dw,dh);
    return true;
  }
  function drawIcons(root){
    if(!root)return;
    for(const canvas of root.querySelectorAll("canvas[data-crop-icon]")){
      const crop=byId.get(canvas.dataset.cropIcon);
      const ctx=canvas.getContext("2d");
      if(!crop)continue;
      const img=imageFor(crop.id,"icon");
      if(!img)continue;
      const paint=()=>{
        if(!canvas.isConnected||!img.naturalWidth)return;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const pos=framePosition(img,16,16,0);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(img,pos.x,pos.y,16,16,0,0,canvas.width,canvas.height);
      };
      if(img.complete)paint();else img.addEventListener("load",paint,{once:true});
    }
  }
  // Distribuição de culturas por região; o primeiro vale começa pela batata.
  // Só utiliza espécies que já têm sprite no catálogo do projeto.
  const REGIONS=Object.freeze({
    g:Object.freeze(["potato","potato","carrot"]),
    f:Object.freeze(["berry","tomato","broccoli","potato"]),
    s:Object.freeze(["wheat","corn","pumpkin"]),
    w:Object.freeze(["celery","leek","onion","rice"].filter(id=>byId.has(id))),
    i:Object.freeze(["potato"]),
    p:Object.freeze(["beetroot","radish"])
  });
  function pickWild(random=Math.random,region="g"){
    const available=REGIONS[region]||REGIONS.g;
    return available[Math.min(available.length-1,Math.floor(random()*available.length))];
  }
  window.TillfolkCrops=Object.freeze({ALL,REGIONS,farmItemImage,get:id=>byId.get(id),imageFor,normalizeStock,draw,drawIcons,pickWild});
})();
