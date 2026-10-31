"use strict";
// Verifica a revisão publicada pelo Pages, sem service worker ou backend.
// Uma partida ativa nunca é substituída sem o jogador solicitar.
(()=>{
  const current=document.querySelector('meta[name="tillfolk-build"]')?.content||"dev";
  const notice=document.querySelector("#live-update-notice");
  const button=document.querySelector("#live-update-reload");
  const message=document.querySelector("#live-update-message");
  if(!notice||!button||!message)return;
  let pending=null,checking=false,automatic=null;
  const isPlaying=()=>document.body.classList.contains("play-session");
  const cancelAutomatic=()=>{if(automatic!==null){clearTimeout(automatic);automatic=null;}};
  function applyUpdate(){
    if(!pending)return false;
    cancelAutomatic();
    if(isPlaying()&&window.TillfolkPrepareUpdate?.()!==true){
      message.textContent="Não foi possível salvar a partida. Verifique o armazenamento antes de atualizar.";
      notice.hidden=false;
      return false;
    }
    const target=new URL(location.href);
    target.searchParams.set("_v",pending.slice(0,12));
    location.replace(target.href);
    return true;
  }
  function scheduleMenuReload(){
    cancelAutomatic();
    if(!pending||isPlaying()||document.hidden||document.querySelector("dialog[open]"))return;
    // No menu a atualização é automática; uma partida em curso exige clique.
    automatic=setTimeout(()=>{
      automatic=null;
      if(pending&&!isPlaying()&&!document.hidden&&!document.querySelector("dialog[open]"))
        applyUpdate();
    },3000);
  }
  function display(version){
    if(version===current||version===pending)return;
    pending=version;
    message.textContent=isPlaying()?
      "Nova versão disponível. Sua fazenda será salva antes da atualização.":
      "Nova versão disponível. Atualizando o menu em instantes…";
    notice.hidden=false;
    scheduleMenuReload();
  }
  async function checkForUpdates(){
    if(checking||document.hidden||!navigator.onLine)return;
    checking=true;
    try{
      const url=new URL("./version.json",document.baseURI);
      url.searchParams.set("_t",String(Date.now()));
      const response=await fetch(url.href,{cache:"no-store"});
      if(!response.ok)return;
      const data=await response.json();
      if(typeof data.version==="string"&&/^[a-zA-Z0-9._-]{3,80}$/.test(data.version))
        display(data.version);
    }catch{
      // Offline ou deploy em andamento: a sessão continua sem interrupção.
    }finally{checking=false;}
  }
  button.addEventListener("click",applyUpdate);
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden)cancelAutomatic();
    else{checkForUpdates();scheduleMenuReload();}
  });
  window.addEventListener("focus",checkForUpdates);
  window.addEventListener("online",checkForUpdates);
  window.TillfolkLiveUpdate=Object.freeze({checkForUpdates,applyUpdate});
  checkForUpdates();
  setInterval(checkForUpdates,12000);
})();
