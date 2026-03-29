/**
 * 新纪元英语词汇系统 - 路由模块
 * 处理视图切换
 */

const router = {
    // 当前视图
    currentView: 'login',

    // 视图配置
    views: {
        login: 'view-login',
        admin: 'view-admin',
        teacher: 'view-teacher',
        student: 'view-student',
        learning: 'view-learning',
        testing: 'view-testing'
    },

    /**
     * 导航到指定视图
     */
    navigate(viewName) {
        console.log(`=== router.navigate: ${viewName} ===`);
        
        // 权限检查
        if (!this.checkPermission(viewName)) {
            console.warn(`无权访问视图: ${viewName}`);
            this.navigate('login');
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
        if (user && user.passwordChanged === false) {
            auth.showForceChangePasswordModal();
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
            this.navigate('login');
        }
    }
};
