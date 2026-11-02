"use strict";
/* Backup local TILLFOLK: JSON verificável e importação em duas fases.
   Não depende de servidor. O estado importado fica TEMPORARIAMENTE em
   sessionStorage para sobreviver ao pagehide/autosave da partida anterior.
   Antes de iniciar o jogo após reload, ele substitui o save antigo.
 */
((root,factory)=>{
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root){
   root.TillfolkSaveBackup=api;
   api.restorePending();
   root.document?.addEventListener("DOMContentLoaded",api.attach);
 }
})(typeof window!=="undefined"?window:null,root=>{
 const SAVE_KEY="tillfolk-v01",SESSION_KEY="tillfolk-session-mode";
 const PENDING_KEY="tillfolk-import-staged-v1";
 const FORMAT="tillfolk-save-backup/v1",MAX_BYTES=15*1024*1024;
 let exportedThisSession=false;
 function assertState(state){
   if(!state||typeof state!=="object"||Array.isArray(state))throw Error("Arquivo não contém uma partida válida.");
   if(!Array.isArray(state.workers)||state.workers.length>100||
      !state.workers.every(w=>w&&typeof w==="object"&&!Array.isArray(w)))
      throw Error("Lista de colonos inválida.");
   if(!Array.isArray(state.plots)||state.plots.length<1||state.plots.length>50000||
      !state.plots.every(p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)))
      throw Error("Mapa ou canteiros inválidos.");
   if(!Number.isInteger(state.day)||state.day<1||state.day>10000000)
      throw Error("Dia da partida inválido.");
   if(!Number.isFinite(state.minutes)||state.minutes<0||state.minutes>=1440)
      throw Error("Horário da partida inválido.");
   if(state.world!==undefined&&state.world!==null&&
      (typeof state.world!=="object"||Array.isArray(state.world)))
      throw Error("Mundo da partida inválido.");
   if(state.orders!==undefined&&(!Array.isArray(state.orders)||state.orders.length>1500))
      throw Error("Ordens da colônia inválidas.");
   return state;
 }
 function encode(state){
   assertState(state);
   return JSON.stringify({format:FORMAT,exportedAt:new Date().toISOString(),
     game:"TILLFOLK",state});
 }
 function decode(text){
   if(typeof text!=="string"||!text.length||text.length>MAX_BYTES)
     throw Error("Arquivo vazio ou maior que 15 MB.");
   let value;
   try{value=JSON.parse(text);}catch{throw Error("O arquivo não contém JSON válido.");}
   if(value&&value.format!==undefined&&value.format!==FORMAT)
     throw Error("Formato de backup não reconhecido.");
   const state=value?.format===FORMAT?value.state:value;
   assertState(state);return state;
 }
 function restorePending(){
   if(!root?.sessionStorage||!root?.localStorage)return false;
   const staged=root.sessionStorage.getItem(PENDING_KEY);
   if(staged===null)return false;
   try{
     const imported=decode(staged);
     root.localStorage.setItem(SAVE_KEY,JSON.stringify(imported));
     root.localStorage.setItem(SESSION_KEY,"play");
     return true;
   }catch(error){
     root.console?.warn?.("Falha ao importar o backup; save anterior preservado:",error);
     return false;
   }finally{
     root.sessionStorage.removeItem(PENDING_KEY);
   }
 }
 function attach(){
   const download=root.document.getElementById("game-backup-download");
   const file=root.document.getElementById("game-backup-import");
   const status=root.document.getElementById("game-backup-status");
   if(!download||!file||!status)return;
   const say=(message,isError=false)=>{
     status.textContent=message;status.dataset.error=String(isError);
   };
   download.addEventListener("click",()=>{
     try{
       const raw=root.localStorage.getItem(SAVE_KEY);
       if(!raw)throw Error("Nenhuma partida salva para exportar.");
       const content=encode(decode(raw));
       const name=(JSON.parse(raw).farmName||"tillfolk").toString()
         .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
         .toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,42)||"tillfolk";
       const blob=new Blob([content],{type:"application/json"});
       const url=root.URL.createObjectURL(blob);
       const link=root.document.createElement("a");
       link.href=url;link.download=name+"-backup.json";
       root.document.body.append(link);link.click();link.remove();
       root.setTimeout(()=>root.URL.revokeObjectURL(url),1500);
       exportedThisSession=true;
       say("Backup JSON solicitado. Guarde o arquivo fora deste navegador.");
     }catch(error){say(error.message,true);}
   });
   file.addEventListener("change",async()=>{
     const selected=file.files?.[0];
     if(!selected)return;
     try{
       if(selected.size>MAX_BYTES)throw Error("Arquivo maior que 15 MB.");
       const data=decode(await selected.text());
       const current=root.localStorage.getItem(SAVE_KEY);
       if(current&&!exportedThisSession){
         throw Error("Baixe o backup da partida atual antes de substituí-la.");
       }
       const question="Substituir a partida atual por "+
         (typeof data.farmName==="string"?data.farmName:"uma partida importada")+
         ", dia "+data.day+"? O progresso atual será substituído.";
       if(!root.confirm(question)){say("Importação cancelada; sua partida não foi alterada.");return;}
       // Importar no meio de uma página rodando seria sobrescrito pelo
       // save() no pagehide. staging -> reload -> restorePending -> readSave.
       root.sessionStorage.setItem(PENDING_KEY,JSON.stringify(data));
       say("Backup verificado. Reabrindo a partida importada...");
       root.location.reload();
     }catch(error){say(error.message,true);}
     finally{file.value="";}
   });
 }
 return Object.freeze({SAVE_KEY,FORMAT,MAX_BYTES,assertState,encode,decode,restorePending,attach});
});
