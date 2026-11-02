"use strict";
/* Fixtures e2e: pagehide/autosave do TILLFOLK grava o estado corrente no
 * localStorage. Alterar localStorage e chamar reload() diretamente faz a
 * versão antiga do jogo SOBRESCREVER a fixture antes do boot seguinte.
 * O estado preparado é mantido no sessionStorage e restaurado por
 * addInitScript ANTES do motor ler o save. Não modifica código de produção.
 */
const SAVE_KEY="tillfolk-v01";
const SESSION_KEY="tillfolk-session-mode";
const PENDING_KEY="tillfolk-e2e-pending-save";

async function reloadWithSave(page,mutate){
  const state=await page.evaluate(key=>{
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw):null;
  },SAVE_KEY);
  if(!state||!Array.isArray(state.workers)||!Array.isArray(state.plots))
    throw new Error("Não há save de TILLFOLK válido para preparar o teste.");
  if(typeof mutate==="function")await mutate(state);
  // O addInitScript só atua na navegação seguinte, após o pagehide original.
  await page.addInitScript(({saveKey,sessionKey,pendingKey})=>{
    const pending=sessionStorage.getItem(pendingKey);
    if(pending===null)return;
    localStorage.setItem(saveKey,pending);
    localStorage.setItem(sessionKey,"play");
    sessionStorage.removeItem(pendingKey);
  },{saveKey:SAVE_KEY,sessionKey:SESSION_KEY,pendingKey:PENDING_KEY});
  await page.evaluate(([key,data])=>sessionStorage.setItem(key,JSON.stringify(data)),
    [PENDING_KEY,state]);
  await page.reload({waitUntil:"networkidle"});
  return state;
}

module.exports={reloadWithSave,SAVE_KEY};
