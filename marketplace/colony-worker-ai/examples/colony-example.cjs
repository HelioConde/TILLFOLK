"use strict";
const {plan,blockers}=require("../scripts/assignment.cjs");
const workers=[
  {id:1,skills:["build"],neg:[],tools:["hammer"],task:null,resting:false,health:100},
  {id:2,skills:["sow"],neg:["build"],tools:["hoe"],task:null,resting:false,health:100}
];
const tasks=[
  {id:"build-a-hut",type:"build",requiredTool:"hammer",priority:7,status:"ready",assigned:null},
  {id:"sow-a-field",type:"sow",requiredTool:"hoe",priority:6,status:"ready",assigned:null}
];
const proposals=plan(workers,tasks,{reachable:()=>true});
for(const {worker,task} of proposals)console.log("Propose:",worker.id,"->",task.id);
// Game integration: VALIDATE the proposal again, then reserve the task atomically.
// Do not mutate saves, inventories, time or player orders inside plan().
console.log("Invalid proposal sample:",blockers(workers[1],tasks[0]));
