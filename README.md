# AI 旅行规划师 (AI Travel Planner)

## 项目简介

AI 旅行规划师是一个基于人工智能技术的旅行规划应用，能够根据用户的旅行需求自动生成详细的行程安排。系统集成了智谱AI的大语言模型能力，结合Web Speech API实现语音输入功能，并使用Supabase提供云端数据存储和用户认证服务。

## 核心功能

### 智能行程规划
- 根据用户输入的目的地、天数、人数等信息自动生成旅行计划
- 个性化行程推荐，支持用户偏好设置
- 每日详细活动安排，包括时间、地点、活动内容和预算
- 住宿和交通建议
- **注意**：在使用导航功能前，需要先编辑旅行计划，为每个活动添加坐标地点信息

### 费用预算管理
- 活动预算自动估算
- 旅行支出记录与管理
- 预算可视化展示

### 用户数据云端同步
- 用户注册与登录功能
- 旅行计划云端保存
- 跨设备数据同步
- 个人偏好设置

## 技术栈

### 前端
- **框架**: React 18.2.0
- **构建工具**: Vite 5.0.8
- **路由管理**: React Router 6.25.1
- **样式**: CSS3

### 后端
- **数据库/认证**: Supabase
  - 主要数据表: `travel_plans`, `user_preferences`, `user_system_configs`, `expenses`
  - 环境变量配置: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### 第三方 API 集成
- **大语言模型**: 智谱AI API (GLM-4)
- **语音识别**: Web Speech API
- **地图服务**: 百度地图API

### 部署与运维
- **容器化**: Docker + Nginx
- **CI/CD**: GitHub Actions
- **镜像仓库**: 阿里云容器镜像服务

## 系统架构

```
客户端 (React Web应用)
  |
  |-- Supabase Auth (用户认证)
  |-- Supabase Database (数据存储)
  |-- 智谱AI API (旅行计划生成)
  |-- Web Speech API (语音识别)
  |-- 百度地图API (地图展示)
```

## 快速开始

### 方法一：使用Docker镜像运行（推荐）

#### 1. 下载Docker镜像

1. 访问项目的GitHub Releases页面
2. 下载最新版本的`ai-travel-planner-latest.tar`文件
3. 加载镜像到本地Docker：
   ```bash
   docker load -i ai-travel-planner-latest.tar
   ```

#### 2. 运行Docker容器

```bash
docker run -d -p 8080:80 crpi-hu7ken49ccjrsj6z.cn-hangzhou.personal.cr.aliyuncs.com/smallseaaa/ai-travel-planner:latest
```

**参数说明**：
- `-p 8080:80`: 将容器的80端口映射到主机的8080端口
- `--name ai-travel-planner`: 为容器指定名称

#### 3. 访问应用

打开浏览器，访问：http://localhost:8080

### 方法二：本地开发环境运行

#### 1. 克隆代码仓库

```bash
git clone https://github.com/smallSeaaa/AI-Travel-Planner.git
cd AI-Travel-Planner
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 启动开发服务器

```bash
npm run dev
```

## 系统配置（API密钥设置）

使用Docker镜像运行后，首次登录系统需要在用户设置中配置以下API密钥：

### 1. 登录系统

1. 访问 http://localhost:8080
2. 注册新账号或使用现有账号登录

### 2. 配置API密钥

1. 登录后，点击右上角用户头像，选择"用户设置"
2. 在"系统配置"部分，填入以下信息：
   
   **智谱AI API配置**
   
   **百度地图API配置**
3. 点击"保存配置"按钮

**注意**：API密钥将被安全加密存储在系统中，只有登录用户可以访问自己的配置。

## 数据库表结构

系统使用Supabase作为数据库服务，主要包含以下表：

1. **travel_plans** - 存储旅行计划
   - 包含目的地、行程、预算等信息
   - 复杂数据以JSON格式存储

2. **user_preferences** - 存储用户偏好设置
   - 用户ID与偏好内容的映射关系

3. **user_system_configs** - 存储用户系统配置
   - 包含加密的API密钥和配置信息

4. **expenses** - 存储旅行支出记录
   - 关联到特定用户和旅行计划

## 详细文档

详细文档位于`docs`目录：
- **产品需求文档**: `docs/产品需求文档.md`
- **技术架构设计文档**: `docs/技术架构设计文档.md`
- **部署与集成方案文档**: `docs/部署与集成方案文档.md`

## 常见问题

### 1. 无法生成旅行计划

- 检查智谱AI API密钥是否正确配置
- 确认网络连接正常
- 查看浏览器控制台是否有错误信息

### 2. 数据无法保存

- 确认Supabase连接配置正确
- 检查用户登录状态
- 查看数据库权限设置

### 3. Docker容器启动失败

- 检查端口映射是否冲突
- 验证环境变量是否正确设置
- 查看Docker日志：`docker logs ai-travel-planner`

## 联系方式

- 项目主页: https://github.com/smallSeaaa/AI-Travel-Planner
