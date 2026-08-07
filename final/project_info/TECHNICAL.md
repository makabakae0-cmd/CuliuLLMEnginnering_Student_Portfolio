# Fungi Simulator 工程说明

用户视角的产品介绍请查看 [README.md](README.md)。

大模型工程设计，包括 Prompt、RAG、Tool Calling、Memory、Agent、Multi-Agent、Safety Guard、Fallback、Trace 和测试失败分析，请查看 [LLM_ENGINEERING_NOTES.md](LLM_ENGINEERING_NOTES.md)。

测试与失败复盘请查看 [TEST_AND_FAILURE_LOG.md](TEST_AND_FAILURE_LOG.md)。

## 本地运行

项目由静态前端和 Flask 后端组成。前端负责页面交互、地图、游戏状态和演示流程；后端负责代理 GLM-5 生成能力，并提供 RAG 知识问答接口。

### 1. 启动后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ZHIPUAI_API_KEY="your_real_key"
python3 flask_glm5_server.py
```

后端默认地址：

```text
http://127.0.0.1:8002
```

健康检查：

```bash
curl http://127.0.0.1:8002/api/health
curl http://127.0.0.1:8002/api/rag/health
```

### 2. 启动前端

在项目根目录另开一个终端：

```bash
python3 -m http.server 8000
```

浏览器访问：

```text
http://127.0.0.1:8000/
```

## 技术栈

- 前端：HTML5、CSS3、Vanilla JavaScript
- 后端：Python、Flask、flask-cors、requests
- AI 生成：智谱 GLM-5 API
- RAG 问答：sentence-transformers、ChromaDB
- 运行方式：本地静态 HTTP 服务 + Flask API 服务

## 项目结构

```text
.
├── index.html                  # 单页应用入口：主页、配置、RAG、游戏区
├── static/
│   ├── script.js               # 游戏规则、AI 调用、感染模拟、自动演示
│   └── style.css               # 页面布局、地图、卡片、动画样式
├── backend/
│   ├── flask_glm5_server.py    # GLM-5 与 RAG API 后端
│   ├── requirements.txt        # Python 依赖
│   └── README.md               # 后端单独说明
├── .cursor/skills/             # 功能模块说明与 contract 验证
├── Project_one_pager_Emma.md   # 项目定义与 MVP 文档
├── ppt_pagesscript.md          # 演示讲稿
├── README.md                   # 用户视角产品介绍
└── TECHNICAL.md                # 当前工程说明文档
```

## 核心文件

- `index.html`：定义页面分区、配置区、RAG 问答区和游戏容器。
- `static/script.js`：包含游戏状态、AI 策略、宿主移动、感染模拟、AI 解说和自动演示逻辑。
- `static/style.css`：负责页面视觉、地图层级、状态卡片和交互动画。
- `backend/flask_glm5_server.py`：提供 GLM-5 代理、RAG 问答和健康检查接口。
- `.cursor/skills/`：记录各功能模块的维护说明、handler contract 和验证入口。

## Tool / API 设计

### `/api/health`

- 方法：`GET`
- 用途：检查后端是否启动。
- 典型输出：`status`、`service`、`model`。

### `/api/generate`

- 方法：`POST`
- 用途：统一代理 GLM-5 文本生成。
- 典型输入：`prompt` 或 `messages`，可附带 `temperature`、`max_tokens`。
- 使用场景：AI 孢子部署、宿主 AI 决策、感染阶段 AI 解说、自动演示中的 AI 行为。

示例：

```bash
curl -X POST http://127.0.0.1:8002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"用一句话解释虫草真菌如何感染昆虫"}'
```

### `/api/rag/health`

- 方法：`GET`
- 用途：检查 RAG 知识库和依赖状态。
- 设计要求：RAG 依赖缺失时返回可读错误，不阻塞主后端启动。

### `/api/rag/ask`

- 方法：`POST`
- 用途：基于真菌知识库回答课堂问题。
- 典型输入：`question`、`top_k`。
- 使用边界：问题为空时前端不应调用。

## Prompt 设计

项目中的 Prompt 不是固定问答，而是由当前模拟状态动态生成。

### AI 孢子策略

输入上下文包括真菌类型、环境、地图层级、可部署位置和规则限制。输出应尽量是可解析的部署方案，方便前端确认孢子位置。真菌 AI 不应读取宿主出生点。

### 宿主 AI 决策

输入上下文包括宿主类型、当前位置、巢穴目标、剩余步数和可行动作。普通宿主 AI 不允许读取隐藏孢子位置、最近孢子距离或陷阱提示。

### 感染阶段解说

输入上下文包括当前感染阶段、宿主状态、真菌类型和模拟事件。输出应是适合课堂科普的中文解释，避免恐怖化表达，重点解释自然现象和因果关系。

## RAG 设计

RAG 用于增强课堂知识问答和感染阶段解释，减少模型只凭记忆生成带来的幻觉风险。

- `/api/rag/health` 用于判断知识库是否可用。
- `/api/rag/ask` 接收用户问题并返回回答与检索证据。
- `sentence-transformers` 和 `chromadb` 属于较重依赖，不应成为 `/api/generate` 或主服务启动的前置条件。
- RAG 不可用时，前端应显示可读错误；感染阶段基础说明仍可使用本地文本。

## Agent 设计

项目使用 `.cursor/skills/` 记录功能模块和维护约束，覆盖：

- `ai-spore-strategy`：真菌 AI 孢子部署。
- `host-ai-decision`：宿主 AI 移动决策。
- `ai-commentary`：感染阶段 AI 解说。
- `infection-simulation`：8 阶段感染模拟。
- `rag-qa`：RAG 问答。
- `ai-vs-ai-auto-demo`：一键自动演示。
- `site-navigation`：页面导航与分区。

Agent 相关验证不只检查文件或函数是否存在，还应检查 pipeline、minimal state、inputs、outputs、validations 和 fallbacks 是否声明完整。

## Safety 设计

- 不要把真实 `ZHIPUAI_API_KEY` 写入代码、README、截图或提交记录。
- 真菌 AI 不允许读取宿主出生点。
- 普通宿主 AI 不允许读取隐藏孢子位置、最近孢子距离或陷阱提示。
- 感染解说应聚焦科学解释，避免血腥、恐怖或误导性表达。
- RAG 失败时返回可读错误，不让页面静默失败。
- 自动演示不应停在无法解释的未完成状态。

## Fallback 设计

课堂演示需要稳定性，因此 AI 或 RAG 不可用时要尽量降级运行。

- GLM-5 调用失败时，前端使用本地孢子部署 fallback。
- 宿主 AI 调用失败时，前端使用本地移动或等待策略。
- AI 解说失败时，前端使用本地感染阶段说明。
- RAG 不可用时，问答区展示错误提示，感染阶段基础流程继续可用。
- 自动演示失败时，应保留当前状态并给出可解释的下一步。

## 验证命令

后端健康检查：

```bash
curl http://127.0.0.1:8002/api/health
```

RAG 状态检查：

```bash
curl http://127.0.0.1:8002/api/rag/health
```

Skill contract 自检：

```bash
node .cursor/skills/router.js check-all
node .cursor/skills/validate-feature-handlers.js
```

## 维护注意事项

- 修改 AI 行为时，同步检查 prompt 输入、输出解析和 fallback。
- 修改 RAG 时，确认缺依赖不会阻塞 Flask 主服务。
- 修改自动演示时，确认演示能走到可解释的结束状态。
- 修改页面导航时，避免影响游戏区、配置区和 RAG 区的 DOM id。
- 最终展示前替换 `README.md` 中的截图和视频占位。
