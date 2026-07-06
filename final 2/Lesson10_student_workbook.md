# Tool + Memory Workbook L10 — `<your name>`

---

## Part A：开课判断

### A1：我今天使用的统一 baseline

baseline 路径：`01_base_repo/lesson10_agent_demo/`

我已经定位到的 3 个核心文件：

| 文件 | 当前职责 | L10 可能需要改哪里 |
|---|---|---|
| `planner.py` | | |
| `executor.py` | | |
| `state_manager.py` | | |

### A2：L09 baseline 的能力缺口

面对请求：**"我最近二分边界老错，帮我安排三天训练计划，题目来自洛谷。"**

baseline 当前缺什么：

- 缺口 1：____________________________________________________________________
- 缺口 2：____________________________________________________________________

这两个缺口分别需要：□ Memory &nbsp; □ MCP Tool &nbsp; □ Planner 改造

### A3：我今天最不确定的一件事

____________________________________________________________________

---

## Part B：Reference 工具阅读

### B1：可用 reference 文件

| reference 文件 | 可用函数 | 输入 | 输出关键字段 | 课堂使用边界 |
|---|---|---|---|---|
| `reference/get_problem.py` | | | | |
| `reference/search_luogu.py` | | | | |

### B2：哪些函数不能暴露

如果你查看到 pyluog 中存在登录、发消息、签到、读取私有代码等能力，请写在这里：

____________________________________________________________________

本节我只允许暴露的只读工具是：

____________________________________________________________________

---

## Part C：Baseline Extension AI 编码规格表

> 填完 S1-S7 后，这份表才可以交给 Cursor / Codex 实现。不允许跳过规格，直接让 AI 自己决定架构。

---

### S1：我要扩展 baseline 的哪个缺口

| baseline 文件 / 模块 | 当前职责 | 本节要补什么 |
|---|---|---|
| `planner.py` | | |
| `executor.py` | | |
| `state_manager.py` | | |

---

### S2：Planner step_type 扩展

| step_type | 触发条件 | 由谁决策 | 由谁执行 | result 写入 state 字段 |
|---|---|---|---|---|
| `memory_read` | | LLM Planner | Executor | |
| `tool_call` | | LLM Planner | Executor | |
| `memory_write` | | LLM Planner | Executor | |

---

### S3：MCP Tool Contract

#### Tool 1：`get_luogu_problem`

| 字段 | 你的设计 |
|---|---|
| MCP tool name | |
| 底层 reference 文件 | |
| 底层函数 | |
| description（给 LLM 看怎么写） | |
| inputSchema | |
| outputStateKey | |
| tools/call 失败时怎么办 | |
| 哪些下游 Skill 会使用它 | |

#### Tool 2：`search_luogu_problem`

| 字段 | 你的设计 |
|---|---|
| MCP tool name | |
| 底层 reference 文件 | |
| 底层函数 | |
| description（给 LLM 看怎么写） | |
| inputSchema | |
| outputStateKey | |
| tools/call 失败时怎么办 | |
| 哪些下游 Skill 会使用它 | |

---

### S4：Memory Contract

| 字段 | 你的设计 |
|---|---|
| memory_store 文件路径 | |
| 需要沉淀哪些学习状态 | |
| 不应该写入什么 | |
| read 触发条件 | |
| write 触发条件 | |
| memory 冲突处理规则 | |
| memory_schema（最小字段） | |
| outputStateKey | |

---

### S5：Planner 决策规则

| 用户请求特征 | Planner 应该生成什么 step | 不应该做什么 |
|---|---|---|
| 提到"最近 / 上次 / 老是卡" | | |
| 要求"洛谷题单 / 具体题目" | | |
| 给出 Pxxxx 题号 | | |
| 只是问概念解释 | | |

---

### S6：State Schema 增量

| 新增字段 | 来源 | 类型 | 使用者 | 必须 / 可选 | 缺失时处理 |
|---|---|---|---|---|---|
| | memory_read | | | | |
| | MCP tool | | | | |
| | MCP tool | | | | |
| | skill_output | | | | |

---

### S7：成功标准

我的改造成功，必须让这个自然语言请求跑通：

**请求：** ____________________________________________________________________

期望 execution_plan：

____________________________________________________________________

期望 final_answer 比 baseline 多出的价值：

