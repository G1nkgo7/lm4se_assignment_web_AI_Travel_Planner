# Web 版 AI 旅行规划师

面向中文旅客的智能行程助手，融合语音输入、地图检索、预算提示与大模型行程生成。前端使用 Next.js，后端基于 Express，支持容器化部署。

## 功能亮点
- 一键生成目的地行程，支持自定义预算和偏好
- 与高德地图联动，展示重点景点与路线
- Scenic 图库 + 百度图片搜索，自动匹配目的地风光图
- Supabase 存储行程，前后端完全分离可独立扩展

## 项目结构
```
travel-planner/
├── frontend/     # Next.js 应用
├── backend/      # Express + TypeScript API
├── infra/        # Dockerfile 与部署脚本
├── docs/         # 架构与需求文档
├── docker-compose.yml
└── .env.example
```

## 快速开始（本地开发）
1. 安装依赖
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```
2. 复制环境变量模板并按需填写
   ```bash
   cp .env.example backend/.env
   cp .env.example frontend/.env.local
   ```
3. 分别启动后端与前端
   ```bash
   npm run dev --prefix backend
   npm run dev --prefix frontend
   ```
   默认端口：前端 `3000`，后端 `3001`。如需代理，在前端 `.env.local` 中设置 `API_PROXY_TARGET=http://localhost:3001`。

### 核心环境变量
| 作用域 | 变量 | 用途 |
| --- | --- | --- |
| 前端 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 |
| 前端 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key |
| 前端 | `NEXT_PUBLIC_AMAP_JS_KEY` | 高德 JS Key（配合可选 `NEXT_PUBLIC_AMAP_SECURITY_CODE`） |
| 前端 | `NEXT_PUBLIC_API_BASE_URL` | API 基础路径，容器内通常为 `/api` |
| 后端 | `SUPABASE_PROJECT_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务访问 |
| 后端 | `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` | 大模型配置 |
| 后端 | `MAP_API_KEY` | 高德 Web 服务 Key |

其余变量请参考 `.env.example`。切勿提交任何 `.env` 文件。

## 容器部署
```bash
docker compose up --build
```
上述命令使用 `infra/Dockerfile.*` 构建前后端镜像，读取 `frontend/.env.local` 与 `backend/.env`。若使用远程镜像，可在根目录创建 `.env.release` 指定 `BACKEND_IMAGE` 与 `FRONTEND_IMAGE`，并通过 `--env-file` 注入密钥。

示例（阿里云镜像）：
```bash
docker pull <reg>/travel-planner-backend:latest
docker pull <reg>/travel-planner-frontend:latest
docker run -d --name travel-backend --env-file backend.env -p 3001:3001 <reg>/travel-planner-backend:latest
docker run -d --name travel-frontend --env-file frontend.env -e NEXT_PUBLIC_API_BASE_URL=http://travel-backend:3001 -p 3000:3000 <reg>/travel-planner-frontend:latest
```

## 技术栈
| 模块 | 技术 |
| --- | --- |
| 前端 | Next.js 14, React 18, Tailwind CSS, Zustand |
| 后端 | Express, TypeScript, Supabase SDK |
| LLM | 默认接入阿里云百炼（可换自建 Qwen） |
| 地图 | 高德地图 JS SDK + Web 服务 API |
| 部署 | Docker, Docker Compose, GitHub Actions |

## 文档
- `docs/ARCHITECTURE.md` – 系统架构说明
- `docs/REQUIREMENTS.md` – 功能需求与验收标准

贡献时请确保密钥未入库，并附带必要的测试说明。
