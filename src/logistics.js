"use strict";
/* Logística física TILLFOLK: nenhum recurso é criado no depósito ao coletar.
   Pilhas no solo, baús e entregas de obra persistem em localStorage. */
(()=>{
  const COSTS=Object.freeze({
    buildStation:Object.freeze({twigs:10}),
    buildHome:Object.freeze({wood:8}),
    buildChest:Object.freeze({twigs:8,grass:3}),
    buildWell:Object.freeze({wood:4,stone:3})
  });
  // Frame único 16x16 do pacote já incluído. O arquivo anterior era um atlas
  // e o recorte 0,0 nem sempre correspondia ao baú fechado visível.
  const CHEST_SPRITE="./public/assets/assets_premium_preview/objects/chests/chest_01/PREMIUM_chest_01_closed_16x16.png";
  const STORAGE_RADIUS=10; // raio de coleta local; nunca varrer os seis biomas automaticamente
  const normalize=state=>{
    state.groundItems=Array.isArray(state.groundItems)?state.groundItems.filter(i=>
      i&&Number.isFinite(i.x)&&Number.isFinite(i.y)&&typeof i.kind==="string"&&i.qty>0):[];
    state.chests=Array.isArray(state.chests)?state.chests.filter(i=>
      i&&Number.isInteger(i.x)&&Number.isInteger(i.y)).map(c=>({
        x:c.x,y:c.y,items:c.items&&typeof c.items==="object"?c.items:{},
        // Saves antigos sem este campo permanecem com o depósito acessível,
        // mas SEM coleta automática inesperada.
        autoCollect:c.autoCollect===true
      })):[];
    state.nextDropId=Math.max(1,Number(state.nextDropId)||1,...state.groundItems.map(i=>(Number(i.id)||0)+1));
    return state;
  };
  const drop=(state,x,y,kind,qty=1)=>{
    normalize(state);qty=Math.floor(Number(qty)||0);if(qty<=0)return null;
    const found=state.groundItems.find(item=>item.kind===kind&&item.x===x&&item.y===y);
    if(found){found.qty+=qty;return found;}
    const item={id:state.nextDropId++,x,y,kind,qty};state.groundItems.push(item);return item;
  };
  const capacity=worker=>{
    const red=Math.min(3,worker?.neg?.length||0);
    const skill=worker?.skills?.includes("carry");
    // 1 unidade sem logística; transportadores especialistas fazem viagens maiores.
    return skill?Math.min(12,(worker.skills.length===1?4:worker.skills.length===2?3:2)+red+(worker.carryBonus||0)):1+(worker.carryBonus||0);
  };
  const costFor=order=>{
    if(order.type==="craftTool")return window.TillfolkCrafting?.recipe(order.recipe)?.cost||{};
    if(order.type==="buildRocket")return window.TillfolkSpace?.stageCost(order.stage)||{};
    return COSTS[order.type]||{};
  };
  function available(state,kind){
    normalize(state);
    return (Number(state.inventory?.[kind])||0)+
      state.chests.reduce((n,ch)=>n+(Number(ch.items[kind])||0),0)+
      state.groundItems.reduce((n,d)=>n+(d.kind===kind?d.qty:0),0);
  }
  const remaining=(order,cost=costFor(order))=>Object.fromEntries(
    Object.entries(cost).map(([kind,qty])=>[kind,Math.max(0,qty-(order.delivered?.[kind]||0))])
      .filter(([,qty])=>qty>0));
  const complete=order=>Object.keys(remaining(order)).length===0;
  function sources(state,kind){
    normalize(state);
    const found=state.groundItems.filter(i=>i.kind===kind&&i.qty>0)
      .map(i=>({type:"ground",id:i.id,x:i.x,y:i.y,qty:i.qty}));
    for(const c of state.chests)if((c.items[kind]||0)>0)
      found.push({type:"chest",x:c.x,y:c.y,qty:c.items[kind]});
    if((state.inventory?.[kind]||0)>0)
      found.push({type:"stock",x:Math.floor(state.spawn?.x||40),y:Math.floor(state.spawn?.y||25),qty:state.inventory[kind]});
    return found;
  }
  function plan(state,order,worker){
    const needs=remaining(order);
    const candidates=[];
    for(const [kind,needed] of Object.entries(needs)){
      for(const source of sources(state,kind)){
        const distance=Math.abs(worker.x-(source.x+.5))+Math.abs(worker.y-(source.y+.5));
        candidates.push({source,kind,qty:Math.min(capacity(worker),needed,source.qty),distance});
      }
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const best=candidates[0];if(!best)return null;
    return {orderId:order.id,phase:"fetch",source:best.source,kind:best.kind,
      qty:best.qty,limit:Math.min(capacity(worker),needs[best.kind]),
      cargo:0,destination:{x:order.x,y:order.y}};
  }
  function collect(state,job){
    normalize(state);
    let amount=0;
    if(job.source.type==="ground"){
      const item=state.groundItems.find(i=>i.id===job.source.id);
      if(item){amount=Math.min(item.qty,job.qty);item.qty-=amount;}
      state.groundItems=state.groundItems.filter(i=>i.qty>0);
    }else if(job.source.type==="chest"){
      const chest=state.chests.find(c=>c.x===job.source.x&&c.y===job.source.y);
      if(chest){amount=Math.min(chest.items[job.kind]||0,job.qty);chest.items[job.kind]-=amount;}
    }else{
      amount=Math.min(state.inventory?.[job.kind]||0,job.qty);
      if(amount)state.inventory[job.kind]-=amount;
    }
    job.qty=amount;return amount;
  }
  function deliver(state,order,job){
    if(job.qty<=0)return 0;
    if(order){
      order.delivered=order.delivered||{};
      order.delivered[job.kind]=(order.delivered[job.kind]||0)+job.qty;
    }else{
      const chest=state.chests.find(c=>c.x===job.destination.x&&c.y===job.destination.y);
      if(!chest){drop(state,job.destination.x,job.destination.y,job.kind,job.qty);return 0;}
      chest.items[job.kind]=(chest.items[job.kind]||0)+job.qty;
    }
    return job.qty;
  }
  // Só baús CONCLUÍDOS que o jogador ativou explicitamente aceitam coleta.
  // Blueprints existem em orders, não em chests, e nunca viram depósitos.
  const storageEnabled=(state,destination)=>Boolean(
    (state?.chests||[]).some(c=>c.x===destination?.x&&c.y===destination?.y&&c.autoCollect===true));
  function planStorage(state,worker){
    normalize(state);
    const enabled=state.chests.filter(c=>c.autoCollect===true);
    if(!enabled.length)return null;
    // Seleciona um par fonte->baú dentro do raio. Fora desse limite os
    // materiais permanecem no chão até o jogador montar outro depósito.
    const options=[];
    for(const chest of enabled)for(const item of state.groundItems){
      if(item.qty<=0)continue;
      const distanceToChest=Math.abs(item.x-chest.x)+Math.abs(item.y-chest.y);
      if(distanceToChest>STORAGE_RADIUS)continue;
      const distanceToWorker=Math.abs(worker.x-item.x)+Math.abs(worker.y-item.y);
      options.push({chest,item,distanceToWorker,distanceToChest});
    }
    options.sort((a,b)=>a.distanceToWorker-b.distanceToWorker||
      a.distanceToChest-b.distanceToChest);
    const picked=options[0];
    if(!picked)return null;
    const {chest,item}=picked;
    return {orderId:null,phase:"fetch",kind:item.kind,
      qty:Math.min(capacity(worker),item.qty),limit:capacity(worker),cargo:0,
      source:{type:"ground",id:item.id,x:item.x,y:item.y},
      destination:{x:chest.x,y:chest.y}};
  }
  function refund(state,order){
    for(const [kind,qty] of Object.entries(order?.delivered||{}))
      drop(state,order.x,order.y,kind,qty);
    if(order)order.delivered={};
  }
  window.TillfolkLogistics=Object.freeze({
    COSTS,CHEST_SPRITE,STORAGE_RADIUS,normalize,drop,capacity,costFor,available,remaining,complete,
    sources,plan,collect,deliver,planStorage,storageEnabled,refund
  });
})();