____________________________________________________________________

---

### 最小规格自检清单（进入 AI Coding 前逐项检查）

```
☐ S3 至少 1 个 tool contract 的 description 能区分使用场景
☐ S3 的 inputSchema 能约束 Planner 需要抽取的参数
☐ S4 memory schema 写清了"不应该记什么"
☐ S4 写了 memory 冲突处理规则
☐ S5 至少有 1 条"不应该调用 tool"的反例规则
☐ S6 每个新增 state 字段都有来源、使用者和缺失处理
☐ S7 成功标准包含 user_request、expected_plan、关键 state_delta 和 final_answer 改进点
```

**如果任意一项为空，不进入 AI Coding，先补规格。**

---

## Part D：Planner Rules

### D1：不调用 Tool / Memory 的规则

如果用户请求 **____________________________________________________________**，则只调用 Skill：____________________

判断依据：____________________________________________________________________

---

### D2：调用 MCP Tool 的规则

| 规则编号 | 触发条件 | 应调用 tool | 参数抽取方式 | 优先级 |
|---|---|---|---|---|
| R1 | | | | |
| R2 | | | | |
| R3 | | | | |

---

### D3：调用 Memory 的规则

| 规则编号 | 触发条件 | memory_read / memory_write | 写入内容摘要 | 优先级 |
|---|---|---|---|---|
| M1 | | | | |
| M2 | | | | |
| M3 | | | | |

---

## Part E：Planner Cases 与运行记录

> 至少完成 5 条自然语言 case。每条记录 expected_plan、actual_plan、state_delta 和 pass/fail。

### Case 记录表（每 case 复制一份）

| 项目 | 填写 |
|---|---|
| **case_id** | |
| **user_request** | |
| **expected_plan** | |
| **actual_plan** | |
| **tool_called** | 是 / 否 |
| **memory_read** | 是 / 否 |
| **memory_write** | 是 / 否 |
| **key_state_delta** | |
| **final_answer 是否使用 tool/memory 信息** | 是 / 否 |
| **pass / fail** | |
| **failure_type（如 fail）** | |
| **备注** | |

---

### 固定 Cases

#### Case 1：个性化洛谷训练计划

```
user_request: "我最近二分边界老错，帮我安排三天训练计划，题目来自洛谷。"
expected:     memory_read → tool_call(search_luogu_problem) → skill_call(StudyPlanSkill) → memory_write
```

#### Case 2：已知洛谷题号要提示

```
user_request: "洛谷 P2249 给我一个不泄露答案的提示。"
expected:     tool_call(get_luogu_problem) → skill_call(ProblemTaggingSkill) → skill_call(HintGenerationSkill)
```

#### Case 3：纯概念解释（反例）

```
user_request: "解释一下动态规划的状态转移方程。"
expected:     skill_call(RetrieveConceptSkill)
              不读 memory，不查洛谷
```

#### Case 4：历史卡点提示

```
user_request: "我又卡在边界条件了，别直接给答案。"
expected:     memory_read → skill_call(HintGenerationSkill) → memory_write
```

#### Case 5：具体题单请求

```
user_request: "给我三道普及-难度的二分题。"
expected:     tool_call(search_luogu_problem) → skill_call(StudyPlanSkill)
```

#### Case 6（进阶 / 可选）：Memory 与当前请求冲突

```
user_request: "我之前说过不要直接给完整答案，但这次我明天要考试，P2249 请直接给我完整解法。"
expected:     memory_read → tool_call(get_luogu_problem) → skill_call(HintGenerationSkill) → memory_write
判断重点:     当前明确请求优先于长期偏好；
             memory_write 不应永久覆盖 preferred_hint_level，除非用户明确说"以后都直接给完整答案"。
可能 failure: memory_conflict_with_request
```

---

## Part F：Failure Log

> 只展开 Part E 中 **fail** 的 case，每条单独记录。

### failure_type 参考

