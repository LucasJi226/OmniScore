# OmniScore (全能乐谱) 🎼

为电子乐谱硬件（如 m5Stack Core2）量身打造的管理平台与乐谱分享社区。OmniScore 允许用户浏览、上传、管理自己的五线谱（如 `.musicxml`），并探索乐谱市场（Market）中其他创作者分享的作品。

本项目基于 **Cloudflare Workers (全栈架构)** 进行构建，特点是极速、Serverless 以及极致的低成本（可完全利用 Cloudflare 免费额度）。

## ✨ 核心功能
- **乐谱市场 (Market)**: 像 Maker World 一样，探索、搜索并下载由全球创作者分享的电子乐谱。
- **个人乐谱库 (Library)**: 独立管理和存储与您设备绑定的所有乐谱。
- **账号系统**: 纯 Serverless 的邮箱/密码注册登录系统，基于 JWT + HttpOnly Cookie 安全认证。
- **无缝上传**: 支持 `.musicxml` 等格式的上传，后端切片直传与统一管理。

## 🛠️ 技术栈
- **前端页面**: React 19 + Vite 6 + Tailwind CSS 4 + React Router
- **后端 API**: [Hono](https://hono.dev/) (极速的 Web 框架，专为 Edge 边缘网络设计)
- **数据库**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (边缘 SQLite 关系型数据库)
- **对象存储**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (无 Egress 费用的 S3 兼容存储)
- **部署架构**: Wrangler + Cloudflare Workers & Assets 架构

---

## 🚀 本地开发 (Local Development)

### 1. 环境准备
确保您的计算机上已安装了 [Node.js](https://nodejs.org/) (推荐 >= 20)。

### 2. 安装依赖包
```bash
npm install
```

### 3. 配置本地环境变量
将环境示例文件复制一份并重命名为 `.dev.vars` (这是 Wrangler 本地读取密码的环境变量文件)：
```bash
cp .env.example .dev.vars
```
打开 `.dev.vars`，随意生成一段长字符赋予 `JWT_SECRET`，例如：`JWT_SECRET="my_super_secret_local_jwt_key"`

### 4. 初始化本地数据库
运行以下命令，将 `schema.sql` 中的表结构应用到 Wrangler 本地模拟的 D1 数据库中：
```bash
npx wrangler d1 execute omniscore --local --file=./schema.sql
```

### 5. 启动本地开发服务
```bash
npm run dev
```
该命令会自动使用 `concurrently` 并发启动：
- **Vite 前端**: 监听 `http://localhost:3000` (如果端口冲突，请参考控制台提示)
- **Wrangler/Hono 后端**: 监听 `http://localhost:8787` (Vite 自动将 `/api` 的请求热代理至此)

---

## ☁️ 部署到 Cloudflare (Deployment)

要将项目发布到公网，请按照如下步骤操作：

### 1. 登录 Cloudflare
```bash
npx wrangler login
```

### 2. 创建并配置 D1 数据库
首先，创建一个线上数据库：
```bash
npx wrangler d1 create omniscore
```
命令执行成功后，终端会返回一段包含了 `database_id` 的代码。
打开后端的配置文件 `wrangler.toml`，找到 `[[d1_databases]]` 下的 `database_id`，替换为您刚刚获得的 ID：
```toml
database_id = "049e36c3-xxx-xxx" # 替换为终端打印出的您的实际 ID
```

### 3. 初始化线上数据库结构
将表结构同步至线上环境：
```bash
npx wrangler d1 execute omniscore --remote --file=./schema.sql
```

### 4. 创建 R2 存储桶
为乐谱文件创建一个对象存储空间（名字已在 wrangler.toml 中设为 `omniscore-bucket`）：
```bash
npx wrangler r2 bucket create omniscore-bucket
```

### 5. 配置线上 JWT 密钥 (Secret)
线上验证 Token 需要一个密钥，直接将其注入到 Cloudflare 的加密环境变量空间中（不要写在代码里）：
```bash
npx wrangler secret put JWT_SECRET
```
终端提示输入时，请贴入您生成的一个安全、复杂的长字符串。

### 6. 一键部署
一切准备就绪，即可编译全栈静态文件并发布 Workers 接口：
```bash
npx wrangler deploy
# 或者使用 npm run deploy
```

部署完成后，控制台将输出一个 `.workers.dev` 的线上访问地址，您即可在线上访问您的全能乐谱系统！

---

## 📂 项目结构指南

- `/src`: 前端所有 React 相关的代码目录。
  - `/src/pages`: 核心页面 (`Home.tsx`, `Market.tsx`, `Library.tsx`)
  - `/src/components`: UI 复用组件 (如顶栏 `Navbar.tsx`、登录框 `AuthModal.tsx`)
  - `/src/contexts`: 全局状态管理 (如 `AuthContext.tsx`)
- `/worker.ts`: Cloudflare Worker 入口文件，包含了所有基于 Hono 编写的后端 `/api/*` 接口逻辑。
- `/schema.sql`: D1 数据库建表语句 (定义了 users, scores 两张表)。
- `/wrangler.toml`: Cloudflare Workers & 静态资源的核心配置文件。
