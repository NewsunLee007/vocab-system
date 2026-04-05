/**
 * 新纪元英语词汇系统 - 认证模块
 * 处理登录、登出、权限验证
 */

const auth = {
    // 当前登录用户
    currentUser: null,
    
    // 待确认的学生登录信息（防作弊用）
    pendingStudentLogin: null,

    /**
     * 初始化认证状态
     */
    async init() {
        try {
            const session = await api.me();
            if (session && session.user) {
                const u = session.user;
                this.currentUser = {
                    id: u.id,
                    name: u.username,
                    role: u.role,
                    class: u.className,
                    passwordChanged: u.passwordChanged
                };
                return true;
            }
        } catch (e) {
            console.warn('API me() failed:', e);
            // 如果API失败但是有token，尝试从localStorage中恢复用户信息
            const token = localStorage.getItem('vocab_api_token');
            const role = localStorage.getItem('currentRole');
            if (token && role) {
                // 暂时设置一个默认的用户，以便能够进入系统
                this.currentUser = {
                    id: '1',
                    name: '本地恢复',
                    role: role,
                    passwordChanged: true
                };
                return true;
            }
        }
        this.currentUser = null;
        return false;
    },

    buildStudentSession(apiUser) {
        let dbStudent = null;
        let stats = null;
        if (typeof db !== 'undefined') {
            dbStudent = db?.findStudent?.(apiUser.id) || db?.findStudentByClassAndName?.(apiUser.className, apiUser.username);
            stats = dbStudent ? db.getStudentStats(dbStudent.id) : null;
        }
        return {
            id: apiUser.id,
            name: apiUser.username,
            class: apiUser.className,
            role: 'student',
            passwordChanged: apiUser.passwordChanged,
            coins: stats?.coins ?? dbStudent?.coins ?? 0,
            badges: stats?.badges ?? dbStudent?.badges ?? [],
            streak: stats?.streak ?? dbStudent?.streak ?? 0,
            totalLearned: stats?.totalLearned ?? dbStudent?.totalLearned ?? 0,
            totalTests: stats?.totalTests ?? dbStudent?.totalTests ?? 0,
            totalCorrect: stats?.totalCorrect ?? dbStudent?.totalCorrect ?? 0,
            totalQuestions: stats?.totalQuestions ?? dbStudent?.totalQuestions ?? 0,
            title: stats?.title ?? (typeof helpers !== 'undefined' ? helpers.getTitle(stats?.coins ?? dbStudent?.coins ?? 0) : '初学乍练'),
            teacherId: stats?.teacherId ?? dbStudent?.teacherId ?? null
        };
    },

    refreshCurrentUserProfile() {
        if (!this.currentUser) return null;

        if (this.currentUser.role === 'student') {
            const refreshed = this.buildStudentSession({
                id: this.currentUser.id,
                username: this.currentUser.name,
                className: this.currentUser.class,
                passwordChanged: this.currentUser.passwordChanged
            });
            this.currentUser = {
                ...this.currentUser,
                ...refreshed
            };
        }

        return this.currentUser;
    },

    /**
     * 教务处登录
     */
    async loginAdmin() {
        try {
            const pwd = document.getElementById('admin-pwd')?.value;
            if (!pwd) {
                helpers.showToast('请输入密码', 'warning');
                return false;
            }
            return await this.performAdminLogin(pwd);
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err?.message || '登录失败', 'error');
            return false;
        }
    },

    /**
     * 从模态框教务处登录
     */
    async loginAdminFromModal() {
        try {
            const pwd = document.getElementById('modal-admin-pwd')?.value;
            if (!pwd) {
                helpers.showToast('请输入密码', 'warning');
                return false;
            }
            const success = await this.performAdminLogin(pwd);
            if (success) {
                app.hideAdminLogin();
                document.getElementById('modal-admin-pwd').value = '';
            }
            return success;
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err?.message || '登录失败', 'error');
            return false;
        }
    },

    /**
     * 执行教务处登录 (升级为 API)
     */
    async performAdminLogin(pwd) {
        try {
            helpers.showLoading('正在登录...');

            // 切换账号前先清除旧 session，避免带着教师 token 请求
            this.currentUser = null;
            api.clearToken();
            
            // 尝试 API 登录
            // Admin username is 'admin' by default
            const result = await api.login({ username: 'admin', password: pwd, role: 'admin' });
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();

            if (result && result.user) {
                const admin = {
                    id: result.user.id,
                    name: result.user.username,
                    role: 'admin',
                    passwordChanged: result.user.passwordChanged
                };

                // 检查是否需要强制修改密码
                if (!admin.passwordChanged) {
                    this.currentUser = admin;
                    this._pendingPasswordChange = { ...admin, oldPassword: pwd };
                    
                    if (!window.location.pathname.endsWith('app.html')) {
                        window.location.href = 'app.html?action=force_change_password';
                        return true;
                    }
                    
                    this.showForceChangePasswordModal();
                    app.updateNav();
                    return true;
                }
                
                this.currentUser = admin;
                
                // 尝试拉取云端数据 (包括词表等)，但只在 app.html 且存在 db 对象时才执行
                try {
                    if (typeof db !== 'undefined' && db.init) {
                        await db.init(); // Re-init to fetch cloud data
                    }
                } catch (e) {
                    console.warn('Failed to sync cloud data after admin login', e);
                }
                
                // 关闭模态框
                app.hideAdminLogin();
                
                helpers.showToast('欢迎回来，教务处管理员！', 'success');
                
                // 如果当前不在 app.html，跳转到 app.html
                if (!window.location.pathname.endsWith('app.html')) {
                    window.location.href = 'app.html';
                } else {
                    router.navigate('admin', true, true);
                    app.updateNav();
                }
                return true;
            }
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err.message || '后端接口不可用，请检查 API 地址/网络', 'error');
            return false;
        }
    },


    /**
     * 显示强制修改密码模态框
     */
    showForceChangePasswordModal() {
        const modal = document.getElementById('modal-force-change-password');
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
        }
        // 清空输入
        const newPwdInput = document.getElementById('force-new-password');
        const confirmPwdInput = document.getElementById('force-confirm-password');
        if (newPwdInput) newPwdInput.value = '';
        if (confirmPwdInput) confirmPwdInput.value = '';
    },

    /**
     * 隐藏强制修改密码模态框
     */
    hideForceChangePasswordModal() {
        const modal = document.getElementById('modal-force-change-password');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    },

    /**
     * 确认强制修改密码
     */
    async confirmForceChangePassword() {
        const newPwd = document.getElementById('force-new-password')?.value;
        const confirmPwd = document.getElementById('force-confirm-password')?.value;
        
        if (!newPwd || !confirmPwd) {
            helpers.showToast('请填写所有密码字段', 'warning');
            return;
        }
        
        if (newPwd !== confirmPwd) {
            helpers.showToast('两次输入的密码不一致', 'error');
            return;
        }
        
        if (newPwd.length < 8 || !/[a-zA-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
            helpers.showToast('密码至少8位，且包含字母和数字', 'warning');
            return;
        }
        
        try {
            helpers.showLoading('正在修改密码并登录...');
            
            // 1. 调用 API 修改密码
            const pendingUser = this._pendingPasswordChange || this.currentUser;
            await api.changePassword(pendingUser?.oldPassword || 'ignored', newPwd);
            
            // 2. 隐藏模态框和遮罩层
            this.hideForceChangePasswordModal();
            
            // 3. 更新本地用户状态 (标记密码已修改)
            if (!this.currentUser && pendingUser) this.currentUser = pendingUser;
            if (this.currentUser) this.currentUser.passwordChanged = true;
            
            // 4. 清除待处理状态
            const pendingRole = pendingUser ? pendingUser.role : (this.currentUser ? this.currentUser.role : null);
            this._pendingPasswordChange = null;
            
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast('密码修改成功，正在进入系统...', 'success');
            
            // 5. 根据角色跳转到对应页面，而不是登出
            setTimeout(() => {
                // 确保所有模态框都关闭
                const allModals = document.querySelectorAll('[id^="modal-"]');
                allModals.forEach(modal => {
                    modal.classList.add('hidden');
                    modal.classList.add('opacity-0');
                });
                
                // 强制更新导航栏
                app.updateNav();
                
                // 如果不在 app.html，则重定向
                if (!window.location.pathname.endsWith('app.html')) {
                    window.location.href = 'app.html';
                } else {
                    if (pendingRole === 'admin') {
                        router.navigate('admin');
                    } else if (pendingRole === 'teacher') {
                        router.navigate('teacher');
                    } else {
                        router.navigate('student');
                    }
                }
            }, 1000);
            
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err.message || '修改失败，请重试', 'error');
        }
    },

    /**
     * 教师登录 - 支持工号或姓名登录
     */
    async loginTeacher() {
        try {
            const input = document.getElementById('teacher-id')?.value.trim();
            const pwd = document.getElementById('teacher-pwd')?.value;
            
            if (!input || !pwd) {
                helpers.showToast('请输入工号/姓名和密码', 'warning');
                return false;
            }
            
            return await this.performTeacherLogin(input, pwd);
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err?.message || '登录失败', 'error');
            return false;
        }
    },

    /**
     * 从模态框教师登录
     */
    async loginTeacherFromModal() {
        try {
            const input = document.getElementById('modal-teacher-id')?.value.trim();
            const pwd = document.getElementById('modal-teacher-pwd')?.value;
            
            if (!input || !pwd) {
                helpers.showToast('请输入工号/姓名和密码', 'warning');
                return false;
            }
            
            const success = await this.performTeacherLogin(input, pwd);
            if (success) {
                app.hideTeacherLogin();
            }
            return success;
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err?.message || '登录失败', 'error');
            return false;
        }
    },

    /**
     * 执行教师登录 (升级为 API)
     */
    async performTeacherLogin(input, pwd) {
        try {
            helpers.showLoading('正在登录...');

            // 切换账号前先清除旧 session
            this.currentUser = null;
            api.clearToken();

            const result = await api.login({ username: input, password: pwd, role: 'teacher' });
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();

            if (result && result.user) {
                // 使用真实的教师ID，确保与学生的teacherId格式匹配
                // 如果教师ID是纯数字（如'1'），添加前缀't'以匹配学生数据格式
                let teacherId = result.user.id;
                if (/^\d+$/.test(teacherId)) {
                    teacherId = 't' + teacherId;
                }
                
                const teacher = {
                    id: teacherId,
                    name: result.user.username,
                    role: 'teacher',
                    passwordChanged: result.user.passwordChanged
                };

                // 检查是否需要强制修改密码
                if (!teacher.passwordChanged) {
                    this.currentUser = teacher;
                    this._pendingPasswordChange = { ...teacher, oldPassword: pwd };
                    
                    if (!window.location.pathname.endsWith('app.html')) {
                        window.location.href = 'app.html?action=force_change_password';
                        return true;
                    }
                    
                    this.showForceChangePasswordModal();
                    app.updateNav();
                    return true;
                }
                
                this.currentUser = teacher;
                
                try {
                    if (typeof db !== 'undefined' && db.init) {
                        await db.init();
                    }
                } catch (e) {
                    console.warn('Failed to sync cloud data after teacher login', e);
                }
                
                // 关闭模态框
                app.hideTeacherLogin();
                
                helpers.showToast(`欢迎回来，${teacher.name}！`, 'success');
                
                // 如果当前不在 app.html，跳转到 app.html
                if (!window.location.pathname.endsWith('app.html')) {
                    window.location.href = 'app.html';
                } else {
                    // 根据角色重定向，使用 replaceState 替换历史记录
                    router.navigate('teacher', true, true);
                    app.updateNav();
                }
                return true;
            }
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err.message || '登录失败', 'error');
            return false;
        }
    },

    /**
     * 学生登录 (升级为 API 登录)
     */
    async loginStudent() {
        const className = document.getElementById('student-class').value.trim();
        const name = document.getElementById('student-name').value.trim();
        const pwd = document.getElementById('student-pwd').value;
        
        if (!className || !name || !pwd) {
            helpers.showToast('请输入班级、姓名和密码！', 'warning');
            return false;
        }

        try {
            helpers.showLoading('正在登录...');
            const result = await api.login({ username: name, className, password: pwd, role: 'student' });

            if (result && result.user) {
                try {
                    if (typeof db !== 'undefined' && db.init) {
                        await db.init();
                    }
                } catch (e) {
                    console.warn('Failed to refresh school data after student login:', e);
                }

                const student = this.buildStudentSession(result.user);
                
                if (!student.passwordChanged) {
                     this.currentUser = student;
                     this._pendingPasswordChange = { ...student, oldPassword: pwd };
                     if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
                     
                     if (!window.location.pathname.endsWith('app.html')) {
                         window.location.href = 'app.html?action=force_change_password';
                         return true;
                     }
                     
                     this.showForceChangePasswordModal();
                     app.updateNav();
                     return true;
                }

                if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
                this.currentUser = student;
                
                // 根据角色重定向
                helpers.showToast(`欢迎回来，${student.name}！`, 'success');
                
                // 如果当前不在 app.html，跳转到 app.html
                if (!window.location.pathname.endsWith('app.html')) {
                    window.location.href = 'app.html';
                } else {
                    if (typeof router !== 'undefined' && router.redirectByRole) {
                        router.redirectByRole();
                    } else {
                        this.completeStudentLogin(student);
                    }
                    app.updateNav();
                }
                return true;
            }
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
        } catch (err) {
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();
            helpers.showToast(err.message || '登录失败', 'error');
            return false;
        }
    },

    /**
     * 完成学生登录
     */
    completeStudentLogin(student) {
        console.log('=== completeStudentLogin ===');
        console.log('Student:', student);
        
        const hydratedStudent = this.buildStudentSession({
            id: student.id,
            username: student.name,
            className: student.class,
            passwordChanged: student.passwordChanged
        });

        // 更新系统登录记录
        if (typeof db !== 'undefined' && db.updateSystem && db.getSystem) {
            db.updateSystem({
                lastLoginIP: db.getSystem().mockCurrentIP,
                lastLoginStudentId: hydratedStudent.id
            });
        }
        
        this.currentUser = {
            role: 'student',
            ...hydratedStudent
        };
        
        console.log('currentUser set:', this.currentUser);
        console.log('Session ready, navigating to student...');
        
        // 如果当前不在 app.html，跳转到 app.html
        if (!window.location.pathname.endsWith('app.html')) {
            window.location.href = 'app.html';
        } else {
            const result = router.navigate('student');
            console.log('Navigation result:', result);
            app.updateNav();
        }
    },

    /**
     * 显示强制修改密码模态框
     */
    showForceChangePasswordModal() {
        const modal = document.getElementById('modal-force-change-password');
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight; // Trigger reflow
            modal.classList.remove('opacity-0');
        }
    },

    /**
     * 隐藏强制修改密码模态框
     */
    hideForceChangePasswordModal() {
        const modal = document.getElementById('modal-force-change-password');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
        
        // 确保所有输入框被清空
        const inputs = document.querySelectorAll('#modal-force-change-password input');
        inputs.forEach(input => input.value = '');
    },

    /**
     * 显示安全警告模态框
     */
    showSecurityModal() {
        const modal = document.getElementById('modal-security');
        modal.classList.remove('hidden');
        // 强制重绘以触发过渡动画
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 隐藏安全警告模态框
     */
    hideSecurityModal() {
        const modal = document.getElementById('modal-security');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 确认安全登录
     */
    confirmSecurityLogin() {
        this.hideSecurityModal();
        if (this.pendingStudentLogin) {
            this.completeStudentLogin(this.pendingStudentLogin);
            this.pendingStudentLogin = null;
        }
    },

    /**
     * 取消安全登录
     */
    cancelSecurityLogin() {
        this.hideSecurityModal();
        this.pendingStudentLogin = null;
    },

    /**
     * 登出
     */
    async logout() {
        try {
            await api.logout();
        } catch (e) {}
        this.currentUser = null;
        this._pendingPasswordChange = null;
        
        // 清理所有全屏测试/学习视图
        const fullScreenViews = [
            // 测试视图
            'matching-test-view',
            'spelling-test-view',
            'context-test-view',
            // 学习视图
            'flashcard-learning-view',
            'word-learning-view',
            'flexible-learning-view',
            // 模式视图
            'spelling-mode',
            'spelling-completion',
            'quiz-mode',
            'quiz-completion',
            'game-mode',
            'self-learning-mode-choice',
            'flashcard-mode',
            // 任务引擎视图
            'task-engine-view',
            'multi-mode-view',
            'task-intro',
            'learning-choice',
            'test-phase',
            'mode-transition',
            'mode-complete',
            'task-complete',
            // 模态框
            'save-exit-modal',
            'pause-modal',
            'learning-complete'
        ];
        fullScreenViews.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        
        // 取消所有正在播放的语音
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        helpers.showToast('已安全退出', 'info');
        
        // 登出后跳转到新的角色选择页面
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
    },

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return this.currentUser !== null;
    },

    /**
     * 检查角色权限
     */
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    },

    /**
     * 获取当前用户
     */
    getCurrentUser() {
        return this.currentUser;
    },

    /**
     * 更新当前用户信息
     */
    updateCurrentUser(updates) {
        if (this.currentUser) {
            Object.assign(this.currentUser, updates);
        }
    }
};
