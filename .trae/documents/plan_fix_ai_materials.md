# 修复 AI 素材审核状态与学生端引用问题计划

## 1. 问题分析与当前状态

根据对代码的检索与分析，导致您遇到的三个问题的根本原因如下：

### 问题一：AI生成的素材审核通过后，再次进入修改页面仍显示“待审核”
- **原因**：在 `teacherReview.js` 的 `initReviewSessionWithMaterials` 方法中，每次打开审核界面时，系统都会直接覆盖 `this.state.reviewedSentences` 并将所有状态重置为 `PENDING`，而没有先去加载数据库中已保存的审核记录。此外，`loadReviewedSentences` 方法在查询数据库时，错误地使用了当前教师的 `user.id` 作为查询键，而实际上系统（针对教材词表）是将审核记录保存在了 `system` 这个统一的 ID 下。

### 问题二：七上词表生成素材后有控件，而七下没有
- **原因**：在 `teacher.js` 的 `createTextbookWordlistItem` 和 `createWordlistItem` 渲染方法中，系统通过 `db.getTeacherReviewedSentences(wl.teacherId, wl.id)` 来判断是否已有生成的素材。对于“七下”等教材预置词表，`wl.teacherId` 可能是未定义的，导致查询参数变成了 `undefined` 而非预期的 `'system'`，从而判断失败，不显示相关控件。

### 问题三：学生端收到了检测任务，但没有引用AI生成的具体例句和练习
- **原因**：在学生端的测试引擎模块中（如 `contextTest.js`, `spellingTest.js`, `matchingTest.js`, `student.js`, `flashcardLearning.js`），在拉取词汇和例句数据时，都使用了 `db.getTeacherReviewedSentences(wl.teacherId, wl.id)` 进行校验。如果这是教材预置词表，`wl.teacherId` 为空，系统就不会去加载保存在 `'system'` 下的 AI 生成素材，从而退回使用默认的旧数据。

## 2. 修复方案 (Proposed Changes)

为了彻底解决以上问题，我们需要对以下几个文件进行修改：

1. **`js/modules/teacherReview.js`**
   - 修改 `initReviewSessionWithMaterials`：在初始化前，先调用 `loadReviewedSentences` 加载已有的审核状态，只有对于真正的新单词才初始化为 `PENDING`，并保留已有单词的 `APPROVED` 或 `MODIFIED` 状态。
   - 修改 `loadReviewedSentences`：忽略传入的 `teacherId`，始终根据 `wordlist.teacherId || 'system'` 作为键去数据库中读取数据，确保能够准确加载。

2. **`js/modules/teacher.js`**
   - 修复渲染逻辑，将 `db.getTeacherReviewedSentences(wl.teacherId, wl.id)` 替换为 `db.getTeacherReviewedSentences(wl.teacherId || 'system', wl.id)`。

3. **`js/modules/admin.js`**
   - 同样修复 `admin.js` 中列表渲染和素材导出时对 `teacherId` 处理的遗漏，确保教务处也能正确识别并管理归属于 `system` 的教材词表 AI 素材。

4. **学生端测试引擎 (`student.js`, `spellingTest.js`, `matchingTest.js`, `contextTest.js`, `flashcardLearning.js`)**
   - 将所有调用 `db.getTeacherReviewedSentences` 的地方，将 `wl.teacherId` 修改为 `wl.teacherId || 'system'`。这样学生端就能正确拉取并显示教师审核通过的 AI 生成例句和选项了。

## 3. 验证步骤 (Verification Steps)

1. 进入教师端，对“七下”某个单元生成 AI 素材，查看是否出现了“体验”、“修改”、“删除”等控件。
2. 进入“修改”界面，将几个单词标记为“审核通过”，关闭窗口后再次进入，检查状态是否保持为“已通过”。
3. 在教务处或教师端发布这个词表的学习/检测任务，然后登录学生端。
4. 学生端进入该任务，查看填空、拼写或选择题，确认显示的例句是否为您刚刚生成的 AI 专属例句。

*(注：系统底层文件已经更新，一旦您批准此计划，我将立即进行代码提交以应用这些修复。)*