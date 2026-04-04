# 修复学生删除失效及清理旧版登录界面计划

## 1. 当前状态分析 (Current State Analysis)

用户反馈了两个问题：
1. **删除学生清单失败**：在教务处删除学生后，重新登录发现学生依然存在。
   - **原因**：前端的 `db.deleteStudent(studentId)` 仅仅从本地内存的 `_data.students` 数组中移除了学生，并调用了 `db.save()` 更新了后端的 `SchoolData.payload` JSON 字段。但是，系统现在的架构是“学生数据以 PostgreSQL 的 `User` 表为基准”。`GET /api/school/data.js` 会直接执行 `prisma.user.findMany({ where: { role: 'STUDENT' } })` 拉取全量学生名单。因为旧的删除逻辑没有调用 API 去删除 `User` 数据库表中的真实记录，所以学生在刷新页面后又会重新加载出来。
2. **旧的登录界面未清除**：第四张截图中显示了一个废弃的“学生登录”主界面。
   - **原因**：随着系统演进，现在已经有了专门的 `index.html` 以及 `student-login.html` 等独立登录页面。但在核心的主程序入口文件 `app.html` 中，仍然保留着 `#view-login`（学生旧版登录）、`#modal-teacher-login` 和 `#modal-admin-login` 这些旧的 DOM 结构。当用户未登录或注销时，前端路由 `router.js` 会默认将其导航至 `login` 视图，从而展现出这个旧版页面。

## 2. 提议的更改 (Proposed Changes)

为了解决以上两个问题，建议进行以下修改：

### 2.1 后端 API 支持真实删除
- **文件**: `api/students/[id].js`
- **操作**: 新增对 `DELETE` 请求方法的支持。
- **逻辑**: 如果请求者是 `ADMIN` 或 `TEACHER`，则调用 `prisma.user.delete({ where: { id } })` 彻底从数据库中删除该学生账号及其级联数据（如学习记录）。

### 2.2 前端 API 调用适配
- **文件**: `js/core/api.js`
- **操作**: 增加 `deleteStudent(studentId)` 异步方法，使用 `fetch` 发送 `DELETE` 请求到 `/api/students/${studentId}`。

### 2.3 前端 DB 逻辑补充同步删除
- **文件**: `js/core/db.js`
- **操作**: 在 `deleteStudent(studentId)` 方法中，除了保留原有的本地状态清理和 `this.save()` 外，加入对 `api.deleteStudent(studentId)` 的调用。这样当教师或管理员在界面点击删除时，不仅界面立刻响应，云端数据库里的真实账号也会被彻底销毁。

### 2.4 清理旧版登录页面 DOM
- **文件**: `app.html`
- **操作**: 彻底删除 `id="view-login"` 的区块，以及 `id="modal-teacher-login"` 和 `id="modal-admin-login"` 的模态框区块，精简 DOM 结构。

### 2.5 路由拦截重定向
- **文件**: `js/core/router.js`
- **操作**: 修改 `navigate` 方法。当传入的 `viewName` 为 `'login'`，或者权限检查 `checkPermission(viewName)` 失败时，直接使用 `window.location.href = 'index.html'` 重定向到统一的门户首页，而不是展示已删除的内部登录视图。同时移除 `views` 和 `pathMap` 中对 `login` 的配置。

## 3. 假设与决策 (Assumptions & Decisions)
- **假设**：`Prisma` 中 `User` 表已经配置了正确的级联删除（在前面的分析中已确认 `WordList` 和 `LearningRecord` 等都是 `onDelete: Cascade`），所以安全且干净。
- **决策**：把 `DELETE` 请求绑定在现有的 `db.deleteStudent` 里，这样就不用去修改 `admin.js` 和 `teacher.js` 里复杂的批量删除和单个删除的业务逻辑了，可以做到平滑升级。

## 4. 验证步骤 (Verification Steps)
1. 实施代码修改后，推送到 GitHub 触发 Vercel 部署。
2. 以教务处（admin）或教师账号登录进入工作台。
3. 勾选任意一名学生，点击“批量删除”或单个“删除”。
4. 页面提示成功后，手动刷新浏览器或重新登录。
5. 验证该学生不再出现在列表中。
6. 点击右上角“退出登录”，验证页面直接跳转到 `index.html` 门户页，且无法再看到旧版的在 `app.html` 里的“输入班级和姓名开始学习”登录框。