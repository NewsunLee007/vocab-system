# 修复AI配置无法保存以及教材词表未与数据库打通问题的计划

## 1. 当前状态分析 (Current State Analysis)

**问题 1：教务处设置没有后端保存 AI 配置，导致 AI 无法介入生成例句**
- **根源**：在 `api/school/data.js` 的 `GET` 请求中，后端重新构建返回给前端的 `payload` 对象时，**遗漏**了 `aiConfig`、`dict` 等关键字段。这导致管理员或教师刷新页面后，前端拿不到已保存的 AI 配置（配置变为 `null`）。随后前端发生的任何一次数据同步（`POST` 请求），都会用这个 `null` 覆盖掉数据库里原本正常的 `SchoolData.payload.aiConfig`。
- **后果**：由于前端 `db.getAIConfig()` 取不到有效的 API Key，导致 `js/modules/aiSentenceService.js` 在生成例句时只能降级使用内置的简单模板引擎（`builtin`），外部大模型无法介入。

**问题 2：教材词表、关联词表没有和数据库打通**
- **根源**：系统当前的 Prisma schema 中存在专门的 `WordList` 数据表，且后端 `api/word-lists/index.js` 也提供了完整的 CRUD 接口。但是！前端在“新建教材词表”或“关联教材词表”时，仅仅调用了本地的 `db.addWordList()`，将其打包塞进了 `SchoolData.payload.wordlists` 这个庞大的 JSON 字段中，**完全没有调用 `/api/word-lists` 接口**写入真正的关系型数据库表中。
- **后果**：用户在数据库里查看 `WordList` 表时发现是空的，认为数据没有真正“打通”。

## 2. 提议的更改 (Proposed Changes)

### 2.1 修复数据同步接口的数据丢失问题
- **修改文件**: `api/school/data.js`
- **操作**: 
  1. 在 `GET` 响应中，确保将 `oldPayload` 中的所有系统级字段（如 `aiConfig`, `dict`, `aiDrafts`, `testQuestionBank` 等）完整合并到返回的 `payload` 中。
  2. 在 `POST` 响应中，增强数据合并的安全逻辑。不同角色（如 `TEACHER`, `STUDENT`）在提交数据时，必须基于云端的 `oldPayload` 进行深度合并，绝对不能直接覆盖顶层字段，防止教师 A 覆盖教师 B 的数据，或学生意外清空 AI 配置。

### 2.2 打通教材词表与 WordList 数据库表
- **修改文件**: `js/core/api.js`, `js/core/db.js`, `api/school/data.js`
- **操作**:
  1. 修正 `api.js` 和 `teacher.js` 中的 API 拼写错误（将 `createWordlist` 统一修正为 `createWordList`）。
  2. 在 `db.js` 中新增一个异步方法 `addWordListAsync(wordlistData)`，该方法会调用 `api.createWordList()` 将词表存入后端的 `WordList` 表。
  3. 为了在不修改数据库 Schema 的前提下保存教材特有属性（`type`, `textbook`, `grade`, `volume`, `unit`），我们将这些属性序列化为 JSON，并存入 `WordList` 表的 `description` 字段。
  4. 修改 `api/school/data.js` 的 `GET` 逻辑，在拉取 `dbWordLists` 时，自动解析 `description` 字段中的 JSON 属性，还原为前端所需的 `textbook`, `grade` 等字段结构。

### 2.3 前端业务逻辑适配异步词表创建
- **修改文件**: `js/modules/admin.js`, `js/modules/teacher.js`
- **操作**:
  1. 在教务处端导入 Excel 教材词表时，将原本同步的 `db.addWordList` 替换为 `await db.addWordListAsync`。
  2. 在教师端点击“关联教材词表”时，同样使用 `await db.addWordListAsync`，确保复制出的新词表也拥有独立的数据库记录。

## 3. 假设与决策 (Assumptions & Decisions)
- **决策**：我们不修改 `prisma/schema.prisma`，而是巧妙利用 `WordList` 的 `description` 字段存储教材的元数据 JSON，这样可以避免繁琐的数据库迁移，立即实现功能打通。
- **决策**：保留 `SchoolData.payload` 作为缓存和旧数据兼容层，但在新建词表时，一律优先写入独立的 `WordList` 表。

## 4. 验证步骤 (Verification Steps)
1. 部署代码后，在教务处配置 OpenAI/Qwen 的 API Key，刷新页面，确认配置不丢失。
2. 进入教师工作台，给学生分配一个背单词任务，验证 AI 能够成功介入并生成带有语境的例句和干扰项。
3. 在教务处导入一份 Excel 教材词表，并在数据库（如 Supabase/Vercel 数据面板）中验证 `WordList` 表里成功新增了数据行。