"use strict";
/* Após o tutorial, usar os objetivos REAIS da Jornada para orientar a colônia.
 * Somente leitura: não cria ordens, recompensas nem altera o save. */
((root,factory)=>{
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkFirstVillage=api;
})(typeof window!=="undefined"?window:null,()=>{
 function next(state,progression,limit=3){
   if(!state||!progression?.OBJECTIVES||typeof progression.read!=="function")return [];
   const maximum=Math.max(0,Math.min(5,Math.floor(Number(limit)||0)));
   if(!maximum)return [];
   // Missões já completadas são avaliadas pelo estado vivo. Não depende da
   // próxima atualização da pesquisa/diário nem concede pontos antecipados.
   const pending=progression.OBJECTIVES.filter(objective=>
     !progression.read(state,objective.id));
   if(!pending.length)return [];
   const chapter=pending[0].chapter;
   const chosen=pending.filter(objective=>objective.chapter===chapter);
   // Limitar ao capítulo atual evita que a primeira vitória já mande o
   // jogador construir foguete ou sair para continentes distantes.
   return chosen.slice(0,maximum).map(o=>Object.freeze({
     id:o.id,title:o.title,hint:o.hint,chapter:o.chapter
   }));
 }
 function render(state,progression,element){
   if(!element)return [];
   const goals=next(state,progression,3);
   element.replaceChildren();
   const doc=element.ownerDocument;
   if(!goals.length){
     const item=doc.createElement("li");
     item.textContent="Todas as metas da Jornada foram concluídas!";
     element.append(item);return goals;
   }
   for(const goal of goals){
     const item=doc.createElement("li");
     const heading=doc.createElement("strong");
     const description=doc.createElement("span");
     heading.textContent=goal.title;
     description.textContent=goal.hint;
     item.append(heading,description);
     element.append(item);
   }
   return goals;
 }
 return Object.freeze({next,render});
});
