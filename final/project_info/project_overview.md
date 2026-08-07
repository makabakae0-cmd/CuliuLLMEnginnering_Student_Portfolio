# Project Overview: Fungi Simulator

## 1. What This Project Is

Fungi Simulator is a browser-based educational simulation game about parasitic fungi and insect hosts. Its main goal is to turn a difficult biology topic into an interactive classroom or demo experience. Instead of reading static notes about infection, the user can:

- choose a fungus, host, and environment
- deploy spores or let the AI deploy them
- move the host across a 3-layer map
- trigger infection and watch an 8-stage infection progression
- ask biology questions through a RAG-backed knowledge panel
- run an AI-vs-AI auto demo for presentation use

The project is best understood as a teaching-oriented MVP: it is more polished than a rough prototype, but it is still structured like a student capstone/demo app rather than a production platform.

## 2. Core Product Idea

The simulation is built around an asymmetric interaction:

- The fungus side tries to place spores strategically.
- The host side tries to avoid infection and reach safety.
- If infection happens, the experience shifts from navigation gameplay into a survival-and-explanation phase.

This creates two layers of learning at once:

- a game layer, where players make choices and observe consequences
- a science explanation layer, where AI and RAG explain what those consequences mean biologically

That pairing is the strongest idea in the repo: the project is not only "about fungi," it is trying to make fungal infection understandable through interaction, pacing, and contextual explanation.

## 3. High-Level Architecture

The app has a very simple deployment model:

- Frontend: static HTML, CSS, and vanilla JavaScript
- Backend: Flask API server
- AI generation: GLM-5 via a backend proxy
- Retrieval / Q&A: ChromaDB plus sentence-transformers, with local fallback snippets

At runtime, the frontend is served as a static site and calls the backend over HTTP:

- Frontend URL: typically `http://127.0.0.1:8000/`
- Backend URL: typically `http://127.0.0.1:8002/`

This keeps the UI lightweight and easy to demo locally. It also avoids exposing the model API directly in the browser.

## 4. Main Files And Their Roles

### Application files

- `index.html`
  Single-page app shell. Contains the main sections for landing, setup, RAG Q&A, game panel, loading overlay, auto-demo banner, and results.

- `static/script.js`
  The heart of the project. This file is large and contains most of the product logic:
  - navigation
  - game state
  - map handling
  - spore placement
  - host movement
  - infection mode
  - AI commentary
  - RAG UI integration
  - AI-vs-AI auto demo
  - result rendering

- `static/style.css`
  Visual styling for the single-page app, game layout, map layers, cards, controls, overlays, RAG panels, and result views.

- `backend/flask_glm5_server.py`
  Backend API server. Handles:
  - `/api/health`
  - `/api/generate`
  - `/api/rag/health`
  - `/api/rag/ask`

- `backend/requirements.txt`
  Python dependencies for the backend and retrieval stack.

### Project and delivery docs

- `README.md`
  User-facing description of the simulator.

- `TECHNICAL.md`
  Local run instructions, architecture notes, API summary, and engineering decisions.

- `LLM_ENGINEERING_NOTES.md`
  Describes how prompt design, RAG, agent-like modules, fallback behavior, and safety boundaries were approached.

- `TEST_AND_FAILURE_LOG.md`
  Documents normal test paths, past failures, and how the project tries to degrade gracefully.

### Course / presentation artifacts

- `Project_one_pager_Emma.md`
- `Lesson10_student_workbook.md`
- `Agent_completion_workbook.md`
- `ppt_pagesscript.md`
- `fungi_simulator_project_presentation.pptx`
- `fungi_simulator_family_activity_presentation.pptx`
- `fungi_simulator_family_activity_presentation.pdf`

These materials show that the repo is not only source code. It is also a class/demo package with presentation outputs and planning documents.

## 5. Frontend User Experience

The frontend is a single-page experience with several distinct sections:

### Home section

The landing area presents the project as a science game and gives three entry points:

- start the game
- start AI-vs-AI auto demo
- open the knowledge Q&A area

### Setup section

The player can configure:

- side: fungus or host
- host type
- environment
- fungus type

This section determines the simulation context and changes some downstream rules.

### RAG Q&A section

The user can ask biology questions, try sample prompts, and inspect returned evidence. The UI surfaces:

- answer text
- metadata
- evidence cards
- diagnostics

This is a nice teaching feature because it makes the explanation layer visible instead of hiding retrieval under the hood.

### Game section

The game panel includes:

- a 3-layer map
  - layer 0: ground
  - layer 1: vegetation
  - layer 2: canopy
- a side status panel
- fungus controls
- host controls
- infection controls

The design combines game-state information with teaching-state information, which fits the classroom use case well.

## 6. Game State And Core Simulation Model

Most of the app logic is driven by a large `gameState` object in `static/script.js`. It stores:

