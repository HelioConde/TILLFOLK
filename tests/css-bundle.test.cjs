"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {bundleCss}=require("../tools/build-css-bundle.cjs");
test("bundle preserva a ordem original das 34 folhas e URLs relativas",()=>{
  const root=path.resolve(__dirname,".."),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tillfolk-css-"));
  try{
    const original=fs.readFileSync(path.join(root,"index.html"),"utf8");
    fs.writeFileSync(path.join(tmp,"index.html"),original);
    const names=[...original.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']\.\/([^"'?]+\.css)/gi)]
      .map(match=>match[1]);
    assert.equal(names.length,34);
    for(const name of names)fs.copyFileSync(path.join(root,name),path.join(tmp,name));
    const report=bundleCss(tmp);
    assert.deepEqual(report.names,names);
    const css=fs.readFileSync(path.join(tmp,"game.bundle.css"),"utf8");
    const index=fs.readFileSync(path.join(tmp,"index.html"),"utf8");
    assert.equal((index.match(/<link\b[^>]*\brel=["']stylesheet["']/g)||[]).length,1);
    assert.match(index,/href="\.\/game\.bundle\.css"/);
    let last=-1;
    for(const name of names){
      const marker="/* Source: "+name+" */";
      assert.ok(css.indexOf(marker)>last,"Ordem original preservada: "+name);
      last=css.indexOf(marker);
    }
    assert.match(css,/public\/assets\//);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
