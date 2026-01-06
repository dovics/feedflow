# FeedFlow - RSS 阅读器

一个基于 Next.js 的现代 RSS 阅读器，使用 PostgreSQL 数据库存储用户数据和 RSS 订阅。

## 功能特性

- 用户注册和登录
- 添加 RSS 订阅源
- 自动同步 RSS 内容
- 简洁的界面展示 RSS 条目
- 按订阅源筛选内容
- 手动刷新订阅源
- 🎨 深色/浅色主题切换
- 自动跟随系统主题偏好
- 优化的颜色对比度（符合 WCAG 标准）
- ⏰ RSS 自动刷新（管理员配置）
- 增量文章添加（基于链接去重）
- 👤 管理员权限系统
- 平台配置管理
- 🤖 RSS 源自动分类（基于 OpenAI 大模型）
- 👑 平台管理员系统（SUPER_ADMIN）

## 技术栈

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma ORM
- NextAuth.js
- RSS Parser
- next-themes（主题管理）

## 快速开始

### 前置要求

- Node.js 18+
- Docker & Docker Compose

### 开发环境部署

#### 方式一：使用 Docker Compose（推荐）

1. 克隆项目并安装依赖：

```bash
cd feedflow
npm install
```

2. 启动开发环境数据库：

```bash
docker compose -f docker-compose.dev.yml up -d
```

3. 配置环境变量：

编辑 `.env` 文件，确保 `DATABASE_URL` 正确配置：

```env
DATABASE_URL="postgresql://feedflow:feedflow@localhost:5432/feedflow?schema=public"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

4. 运行数据库迁移：

```bash
npx prisma migrate dev --name init
```

5. 启动开发服务器：

```bash
npm run dev
```

6. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

#### 方式二：使用单独的 PostgreSQL 容器

### 安装步骤

1. 克隆项目并安装依赖：

```bash
cd feedflow
npm install
```

2. 启动 PostgreSQL 数据库：

```bash
docker run -d --name feedflow-postgres \
  -e POSTGRES_USER=feedflow \
  -e POSTGRES_PASSWORD=feedflow \
  -e POSTGRES_DB=feedflow \
  -p 5432:5432 \
  postgres:16-alpine
```

3. 配置环境变量：

编辑 `.env` 文件，确保 `DATABASE_URL` 正确配置：

```env
DATABASE_URL="postgresql://feedflow:feedflow@localhost:5432/feedflow?schema=public"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# OpenAI 配置（可选，用于 RSS 源自动分类）
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4o-mini"
```

注意：OpenAI 配置也可以在管理员面板中设置。

4. 运行数据库迁移：

```bash
npx prisma migrate dev --name init
```

5. 启动开发服务器：

```bash
npm run dev
```

6. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用说明

### 注册账户

1. 访问 [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup)
2. 填写邮箱和密码
3. 点击"Sign up"完成注册

### 登录系统

1. 访问 [http://localhost:3000/auth/signin](http://localhost:3000/auth/signin)
2. 输入邮箱和密码
3. 点击"Sign in"登录

### 添加 RSS 订阅

1. 登录后，在左侧"Add Feed"区域输入 RSS URL
2. 点击"Add Feed"按钮
3. 系统会自动解析并导入 RSS 内容

### 阅读文章

- 查看所有订阅源的文章
- 点击左侧订阅源名称筛选特定来源的文章
- 点击文章标题在新标签页打开原文

### 刷新订阅源

点击订阅源旁边的"↻"按钮手动刷新内容

## 项目结构

```
feedflow/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   └── migrations/            # 数据库迁移文件
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # 认证相关 API
│   │   │   ├── feeds/         # RSS 订阅管理 API
│   │   │   └── items/         # RSS 条目 API
│   │   ├── auth/              # 登录/注册页面
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 主页面
│   ├── components/
│   │   └── AuthProvider.tsx   # 认证提供者
│   ├── lib/
│   │   ├── auth.ts            # NextAuth 配置
│   │   └── prisma.ts          # Prisma 客户端
│   └── types/
│       └── next-auth.d.ts     # NextAuth 类型定义
├── .env                       # 环境变量
└── package.json
```

## 数据库模型

### User (用户)
- id: 唯一标识符
- email: 邮箱地址（唯一）
- password: 加密密码
- name: 用户名

### Feed (RSS 订阅)
- id: 唯一标识符
- url: RSS 源地址（唯一）
- title: 订阅标题
- userId: 所属用户

### Item (RSS 条目)
- id: 唯一标识符
- title: 文章标题
- link: 文章链接
- description: 文章描述
- pubDate: 发布日期
- feedId: 所属订阅

## Docker 部署

### 使用 Makefile（推荐）

项目提供了 Makefile 来简化常用操作：

```bash
# 查看所有可用命令
make help

# 启动开发环境（仅数据库）
make dev

