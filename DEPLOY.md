# 新纪元英语词汇系统部署文档

本文档详细说明如何在服务器上部署“新纪元英语词汇系统” (Vocab System)。

## 系统要求

*   **操作系统**: Linux (Ubuntu 20.04+ / CentOS 7+), Windows Server, 或 macOS
*   **运行环境**: Node.js v16.0.0 或更高版本
*   **包管理器**: npm (随 Node.js 安装)
*   **端口**: 默认占用 3000 端口 (可通过 .env 配置)

## 快速部署流程

### 1. 获取代码

```bash
# 克隆仓库
git clone https://github.com/newsunlee007/vocab-system.git

# 进入项目目录
cd vocab-system
```

### 2. 安装依赖

```bash
npm install
```
*注意：由于项目依赖 `bcryptjs` 和 `nedb-promises`，请确保网络环境能够访问 npm 仓库。*

### 3. 配置环境变量

在项目根目录下创建一个 `.env` 文件（或复制 `.env.example`）：

```bash
# 服务器端口
PORT=3000

# JWT 密钥 (请务必修改为强随机字符串)
JWT_SECRET=your-secure-secret-key-here
```

### 4. 启动服务

```bash
# 启动服务
npm start
```

如果看到以下输出，说明服务启动成功：
```
Server running on http://localhost:3000
Database stored in: /path/to/vocab-system/server/data
```

## 生产环境部署建议

### 使用 PM2 进行进程管理

为了保证服务在后台稳定运行并在崩溃后自动重启，建议使用 PM2。

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server/server.js --name "vocab-system"

# 设置开机自启
pm2 startup
pm2 save
```

### 配置 Nginx 反向代理 (推荐)

建议使用 Nginx 作为反向代理，并配置 SSL 证书以启用 HTTPS。

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 数据备份

所有数据存储在 `server/data/` 目录下的 `.db` 文件中。
建议定期备份该目录下的所有文件。

```bash
# 备份示例
tar -czvf vocab-backup-$(date +%Y%m%d).tar.gz server/data/
```

## 常见问题

**Q: 默认管理员账号是什么？**
A: 系统初始化时未预置管理员账号。您可以通过修改 `data/seed.js` 或直接操作数据库文件来添加初始管理员，或者编写一个临时的注册脚本。

**Q: 如何修改端口？**
A: 修改 `.env` 文件中的 `PORT` 变量。

**Q: 跨域问题？**
A: 后端已启用 CORS，默认允许所有来源。在生产环境中，建议在 `server/server.js` 中配置 CORS 白名单。
