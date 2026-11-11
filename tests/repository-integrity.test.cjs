"use strict";
// Auditoria estática do ponto de entrada publicado, sem acessar rede nem tocar nos saves.
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const references=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
  .map(match=>match[1].split(/[?#]/)[0])
  .filter(url=>url&&!/^(?:https?:|\/\/|\/|data:|#)/i.test(url))
  .map(url=>url.replace(/^\.\//,""));
test("scripts e CSS referenciados no HTML existem no repositório",()=>{
  assert.ok(references.length>30,"A auditoria deve cobrir os arquivos do jogo");
  for(const relative of references){
    const absolute=path.resolve(root,relative);
    assert.ok(absolute.startsWith(root+path.sep),"Caminho escapou da raiz: "+relative);
    assert.ok(fs.existsSync(absolute),"Arquivo ausente: "+relative);
  }
});
test("nenhum script ou CSS local é incluído duas vezes",()=>{
  assert.equal(new Set(references).size,references.length);
});
test("licença da arte premium e controle de origem das skills estão presentes",()=>{
  assert.ok(fs.existsSync(path.join(root,"licenses/sprout-lands-premium.txt")));
  const lock=JSON.parse(fs.readFileSync(path.join(root,"skills-lock.json"),"utf8"));
  assert.ok(Object.keys(lock.skills||{}).length>0);
  assert.ok(Object.values(lock.skills).some(skill=>skill.sourceType==="github"),"Registrar a origem das skills externas");
});
