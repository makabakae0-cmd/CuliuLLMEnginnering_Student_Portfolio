---
name: ai-commentary
description: Explains and helps maintain the Fungi Simulator AI commentary module. Use when discussing, testing, or modifying infection-stage situation analysis, GLM-5 commentary prompts, prediction output, local commentary fallback, or the AI commentary panel.
---

# AI Commentary

## When To Use

Use this skill when the user mentions:

- AI 局面解说, situation analysis, victory prediction, or funny two-liner.
- `generateAICommentary()`, commentary JSON, or local commentary fallback.
- The AI commentary panel in infection mode.
- Auto-demo commentary after infection starts.

## Core Concept

AI commentary turns the current infection-state snapshot into a readable analysis, prediction, and suggestions for both sides.

Flow:

1. `buildAICommentarySnapshot()` captures current infection, host, spore, and food state.
2. `generateAICommentary()` asks `/api/generate` for strict JSON commentary.
3. `tryParseJsonObject()` parses model output and `buildFunnyTwoLiner()` fills missing humor text.
4. `renderAICommentary()` renders the readable panel.
5. `buildLocalAICommentary()` keeps the feature usable when GLM-5 fails.

## Key Files

- `index.html`: `ai-commentary-btn`, `ai-commentary-panel`, metadata and content elements.
- `static/script.js`: commentary snapshot, prompt, parser, renderer, local fallback.
- `backend/flask_glm5_server.py`: `/api/generate` GLM-5 proxy.
- `handler.js`: machine-readable anchors and validation for this module.

## Work Rules

Before changing this feature, read `handler.js` and validate its anchors after editing.

Keep these invariants:

- Commentary should only run in infection mode.
- Model output should be strict JSON, but invalid output must still show useful text.
- Failure should render local commentary instead of leaving the panel blank.
- Auto-demo commentary should not block infection settlement indefinitely.
- Snapshot data should describe current state without inventing unavailable facts.
