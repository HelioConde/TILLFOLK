# Colony Worker AI — independent agent skill (candidate release)

**What it does:** provides an AI coding assistant with a reproducible procedure and a tested JavaScript reference for assigning workers to existing player-created tasks in survival/colony games.

**Repository source:** adapted from the original TILLFOLK worker-allocation logic, not from any of the 83 external skills recorded in skills-lock.json. This folder contains no images, proprietary premium assets or third-party skill files.

## Setup
Copy this folder into your coding agent's skills directory (for compatible SKILL.md agents). Open SKILL.md. The standalone reference runs with Node.js 20+:

- node --test tests/assignment.test.cjs
- node examples/colony-example.cjs

**Supported workflow:** agent instructions use SKILL.md; scripts and tests target Node.js. Port the algorithm to other engines or languages after checking their own task data models.

## What it is not
- Not a drop-in AI for a finished game; the host must provide reachability, inventory/tool rules, survival constraints and atomic reservations.
- Not a complete game, not an art pack and not an automatic job creator.
- Not a verified paid listing on Agensi or other marketplace.

## Release checklist
- Confirm authorship and distribution rights for all code.
- Select commercial license and terms, create ZIP containing only this folder, set price and customer support policy.
- Run Node tests and exercise the host game with two and twenty workers.
- Confirm marketplace acceptance and payout eligibility directly with the platform.

**Resumo em português:** habilidade independente de alocação de colonos, com exemplo e testes. Não redistribui sprites nem skills de terceiros. É uma candidata a produto; ainda precisa de licença/termos comerciais e publicação deliberada.
