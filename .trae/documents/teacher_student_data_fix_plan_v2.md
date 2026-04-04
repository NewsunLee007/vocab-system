# 教师与学生数据关联及同步修复计划

## 1. 当前状态分析 (Current State Analysis)

根据系统目前的运行情况，发现了以下几个导致数据异常的核心问题：

1. **`teacherId` 未在数据库持久化**：
   - 之前在 `prisma/schema.prisma` 的 `User` 模型中没有定义 `teacherId` 字段。
   - 当教师 (`t008`) 导入 49 个学生时，系统虽然调用了 `api.register` 注册学生，并将 `teacherId` 保存在本地内存的 JSON 对象中，但**并没有写入到后端的 User 数据表里**。
   - 导致下次加载时，`GET /api/school/data.js` 从数据库读取学生列表，并将 `teacherId` 强制赋值为了 `null`。
   - 因此，教师的“我的学生”列表为空，教务处的“所有学生”列表中的老师栏显示为 `-`。

2. **积分和学习记录丢失 (Data Overwrite Issue)**：
   - 系统的同步逻辑存在一个**致命的并发覆写漏洞**：在 `POST /api/school/data.js` 中，任何角色的 `syncPush` 都会直接覆盖整个 `SchoolData.payload`。
   - 当一个**学生**登录时，TA的本地内存中只包含**自己**这一个学生的数据，且 `teachers` 数组为空。
   - 当该学生完成学习并触发 `db.save()` 时，TA 会将这个“只有自己”的残缺数据整体推送到云端，**导致教务处和其他教师的数据（包括学习记录、词表、学生列表等）瞬间被清空或覆盖**。
   - 此外，之前 `vercel.json` 路由配置的问题导致了 PUT 请求（更新积分）失败，虽然该路由问题已修复，但由于学生触发的残缺 JSON 覆写，积分在教务处端依然无法正常加载。

## 2. 提议的更改 (Proposed Changes)

为了彻底修复这些问题，需要执行以下操作：

### 2.1 数据库结构升级 (Prisma Schema)
- **文件**: `prisma/schema.prisma`
- **操作**: 为 `User` 模型显式添加 `teacherId String?` 字段。
- **目的**: 让学生的关联教师信息可以像 `coins` 一样直接持久化到关系型数据库中，而不再依赖脆弱的 JSON Blob。

### 2.2 注册接口适配 (Auth API)
- **文件**: `api/auth/index.js`
- **操作**: 在 `handleRegister` 方法中，如果操作者是 `TEACHER` 且创建的是 `STUDENT`，则将创建的 `User` 记录的 `teacherId` 设置为该教师的 `id`。

### 2.3 学校数据接口保护 (Data API)
- **文件**: `api/school/data.js`
- **操作**: 
  - 在 `GET` 方法中：优先从 `User` 数据库读取 `teacherId`。如果 `User` 表中没有，尝试从旧的 JSON `payload.students` 中恢复。
  - 在 `POST` 方法中：增加严格的**角色保护机制**。如果当前请求者是 `STUDENT`，则在保存时强制保留原数据库中已有的 `teachers`、`wordlists` 和其他所有学生的数据，只允许更新他们自己的 `learningLogs` 或 `studentStates`。绝对禁止学生覆盖整个学校的数据。

### 2.4 数据修复脚本 (Data Migration Endpoint)
- **文件**: `api/admin/fix-teacher.js` (新增) & `vercel.json`
- **操作**: 创建一个临时 API 端点。当访问此端点时，它会自动扫描数据库中 `role` 为 `STUDENT` 且 `teacherId` 为 `null` 的 49 名学生，并强制将他们的 `teacherId` 更新为教师 `t008` 在数据库中的真实 ID。
- **目的**: 修复已经导入但丢失了关联信息的存量学生数据，让老师能立刻在界面上看到他们。

## 3. 假设与决策 (Assumptions & Decisions)

- **假设**: 丢失 `teacherId` 的 49 个学生目前在数据库中都是 `teacherId: null`。由于系统目前主要由 `t008` 在测试导入，所以批量将这些无主的学生分配给 `t008` 是安全且符合业务意图的。
- **决策**: 采用增量合并策略保护 `SchoolData.payload`，防止学生端的残缺数据在 `POST` 时毁灭全局数据，这是解决“记录不同步且丢失”的根本途径。

## 4. 验证步骤 (Verification Steps)

1. 完成代码修改后，提交并推送到 GitHub，等待 Vercel 自动部署（并执行 `prisma db push`）。
2. 在浏览器中手动访问 `https://[your-vercel-domain]/api/admin/fix-teacher` 触发历史数据修复脚本，确认返回成功更新的条数（应为 49）。
3. 登录教师账号 `t008`，检查“我的学生”列表，确认 49 名学生已恢复显示。
4. 登录教务处账号 `admin`，查看“所有学生”列表，确认“老师”一栏正确显示了 `t008`（或该教师的姓名）。
5. 登录其中一个学生账号，模拟增加积分或产生学习记录。随后登录教务处/教师端，确认积分能正常呈现，且其他学生的数据没有因此被清空。