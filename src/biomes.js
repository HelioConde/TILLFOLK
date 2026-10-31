"use strict";
/* Biomas determinísticos do TILLFOLK. Sem backend e sem dependências externas.
 * O mapa é salvo como uma string compacta (um símbolo por tile).
 */
(()=>{
  const TYPES=Object.freeze({
    g:Object.freeze({id:"g",name:"Grama",color:"#a4d17c",moveCost:1,fertility:1,farmable:true,buildable:true}),
    f:Object.freeze({id:"f",name:"Floresta",color:"#638b57",moveCost:1.12,fertility:1.1,farmable:true,buildable:true}),
    s:Object.freeze({id:"s",name:"Areia",color:"#e2c083",moveCost:1.1,fertility:.65,farmable:true,buildable:true}),
    i:Object.freeze({id:"i",name:"Gelo",color:"#b8dce0",moveCost:1.32,fertility:0,farmable:false,buildable:true}),
    w:Object.freeze({id:"w",name:"Pântano",color:"#63866a",moveCost:1.4,fertility:1.2,farmable:true,buildable:false}),
    p:Object.freeze({id:"p",name:"Veneno",color:"#8b719e",moveCost:1.55,fertility:0,farmable:false,buildable:false})
  });
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  function hash(seed,x,y){
    let n=Math.imul((x|0)+173,374761393)^Math.imul((y|0)+719,668265263)^(seed|0);
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function smooth(seed,x,y){
    const ix=Math.floor(x),iy=Math.floor(y);
    const fx=x-ix,fy=y-iy;
    const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const top=hash(seed,ix,iy)*(1-sx)+hash(seed,ix+1,iy)*sx;
    const bottom=hash(seed,ix,iy+1)*(1-sx)+hash(seed,ix+1,iy+1)*sx;
    return top*(1-sy)+bottom*sy;
  }
  function generate(seed,w,h,legacyRect=null){
    const centers=[
      {id:"s",x:.18,y:.79,r:.32},
      {id:"i",x:.81,y:.18,r:.32},
      {id:"w",x:.79,y:.77,r:.31},
      {id:"p",x:.22,y:.17,r:.28},
      {id:"f",x:.54,y:.17,r:.39}
    ];
    const result=[];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const center=(x+.5)/w,ny=(y+.5)/h;
      const distanceStart=Math.hypot((x-w/2)/1.25,(y-h/2)/1.1);
      if(distanceStart<14||legacyRect&&x<legacyRect.width&&y<legacyRect.height){
        result.push("g");continue;
      }
      const warpX=(smooth(seed+31,x/18,y/18)-.5)*.11,
        warpY=(smooth(seed+71,x/18,y/18)-.5)*.11;
      let best="g",strength=0;
      for(const c of centers){
        const dx=(center+warpX-c.x),dy=(ny+warpY-c.y);
        const dist=Math.hypot(dx,dy)/c.r;
        const score=1-dist;
        if(score>strength){strength=score;best=c.id;}
      }
      // pequenas clareiras naturais entre as regiões
      if(best==="g"&&smooth(seed+271,x/11,y/11)>.69)best="f";
      result.push(best);
    }
    return result.join("");
  }
  function kind(world,x,y){
    const w=world?.width||28,h=world?.height||18;
    if(x<0||y<0||x>=w||y>=h)return "g";
    const ch=world?.biomeMap?.[y*w+x];
    return TYPES[ch]?ch:"g";
  }
  const at=(world,x,y)=>TYPES[kind(world,x,y)];
  const COLORS=Object.freeze(Object.fromEntries(Object.entries(TYPES).map(([k,v])=>[k,v.color])));
  // Cada bioma usa a MESMA grade de cantos aprovada pelo jogador.
  // A máscara fica em cache, preservando a geração e os saves existentes.
  const Autotile=window.TillfolkTerrainAutotile;
  const Catalog=window.TillfolkTerrainCatalog;
  const masksCache=new WeakMap();
  function masksFor(world,w,h){
    if(!world||typeof world!=="object")return null;
    const signature=world.biomeMap;
    const cached=masksCache.get(world);
    if(cached&&cached.signature===signature&&cached.w===w&&cached.h===h)return cached.masks;
    const masks=Object.fromEntries(Object.keys(TYPES).map(id=>
      [id,Array.from({length:h},()=>Array(w).fill(false))]));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const raw=signature?.[y*w+x],id=TYPES[raw]?raw:"g";
      masks[id][y][x]=true;
    }
    masksCache.set(world,{signature,w,h,masks});
    return masks;
  }
  function draw(ctx,sprites,world,w,h,size,part,bounds){
    const x0=clamp(bounds?.x0??0,0,w-1),x1=clamp(bounds?.x1??w-1,0,w-1);
    const y0=clamp(bounds?.y0??0,0,h-1),y1=clamp(bounds?.y1??h-1,0,h-1);
    const ready=Boolean(Autotile&&Catalog&&Catalog.isLoaded(sprites.terrain_grassGround));
    const masks=ready?masksFor(world,w,h):null;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const tile=kind(world,x,y),t=TYPES[tile],px=x*size,py=y*size;
      const v=hash(world.seed||1,x,y),v2=hash((world.seed||1)+17,x,y);
      const atlas=ready?sprites["terrain_"+Catalog.BIOME_ATLAS[tile]]:null;
      if(ready&&Catalog.isLoaded(atlas)){
        // Substrato uniforme sob o recorte transparente: regiões se misturam
        // com a pradaria, evitando quadrados chapados nas bordas.
        part(sprites.terrain_grassGround,16,80,16,16,px,py,size,size);
        Autotile.draw(ctx,atlas,masks[tile],x,y,Catalog.ROLES,px,py,size);
        // Pequenos detalhes dentro do próprio tile, sem pintar blocos opacos.
        if(tile==="i"&&v>.62){
          ctx.fillStyle="#e5f3ef";ctx.fillRect(px+Math.floor(v2*13)+4,py+6,3,2);
        }else if(tile==="w"&&v>.63){
          ctx.fillStyle="#56898c";ctx.fillRect(px+6,py+Math.floor(v2*12)+10,8,2);
        }else if(tile==="p"&&v2>.59){
          ctx.fillStyle="#a57bc4";ctx.fillRect(px+8,py+Math.floor(v*13)+7,3,3);
        }
        continue;
      }
      // Se o atlas ainda não carregou, manter os gráficos antigos funcionais.
      ctx.fillStyle=t.color;ctx.fillRect(px,py,size,size);
      if(tile==="g"||tile==="f"||tile==="w"){
        if(sprites.grass&&sprites.grass.complete&&sprites.grass.naturalWidth){
          part(sprites.grass,Math.floor(v*6)*16,80,16,16,px,py,size,size);
          if(tile!=="g"){
            ctx.fillStyle=tile==="f"?"#30583a66":"#35544599";
            ctx.fillRect(px,py,size,size);
          }
        }
      }
      if(tile==="s"){
        ctx.fillStyle=v>.5?"#caa569":"#f2d398";
        ctx.fillRect(px+Math.floor(v2*16),py+7,7,2);
        if(v>.76){ctx.fillRect(px+10,py+21,12,2);}
      }else if(tile==="i"){
        ctx.fillStyle="#eef9ed";ctx.fillRect(px+4,py+Math.floor(v2*15),15,3);
        if(v>.65){ctx.fillStyle="#83b9c5";ctx.fillRect(px+23,py+23,6,2);}
      }else if(tile==="w"){
        if(v>.46){ctx.fillStyle="#436d74";ctx.fillRect(px+5,py+20,22,4);}
        if(v2>.73){ctx.fillStyle="#a9b67a";ctx.fillRect(px+20,py+8,4,7);}
      }else if(tile==="p"){
        ctx.fillStyle=v>.5?"#4e827780":"#6b438980";
        ctx.fillRect(px+4,py+Math.floor(v2*17),18,5);
        if(v2>.68){ctx.fillStyle="#c2dc81";ctx.fillRect(px+20,py+20,4,3);}
      }else if(tile==="f"){
        if(v>.72){ctx.fillStyle="#4b7342";ctx.fillRect(px+9,py+7,7,4);}
      }else if(v>.93){
        ctx.fillStyle="#e4eea8";ctx.fillRect(px+9,py+12,2,2);
      }
    }
  }
  window.TillfolkBiomes=Object.freeze({TYPES,COLORS,generate,kind,at,draw});
})();
