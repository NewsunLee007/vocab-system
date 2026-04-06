# Plan: Fix Infinite Loop in Admin Login and App Initialization

## Summary
The system enters an infinite loop of loading cloud data and redirecting when an admin logs in. This is caused by a race condition where `app.init()` is called twice on the same page load, leading to a URL mismatch and subsequent page reload.

## Current State Analysis
1. `app.html` contains an inline `<script>` at the bottom that calls `app.init()`.
2. `app.js` contains a `DOMContentLoaded` event listener that also calls `app.init()`.
3. When `app.html` loads, the inline script executes first. `app.init()` completes, and via `router.redirectByRole()`, the URL is changed from `/app.html` to `/admin` using `history.replaceState`.
4. Immediately after, the `DOMContentLoaded` event fires, calling `app.init()` a second time.
5. The second execution of `app.init()` calls `router.redirectByRole()`.
6. Inside `router.redirectByRole()`, there is a check: `if (!window.location.pathname.endsWith('app.html')) { window.location.href = 'app.html'; return; }`.
7. Because the first execution already changed the URL to `/admin`, this check fails, and the browser is forced to reload `app.html`.
8. This cycle repeats endlessly, causing the "正在加载云端数据..." (Loading cloud data) modal to flash and the system to loop repeatedly.

## Proposed Changes
1. **Prevent multiple executions of `app.init()`**:
   - Add an `_initialized` flag to the `app` object in `js/core/app.js`.
   - At the very beginning of `app.init()`, check `if (this._initialized) return;` and immediately set `this._initialized = true;`.
   - This ensures that even if `app.init()` is triggered by both the inline script and the `DOMContentLoaded` event, it will only execute once per page load.

2. **Prevent multiple executions of `db.init()`** (Optional but recommended for safety):
   - Add a similar `_initialized` flag to `db.init()` in `js/core/db.js` to ensure that cloud data is not fetched redundantly if `db.init()` is accidentally called concurrently from different parts of the code. However, since `db.init()` might be intentionally called again to refresh data (e.g., after role change), we will use an `_initializing` promise or flag to prevent *concurrent* executions rather than permanently blocking it. 
   - Actually, since `app.init()` protection is sufficient to break the infinite reload loop, we will focus on `app.js`.

### Specific Files to Modify:
- **`js/core/app.js`**:
  - Add `_initialized: false` property to the `app` object.
  - Modify `async init()` to return early if `_initialized` is true.

- **`app.html`** & **`js/core/app.js`**:
  - Remove the redundant `document.addEventListener('DOMContentLoaded', ...)` in `app.js` to clean up the code, since the inline script in `app.html` is the primary and intended entry point.

## Assumptions & Decisions
- The intended entry point for initialization is the inline script in `app.html`, which checks if `app` is defined and then calls `app.init()`.
- The `DOMContentLoaded` listener in `app.js` is redundant and causing the double-execution.
- The `router.redirectByRole()` behavior is correct in enforcing `app.html` as the base URL, but it was being tripped by the URL mutation from the first `app.init()` execution.

## Verification Steps
1. Log into the system using the admin credentials.
2. Observe the network requests and console logs.
3. Verify that the system successfully enters the main UI (admin dashboard) and stays there without reloading the page or looping.
4. Verify that `app.init()` is only called once per page load.