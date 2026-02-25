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
     * 执行教务处登录
     */
    performAdminLogin(pwd) {
        console.log('Attempting admin login with password:', pwd);
        
        const admin = db.findAdmin('admin');
        console.log('Found admin:', admin);
        
        if (!admin) {
            helpers.showToast('管理员账户不存在', 'error');
            console.error('Admin not found in database');
            return false;
        }
        
        const isValid = helpers.verifyPassword(pwd, admin.pwd);
        console.log('Password valid:', isValid);
        console.log('Input password hash:', btoa(pwd));
        console.log('Stored password hash:', admin.pwd);
        
        if (isValid) {
            // 检查是否需要强制修改密码（首次登录）
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
            
            // 直接关闭模态框
            const modal = document.getElementById('modal-admin-login');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.add('opacity-0');
            }
            const pwdInput = document.getElementById('modal-admin-pwd');
            if (pwdInput) pwdInput.value = '';
            
            router.navigate('admin');
            app.updateNav();
            helpers.showToast('欢迎回来，教务处管理员！', 'success');
            return true;
        } else {
            helpers.showToast('密码错误，请重试', 'error');
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
    confirmForceChangePassword() {
        console.log('confirmForceChangePassword called');
        
        const newPwd = document.getElementById('force-new-password')?.value;
        const confirmPwd = document.getElementById('force-confirm-password')?.value;
        
        console.log('newPwd:', newPwd, 'confirmPwd:', confirmPwd);
        
        if (!newPwd || !confirmPwd) {
            helpers.showToast('请填写所有密码字段', 'warning');
            return;
        }
        
        if (newPwd !== confirmPwd) {
            helpers.showToast('两次输入的密码不一致', 'error');
            return;
        }
        
        if (newPwd.length < 6) {
            helpers.showToast('密码长度至少6位', 'warning');
            return;
        }
        
        if (!this._pendingPasswordChange) {
            console.error('_pendingPasswordChange is null!');
            helpers.showToast('系统错误，请重新登录', 'error');
            return;
        }
        
        console.log('_pendingPasswordChange:', this._pendingPasswordChange);
        
        const { role, id, name } = this._pendingPasswordChange;
        
        // 更新密码
        if (role === 'admin') {
            db.updateAdminPassword(id, helpers.hash(newPwd));
        } else if (role === 'teacher') {
            db.updateTeacherPassword(id, helpers.hash(newPwd));
        }
        
        // 标记密码已修改
        db.markPasswordChanged(role, id);
        
        console.log('Password updated, hiding modal...');
        
        // 直接关闭强制修改密码模态框
        const forceModal = document.getElementById('modal-force-change-password');
        if (forceModal) {
            forceModal.classList.add('opacity-0');
            setTimeout(() => {
                forceModal.classList.add('hidden');
            }, 300);
        }
        
        // 完成登录
        this.currentUser = { role, id, name };
        this.saveSession();
        
        console.log('Navigating to:', role === 'admin' ? 'admin' : 'teacher');
        
        // 关闭登录模态框
        if (role === 'admin') {
            const modal = document.getElementById('modal-admin-login');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.add('opacity-0');
            }
            const pwdInput = document.getElementById('modal-admin-pwd');
            if (pwdInput) pwdInput.value = '';
            router.navigate('admin');
        } else if (role === 'teacher') {
            const modal = document.getElementById('modal-teacher-login');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.add('opacity-0');
            }
            const idInput = document.getElementById('modal-teacher-id');
            const pwdInput = document.getElementById('modal-teacher-pwd');
            if (idInput) idInput.value = '';
            if (pwdInput) pwdInput.value = '';
            router.navigate('teacher');
        }
        
        app.updateNav();
        helpers.showToast('密码修改成功！请牢记您的新密码', 'success');
        this._pendingPasswordChange = null;
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
     * 执行教师登录
     */
    performTeacherLogin(input, pwd) {
        let teacher = null;
        
        // 首先尝试用工号查找
        teacher = db.findTeacherByCredentials(input, pwd);
        
        // 如果工号查找失败，尝试用姓名查找
        if (!teacher) {
            const teachers = db.getTeachers();
            const matchedByName = teachers.find(t => t.name === input);
            if (matchedByName && helpers.verifyPassword(pwd, matchedByName.pwd)) {
                teacher = matchedByName;
            }
        }
        
        if (teacher) {
            // 检查是否需要强制修改密码（首次登录）
            if (!teacher.passwordChanged) {
                this._pendingPasswordChange = {
                    role: 'teacher',
                    id: teacher.id,
                    name: teacher.name,
                    subject: teacher.subject
                };
                this.showForceChangePasswordModal();
                return true;
            }
            
            this.currentUser = {
                role: 'teacher',
                id: teacher.id,
                name: teacher.name,
                subject: teacher.subject
            };
            this.saveSession();
            
            // 直接关闭模态框
            const modal = document.getElementById('modal-teacher-login');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.add('opacity-0');
            }
            const idInput = document.getElementById('modal-teacher-id');
            const pwdInput = document.getElementById('modal-teacher-pwd');
            if (idInput) idInput.value = '';
            if (pwdInput) pwdInput.value = '';
            
            router.navigate('teacher');
            app.updateNav();
            helpers.showToast(`欢迎回来，${teacher.name}！`, 'success');
            return true;
        } else {
            helpers.showToast('工号/姓名或密码错误', 'error');
            return false;
        }
    },

    /**
     * 学生登录
     */
    loginStudent() {
        const className = document.getElementById('student-class').value.trim();
        const name = document.getElementById('student-name').value.trim();
        const pwd = document.getElementById('student-pwd').value;
        
        if (!className || !name || !pwd) {
            helpers.showToast('请输入班级、姓名和密码！', 'warning');
            return false;
        }
        
        const student = db.findStudentByClassAndName(className, name);
        
        if (!student) {
            helpers.showToast('未找到该学生，请确认信息或联系老师添加！', 'error');
            return false;
        }

        // 验证密码 (如果学生数据中没有密码字段，则默认允许登录并自动初始化密码)
        // 注意：新添加的学生会有密码，旧数据可能没有
        if (student.pwd) {
            if (!helpers.verifyPassword(pwd, student.pwd)) {
                helpers.showToast('密码错误！', 'error');
                return false;
            }
        } else {
            // 旧数据兼容：如果输入了默认密码，则升级账户
            if (pwd === '123456') {
                student.pwd = helpers.hash('123456');
                db.save();
            } else {
                helpers.showToast('首次登录请使用默认密码：123456', 'info');
                return false;
            }
        }
        
        // 防作弊检测
        const system = db.getSystem();
        if (system.lastLoginIP === system.mockCurrentIP && 
            system.lastLoginStudentId && 
            system.lastLoginStudentId !== student.id) {
            // 显示安全警告
            this.pendingStudentLogin = student;
            this.showSecurityModal();
            return false;
        }
        
        this.completeStudentLogin(student);
        return true;
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
