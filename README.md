# Fungi Simulator — LLM Engineering Student Portfolio

> 欢迎光临！Welcome to my project portfolio o(^▽^)o

This repository records the complete journey of my **Fungi Simulator** project—from early experiments and weekly reflections to the current interactive application.

## Looking for the main project? (>^ω^<)

The main project is inside the [`final/`](./final/) folder.

### **[Enter the Final Project →](./final/)**

For the clearest introduction, gameplay explanation, features, and project status, begin with:

### **[Read the Fungi Simulator Project Guide →](./final/project_info/README.md)**

The rest of this repository documents how the project grew, changed, occasionally broke `(´・ω・`)`, and eventually became the version inside `final/`.

---

## What Is Fungi Simulator?

**Fungi Simulator** is an interactive science-learning project inspired by parasitic fungi, insect hosts, and real biological relationships.

Instead of explaining everything through ordinary textbook paragraphs, the project turns the topic into an experience where users can:

- Explore fungi–host relationships.
- Move through a three-layer environment.
- Deploy or avoid fungal spores.
- Compare different infection paths.
- Watch an AI-vs-AI simulation.
- Ask questions through a fungi-focused RAG knowledge system.
- Learn from scientific explanations attached to the simulation.

It combines **biology, game design, AI decision-making, local knowledge retrieval, and LLM engineering** in one student project. (^▽^)

---

## Repository Tour

This repository is more than one finished application. It is also a record of the experiments, plans, prototypes, evidence, and reflections behind it.

| Folder | What you will find |
| --- | --- |
| [`final/`](./final/) | **The main project. Start here!** Application code, backend, tests, presentations, and detailed documentation. |
| [`demo/`](./demo/) | Early Week 1 and Week 2 prototypes showing how the idea developed. |
| [`docs/`](./docs/) | The 15-week roadmap, MVP plans, and project-planning documents. |
| [`data/`](./data/) | The fungi knowledge database, SQL seed data, science facts, teaching guides, and myth clarifications. |
| [`rag/`](./rag/) | Local RAG scripts using embeddings and ChromaDB to retrieve fungi knowledge. |
| [`eval/`](./eval/) | The workspace and guidance for evaluations, rubrics, results, and failure cases. |
| [`logs/`](./logs/) | The workspace for runtime records, errors, metrics, and debugging evidence. |
| [`reflection/`](./reflection/) | Weekly lessons, project reflections, future plans, and a few honest `orz` moments. |

---

## How the Project Evolved

### 1. The First Prototype — “Can this idea work?” (^-^)

The earliest version focused on turning a fungi-related idea into a small interactive prototype.

See: [`demo/fungi_mvp_week01/`](./demo/fungi_mvp_week01/)

### 2. The Second MVP — “Now it needs structure.” (^▽^)

The next version began separating the frontend, backend, and database design. This stage helped transform the idea into a more organized software project.

See: [`demo/fungi_mvp_week02/`](./demo/fungi_mvp_week02/)

### 3. The Current Main Project — o(^▽^)o

The version inside `final/` brings the major pieces together:

- Interactive fungi and host selection.
- A multi-layer simulation map.
- Fungi–host scientific pairing rules.
- Spore deployment and host movement.
- Host abilities and infection stages.
- Manual play and AI-vs-AI demonstration.
- AI-generated situation explanations.
- RAG-based fungi knowledge questions.
- Local fallback behavior when an external AI service is unavailable.
- Engineering notes, testing records, and presentation materials.

See: [`final/`](./final/)

---

## What Is Inside `final/`?

```text
final/
├── index.html                 # Main application page
├── static/                    # Game logic and visual styling
├── backend/                   # Local AI/backend service
├── tests/                     # Regression tests
├── project_info/              # Main README, technical guide, and test log
├── start_local_servers.sh     # Local startup helper
├── LLM_ENGINEERING_NOTES.md   # LLM engineering decisions and learning
└── presentations              # Project presentation materials
```

Useful places to continue:

- [Project introduction and gameplay](./final/project_info/README.md)
- [Technical setup and local running guide](./final/project_info/TECHNICAL.md)
- [Testing, failures, and limitations](./final/project_info/TEST_AND_FAILURE_LOG.md)
- [LLM engineering notes](./final/LLM_ENGINEERING_NOTES.md)

---

## Why Keep the Earlier Work?

A portfolio should show more than a polished final screen.

The early prototypes, plans, reflections, tests, and failed attempts explain:

- Where the original idea came from.
- How the technical structure changed.
- What did not work the first time. `:(`
- How bugs and limitations were investigated.
- How feedback became concrete improvements.
- What I learned while building the project.

Some parts are successful, some are still developing, and some are quietly sitting in the corner like `(´・ω・`)`. Together, they show the real engineering process.

---

## Current Project Status

The current main build is available in [`final/`](./final/), together with its implementation and documentation.

Some supporting portfolio areas—particularly evaluation evidence, runtime logs, screenshots, and final demonstration materials—may continue to develop as the project is tested and presented.

For verified behavior and known limitations, please read the documentation inside [`final/project_info/`](./final/project_info/).

---

## Quick Navigation

If you only have a minute:

1. Go to [`final/`](./final/).
2. Read the [main project guide](./final/project_info/README.md).
3. Explore the [technical guide](./final/project_info/TECHNICAL.md) if you want to run it.
4. Check the [test and failure log](./final/project_info/TEST_AND_FAILURE_LOG.md) for the honest engineering story.

---

## Thanks for Visiting! (>^ω^<)

This repository is a record of curiosity, fungi, AI experiments, debugging, rebuilding, and learning.

The main adventure is waiting inside:

### **[Continue to the Final Fungi Simulator →](./final/)**

`(^▽^) See you in the forest!`
