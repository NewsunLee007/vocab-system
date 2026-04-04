# 修复登录后闪退重定向回首页问题的计划

## 1. 当前状态分析 (Current State Analysis)

用户反馈：在独立的登录页面（如 `admin-login.html`）登录成功后，页面闪烁了一下又回到了初始的登录界面。

**原因排查**：
1. 在之前我们修复“旧版登录界面残留”时，修改了 `js/core/router.js` 的 `navigate` 方法，加入了拦截：`if (viewName === 'login') window.location.href = 'index.html';`，并在权限检查失败时也跳转回 `index.html`。
2. 然而，在 `admin-login.html` 中，当 `api.login` 成功后，系统执行了 `window.location.href = 'app.html';` 跳转。
3. 跳转到 `app.html` 后，浏览器会加载 `js/core/app.js` 并执行 `app.init()`。
4. 在 `app.init()` 中，执行 `await auth.init()` 去检查登录状态（通过调用 `api.me()`）。
5. 关键问题在于 `auth.init()` 的执行时机和返回值：
   - `auth.init()` 如果成功获取到 `session.user`，它内部会执行 `router.redirectByRole()`，触发一次路由跳转（比如 `navigate('admin')`）。
   - 但是，紧接着在 `app.init()` 中，它又自己判断了一次 `const hasSession = auth.isLoggedIn();`。
   - **核心漏洞**：如果此时 `auth.isLoggedIn()` 判断有误，或者 `app.js` 中的重定向逻辑执行得比 `auth.init()` 慢，就会触发 `router.navigate('login')`。
   - 触发 `router.navigate('login')` 后，命中我们刚加的拦截规则，页面被强制刷新跳回 `index.html`。
6. 另外，`router.js` 中 `handleInitialPath()` 的初始路径处理与 `app.js` 的路由分发存在重叠和竞争。

## 2. 提议的更改 (Proposed Changes)

为了彻底解决这个路由竞态条件和闪退问题，我们需要：

### 2.1 移除重复的重定向逻辑
- **文件**: `js/core/app.js`
- **操作**: 在 `app.init()` 中，移除下面这段手动检查 `hasSession` 并跳转的代码，因为 `auth.init()` 内部已经包含了重定向逻辑。如果在 `auth.init()` 后依然强行调用 `router.navigate`，极易导致状态冲突。
  ```javascript
  // 移除以下代码
  if (hasSession && auth.currentUser) { ... } else { router.navigate('login'); }
  ```

### 2.2 修复 `auth.init()` 中的重定向
- **文件**: `js/core/auth.js`
- **操作**: 确保 `auth.init()` 只负责拉取状态，**不要**在里面直接调用 `router.redirectByRole()`。认证模块只负责认证，不应该去干涉路由导航，否则会和主程序的流程打架。

### 2.3 规范化统一的入口路由分发
- **文件**: `js/core/app.js`
- **操作**: 重构 `app.init()`，让其职责清晰：
  1. 等待 `auth.init()` 加载完用户信息。
  2. 如果未登录，执行 `router.navigate('login')`（这会跳回 index.html）。
  3. 如果已登录，且当前路径没有指定具体的视图（即在根路径或 app.html），则通过 `router.redirectByRole()` 跳转到对应的角色控制台。

### 2.4 清理 `router.js` 的自动跳转
- **文件**: `js/core/router.js`
- **操作**: 在 `handleInitialPath` 方法中，移除 `this.navigate('login', false)`。既然找不到路由或者没有权限都会在 `navigate` 中被拦截回 `index.html`，就不需要在这个生命周期阶段多做一次尝试。

## 3. 假设与决策 (Assumptions & Decisions)
- **假设**：所有独立的登录页 (`admin-login.html`, `teacher-login.html`, `student-login.html`) 在登录成功后，依然统一跳转到 `app.html`。
- **决策**：将路由分发的唯一控制权收归到 `app.html` 的 `app.init()` 方法中。避免 `auth.js`、`router.js` 和 `app.js` 三个地方各自为战，从而解决竞态闪退问题。

## 4. 验证步骤 (Verification Steps)
1. 实施代码修改并推送到 GitHub，等待 Vercel 部署。
2. 访问 `index.html`，点击“教务处”。
3. 在 `admin-login.html` 输入密码登录。
4. 验证页面跳转到 `app.html` 后，能否稳定停留在“教务处总控台”视图，而不会再闪退回 `index.html`。
5. 测试教师端和学生端的登录，确保同样能够稳定进入工作台。