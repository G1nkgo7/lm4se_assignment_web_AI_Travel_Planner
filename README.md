# Web 版 AI 旅行规划师

本项目旨在打造一个支持语音与文本交互的智能旅行规划平台，利用大语言模型生成个性化行程、预算分析与实时辅助，配合地图与云端同步服务，帮助用户快速制定旅行方案。

## 目录结构

```
travel-planner/
├── README.md
├── docker-compose.yml
├── docs/
│   ├── ARCHITECTURE.md
│   └── REQUIREMENTS.md
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
├── backend/
│   └── src/
├── infra/
│   ├── Dockerfile.frontend
│   └── Dockerfile.backend
├── .env.example
└── .gitignore
```

## 核心能力规划

- **智能行程规划**：用户通过语音或文本输入目的地、时间、预算与偏好，后端调用大模型生成交通、住宿、景点与餐饮建议。
- **费用预算与管理**：自动给出预算分配并支持语音记账，前端图表展示实际开销与差异。
- **用户与数据管理**：基于 Supabase/Firebase 提供注册登录、行程存档、偏好配置与多端同步。
- **地图与导航**：整合高德/百度地图 API 展示路线，支持地点检索、路径规划与周边推荐。
- **实时辅助**：行程共享、实时协同、推送提醒，并预留后续扩展实时翻译与本地服务推荐。

## 技术选型

| 模块 | 方案 |
| --- | --- |
| 前端 | Next.js 14 + React 18 + TypeScript + Tailwind CSS + Zustand/Recoil 状态管理 |
| 语音 | Web Speech API（浏览器原生）+ 科大讯飞/阿里云语音识别 SDK 作为增强 |
| 地图 | 高德地图 JS API（需配置 Web Key 与 securityJsCode，可扩展后端代理保护密钥） |
| 后端 | Node.js (Express/NestJS) + TypeScript，结合任务队列处理长耗时行程生成 |
| 数据 | Supabase（Auth + Postgres + Storage）或 Firebase，可按需求切换 |
| 大模型 | 可配置 OpenAI、阿里云百炼、DeepSeek 等，支持多模型策略 |
| 部署 | Docker Compose 本地运行，GitHub Actions 自动构建镜像并推送至阿里云镜像仓库 |

## 快速开始

1. **克隆仓库并进入项目目录**
   ```bash
   git clone <your-repo-url>
   cd travel-planner
   ```

2. **复制环境变量模板**
   ```bash
   cp .env.example .env
   ```
   根据 README 或设置页面说明，填入 Supabase、地图、语音、大模型等密钥。请勿在仓库中提交真实密钥。

   若在高德开放平台开启了“安全密钥”校验，请将 `NEXT_PUBLIC_AMAP_SECURITY_CODE` 也填入，对应值可在控制台查看。

3. **启动前后端（本地开发模式）**
   - 前端 (`frontend/`)
     ```bash
     cd frontend
     npm install
     npm run dev
     ```
   - 后端 (`backend/`)
     ```bash
     cd backend
     npm install
     npm run dev
     ```

   为简化早期开发，可优先使用云端 Supabase 项目；若需要本地 Postgres，可在后续添加 docker-compose 服务。

4. **Docker 方式运行**（初步支持，后续完善）
   ```bash
   docker compose up --build
   ```

## 里程碑规划

1. **MVP 骨架**：搭建 Next.js 前端、Express 后端、基础 API 契约、语音与地图 SDK 初始化。
2. **AI 行程引擎**：实现通用 Prompt 模板、调度 LLM 完成行程生成与预算预估，添加 JSON Schema 校验。
3. **用户体系**：接入 Supabase Auth、实现行程 CRUD、偏好保存、费用记录与图表展示。
4. **实时与协同**：加入 Supabase Realtime/WebSocket，实现多端同步与通知提醒。
5. **部署与运维**：完善 Docker 镜像构建、GitHub Actions CI/CD、监控告警、日志与速率限制。
6. **交付物整合**：生成包含 GitHub 仓库地址与 README 的 PDF，编写完整操作文档与评测指南。

## 安全要求

- 所有密钥通过 `.env` 或运行时输入管理，前端设置页允许用户自助配置。
- 提供密钥使用说明；若需提供评测用 key，确保可用期 ≥ 3 个月，并放置在 README 指定区域。
- 加入日志审计与速率限制，避免滥用第三方 API。

## 文档规划

- `docs/ARCHITECTURE.md`：系统架构、模块交互、时序图与数据流。
- `docs/REQUIREMENTS.md`：功能清单、用户故事、非功能需求与验收标准。
- 未来新增部署指南、API 规范、隐私合规文档。

## 下一步

- 在 `frontend/` 与 `backend/` 目录内补充 package.json、基础代码与配置。
- 撰写 `ARCHITECTURE.md` 与 `REQUIREMENTS.md` 初稿。
- 设计 LLM Prompt 与地图/语音 API 的集成策略，准备 Mock 数据用于前端联调。

如需调整技术栈或集成方案，请在对应文档中注明并更新 README。
