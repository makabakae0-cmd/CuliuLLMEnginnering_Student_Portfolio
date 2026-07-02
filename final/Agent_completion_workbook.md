# Fungi Simulator Agent Completion Workbook

---

## Part A：开工判断

### A1：当前 baseline

baseline 路径：`/Users/zhongmeier/Documents/fungi/final/`

已经定位到的核心文件：

| 文件 | 当前职责 | 本轮需要补全什么 |
|---|---|---|
| `index.html` | 页面结构、导航、游戏入口、RAG/AI 面板容器 | 确认 DOM id 与 skill handler I/O 对齐 |
| `static/script.js` | 游戏状态、AI 调用、自动演示、感染模拟、RAG 前端逻辑 | 确认每个 skill 的 pipeline、最小 state、fallback 都覆盖真实函数 |
| `static/style.css` | 页面布局、自动演示状态、高亮动画 | 确认 style class 被 handler 验证 |
| `backend/flask_glm5_server.py` | `/api/generate` GLM-5 代理、RAG API、健康检查 | 确认轻量启动、RAG 可选依赖失败清晰返回 |
| `.cursor/skills/SKILL_CONTRACTS.md` | skill contract 总规格 | 作为 handler contract 和验证脚本的来源 |
| `.cursor/skills/router.js` | skill handler 注册与验证路由 | 验证 contract，而不是只验证符号存在 |
| `.cursor/skills/validate-feature-handlers.js` | 一键验证所有 skill handler | 输出 summary、contractOk 和 issueCounts |

### A2：当前 agent 能力缺口

面对请求：**“维护这个真菌模拟器项目，并保证 AI 自动演示、RAG、感染模拟、页面导航都能按 contract 自检。”**

baseline 当前缺口：

- 缺口 1：只有浅层 symbol check，不能证明 pipeline、state、I/O 和 fallback 合法。
- 缺口 2：缺少面向 agent 的总工作簿，无法从需求、规则、cases、failure log 到验证标准形成闭环。

这两个缺口分别需要：

- Skill Contract：已在 `.cursor/skills/SKILL_CONTRACTS.md` 建立。
- Router / Validator 改造：已让 `check-all` 返回 contract 验证结果。
- Agent Workbook：本文件用于记录完整 agent 所需内容和自检入口。

### A3：本轮最不确定的一件事

RAG 完整能力依赖 `chromadb` 和 `sentence-transformers`，安装耗时较长；当前策略是让主后端先轻量启动，RAG 接口在缺依赖时返回明确错误，不阻塞 AI 自动演示。

---

## Part B：可用工具 / API 阅读

### B1：可用工具与接口

| 工具 / API | 输入 | 输出关键字段 | 使用边界 |
|---|---|---|---|
| `/api/generate` | `{ prompt | messages, temperature, max_tokens }` | GLM-5 response / `choices[].message.content` | AI 孢子部署、宿主决策、AI 解说、感染后宿主决策 |
| `/api/health` | 无 | `{ status, service, model }` | 只做后端可达性检查 |
| `/api/rag/health` | 无 | `{ status, db_exists, count | message }` | 允许缺可选依赖时返回 error，不应阻塞后端启动 |
| `/api/rag/ask` | `{ question, top_k }` | `{ answer, retrieved, raw }` | 课堂知识问答；问题为空时前端不应调用 |
| `.cursor/skills/router.js check-all` | 项目根目录 | `{ ok, results[].contract }` | 验证所有 skill handler contract |
| `.cursor/skills/validate-feature-handlers.js` | 项目根目录 | `{ summary.contractOk, issueCounts }` | 一键自检入口 |

### B2：不能暴露或不能依赖的能力

- 真菌 AI 不允许读取宿主出生点。
- 普通宿主 AI 不允许读取隐藏孢子位置、最近孢子距离或陷阱提示。
- RAG 重依赖不能作为后端启动前置条件。
- 自动演示不能以“未触发胜负页面”结束。
- handler contract 不能只靠函数名存在判断通过。

本项目当前允许暴露的只读/受控能力：

- 前端公开游戏状态 snapshot。
- `/api/generate` 文本生成代理。
- `/api/rag/health` 与 `/api/rag/ask` 的受控问答接口。
- `.cursor/skills/*/handler.js` 的静态 contract 元数据与验证函数。

