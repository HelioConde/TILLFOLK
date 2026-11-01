"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
global.window={};
const Autotile=require("../src/terrain-autotile.js");
const Catalog=require("../src/terrain-catalog.js");
require("../src/biomes.js");
require("../src/wild-world.js");
const Biomes=window.TillfolkBiomes,World=window.TillfolkWild;
const wet=(world,x,y)=>world.water.some(p=>p.x===x&&p.y===y);
const sprites=()=>Object.fromEntries(Catalog.TERRAIN_KEYS.map(id=>
  ["terrain_"+id,{complete:true,naturalWidth:176,naturalHeight:112,id}]));
function capture(world,allSprites=sprites()){
  const events=[],ctx={fillStyle:"",
    fillRect(x,y,w,h){events.push({type:"fill",color:this.fillStyle,x,y,w,h});},
    drawImage(image,sx,sy,sw,sh,x,y,w,h){
      events.push({type:"terrain",id:image.id,x,y,w,h,sx,sy,sw,sh});
    }};
  const part=(image,sx,sy,sw,sh,x,y,w,h)=>{
    events.push({type:"base",id:image.id,x,y,w,h,sx,sy});
  };
  World.drawGround(ctx,allSprites,world,world.width,world.height,32,part);
  return events;
}
test("água separa duas ilhas por uma faixa visível; bordas permanecem sobre o rio",()=>{
  const w=9,h=5,world={seed:42,width:w,height:h,objects:[],crossings:[],
    biomeMap:Array.from({length:h},()=>"ggggfffff").join(""),water:[]};
  for(let y=0;y<h;y++)for(const x of [3,4])world.water.push({x,y});
  const events=capture(world);
  const terrains=events.filter(e=>["terrain","base"].includes(e.type));
  assert.ok(terrains.length>0,"os dois terrenos devem continuar desenhados");
  for(const e of terrains)
    assert.equal(wet(world,e.x/32,e.y/32),false,
      "tile do terreno invadiu a faixa de água: "+e.x/32+","+e.y/32);
  const waterTiles=events.filter(e=>e.type==="fill"&&e.color==="#588b8b");
  assert.equal(waterTiles.length,w*0+10,"a água deve ocupar duas colunas inteiras");
  const firstTerrain=events.findIndex(e=>e.type==="terrain");
  const lastWater=events.findLastIndex(e=>e.type==="fill"&&e.color==="#588b8b");
  assert.ok(lastWater<firstTerrain,"água desenhada sobre os cantos do autotile");
  const rightBank=events.find(e=>e.type==="terrain"&&e.x===2*32&&e.y===2*32&&
    e.id==="grassLayer");
  const leftBank=events.find(e=>e.type==="terrain"&&e.x===5*32&&e.y===2*32&&
    e.id==="darkGrassLayer");
  assert.deepEqual([rightBank?.sx,rightBank?.sy],[32,16],
    "a borda leste da ilha deve usar C03_L02 (padrão aprovado)");
  assert.deepEqual([leftBank?.sx,leftBank?.sy],[0,16],
    "a borda oeste da ilha deve usar C01_L02 (padrão aprovado)");
  assert.equal(world.biomeMap,Array.from({length:h},()=>"ggggfffff").join(""),
    "não alterar o tilemap para corrigir a camada da água");
});
test("água não recebe substrato nem terreno quando os atlases não carregaram",()=>{
  const w=6,h=4,world={seed:7,width:w,height:h,objects:[],crossings:[],
    biomeMap:"gggfff".repeat(h),water:[{x:2,y:1},{x:3,y:1}]};
  const events=capture(world,{});
  for(const [x,y] of [[2,1],[3,1]]){
    assert.ok(events.some(e=>e.type==="fill"&&e.x===x*32&&e.y===y*32&&e.color==="#588b8b"));
    assert.ok(!events.some(e=>e.type==="fill"&&e.x===x*32&&e.y===y*32&&
      e.color==="#a4d17c"),"fallback cobriu água com grama");
  }
});
test("geração separa biomas com água real e conserva travessias em 12 mapas",()=>{
 for(const seed of [1,4,13,45,73,143,172,301,719,1129,2026,2170]){
  const world=World.create(seed,192,120),water=new Set(world.water.map(p=>p.y*192+p.x));
  const biomes=new Set(),queue=[[96,60]],seen=new Set(["96,60"]);
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i],id=y*192+x;biomes.add(world.biomeMap[id]);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,k=nx+","+ny;
      if(seen.has(k)||World.blocked(world,nx,ny,192,120))continue;
      seen.add(k);queue.push([nx,ny]);
    }
  }
  assert.deepEqual([...biomes].sort(),["f","g","i","p","s","w"],"bioma isolado seed "+seed);
  for(let y=1;y<119;y++)for(let x=1;x<191;x++){
    const id=y*192+x;
    if(water.has(id))continue;
    for(const offset of [1,192]){
      const other=id+offset;
      if(water.has(other))continue;
      assert.equal(world.biomeMap[id],world.biomeMap[other],
        "ilhas de biomas diferentes estão encostadas sem água no seed "+seed);
    }
  }
  const bridgeTiles=new Set(world.crossings.map(t=>t.y*192+t.x));
  assert.ok(bridgeTiles.size>0,"o rio não pode bloquear toda a exploração");
  assert.ok([...bridgeTiles].every(id=>water.has(id)),"a ponte deve estar sobre água");
 }
});