# 启动生产环境
make prod

# 构建生产镜像
make build

# 停止生产环境
make down

# 查看日志
make logs

# 进入数据库 shell
make db-shell

# 运行数据库迁移
make db-migrate

# 清理所有容器和卷
make clean
```

### 使用 Docker Compose

#### 生产环境部署

**使用默认配置：**

```bash
# 构建并启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 停止服务
docker compose -f docker-compose.prod.yml down

# 停止服务并删除数据卷
docker compose -f docker-compose.prod.yml down -v
```

**使用自定义配置：**

1. 创建 `.env.production` 文件：

```env
POSTGRES_PASSWORD=your-secure-password
POSTGRES_PORT=5432
APP_PORT=3000
NEXTAUTH_SECRET=your-production-secret
```

2. 启动服务：

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

#### 启用 RSS 自动刷新（可选）

如果要使用内置的 cron 服务：

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile with-cron up -d
```

这会每小时自动刷新所有 RSS 源。

#### 开发环境

1. 启动开发数据库：

```bash
docker compose -f docker-compose.dev.yml up -d
```

2. 运行数据库迁移：

```bash
npx prisma migrate deploy
```

3. 启动开发服务器：

```bash
npm run dev
```

生产环境会：
- 启动 PostgreSQL 数据库（端口 5432）
- 启动 Next.js 应用（端口 3000）
- 自动配置服务间网络通信
- 自动运行数据库迁移
- 数据持久化到 Docker 卷

### 数据库连接

开发环境可通过以下方式连接数据库：

```bash
# 使用 Docker exec
docker exec -it feedflow-postgres-dev psql -U feedflow -d feedflow

# 或从主机连接
psql -h localhost -p 5432 -U feedflow -d feedflow
```

连接信息：
- 主机：localhost
- 端口：5432
- 用户名：feedflow
- 密码：feedflow
- 数据库：feedflow

## 常用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 创建数据库迁移
npx prisma migrate dev --name migration_name

# 重置数据库
npx prisma migrate reset

# 生成 Prisma Client
npx prisma generate
```

## 注意事项

- 生产环境请修改 `.env` 中的 `NEXTAUTH_SECRET`
- 确保 PostgreSQL 数据库持续运行
- 首次使用需要注册账户
- RSS 源必须符合标准 RSS/Atom 格式
- **默认管理员账户**：
  - 必须设置环境变量 `DEFAULT_ADMIN_PASSWORD`，否则应用无法启动
  - 默认账户：`admin@feedflow.local`
  - 首次启动时自动创建，角色为 `SUPER_ADMIN`（平台管理员）
- **用户权限层级**：
  - `USER`：普通用户，只能管理自己的订阅
  - `ADMIN`：管理员，可访问后台管理功能
  - `SUPER_ADMIN`：平台管理员，可访问所有功能并管理其他用户权限
  - 首个注册的用户自动成为 `ADMIN`
  - 只有 `SUPER_ADMIN` 可以将其他用户提升为 `SUPER_ADMIN`
- **OpenAI 分类功能**：
  - 可在管理员面板中配置 OpenAI API（`/admin`）
  - 配置 `OPENAI_BASE_URL`、`OPENAI_API_KEY` 和 `OPENAI_MODEL`
  - 也可通过环境变量 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`OPENAI_MODEL` 设置默认值
  - 添加 RSS 源时会自动分类（如果已配置 OpenAI）
  - 手动分类可调用 `/api/feeds/{feedId}/categorize` API
- **RSS 定时刷新功能**：
  - 应用启动时自动初始化调度器
  - 可在管理员面板中配置刷新间隔（秒）
  - 支持启动、停止、重启调度器
  - 修改刷新间隔后调度器会自动重启
  - 使用 node-cron 库实现内置定时任务
  - 刷新间隔支持：秒、分钟、小时、天

## 后续开发方向

- [x] 深色/浅色主题切换
- [x] 管理员权限系统
- [x] RSS 自动刷新
- [x] 增量文章添加
- [ ] 添加文章阅读状态标记
- [ ] 支持文章收藏
- [ ] 添加搜索功能
- [ ] 支持 OPML 导入/导出
- [ ] 添加移动端适配
- [ ] 管理员手动创建用户
- [ ] 多管理员支持

## 文档

- **[用户指南](./USER_GUIDE.md)** - 如何使用 FeedFlow
- **[管理员指南](./ADMIN_GUIDE.md)** - 管理员功能和配置
- **[Cron 设置指南](./CRON_SETUP.md)** - 配置 RSS 自动刷新
- **[主题文档](./THEME.md)** - 主题系统说明
- **[Prisma 故障排除](./PRISMA_TROUBLESHOOTING.md)** - 常见问题解决
- **[API 测试](./API_TESTING.md)** - API 错误测试

## 许可证

MIT