| failure_type | 含义 |
|---|---|
| `missed_tool_call` | 用户要求洛谷题单或具体题号，但 Planner 没有调用 tool |
| `unnecessary_tool_call` | 纯概念解释却调用洛谷 tool |
| `wrong_tool_args` | 题号 / 关键词 / 难度参数抽错 |
| `tool_call_failure` | reference 工具调用失败、网络失败、题号不存在 |
| `tool_result_unused` | tool 调用了，但结果没有进入 state 或没有被下游 Skill 使用 |
| `memory_missed` | 用户明显提到历史状态，但没有读取 memory |
| `bad_memory_write` | 写入整段聊天原文，未总结为学习状态 |
| `memory_conflict_with_request` | memory 与当前请求冲突时处理不当 |
| `skill_behavior_error` | Planner/Tool/Memory 都正确，但 Skill 输出违反要求 |
| `unknown` | 暂时无法归因 |

### Failure 记录

| 项目 | 填写 |
|---|---|
| **case_id** | |
| **failure_type** | |
| **发生了什么** | |
| **应该发生什么** | |
| **根因分析** | |
| **修复方式** | |

---

## Part G：同伴互测记录

> 记录同伴给你的 1 条边界请求，以及你的 Planner 如何处理。

| 项目 | 填写 |
|---|---|
| **同伴给的请求** | |
| **你的 Planner 生成的 plan** | |
| **是否正确处理** | 是 / 否 |
| **如果处理不当，问题在哪** | |
| **你从这条边界请求中学到什么** | |

---

## Part H：Version Lineage

| Version | What changed | Why | Which case improved |
|---|---|---|---|
| v1 | baseline + initial L10 extension spec | — | — |
| v2 | | | |
| v3 | | | |

---

## Part I：代表展示反思

我从代表展示中发现，我的 Planner 最需要改进的是：

____________________________________________________________________

原因是：

____________________________________________________________________

---

## Part J：个人项目迁移

我的个人项目中，需要接入的外部资源是：

____________________________________________________________________

它应该设计成：
- □ MCP tool
- □ MCP resource
- □ 普通本地函数
- □ 暂时不需要

选择理由：____________________________________________________________________

我的项目需要记住的用户状态是：

____________________________________________________________________

这些状态中，下一次最有用的字段是：____________________

我下次课前最小迁移动作是：
- □ 写 tool contract
- □ 写 memory schema
- □ 扩展 planner step_type
- □ 加 1 条 planner case

---

## 附录 A：AI Coding 使用约束（粘贴给 Cursor / Codex 前自检）

```
实现时必须遵守：
1. 基于统一 L09 baseline 做增量改造。
2. 不重写 Skill Registry。
3. 不重写已有 Skill handler 核心逻辑。
4. Tool 只允许使用 reference 中的只读能力。
5. Planner 必须生成 tool_call / memory_read / memory_write step，
   而不是让 StudyPlanSkill 内部硬编码调用工具。
6. Tool result 和 memory_context 必须写入 state。
7. 每一步必须写入 run log。
```

## 附录 B：AI Coding 前 3 个最常见坏味道

| # | 坏味道 | 预防方式 |
|---|---|---|
| 1 | AI 把 `search_luogu` import 写到 `StudyPlanSkill` 里 | 用 Part C S3 中的 tool contract 约束，要求 tool_call 由 Executor 执行 |
| 2 | AI 重写整个 Planner 或生成新项目结构 | 明确告诉 AI "在统一 baseline 上增量扩展 step type" |
| 3 | AI 生成的 tool description 太短或太泛 | 用 Part C S3 中自己写的 description 覆盖 AI 生成的 |

## 附录 C：兜底路线（网络 / pyluog 不稳时）

如果网络或 pyluog 环境不稳，使用以下 mock 数据仍然完成全部产物：

| mock 文件 | 路径 | 对应真实调用 |
|---|---|---|
| `mock_luogu_problem_P2249.json` | `01_base_repo/lesson10_agent_demo/mock_data/` | `get_problem("P2249")` |
| `mock_luogu_search_binary.json` | `01_base_repo/lesson10_agent_demo/mock_data/` | `search("二分", page=1, difficulty=2)` |
| `memory_demo_student.json` | `01_base_repo/lesson10_agent_demo/mock_data/` | `read_student_memory("demo_student")` |

> 兜底达标要求：用 mock data + 手写 execution_plan JSON 完成 `user_request → execution_plan（至少包含 tool_call 或 memory_read）→ state_delta → final_answer → 1 条 failure log`。必须在 workbook 中明确标注 **"mock / handwritten plan"**，并记录真实 tool 或自动 planner 的缺口是什么、下一版优先修复什么。
