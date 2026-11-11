"use strict";
/* Política pura de retomada; não migra nem grava o conteúdo da partida. */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkSessionPolicy=api;
})(typeof window!=="undefined"?window:null,()=>{
  function setSessionMode(storage,sessionKey,mode,logger){
    try{
      storage.setItem(sessionKey,mode);
      return true;
    }catch(error){
      if(typeof logger==="function")logger("Preferência da sessão indisponível:",error);
      return false;
    }
  }
  function shouldAutoResume(storage,saveKey,sessionKey){
    try{
      // Saves antigos não tinham preferência de sessão: ainda podem reabrir.
      return Boolean(storage.getItem(saveKey))&&storage.getItem(sessionKey)!=="menu";
    }catch{return false;}
  }
  return Object.freeze({setSessionMode,shouldAutoResume});
});
