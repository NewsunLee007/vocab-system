# 修复 `admin.js` 中的 SyntaxError 和 `async/await` 使用问题计划

## 1. 当前状态分析 (Current State Analysis)

**问题描述：**
用户在教务处总控台界面遇到一个致命的 JavaScript 语法错误，导致整个管理员界面的数据渲染失败，数据显示为0。错误信息如下：
`SyntaxError: await is only valid in async functions and the top level bodies of modules (at admin.js:2085:30)`

**根本原因：**
在之前为了实现“教材词表与云端数据库打通”的功能，我们将同步的 `db.addWordList()` 调用替换为了异步的 `await db.addWordListAsync()`。然而，在 `js/modules/admin.js` 中，包含这些 `await` 调用的外层函数并没有被声明为 `async` 函数。
在 JavaScript 中，`await` 关键字只能在 `async` 函数内部使用。这种语法错误会导致整个 `admin.js` 文件解析失败，进而导致页面上依赖该文件的所有组件和数据加载逻辑崩溃，因此教务处的数据都显示为0。

**影响范围：**
- `js/modules/admin.js` 文件中包含 `await db.addWordListAsync(...)` 的两个方法：
  1. `confirmImportWordlist()`
  2. `saveAdminWordlist()`

## 2. 提议的更改 (Proposed Changes)

### 2.1 修复 `confirmImportWordlist` 函数
- **修改文件**: `js/modules/admin.js`
- **操作**: 将 `confirmImportWordlist()` 方法的声明修改为 `async confirmImportWordlist()`。
- **原因**: 该方法内部使用了 `await db.addWordListAsync()` 来处理 Excel 导入的词表分组数据保存，必须使用 `async` 声明。

### 2.2 修复 `saveAdminWordlist` 函数
- **修改文件**: `js/modules/admin.js`
- **操作**: 将 `saveAdminWordlist()` 方法的声明修改为 `async saveAdminWordlist()`。
- **原因**: 该方法内部使用了 `await db.addWordListAsync()` 来处理手动添加教材词表的保存逻辑，必须使用 `async` 声明。

## 3. 假设与决策 (Assumptions & Decisions)
- **假设**：`admin.js` 中其余代码逻辑是正确的，只是由于这个 SyntaxError 导致整个模块未能正确执行。修复这个语法错误后，页面应该能恢复正常的数据加载和渲染。
- **决策**：只针对报告的导致崩溃的 `SyntaxError` 进行精准修复，不引入其他不相关的大规模重构，以最快速度恢复系统的可用性。

## 4. 验证步骤 (Verification Steps)
1. 部署代码后，刷新教务处总控台页面。
2. 验证控制台是否不再出现 `SyntaxError: await is only valid in async functions` 错误。
3. 验证管理员界面的各项数据（如在职教师、注册学生、词表数量等）是否能够正常加载并显示真实数据，不再全部显示为0。
4. 验证教务处的“批量导入词表”和“手动添加词表”功能是否能够正常工作并保存到数据库。