---

## Part C：Agent 编码规格表

> 填完 S1-S7 后才进入实现。任何一项为空，都先补规格，不直接让 AI 自己决定架构。

### S1：我要扩展的 agent 缺口

| 模块 | 当前职责 | 本节要补什么 |
|---|---|---|
| `.cursor/skills/*/handler.js` | 描述 feature 与浅层项目验证 | 补齐 pipeline、minimalState、inputs、outputs、validations、fallbacks |
| `.cursor/skills/llm-planner.js` | LLM-only skill / pipeline 决策 | 根据用户请求和 skill registry 调用 `/api/generate`，返回严格决策 JSON；LLM 不可用时不产生 skill decision |
| `.cursor/skills/router.js` | 注册 handler、运行 check、暴露 plan 命令 | 增加 contract 结构验证、issue 分类、`plan` / `plan-offline` |
| `.cursor/skills/validate-feature-handlers.js` | 一键运行 validateAll | 输出 summary、contractOk、issueCounts |
| `backend/flask_glm5_server.py` | 后端 AI/RAG API | RAG 重依赖懒加载，保证主服务可启动 |
| `static/script.js` | 游戏与 AI 行为 | 感染后宿主 AI 反应已纳入 auto-demo skill contract |

### S2：LLM Planner / Router step_type 扩展

| step_type | 触发条件 | 由谁决策 | 由谁执行 | result 写入 state 字段 |
|---|---|---|---|---|
| `skill_decision` | 任何自然语言维护请求 | LLM Planner | `router.js plan <request>` | `skillDecision` |
| `skill_contract_check` | LLM 选择验证类任务，或用户明确要求检查 skill / pipeline / I/O / state | LLM Planner | `router.js check-all` | `contract.results[]` |
| `feature_validation` | LLM 判断需要确认功能是否仍可用 | LLM Planner | `validate-feature-handlers.js` | `summary.contractOk` |
| `backend_health_check` | LLM 判断请求需要服务器或 API 可达性 | LLM Planner | `/api/health` / port check | `serviceStatus.backend` |
| `rag_health_check` | LLM 判断请求涉及 RAG 或课堂问答 | LLM Planner | `/api/rag/health` | `serviceStatus.rag` |
| `demo_runtime_check` | LLM 判断请求涉及 AI vs AI 演示 | LLM Planner | 前端手动/自动流程验证 | `demoStatus` |

### S3：Tool / API Contract

#### Tool 1：`glm_generate`

| 字段 | 设计 |
|---|---|
| API route | `/api/generate` |
| 底层文件 | `backend/flask_glm5_server.py` |
| description | 用 GLM-5 生成严格 JSON 或中文解释；只在需要 AI 决策、解说或策略时调用 |
| inputSchema | `{ prompt?: string, messages?: Array<{role:string, content:string}>, temperature?: number, max_tokens?: number }` |
| outputStateKey | `llm.rawResponse` |
| 失败时怎么办 | 前端走本地 fallback：孢子 fallback、宿主 fallback、AI 解说 fallback、感染后宿主 fallback |
| 下游 skill | `ai-spore-strategy`、`host-ai-decision`、`ai-commentary`、`ai-vs-ai-auto-demo` |

#### Tool 2：`rag_ask`

| 字段 | 设计 |
|---|---|
| API route | `/api/rag/ask` |
| 底层文件 | `backend/flask_glm5_server.py` |
| description | 基于真菌知识库检索证据并回答课堂问题；只在用户问知识库/阶段解释时调用 |
| inputSchema | `{ question: string, top_k?: number }` |
| outputStateKey | `rag.answerPayload` |
| 失败时怎么办 | 前端渲染 readable error；感染阶段指南使用本地文本 |
| 下游 skill | `rag-qa`、`infection-simulation` |

#### Tool 3：`skill_contract_check`

| 字段 | 设计 |
|---|---|
| command | `node .cursor/skills/router.js check-all` |
| 底层文件 | `.cursor/skills/router.js` |
| description | 验证所有 skill handler 是否满足 contract，包括 pipeline、最小 state、I/O、validations |
| inputSchema | `{ root?: string }` |
| outputStateKey | `skillContracts.results` |
| 失败时怎么办 | 按 issue type 定位：`contractMissing`、`pipelineInvalid`、`stateTooBroad`、`ioMismatch`、`validationMissing` |
| 下游 skill | 全部 `.cursor/skills/*` |