- current phase
- player side
- host / fungus / environment choices
- spore positions
- host and nest positions
- steps taken
- timers and simulation speed
- infection flags
- infection survival counters
- food items
- visibility / control state

The app behaves like a hand-written state machine more than a component-based UI. That means state transitions are straightforward to follow, but a lot of logic is concentrated in one very large file.

## 7. Gameplay Flow

The simulation has three main phases.

### Phase 1: Setup

The player chooses the simulation parameters. Starting the game initializes random host and nest positions, hides the setup panels, and opens the game area.

### Phase 2: Fungus phase

If the current side is fungus:

- the fungus deploys up to 10 spores
- deployment can be manual, random, or AI-generated
- a 60-second timer pushes the flow forward
- once deployment is confirmed, spores are hidden from the host

The project tries to enforce fairness here. The spore strategy context is built around map rules and nest position, and the prompt explicitly tells the model not to use the host spawn point.

### Phase 3: Host phase

The host tries to:

- avoid spores
- navigate across layers
- reach the nest within 15 steps

Possible outcomes:

- host victory by safely reaching the nest
- infection triggered by stepping on a spore
- forced transition into infection mode if the host runs out of steps

This is a smart design choice for demos because even a failed avoidance run still produces a teachable infection sequence.

## 8. Infection Mode

Infection mode is where the project becomes most educational.

Once infection starts:

- the host no longer returns to the nest
- the simulation goal becomes surviving 15 infected days
- health declines over simulated time
- food can extend survival time
- the UI switches to infection controls and stage displays

The app tracks:

- infection days survived
- infection health remaining
- current infection stage
- real-time countdown to victory

The result is a hybrid of survival mechanic and timed teaching narrative.

## 9. Infection Stages

The simulator defines 8 infection stages. These are not just labels; each stage includes:

- a stage name
- an in-world time marker
- an on-screen real-time marker
- a teaching-oriented description

For `unilateralis`, the stages are:

1. spore attachment
2. body wall penetration
3. latent expansion
4. behavior manipulation
5. abnormal movement
6. death grip
7. host death
8. spore release

For `sinensis` and the ghost-moth special case, several behavior-control stages are explicitly skipped. This is a strong detail because it prevents the simulator from oversimplifying all fungi into the "zombie ant" pattern.

That stage model is one of the best educational parts of the project: it teaches that different fungi-host combinations do not share identical symptom chains.

## 10. AI Features

The project uses AI in multiple places.

### A. AI spore deployment

The fungus can ask GLM-5 to generate a spore placement plan. The prompt includes:

- map structure
- movement rules
- fungus type
- host type
- environment
- nest location
- fairness constraints

The frontend then parses and normalizes the returned JSON-like structure into valid spore positions.

Important design choice:

- the prompt explicitly forbids using hidden host spawn information
- the normalization layer attempts to fix or fallback when model output is malformed

### B. AI commentary

During infection mode, the simulator can request AI-generated commentary about the current situation. The app builds a structured snapshot and asks the model for JSON containing:

- a two-line humorous description
- a situation summary
- analysis bullets
- winner prediction
- suggestions for host and fungus

If the model fails, the frontend falls back to local commentary generation.

### C. RAG knowledge answering

The knowledge panel sends questions to the backend, which attempts:

1. embedding-based retrieval from ChromaDB
2. local fallback retrieval if the vector path is unavailable
3. GLM-based answer synthesis from retrieved evidence
4. evidence-only answer generation if synthesis fails

This layered fallback strategy is consistent with the classroom goal: keep the experience usable even when part of the AI stack breaks.

## 11. Backend Responsibilities

The Flask backend acts as both a model proxy and a retrieval service.

### `/api/health`

Simple status endpoint confirming that the Flask proxy is up.

### `/api/generate`

General text generation endpoint. The backend accepts either:

- `prompt`
- `messages`

It then forwards requests to the GLM-5 API and returns normalized output. It also tries to protect against an empty upstream response by checking returned content before responding successfully.

### `/api/rag/health`

Returns retrieval diagnostics, including:

- Chroma path
- collection state
- embedding availability
- fallback file availability

This is useful because the RAG stack is heavier and more fragile than the basic generate endpoint.

### `/api/rag/ask`

This endpoint:

- receives a question
- tries vector retrieval
- falls back to local keyword search if needed
- constructs a "use only provided evidence" answer prompt
- calls GLM-5 to synthesize a classroom-friendly answer
- falls back again to evidence-only formatting if model synthesis fails

That behavior shows good defensive thinking for a teaching demo.

## 12. Retrieval Design

The RAG layer mixes three knowledge sources:

### Primary vector path

- ChromaDB collection
- sentence-transformers embeddings

### Local fallback files

- `Lesson10_student_workbook.md`
- `ppt_pagesscript.md`

### Built-in biology snippets

The backend includes inline fallback passages such as:

- death grip
- fungal behavior manipulation

