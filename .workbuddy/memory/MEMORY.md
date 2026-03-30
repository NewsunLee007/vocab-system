# MEMORY.md - 项目长期记忆

## 项目基本信息
- **项目名**: vocab-system（新纪元英语词汇系统）
- **仓库**: https://github.com/newsunlee007/vocab-system（SSH: git@github.com:NewsunLee007/vocab-system.git）
- **推送方式**: 用 SSH（HTTPS 443 超时），已 set-url 为 SSH
- **部署**: Vercel（域名 vocab-system.newsunenglish.com）
- **数据库**: Neon PostgreSQL（ap-southeast-1）
- **技术栈**: 纯前端 HTML/CSS/JS + Vercel Serverless Functions（api/）+ Prisma + PostgreSQL

## 数据库配置规范
- Neon + Vercel serverless 必须同时配置 `DATABASE_URL`（连接池）和 `DIRECT_URL`（直连）
- Prisma schema 需要 `directUrl = env("DIRECT_URL")`
- URL 中**不能**带 `channel_binding=require` 参数，Prisma 不支持

## Vercel 环境变量（必须在 Vercel 控制台手动配置）
- DATABASE_URL: 连接池地址（pooler），去掉 channel_binding
- DIRECT_URL: 直连地址，去掉 channel_binding
- JWT_SECRET: 见 .env 文件
- DEFAULT_ADMIN_PASSWORD: root

## 账户管理架构（重要）
- **User 表（PostgreSQL）**：唯一的真实账户存储，所有登录都查这里
  - 教务处（ADMIN）：username='admin'，由 `api/auth/login.js` 自动创建
  - 教师（TEACHER）：由 `api/admin/teachers.js` POST 创建，以工号为 username，className=null
  - 学生（STUDENT）：由 `api/auth/register.js` 创建，有 className 字段
- **SchoolData 表**：存储学校业务数据（词表、任务、学生进度），不存账户
- **教师账户 API**：`api/admin/teachers.js`（GET/POST/DELETE），需 ADMIN 角色

## vercel.json 路由规范
- **不要**添加 `/api/(.*)` → `/api/$1` 的 rewrite，会干扰原生 API 路由导致 404
- 只对非 API 路由重写到 index.html：`/((?!api/).*)`

## 智能随机分布算法（aiSentenceService.js）
- smartShuffle(): 智能位置平衡洗牌，70%概率加权随机选择正确答案位置
- 追踪 context 和 matching 的 ABCD 位置分布
- resetPositionTracker(): 重置追踪器
- getPositionStats(): 获取位置分布统计

## 基础题库机制（db.js）
- testQuestionBank: 存储 AI 生成的题目，按 teacherId/wordlistId/word 组织
- studentTestHistory: 记录每个学生已做过的题目ID
- saveQuestionToBank(): 保存题目到题库
- getUnusedQuestions(): 获取学生未做过的题目
- recordStudentTestHistory(): 记录测试历史
- _incrementQuestionUsage(): 更新题目使用次数（优先抽取使用少的）