#### Tool 4：`llm_skill_plan`

| 字段 | 设计 |
|---|---|
| command | `node .cursor/skills/router.js plan "<user_request>"` |
| 底层文件 | `.cursor/skills/llm-planner.js` |
| description | 让 LLM 根据 skill registry 和 contract 选择最合适的 skill 与 pipeline steps；代码只验证输出，不做主决策 |
| inputSchema | `{ user_request: string }` |
| outputStateKey | `skillDecision` |
| 失败时怎么办 | 返回 `decision: null` 和 `llmRequired`，不允许 deterministic fallback 产出 skill 选择 |
| 下游 skill | 全部 `.cursor/skills/*` |

### S4：Memory / State Contract

| 字段 | 设计 |
|---|---|
| memory_store 文件路径 | 当前不落长期用户 memory；项目级 contract 写入 `.cursor/skills/SKILL_CONTRACTS.md` 与本文件 |
| 需要沉淀哪些状态 | feature contract、pipeline、minimalState、I/O schema、fallback、validation categories |
| 不应该写入什么 | API key、完整聊天原文、隐藏孢子位置给宿主、宿主出生点给真菌、未验证的推断 |
| read 触发条件 | 修改 skill、验证 skill、解释 agent 架构、排查自动演示 |
| write 触发条件 | 新增 skill、改变 AI 行为、改变 API、改变验证标准 |
| memory 冲突处理规则 | 当前代码真实状态优先；contract 文档不一致时，以验证脚本失败为准并更新文档 |
| memory_schema（最小字段） | `{ featureName, pipeline[], minimalState[], inputs[], outputs[], validations[], fallbacks[] }` |
| outputStateKey | `skillContract.feature` |

### S5：LLM Planner / Routing 决策规则

| 用户请求特征 | LLM Planner 应该生成什么 step | 代码不应该做什么 |
|---|---|---|
| “skill / pipeline / state / I/O / 验证” | 选择 `skill_contract_check`，再根据 issue 修 handler/router | 不用硬编码 if/else 直接选 skill |
| “起服务器 / 后端 / 8002” | 选择 `backend_health_check` | 不先安装 RAG 重依赖卡住主服务 |
| “RAG / 知识库 / 阶段解释” | 选择 `rag-qa` 或 `infection-simulation` 的 RAG pipeline | 不把 RAG 依赖作为 `/api/generate` 前置 |
| “AI vs AI / 自动演示” | 选择 `ai-vs-ai-auto-demo` 对应 pipeline | 不允许 unresolved ending |
| “只改页面文案 / 导航” | 选择 `site-navigation` 或局部 UI skill | 不触碰 AI 决策和后端 |

主原则：语义选择必须由 LLM Planner 完成；代码只做 CLI 分发、schema 校验和 contract 校验。LLM 失败时必须 fail closed，不能由本地规则选择 skill。

### S6：State Schema 增量

| 新增字段 | 来源 | 类型 | 使用者 | 必须 / 可选 | 缺失时处理 |
|---|---|---|---|---|---|
| `feature.pipeline` | handler contract | Array | router validator | 必须 | `pipelineInvalid` |
| `feature.minimalState` | handler contract | Array | router validator / agent | 必须 | `stateTooBroad` 或 `contractMissing` |
| `feature.inputs` | handler contract | Array | I/O validator | 必须 | `ioMismatch` |
| `feature.outputs` | handler contract | Array | I/O validator | 必须 | `ioMismatch` |
| `feature.validations` | handler contract | Array | router validator | 必须 | `validationMissing` |
| `feature.fallbacks` | handler contract | Array | runtime reasoning / validator | 必须 | `contractMissing` |
| `autoDemo.infectedHostHistory` | `static/script.js` | Array | `ai-vs-ai-auto-demo` | 可选但应存在 | fallback 为本地 wait/move/layer |
| `serviceStatus.rag` | `/api/rag/health` | Object | RAG QA / stage guide | 可选 | 显示 readable error |

### S7：成功标准

必须让这个自然语言请求跑通：

**请求：** “检查这个项目的 skills 是否已经具备 pipeline、最小 state、I/O 对齐和验证通过标准。”

期望 execution_plan：

