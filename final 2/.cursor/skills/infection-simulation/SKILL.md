---
name: infection-simulation
description: Explains and helps maintain the Fungi Simulator infection simulation module. Use when discussing, testing, or modifying infection mode, the eight infection stages, stage timing, skipped stages, survival counters, stage guide RAG enrichment, or infection controls.
---

# Infection Simulation

## When To Use

Use this skill when the user mentions:

- 感染模拟, infection phase, infection mode, or survival timer.
- Eight infection stages, stage durations, skipped stages, or stage guide.
- `enterInfectionMode()`, `advanceInfectionStage()`, or `runInfectionSimulation()`.
- Infection controls, pause/resume/speed, stage details, or RAG stage enrichment.

## Core Concept

The infection simulation turns a spore hit or failed escape into an eight-stage biology timeline with survival counters and stage explanations.

Flow:

1. `enterInfectionMode()` switches from host movement to infection controls.
2. `startInfectionLoop()` and `runInfectionSimulation()` advance timers and survival state.
3. `getStageInfo()` and `getStageDurations()` define stage names, skipped stages, and timing.
4. `advanceInfectionStage()` updates the stage and final infection outcome.
5. `toggleStageGuide()` and RAG helpers enrich the stage explanations.

## Key Files

- `index.html`: `infection-controls`, `infection-stage`, `stage-guide-panel`, survival counters.
- `static/script.js`: infection mode, stage data, timers, pause/resume/speed, stage guide.
- `backend/flask_glm5_server.py`: `/api/rag/ask` for stage-guide enrichment.
- `handler.js`: machine-readable anchors and validation for this module.

## Work Rules

Before changing this feature, read `handler.js` and validate its anchors after editing.

Keep these invariants:

- Stage numbers are `1..8`; skipped stages must not break the display.
- `O. sinensis` and ghost moth special timing should keep their custom skipped-stage behavior.
- Pause, resume, and speed controls should not create duplicate timers.
- Stage guide should work with local text even if RAG is unavailable.
- Final victory/defeat should clear or stop active simulation timers.
