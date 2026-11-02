"use strict";
/* Sistemas adicionais ONI adaptados ao Tillfolk: rotinas, moral, clima, safra,
   alimento perecível, pesquisa experimental e automação expressamente opt-in. */
(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const SEASONS=Object.freeze(["Primavera","Verão","Outono","Inverno"]);
 const CROP_MINUTES=Object.freeze({
   potato:150,carrot:130,beetroot:150,berry:175,broccoli:230,cauliflower:245,
   celery:175,corn:270,eggplant:255,grape:300,leek:165,lettuce:115,
   onion:160,pepper:250,pumpkin:310,radish:100,tomato:235,wheat:185,bamboo:380
 });
 const TECH=Object.freeze(["Agricultura eficiente","Conservação de alimentos",
   "Rotina de descanso","Ferramentas de transporte"]);
 function season(day){return SEASONS[Math.floor((Math.max(1,day)-1)/7)%4];}
 function weather(day,seed=1){
   const n=Math.abs(Math.sin((day+17)*(seed+37)*.137))%1;
   const s=season(day);
   if(s==="Inverno"&&n<.20)return "frio";
   if(n<.26)return "chuva";
   if(s==="Verão"&&n>.82)return "seca";
   return "limpo";
 }
 const weatherLabels=Object.freeze({chuva:"🌧️ Chuva",frio:"❄️ Frio",
   seca:"☀️ Seca",limpo:"🌤️ Limpo"});
 function normalize(state){
   if(!state||typeof state!=="object")return state;
   const base=state.colonyLife||{};
   // Preserve the state object identity: research() and cost() can call
   // normalize() within the same operation without losing pending changes.
   Object.assign(base,{
     version:1,autoFarm:base.autoFarm===true,
     foodSpoil:clamp(Number(base.foodSpoil)||0,0,1e6),
     researchPoints:Math.max(0,Math.floor(Number(base.researchPoints)||0)),
     researchLevel:clamp(Math.floor(Number(base.researchLevel)||0),0,4),
     lastWeatherDay:Math.max(0,Math.floor(Number(base.lastWeatherDay)||0)),
     lastAnimalBirthDay:Math.max(0,Math.floor(Number(base.lastAnimalBirthDay)||0)),
     lastAutoMinute:Number(base.lastAutoMinute)||0,
     wellProgress:Math.max(0,Number(base.wellProgress)||0)
   });
   state.colonyLife=base;
   for(const worker of state.workers||[]){
     if(!Number.isFinite(worker.energy))worker.energy=100;
     if(!Number.isFinite(worker.morale))worker.morale=75;
     worker.energy=clamp(worker.energy,0,100);
     worker.morale=clamp(worker.morale,0,100);
     worker.resting=worker.resting===true;
     // Todos os turnos disponíveis dormem 8h fixas. Saves antigos com
     // "flex" migram para o turno diurno padrão, sem apagar o trabalhador.
     worker.shift=worker.shift==="night"?"night":"day";
     worker.carryBonus=base.researchLevel>=4?1:0;
   }
   return state.colonyLife;
 }
 function workMultiplier(w){
   return clamp(.72+(w.energy||0)/340+(w.morale||0)/400,.55,1.24);
 }
 // Sono não depende da energia atual: o colono de turno diurno deita
 // às 22h e acorda às 06h, mesmo que tenha dormido com 100% ou esteja
 // cansado ao despertar. Turno noturno alternativo: 08h–16h, também 8h.
 function sleepWindow(worker,minute){
   const hour=((Number(minute)||0)%1440+1440)%1440/60;
   if(worker?.shift==="night")return hour>=8&&hour<16;
   return hour>=22||hour<6;
 }
 function sleepRequired(worker,minute){
   return sleepWindow(worker,minute);
 }
 function advance(state,elapsedMinutes){
   const life=normalize(state),passed=clamp(Number(elapsedMinutes)||0,0,60);
   const currentWeather=weather(state.day,state.world?.seed||1);
   const events=[];
   if(life.lastWeatherDay!==state.day){
     life.lastWeatherDay=state.day;
     events.push("Estação: "+season(state.day)+" · "+weatherLabels[currentWeather]+".");
   }
   for(const w of state.workers||[]){
     // A recuperação só ocorre depois que o trabalhador chega ao repouso.
     const sleeping=w.resting&&w.atRest===true;
     if(sleeping)w.energy=clamp(w.energy+passed*(life.researchLevel>=3?.35:.29),0,100);
     else w.energy=clamp(w.energy-passed*(w.task?.085:.065),0,100);
     const sheltered=state.homes?.some(h=>h.residentId===w.id);
     const target=clamp(65+(sheltered?12:-8)+(w.energy>60?10:-15)-
       (w.satiety<30?28:0)-(currentWeather==="seca"?5:0),0,100);
     w.morale=clamp(w.morale+(target-w.morale)*Math.min(1,passed/280),0,100);
   }
   // Alimentos sem conservação estragam gradualmente; sem valor negativo.
   if(state.mode==="survival"&&(state.food||0)>0){
     const spoilPerDay=life.researchLevel>=2?.025:.065;
     life.foodSpoil+=(state.food||0)*spoilPerDay*passed/1440;
     const lost=Math.min(state.food,Math.floor(life.foodSpoil));
     if(lost>0){
     const ledger=typeof window!=="undefined"?window.TillfolkFoodLedger:null;
     if(ledger){if(!ledger.spend(state,lost))return events;}
     else state.food-=lost;
     life.foodSpoil-=lost;events.push(lost+" alimento(s) estragaram no estoque.");
   }
   }
   // Poços construídos produzem água de forma gradual e limitada,
   // sem teletransportar água da lagoa.
   if((state.wells||[]).length){
     life.wellProgress+=passed*state.wells.length;
     const produced=Math.min(Math.max(0,24-(state.water||0)),
       Math.floor(life.wellProgress/150));
     if(produced>0){
       state.water=(state.water||0)+produced;
       life.wellProgress-=produced*150;
       events.push("Poço: +"+produced+" água disponível para regar.");
     }
     life.wellProgress=Math.min(life.wellProgress,900);
   }
   // Chuva molha os canteiros; não inventa água em baldes.
   if(currentWeather==="chuva"){
     const care=typeof window!=="undefined"?window.TillfolkCropCare:null;
     let irrigated=0;
     for(const plot of state.plots||[])if(plot.seeded&&plot.growth<1){
       if(care){if(care.irrigate(plot))irrigated++;}
       else if(!plot.watered){plot.watered=true;irrigated++;}
     }
     // Evento somente quando algum canteiro efetivamente mudou de etapa.
     // O motor pode então retirar ordens de rega que a chuva já resolveu.
     if(irrigated>0)events.push("Chuva irrigou "+irrigated+" canteiro(s).");
   }
   return events;
 }
 function growthMultiplier(state,crop){
   const level=normalize(state).researchLevel;
   const current=weather(state.day,state.world?.seed||1);
   const weatherFactor=current==="seca"?.68:current==="frio"?.75:current==="chuva"?1.12:1;
   const s=season(state.day);
   // A estação favorável dá um bônus moderado à cultura escolhida; o clima,
   // a fertilidade do solo e a pesquisa continuam influenciando o crescimento.
   const favored=window.TillfolkCrops?.get?.(crop)?.favoredSeason;
   const seasonalMatch=favored===s?1.15:1;
   return weatherFactor*(s==="Inverno"?.88:s==="Primavera"?1.08:1)*
     seasonalMatch*(1+Math.min(level,1)*.12);
 }
 function cropDuration(crop){return CROP_MINUTES[crop]||180;}
 function discover(state,points=1){
   const life=normalize(state);
   life.researchPoints=Math.min(999,life.researchPoints+Math.max(0,points));
 }
 function cost(state){return 5*(normalize(state).researchLevel+1);}
 function researchLock(state){
   const life=normalize(state);
   if(!state.crafting?.station)return "Construa a Work Station primeiro.";
   if(life.researchLevel>=TECH.length)return "Todas as pesquisas já foram concluídas.";
   return window.TillfolkProgression?.researchLock(state,life.researchLevel+1)||null;
 }
 function research(state){
   const life=normalize(state);
   const blocked=researchLock(state);
   if(blocked)return {error:blocked};
   const needed=cost(state);
   if(life.researchPoints<needed)return {error:"São necessários "+needed+" pontos de conhecimento."};
   life.researchPoints-=needed;life.researchLevel++;
   return {name:TECH[life.researchLevel-1],level:life.researchLevel};
 }
 function canAutomate(state,minute){
   const life=normalize(state);
   if(!life.autoFarm)return false;
   if(minute-life.lastAutoMinute<10&&minute>=life.lastAutoMinute)return false;
   life.lastAutoMinute=minute;
   return true;
 }
 function animalBirths(state){
   const life=normalize(state),animals=(state.animals||[]).filter(a=>!a.wild);
   if(animals.length<2||animals.length>=8||state.day-life.lastAnimalBirthDay<9)return 0;
   // Somente fazendas com dois animais adultos reproduzem; nenhum animal mágico surge.
   const first=animals[0],second=animals[1];
   if((first.age||0)<1||(second.age||0)<1)return 0;
   if((state.food||0)<2)return 0;
   const ledger=typeof window!=="undefined"?window.TillfolkFoodLedger:null;
   if(ledger){if(!ledger.spend(state,2))return 0;}
   else state.food-=2;
   state.animals.push({x:first.x+.35,y:first.y+.45,kind:first.kind||"cow",
     wild:false,manure:0,timer:0,age:0});
   life.lastAnimalBirthDay=state.day;
   return 1;
 }
 window.TillfolkColonyLife=Object.freeze({
   normalize,season,weather,weatherLabels,workMultiplier,sleepWindow,sleepRequired,
   advance,growthMultiplier,cropDuration,discover,cost,research,researchLock,canAutomate,animalBirths,TECH
 });
})();