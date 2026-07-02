---
name: rag-qa
description: Explains and helps maintain the Fungi Simulator RAG question-answering module. Use when discussing, testing, or modifying the RAG QA section, knowledge-base answers, retrieved evidence display, RAG health checks, or `/api/rag/*` backend routes.
---

# RAG QA

## When To Use

Use this skill when the user mentions:

- RAG 问答, knowledge QA, 知识库问答, or Fungi / Host RAG 测试.
- RAG health, ChromaDB status, retrieved evidence, or query vector details.
- The `/api/rag/ask` or `/api/rag/health` backend routes.
- Changing the QA panel in `rag-qa-section`.

## Core Concept

RAG QA lets the user ask biology questions and see both the generated answer and retrieved evidence.

Flow:

1. `checkRagHealth()` checks ChromaDB and embedding status.
2. `askRagQuestion()` posts the question and `top_k` to `/api/rag/ask`.
3. The backend embeds the question, queries ChromaDB, asks GLM-5 when evidence exists, and returns answer plus evidence.
4. The frontend renders metadata and retrieved chunks in `rag-answer-panel`.

## Key Files

- `index.html`: `rag-qa-section`, question input, buttons, answer panel.
- `static/script.js`: RAG endpoint constants, health check, question flow, stage-guide RAG helpers.
- `backend/flask_glm5_server.py`: `/api/rag/health` and `/api/rag/ask`.
- `handler.js`: machine-readable anchors and validation for this module.

## Work Rules

Before changing this feature, read `handler.js` and validate its anchors after editing.

Keep these invariants:

- Empty questions should not call the backend.
- Backend failures should render a readable error in the answer panel.
- Retrieved evidence should remain visible enough for classroom explanation.
- `/api/rag/ask` should answer only from retrieved evidence and say when evidence is insufficient.
- Stage-guide RAG helpers may reuse `/api/rag/ask`, but the standalone QA panel must remain usable.
