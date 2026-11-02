"use strict";
/* Seleção de projetos PENDENTES para cancelar com botão direito.
   Nunca remove construções concluídas, não mexe em materiais ou saves:
   o motor cuida de devolver as entregas e liberar trabalhadores. */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkBlueprintCancel=api;
})(typeof window!=="undefined"?window:null,()=>{
  const orderTypes=Object.freeze({
    field:["till","sow"],home:["buildHome"],station:["buildStation"],
    chest:["buildChest"],well:["buildWell"],rocket:["buildRocket"]
  });
  const footprint=Object.freeze({home:2,rocket:3});
  function matching(orders,layer,x,y){
    const types=orderTypes[layer];
    if(!Array.isArray(orders)||!types||!Number.isInteger(x)||!Number.isInteger(y))return [];
    const size=footprint[layer]||1;
    // Campo cancela ambas as ordens de arar/semear no mesmo tile.
    // Cabana permite cancelar em qualquer um dos 4 tiles;
    // foguete permite cancelar em qualquer tile da fundação 3x3.
    return orders.filter(o=>o&&types.includes(o.type)&&typeof o.id==="string"&&
      Number.isInteger(o.x)&&Number.isInteger(o.y)&&
      x>=o.x&&x<o.x+size&&y>=o.y&&y<o.y+size).map(o=>o.id);
  }
  return Object.freeze({matching});
});
