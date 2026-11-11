# Assignment API contract

## Data shapes
Worker: {id, task, resting, sleeping, health, skills: string[], neg: string[], tools: string[]}
Task: {id, type, priority, urgency?, status: "ready", assigned: null, requiredTool?}

Use module.exports from scripts/assignment.cjs:
- plan(workers, tasks, options) -> Array<{worker,task}>. Proposed assignments only; never mutates.
- blockers(worker, task, options) -> Array<string> explaining why a worker cannot run a task.
- score(worker, task, options) -> Number.

## Options
- reachable(worker, task) -> Boolean: host engine decides terrain collisions/path availability
- isEligible(worker, task) -> Boolean: other game-specific authorization checks
- distance(worker, task) -> Number: route cost or geometric distance
- score(worker, task) -> Number: optional domain-specific scoring replacement

## Rules
- No task creation, no resource creation, no direct world mutation.
- Busy, sleeping, resting, incapacitated, missing tools and negative traits block the worker.
- A positive skill is a bonus, not the right to perform a job.
- Priority dominates ordinary skill bonuses.
- Stable deterministic tie-breaks make debugging and testing reproducible.
- Do not assume array order is a unique worker ID; a unique ID is required in the host schema.
- Refresh eligibility and reserves in the game engine before final assignment to avoid race conditions.
- The planner knows nothing about save migration: the host must preserve its save schema.

## Porting
This is a working CommonJS reference. Agents for Python/GDScript/TypeScript should port the *invariants*, then write equivalent native tests. Do not copy TILLFOLK sprite assets or gameplay code not included in this package.