This matters because the repo history already documents a failure mode where technical or project-management documents polluted biology answers. The current design tries to keep fallback retrieval limited to biology-relevant content.

## 13. Auto Demo Mode

Auto demo is one of the most important features for classroom presentation.

The sequence is roughly:

1. prepare game state
2. start fungus phase
3. ask AI for fair spore deployment
4. fallback to rule-based deployment if needed
5. switch to host phase
6. run host AI movement loop
7. transition into infection if triggered
8. continue infection sequence
9. force a final result if the normal end condition fails to appear

This is effectively a scripted multi-step orchestrator built into the frontend rather than a formal multi-agent backend.

The auto-demo design is especially practical because it prevents the worst kind of presentation failure: an unfinished, ambiguous ending.

## 14. UX And Teaching Strengths

The project has several clear strengths.

### Strong strengths

- It is easy to explain in one sentence.
- The game loop maps naturally onto biology concepts.
- The simulator distinguishes between interaction and explanation.
- The repo includes fallbacks for multiple failure modes.
- RAG answers surface evidence instead of only returning hidden model output.
- Auto demo makes the project presentation-friendly.
- Infection stages are thoughtfully customized for different fungus-host cases.

### Why that matters

A lot of student AI projects stop at "model output on a page." This project goes further by giving AI output a concrete role inside a simulation and by thinking about what happens when the AI is unavailable.

## 15. Technical Weaknesses And Caveats

The repo also has some important limitations.

### A. Very large frontend script

`static/script.js` is about 4,800 lines long and handles nearly everything. That makes iteration fast for a solo project, but it also means:

- state is highly centralized
- coupling is high
- testing individual behaviors is harder
- future maintenance will get more difficult as features expand

### B. Hardcoded environment assumptions

The project currently contains several machine-specific or local assumptions, including:

- hardcoded frontend backend endpoint: `http://127.0.0.1:8002`
- a default ChromaDB directory outside the repo
- local fallback behavior that depends on certain files being present

This is fine for local demos, but it reduces portability.

### C. Sensitive configuration issue

The backend currently appears to hardcode a GLM API key inside `_get_api_key()` instead of exclusively reading it from environment variables. That is a security and sharing risk and should be fixed before distributing or publishing the project.

### D. Minimal automated testing

The repo contains test documentation and failure logs, but not a strong automated test harness. Most reliability comes from:

- manual verification
- guarded fallbacks
- runtime diagnostics

That is acceptable for a class demo, but it is not enough for a production-grade deployment.

### E. No framework-level modularity

The project deliberately uses plain JS instead of React/Vue/etc. This keeps it simple, but it also means:

- state transitions are ad hoc
- UI rendering is manual
- large features accumulate inside one script

## 16. Runtime Dependencies

### Frontend

- any static HTTP server
- browser support for modern DOM APIs and `fetch`

### Backend

- Python 3
- Flask
- flask-cors
- requests
- sentence-transformers
- chromadb

### External service dependency

- GLM-5 access through BigModel API

Because the project depends on both external model access and optionally heavy embedding dependencies, the fallback strategy is essential rather than optional.

## 17. Current Repo Shape

This repo contains both:

- the runnable simulator
- the presentation and documentation package around it

That makes it useful for several audiences:

- a player or class viewer
- a teacher or demo audience
- a reviewer grading the engineering decisions
- a teammate onboarding into the code

It is not a minimal clean production repository. It is a hybrid code-and-deliverables workspace.

## 18. Best Way To Describe The Project In One Paragraph

Fungi Simulator is a classroom-oriented interactive biology game that uses a lightweight browser frontend and a Flask AI backend to simulate fungal infection, host behavior, and staged biological consequences. Its strongest features are the 3-layer asymmetric game loop, infection-stage teaching model, RAG-backed science Q&A, and fallback-heavy AI integration designed to keep demos working even when model or retrieval services fail.

## 19. Suggested Next Improvements

If this project continues, the highest-value improvements would be:

1. remove the hardcoded API key and move all secrets to environment variables
2. move endpoint URLs and Chroma paths into config
3. split `static/script.js` into modules such as game-state, AI, RAG UI, auto-demo, and infection logic
4. add lightweight automated smoke tests for the backend endpoints
5. replace placeholder demo assets in the README with real screenshots and video
6. define a cleaner data contract for stage info, result screens, and AI response payloads
7. consider a small build step or frontend module system if the project keeps growing

## 20. Bottom-Line Assessment

This is a strong educational simulation MVP with real product thinking behind it. The codebase is intentionally simple, but the project design is richer than the stack suggests: it combines interaction, explanation, retrieval, fallback behavior, and presentation support in a way that clearly serves a classroom/demo use case.

Its biggest strengths are concept clarity and teaching flow. Its biggest risks are maintainability, configuration hygiene, and dependence on local assumptions. Even with those limits, the project already reads as a coherent, functional capstone-style application rather than a disconnected experiment.