```text
read workbook/contracts
→ llm_skill_plan
→ skill_contract_check
→ inspect failed issue types if any
→ patch handler/router/validator
→ run node --check
→ run router check-all
→ run validate-feature-handlers
→ summarize contractOk and residual risks
```

期望 final_answer 比 baseline 多出的价值：

- 不只说“文件存在”。
- 能说明每个 skill 的 pipeline、minimalState、I/O、fallback 和 validations 已声明。
- 能给出 `contractOk: true`、handler 数量、issueCounts。
- 能指出 RAG 重依赖是可选能力，不阻塞主后端。

---

### 最小规格自检清单（进入 AI Coding 前逐项检查）

```text
☑ S3 至少 1 个 tool/API contract 的 description 能区分使用场景
☑ S3 的 inputSchema 能约束 Planner 需要抽取的参数
☑ S4 memory/state schema 写清了“不应该记什么”
☑ S4 写了 contract 冲突处理规则
☑ S5 至少有 1 条“不应该调用 tool / 不应该做什么”的反例规则
☑ S6 每个新增 state 字段都有来源、使用者和缺失处理
☑ S7 成功标准包含 user_request、expected_plan、关键 state_delta 和 final_answer 改进点
```

结论：本文件规格完整，可以进入 AI Coding / 搭建阶段。

---

## Part D：Planner Rules

### D1：不调用 Tool / API 的规则

如果用户请求只是“解释某段已有代码含义”，则只读相关文件并回答，不调用 `/api/generate`、不启动服务器、不安装依赖。

判断依据：请求是理解/解释，不需要运行时证据或外部 AI 生成。

### D2：调用 API / 命令工具的规则

| 规则编号 | 触发条件 | 应调用 tool / command | 参数抽取方式 | 优先级 |
|---|---|---|---|---|
| R1 | 用户要求起服务器 | 端口检查、`http.server`、Flask 后端 | 端口 `8000` / `8002` | 高 |
| R2 | 用户要求验证 skill | `node .cursor/skills/router.js check-all` | 项目根路径 | 高 |
| R3 | 用户要求 RAG 问答 | `/api/rag/health` 后再 `/api/rag/ask` | question、top_k | 中 |
| R4 | 用户要求自动演示 | 前端服务 + 后端 `/api/health` + auto-demo contract | demo entry / status | 高 |

### D3：调用项目 memory / contract 的规则

| 规则编号 | 触发条件 | read / write | 写入内容摘要 | 优先级 |
|---|---|---|---|---|
| M1 | 修改 skill 或 handler | read `SKILL_CONTRACTS.md` | 不写，除非 contract 改变 | 高 |
| M2 | 新增 AI 行为 | write contract + handler metadata | pipeline、minimalState、I/O、fallback | 高 |
| M3 | 验证失败 | write failure log 到本文件下一版 | issue type、root cause、fix | 中 |

---

## Part E：Planner Cases 与运行记录

### Case 1：Skill contract 自检

| 项目 | 填写 |
|---|---|
| case_id | `C1_skill_contract_check` |
| user_request | “这些 skill 的 pipeline、state 最小、I/O 对齐、验证通过做了吗？” |
| expected_plan | read contracts → router check-all → validate-feature-handlers → summarize |
| actual_plan | 已按 contract 搭建并验证 |
| tool_called | 是 |
| memory_read | 是，读取 `SKILL_CONTRACTS.md` |
| memory_write | 是，写入本 workbook |
| key_state_delta | `summary.contractOk=true` |
| final_answer 是否使用 tool/memory 信息 | 是 |
| pass / fail | pass |
| failure_type（如 fail） | 无 |
| 备注 | 验证不再只是 symbol check |

### Case 2：AI vs AI 感染后宿主反应

| 项目 | 填写 |
|---|---|
| case_id | `C2_infected_host_demo` |
| user_request | “感染后宿主 AI 没反应，修复自动演示第二阶段。” |
| expected_plan | inspect auto-demo → add infected snapshot/action/loop → validate |
| actual_plan | 已新增感染后宿主 AI 相关函数并纳入 auto-demo skill contract |
| tool_called | 是 |
| memory_read | 是，读取 auto-demo contract |
| memory_write | 是，更新 handler contract |
| key_state_delta | `autoDemo.infectedHostHistory`、`runInfectedHostAIDemoLoop` |
| final_answer 是否使用 tool/memory 信息 | 是 |
| pass / fail | pass |
| failure_type（如 fail） | 无 |
| 备注 | 仍需浏览器人工观察演示画面 |

