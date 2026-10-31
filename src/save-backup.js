"use strict";
/* TILLFOLK — backup de partidas sem backend. Não altera o formato interno
   legado da chave tillfolk-v01, para preservar saves e migrações atuais. */
(() => {
  const KEY="tillfolk-v01",FORMAT="tillfolk-save",VERSION=1,MAX_BYTES=6*1024*1024;
  const $=id=>document.getElementById(id);
  const status=(message,ok=true)=>{
    const node=$("save-backup-status");
    if(node){node.textContent=message;node.dataset.state=ok?"ok":"error";}
  };
  const finite=(v,min,max)=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const valid=(state)=>{
    if(!state||typeof state!=="object"||Array.isArray(state))return false;
    if(!Array.isArray(state.workers)||state.workers.length<1||state.workers.length>100)return false;
    if(!Array.isArray(state.plots)||state.plots.length>5000)return false;
    // Saves antigos podem não ter "world": o motor reconstrói esse campo ao continuar.
    if(state.world!==undefined){
      if(!state.world||typeof state.world!=="object"||!Array.isArray(state.world.water)||
        !Array.isArray(state.world.objects))return false;
      if(state.world.water.length>5000||state.world.objects.length>10000)return false;
    }
    if(!finite(state.day,0,100000)||!finite(state.coins,0,1e12))return false;
    if(!finite(state.seeds,0,1e9)||!finite(state.water,0,1e9)||!finite(state.food,0,1e9))return false;
    if(state.farmName!==undefined&&
      (typeof state.farmName!=="string"||state.farmName.length>120))return false;
    if(!state.workers.every(w=>w&&Number.isInteger(w.id)&&
      typeof w.name==="string"&&w.name.length<=80&&
      Array.isArray(w.skills)&&Array.isArray(w.neg)&&
      finite(w.x,-1,1000)&&finite(w.y,-1,1000)))return false;
    if(!state.plots.every(p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&
      finite(p.x,0,1000)&&finite(p.y,0,1000)))return false;
    if(state.homes!==undefined&&(!Array.isArray(state.homes)||state.homes.length>1000))return false;
    if(state.orders!==undefined&&(!Array.isArray(state.orders)||state.orders.length>1500))return false;
    if(state.inventory!==undefined&&(!state.inventory||typeof state.inventory!=="object"||
      Object.values(state.inventory).some(n=>typeof n!=="number"||!Number.isFinite(n)||n<0)))return false;
    return true;
  };
  function decode(json){
    if(typeof json!=="string"||json.length>MAX_BYTES)throw new Error("Arquivo inválido ou maior que 6 MB.");
    let data;
    try{data=JSON.parse(json);}catch{throw new Error("O arquivo não contém JSON válido.");}
    if(data?.format===FORMAT){
      if(data.version!==VERSION)throw new Error("Versão de backup não suportada.");
      data=data.state;
    }else if(data?.format||own(data||{},"version")&&own(data||{},"state")){
      throw new Error("Formato de backup desconhecido.");
    }
    if(!valid(data))throw new Error("Partida incompleta ou dados inconsistentes.");
    return data;
  }
  function exportSave(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw)throw new Error("Nenhuma partida salva neste navegador.");
      const state=decode(raw);
      const json=JSON.stringify({format:FORMAT,version:VERSION,
        exportedAt:new Date().toISOString(),state},null,2);
      const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
      const a=document.createElement("a");
      a.href=url;a.download="tillfolk-backup-"+new Date().toISOString().slice(0,10)+".json";
      document.body.append(a);a.click();a.remove();
      // Revoga somente depois da navegação do download.
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      status("Backup exportado. Guarde o arquivo em um local seguro.");
    }catch(error){status(error.message,false);}
  }
  async function importSave(file){
    if(!file)return;
    if(file.size>MAX_BYTES){status("Arquivo excede o limite de 6 MB.",false);return;}
    try{
      const text=await file.text(),state=decode(text);
      const preview=(state.farmName||"Fazenda antiga")+" · "+state.workers.length+" habitantes · dia "+state.day;
      if(!window.confirm("Importar esta partida?\\n"+preview+
        "\\nO salvamento local atual será substituído. Exporte um backup antes de continuar."))return;
      localStorage.setItem(KEY,JSON.stringify(state));
      const continueButton=$("continue");
      if(continueButton)continueButton.disabled=false;
      status("Partida importada. Feche as configurações e use Continuar.");
    }catch(error){status("Importação cancelada: "+error.message,false);}
    finally{const input=$("save-import-file");if(input)input.value="";}
  }
  window.TillfolkSaveBackup=Object.freeze({decode,validate:valid,exportSave,importSave});
  $("save-export")?.addEventListener("click",exportSave);
  $("save-import")?.addEventListener("click",()=>$("save-import-file")?.click());
  $("save-import-file")?.addEventListener("change",e=>importSave(e.target.files?.[0]));
})();
