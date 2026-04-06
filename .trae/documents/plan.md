# 实施计划 (Implementation Plan)

## 1. 批量添加学生功能优化
**目标**：修改批量添加学生时的班级提示文字，并强制班级格式为纯数字。
**文件**：
- `app.html`: 修改 `id="new-student-class"` 输入框的 `placeholder` 为 `如：701`，并将上方文字说明改为 `班级`。
- `js/modules/teacher.js`: 在 `saveNewStudents()` 中，增加正则校验 `if (!/^\d+$/.test(className))`，如果不符合纯数字格式则通过 `helpers.showToast` 提示并中止。

## 2. 学生管理版面功能增强
**目标**：为教师端的学生管理页面增加班级筛选、列表/方块视图切换、以及排序功能（按金币等）。
**文件**：
- `app.html`: 
  - 在 `#tab-students` 的头部区域，增加筛选控件组合（班级下拉框、排序下拉框、视图切换按钮）。
  - 增加一个隐藏的列表视图容器 `#teacher-students-list`，用于呈现表格形式的数据，与现有的方块视图容器 `#teacher-students-grid` 并列。
- `js/modules/teacher.js`:
  - 增加 `studentViewMode` 状态（默认为 `grid`）。
  - 增加 `setStudentViewMode(mode)` 方法来切换视图并重新渲染。
  - 修改 `renderStudents()` 方法：
    - 读取班级筛选值和排序选择值。
    - 对 `students` 数组进行 `filter` 和 `sort`（支持默认排序、金币降序、姓名升序）。
    - 动态提取并更新班级下拉框的 `<option>` 列表（基于当前所有学生的班级去重）。
    - 根据 `studentViewMode` 分别渲染出方块（卡片）或列表（横向条目/表格）的 HTML 结构，并控制对应容器的显示/隐藏。

## 3. 修复学生端无法加载最新检测任务的问题
**现状分析**：
教师发布检测任务后，学生端刷新页面依然看不到新任务。深入排查发现有两个关键原因导致了云端同步链路断层：
1. **API 请求被浏览器缓存**：学生端在登录后获取学校数据时，由于 Vercel 的 Serverless API 未显式禁用缓存，导致浏览器可能直接使用了 `GET /api/school/data` 的本地旧缓存，未能拉取到云端的最新数据。
2. **防抖机制导致数据未上云**：教师端创建任务后调用了 `db.save()`，该方法默认使用了 2000ms 的防抖延迟 (`setTimeout`) 来同步数据。如果教师在点击“发布”后立即关闭了页面，内存中的任务将永远不会被同步到云端数据库。

**解决方案**：
- `api/_lib/http.js`: 修改基础响应方法，强制写入 `Cache-Control: no-store, no-cache, must-revalidate` 以及 `Pragma: no-cache` 响应头，彻底禁用浏览器对核心 API 数据的缓存。
- `js/modules/teacher.js`:
  - 在 `confirmCreateTask()` 的末尾，紧跟 `db.addTask(task)` 之后，主动调用 `db.syncToCloud()` 以跳过防抖，强制立即同步数据。
  - 在 `publishAITask()` 的末尾同样主动调用 `db.syncToCloud()`，确保任务安全入库。

## 验证步骤
1. 教师端打开“批量添加学生”，输入非数字班级（如“七年级1班”），验证是否会被正则拦截并提示。
2. 教师端打开“学生管理”，尝试切换不同的班级、按金币数量排序、并切换列表/方块视图，观察界面变化是否准确且平滑。
3. 教师端发布一个新检测任务，然后立即打开并刷新学生端页面，验证新任务是否立刻显示在“检测任务”列表中，且不会再出现数据不同步的情况。