### Case 3：服务器启动避免重依赖卡死

| 项目 | 填写 |
|---|---|
| case_id | `C3_light_backend_start` |
| user_request | “起一下服务器 / 怎么跑这么久？” |
| expected_plan | check ports → avoid RAG heavy install → lazy import RAG deps → start backend |
| actual_plan | `/api/generate` 后端轻量启动，RAG 缺依赖返回 readable error |
| tool_called | 是 |
| memory_read | 是，读取 backend |
| memory_write | 是，记录到本 workbook |
| key_state_delta | `serviceStatus.backend=ok`、`serviceStatus.rag=optional_error` |
| final_answer 是否使用 tool/memory 信息 | 是 |
| pass / fail | pass |
| failure_type（如 fail） | 无 |
| 备注 | 完整 RAG 仍需单独安装重依赖 |

### Case 4：纯文档/解释请求（反例）

| 项目 | 填写 |
|---|---|
| case_id | `C4_explain_only` |
| user_request | “解释一下这个 handler.js 是干嘛的。” |
| expected_plan | read file → explain |
| actual_plan | 不应启动服务器、不应调用 GLM、不应改 contract |
| tool_called | 否，除只读文件外 |
| memory_read | 可选 |
| memory_write | 否 |
| key_state_delta | 无 |
| final_answer 是否使用 tool/memory 信息 | 是，使用文件内容 |
| pass / fail | pass |
| failure_type（如 fail） | 无 |
| 备注 | 这是避免过度执行的边界 case |

### Case 5：RAG 问答依赖缺失

| 项目 | 填写 |
|---|---|
| case_id | `C5_rag_optional_dependency` |
| user_request | “RAG 为什么不可用？” |
| expected_plan | call `/api/rag/health` → explain missing optional deps → keep backend alive |
| actual_plan | RAG health 返回清晰 message，不影响 `/api/health` |
| tool_called | 是 |
| memory_read | 是 |
| memory_write | 是 |
| key_state_delta | `serviceStatus.rag.status=error` with readable message |
| final_answer 是否使用 tool/memory 信息 | 是 |
| pass / fail | pass |
| failure_type（如 fail） | 无 |
| 备注 | 不再让 pip 安装阻塞演示 |

---

## Part F：Failure Log

### failure_type 参考

| failure_type | 含义 |
|---|---|
| `contractMissing` | handler 缺少必须 contract 字段 |
| `pipelineInvalid` | pipeline 步骤缺 id/reads/writes/requires/produces |
| `stateTooBroad` | minimalState 缺失或过宽 |
| `ioMismatch` | inputs/outputs 为空或与项目符号不对齐 |
| `validationMissing` | 缺 existence/io/fallback/privacy/boundary/result 等验证类别 |
| `runtime_dependency_blocker` | 可选依赖阻塞主服务启动 |
| `skill_behavior_error` | contract 正确但运行行为不符合预期 |
| `unknown` | 暂时无法归因 |

### Failure 记录

| 项目 | 填写 |
|---|---|
| case_id | `F1_infection_simulation_missing_io` |
| failure_type | `validationMissing` |
| 发生了什么 | `infection-simulation` handler 初次 contract 检查缺少 `io` 类验证 |
| 应该发生什么 | 每个 handler 至少包含 existence + io + 一个 feature-specific category |
| 根因分析 | 原 contract 只写了 boundary/fallback/result，没有显式 I/O 对齐 |
| 修复方式 | 添加 `infection-state-io` validation |

---

## Part G：边界互测记录

| 项目 | 填写 |
|---|---|
| 边界请求 | “只要页面能演示，RAG 不重要，别再装 29 分钟。” |
| Planner 生成的 plan | 停止依赖安装路径 → 懒加载 RAG 重依赖 → 用系统 Python 启动轻量后端 |
| 是否正确处理 | 是 |
| 如果处理不当，问题在哪 | 继续安装会阻塞演示主路径 |
| 学到什么 | 可选能力必须从主启动路径剥离 |

---

## Part H：Version Lineage

