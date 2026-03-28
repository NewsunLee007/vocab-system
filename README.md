# 新纪元英语词汇智能学习与语境检测系统

一个基于纯前端技术（HTML/CSS/JavaScript）的在线英语单词智能学习与语境检测系统，专为初中英语教育设计。

## 系统特点

- **三级权限架构**：教务处、教师端、学生端
- **游戏化学习**：3D卡片翻转、金币奖励、连击系统
- **间隔重复算法**：基于莱特纳算法的智能复习
- **AI语境检测**：真实语境选择题，即时反馈
- **数据隔离**：严格的数据权限控制
- **防作弊机制**：IP检测防止代写

## 技术栈

- **前端框架**：纯原生 JavaScript (ES6+)
- **样式框架**：Tailwind CSS (CDN)
- **图标库**：FontAwesome 6.4.0 (CDN)
- **数据存储**：localStorage
- **部署方式**：GitHub Pages 静态托管

## 项目结构

```
vocab-system/
├── index.html              # 主入口文件
├── css/
│   ├── main.css           # 全局样式
│   ├── components.css     # 组件样式
│   └── animations.css     # 动画效果
├── js/
│   ├── core/
│   │   ├── app.js         # 应用入口
│   │   ├── db.js          # 数据层
│   │   ├── auth.js        # 认证模块
│   │   └── router.js      # 路由控制
│   ├── modules/
│   │   ├── admin.js       # 教务处模块
│   │   ├── teacher.js     # 教师端模块
│   │   ├── student.js     # 学生端模块
│   │   ├── learning.js    # 学习模块
│   │   └── testing.js     # 检测模块
│   └── utils/
│       └── helpers.js     # 工具函数
├── data/
│   └── seed.js            # 初始测试数据
└── README.md              # 项目说明
```

## 快速开始

### 本地运行

1. 克隆或下载项目
2. 直接在浏览器中打开 `index.html`
3. 或使用本地服务器：
   ```bash
   cd vocab-system
   python3 -m http.server 8000
   # 然后访问 http://localhost:8000
   ```

### GitHub Pages 部署

1. 将项目推送到 GitHub 仓库
2. 进入仓库 Settings > Pages
3. 选择 Source 为 main 分支
4. 访问 `https://你的用户名.github.io/仓库名/`

## 默认测试账号

### 教务处
- 密码: `root`

### 教师账号
- 张三: `t01` / `123`
- 李四: `t02` / `123`

### 学生账号
- 李华: `七年级1班` / `李华`
- 王明: `七年级1班` / `王明`
- 赵雪: `八年级2班` / `赵雪`

## 功能模块

### 1. 教务处总控台
- 全校教师名单管理
- 新增教师
- 全局数据统计

### 2. 教师端工作台
- **学情监督**：查看学生学习数据，支持时间段筛选
- **学生管理**：批量导入学生名单
- **词表管理**：创建教材/课外词表
- **AI检测发布**：一键生成检测任务
- **Excel导出**：导出学情明细为CSV

### 3. 学生端学习中心
- **个人资产**：金币数量、学习头衔
- **任务中心**：接收老师发布的任务
- **游戏化学习**：3D卡片翻转、连击奖励
- **语境检测**：挖空选择题、即时反馈

## 核心算法

### 间隔重复算法（莱特纳算法简化版）
- 不认识：立即复习
- 模糊：1天后复习
- 秒懂：2天后复习（随熟练度递增）

### 金币奖励机制
- 基础奖励：秒懂 +10 金币
- 连击加成：每连击一次额外 +2 金币
- 检测奖励：答对一题 +20 金币

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 注意事项

1. **数据存储**：所有数据存储在浏览器 localStorage 中，清除浏览器数据会导致数据丢失
2. **多设备同步**：不支持跨设备数据同步
3. **安全性**：前端加密仅为演示，生产环境需配合后端服务

## 前后端关系（Vercel + Neon）

- 前端入口：`index.html + js/**`，统一调用 `js/core/api.js`
- API 基础路径：`/api`
- 部署模式：前端静态资源 + Vercel Serverless Functions（`api/**`）
- 持久化数据库：Neon PostgreSQL（通过 Prisma 访问）
- 鉴权流程：`/api/auth/login` 返回 JWT，前端保存在 `localStorage`，后续请求走 `Authorization: Bearer <token>`

### Prisma 数据模型

- `User`：管理员/教师/学生账号、班级信息、密码状态
- `Vocabulary`：词汇主表（单词、音标、释义、例句、难度、标签）
- `LearningRecord`：学生与单词学习关系（尝试次数、正确率、复习时间）
- `SchoolData`：全校汇总配置/数据（JSON）

### API 路由（已支持 CRUD）

- 认证
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST|PUT /api/auth/change-password`
- 学校数据
  - `GET /api/school/data`
  - `POST /api/school/data`
- 词汇 CRUD
  - `GET /api/vocabulary`
  - `POST /api/vocabulary`
  - `GET /api/vocabulary/:id`
  - `PUT /api/vocabulary/:id`
  - `DELETE /api/vocabulary/:id`

### 环境变量（Vercel 项目中配置）

```bash
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
JWT_SECRET="请替换为高强度随机串"
DEFAULT_ADMIN_PASSWORD="root"
```

### 本地初始化（连接 Neon）

```bash
npm install
npm run prisma:generate
npm run prisma:push
```

### Vercel 部署步骤

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 导入该仓库（你提供的项目：`vocab-system`）
3. 在 Vercel 项目 `Settings -> Environment Variables` 添加上面的 4 个变量
4. Redeploy
5. 首次部署后，执行一次 `prisma db push`（可在本地连同一 Neon 实例执行）

## 开发计划

- [x] 基础架构搭建
- [x] 三级权限系统
- [x] 游戏化学习模块
- [x] 语境检测模块
- [x] 数据导出功能
- [ ] 音频播放功能（单词发音）
- [ ] 学习日历/打卡功能
- [ ] 错题本功能
- [ ] 班级排行榜

## License

MIT License

## 致谢

- Tailwind CSS - 优秀的CSS框架
- FontAwesome - 精美的图标库
