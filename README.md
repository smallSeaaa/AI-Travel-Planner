# AI 旅行规划师 (AI Travel Planner)

## 项目简介

AI 旅行规划师是一款基于人工智能技术的 Web 应用，致力于为用户提供智能化、个性化的旅行规划服务。通过语音识别和自然语言处理技术，用户可以轻松生成完整的旅行行程，并进行预算管理和数据同步。

## 核心功能

### 智能行程规划

- **语音输入支持**：通过科大讯飞语音识别 API，支持语音输入旅行需求
- **AI 行程生成**：利用 OpenAI API 生成个性化、合理的旅行行程
- **地图集成**：集成高德地图 API，可视化展示行程路线和地点
- **行程编辑**：直观的界面支持手动调整和优化行程

### 费用预算管理

- **预算设置**：为旅行设置总预算和各项分类预算
- **实时费用跟踪**：记录和统计实际消费情况
- **费用分析**：图表化展示费用分布，提供省钱建议
- **货币转换**：支持多币种预算管理

### 用户数据云端同步

- **多设备同步**：在不同设备间无缝同步行程和预算数据
- **自动备份**：定期自动备份用户数据，防止数据丢失
- **数据导出**：支持将行程和预算数据导出为 PDF、Excel 等格式

## 技术栈

### 前端

- **框架**：React 18 + TypeScript
- **状态管理**：Redux Toolkit
- **UI 组件库**：Material-UI 5
- **HTTP 客户端**：Axios
- **地图集成**：高德地图 JavaScript API
- **图表库**：Chart.js

### 后端

- **BaaS 平台**：Supabase
- **数据库**：PostgreSQL（Supabase 内置）
- **认证**：Supabase Auth
- **存储**：Supabase Storage
- **服务端函数**：Supabase Edge Functions

### 第三方 API 集成

- **语音识别**：科大讯飞语音识别 API
- **AI 模型**：OpenAI API
- **地图服务**：高德地图 API

### 部署与运维

- **容器化**：Docker
- **CI/CD**：GitHub Actions
- **监控**：Supabase Analytics

## 系统架构

系统采用前后端分离架构：

- **前端应用**：部署在 Nginx 服务器上，提供静态资源和 SPA 应用
- **后端服务**：Supabase BaaS 平台
  - 数据库：PostgreSQL 存储用户数据
  - 认证：JWT 认证与用户管理
  - 存储：对象存储用于上传文件
  - Edge Functions：服务端逻辑处理

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+ 或 yarn 1.22+
- Docker 20.10+
- Supabase CLI 1.80+

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/smallSeaaa/AI-Travel-Planner.git
cd AI-Travel-Planner
```

2. **配置 Supabase**

````bash
# 登录Supabase CLI
supabase login

# 初始化本地Supabase环境（可选）
supabase init

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填入Supabase项目URL和API密钥

3. **前端应用安装与启动**

```bash
cd frontend
npm install
npm run dev
````

4. **使用 Docker Compose 启动（推荐）**

```bash
docker-compose up -d
```

## 项目文档

详细文档位于`docs`目录：

- [产品需求文档](./docs/产品需求文档.md)
- [技术架构设计文档](./docs/技术架构设计文档.md)
- [数据库设计文档](./docs/数据库设计文档.md)
- [API 设计文档](./docs/API设计文档.md)
- [用户界面设计文档](./docs/用户界面设计文档.md)
- [部署与集成方案文档](./docs/部署与集成方案文档.md)

## 联系方式

- 项目主页: https://github.com/smallSeaaa/AI-Travel-Planner
