/**
 * 新纪元英语词汇系统 - 应用主入口
 */

const app = {
    /**
     * 初始化应用
     */
    async init() {
        await auth.init();
        await db.init();
        auth.refreshCurrentUserProfile();
        
        const hasSession = auth.isLoggedIn();
        
        // 更新导航栏
        this.updateNav();
        
        // 如果有会话，自动跳转到对应页面
        if (hasSession && auth.currentUser) {
            router.navigate(auth.currentUser.role === 'admin' ? 'admin' : 
                           auth.currentUser.role === 'teacher' ? 'teacher' : 'student');
        } else {
            router.navigate('login');
        }
        
        console.log('新纪元英语词汇系统已初始化');
    },

    /**
     * 更新导航栏显示
     */
    updateNav() {
        const navUserInfo = document.getElementById('nav-user-info');
        const navLoginLinks = document.getElementById('nav-login-links');
        const currentUserDisplay = document.getElementById('current-user-display');
        const studentAssets = document.getElementById('student-assets');
        
        if (!auth.isLoggedIn()) {
            navUserInfo.classList.add('hidden');
            if (navLoginLinks) navLoginLinks.classList.remove('hidden');
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
                break;
            case 'teacher':
                currentUserDisplay.innerHTML = `<i class="fa-solid fa-chalkboard-user mr-2"></i>${user.name}`;
                break;
            case 'student':
                currentUserDisplay.innerText = `${user.class} ${user.name}`;
                studentAssets.classList.remove('hidden');
                this.updateStudentNav(user);
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
    },

    /**
     * 显示教师登录模态框
     */
    showTeacherLogin() {
        // 已以教师身份登录，直接跳转
        if (auth.isLoggedIn() && auth.getCurrentUser()?.role === 'teacher') {
            router.navigate('teacher');
            return;
        }
        const modal = document.getElementById('modal-teacher-login');
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
        }
    },

    /**
     * 隐藏教师登录模态框
     */
    hideTeacherLogin() {
        const modal = document.getElementById('modal-teacher-login');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    },

    /**
     * 显示教务处登录模态框
     */
    showAdminLogin() {
        // 已以管理员身份登录，直接跳转
        if (auth.isLoggedIn() && auth.getCurrentUser()?.role === 'admin') {
            router.navigate('admin');
            return;
        }

        // 先强制关闭教师登录弹框，防止两框叠加导致点击事件被拦截
        const teacherModal = document.getElementById('modal-teacher-login');
        if (teacherModal) {
            teacherModal.classList.add('opacity-0');
            teacherModal.classList.add('hidden');
        }

        const modal = document.getElementById('modal-admin-login');
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
            // 清空密码框，避免残留
            const pwdInput = document.getElementById('modal-admin-pwd');
            if (pwdInput) pwdInput.value = '';
        }
    },

    /**
     * 隐藏教务处登录模态框
     */
    hideAdminLogin() {
        const modal = document.getElementById('modal-admin-login');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.classList.add('hidden');
            // 清空输入框
            const pwdInput = document.getElementById('modal-admin-pwd');
            if (pwdInput) pwdInput.value = '';
        }
    },

    /**
     * 显示游戏模式选择
     */
    showGameModeSelect() {
        helpers.showToast('请先登录后再开始游戏闯关！', 'info');
        document.getElementById('student-name').focus();
    },

    /**
     * 显示单词学习模式选择
     */
    showWordLearningMode() {
        helpers.showToast('请先登录后再开始自主学习！', 'info');
        document.getElementById('student-name').focus();
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
