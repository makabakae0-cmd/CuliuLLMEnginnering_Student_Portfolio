---
name: ai-vs-ai-auto-demo
description: Explains and helps maintain the Fungi Simulator AI vs AI auto demo mode. Use when discussing, documenting, testing, or modifying the one-click demo flow, auto spore deployment, host AI movement, infection simulation, AI commentary, or classroom demo script.
---

# AI vs AI Auto Demo

## When To Use

Use this skill when the user mentions:

- AI vs AI, AI 对 AI, 自动演示, 一键演示, or full-game demo.
- 真菌 AI 自动布阵, AI 生成策略, or spore deployment automation.
- 宿主 AI 自动移动, host AI movement, or route decisions.
- 感染模拟加速, infection phase automation, or AI 局面解说.
- Preparing a classroom/share presentation about the automated demo flow.

## Core Concept

AI vs AI 自动演示模式 is a one-click live demonstration flow for Fungi Simulator:

1. 真菌 AI calls the existing `/api/generate` backend to deploy spores without receiving the host spawn point.
2. 宿主 AI calls `/api/generate` to choose movement or layer changes, without knowing spore locations.
3. If infection happens, the demo accelerates the display-only infection timeline and calls the existing AI commentary flow; a depleted step budget is a direct fungus victory.
4. The UI shows progress in the bottom AI VS AI status banner and lets the user stop the demo.

## Key Files

- `index.html`: home/setup entry buttons and `auto-demo-banner`.
- `static/script.js`: main orchestration, AI calls, host loop, infection phase, stop logic.
- `static/style.css`: auto demo buttons and bottom status banner styles.
- `backend/flask_glm5_server.py`: `POST /api/generate` GLM-5 proxy.

## Work Rules

Before changing this feature, read `handler.md`.

Keep these invariants:

- Reuse `/api/generate` for both fungus strategy generation and host AI decisions.
- Do not expose host spawn coordinates to the fungus AI prompt.
- Do not expose spore positions to the host AI prompt.
- Keep `stopAutoDemo()` able to cancel timers, hide loading UI, restore buttons, and stop infection simulation.
- Preserve visible progress feedback through `setDemoStatus()` and `auto-demo-banner`.
- When AI generation fails, keep an understandable fallback path instead of breaking the live demo.

## Output Style

For explanations, describe the feature as:

`真菌 AI 布阵 -> 宿主 AI 闯关 -> 感染模拟 -> AI 解说`

For implementation or review work, cite the specific functions and DOM ids listed in `handler.md`.
