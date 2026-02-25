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
    init() {
        const saved = helpers.storage.get(db.KEYS.CURRENT_USER);
        if (saved) {
            this.currentUser = saved;
            return true;
        }
        return false;
    },

    /**
     * 教务处登录
     */
    loginAdmin() {
        const pwd = document.getElementById('admin-pwd')?.value;
        if (!pwd) {
            helpers.showToast('请输入密码', 'warning');
            return false;
        }
        return this.performAdminLogin(pwd);
    },

    /**
     * 从模态框教务处登录
     */
    loginAdminFromModal() {
        const pwd = document.getElementById('modal-admin-pwd')?.value;
        if (!pwd) {
            helpers.showToast('请输入密码', 'warning');
            return false;
        }
        const result = this.performAdminLogin(pwd);
        console.log('Login result:', result);
        if (result) {
            console.log('Hiding admin login modal...');
            app.hideAdminLogin();
            // 清空密码输入框
            document.getElementById('modal-admin-pwd').value = '';
        }
        return result;
    },

    /**
     * 执行教务处登录 (升级为 API)
     */
    async performAdminLogin(pwd) {
        try {
            helpers.showLoading('正在登录...');
            
            // 尝试 API 登录
            // Admin username is 'admin' by default
            const result = await api.login({ username: 'admin', password: pwd, role: 'admin' });
            helpers.hideLoading();

            if (result && result.token) {
                localStorage.setItem('token', result.token);
                
                const admin = {
                    id: result.user.id,
                    name: result.user.username,
                    role: 'admin',
                    passwordChanged: result.user.passwordChanged
                };

                // 检查是否需要强制修改密码
                if (!admin.passwordChanged) {
                    this._pendingPasswordChange = admin;
                    this.showForceChangePasswordModal();
                    return true;
                }
                
                this.currentUser = admin;
                this.saveSession();
                
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
            helpers.hideLoading();
            console.warn('API admin login failed, trying local:', err);
            
            // 本地降级
            const admin = db.findAdmin('admin');
            
            if (!admin) {
                helpers.showToast('管理员账户不存在', 'error');
                return false;
            }
            
            const isValid = helpers.verifyPassword(pwd, admin.pwd);
            
            if (isValid) {
                // 检查是否需要强制修改密码
                if (!admin.passwordChanged) {
                    this._pendingPasswordChange = {
                        role: 'admin',
                        id: admin.id,
                        name: admin.name
                    };
                    this.showForceChangePasswordModal();
                    return true;
                }
                
                this.currentUser = {
                    role: 'admin',
                    id: admin.id,
                    name: admin.name
                };
                this.saveSession();
                
                app.hideAdminLogin();
                
                router.navigate('admin');
                app.updateNav();
                helpers.showToast('网络连接异常，已切换至离线模式', 'warning');
                return true;
            } else {
                helpers.showToast('密码错误，请重试', 'error');
                return false;
            }
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
            await api.changePassword('ignored', newPwd);
            
            // 2. 隐藏模态框和遮罩层
            this.hideForceChangePasswordModal();
            
            // 3. 更新本地用户状态 (标记密码已修改)
            if (this.currentUser) {
                this.currentUser.passwordChanged = true;
                this.saveSession();
            }
            
            // 4. 清除待处理状态
            const pendingRole = this._pendingPasswordChange ? this._pendingPasswordChange.role : (this.currentUser ? this.currentUser.role : null);
            this._pendingPasswordChange = null;
            
            helpers.hideLoading();
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
                    router.navigate('student-dashboard');
                }
            }, 1000);
            
        } catch (err) {
            helpers.hideLoading();
            console.warn('API password change failed, trying local fallback:', err);
            
            // 尝试本地降级修改
            const pendingId = this._pendingPasswordChange ? this._pendingPasswordChange.id : (this.currentUser ? this.currentUser.id : null);
            const pendingRole = this._pendingPasswordChange ? this._pendingPasswordChange.role : (this.currentUser ? this.currentUser.role : null);
            
            if (pendingId && pendingRole) {
                let success = false;
                const hashedPwd = helpers.hash(newPwd);
                
                if (pendingRole === 'admin') {
                    success = db.updateAdminPassword(pendingId, hashedPwd);
                } else if (pendingRole === 'teacher') {
                    success = db.updateTeacherPassword(pendingId, hashedPwd);
                } else if (pendingRole === 'student') {
                    success = db.updateStudentPassword(pendingId, hashedPwd);
                }
                
                if (success) {
                    helpers.showToast('网络连接异常，已在本地修改密码', 'warning');
                    this.hideForceChangePasswordModal();
                    
                    if (this.currentUser) {
                        this.currentUser.passwordChanged = true;
                        this.saveSession();
                    }
                    this._pendingPasswordChange = null;
                    
                    setTimeout(() => {
                        app.updateNav();
                        if (pendingRole === 'admin') router.navigate('admin');
                        else if (pendingRole === 'teacher') router.navigate('teacher');
                        else router.navigate('student-dashboard');
                    }, 1000);
                    return;
                }
            }
            
            helpers.showToast(err.message || '修改失败，请重试', 'error');
        }
    },

    /**
     * 教师登录 - 支持工号或姓名登录
     */
    loginTeacher() {
        const input = document.getElementById('teacher-id')?.value.trim();
        const pwd = document.getElementById('teacher-pwd')?.value;
        
        if (!input || !pwd) {
            helpers.showToast('请输入工号/姓名和密码', 'warning');
            return false;
        }
        
        return this.performTeacherLogin(input, pwd);
    },

    /**
     * 从模态框教师登录
     */
    loginTeacherFromModal() {
        const input = document.getElementById('modal-teacher-id')?.value.trim();
        const pwd = document.getElementById('modal-teacher-pwd')?.value;
        
        if (!input || !pwd) {
            helpers.showToast('请输入工号/姓名和密码', 'warning');
            return false;
        }
        
        const result = this.performTeacherLogin(input, pwd);
        if (result) {
            app.hideTeacherLogin();
        }
        return result;
    },

    /**
     * 执行教师登录 (升级为 API)
     */
    async performTeacherLogin(input, pwd) {
        try {
            helpers.showLoading('正在登录...');
            // API expects username, but input could be ID or Name.
            // My backend currently only supports 'username'.
            // If input is ID, it might fail if backend doesn't handle it.
            // But let's assume 'username' matches 'name' or 'id' in backend logic?
            // Actually, backend `login` route queries `username`.
            // So if teacher registered with ID as username, it works.
            
            const result = await api.login({ username: input, password: pwd, role: 'teacher' });
            helpers.hideLoading();

            if (result && result.token) {
                localStorage.setItem('token', result.token);
                
                const teacher = {
                    id: result.user.id,
                    name: result.user.username,
                    role: 'teacher',
                    passwordChanged: result.user.passwordChanged
                };

                // 检查是否需要强制修改密码
                if (!teacher.passwordChanged) {
                    this._pendingPasswordChange = teacher;
                    this.showForceChangePasswordModal();
                    return true;
                }
                
                this.currentUser = teacher;
                this.saveSession();
                
                // 关闭模态框
                app.hideTeacherLogin();
                
                router.navigate('teacher');
                app.updateNav();
                helpers.showToast(`欢迎回来，${teacher.name}！`, 'success');
                return true;
            }
        } catch (err) {
            helpers.hideLoading();
            console.warn('API login failed, trying local:', err);
            
            // 本地降级
            let teacher = db.findTeacherByCredentials(input, pwd);
            if (!teacher) {
                const teachers = db.getTeachers();
                const matchedByName = teachers.find(t => t.name === input);
                if (matchedByName && helpers.verifyPassword(pwd, matchedByName.pwd)) {
                    teacher = matchedByName;
                }
            }
            
            if (teacher) {
                helpers.showToast('网络连接失败，已切换至离线模式', 'info');
                // ... same logic as before ...
                this.currentUser = {
                    role: 'teacher',
                    id: teacher.id,
                    name: teacher.name,
                    subject: teacher.subject
                };
                this.saveSession();
                app.hideTeacherLogin();
                router.navigate('teacher');
                app.updateNav();
                return true;
            }
            
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
            helpers.hideLoading();

            if (result && result.token) {
                localStorage.setItem('token', result.token);
                
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
                if (!student.passwordChanged && pwd === '123456') { // 假设默认密码
                     this._pendingPasswordChange = student;
                     this.showForceChangePasswordModal();
                     return true;
                }

                this.completeStudentLogin(student);
                return true;
            }
        } catch (err) {
            helpers.hideLoading();
            // 如果 API 登录失败，尝试本地登录作为降级（仅当有本地数据时）
            console.warn('API login failed, trying local:', err);
            
            const localStudent = db.findStudentByClassAndName(className, name);
            if (localStudent && helpers.verifyPassword(pwd, localStudent.pwd)) {
                 helpers.showToast('网络连接失败，已切换至离线模式', 'info');
                 this.completeStudentLogin(localStudent);
                 return true;
            }
            
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
        
        this.saveSession();
        console.log('Session saved, navigating to student...');
        
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
     * 保存会话到 localStorage
     */
    saveSession() {
        helpers.storage.set(db.KEYS.CURRENT_USER, this.currentUser);
    },

    /**
     * 清除会话
     */
    clearSession() {
        helpers.storage.remove(db.KEYS.CURRENT_USER);
        this.currentUser = null;
    },

    /**
     * 登出
     */
    logout() {
        this.clearSession();
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
            this.saveSession();
        }
    }
};
