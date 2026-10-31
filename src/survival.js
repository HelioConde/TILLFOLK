"use strict";
(() => {
  const MAX_METER = 100;
  const HUNGRY_THRESHOLD = 30;
  const WARNING_THRESHOLD = 50;
  const MEAL_SATIETY = 70;
  const SATIETY_LOSS_PER_DAY = 70;
  const HEALTH_LOSS_PER_STARVING_DAY = 10;
  const STARVATION_GRACE_MINUTES = 1440;
  const MINUTES_PER_DAY = 1440;

  const clampMeter = value => Math.max(0, Math.min(MAX_METER, value));
  const hungerState = satiety => satiety <= 0 ? "starving" :
    satiety < HUNGRY_THRESHOLD ? "hungry" : "fed";

  function normalizeWorker(worker, day = 1) {
    worker.satiety = Number.isFinite(worker.satiety) ?
      clampMeter(worker.satiety) : MAX_METER;
    worker.health = Number.isFinite(worker.health) ?
      clampMeter(worker.health) : MAX_METER;
    worker.hungerState = hungerState(worker.satiety);
    worker.starvationMinutes=worker.satiety<=0&&Number.isFinite(worker.starvationMinutes)?
      Math.max(0,worker.starvationMinutes):0;
    worker.lastMealDay = Number.isInteger(worker.lastMealDay) && worker.lastMealDay > 0 ?
      worker.lastMealDay : Math.max(1, Number.isInteger(day) ? day : 1);
    return worker;
  }

  function normalizeFood(value) {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  function advance(state, elapsedMinutes) {
    if (state?.mode !== "survival" || !Array.isArray(state.workers)) return [];
    const minutes = Number.isFinite(elapsedMinutes) ? Math.max(0, elapsedMinutes) : 0;
    if (!minutes) return [];

    const events = [];
    const satietyPerMinute = SATIETY_LOSS_PER_DAY / MINUTES_PER_DAY;
    const healthPerMinute = HEALTH_LOSS_PER_STARVING_DAY / MINUTES_PER_DAY;

    for (const worker of state.workers) {
      normalizeWorker(worker, state.day);
      const previousState = worker.hungerState;
      const previousHealth = worker.health;
      const previousStarvationMinutes=worker.starvationMinutes;
      const starvingMinutes = Math.max(0, minutes - worker.satiety / satietyPerMinute);
      worker.satiety = clampMeter(worker.satiety - satietyPerMinute * minutes);
      worker.hungerState = hungerState(worker.satiety);
      worker.starvationMinutes=worker.satiety<=0?previousStarvationMinutes+starvingMinutes:0;

      const damageMinutes=Math.max(0,worker.starvationMinutes-STARVATION_GRACE_MINUTES)-
        Math.max(0,previousStarvationMinutes-STARVATION_GRACE_MINUTES);
      if (state.food <= 0 && damageMinutes > 0) {
        worker.health = clampMeter(worker.health - healthPerMinute * damageMinutes);
      }

      if (previousState === "fed" && worker.satiety <= WARNING_THRESHOLD) {
        events.push({type:"warning",worker});
      }
      if (previousState !== worker.hungerState) {
        events.push({
          type: worker.hungerState === "hungry" ? "hungry" :
            worker.hungerState === "starving" ? "starving" : "fed",
          worker
        });
      }
      if (previousHealth > 50 && worker.health <= 50) events.push({type:"weak",worker});
      if (previousHealth > 20 && worker.health <= 20) events.push({type:"critical",worker});
    }

    return events;
  }

  function tryEat(state, worker) {
    if (state?.mode !== "survival" || !Array.isArray(state.workers) ||
      !state.workers.includes(worker) || normalizeFood(state.food) < 1) return false;
    normalizeWorker(worker, state.day);
    if (worker.hungerState === "fed") return false;

    state.food = normalizeFood(state.food) - 1;
    worker.satiety = clampMeter(worker.satiety + MEAL_SATIETY);
    worker.starvationMinutes=0;
    worker.lastMealDay = Math.max(1, Number.isInteger(state.day) ? state.day : 1);
    worker.hungerState = hungerState(worker.satiety);
    return true;
  }

  function workMultiplier(worker) {
    normalizeWorker(worker);
    if (worker.health <= 20) return 0.5;
    if (worker.satiety <= 0) return 0.75;
    if (worker.health < 50 || worker.satiety < HUNGRY_THRESHOLD) return 0.75;
    return 1;
  }

  function getStats(state) {
    const workers = Array.isArray(state?.workers) ? state.workers : [];
    workers.forEach(worker=>normalizeWorker(worker,state?.day));
    const hungry = workers.filter(worker => worker.hungerState === "hungry");
    const starving = workers.filter(worker => worker.hungerState === "starving");
    const critical = workers.filter(worker => worker.health <= 20);
    const consumptionPerDay = workers.length * SATIETY_LOSS_PER_DAY / MEAL_SATIETY;
    const food = normalizeFood(state?.food);
    const daysRemaining = consumptionPerDay > 0 ? food / consumptionPerDay : null;
    let alert = "ok";
    let alertText = "Estável";

    if (food === 0) {
      alert = "critical";
      alertText = starving.length ?
        "Sem comida · inanição: " + starving.map(worker => worker.name).join(", ") :
        "Sem comida · estoque zerado";
    } else if (critical.length) {
      alert = "critical";
      alertText = "Risco fatal: " + critical.map(worker => worker.name).join(", ");
    } else if (starving.length) {
      alert = "critical";
      alertText = "Inanição: " + starving.map(worker => worker.name).join(", ");
    } else if (hungry.length) {
      alert = "warning";
      alertText = "Com fome: " + hungry.map(worker => worker.name).join(", ");
    } else if (workers.some(worker => worker.satiety <= WARNING_THRESHOLD)) {
      alert = "warning";
      alertText = "Precisam de comida: " + workers.filter(worker =>
        worker.satiety <= WARNING_THRESHOLD).map(worker => worker.name).join(", ");
    } else if (daysRemaining !== null && daysRemaining < 1) {
      alert = "critical";
      alertText = "Estoque para menos de 1 dia";
    } else if (daysRemaining !== null && daysRemaining < 2) {
      alert = "warning";
      alertText = "Estoque crítico · menos de 2 dias";
    }

    return {
      population: workers.length,
      food,
      consumptionPerDay,
      daysRemaining,
      hungryCount: hungry.length,
      starvingCount: starving.length,
      criticalCount: critical.length,
      alert,
      alertText
    };
  }

  function removeDeadWorkers(state) {
    if (!Array.isArray(state?.workers)) return [];
    const dead = state.workers.filter(worker => worker.health <= 0);
    if (!dead.length) return dead;

    const deadSet = new Set(dead);
    const survivors = state.workers.filter(worker => !deadSet.has(worker));
    state.inventory ||= {};

    for (const worker of dead) {
      if (worker.carryingWater) state.water = normalizeFood(state.water) + 1;
      if (worker.carryingManure) {
        state.inventory.manure = normalizeFood(state.inventory.manure) + 1;
      }
      worker.carryingWater = false;
      worker.carryingManure = false;
      worker.supplyStage = null;
      worker.supplyTarget = null;
      worker.task = null;
      worker.progress = 0;
      worker.route = [];
      worker.routeTask = null;
      worker.workGoal = null;

      const home = state.homes?.find(item => item.residentId === worker.id);
      if (home) home.residentId = null;

      const recipient = survivors[0];
      if (recipient) {
        recipient.inventory ||= {tools:{},items:{}};
        recipient.inventory.tools ||= {};
        recipient.inventory.items ||= {};
        for (const [key, equipped] of Object.entries(worker.inventory?.tools || {})) {
          if (equipped && !recipient.inventory.tools[key]) recipient.inventory.tools[key] = true;
        }
        for (const [key, amount] of Object.entries(worker.inventory?.items || {})) {
          if (Number.isFinite(amount) && amount > 0) {
            recipient.inventory.items[key] = (Number(recipient.inventory.items[key]) || 0) + amount;
          }
        }
      }
    }

    state.workers = survivors;
    return dead;
  }

  const api = Object.freeze({
    MAX_METER,
    HUNGRY_THRESHOLD,
    MEAL_SATIETY,
    SATIETY_LOSS_PER_DAY,
    HEALTH_LOSS_PER_STARVING_DAY,
    WARNING_THRESHOLD,
    STARVATION_GRACE_MINUTES,
    normalizeWorker,
    normalizeFood,
    hungerState,
    advance,
    tryEat,
    workMultiplier,
    getStats,
    removeDeadWorkers
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.TillfolkSurvival = api;
})();
