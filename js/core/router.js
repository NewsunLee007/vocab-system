/**
 * 新纪元英语词汇系统 - 路由模块
 * 处理视图切换和路径导航
 */

const router = {
    // 当前视图
    currentView: 'login',

    // 视图配置
    views: {
        admin: 'view-admin',
        teacher: 'view-teacher',
        student: 'view-student',
        learning: 'view-learning',
        testing: 'view-testing'
    },

    // 路径映射
    pathMap: {
        '/admin': 'admin',
        '/teacher': 'teacher',
        '/student': 'student',
        '/learning': 'learning',
        '/testing': 'testing'
    },

    /**
     * 初始化路由
     */
    init() {
        console.log('=== router.init ===');
        
        // 监听 URL 变化
        window.addEventListener('popstate', () => {
            this.handlePopState();
        });
        
        // 处理初始路径
        this.handleInitialPath();
    },

    /**
     * 处理初始路径
     */
    handleInitialPath() {
        // 在新版架构中，路由的初始分发权移交给了 app.js 的 app.init() 方法
        // 这里不需要再做拦截，否则会与 app.init 产生时序冲突（也就是会导致在登录页面跳转到 app.html 时，闪回首页的 bug）
        // 这里完全不做任何跳转，只记录内部状态
        
        const path = window.location.pathname;
        const viewName = this.getViewFromPath(path);
        
        if (viewName && viewName !== 'login') {
            this.currentView = viewName;
        }
    },

    /**
     * 处理浏览器前进/后退
     */
    handlePopState() {
        const path = window.location.pathname;
        const viewName = this.getViewFromPath(path);
        
        if (viewName) {
            this.navigate(viewName, false);
        }
    },

    /**
     * 从路径获取视图名称
     */
    getViewFromPath(path) {
        return this.pathMap[path] || null;
    },

    /**
     * 从视图名称获取路径
     */
    getPathFromView(viewName) {
        for (const [path, view] of Object.entries(this.pathMap)) {
            if (view === viewName) {
                return path;
            }
        }
        return '/';
    },

    /**
     * 导航到指定视图
     */
    navigate(viewName, updateHistory = true, useReplaceState = false) {
        console.log(`=== router.navigate: ${viewName} ===`);
        
        // 拦截旧的 login 视图，重定向到门户页
        if (viewName === 'login') {
            window.location.href = 'index.html';
            return false;
        }
        
        const user = auth.getCurrentUser();
        // 如果密码未修改，阻止导航到系统内部页面，但允许应用完成初始化
        if (user && user.passwordChanged === false) {
            console.log('Password not changed, blocking navigation to internal view:', viewName);
            // 只要确保停留在app.html并且有弹窗就可以了，不需要阻止DOM显示（为了能看到底图）
            // 但是我们要阻止初始化特定角色的组件（否则会导致无限刷新数据）
            return false;
        }
        
        // 权限检查
        if (!this.checkPermission(viewName)) {
            console.warn(`无权访问视图: ${viewName}`);
            // 对于因未修改密码而产生的拦截，这里我们只打断后续渲染渲染流程，
            // 但是绝对不能重定向回 index.html。
            if (user && user.passwordChanged === false) {
                return false;
            }
            window.location.href = 'index.html';
            return false;
        }

        // 隐藏所有视图
        Object.values(this.views).forEach(viewId => {
            const element = document.getElementById(viewId);
            if (element) {
                element.classList.add('hidden');
            }
        });

        // 显示目标视图
        const targetViewId = this.views[viewName];
        const targetElement = document.getElementById(targetViewId);
        
        if (targetElement) {
            targetElement.classList.remove('hidden');
            this.currentView = viewName;
            
            // 更新 URL
            if (updateHistory) {
                const path = this.getPathFromView(viewName);
                if (useReplaceState) {
                    history.replaceState({ view: viewName }, '', path);
                } else {
                    history.pushState({ view: viewName }, '', path);
                }
            }
            
            // 触发视图加载回调
            this.onViewLoad(viewName);
            
            // 滚动到顶部
            window.scrollTo(0, 0);
            
            return true;
        }
        
        console.error(`视图不存在: ${viewName}`);
        return false;
    },

    /**
     * 检查权限
     */
    checkPermission(viewName) {
        console.log(`=== checkPermission: ${viewName} ===`);
        
        // 登录页始终可访问
        if (viewName === 'login') {
            console.log('Login page always allowed');
            return true;
        }
        
        // 其他页面需要登录
        const isLoggedIn = auth.isLoggedIn();
        console.log('isLoggedIn:', isLoggedIn);
        if (!isLoggedIn) return false;
        
        const user = auth.getCurrentUser();
        
        // 密码未修改时，不允许直接进入业务视图。
        // 这将阻止 student/teacher/admin 等模块渲染其数据并触发无限循环，
        // 同时确保用户只能留在当前的模态框界面。
        if (user && user.passwordChanged === false) {
            console.log('Password not changed, blocking permission for view:', viewName);
            return false;
        }
        
        // 角色权限检查
        console.log('Checking role, user.role:', user?.role);
        switch (viewName) {
            case 'admin':
                const isAdmin = user.role === 'admin';
                console.log('Admin check:', isAdmin);
                return isAdmin;
            case 'teacher':
                // admin 也可以访问教师视图
                const isTeacher = user.role === 'teacher' || user.role === 'admin';
                console.log('Teacher check:', isTeacher);
                return isTeacher;
            case 'student':
            case 'learning':
            case 'testing':
                const isStudent = user.role === 'student';
                console.log('Student check:', isStudent);
                return isStudent;
            default:
                console.log('Unknown view, denying access');
                return false;
        }
    },

    /**
     * 视图加载回调
     */
    onViewLoad(viewName) {
        switch (viewName) {
            case 'admin':
                if (typeof admin !== 'undefined' && admin.render) {
                    admin.render();
                }
                break;
            case 'teacher':
                if (typeof teacher !== 'undefined' && teacher.render) {
                    teacher.render();
                }
                // admin 进入教师视图时显示"返回教务处"按钮
                {
                    const backBtn = document.getElementById('teacher-admin-back-btn');
                    if (backBtn) {
                        const user = auth.getCurrentUser();
                        if (user && user.role === 'admin') {
                            backBtn.classList.remove('hidden');
                        } else {
                            backBtn.classList.add('hidden');
                        }
                    }
                }
                break;
            case 'student':
                if (typeof student !== 'undefined' && student.render) {
                    student.render();
                }
                break;
            case 'learning':
                // 学习模块在启动学习时渲染
                break;
            case 'testing':
                // 检测模块在启动检测时渲染
                break;
        }
    },

    /**
     * 获取当前视图
     */
    getCurrentView() {
        return this.currentView;
    },

    /**
     * 返回上一页（学生返回主页）
     */
    back() {
        if (auth.hasRole('student')) {
            this.navigate('student');
        } else if (auth.hasRole('teacher')) {
            this.navigate('teacher');
        } else if (auth.hasRole('admin')) {
            // admin 从任意页面返回教务处
            this.navigate('admin');
        } else {
            window.location.href = 'index.html';
        }
    },

    /**
     * 根据角色重定向到默认页面
     */
    redirectByRole() {
        if (!auth.isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }
        
        const user = auth.getCurrentUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Ensure we are on app.html before navigating to internal views
        if (!window.location.pathname.endsWith('app.html')) {
            window.location.href = 'app.html';
            return;
        }
        
        // 如果密码未修改，不进行常规的页面跳转
        if (user.passwordChanged === false) {
            return;
        }
        
        switch (user.role) {
            case 'admin':
                return this.navigate('admin', true, true);
            case 'teacher':
                return this.navigate('teacher', true, true);
            case 'student':
                return this.navigate('student', true, true);
            default:
                window.location.href = 'index.html';
                return false;
        }
    }
};

// 初始化路由
window.addEventListener('DOMContentLoaded', () => {
    router.init();
});
