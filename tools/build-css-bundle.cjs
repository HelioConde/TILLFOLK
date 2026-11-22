"use strict";
const fs=require("node:fs"),path=require("node:path");
const LINK=/<link\b[^>]*>/gi;
function bundleCss(siteRoot){
  const root=path.resolve(siteRoot),indexPath=path.join(root,"index.html");
  let html=fs.readFileSync(indexPath,"utf8"),first=true;
  const names=[],chunks=[];
  const updated=html.replace(LINK,tag=>{
    if(!/\brel=["']stylesheet["']/i.test(tag))return tag;
    const found=tag.match(/\bhref=["']([^"']+)["']/i);
    if(!found)return tag;
    const url=found[1].split(/[?#]/)[0];
    if(!/^\.\/[A-Za-z0-9_.-]+\.css$/i.test(url))
      throw new Error("Caminho CSS não compatível com bundle: "+url);
    const name=url.slice(2),file=path.join(root,name);
    if(!fs.existsSync(file))throw new Error("Arquivo CSS ausente: "+name);
    const css=fs.readFileSync(file,"utf8");
    if(/@import\s/i.test(css))throw new Error("CSS com @import requer tratamento explícito: "+name);
    names.push(name);
    chunks.push("/* Source: "+name+" */\n"+css+"\n");
    if(first){first=false;return '<link rel="stylesheet" href="./game.bundle.css">';}
    return "";
  });
  if(names.length<25||names.length!==new Set(names).size)
    throw new Error("Lista CSS incompleta ou repetida: "+names.length);
  fs.writeFileSync(path.join(root,"game.bundle.css"),chunks.join("\n"));
  fs.writeFileSync(indexPath,updated);
  return {names,bytes:Buffer.byteLength(chunks.join("\n")),links:names.length};
}
if(require.main===module){
  const result=bundleCss(process.argv[2]||"_site");
  console.log("CSS bundled:",result.links,"arquivos,",result.bytes,"bytes.");
}
module.exports={bundleCss};
