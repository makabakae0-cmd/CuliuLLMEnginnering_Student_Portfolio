---
name: host-ai-decision
description: Explains and helps maintain the Fungi Simulator host AI decision module. Use when discussing, testing, or modifying host movement AI, host route decisions, layer changes, host action parsing, fallback movement, or the rule that host AI must not see hidden spore positions.
---

# Host AI Decision

## When To Use

Use this skill when the user mentions:

- 宿主 AI, host AI movement, route decisions, or host escape strategy.
- `decideHostMoveAI()`, action JSON, layer changes, or fallback movement.
- Host privacy, hidden spores, or not exposing trap positions.
- AI vs AI host movement behavior.

## Core Concept

The host AI decides one legal action at a time from host-visible information only.

Flow:

1. `buildHostAISnapshot()` creates the host-side snapshot.
2. `decideHostMoveAI()` asks `/api/generate` for a strict JSON action.
3. `normalizeHostAIAction()` and `repairHostAction()` validate the action.
4. `getSmartFallbackHostMove()` keeps the demo moving when the model fails.
5. The action is applied through `moveHost()` or `changeLayer()`.

## Key Files

- `index.html`: `host-controls`, movement buttons, layer controls, step and energy display.
- `static/script.js`: host phase, movement rules, AI snapshot, action validation, fallback logic.
- `backend/flask_glm5_server.py`: `/api/generate` GLM-5 proxy.
- `handler.js`: machine-readable anchors and validation for this module.

## Work Rules

Before changing this feature, read `handler.js` and validate its anchors after editing.

Keep these invariants:

- Host AI must not receive spore positions, nearest-spore hints, or trap counts.
- Actions must normalize to either `{ action: "move", direction }` or `{ action: "layer", delta }`.
- Invalid model output should fall back to a deterministic movement heuristic.
- Movement must respect map boundaries, layer bounds, step limits, and host controllability.
- AI vs AI demo should remain interruptible while host AI is thinking or moving.
