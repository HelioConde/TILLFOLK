"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
global.window={};
require("../src/biomes.js");
require("../src/wild-world.js");
const Exploration=require("../src/exploration.js");
const World=window.TillfolkWild;
const root=path.resolve(__dirname,"..");
function pngDimensions(filename){
  const bytes=fs.readFileSync(filename);
  assert.equal(bytes.toString("hex",0,8),"89504e470d0a1a0a",filename);
  return {naturalWidth:bytes.readUInt32BE(16),naturalHeight:bytes.readUInt32BE(20)};
}
test("catálogo de 8 espécies possui apenas animações do repositório, 4 direções quando disponíveis",()=>{
  const species=Object.keys(Exploration.ANIMATIONS);
  assert.deepEqual(species.sort(),["bat","bird","chicken","cow","fox","frog","pig","rabbit"]);
  const files=Exploration.spriteSources();
  assert.ok(files.length>=40,"catálogo não contém todas as direções");
  for(const entry of files){
    assert.ok(entry.key.startsWith("wild_"));
    assert.ok(entry.url.startsWith("./public/assets/"));
    assert.ok(!entry.url.includes("FREE%2064%20Tiny%20Animals"),"não reutilizar pack estático");
    const file=path.join(root,decodeURIComponent(entry.url.slice(2)));
    assert.ok(fs.existsSync(file),"ausente: "+file);
    const {naturalWidth,naturalHeight}=pngDimensions(file);
    assert.ok(naturalWidth>=16&&naturalHeight>=16,"PNG muito pequeno: "+file);
  }
});
test("quadros de animação cabem nos atlas sem repetir a spritesheet inteira",()=>{
  const animals=["rabbit","fox","cow","pig","bird","chicken","frog","bat"];
  for(const kind of animals){
    for(const face of ["down","left","right","up"]){
      for(const moving of [false,true]){
        const fake={kind,biome:"g",facing:face,moving,homeX:3,homeY:6};
        const frame=Exploration.spriteFrame(fake,155*2,true);
        assert.ok(Exploration.spriteSources().some(f=>f.key===frame.key),"clip não registrado: "+frame.key);
        const file=Exploration.spriteSources().find(f=>f.key===frame.key);
        const dims=pngDimensions(path.join(root,decodeURIComponent(file.url.slice(2))));
        const rect=Exploration.frameRect(frame,dims);
        assert.ok(rect,"frame inválido para "+frame.key);
        const required=frame.frame.frames===4?4:
          frame.frame.frames===6?6:
          frame.frame.frames==="auto-square"||frame.frame.frames==="auto-16"?2:1;
        const detected=Math.floor(dims.naturalWidth/rect.sw);
        assert.ok(detected>=required,
          "spritesheet sem os quadros declarados: "+frame.key+
          " ("+dims.naturalWidth+"x"+dims.naturalHeight+", "+detected+" quadros)");
        assert.ok(rect.sx>=0&&rect.sy>=0&&rect.sx+rect.sw<=dims.naturalWidth&&
          rect.sy+rect.sh<=dims.naturalHeight,"frame fora do atlas: "+frame.key);
      }
    }
  }
});
test("fauna selvagem tem animação de movimento real e não invade a ilha inicial",()=>{
  const world=World.create(721,192,120);
  const herd=Exploration.spawn(world,world.objects);
  assert.ok(herd.length>=25);
  assert.ok(herd.every(a=>Exploration.ANIMATIONS[a.kind]));
  const startPositions=herd.map(a=>({x:a.x,y:a.y}));
  for(let i=0;i<100;i++)Exploration.step(herd,world,0.3,
    (x,y)=>Boolean(World.at(world,x,y)));
  assert.ok(herd.some((a,i)=>Math.abs(a.x-startPositions[i].x)>.01||
    Math.abs(a.y-startPositions[i].y)>.01),"animais imóveis");
  for(const a of herd){
    assert.equal(Exploration.insideSanctuary(world,Math.floor(a.x),Math.floor(a.y)),false);
    assert.equal(world.biomeMap[Math.floor(a.y)*world.width+Math.floor(a.x)],a.biome);
    assert.equal(World.waterAt(world,Math.floor(a.x),Math.floor(a.y)),false);
  }
});
test("saves antigos convertem espécies estáticas em espécies animadas equivalentes",()=>{
  const old={kind:"penguin",biome:"i",x:10.5,y:12.5,homeX:10,homeY:12,wild:true};
  const adapted=Exploration.normalizedKind(old);
  assert.ok(Exploration.SPECIES.i.includes(adapted));
  const newOld={kind:"fox",biome:"f",homeX:25,homeY:38};
  assert.equal(Exploration.normalizedKind(newOld),"fox");
});
