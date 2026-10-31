"use strict";
/* Blueprints do TILLFOLK — silhuetas azuis translúcidas dos sprites existentes.
 * Usa só o atlas Sprout Lands já instalado, sem alterar o mundo ou o save.
 */
(()=>{
  const tintCache=new WeakMap();
  const good=img=>img&&img.complete&&img.naturalWidth>0;
  function tinted(img,sx,sy,sw,sh,color){
    if(!good(img))return null;
    let map=tintCache.get(img);
    if(!map){map=new Map();tintCache.set(img,map);}
    const key=[sx,sy,sw,sh,color].join(",");
    if(map.has(key))return map.get(key);
    const c=document.createElement("canvas");
    c.width=sw;c.height=sh;
    const g=c.getContext("2d");
    g.imageSmoothingEnabled=false;
    if(sx<0||sy<0||sx+sw>img.naturalWidth||sy+sh>img.naturalHeight)return null;
    g.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
    g.globalCompositeOperation="source-in";
    g.fillStyle=color;g.fillRect(0,0,sw,sh);
    g.globalCompositeOperation="source-over";
    if(map.size>45)map.clear();
    map.set(key,c);return c;
  }
  function part(ctx,img,sx,sy,sw,sh,x,y,w,h,valid=true,opacity=.65){
    const color=valid?"#70c9ff":"#ff817b";
    const c=tinted(img,sx,sy,sw,sh,color);
    if(!c)return false;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=opacity;
    ctx.drawImage(c,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    ctx.restore();return true;
  }
  function frame(ctx,x,y,w,h,valid=true,transparency=.18){
    ctx.save();
    ctx.fillStyle=valid?"rgba(63,176,248,"+transparency+")":"rgba(255,90,81,.24)";
    ctx.fillRect(Math.round(x)+1,Math.round(y)+1,Math.round(w)-2,Math.round(h)-2);
    ctx.setLineDash([5,3]);ctx.lineWidth=2;
    ctx.strokeStyle=valid?"#abe9ff":"#ffc1ae";
    ctx.strokeRect(Math.round(x)+2,Math.round(y)+2,Math.round(w)-4,Math.round(h)-4);
    ctx.setLineDash([]);ctx.restore();
  }
  const homeCache=new WeakMap();
  function tintedHome(sprites,valid){
    if(!good(sprites.roof)||!good(sprites.walls)||!good(sprites.door)||
      !window.TillfolkHouse)return null;
    let entry=homeCache.get(sprites.roof);
    if(!entry){entry={};homeCache.set(sprites.roof,entry);}
    const tone=valid?"blue":"red";
    if(entry[tone])return entry[tone];
    const size=window.TillfolkHouse.dimensions(1);
    const off=document.createElement("canvas");
    off.width=size.width;off.height=size.height;
    const g=off.getContext("2d");
    window.TillfolkHouse.draw(g,{
      roof:sprites.roof,walls:sprites.walls,door:sprites.door
    },0,0,{scale:1});
    g.globalCompositeOperation="source-in";
    g.fillStyle=valid?"#70c9ff":"#ff817b";
    g.fillRect(0,0,off.width,off.height);
    g.globalCompositeOperation="source-over";
    entry[tone]=off;
    return off;
  }
  function home(ctx,sprites,x,y,size=32,valid=true){
    const px=x*size,py=y*size;
    // Silhueta REAL da casa do menu, em vez de blocos falsamente esticados.
    const preview=tintedHome(sprites,valid);
    if(preview){
      const at=window.TillfolkHouse.positionForFootprint(px,py,2*size,2*size,1);
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.64;
      ctx.drawImage(preview,at.x,at.y);
      ctx.restore();
    }
    frame(ctx,px,py,2*size,2*size,valid,.09);
  }
  function field(ctx,sprites,x,y,size=32,valid=true,grown=false){
    const px=x*size,py=y*size;
    frame(ctx,px,py,size,size,valid,.17);
    part(ctx,sprites.dirt,0,80,16,16,px,py,size,size,valid,.55);
    if(grown){
      const image=window.TillfolkCrops?.farmItemImage?.();
      if(!(image?.complete&&image.naturalWidth>=16)||
         !part(ctx,image,0,0,16,16,px+7,py+4,size-14,size-12,valid,.85))
        part(ctx,sprites.crops,0,0,16,16,px+4,py+3,size-8,size-8,valid,.86);
    }
    else{
      ctx.save();ctx.fillStyle=valid?"#d0f3ff":"#ffd3b6";
      ctx.fillRect(px+Math.round(size*.45),py+Math.round(size*.46),5,5);
      ctx.restore();
    }
  }
  function piece(ctx,sprites,layer,x,y,size=32,valid=true,erase=false){
    const px=x*size,py=y*size;
    const ok=valid&&!erase;
    frame(ctx,px,py,size,size,ok,.16);
    const pieces={
      floor:[sprites.walls,16,16,16,16,px,py,size,size],
      walls:[sprites.walls,16,0,16,16,px,py-size,size,size*2],
      roof:[sprites.roof,16,0,16,16,px,py,size,size]
    };
    const args=pieces[layer];
    if(args)part(ctx,...args,ok,.72);
  }
  window.TillfolkBlueprints=Object.freeze({part,frame,home,field,piece});
})();
