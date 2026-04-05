# 修复与功能完善计划

## 1. 词义匹配界面消失的修复 (Matching Test UI Fix)
- **原因分析**：之前在修改 `matchingTest.js` 的 UI 响应式布局时，错误地在根容器上保留了 `opacity-0` 和 `transition-opacity`，但却没有编写在挂载后移除这些类名的逻辑，导致界面变为完全透明（隐藏）。
- **修改方案**：打开 `js/modules/matchingTest.js`，将 `id="matching-test-view"` 的容器上的 `transition-opacity duration-300 opacity-0` 类名全部移除，恢复正常渲染。

## 2. ZPD Cadet Training 积分系统上线 (ZPD Points Sync)
- **原因分析**：ZPD 游戏是作为一个新标签页（`_blank`）打开的，在某些浏览器安全策略下（如隐式 `noopener`），游戏端获取不到 `window.opener`，导致金币奖励无法同步回主系统。
- **修改方案**：
  1. 在 `zootopia.html` 的结算逻辑中加入**离线同步机制（Local Storage 缓存）**：如果检测不到 `window.opener`，则将本局奖励累加存入 `localStorage` 的 `zootopia_pending_coins` 字段。
  2. 在主系统的核心入口（如 `js/modules/student.js` 或 `app.html` 的初始化逻辑）中，添加监听和自动读取机制：当学生回到主系统时，自动读取并消费 `zootopia_pending_coins`，调用 `db.addCoins` 并弹出“离线奖励已同步”的绿色提示，确保一分钱都不会漏发。

## 3. 学生首次登录强制修改密码，且教师/教务处可查看明文密码
- **原因分析**：目前系统虽然在首次登录（`passwordChanged === false`）时强制学生修改密码，但后端采用不可逆的 Bcrypt 加密存储密码（`password_hash`），因此教职工无法“查看”到学生设置的具体明文密码。
- **修改方案**：
  1. **数据库层**：在后端 `schema.sql` 中的 `students` 表新增 `plain_password VARCHAR(255) NULL DEFAULT '123456'` 字段。为了兼顾已运行的系统，在后端服务启动脚本（`server.js` 或类似地方）中自动执行 `ALTER TABLE students ADD COLUMN plain_password ...` 的迁移语句。
  2. **API层同步**：修改后端的 `/students` (新增)、`/auth/change-password`、`/auth/reset-password` 接口，在更新加密哈希的同时，一并更新 `plain_password`。
  3. **数据读取层**：修改 `/school/data` 同步接口的 SELECT 语句，将 `plain_password` 暴露给前端的 `db.js`。
  4. **教师/教务处 UI**：修改 `teacher.js` 的 `viewStudentDetail` 渲染逻辑，在学生的详情面板基本信息中增加一行：“当前密码：[密码明文]”，让老师能一目了然地看到并提供帮助。

## 验证步骤
1. 运行系统，点击体验或以学生身份进行“词义匹配”练习，确认界面不再透明，能正常点击选项。
2. 进入 ZPD 游戏打过一关获得金币，即使单独在新标签页刷新游玩，回到主系统刷新后，也能弹出奖励同步的提示并增加金币。
3. 作为初次登录的学生登录，强制修改密码（如改为 `student123`），然后退出登录，用教师账号进入教务处，查看该学生的详情卡片，验证是否能直接看到 `student123`。