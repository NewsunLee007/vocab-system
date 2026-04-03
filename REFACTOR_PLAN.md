# 登录逻辑重构实施计划

## 目标
- 采用子域名分离方案重构登录逻辑
- 为每个用户角色创建独立的登录和应用界面
- 保持向后兼容性
- 优化代码结构和用户体验

## 子域名规划
- `student.vocab-system.example.com` - 学生端
- `teacher.vocab-system.example.com` - 教师端
- `admin.vocab-system.example.com` - 教务处端
- `www.vocab-system.example.com` 或 `vocab-system.example.com` - 主入口（重定向到相应子域名）

## 实施步骤

### 阶段一：创建共享模块（公共代码）
1. 创建 `shared/` 目录
2. 提取公共 CSS 文件
3. 提取公共 JavaScript 模块
4. 创建共享的 API 封装

### 阶段二：重构学生端
1. 创建 `student/` 目录
2. 创建学生端独立的 index.html
3. 重构学生端 JavaScript 代码
4. 创建学生端专用 CSS

### 阶段三：重构教师端
1. 创建 `teacher/` 目录
2. 创建教师端独立的 index.html
3. 重构教师端 JavaScript 代码
4. 创建教师端专用 CSS

### 阶段四：重构教务处端
1. 创建 `admin/` 目录
2. 创建教务处端独立的 index.html
3. 重构教务处端 JavaScript 代码
4. 创建教务处端专用 CSS

### 阶段五：更新配置和部署
1. 更新 vercel.json 配置
2. 创建子域名路由配置
3. 更新环境变量
4. 测试和部署

## 目录结构

```
vocab-system/
├── shared/                    # 共享模块
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   ├── animations.css
│   │   └── mobile.css
│   └── js/
│       ├── core/
│       │   ├── api.js
│       │   ├── auth.js
│       │   ├── router.js
│       │   └── errorHandler.js
│       └── utils/
│           ├── helpers.js
│           └── speech.js
├── student/                   # 学生端
│   ├── index.html
│   ├── css/
│   │   └── student.css
│   └── js/
│       ├── modules/
│       │   ├── student.js
│       │   ├── learning.js
│       │   ├── testing.js
│       │   ├── flashcardLearning.js
│       │   ├── wordLearning.js
│       │   ├── flexibleLearning.js
│       │   ├── matchingTest.js
│       │   ├── spellingTest.js
│       │   ├── contextTest.js
│       │   ├── zootopiaGame.js
│       │   ├── taskEngine.js
│       │   └── testEngine.js
│       └── app.js
├── teacher/                   # 教师端
│   ├── index.html
│   ├── css/
│   │   └── teacher.css
│   └── js/
│       ├── modules/
│       │   ├── teacher.js
│       │   └── teacherReview.js
│       └── app.js
├── admin/                     # 教务处端
│   ├── index.html
│   ├── css/
│   │   └── admin.css
│   └── js/
│       ├── modules/
│       │   └── admin.js
│       └── app.js
├── api/                       # API 保持不变
│   └── ...
├── prisma/                    # 数据库保持不变
│   └── schema.prisma
├── index.html                 # 主入口（重定向）
└── vercel.json                # 更新配置
```

## 注意事项
1. 保持 API 接口不变，只重构前端
2. 确保向后兼容性
3. 逐步重构，确保每个阶段都能正常工作
4. 充分测试后再部署