| Version | What changed | Why | Which case improved |
|---|---|---|---|
| v1 | 建立 `.cursor/skills/*/SKILL.md + handler.js` | 让每个功能分支可被描述和验证 | C1 |
| v2 | 新增 `SKILL_CONTRACTS.md` 和 contract fields | 从浅验证升级到 pipeline/state/I-O contract | C1 |
| v3 | RAG 重依赖懒加载，轻量后端启动 | 避免服务器启动被可选依赖阻塞 | C3 / C5 |
| v4 | 新增本 workbook | 对齐 Lesson10 的 agent 完整性规格和自检流程 | C1-C5 |

---

## Part I：展示反思

当前 agent 最需要继续改进的是：

把静态 contract 验证进一步升级为少量 runtime smoke tests，例如自动检查 `/api/generate` 的本地 fallback、自动演示状态条是否出现、RAG error panel 是否可读。

原因是：

现在的 contract 能证明结构完整，但浏览器内的真实交互仍需要人工观察或后续 Playwright 类 smoke test。

---

## Part J：项目迁移

本项目中，需要接入的外部资源是：

- GLM-5 API
- RAG ChromaDB 知识库
- 前端浏览器运行环境

它们应该设计成：

- GLM-5 API：普通后端 API proxy。
- RAG ChromaDB：可选本地资源，懒加载。
- 前端浏览器：后续可加 smoke test 工具，目前人工验证。

选择理由：

GLM-5 是在线模型服务，需要后端代理；RAG 是增强功能，不能阻塞核心演示；浏览器验证属于运行时 UI 层，不应混进 handler 静态 contract。

本项目需要记住的状态是：

- skill contract schema
- feature pipeline
- minimal state
- validation categories
- runtime fallback policy

下一次最有用的字段是：`feature.pipeline[]` 和 `feature.validations[]`

下次最小迁移动作：

- 写 1 条 runtime smoke test contract。
- 给 auto-demo 增加一条浏览器观察记录模板。
- 把 RAG 完整安装作为单独任务，不阻塞主演示。

---

## 附录 A：AI Coding 使用约束

```text
实现时必须遵守：
1. 基于当前项目结构增量改造。
2. 不重写 Skill Registry。
3. 不重写已有 Skill handler 核心验证逻辑，优先增强 contract。
4. RAG 重依赖必须可选，不能阻塞 /api/generate 后端启动。
5. Tool/API result 必须能映射到 state 或 UI output。
6. 每个新增 agent 能力必须写 pipeline、minimalState、inputs、outputs、validations、fallbacks。
7. 每次搭建后必须运行 node --check、router check-all、validate-feature-handlers。
```

## 附录 B：AI Coding 前坏味道

| # | 坏味道 | 预防方式 |
|---|---|---|
| 1 | 只检查函数名存在就说验证通过 | 使用 contract validation，查看 `contract.ok` |
| 2 | 把可选 RAG 依赖放在后端顶层 import | 懒加载 `chromadb` 和 `sentence_transformers` |
| 3 | 自动演示出现 unresolved ending | `forceAutoDemoResult` 和 `waitForDemoResult` 必须在 contract 中覆盖 |
| 4 | 宿主 AI 获得隐藏孢子信息 | host snapshot privacy 验证 |
| 5 | 真菌 AI 获得宿主出生点 | fungus context privacy 验证 |

## 附录 C：兜底路线

如果网络、GLM-5 或 RAG 环境不稳定：

| fallback | 对应真实调用 | 达标要求 |
|---|---|---|
| `buildFallbackSporeDeployment` | `/api/generate` 孢子部署 | 生成 10 个合法孢子 |
| `getSmartFallbackHostMove` | `/api/generate` 宿主移动 | 输出合法 `move` 或 `layer` |
| `getInfectedHostFallbackAction` | `/api/generate` 感染后宿主求生 | 输出合法 `move` / `layer` / `wait` |
| `buildLocalAICommentary` | `/api/generate` 局面解说 | 渲染可读分析 |
| RAG readable error | `/api/rag/health` / `/api/rag/ask` | 不阻塞主后端，解释缺依赖 |

兜底达标要求：即使外部 AI 或 RAG 不可用，`AI vs AI 自动演示`仍应可进入流程、展示状态、出现胜负结果；skill contract 验证仍应返回 `contractOk: true`。
