# Skill Contracts

This document defines the project contract for `.cursor/skills/*/handler.js`.
It is the source of truth for pipeline shape, minimal state, I/O alignment, and validation pass criteria.

Companion workbook: `Agent_completion_workbook.md` records the agent-level baseline, tool/API contracts, state schema, planner rules, cases, failure log, and self-check checklist before implementation.

## Skill Decision Policy

Skill and pipeline selection must be LLM-only.

- `llm-planner.js` builds a compact registry context from handler contracts and asks `/api/generate` for strict decision JSON.
- LLM output must include `selectedSkill`, `pipelineSteps`, `intent`, `requires`, `expectedInputs`, `expectedOutputs`, `confidence`, and `reason`.
- Code may use `if/else` for CLI command dispatch, JSON/schema validation, registry lookup, and error handling only.
- Deterministic fallback must not produce a skill decision.
- If the LLM planner is unavailable or returns invalid JSON/contract data, the planner must fail closed with `decision: null` and an `llmRequired` issue.
- Normal model decisions must set `source: "llm"`.
- LLM-selected skills and pipeline steps must be validated against the registry before use.

## Handler Contract

Each skill handler must export:

```js
module.exports = { feature, validateProject };
```

The exported `feature` object must include:

- `name`: skill name matching the directory name.
- `keyFiles`: files required by the feature.
- `pipeline`: ordered feature steps.
- `minimalState`: the smallest game/UI/backend state this skill is allowed to depend on.
- `inputs`: external or internal inputs consumed by the feature.
- `outputs`: user-visible, state, DOM, or API outputs produced by the feature.
- `validations`: checks that prove the feature contract still holds.
- `fallbacks`: degraded behavior when AI, network, parsing, or optional dependencies fail.

Each `pipeline` step must include:

- `id`: stable step identifier.
- `reads`: state, DOM, route, or function dependencies.
- `writes`: state, DOM, route, or function outputs.
- `requires`: preconditions or required symbols.
- `produces`: expected result for the next step.

## Validation Pass Criteria

`node .cursor/skills/router.js check-all` and `node .cursor/skills/validate-feature-handlers.js` must verify more than symbol existence.

A skill passes only if:

- Required contract fields exist and have the expected shape.
- The pipeline has at least two steps.
- Every pipeline step declares `id`, `reads`, `writes`, `requires`, and `produces`.
- `minimalState` is explicit and feature-scoped.
- `inputs` and `outputs` are explicit arrays.
- `validations` include at least one check from the relevant categories: `existence`, `io`, `fallback`, `privacy`, `boundary`, `result`.
- Declared functions, DOM ids, backend routes, constants, and style classes still exist in the project.
- Feature-specific privacy, fallback, and result checks still pass.

## Skill Contracts

### ai-spore-strategy

- Pipeline: build fair fungus context, call GLM-5, normalize spores, render spores, fallback if invalid.
- Minimal state: fungus type, environment, map bounds, nest position, layer names, spore count.
- Inputs: setup selections, `/api/generate` response, map bounds.
- Outputs: normalized spore deployments, rendered spore DOM, validation summary.
- Validations: no host spawn coordinates in fungus context; deployment parser and fallback exist; output schema is `layer`, `x`, `y`, `strategy`.

### host-ai-decision

- Pipeline: build host snapshot, ask GLM-5, normalize action, repair invalid action, apply movement.
- Minimal state: host position, nest position, step count, layer bounds, host history, controllability.
- Inputs: public host snapshot, `/api/generate` response, movement controls.
- Outputs: `move` or `layer` action, host position update, action history.
- Validations: no hidden spore data in host snapshot; action schema is aligned; movement respects bounds and fallback exists.

### ai-commentary

- Pipeline: build infection snapshot, request commentary JSON, normalize missing fields, render panel, fallback locally.
- Minimal state: infection stage, survival days, health days, host/fungus/environment names, food and spore summaries.
- Inputs: infection snapshot, `/api/generate` response.
- Outputs: commentary panel content, prediction, suggestions, local fallback text.
- Validations: only runs in infection mode; expected commentary fields exist; local fallback renders if GLM fails.

### ai-vs-ai-auto-demo

- Pipeline: prepare demo, run fungus AI, start host AI, enter infection phase, run infected host AI, settle result.
- Minimal state: active token, timers, host history, infected host history, saved simulation speed, demo status.
- Inputs: demo buttons, setup defaults, AI spore output, host action output, infected host action output.
- Outputs: visible demo status, map highlights, movement/spore updates, final result screen.
- Validations: demo is interruptible; AI failures fallback; fungus privacy and host privacy hold; infected host AI functions are covered; unresolved endings are forced into a result.

### infection-simulation

- Pipeline: enter infection mode, start infection loop, advance stage, update health and days, show result.
- Minimal state: infection mode flag, current stage, survival days, health days, goal days, timer handles, controllability.
- Inputs: infection trigger, simulation speed, food collection, movement penalty.
- Outputs: stage display, health display, result screen.
- Validations: health depletion and survival goal produce results; movement penalty exists; stage metadata exists.

### rag-qa

- Pipeline: check RAG health, submit question, retrieve evidence, generate answer, render response or error.
- Minimal state: RAG endpoints, question input, answer panel, retrieved evidence metadata.
- Inputs: question text, `/api/rag/health`, `/api/rag/ask`.
- Outputs: health status, answer content, retrieved evidence.
- Validations: endpoint constants and routes exist; optional dependency failures return clear errors instead of blocking server startup.

### site-navigation

- Pipeline: bind nav triggers, resolve target section, scroll or switch visibility, maintain active state.
- Minimal state: nav links, section ids, CTA buttons, visible section state.
- Inputs: click target, hash target, section DOM.
- Outputs: active section, scroll position, visible content.
- Validations: nav DOM ids/classes exist; target sections exist; buttons route to valid sections.
