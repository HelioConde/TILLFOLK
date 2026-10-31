"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"terrain-editor.html"),"utf8");

test("editor de terrain tem script local e JavaScript inline válido",()=>{
  assert.match(html,/<script src="\.\/src\/terrain-autotile\.js"><\/script>/);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(Boolean);
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new vm.Script(scripts[0],{filename:"terrain-editor.html"}));
});
test("editor cobre 3×3, cantos internos, desenho e exportação",()=>{
  for(const selector of ['id="main-roles"','id="inner-roles"','id="atlas"','id="preview"',
                         'id="sample-corners"','id="download"','id="import"','id="copy"']){
    assert.ok(html.includes(selector),selector);
  }
  assert.match(html,/sample\("corners"\)/);
  assert.match(html,/A\.MAIN/);
  assert.match(html,/A\.INNER/);
  assert.match(html,/A\.resolve|A\.draw/);
  assert.match(html,/localStorage/);
  assert.match(html,/tillfolk-grass-tile-layers-mapping-v1/);
});
test("sprite está disponível mesmo offline, sem CDN ou banco",()=>{
  const match=html.match(/const EMBEDDED="data:image\/png;base64,([^"]+)"/);
  assert.ok(match,"sprite PNG RGBA embutido");
  const png=Buffer.from(match[1],"base64");
  assert.equal(png.toString("hex",0,8),"89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16),176);
  assert.equal(png.readUInt32BE(20),112);
  assert.doesNotMatch(html,/https?:\/\/(?:cdn|unpkg|jsdelivr)/i);
});
