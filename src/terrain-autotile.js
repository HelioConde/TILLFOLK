"use strict";
/* TILLFOLK: autotile de terreno com vizinhança de oito direções.
 * Editor e jogo podem reutilizar a mesma seleção dos sprites 16×16.
 * O atlas não é modificado; nenhum tile é rotacionado automaticamente.
 */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkTerrainAutotile=api;
})(typeof window!=="undefined"?window:null,()=>{
  const SIZE=16, COLS=11, ROWS=7;
  const MAIN=Object.freeze([
    "canto_noroeste","borda_norte","canto_nordeste",
    "borda_oeste","centro","borda_leste",
    "canto_sudoeste","borda_sul","canto_sudeste"
  ]);
  const INNER=Object.freeze([
    "interno_noroeste","interno_nordeste","interno_sudoeste","interno_sudeste"
  ]);
  const EXTRA=Object.freeze([
    "isolado","horizontal","vertical",
    "ponta_norte","ponta_leste","ponta_sul","ponta_oeste"
  ]);
  const ROLES=Object.freeze([...MAIN,...INNER,...EXTRA]);
  function coords(id){
    const match=/^C(\d{2})_L(\d{2})$/.exec(String(id||""));
    if(!match)return null;
    const col=Number(match[1]),row=Number(match[2]);
    if(col<1||col>COLS||row<1||row>ROWS)return null;
    return {x:(col-1)*SIZE,y:(row-1)*SIZE,col,row};
  }
  function has(map,x,y){
    return x>=0&&y>=0&&x<(map[0]?.length||0)&&y<map.length&&Boolean(map[y]?.[x]);
  }
  function roleAt(map,x,y){
    if(!has(map,x,y))return {role:null,inner:[]};
    const n=has(map,x,y-1),e=has(map,x+1,y),s=has(map,x,y+1),w=has(map,x-1,y);
    const cardinal=[n,e,s,w].filter(Boolean).length;
    let role="centro";
    if(cardinal===0)role="isolado";
    else if(cardinal===1)role=n?"ponta_norte":e?"ponta_leste":s?"ponta_sul":"ponta_oeste";
    else if(n&&s&&!e&&!w)role="vertical";
    else if(e&&w&&!n&&!s)role="horizontal";
    else if(!n&&!w)role="canto_noroeste";
    else if(!n&&!e)role="canto_nordeste";
    else if(!s&&!w)role="canto_sudoeste";
    else if(!s&&!e)role="canto_sudeste";
    else if(!n)role="borda_norte";
    else if(!e)role="borda_leste";
    else if(!s)role="borda_sul";
    else if(!w)role="borda_oeste";
    const inner=[];
    // Canto interno = diagonais vazias com os dois vizinhos cardinais presentes.
    if(n&&w&&!has(map,x-1,y-1))inner.push("interno_noroeste");
    if(n&&e&&!has(map,x+1,y-1))inner.push("interno_nordeste");
    if(s&&w&&!has(map,x-1,y+1))inner.push("interno_sudoeste");
    if(s&&e&&!has(map,x+1,y+1))inner.push("interno_sudeste");
    return {role,inner};
  }
  function resolve(map,x,y,assigned={}){
    const {role,inner}=roleAt(map,x,y);
    if(!role)return {role:null,primary:null,overlays:[],missing:[],usedFallback:false};
    const missing=[];
    // Nunca apresentar um sprite alternativo como se fosse a peça exata.
    // Fallback centro é explicitamente sinalizado para o editor.
    let primary=coords(assigned[role])?assigned[role]:null;
    const usedFallback=!primary&&Boolean(coords(assigned.centro));
    if(!primary){
      missing.push(role);
      if(usedFallback)primary=assigned.centro;
    }
    const overlays=[];
    for(const key of inner){
      if(coords(assigned[key]))overlays.push(assigned[key]);
      else missing.push(key);
    }
    return {role,primary,overlays,inner,missing,usedFallback};
  }
  function draw(ctx,atlas,map,x,y,assigned={},dx=x*SIZE,dy=y*SIZE,drawSize=SIZE){
    const result=resolve(map,x,y,assigned);
    if(!result.role||!atlas?.complete||!atlas.naturalWidth)return result;
    const stamp=id=>{
      const at=coords(id);
      if(at)ctx.drawImage(atlas,at.x,at.y,SIZE,SIZE,dx,dy,drawSize,drawSize);
    };
    stamp(result.primary);
    for(const id of result.overlays)stamp(id);
    return result;
  }
  function exportConfig(assigned={}){
    const roles={};
    for(const key of ROLES)roles[key]=coords(assigned[key])?assigned[key]:null;
    return {schema:"tillfolk-terrain-autotile/v1",terrain:"grass",atlas:"Grass_Tile_Layers.png",
      tileSize:SIZE,atlasColumns:COLS,atlasRows:ROWS,neighbors:8,
      method:"cardinal + complementary inner corners",roles};
  }
  return Object.freeze({SIZE,COLS,ROWS,MAIN,INNER,EXTRA,ROLES,coords,has,roleAt,resolve,draw,exportConfig});
});
