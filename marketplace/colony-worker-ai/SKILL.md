---
name: colony-worker-ai
description: Use when implementing, reviewing, or testing deterministic worker-to-task assignment for colony, survival, or management games. Works with JavaScript, TypeScript and agent coding workflows; preserve explicit player orders.
---
# Colony Worker AI — deterministic assignment skill

## When to use
Use this skill to design a colony workforce system for games with worker professions, negative traits, equipment, distance, pathfinding, rest, survival and task priority.

## First inspect the host project
1. Locate the game's worker schema, task/order schema, job reservations, pathfinding and save version.
2. Identify which tasks require explicit player permission. **Never create orders on behalf of the player.**
3. Identify restrictions that *block* a task versus skills that merely improve efficiency.
4. Read the existing tests, especially starvation, equipment, unreachable paths and save migration.

## Implementation plan
1. Keep task discovery separate from assignment. Pass only player-authorized ready tasks.
2. Filter out busy, resting, incapacitated and forbidden workers; verify paths and tools.
3. Assign workers with the **fewest eligible options first** so flexible workers do not take an exclusive job.
4. Score candidate tasks deterministically using priority first and skills/urgency/distance as tie-breakers.
5. Reserve assignments **atomically in the host engine**. The sample planner must remain pure: do not mutate jobs, workers, resources, inventory or saves.
6. On completion/cancellation/death, safely release reservations; preserve materials, avoid double collection.
7. Provide a way to explain why a task is blocked, for player HUD and QA.

## Included materials
- scripts/assignment.cjs — dependency-free reference implementation
- examples/colony-example.cjs — runnable two-worker integration example
- tests/assignment.test.cjs — Node.js regression suite
- references/assignment-contract.md — host integration rules

## Run checks
- node --test tests/assignment.test.cjs
- node examples/colony-example.cjs

## Required edge cases
Test 2 and 20 workers, worker with one exclusive job, conflicting priorities, prohibited trait, unavailable tool, resting, no path, starvation/incapacitation, duplicate reservation, cancellation and stable tie-breaking. Test saves and the actual browser scene separately in the host game.

## Completion evidence
Report which files changed, which tests actually ran, and what remains unverified. Never claim browser/CI validation from static inspection alone.

**Ownership boundary:** this package contains no third-party art, premium Sprout Lands assets or external copied skills. Review NOTICE.md before commercial distribution.
