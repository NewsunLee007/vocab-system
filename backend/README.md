# 后端（MariaDB + REST API）

## 目录结构

- `src/server.js` 启动入口（启动时自动执行 `db/schema.sql`）
- `db/schema.sql` 表结构（包含 vocabulary/teachers/students/learning_records）
- `openapi.yaml` API 文档（OpenAPI 3.0）

## 本地启动

1) 配置环境变量（参考 `.env.example`）

2) 启动服务

```bash
npm install
npm start
```

默认监听 `http://localhost:4000`。

## MariaDB 初始化（VPS）

1) 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS vocab_system CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

2) 创建专用用户并授权（示例，按需替换）

```sql
CREATE USER IF NOT EXISTS 'vocab_user'@'%' IDENTIFIED BY 'change_me';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP ON vocab_system.* TO 'vocab_user'@'%';
FLUSH PRIVILEGES;
```

3) 启动后端时会自动执行 `db/schema.sql`（若表不存在则创建）。

## 数据迁移（从旧 NeDB）

如果你此前使用的是 `server/data/*.db`（NeDB），可以执行：

```bash
node backend/scripts/migrate-from-nedb.js
```

默认读取目录：`vocab-system/server/data`，也可通过 `NEDB_DIR` 指定。

## 跨域配置（前后端分离）

设置环境变量 `CORS_ORIGIN`：

- 单个域名：`CORS_ORIGIN=https://your-frontend-domain.com`
- 多个域名：`CORS_ORIGIN=https://a.com,https://b.com`

同时使用 Cookie 会话时，需要：

- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=None`

## 前端如何指定后端地址

前端支持通过 URL 参数指定 API 地址：

`https://你的前端域名/?api=https://你的后端域名/api`
