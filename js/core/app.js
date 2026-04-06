/**
 * 新纪元英语词汇系统 - 应用主入口
 */

const app = {
    _initialized: false,
    
    /**
     * 初始化应用
     */
    async init() {
        if (this._initialized) return;
        this._initialized = true;
        
        await auth.init();
        await db.init();
        auth.refreshCurrentUserProfile();
        dataSync.init();
        
        // 更新导航栏
        this.updateNav();
        
        // 统一路由分发控制权
        if (auth.isLoggedIn()) {
            const user = auth.getCurrentUser();
            
            // 如果用户密码未修改，我们只弹出模态框，不进行任何角色重定向，以防止组件渲染和无限刷新
            if (user && user.passwordChanged === false) {
                console.log('App init: user password not changed, blocking redirection.');
                if (window.history.replaceState) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('action', 'force_change_password');
                    window.history.replaceState({path: url.toString()}, '', url.toString());
                }
                setTimeout(() => {
                    auth.showForceChangePasswordModal();
                }, 300);
            } else {
                // 如果用户已经登录且密码已修改，根据角色将他分配到对应的工作台
                router.redirectByRole();
                
                // 如果 URL 参数包含 force_change_password，则显示修改密码弹窗
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('action') === 'force_change_password') {
                    setTimeout(() => {
                        auth.showForceChangePasswordModal();
                    }, 300);
                }
                
                // 移除：后台自动全量同步词库到服务器（会导致严重的性能问题和网络拥堵，词汇记录会在学习时按需同步）
                // setTimeout(() => {
                //     dataSync.syncWordlistsToServer().catch(err => {
                //         console.warn('Initial sync failed:', err);
                //     });
                // }, 2000);
            }
        } else {
            // 如果未登录，且当前是在 app.html 内，才重定向回首页
            if (window.location.pathname.endsWith('app.html')) {
                window.location.href = 'index.html';
            }
        }
        
        console.log('新纪元英语词汇系统已初始化');
    },

    /**
     * 更新导航栏显示
     */
    updateNav() {
        const mainNav = document.getElementById('main-nav');
        const navUserInfo = document.getElementById('nav-user-info');
        const navLoginLinks = document.getElementById('nav-login-links');
        const currentUserDisplay = document.getElementById('current-user-display');
        const studentAssets = document.getElementById('student-assets');
        
        if (!auth.isLoggedIn()) {
            navUserInfo.classList.add('hidden');
            if (navLoginLinks) navLoginLinks.classList.remove('hidden');
            // 未登录：恢复透明背景
            if (mainNav) {
                mainNav.className = 'fixed top-0 left-0 right-0 bg-white/10 backdrop-blur-xl border-b border-white/20 py-3 px-6 flex justify-between items-center z-50';
            }
            return;
        }
        
        // 已登录：隐藏登录按钮组，显示用户信息
        if (navLoginLinks) navLoginLinks.classList.add('hidden');
        navUserInfo.classList.remove('hidden');
        studentAssets.classList.add('hidden');
        
        const user = auth.getCurrentUser();
        
        switch (user.role) {
            case 'admin':
                currentUserDisplay.innerHTML = '<i class="fa-solid fa-building-columns mr-2"></i>教务处总控';
                // 管理员：半透明深灰
                if (mainNav) {
                    mainNav.className = 'fixed top-0 left-0 right-0 bg-slate-900/70 backdrop-blur-xl border-b border-white/10 py-3 px-6 flex justify-between items-center z-50';
                }
                break;
            case 'teacher':
                currentUserDisplay.innerHTML = `<i class="fa-solid fa-chalkboard-user mr-2"></i>${user.name}`;
                // 教师：半透明深蓝
                if (mainNav) {
                    mainNav.className = 'fixed top-0 left-0 right-0 bg-indigo-900/70 backdrop-blur-xl border-b border-white/10 py-3 px-6 flex justify-between items-center z-50';
                }
                break;
            case 'student':
                currentUserDisplay.innerText = `${user.class} ${user.name}`;
                studentAssets.classList.remove('hidden');
                this.updateStudentNav(user);
                // 学生：半透明翡翠绿
                if (mainNav) {
                    mainNav.className = 'fixed top-0 left-0 right-0 bg-emerald-900/70 backdrop-blur-xl border-b border-white/10 py-3 px-6 flex justify-between items-center z-50';
                }
                break;
        }
    },

    /**
     * 更新学生导航栏信息
     */
    updateStudentNav(student) {
        const navCoins = document.getElementById('nav-coins');
        const navTitle = document.getElementById('nav-title');
        const coins = Number(student?.coins || 0);
        
        navCoins.innerText = coins;
        navTitle.innerText = helpers.getTitle(coins);
        
        // 更新头衔颜色
        navTitle.className = `text-xs ${helpers.getTitleColor(coins)} text-white px-2 py-0.5 rounded-full`;
    },

    /**
     * 登出
     */
    logout() {
        auth.logout();
    },

    /**
     * 获取当前时间戳
     */
    now() {
        return Date.now();
    }
};
