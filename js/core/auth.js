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
                // 如果密码未修改，清除 token 强制重新登录（走登录流程才能拿到 oldPassword 供验证）
                if (u.passwordChanged === false) {
                    api.clearToken();
                    this.currentUser = null;
                    return false;
                }
                this.currentUser = {
                    id: u.id,
                    name: u.username,
                    role: u.role,
                    class: u.className,
                    passwordChanged: u.passwordChanged
                };
                return true;
            }
            return false;
        } catch (e) {
            this.currentUser = null;
            return false;
        }
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
                    this.showForceChangePasswordModal();
                    app.updateNav();
                    return true;
                }
                
                this.currentUser = admin;
                
                // 尝试拉取云端数据 (包括词表等)
                try {
                    await db.init(); // Re-init to fetch cloud data
                } catch (e) {
                    console.warn('Failed to sync cloud data after admin login', e);
                }
                
                // 关闭模态框
                app.hideAdminLogin();
                
                router.navigate('admin');
                app.updateNav();
                helpers.showToast('欢迎回来，教务处管理员！', 'success');
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
                
                if (pendingRole === 'admin') {
                    router.navigate('admin');
                } else if (pendingRole === 'teacher') {
                    router.navigate('teacher');
                } else {
                    router.navigate('student');
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
                const teacher = {
                    id: result.user.id,
                    name: result.user.username,
                    role: 'teacher',
                    passwordChanged: result.user.passwordChanged
                };

                // 检查是否需要强制修改密码
                if (!teacher.passwordChanged) {
                    this.currentUser = teacher;
                    this._pendingPasswordChange = { ...teacher, oldPassword: pwd };
                    this.showForceChangePasswordModal();
                    app.updateNav();
                    return true;
                }
                
                this.currentUser = teacher;
                
                // 关闭模态框
                app.hideTeacherLogin();
                
                router.navigate('teacher');
                app.updateNav();
                helpers.showToast(`欢迎回来，${teacher.name}！`, 'success');
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
            if (helpers && typeof helpers.hideLoading === 'function') helpers.hideLoading();

            if (result && result.user) {
                // 登录成功，尝试拉取云端数据
                try {
                    const syncData = await api.syncPull();
                    if (syncData && syncData.data) {
                        // TODO: 合并数据逻辑
                        console.log('Synced data:', syncData);
                    }
                } catch (e) {
                    console.warn('Sync failed:', e);
                }

                // 构造本地用户对象
                const student = {
                    id: result.user.id,
                    name: result.user.username,
                    class: result.user.className,
                    role: 'student',
                    passwordChanged: result.user.passwordChanged
                };
                
                // 检查是否需要强制修改密码
                if (!student.passwordChanged) {
                     this.currentUser = student;
                     this._pendingPasswordChange = { ...student, oldPassword: pwd };
                     this.showForceChangePasswordModal();
                     app.updateNav();
                     return true;
                }

                this.completeStudentLogin(student);
                return true;
            }
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
        
        // 更新系统登录记录
        db.updateSystem({
            lastLoginIP: db.getSystem().mockCurrentIP,
            lastLoginStudentId: student.id
        });
        
        this.currentUser = {
            role: 'student',
            ...student
        };
        
        console.log('currentUser set:', this.currentUser);
        console.log('Session ready, navigating to student...');
        
        const result = router.navigate('student');
        console.log('Navigation result:', result);
        
        app.updateNav();
        helpers.showToast(`欢迎回来，${student.name}！`, 'success');
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
        router.navigate('login');
        app.updateNav();
        helpers.showToast('已安全退出', 'info');
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
