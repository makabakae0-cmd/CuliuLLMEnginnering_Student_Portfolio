---
name: ai-spore-strategy
description: Explains and helps maintain the Fungi Simulator fungus AI spore strategy module. Use when discussing, testing, or modifying AI-generated spore deployment, random fallback deployment, GLM-5 deployment prompts, spore parsing, normalization, or deployment confirmation.
---

# AI Spore Strategy

## When To Use

Use this skill when the user mentions:

- AI 生成策略, 真菌 AI 布阵, spore deployment, or deploy spores.
- GLM-5 strategy prompts for placing spores.
- Random/fallback deployment, JSON parsing, deployment repair, or layer balancing.
- The fungus turn controls in `fungus-controls`.

## Core Concept

The fungus AI strategy module turns the visible game rules, nest, environment, and fungus selection into the pairing-specific number of valid spores without exposing the host spawn point.

Flow:

1. `buildFungusAIStrategyContext()` builds a fair context that excludes host spawn coordinates.
2. `callGLMAPI()` asks `/api/generate` for strict JSON deployments.
3. `parseDeployments()` and `normalizeSporeDeployments()` repair and validate model output.
4. `clearSpores()`, `renderSpore()`, and `updateSporeCount()` update the map.
5. `buildFallbackSporeDeployment()` covers the nest area from multiple directions if the model fails or output is invalid.

## Key Files

- `index.html`: `fungus-controls`, spore buttons, `spore-count`.
- `static/script.js`: fungus phase, GLM call, deployment parsing, fallback generation, confirmation.
- `backend/flask_glm5_server.py`: `/api/generate` GLM-5 proxy.
- `handler.js`: machine-readable anchors and validation for this module.

## Work Rules

Before changing this feature, read `handler.js` and validate its anchors after editing.

Keep these invariants:

- AI deployment must produce the active V1 pairing target count after normalization.
- Spore coordinates must stay in `0..100`; layers must follow the active fungus rule.
- Fungus AI must not receive `gameState.hostPosition` or precise host spawn coordinates.
- Ghost moth special cases should keep spores on the valid host layer.
- Failed AI generation should leave a usable manual or fallback deployment path.
- Confirmation should only move to host phase after the deployment is repaired to the target count and allowed layers.
