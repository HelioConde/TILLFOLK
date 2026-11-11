"use strict";
/* Inventory and distribution guard. A missing literal reference does not prove an asset is unused:
   paths may be computed at runtime from species catalogs, seeds or sprite sequences. */
const fs=require("node:fs"),path=require("node:path");
const INVALID_COMMERCIAL=/\.(png|jpe?g|gif|webp|svg|wav|ogg|mp3|ttf|otf|zip|exe|dll|aseprite)$/i;
function walk(folder){
  if(!fs.existsSync(folder))return [];
  const output=[];
  function go(p){
    for(const d of fs.readdirSync(p,{withFileTypes:true})){
      const full=path.join(p,d.name);
      if(d.isDirectory())go(full);
      else if(d.isFile())output.push(full);
    }
  }
  go(folder);return output;
}
function inventory(repoRoot){
  const root=path.resolve(repoRoot),assetRoot=path.join(root,"public","assets");
  const assets=walk(assetRoot),groups={};let bytes=0;
  for(const full of assets){
    const rel=path.relative(assetRoot,full).split(path.sep).join("/");
    const group=rel.split("/")[0],size=fs.statSync(full).size;bytes+=size;
    const item=groups[group]||(groups[group]={count:0,bytes:0});
    item.count++;item.bytes+=size;
  }
  const marketplace=walk(path.join(root,"marketplace"))
    .map(file=>path.relative(root,file).split(path.sep).join("/"));
  const commercialBinary=marketplace.filter(file=>INVALID_COMMERCIAL.test(file));
  const premium=groups["Sprout Lands - Sprites - premium pack"]||{count:0,bytes:0};
  const external=JSON.parse(fs.readFileSync(path.join(root,"skills-lock.json"),"utf8"));
  const imported=Object.keys(external.skills||{}).length;
  const credited=fs.readFileSync(path.join(root,"docs/ASSET_CREDITS.md"),"utf8");
  return {totalAssets:assets.length,bytes,groups,premium,importedSkills:imported,
    commercialBinary,attributionPresent:credited.includes("Cup Nooble"),
    premiumLicensePresent:fs.existsSync(path.join(root,"licenses/sprout-lands-premium.txt"))};
}
function verify(report){
  if(!report.premiumLicensePresent||!report.attributionPresent)
    throw new Error("Créditos ou licença de Sprout Lands estão ausentes");
  if(report.commercialBinary.length)
    throw new Error("Pacote de skill contém arquivos binários de arte/mídia: "+report.commercialBinary.join(", "));
  if(report.importedSkills<1)throw new Error("Origem das skills importadas não identificada");
  return true;
}
if(require.main===module){
  const report=inventory(process.cwd());
  verify(report);
  const summary=Object.entries(report.groups).sort((a,b)=>b[1].count-a[1].count)
    .slice(0,15).map(([name,v])=>({name,files:v.count,bytes:v.bytes}));
  console.log(JSON.stringify({totalAssets:report.totalAssets,bytes:report.bytes,
    premium:report.premium,importedSkills:report.importedSkills,
    commercialBinary:report.commercialBinary,topFolders:summary},null,2));
  console.log("Inventário concluído: remoção de conteúdo requer auditoria de origem/uso.");
}
module.exports={inventory,verify,walk};
