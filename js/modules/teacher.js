/**
 * 新纪元英语词汇系统 - 教师模块
 */

const teacher = {
    currentTab: 'tab-stats',
    currentAIWordlistId: null,
    currentEditWordlistId: null,
    selectedTextbookUnits: [],
    currentStudentId: null,
    currentDetailStudentId: null,
    currentEditTaskId: null,

    /**
     * 渲染教师工作台
     */
    render() {
        const user = auth.getCurrentUser();
        document.getElementById('teacher-dashboard-title').innerText = `${user.name} 的工作台`;
        
        this.switchTab('tab-stats');
        this.renderStats();
        this.renderStudents();
        this.renderWordlists();
        this.renderTasks();

        // 检查并启动新手指引
        setTimeout(() => {
            if (typeof Tour !== 'undefined' && !helpers.memoryStore.get('tour_completed_teacher-intro')) {
                this.startTour();
            }
        }, 800);
    },

    /**
     * 启动新手指引
     */
    startTour() {
        if (typeof Tour === 'undefined') return;
        
        const steps = [
            {
                title: '👋 欢迎来到教师工作台',
                content: '这里是您的教学管理中心。您可以管理学生、布置作业并监控学习进度，助您轻松掌控课堂。',
                placement: 'center'
            },
            {
                element: '#teacher-dashboard-title',
                title: '🏫 工作台概览',
                content: '这里显示当前登录的教师信息，让您随时了解自己的工作状态。',
                placement: 'bottom'
            },
            {
                element: '#teacher-today-count',
                title: '📊 数据看板',
                content: '这里实时展示关键教学数据，如今日学习人数、检测完成情况等，助您快速把握学情。',
                placement: 'bottom'
            },
            {
                element: '#btn-tab-stats',
                title: '📈 学情统计',
                content: '默认显示的页面。在这里查看全班学生的详细学习数据、活跃度和历史记录。',
                placement: 'bottom'
            },
            {
                element: '#btn-tab-students',
                title: '👥 学生管理',
                content: '点击这里切换到学生管理页面。您可以管理班级名单，查看单个学生的详细学习画像。',
                placement: 'bottom'
            },
            {
                element: '#btn-tab-words',
                title: '📚 词表与任务',
                content: '这是核心功能区。您可以创建词表、关联教材，并向学生布置学习任务和检测任务。',
                placement: 'bottom'
            },
            {
                element: '#btn-tab-settings',
                title: '⚙️ 个人设置',
                content: '在这里修改您的登录密码和查看个人信息。',
                placement: 'bottom'
            }
        ];

        Tour.init(steps, { id: 'teacher-intro' });
        Tour.start();
    },

    /**
     * 切换Tab
     */
    switchTab(tabId) {
        // 隐藏所有tab内容
        ['tab-stats', 'tab-students', 'tab-words', 'tab-settings'].forEach(id => {
            const tabContent = document.getElementById(id);
            if (tabContent) tabContent.classList.add('hidden');
            
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                // 重置所有按钮样式为未选中状态
                btn.classList.remove('text-white', 'font-semibold', 'border-white');
                btn.classList.add('text-white/70', 'font-medium', 'border-transparent');
            }
        });

        // 显示目标tab
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.remove('hidden');
        
        // 激活当前按钮
        const activeBtn = document.getElementById('btn-' + tabId);
        if (activeBtn) {
            activeBtn.classList.remove('text-white/70', 'font-medium', 'border-transparent');
            activeBtn.classList.add('text-white', 'font-semibold', 'border-white');
        }
        
        this.currentTab = tabId;
        
        // 根据切换的Tab渲染对应内容
        if (tabId === 'tab-stats') {
            this.renderStats();
        } else if (tabId === 'tab-students') {
            this.renderStudents();
        } else if (tabId === 'tab-words') {
            this.renderWordlists();
            this.renderTasks();
        } else if (tabId === 'tab-settings') {
            this.renderSettings();
        }
    },

    /**
     * 渲染设置页面
     */
    renderSettings() {
        const user = auth.getCurrentUser();
        const teacher = db.findTeacher(user.id);
        
        if (teacher) {
            document.getElementById('settings-teacher-id').innerText = teacher.id;
            document.getElementById('settings-teacher-name').innerText = teacher.name;
        }
        
        // 清空密码输入框
        document.getElementById('settings-current-pwd').value = '';
        document.getElementById('settings-new-pwd').value = '';
        document.getElementById('settings-confirm-pwd').value = '';
    },

    /**
     * 修改密码
     */
    changePassword() {
        const currentPwd = document.getElementById('settings-current-pwd').value;
        const newPwd = document.getElementById('settings-new-pwd').value;
        const confirmPwd = document.getElementById('settings-confirm-pwd').value;
        
        // 基本验证
        if (!currentPwd || !newPwd || !confirmPwd) {
            helpers.showToast('请填写所有密码字段！', 'warning');
            return;
        }
        
        // 检查新密码和确认密码是否一致
        if (newPwd !== confirmPwd) {
            helpers.showToast('两次输入的新密码不一致！', 'error');
            return;
        }
        
        // 宽松的新密码长度验证（至少1位）
        if (newPwd.length < 1) {
            helpers.showToast('新密码不能为空！', 'warning');
            return;
        }
        
        const user = auth.getCurrentUser();
        const teacher = db.findTeacher(user.id);
        
        if (!teacher) {
            helpers.showToast('教师信息不存在！', 'error');
            return;
        }
        
        // 验证当前密码
        if (!helpers.verifyPassword(currentPwd, teacher.pwd)) {
            helpers.showToast('当前密码错误！', 'error');
            return;
        }
        
        // 更新密码
        teacher.pwd = helpers.hash(newPwd);
        db.save();
        
        // 清空输入框
        document.getElementById('settings-current-pwd').value = '';
        document.getElementById('settings-new-pwd').value = '';
        document.getElementById('settings-confirm-pwd').value = '';
        
        helpers.showToast('密码修改成功！请使用新密码重新登录。', 'success');
    },

    /**
     * 渲染学情统计
     */
    renderStats() {
        const user = auth.getCurrentUser();
        const logs = db.getLearningLogsByTeacher(user.id);
        const dateFilter = document.getElementById('export-date-range').value;
        const today = helpers.getTodayDate();
        
        let filteredLogs = logs;
        if (dateFilter === 'today') {
            filteredLogs = logs.filter(l => l.date === today);
        } else if (dateFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filteredLogs = logs.filter(l => new Date(l.date) >= weekAgo);
        }

        document.getElementById('stats-total-count').innerText = `共 ${filteredLogs.length} 条记录`;

        const tbody = document.getElementById('teacher-stats-tbody');
        tbody.innerHTML = '';

        if (filteredLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">该时间段内暂无学情数据</td></tr>';
            return;
        }

        filteredLogs.forEach(log => {
            const student = db.findStudent(log.studentId);
            if (!student) return;

            const row = document.createElement('tr');
            row.className = 'hover:bg-white/10 transition border-b border-white/10';
            row.innerHTML = `
                <td class="py-3 px-4">${log.date}</td>
                <td class="py-3 px-4">${student.class}</td>
                <td class="py-3 px-4 font-medium">${student.name}</td>
                <td class="py-3 px-4 text-indigo-400 font-medium">+${log.learnedCount || 0}</td>
                <td class="py-3 px-4">${log.reviewCount || 0}</td>
                <td class="py-3 px-4 ${log.correctRate >= 80 ? 'text-emerald-400' : 'text-rose-400'} font-medium">${log.correctRate || 0}%</td>
                <td class="py-3 px-4 text-rose-400">${log.weakWord || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    },

    /**
     * 渲染学生列表
     */
    renderStudents() {
        const user = auth.getCurrentUser();
        if (!user) {
            console.warn('renderStudents: No current user');
            return;
        }
        
        const students = db.getStudentsByTeacher(user.id);
        console.log('renderStudents:', { teacherId: user.id, studentCount: students.length, students: students.map(s => ({ id: s.id, name: s.name })) });
        
        const countEl = document.getElementById('teacher-student-count');
        if (countEl) {
            countEl.innerText = students.length;
            console.log('Updated student count to:', students.length);
        } else {
            console.warn('teacher-student-count element not found');
        }

        const grid = document.getElementById('teacher-students-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (students.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-8">暂无学生，请添加学生名单</div>';
            return;
        }

        const isBatchMode = this._batchDeleteMode;
        const selectedIds = this._selectedStudentsForDelete || [];

        students.forEach(student => {
            const card = document.createElement('div');
            const isSelected = selectedIds.includes(student.id);
            
            if (isBatchMode) {
                card.className = `p-4 border rounded-xl flex justify-between items-center transition cursor-pointer ${isSelected ? 'bg-rose-500/20 border-rose-500/50' : 'bg-slate-700/50 border-white/10 hover:bg-slate-600/50'}`;
                card.onclick = () => this.toggleStudentSelection(student.id);
            } else {
                card.className = 'p-4 border border-white/10 rounded-xl bg-slate-700/50 flex justify-between items-center hover:bg-slate-600/50 hover:shadow-lg transition cursor-pointer';
                card.onclick = () => this.viewStudentDetail(student.id);
            }
            
            card.innerHTML = `
                ${isBatchMode ? `
                    <div class="mr-3">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} class="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 pointer-events-none">
                    </div>
                ` : ''}
                <div class="flex-1">
                    <span class="font-bold text-white">${student.name}</span>
                    <div class="text-xs text-slate-400">${student.class}</div>
                </div>
                <div class="text-right mr-3">
                    <div class="text-xs text-yellow-400">
                        <i class="fa-solid fa-coins mr-1"></i>${student.coins || 0}
                    </div>
                    <div class="text-xs text-slate-400 mt-1">已学: ${student.totalLearned || 0}</div>
                </div>
                ${!isBatchMode ? `
                    <div class="flex space-x-1">
                        <button onclick="event.stopPropagation(); teacher.editStudent('${student.id}')" class="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/20 transition" title="编辑">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="event.stopPropagation(); teacher.deleteStudent('${student.id}')" class="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/20 transition" title="删除">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            `;
            grid.appendChild(card);
        });
    },

    /**
     * 切换批量删除模式
     */
    toggleBatchDeleteMode() {
        this._batchDeleteMode = !this._batchDeleteMode;
        this._selectedStudentsForDelete = [];
        
        const batchBar = document.getElementById('batch-delete-bar');
        const btn = document.getElementById('btn-batch-delete');
        
        if (this._batchDeleteMode) {
            batchBar?.classList.remove('hidden');
            if (btn) {
                btn.classList.remove('from-rose-500', 'to-pink-600');
                btn.classList.add('from-slate-500', 'to-slate-600');
                btn.innerHTML = '<i class="fa-solid fa-xmark mr-2"></i>退出批量';
            }
        } else {
            batchBar?.classList.add('hidden');
            if (btn) {
                btn.classList.remove('from-slate-500', 'to-slate-600');
                btn.classList.add('from-rose-500', 'to-pink-600');
                btn.innerHTML = '<i class="fa-solid fa-trash-can mr-2"></i>批量删除';
            }
        }
        
        this.renderStudents();
    },

    /**
     * 取消批量删除
     */
    cancelBatchDelete() {
        this._batchDeleteMode = false;
        this._selectedStudentsForDelete = [];
        
        const batchBar = document.getElementById('batch-delete-bar');
        const btn = document.getElementById('btn-batch-delete');
        const selectAllCheckbox = document.getElementById('select-all-students');
        
        batchBar?.classList.add('hidden');
        if (btn) {
            btn.classList.remove('from-slate-500', 'to-slate-600');
            btn.classList.add('from-rose-500', 'to-pink-600');
            btn.innerHTML = '<i class="fa-solid fa-trash-can mr-2"></i>批量删除';
        }
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        
        this.updateSelectedStudentsCount();
        this.renderStudents();
    },

    /**
     * 全选/取消全选学生
     */
    toggleSelectAllStudents(checked) {
        const user = auth.getCurrentUser();
        const students = db.getStudentsByTeacher(user.id);
        
        if (checked) {
            this._selectedStudentsForDelete = students.map(s => s.id);
        } else {
            this._selectedStudentsForDelete = [];
        }
        
        this.updateSelectedStudentsCount();
        this.renderStudents();
    },

    /**
     * 切换单个学生选择
     */
    toggleStudentSelection(studentId) {
        const index = this._selectedStudentsForDelete.indexOf(studentId);
        if (index > -1) {
            this._selectedStudentsForDelete.splice(index, 1);
        } else {
            this._selectedStudentsForDelete.push(studentId);
        }
        
        this.updateSelectedStudentsCount();
        this.updateSelectAllCheckbox();
    },

    /**
     * 更新已选择学生数量显示
     */
    updateSelectedStudentsCount() {
        const countEl = document.getElementById('selected-students-count');
        if (countEl) {
            countEl.innerText = `已选择 ${this._selectedStudentsForDelete?.length || 0} 人`;
        }
    },

    /**
     * 更新全选复选框状态
     */
    updateSelectAllCheckbox() {
        const user = auth.getCurrentUser();
        const students = db.getStudentsByTeacher(user.id);
        const selectAllCheckbox = document.getElementById('select-all-students');
        
        if (selectAllCheckbox && students.length > 0) {
            selectAllCheckbox.checked = this._selectedStudentsForDelete?.length === students.length;
        }
    },

    /**
     * 确认批量删除
     */
    confirmBatchDelete() {
        const count = this._selectedStudentsForDelete?.length || 0;
        if (count === 0) {
            helpers.showToast('请先选择要删除的学生！', 'warning');
            return;
        }
        
        if (confirm(`确定要删除选中的 ${count} 名学生吗？此操作不可恢复！`)) {
            let deleted = 0;
            this._selectedStudentsForDelete.forEach(studentId => {
                // 删除学生
                const index = db._data.students.findIndex(s => s.id === studentId);
                if (index > -1) {
                    const student = db._data.students[index];
                    // 删除学生的学习日志
                    db._data.learningLogs = db._data.learningLogs.filter(l => l.studentId !== studentId);
                    // 删除学生的记忆状态
                    delete db._data.studentStates[studentId];
                    // 删除学生
                    db._data.students.splice(index, 1);
                    deleted++;
                }
            });
            
            db.save();
            
            helpers.showToast(`已成功删除 ${deleted} 名学生！`, 'success');
            this.cancelBatchDelete();
            this.renderStudents();
        }
    },

    /**
     * 查看学生详情
     */
    viewStudentDetail(studentId) {
        this.currentDetailStudentId = studentId;
        const student = db.findStudent(studentId);
        if (!student) return;
        
        const logs = db.getLearningLogsByStudent(studentId);
        
        // 填充基本信息
        document.getElementById('student-detail-name').innerText = student.name;
        document.getElementById('student-detail-class').innerText = `班级: ${student.class}`;
        document.getElementById('student-detail-coins').innerText = student.coins;
        document.getElementById('student-detail-learned').innerText = student.totalLearned;
        document.getElementById('student-detail-streak').innerText = student.streak + '天';
        
        // 计算正确率
        const accuracy = student.totalQuestions > 0 
            ? Math.round((student.totalCorrect / student.totalQuestions) * 100)
            : 0;
        document.getElementById('student-detail-accuracy').innerText = accuracy + '%';
        
        // 渲染学习记录
        const logsContainer = document.getElementById('student-detail-logs');
        logsContainer.innerHTML = '';
        
        if (logs.length === 0) {
            logsContainer.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">暂无学习记录</td></tr>';
        } else {
            logs.slice(0, 20).forEach(log => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-50';
                const typeText = log.taskType === 'test' ? '检测' : '学习';
                const typeClass = log.taskType === 'test' ? 'text-rose-600' : 'text-indigo-600';
                row.innerHTML = `
                    <td class="p-3 border-b">${log.date}</td>
                    <td class="p-3 border-b ${typeClass}">${typeText}</td>
                    <td class="p-3 border-b">${log.learnedCount > 0 ? '+' + log.learnedCount : log.reviewCount}</td>
                    <td class="p-3 border-b ${log.correctRate >= 80 ? 'text-emerald-600' : log.correctRate >= 60 ? 'text-amber-600' : 'text-rose-600'}">${log.correctRate}%</td>
                    <td class="p-3 border-b text-rose-500">${log.weakWord}</td>
                `;
                logsContainer.appendChild(row);
            });
        }
        
        // 显示模态框
        const modal = document.getElementById('modal-student-detail');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭学生详情
     */
    closeStudentDetail() {
        const modal = document.getElementById('modal-student-detail');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            this.currentDetailStudentId = null;
        }, 300);
    },

    /**
     * 从详情页编辑学生
     */
    editStudentFromDetail() {
        if (this.currentDetailStudentId) {
            this.closeStudentDetail();
            setTimeout(() => this.editStudent(this.currentDetailStudentId), 300);
        }
    },

    /**
     * 编辑学生
     */
    editStudent(studentId) {
        this.currentStudentId = studentId;
        const student = db.findStudent(studentId);
        if (!student) return;
        
        document.getElementById('edit-student-id').value = studentId;
        document.getElementById('edit-student-name').value = student.name;
        document.getElementById('edit-student-class').value = student.class;
        
        const modal = document.getElementById('modal-edit-student');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 隐藏编辑学生模态框
     */
    hideEditStudentModal() {
        const modal = document.getElementById('modal-edit-student');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            this.currentStudentId = null;
        }, 300);
    },

    /**
     * 保存编辑的学生
     */
    saveEditStudent() {
        if (!this.currentStudentId) return;
        
        const name = document.getElementById('edit-student-name').value.trim();
        const className = document.getElementById('edit-student-class').value.trim();
        
        if (!name || !className) {
            helpers.showToast('请填写完整信息！', 'warning');
            return;
        }
        
        const student = db.findStudent(this.currentStudentId);
        if (student) {
            student.name = name;
            student.class = className;
            db.save();
        }
        
        this.hideEditStudentModal();
        this.renderStudents();
        helpers.showToast('学生信息更新成功！', 'success');
    },

    /**
     * 删除当前编辑的学生
     */
    deleteCurrentStudent() {
        if (!this.currentStudentId) return;
        this.deleteStudent(this.currentStudentId);
        this.hideEditStudentModal();
    },

    /**
     * 删除学生
     */
    deleteStudent(studentId) {
        const student = db.findStudent(studentId);
        if (!student) return;
        
        if (!confirm(`确定要删除学生 "${student.name}" 吗？此操作不可恢复！`)) {
            return;
        }
        
        // 删除学生
        db._data.students = db._data.students.filter(s => s.id !== studentId);
        // 删除学生的学习日志
        db._data.learningLogs = db._data.learningLogs.filter(l => l.studentId !== studentId);
        // 删除学生的记忆状态
        delete db._data.studentStates[studentId];
        
        db.save();
        
        this.renderStudents();
        helpers.showToast('学生已删除！', 'success');
    },

    /**
     * 渲染词表列表
     */
    renderWordlists() {
        const user = auth.getCurrentUser();
        const wordlists = db.getWordListsByTeacher(user.id);
        
        // 分离教材词表和课外词表
        const textbookWordlists = wordlists.filter(wl => wl.type === '教材');
        const extraWordlists = wordlists.filter(wl => wl.type !== '教材');
        
        // 更新统计
        document.getElementById('teacher-wordlist-count').innerText = wordlists.length;

        // 渲染教材词表
        this.renderTextbookWordlists(textbookWordlists);

        // 渲染课外词表
        const container = document.getElementById('teacher-wordlists');
        container.innerHTML = '';

        if (extraWordlists.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-400 py-4">暂无词表，请新建或导入词表</div>';
            return;
        }

        extraWordlists.forEach(wl => {
            const item = this.createWordlistItem(wl, false);
            container.appendChild(item);
        });
    },

    /**
     * 渲染教材词表列表（支持折叠）
     */
    renderTextbookWordlists(textbookWordlists) {
        const countSpan = document.getElementById('textbook-wordlist-count');
        const container = document.getElementById('teacher-textbook-wordlists-container');
        const expandBtn = document.getElementById('textbook-expand-btn');
        
        if (countSpan) countSpan.textContent = textbookWordlists.length;
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (textbookWordlists.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-400 py-8"><i class="fa-solid fa-book-open text-3xl mb-2 opacity-50"></i><p>暂无关联的教材词表</p><p class="text-xs mt-1">点击右上角按钮关联教材</p></div>';
            if (expandBtn) expandBtn.classList.add('hidden');
            return;
        }
        
        // 存储完整列表用于展开/收起
        this._textbookWordlists = textbookWordlists;
        
        // 默认显示前5个，超过则显示展开按钮
        const displayLimit = 5;
        const displayList = textbookWordlists.slice(0, displayLimit);
        const hasMore = textbookWordlists.length > displayLimit;
        
        displayList.forEach(wl => {
            const item = this.createTextbookWordlistItem(wl);
            container.appendChild(item);
        });
        
        // 显示/隐藏展开按钮
        if (expandBtn) {
            expandBtn.classList.toggle('hidden', !hasMore);
        }
        
        // 重置展开状态
        this._textbookExpanded = false;
        this.updateExpandButton();
    },

    /**
     * 切换教材词表展开/收起
     */
    toggleTextbookWordlists() {
        const container = document.getElementById('teacher-textbook-wordlists-container');
        if (!container || !this._textbookWordlists) return;
        
        this._textbookExpanded = !this._textbookExpanded;
        
        container.innerHTML = '';
        
        if (this._textbookExpanded) {
            // 展开：显示所有
            this._textbookWordlists.forEach(wl => {
                const item = this.createTextbookWordlistItem(wl);
                container.appendChild(item);
            });
        } else {
            // 收起：只显示前5个
            this._textbookWordlists.slice(0, 5).forEach(wl => {
                const item = this.createTextbookWordlistItem(wl);
                container.appendChild(item);
            });
        }
        
        this.updateExpandButton();
    },

    /**
     * 更新展开按钮状态
     */
    updateExpandButton() {
        const textSpan = document.getElementById('textbook-expand-text');
        const icon = document.getElementById('textbook-expand-icon');
        
        if (textSpan) {
            textSpan.textContent = this._textbookExpanded ? '收起' : `展开更多 (${this._textbookWordlists.length - 5})`;
        }
        if (icon) {
            icon.className = this._textbookExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        }
    },

    /**
     * 创建教材词表项DOM（带取消关联功能）
     */
    /**
     * 格式化词表标题 - 将数字或字母转换为"第X单元"或"X单元"
     */
    formatWordlistTitle(title) {
        if (!title) return '';
        
        // 检查是否已经是"第X单元"或"X单元"格式
        if (title.includes('单元')) {
            return title;
        }
        
        // 匹配末尾的数字，转换为"第X单元"
        // 例如："外研版 七年级上册 5" -> "外研版 七年级上册 第5单元"
        let result = title.replace(/\s+(\d+)$/, (match, num) => {
            return ` 第${num}单元`;
        });
        
        // 匹配末尾的字母（如S），转换为"X单元"
        // 例如："外研版 七年级上册 S" -> "外研版 七年级上册 S单元"
        result = result.replace(/\s+([A-Za-z])$/, (match, letter) => {
            return ` ${letter.toUpperCase()}单元`;
        });
        
        // 匹配 Unit X 格式
        result = result.replace(/\s+Unit\s*(\d+)$/i, (match, num) => {
            return ` 第${num}单元`;
        });
        
        return result;
    },

    createTextbookWordlistItem(wl) {
        const item = document.createElement('div');
        item.className = 'group p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 transition-all flex justify-between items-center';
        
        // Use helper function for consistent formatting
        const formattedTitle = helpers.formatFullWordlistTitle(wl);
        
        // Construct subtitle
        const subtitleParts = [wl.textbook, wl.grade, wl.volume].filter(Boolean);
        const subtitle = subtitleParts.join(' · ');

        item.innerHTML = `
            <div class="flex-1 cursor-pointer" onclick="teacher.editWordlist('${wl.id}')">
                <div class="flex items-center gap-3 mb-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">教材</span>
                    <span class="font-medium text-white text-sm">${formattedTitle}</span>
                </div>
                <div class="flex items-center text-xs text-slate-400 gap-2">
                    <span>${subtitle}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>${wl.words.length} 词</span>
                </div>
            </div>
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="event.stopPropagation(); teacher.triggerAI('${wl.id}')" 
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all" 
                    title="AI生成题目">
                    <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                </button>
                <button onclick="event.stopPropagation(); teacher.editWordlist('${wl.id}')" 
                    class="w-8 h-8 rounded-lg bg-slate-700 text-amber-400 hover:bg-slate-600 border border-white/10 flex items-center justify-center transition-all" 
                    title="编辑词表">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button onclick="event.stopPropagation(); teacher.deleteWordlist('${wl.id}')" 
                    class="w-8 h-8 rounded-lg bg-slate-700 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/30 border border-white/10 flex items-center justify-center transition-all" 
                    title="删除词表">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>
        `;
        return item;
    },

    /**
     * 取消关联教材词表
     */
    unlinkTextbookWordlist(wordlistId) {
        if (!confirm('确定要取消关联这个词表吗？取消后可以在"关联教材词表"中重新关联。')) {
            return;
        }
        
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }
        
        // 从数据库删除
        db.deleteWordList(wordlistId);
        
        // 重新渲染教材词表列表
        const user = auth.getCurrentUser();
        const wordlists = db.getWordListsByTeacher(user.id);
        const textbookWordlists = wordlists.filter(wl => wl.type === '教材');
        this.renderTextbookWordlists(textbookWordlists);
        
        helpers.showToast('已取消关联', 'success');
    },

    /**
     * 创建词表项DOM
     */
    createWordlistItem(wl, isTextbook) {
        const tagClass = wl.type === '教材' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-purple-500/20 text-purple-300';
        // 构建副标题信息
        let subtitle = '';
        if (wl.textbook || wl.grade || wl.volume || wl.unit) {
            const parts = [];
            if (wl.textbook) parts.push(wl.textbook);
            if (wl.grade) parts.push(wl.grade);
            if (wl.volume) parts.push(wl.volume);
            if (wl.unit) parts.push(helpers.formatUnitLabel(wl.unit));
            subtitle = parts.join(' ');
        }
        
        const item = document.createElement('div');
        item.className = 'p-4 border border-white/10 rounded-xl bg-slate-700/30 flex justify-between items-center hover:bg-slate-600/30 transition';
        item.innerHTML = `
            <div class="flex-1 cursor-pointer" onclick="teacher.editWordlist('${wl.id}')">
                <div class="flex items-center">
                    <span class="px-2 py-1 rounded text-xs ${tagClass}">${wl.type}</span>
                    <span class="font-medium text-white ml-3">${wl.title}</span>
                </div>
                ${subtitle ? `<div class="text-xs text-slate-400 mt-1">${subtitle} · ${wl.words.length}词</div>` : `<span class="text-xs text-slate-500 ml-2">(${wl.words.length}词)</span>`}
            </div>
            <div class="flex space-x-2">
                <button onclick="teacher.editWordlist('${wl.id}')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/20 transition" title="编辑">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="teacher.triggerAI('${wl.id}')" class="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-lg hover:shadow-lg transition">
                    <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>AI生成
                </button>
            </div>
        `;
        return item;
    },

    /**
     * 渲染任务列表
     */
    renderTasks() {
        const user = auth.getCurrentUser();
        const tasks = db.getTasksByTeacher(user.id);
        
        document.getElementById('teacher-task-count').innerText = tasks.filter(t => t.status === 'active').length;

        const container = document.getElementById('published-tasks');
        container.innerHTML = '';

        if (tasks.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-400 py-4">暂无已发布任务</div>';
            return;
        }

        tasks.forEach(task => {
            const iconClass = task.type === 'test' ? 'fa-puzzle-piece text-rose-400' : 'fa-layer-group text-indigo-400';
            
            // 状态标签
            let statusText = '进行中';
            let statusClass = 'bg-emerald-500/20 text-emerald-300';
            if (task.status === 'paused') {
                statusText = '已暂停';
                statusClass = 'bg-amber-500/20 text-amber-300';
            } else if (task.status === 'completed') {
                statusText = '已完成';
                statusClass = 'bg-slate-500/20 text-slate-300';
            }
            
            const item = document.createElement('div');
            item.className = 'p-4 border border-white/10 rounded-xl bg-slate-700/30 flex justify-between items-center hover:bg-slate-600/30 transition';
            item.innerHTML = `
                <div class="flex items-center">
                    <i class="fa-solid ${iconClass} text-xl mr-3"></i>
                    <div>
                        <div class="font-medium text-white">${task.title}</div>
                        <div class="text-xs text-slate-400 mt-1">
                            ${task.wordListTitle || '词表'} · ${task.assignedStudents?.length || 0}人
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="px-2 py-1 rounded text-xs ${statusClass}">${statusText}</span>
                    <button onclick="teacher.editTask('${task.id}')" class="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/20 transition">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    },

    /**
     * 编辑任务
     */
    editTask(taskId) {
        const task = db._data.tasks.find(t => t.id === taskId);
        
        if (!task) {
            helpers.showToast('任务不存在！', 'error');
            return;
        }
        
        this.currentEditTaskId = taskId;
        
        // 获取DOM元素
        const titleInput = document.getElementById('edit-task-title');
        const statusInput = document.getElementById('edit-task-status');
        const modal = document.getElementById('modal-edit-task');
        
        if (titleInput) titleInput.value = task.title || '';
        if (statusInput) statusInput.value = task.status || 'active';
        
        // 设置任务类型复选框 - 默认自动勾选学习任务和检测任务
        const taskTypes = task.taskTypes || [task.type] || ['learn', 'test'];
        const typeCheckboxes = document.querySelectorAll('input[name="edit-task-type"]');
        typeCheckboxes.forEach(cb => {
            // 如果是学习任务或检测任务，默认勾选
            if (cb.value === 'learn' || cb.value === 'test') {
                cb.checked = true;
            } else {
                cb.checked = taskTypes.includes(cb.value);
            }
        });
        
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
        } else {
            helpers.showToast('系统错误：模态框不存在', 'error');
        }
    },

    /**
     * 隐藏编辑任务模态框
     */
    hideEditTaskModal() {
        const modal = document.getElementById('modal-edit-task');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            this.currentEditTaskId = null;
        }, 300);
    },

    /**
     * 保存编辑的任务
     */
    saveEditTask() {
        if (!this.currentEditTaskId) {
            helpers.showToast('没有正在编辑的任务！', 'error');
            return;
        }
        
        const title = document.getElementById('edit-task-title').value.trim();
        const status = document.getElementById('edit-task-status').value;
        
        // 获取选中的任务类型（多选）
        const typeCheckboxes = document.querySelectorAll('input[name="edit-task-type"]:checked');
        const taskTypes = Array.from(typeCheckboxes).map(cb => cb.value);
        
        if (!title) {
            helpers.showToast('请填写任务名称！', 'warning');
            return;
        }
        
        if (taskTypes.length === 0) {
            helpers.showToast('请至少选择一种任务类型', 'warning');
            return;
        }
        
        const task = db._data.tasks.find(t => t.id === this.currentEditTaskId);
        if (task) {
            task.title = title;
            task.type = taskTypes.length > 1 ? 'mixed' : taskTypes[0];
            task.taskTypes = taskTypes;
            task.status = status;
            db.save();
        }
        
        this.hideEditTaskModal();
        this.renderTasks();
        helpers.showToast('任务更新成功！', 'success');
    },

    /**
     * 删除当前任务
     */
    deleteCurrentTask() {
        if (!this.currentEditTaskId) {
            helpers.showToast('没有正在编辑的任务！', 'error');
            return;
        }
        
        const task = db._data.tasks.find(t => t.id === this.currentEditTaskId);
        if (!task) {
            helpers.showToast('任务不存在！', 'error');
            return;
        }
        
        if (confirm(`确定要删除任务"${task.title}"吗？此操作不可恢复！`)) {
            // 删除任务
            const index = db._data.tasks.findIndex(t => t.id === this.currentEditTaskId);
            if (index !== -1) {
                db._data.tasks.splice(index, 1);
                db.save();
            }
            
            this.hideEditTaskModal();
            this.renderTasks();
            helpers.showToast('任务已删除！', 'success');
        }
    },

    /**
     * 撤回当前任务
     */
    withdrawCurrentTask() {
        if (!this.currentEditTaskId) return;
        
        if (confirm('确定要撤回这个任务吗？学生将无法看到这个任务。')) {
            const task = db._data.tasks.find(t => t.id === this.currentEditTaskId);
            if (task) {
                task.status = 'withdrawn';
                db.save();
            }
            
            this.hideEditTaskModal();
            this.renderTasks();
            helpers.showToast('任务已撤回！', 'success');
        }
    },

    /**
     * 删除当前任务
     */
    deleteCurrentTask() {
        if (!this.currentEditTaskId) return;
        
        if (confirm('确定要删除这个任务吗？删除后无法恢复！')) {
            const taskIndex = db._data.tasks.findIndex(t => t.id === this.currentEditTaskId);
            if (taskIndex > -1) {
                db._data.tasks.splice(taskIndex, 1);
                db.save();
            }
            
            this.hideEditTaskModal();
            this.renderTasks();
            helpers.showToast('任务已删除！', 'success');
        }
    },

    /**
     * 教材词表 - 教材选择变化
     * 从数据库中获取教务处设置的词表数据
     */
    onTextbookChange() {
        const textbook = document.getElementById('textbook-textbook').value;
        const gradeSelect = document.getElementById('textbook-grade');
        const volumeSelect = document.getElementById('textbook-volume');
        const unitsContainer = document.getElementById('textbook-units');
        
        // 重置后续选择
        this.selectedTextbookUnits = [];
        this.updateSelectedWordsPreview();
        
        if (!textbook) {
            gradeSelect.disabled = true;
            gradeSelect.innerHTML = '<option value="">请先选择教材</option>';
            volumeSelect.disabled = true;
            volumeSelect.innerHTML = '<option value="">请先选择年级</option>';
            unitsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">请先选择册别</p>';
            return;
        }
        
        // 从数据库获取该教材的所有词表
        const allWordlists = db.getWordLists().filter(wl => wl.type === '教材' && wl.textbook === textbook);
        
        // 提取可用的年级
        const grades = [...new Set(allWordlists.map(wl => wl.grade).filter(g => g))];
        
        // 启用年级选择
        gradeSelect.disabled = false;
        gradeSelect.innerHTML = '<option value="">请选择年级</option>';
        
        if (grades.length === 0) {
            gradeSelect.innerHTML += '<option value="" disabled>该教材暂无数据</option>';
        } else {
            grades.sort().forEach(grade => {
                gradeSelect.innerHTML += `<option value="${grade}">${grade}</option>`;
            });
        }
        
        volumeSelect.disabled = true;
        volumeSelect.innerHTML = '<option value="">请先选择年级</option>';
        unitsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">请先选择册别</p>';
    },

    /**
     * 教材词表 - 年级选择变化
     * 从数据库中获取该教材+年级下的册别
     */
    onGradeChange() {
        const textbook = document.getElementById('textbook-textbook').value;
        const grade = document.getElementById('textbook-grade').value;
        const volumeSelect = document.getElementById('textbook-volume');
        const unitsContainer = document.getElementById('textbook-units');
        
        this.selectedTextbookUnits = [];
        this.updateSelectedWordsPreview();
        
        if (!grade) {
            volumeSelect.disabled = true;
            volumeSelect.innerHTML = '<option value="">请先选择年级</option>';
            unitsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">请先选择册别</p>';
            return;
        }
        
        // 从数据库获取该教材+年级下的册别
        const allWordlists = db.getWordLists().filter(wl => 
            wl.type === '教材' && wl.textbook === textbook && wl.grade === grade
        );
        const volumes = [...new Set(allWordlists.map(wl => wl.volume).filter(v => v))];
        
        // 启用册别选择
        volumeSelect.disabled = false;
        volumeSelect.innerHTML = '<option value="">请选择册别</option>';
        
        if (volumes.length === 0) {
            volumeSelect.innerHTML += '<option value="" disabled>该年级暂无数据</option>';
        } else {
            volumes.sort().forEach(volume => {
                volumeSelect.innerHTML += `<option value="${volume}">${volume}</option>`;
            });
        }
        
        unitsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">请先选择册别</p>';
    },

    /**
     * 教材词表 - 册别选择变化
     * 从数据库中获取该教材+年级+册别下的单元
     */
    onVolumeChange() {
        const textbook = document.getElementById('textbook-textbook').value;
        const grade = document.getElementById('textbook-grade').value;
        const volume = document.getElementById('textbook-volume').value;
        const unitsContainer = document.getElementById('textbook-units');
        
        this.selectedTextbookUnits = [];
        this.updateSelectedWordsPreview();
        
        if (!textbook || !grade || !volume) {
            unitsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">请先选择教材、年级和册别</p>';
            return;
        }
        
        // 从数据库获取该教材+年级+册别下的所有词表
        const wordlists = db.getWordLists().filter(wl => 
            wl.type === '教材' && 
            wl.textbook === textbook && 
            wl.grade === grade && 
            wl.volume === volume
        );
        
        if (wordlists.length === 0) {
            unitsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">该教材暂无数据</p>';
            return;
        }
        
        // 按单元排序
        wordlists.sort((a, b) => {
            // 尝试按数字排序
            const numA = parseInt(a.unit);
            const numB = parseInt(b.unit);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return (a.unit || '').localeCompare(b.unit || '');
        });
        
        unitsContainer.innerHTML = '';
        
        // 添加全选按钮
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'flex space-x-2 mb-2 pb-2 border-b';
        selectAllDiv.innerHTML = `
            <button onclick="teacher.selectAllUnits()" class="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition">
                <i class="fa-solid fa-check-double mr-1"></i>全选
            </button>
            <button onclick="teacher.deselectAllUnits()" class="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition">
                <i class="fa-solid fa-xmark mr-1"></i>取消全选
            </button>
        `;
        unitsContainer.appendChild(selectAllDiv);
        
        // 存储当前可用的词表供后续使用
        this.currentTextbookWordlists = wordlists;
        
        wordlists.forEach(wl => {
            const unitName = helpers.formatUnitLabel(wl.unit || '') || '未命名单元';
            const label = document.createElement('label');
            label.className = 'flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer';
            label.innerHTML = `
                <input type="checkbox" value="${wl.id}" onchange="teacher.toggleUnit('${wl.id}')" 
                    class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mr-3">
                <div class="flex-1">
                    <span class="font-medium text-sm">${unitName}</span>
                    <span class="text-xs text-slate-400 ml-2">(${wl.words?.length || 0}词)</span>
                </div>
            `;
            unitsContainer.appendChild(label);
        });
    },

    /**
     * 切换单元选择
     */
    toggleUnit(unit) {
        const index = this.selectedTextbookUnits.indexOf(unit);
        if (index > -1) {
            this.selectedTextbookUnits.splice(index, 1);
        } else {
            this.selectedTextbookUnits.push(unit);
        }
        this.updateSelectedWordsPreview();
    },

    /**
     * 全选单元
     */
    selectAllUnits() {
        if (!this.currentTextbookWordlists || this.currentTextbookWordlists.length === 0) return;
        
        // 选中所有当前显示的词表ID
        this.selectedTextbookUnits = this.currentTextbookWordlists.map(wl => wl.id);
        
        // 更新checkbox状态
        const checkboxes = document.querySelectorAll('#textbook-units input[type="checkbox"]');
        checkboxes.forEach(cb => {
            if (cb.value) cb.checked = true;
        });
        
        this.updateSelectedWordsPreview();
    },

    /**
     * 取消全选
     */
    deselectAllUnits() {
        this.selectedTextbookUnits = [];
        
        const checkboxes = document.querySelectorAll('#textbook-units input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        this.updateSelectedWordsPreview();
    },

    /**
     * 更新已选单词预览
     * 从数据库中获取选中词表的单词
     */
    updateSelectedWordsPreview() {
        const previewContainer = document.getElementById('selected-words-preview');
        const countSpan = document.getElementById('selected-words-count');
        
        if (!this.currentTextbookWordlists || this.selectedTextbookUnits.length === 0) {
            previewContainer.innerText = '请选择单元查看单词';
            countSpan.innerText = '(0个)';
            return;
        }
        
        let allWords = [];
        this.selectedTextbookUnits.forEach(wordlistId => {
            const wordlist = this.currentTextbookWordlists.find(wl => wl.id === wordlistId);
            if (wordlist && wordlist.words) {
                allWords = allWords.concat(wordlist.words);
            }
        });
        
        // 去重
        allWords = [...new Set(allWords)];
        
        countSpan.innerText = `(${allWords.length}个)`;
        
        if (allWords.length > 0) {
            previewContainer.innerHTML = allWords.slice(0, 30).join(', ') + 
                (allWords.length > 30 ? ` ...等${allWords.length}个单词` : '');
        } else {
            previewContainer.innerText = '所选单元暂无单词';
        }
    },

    /**
     * 创建教材词表
     * 从数据库中合并选中的词表
     */
    createTextbookWordlist() {
        const textbook = document.getElementById('textbook-textbook').value;
        const grade = document.getElementById('textbook-grade').value;
        const volume = document.getElementById('textbook-volume').value;
        
        if (!textbook) {
            helpers.showToast('请先选择教材！', 'warning');
            return;
        }
        
        if (!grade) {
            helpers.showToast('请先选择年级！', 'warning');
            return;
        }
        
        if (!volume) {
            helpers.showToast('请先选择册别！', 'warning');
            return;
        }
        
        if (this.selectedTextbookUnits.length === 0) {
            helpers.showToast('请至少选择一个单元！', 'warning');
            return;
        }
        
        if (!this.currentTextbookWordlists) {
            helpers.showToast('数据加载失败，请刷新页面重试！', 'error');
            return;
        }
        
        // 从数据库获取选中的词表并合并单词
        let allWords = [];
        let selectedUnits = [];
        
        this.selectedTextbookUnits.forEach(wordlistId => {
            const wordlist = this.currentTextbookWordlists.find(wl => wl.id === wordlistId);
            if (wordlist && wordlist.words) {
                allWords = allWords.concat(wordlist.words);
                selectedUnits.push(wordlist.unit || '未命名');
            }
        });
        
        // 去重
        allWords = [...new Set(allWords)];
        
        if (allWords.length === 0) {
            helpers.showToast('所选单元暂无单词！', 'warning');
            return;
        }
        
        const user = auth.getCurrentUser();
        
        // 提取单元编号显示
        const unitNumbers = selectedUnits.map(u => u.replace(/^Unit\s*/i, ''));
        const unitDisplay = unitNumbers.length === 1 ? unitNumbers[0] : `${unitNumbers[0]}等`;
        
        db.addWordList({
            teacherId: user.id,
            title: `${textbook} ${grade}${volume} ${unitDisplay}`,
            type: '教材',
            textbook: textbook,
            grade: grade,
            volume: volume,
            unit: unitDisplay,
            words: allWords
        });
        
        // 重置选择
        this.selectedTextbookUnits = [];
        this.currentTextbookWordlists = null;
        document.getElementById('textbook-textbook').value = '';
        document.getElementById('textbook-grade').value = '';
        document.getElementById('textbook-volume').value = '';
        this.onTextbookChange();
        
        this.renderWordlists();
        helpers.showToast(`词表创建成功！共 ${allWords.length} 个单词`, 'success');
    },

    /**
     * 显示导入学生模态框
     */
    showImportModal() {
        const modal = document.getElementById('modal-import');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        
        // 重置导入状态
        this._importedWords = null;
        this._importMode = 'file';
        this.switchImportMode('file');
        
        // 清空文件输入
        const fileInput = document.getElementById('word-excel-file');
        if (fileInput) fileInput.value = '';
        
        // 隐藏预览
        const preview = document.getElementById('word-import-preview');
        if (preview) preview.classList.add('hidden');
    },

    /**
     * 隐藏导入学生模态框
     */
    hideImportModal() {
        const modal = document.getElementById('modal-import');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            // 清理导入数据
            this._importedWords = null;
        }, 300);
    },

    /**
     * 切换导入模式
     */
    switchImportMode(mode) {
        this._importMode = mode;
        
        const fileBtn = document.getElementById('btn-import-file');
        const textBtn = document.getElementById('btn-import-text');
        const fileArea = document.getElementById('import-file-area');
        const textArea = document.getElementById('import-text-area');
        
        if (mode === 'file') {
            fileBtn?.classList.add('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
            fileBtn?.classList.remove('border-slate-200', 'text-slate-600');
            textBtn?.classList.remove('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
            textBtn?.classList.add('border-slate-200', 'text-slate-600');
            fileArea?.classList.remove('hidden');
            textArea?.classList.add('hidden');
        } else {
            textBtn?.classList.add('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
            textBtn?.classList.remove('border-slate-200', 'text-slate-600');
            fileBtn?.classList.remove('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
            fileBtn?.classList.add('border-slate-200', 'text-slate-600');
            textArea?.classList.remove('hidden');
            fileArea?.classList.add('hidden');
        }
    },

    /**
     * 处理单词Excel文件选择
     */
    handleWordFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // 解析数据
                const words = this.parseExcelWords(jsonData);
                
                if (words.length === 0) {
                    helpers.showToast('未找到有效的单词数据', 'warning');
                    return;
                }
                
                this._importedWords = words;
                this.showWordPreview(words);
                helpers.showToast(`成功读取 ${words.length} 个单词`, 'success');
                
            } catch (error) {
                console.error('Excel解析错误:', error);
                helpers.showToast('文件解析失败，请检查文件格式', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    },

    /**
     * 解析Excel单词数据 - 智能识别列
     */
    parseExcelWords(data) {
        const words = [];
        
        if (data.length === 0) return words;
        
        // 获取表头
        const headers = data[0].map(h => String(h || '').trim());
        
        // 查找各列的索引
        const wordIndex = headers.findIndex(h => h.includes('单词') || h.toLowerCase().includes('word'));
        const phoneticIndex = headers.findIndex(h => h.includes('音标') || h.toLowerCase().includes('phonetic'));
        const posIndex = headers.findIndex(h => h.includes('词性') || h.toLowerCase().includes('pos') || h.toLowerCase().includes('part'));
        const meaningIndex = headers.findIndex(h => h.includes('释义') || h.includes('中文') || h.toLowerCase().includes('meaning') || h.toLowerCase().includes('translation'));
        
        // 如果没有找到单词列，默认使用第一列
        const wordColIndex = wordIndex !== -1 ? wordIndex : 0;
        
        // 从第二行开始解析数据
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            const word = String(row[wordColIndex] || '').trim();
            if (!word) continue;
            
            words.push({
                word: word,
                phonetic: phoneticIndex !== -1 ? String(row[phoneticIndex] || '').trim() : '',
                pos: posIndex !== -1 ? String(row[posIndex] || '').trim() : '',
                meaning: meaningIndex !== -1 ? String(row[meaningIndex] || '').trim() : ''
            });
        }
        
        return words;
    },

    /**
     * 显示单词预览
     */
    showWordPreview(words) {
        const preview = document.getElementById('word-import-preview');
        const countSpan = document.getElementById('word-preview-count');
        const tbody = document.getElementById('word-preview-body');
        
        if (!preview || !countSpan || !tbody) return;
        
        countSpan.textContent = words.length;
        
        tbody.innerHTML = words.map(w => `
            <tr class="border-b border-slate-100">
                <td class="px-3 py-2 font-medium">${w.word}</td>
                <td class="px-3 py-2 text-slate-500">${w.phonetic || '-'}</td>
                <td class="px-3 py-2 text-slate-500">${w.pos || '-'}</td>
                <td class="px-3 py-2 text-slate-500">${w.meaning || '-'}</td>
            </tr>
        `).join('');
        
        preview.classList.remove('hidden');
    },

    /**
     * 下载单词导入模板
     */
    downloadWordTemplate() {
        const template = [
            ['单词', '音标', '词性', '中文释义'],
            ['hello', '/həˈləʊ/', 'int.', '你好'],
            ['world', '/wɜːld/', 'n.', '世界'],
            ['apple', '/ˈæpl/', 'n.', '苹果']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '单词列表');
        XLSX.writeFile(wb, '单词导入模板.xlsx');
    },

    /**
     * 保存导入的学生 - 支持多种宽松格式
     */
    saveImportStudents() {
        const text = document.getElementById('import-textarea').value.trim();
        const defaultClass = document.getElementById('import-default-class').value.trim();
        
        if (!text) {
            helpers.showToast('请输入学生信息！', 'warning');
            return;
        }

        const user = auth.getCurrentUser();
        const lines = text.split('\n');
        let added = 0;
        let skipped = 0;
        let errors = [];

        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;

            let className = '';
            let name = '';

            // 尝试多种格式解析
            // 格式1: Tab分隔 (Excel直接复制)
            if (line.includes('\t')) {
                const parts = line.split('\t').map(p => p.trim()).filter(p => p);
                if (parts.length >= 2) {
                    className = parts[0];
                    name = parts[1];
                } else if (parts.length === 1) {
                    name = parts[0];
                }
            }
            // 格式2: 逗号分隔
            else if (line.includes(',')) {
                const parts = line.split(',').map(p => p.trim()).filter(p => p);
                if (parts.length >= 2) {
                    className = parts[0];
                    name = parts[1];
                } else if (parts.length === 1) {
                    name = parts[0];
                }
            }
            // 格式3: 空格分隔 (班级 姓名)
            else if (line.includes(' ')) {
                // 尝试匹配"七年级1班 王小明"这种格式
                const match = line.match(/^(.+?班)\s+(.+)$/);
                if (match) {
                    className = match[1].trim();
                    name = match[2].trim();
                } else {
                    // 简单的空格分割
                    const parts = line.split(/\s+/).map(p => p.trim()).filter(p => p);
                    if (parts.length >= 2) {
                        className = parts[0];
                        name = parts[1];
                    } else if (parts.length === 1) {
                        name = parts[0];
                    }
                }
            }
            // 格式4: 只有姓名
            else {
                name = line;
            }

            // 如果没有解析到班级，使用默认班级
            if (!className && defaultClass) {
                className = defaultClass;
            }

            // 验证
            if (!name) {
                errors.push(`第 ${index + 1} 行: 无法识别学生姓名`);
                return;
            }
            if (!className) {
                errors.push(`第 ${index + 1} 行: ${name} 没有班级信息，请设置默认班级`);
                return;
            }

            // 检查是否已存在
            const existing = db.findStudentByClassAndName(className, name);
            if (existing) {
                skipped++;
            } else {
                db.addStudent({
                    teacherId: user.id,
                    class: className,
                    name: name
                });
                added++;
            }
        });

        this.hideImportModal();
        this.renderStudents();
        
        let msg = `成功录入 ${added} 名学生！`;
        if (skipped > 0) msg += ` (${skipped}名已存在)`;
        if (errors.length > 0) msg += ` (${errors.length}行格式错误)`;
        
        helpers.showToast(msg, added > 0 ? 'success' : errors.length > 0 ? 'warning' : 'info');
    },

    /**
     * 确认导入单词
     */
    confirmImport() {
        const user = auth.getCurrentUser();
        let words = [];
        
        if (this._importMode === 'file' && this._importedWords) {
            // 使用Excel导入的数据
            words = this._importedWords.map(w => w.word);
        } else {
            // 使用文本输入
            const text = document.getElementById('import-textarea')?.value.trim();
            if (text) {
                words = this.parseWordsFromText(text);
            }
        }
        
        if (words.length === 0) {
            helpers.showToast('没有可导入的单词', 'warning');
            return;
        }
        
        // 创建临时词表（不保存到数据库，只在当前会话中使用）
        this._importedWordList = {
            id: 'temp_' + Date.now(),
            teacherId: user.id,
            title: '导入词表_' + helpers.formatDate(new Date()),
            type: '课外',
            words: words,
            isTemporary: true
        };
        
        this.hideImportModal();
        helpers.showToast(`成功导入 ${words.length} 个单词！请创建词表并选择这些单词`, 'success');
        
        // 打开新建词表模态框，并预填充单词
        this.showAddWordlistModalWithWords(words);
    },

    /**
     * 显示新建词表模态框并预填充单词
     */
    showAddWordlistModalWithWords(words) {
        this.showAddWordlistModal();
        const textarea = document.getElementById('new-wordlist-words');
        if (textarea) {
            textarea.value = words.join('\n');
            this.updateWordCount('new-wordlist-words', 'wordlist-word-count');
        }
    },

    /**
     * 显示关联教材词表模态框
     */
    showLinkTextbookModal() {
        const modal = document.getElementById('modal-link-textbook');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        
        // 初始化选择状态
        this._selectedTextbookUnits = [];
        this.updateSelectedUnitsPreview();
        
        this.renderAvailableTextbookWordlists();
    },

    /**
     * 隐藏关联教材词表模态框
     */
    hideLinkTextbookModal() {
        const modal = document.getElementById('modal-link-textbook');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            // 清空选择
            this._selectedTextbookUnits = [];
        }, 300);
    },

    /**
     * 渲染可用的教材词表列表
     */
    renderAvailableTextbookWordlists() {
        const user = auth.getCurrentUser();
        const allWordlists = db.getWordLists();
        const myWordlists = db.getWordListsByTeacher(user.id);
        const myWordlistIds = myWordlists.map(wl => wl.id);
        
        // 获取所有教材类型的词表，且不在我的词表中
        const textbookWordlists = allWordlists.filter(wl => 
            wl.type === '教材' && !myWordlistIds.includes(wl.id)
        );
        
        const container = document.getElementById('available-textbook-wordlists');
        container.innerHTML = '';
        
        if (textbookWordlists.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-400 py-8"><i class="fa-solid fa-check-circle text-3xl mb-2"></i><p>暂无可关联的教材词表</p><p class="text-xs mt-1">您已关联所有可用教材词表</p></div>';
            return;
        }
        
        textbookWordlists.forEach(wl => {
            const item = document.createElement('div');
            item.className = 'p-3 border border-slate-200 rounded-xl bg-white flex items-center hover:border-indigo-300 transition cursor-pointer';
            item.dataset.wordlistId = wl.id;
            
            // 格式化标题
            const formattedTitle = this.formatWordlistTitle(wl.title);
            
            item.onclick = (e) => {
                // 防止点击复选框时触发两次
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                    this.toggleUnitSelection(wl.id, formattedTitle, checkbox.checked);
                }
            };
            
            const isSelected = this._selectedTextbookUnits?.some(u => u.id === wl.id);
            
            item.innerHTML = `
                <input type="checkbox" 
                       class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mr-3 cursor-pointer" 
                       ${isSelected ? 'checked' : ''}
                       onchange="teacher.toggleUnitSelection('${wl.id}', '${formattedTitle}', this.checked)">
                <div class="flex-1">
                    <div class="flex items-center">
                        <span class="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-medium">${wl.textbook || '教材'}</span>
                        <span class="font-medium text-slate-800 ml-2 text-sm">${formattedTitle}</span>
                    </div>
                    <div class="text-xs text-slate-500 mt-0.5">${wl.grade || ''} · ${wl.words.length}词</div>
                </div>
            `;
            container.appendChild(item);
        });
    },

    /**
     * 切换单元选择状态
     */
    toggleUnitSelection(wordlistId, title, isSelected) {
        if (!this._selectedTextbookUnits) {
            this._selectedTextbookUnits = [];
        }
        
        if (isSelected) {
            // 添加到选择列表
            if (!this._selectedTextbookUnits.some(u => u.id === wordlistId)) {
                this._selectedTextbookUnits.push({ id: wordlistId, title: title });
            }
        } else {
            // 从选择列表移除
            this._selectedTextbookUnits = this._selectedTextbookUnits.filter(u => u.id !== wordlistId);
        }
        
        this.updateSelectedUnitsPreview();
    },

    /**
     * 更新已选择单元预览
     */
    updateSelectedUnitsPreview() {
        const previewDiv = document.getElementById('linked-units-preview');
        const countSpan = document.getElementById('selected-count');
        const listDiv = document.getElementById('selected-units-list');
        const confirmBtn = document.getElementById('btn-confirm-link');
        
        const selectedCount = this._selectedTextbookUnits?.length || 0;
        
        if (selectedCount === 0) {
            previewDiv?.classList.add('hidden');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fa-solid fa-link mr-2"></i>确认关联';
            }
            return;
        }
        
        // 显示预览
        previewDiv?.classList.remove('hidden');
        if (countSpan) countSpan.textContent = selectedCount;
        
        // 更新列表
        if (listDiv) {
            listDiv.innerHTML = this._selectedTextbookUnits.map(u => `
                <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">
                    ${u.title}
                    <button onclick="teacher.removeUnitSelection('${u.id}')" class="ml-1 hover:text-emerald-900">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </span>
            `).join('');
        }
        
        // 启用确认按钮
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<i class="fa-solid fa-link mr-2"></i>确认关联 (${selectedCount})`;
        }
    },

    /**
     * 移除单元选择
     */
    removeUnitSelection(wordlistId) {
        this._selectedTextbookUnits = this._selectedTextbookUnits.filter(u => u.id !== wordlistId);
        this.updateSelectedUnitsPreview();
        this.renderAvailableTextbookWordlists(); // 重新渲染以更新复选框状态
    },

    /**
     * 清空所有选择
     */
    clearSelectedUnits() {
        this._selectedTextbookUnits = [];
        this.updateSelectedUnitsPreview();
        this.renderAvailableTextbookWordlists();
    },

    /**
     * 全选所有单元
     */
    selectAllUnits() {
        const user = auth.getCurrentUser();
        const allWordlists = db.getWordLists();
        const myWordlists = db.getWordListsByTeacher(user.id);
        const myWordlistIds = myWordlists.map(wl => wl.id);
        
        const textbookWordlists = allWordlists.filter(wl => 
            wl.type === '教材' && !myWordlistIds.includes(wl.id)
        );
        
        this._selectedTextbookUnits = textbookWordlists.map(wl => ({
            id: wl.id,
            title: wl.title
        }));
        
        this.updateSelectedUnitsPreview();
        this.renderAvailableTextbookWordlists();
    },

    /**
     * 取消全选
     */
    deselectAllUnits() {
        this._selectedTextbookUnits = [];
        this.updateSelectedUnitsPreview();
        this.renderAvailableTextbookWordlists();
    },

    /**
     * 确认关联选中的教材单元
     */
    confirmLinkTextbookUnits() {
        if (!this._selectedTextbookUnits || this._selectedTextbookUnits.length === 0) {
            helpers.showToast('请至少选择一个单元', 'warning');
            return;
        }
        
        const user = auth.getCurrentUser();
        let successCount = 0;
        let failCount = 0;
        
        this._selectedTextbookUnits.forEach(unit => {
            const wordlist = db.findWordList(unit.id);
            if (!wordlist) {
                failCount++;
                return;
            }
            
            // 创建关联副本
            db.addWordList({
                teacherId: user.id,
                title: wordlist.title,
                type: '教材',
                textbook: wordlist.textbook,
                grade: wordlist.grade,
                volume: wordlist.volume,
                unit: wordlist.unit,
                words: [...wordlist.words],
                sourceWordlistId: unit.id
            });
            
            successCount++;
        });
        
        // 显示结果
        if (successCount > 0) {
            helpers.showToast(`成功关联 ${successCount} 个教材单元！`, 'success');
        }
        if (failCount > 0) {
            helpers.showToast(`${failCount} 个单元关联失败`, 'error');
        }
        
        // 关闭模态框并刷新
        this.hideLinkTextbookModal();
        this.renderWordlists();
    },

    /**
     * 关联单个教材词表（兼容旧代码）
     */
    linkTextbookWordlist(wordlistId) {
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }
        
        const user = auth.getCurrentUser();
        
        // 创建关联副本
        db.addWordList({
            teacherId: user.id,
            title: wordlist.title,
            type: '教材',
            textbook: wordlist.textbook,
            grade: wordlist.grade,
            volume: wordlist.volume,
            unit: wordlist.unit,
            words: [...wordlist.words],
            sourceWordlistId: wordlistId
        });
        
        helpers.showToast('教材词表关联成功！', 'success');
        this.renderAvailableTextbookWordlists();
        this.renderWordlists();
    },

    /**
     * 显示添加词表模态框
     */
    showAddWordlistModal() {
        const modal = document.getElementById('modal-add-wordlist');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        
        document.getElementById('new-wordlist-name').value = '';
        document.getElementById('new-wordlist-words').value = '';
        
        // 添加输入监听
        const textarea = document.getElementById('new-wordlist-words');
        textarea.oninput = () => this.updateWordCount('new-wordlist-words', 'wordlist-word-count');
    },

    /**
     * 隐藏添加词表模态框
     */
    hideAddWordlistModal() {
        const modal = document.getElementById('modal-add-wordlist');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 更新单词计数
     */
    updateWordCount(textareaId, countId) {
        const text = document.getElementById(textareaId).value;
        const words = this.parseWordsFromText(text);
        document.getElementById(countId).innerText = `已识别 ${words.length} 个单词`;
    },

    /**
     * 从文本解析单词（支持多种分隔符）
     */
    parseWordsFromText(text) {
        if (!text.trim()) return [];
        
        // 支持换行、逗号、制表符、空格分隔
        const separators = /[\n,\t\s]+/;
        return text.split(separators)
            .map(w => w.trim())
            .filter(w => w.length > 0);
    },

    /**
     * 确认添加词表
     */
    confirmAddWordlist() {
        const title = document.getElementById('new-wordlist-name').value.trim();
        const type = document.getElementById('new-wordlist-type').value;
        const textbook = document.getElementById('new-wordlist-textbook').value;
        const grade = document.getElementById('new-wordlist-grade').value;
        const wordsText = document.getElementById('new-wordlist-words').value;

        if (!title) {
            helpers.showToast('请填写词表名称！', 'warning');
            return;
        }

        const words = this.parseWordsFromText(wordsText);
        
        if (words.length === 0) {
            helpers.showToast('请至少输入一个单词！', 'warning');
            return;
        }

        const user = auth.getCurrentUser();
        db.addWordList({
            teacherId: user.id,
            title: title,
            type: type,
            textbook: textbook,
            grade: grade,
            words: words
        });

        this.hideAddWordlistModal();
        this.renderWordlists();
        helpers.showToast(`词表创建成功！共 ${words.length} 个单词`, 'success');
    },

    /**
     * 保存新词表（兼容旧代码）
     */
    saveNewWordlist() {
        this.confirmAddWordlist();
    },

    /**
     * 编辑词表
     */
    editWordlist(wordlistId) {
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }
        
        this.currentEditWordlistId = wordlistId;
        
        // 获取DOM元素
        const nameInput = document.getElementById('edit-wordlist-name');
        const wordsTextarea = document.getElementById('edit-wordlist-words');
        
        if (nameInput) nameInput.value = wordlist.title || '';
        if (wordsTextarea) wordsTextarea.value = (wordlist.words || []).join('\n');
        
        // 添加输入监听
        if (wordsTextarea) {
            wordsTextarea.oninput = () => {
                const count = wordsTextarea.value.trim().split('\n').filter(w => w.trim()).length;
                // 可以在这里添加单词计数显示
            };
        }
        
        const modal = document.getElementById('modal-edit-wordlist');
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
        }
    },

    /**
     * 隐藏编辑词表模态框
     */
    hideEditWordlistModal() {
        const modal = document.getElementById('modal-edit-wordlist');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            this.currentEditWordlistId = null;
        }, 300);
    },

    /**
     * 保存编辑的词表（兼容HTML中的confirmEditWordlist调用）
     */
    confirmEditWordlist() {
        return this.saveEditWordlist();
    },

    /**
     * 保存编辑的词表
     */
    saveEditWordlist() {
        if (!this.currentEditWordlistId) {
            helpers.showToast('没有正在编辑的词表！', 'error');
            return;
        }
        
        const nameInput = document.getElementById('edit-wordlist-name');
        const wordsTextarea = document.getElementById('edit-wordlist-words');
        
        const title = nameInput ? nameInput.value.trim() : '';
        const wordsText = wordsTextarea ? wordsTextarea.value : '';

        if (!title) {
            helpers.showToast('请填写词表名称！', 'warning');
            return;
        }

        const words = this.parseWordsFromText(wordsText);
        
        if (words.length === 0) {
            helpers.showToast('请至少输入一个单词！', 'warning');
            return;
        }

        const wordlist = db.findWordList(this.currentEditWordlistId);
        if (wordlist) {
            wordlist.title = title;
            wordlist.words = words;
            db.save();
        }

        this.hideEditWordlistModal();
        this.renderWordlists();
        helpers.showToast('词表更新成功！', 'success');
    },

    /**
     * 删除当前词表
     */
    deleteCurrentWordlist() {
        if (!this.currentEditWordlistId) {
            helpers.showToast('没有正在编辑的词表！', 'error');
            return;
        }
        
        const wordlist = db.findWordList(this.currentEditWordlistId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }
        
        if (confirm(`确定要删除词表"${wordlist.title}"吗？此操作不可恢复！`)) {
            // 删除词表
            db.deleteWordList(this.currentEditWordlistId);
            
            this.hideEditWordlistModal();
            this.renderWordlists();
            helpers.showToast('词表已删除！', 'success');
        }
    },

    /**
     * 触发AI生成检测
     * 实现真正的AI分析：调用外部API或使用内置智能引擎
     */
    triggerAI(wordlistId) {
        this.currentAIWordlistId = wordlistId;
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }

        // 保存当前词表供后续使用
        this._pendingWordlist = wordlist;

        // 检查是否已有生成的素材
        const user = auth.getCurrentUser();
        const existingReview = db.getTeacherReviewedSentences(user.id, wordlistId);
        const existingDraft = db.getAIDraft(wordlistId, user.id);
        
        // 如果有历史记录，显示自定义确认对话框
        if (existingReview && existingReview.sentences && Object.keys(existingReview.sentences).length > 0) {
            this._pendingExistingReview = existingReview;
            this._pendingExistingDraft = null;
            this.showAIConfirmDialog(
                `您之前已为"${wordlist.title}"生成过检测素材（${Object.keys(existingReview.sentences).length}个单词）。`,
                'review'
            );
            return;
        } else if (existingDraft && existingDraft.materials) {
            this._pendingExistingReview = null;
            this._pendingExistingDraft = existingDraft;
            this.showAIConfirmDialog(
                `您之前已为"${wordlist.title}"生成过检测素材。`,
                'draft'
            );
            return;
        }

        // 没有历史记录，直接开始生成
        this.startAIGeneration(wordlist);
    },

    /**
     * 显示AI确认对话框
     */
    showAIConfirmDialog(message, type) {
        const modal = document.getElementById('modal-ai-confirm');
        const messageEl = document.getElementById('ai-confirm-message');
        
        if (messageEl) messageEl.textContent = message;
        this._aiConfirmType = type;
        
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
        }
    },

    /**
     * 隐藏AI确认对话框
     */
    hideAIConfirmDialog() {
        const modal = document.getElementById('modal-ai-confirm');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    },

    /**
     * AI确认对话框 - 点击重新生成
     */
    onAIConfirmOK() {
        this.hideAIConfirmDialog();
        // 用户选择重新生成
        if (this._pendingWordlist) {
            this.startAIGeneration(this._pendingWordlist);
        }
    },

    /**
     * AI确认对话框 - 点击使用已有素材
     */
    onAIConfirmCancel() {
        this.hideAIConfirmDialog();
        // 用户选择使用已有素材
        if (this._pendingWordlist) {
            if (this._pendingExistingReview) {
                this.showExistingMaterials(this._pendingWordlist, this._pendingExistingReview);
            } else if (this._pendingExistingDraft) {
                this.showExistingDraft(this._pendingWordlist, this._pendingExistingDraft);
            }
        }
    },

    /**
     * 显示已有的草稿素材
     */
    showExistingDraft(wordlist, existingDraft) {
        this._aiAnalysisResult = {
            materials: existingDraft.materials,
            conditions: existingDraft.conditions || {},
            difficulty: 'medium',
            recommendedModes: ['context', 'spelling'],
            suggestedDuration: Math.ceil(wordlist.words.length * 0.5),
            analysis: '使用已生成的素材'
        };
        
        const modal = document.getElementById('modal-ai');
        const loading = document.getElementById('ai-loading');
        const result = document.getElementById('ai-result');
        const subtitle = document.getElementById('ai-modal-subtitle');
        
        if (subtitle) subtitle.textContent = `${wordlist.title} · ${wordlist.words.length} 个单词`;
        
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        loading.classList.add('hidden');
        result.classList.remove('hidden');
        
        this.updateAIResultDisplay(this._aiAnalysisResult, wordlist);
        this.switchAITab('overview');
    },

    /**
     * 开始AI生成
     */
    async startAIGeneration(wordlist) {
        const modal = document.getElementById('modal-ai');
        const loading = document.getElementById('ai-loading');
        const result = document.getElementById('ai-result');
        const subtitle = document.getElementById('ai-modal-subtitle');
        if (subtitle) subtitle.textContent = `${wordlist.title} · ${wordlist.words.length} 个单词`;

        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        
        loading.classList.remove('hidden');
        result.classList.add('hidden');

        // 更新加载提示
        const loadingTitle = loading.querySelector('h3');
        const loadingDesc = loading.querySelector('p');
        const progressBar = loading.querySelector('.bg-indigo-500');

        // 获取AI配置
        const aiConfig = db.getAIConfig();
        const useExternalAI = aiConfig.provider !== 'builtin' && aiConfig.apiKey;

        try {
            // 第一步：分析词表结构
            loadingTitle.textContent = '正在分析词表结构...';
            loadingDesc.textContent = '识别单词难度和词性分布';
            progressBar.style.width = '15%';
            
            let analysisResult;
            if (useExternalAI) {
                analysisResult = await this.callExternalAI(wordlist, aiConfig);
            } else {
                analysisResult = await this.useBuiltInEngine(wordlist);
            }
            progressBar.style.width = '25%';

            // 第二步：补全词典信息
            loadingTitle.textContent = '正在补全词典信息...';
            loadingDesc.textContent = '从开放词典拉取词性与例句';
            await this.enrichWordlistFromDictionary(wordlist);
            progressBar.style.width = '35%';

            // 第三步：使用AI生成例句和题目（关键步骤）
            loadingTitle.textContent = '正在生成语境例句...';
            loadingDesc.textContent = useExternalAI ? 
                `使用 ${admin.AI_PROVIDERS[aiConfig.provider]?.name || aiConfig.provider} 生成高质量例句` : 
                '使用智能引擎生成例句';
            
            const grade = wordlist.grade || 'middle';
            const materials = await aiSentenceService.generateMaterials(
                wordlist.words, 
                grade,
                (progress, completed, total) => {
                    const overallProgress = 35 + Math.round((progress * 0.55)); // 35% 到 90%
                    progressBar.style.width = overallProgress + '%';
                    loadingDesc.textContent = `已生成 ${completed}/${total} 个单词的例句`;
                }
            );
            progressBar.style.width = '90%';

            // 第四步：优化完成
            loadingTitle.textContent = '正在优化题目质量...';
            loadingDesc.textContent = '确保题目科学有效';
            progressBar.style.width = '100%';

            // 保存结果
            this._aiAnalysisResult = {
                ...analysisResult,
                materials: materials,
                conditions: this.computeAIConditions(materials, wordlist)
            };
            
            // 设置年级级别
            const levelMap = { easy: 'primary', medium: 'middle', hard: 'high' };
            if (contextTest && typeof contextTest.setGradeLevel === 'function') {
                contextTest.setGradeLevel(levelMap[analysisResult.difficulty] || 'middle');
            }

            // 短暂延迟后显示结果
            await new Promise(resolve => setTimeout(resolve, 300));

            // 更新结果显示
            this.updateAIResultDisplay(this._aiAnalysisResult, wordlist);

            loading.classList.add('hidden');
            result.classList.remove('hidden');
            
            // 自动切换到概览标签
            this.switchAITab('overview');
            
            helpers.showToast('AI生成完成！', 'success');

        } catch (error) {
            console.error('AI分析失败:', error);
            loadingTitle.textContent = '分析失败';
            loadingDesc.textContent = error.message || '请检查网络连接或AI配置';
            progressBar.classList.add('bg-rose-500');
            progressBar.classList.remove('bg-indigo-500');
            
            // 3秒后关闭
            setTimeout(() => {
                this.closeAIModal();
            }, 3000);
        }
    },

    async enrichWordlistFromDictionary(wordlist) {
        const words = (wordlist && wordlist.words) ? wordlist.words : [];
        const need = words
            .map(w => (w || '').trim())
            .filter(w => w.length > 0)
            .filter(w => !w.includes(' '))
            .filter(w => {
                const wd = db.findWord(w) || {};
                return !wd.meaning || !wd.phonetic || !wd.sentence;
            });
        if (!need.length) return;

        const limit = 5;
        let idx = 0;
        const results = [];
        const worker = async () => {
            while (idx < need.length) {
                const w = need[idx++];
                try {
                    const entry = await this.fetchOpenDictionaryEntry(w);
                    if (entry) results.push(entry);
                } catch (_) {}
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, need.length) }, () => worker()));
        results.forEach(e => db.upsertWord(e));
    },

    async fetchOpenDictionaryEntry(word) {
        const cached = db.getDictionaryCache(word);
        if (cached) return cached;
        
        const lower = (word || '').toLowerCase();
        const wd = db.findWord(lower) || {};
        
        let phonetic = wd.phonetic || `/${word}/`;
        let meaning = wd.meaning || '';
        
        if (!meaning) {
            const inferredPos = contextTest.detectPosFromMeaning ? contextTest.detectPosFromMeaning(meaning) : null;
            if (inferredPos === 'verb') {
                meaning = 'v. 动词';
            } else if (inferredPos === 'adj') {
                meaning = 'adj. 形容词';
            } else if (inferredPos === 'adv') {
                meaning = 'adv. 副词';
            } else if (inferredPos === 'prep') {
                meaning = 'prep. 介词';
            } else {
                meaning = 'n. 单词或短语';
            }
        }
        
        let sentence = wd.sentence || wd.example || '';
        if (!sentence) {
            const tpl = contextTest.generateContextSentence(word, meaning);
            sentence = (tpl || '').includes('___') ? tpl.replace('___', word) : tpl;
        } else {
            if (sentence.includes('___')) {
                sentence = sentence.replace('___', word);
            }
        }
        
        const entry = { word, phonetic, meaning, sentence };
        db.saveDictionaryCache(word, entry);
        return entry;
    },

    parseOpenDictionaryEntry(word, data) {
        if (!Array.isArray(data) || !data.length) return null;
        const entry = data[0] || {};
        const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
        const phonetic = (phonetics.find(p => p && p.text)?.text) || entry.phonetic || `/${word}/`;
        const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
        const firstMeaning = meanings[0] || {};
        const part = (firstMeaning.partOfSpeech || '').toLowerCase();
        const defs = Array.isArray(firstMeaning.definitions) ? firstMeaning.definitions : [];
        const def = defs.find(d => d && d.definition) || {};
        const example = defs.find(d => d && d.example) ? defs.find(d => d && d.example).example : '';
        const posMap = {
            noun: 'n.',
            verb: 'v.',
            adjective: 'adj.',
            adverb: 'adv.',
            preposition: 'prep.',
            pronoun: 'pron.',
            conjunction: 'conj.',
            interjection: 'int.',
            determiner: 'det.'
        };
        const abbr = posMap[part] || (part ? `${part}.` : '');
        const meaning = (abbr && def.definition) ? `${abbr} ${def.definition}` : (def.definition || '');
        let sentence = '';
        if (example && example.toLowerCase().includes(word.toLowerCase())) {
            // 校验词典例句；不合格则回退到模板生成
            if (typeof contextTest.validateContextSentence === 'function') {
                const blankVersion = example.replace(new RegExp(`\\b${word}\\b`, 'gi'), '___');
                if (!contextTest.validateContextSentence(blankVersion, meaning.toLowerCase())) {
                    const tpl = contextTest.generateContextSentence(word, meaning);
                    sentence = (tpl || '').includes('___') ? tpl.replace('___', word) : tpl;
                } else {
                    sentence = example;
                }
            } else {
                sentence = example;
            }
        } else {
            const tpl = contextTest.generateContextSentence(word, meaning);
            sentence = (tpl || '').includes('___') ? tpl.replace('___', word) : tpl;
        }
        return { word, phonetic, meaning, sentence };
    },

    /**
     * 调用外部AI服务
     */
    async callExternalAI(wordlist, config) {
        const words = wordlist.words.slice(0, 20); // 限制数量避免超时
        
        const prompt = `请分析以下英语单词列表，并为教师提供检测建议。

词表名称：${wordlist.title}
单词列表：${words.join(', ')}

请以JSON格式返回以下信息：
{
    "difficulty": "整体难度评估(easy/medium/hard)",
    "recommendedModes": ["推荐的检测模式数组"],
    "suggestedDuration": "建议学习时长(分钟)",
    "keyWords": ["重点单词数组"],
    "analysis": "整体分析说明",
    "tips": "给学生的学习建议"
}`;

        const endpoint = config.endpoint || admin.AI_PROVIDERS[config.provider]?.defaultEndpoint;
        
        if (!endpoint) {
            throw new Error('未配置API端点');
        }

        // 构建请求体，通过后端代理转发，避免 CORS 问题
        const response = await fetch('/api/ai/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint,
                apiKey: config.apiKey,
                model: config.model || 'qwen-turbo',
                messages: [
                    { role: 'system', content: config.systemPrompt || '你是一位专业的英语教育专家。' },
                    { role: 'user', content: prompt }
                ],
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxTokens ?? 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // 尝试解析JSON
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('JSON解析失败，使用默认结果');
        }

        // 返回默认结果
        return {
            difficulty: 'medium',
            recommendedModes: ['context', 'spelling'],
            suggestedDuration: Math.ceil(words.length * 0.5),
            keyWords: words.slice(0, 5),
            analysis: content.substring(0, 200),
            tips: '建议先学习再检测'
        };
    },

    /**
     * 使用内置智能引擎
     */
    async useBuiltInEngine(wordlist) {
        const words = wordlist.words;
        
        // 模拟分析过程（实际项目中可以实现更复杂的逻辑）
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 分析单词难度
        let easyCount = 0, mediumCount = 0, hardCount = 0;
        const keyWords = [];
        
        words.forEach(word => {
            const wordData = db.findWord(word.toLowerCase());
            
            // 简单的难度判断逻辑
            const len = word.length;
            if (len <= 4) {
                easyCount++;
            } else if (len <= 7) {
                mediumCount++;
            } else {
                hardCount++;
            }

            // 标记重点单词（较长或没有学习记录的）
            if (len > 6 || !wordData?.sentence) {
                keyWords.push(word);
            }
        });

        // 确定整体难度
        let difficulty = 'medium';
        if (easyCount > words.length * 0.6) {
            difficulty = 'easy';
        } else if (hardCount > words.length * 0.4) {
            difficulty = 'hard';
        }

        // 推荐检测模式
        const recommendedModes = [];
        if (words.length <= 10) {
            recommendedModes.push('context', 'spelling', 'matching');
        } else if (words.length <= 20) {
            recommendedModes.push('context', 'spelling');
        } else {
            recommendedModes.push('context', 'matching');
        }

        // 生成分析说明
        const analysis = `词表包含 ${words.length} 个单词。
难度分布：简单词 ${easyCount} 个，中等词 ${mediumCount} 个，难词 ${hardCount} 个。
整体难度评估为${difficulty === 'easy' ? '简单' : difficulty === 'hard' ? '较难' : '中等'}。
建议采用${recommendedModes.map(m => ({context: '语境选择', spelling: '听音拼写', matching: '词义匹配', flashcard: '卡片认知'}[m])).join('、')}模式进行检测。`;

        return {
            difficulty,
            recommendedModes,
            suggestedDuration: Math.ceil(words.length * 0.5),
            keyWords: keyWords.slice(0, 8),
            analysis,
            tips: '建议先进行单词学习，再完成检测任务。重点单词需要多加练习。'
        };
    },
    
    buildAIMaterials(wordlist) {
        const words = wordlist.words || [];
        const contextItems = words.map(w => {
            const q = contextTest.generateQuestion(w);
            return { word: w, sentence: q.sentence, options: q.options.map(o => o.word), correctIndex: q.correctIndex };
        });
        const matchingItems = words.map(w => {
            const wd = db.findWord(w) || {};
            const q = matchingTest.generateQuestion(w, wd);
            return { word: w, options: q.options, correctIndex: q.correctIndex, phonetic: wd.phonetic || `/${w}/`, meaning: wd.meaning || '' };
        });
        const spellingItems = words.map(w => {
            const wd = db.findWord(w) || {};
            return { word: w, phonetic: wd.phonetic || `/${w}/`, hint: wd.meaning || '', letters: w.length };
        });
        const flashcardItems = words.map(w => {
            const wd = db.findWord(w) || {};
            const sentence = wd.sentence || contextTest.generateContextSentence(w, wd.meaning || '');
            return { word: w, phonetic: wd.phonetic || `/${w}/`, meaning: wd.meaning || '', sentence };
        });
        return { context: contextItems, matching: matchingItems, spelling: spellingItems, flashcard: flashcardItems };
    },
    
    computeAIConditions(materials, wordlist) {
        const words = wordlist.words || [];
        const dictCovered = words.filter(w => !!db.findWord(w)).length;
        const coverageRate = words.length ? Math.round((dictCovered / words.length) * 100) : 0;
        const contextOk = materials.context.every(i => i.sentence && Array.isArray(i.options) && i.options.length >= 4);
        const matchingOk = materials.matching.every(i => Array.isArray(i.options) && i.options.length >= 4);
        const spellingOk = (speech && Array.isArray(speech.getAvailableVoices()) && speech.getAvailableVoices().length > 0);
        const flashcardOk = materials.flashcard.every(i => !!i.sentence);
        return { coverageRate, contextOk, matchingOk, spellingOk, flashcardOk };
    },

    /**
     * 更新AI结果显示
     */
    updateAIResultDisplay(result, wordlist) {
        const overview = document.getElementById('ai-pane-overview');
        const materialsPane = document.getElementById('ai-pane-materials');
        const verifyPane = document.getElementById('ai-pane-verify');
        const publishPane = document.getElementById('ai-pane-publish');
        if (!overview || !materialsPane || !verifyPane || !publishPane) return;

        // 初始化teacherReview模块
        const grade = wordlist.grade || 'middle';
        teacherReview.initReviewSession(wordlist.id, wordlist.words, grade);
        
        // 检查是否有已审核的句子
        const user = auth.getCurrentUser();
        const hasReviewed = teacherReview.hasReviewedSentences(wordlist.id, user.id);
        
        if (hasReviewed) {
            helpers.showToast('已加载您之前审核过的句子', 'info');
        }

        const difficultyEmoji = { easy: '🟢', medium: '🟡', hard: '🔴' }[result.difficulty] || '🟡';
        const difficultyName = result.difficulty === 'easy' ? '简单' : result.difficulty === 'hard' ? '较难' : '中等';
        const c = result.conditions || { coverageRate: 0, contextOk: false, spellingOk: false, matchingOk: false, flashcardOk: false };
        const badge = (ok) => ok ? '<span class="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">就绪</span>' : '<span class="inline-flex items-center px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-semibold">缺失</span>';

        // 将所有内容合并到概览面板
        overview.innerHTML = `
            <!-- 概览信息 -->
            <div class="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <div class="text-xs text-slate-500 mb-1">概览</div>
                        <div class="text-2xl font-bold text-slate-900 flex items-center">
                            <span class="mr-2">${difficultyEmoji}</span>
                            词表难度：${difficultyName}
                            <span class="ml-3 text-sm font-normal text-slate-500">建议时长：${result.suggestedDuration} 分钟</span>
                        </div>
                        <div class="text-sm text-slate-600 mt-3 leading-relaxed">${result.analysis || ''}</div>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-3 mt-6">
                    <div class="rounded-xl border p-4">
                        <div class="text-xs text-slate-500 mb-1">已生成</div>
                        <div class="text-xl font-bold text-slate-900">${result.materials?.context?.length || 0} 个</div>
                        <div class="text-xs text-slate-400">单词例句</div>
                    </div>
                    <div class="rounded-xl border p-4">
                        <div class="text-xs text-slate-500 mb-1">推荐模式</div>
                        <div class="text-sm font-semibold text-slate-800">${(result.recommendedModes || []).map(m => ({context:'语境',spelling:'拼写',matching:'匹配',flashcard:'卡片'}[m] || m)).join('、') || '—'}</div>
                    </div>
                    <div class="rounded-xl border p-4">
                        <div class="text-xs text-slate-500 mb-1">可发布条件</div>
                        <div class="text-sm text-slate-700">核验通过 ≥ 80%</div>
                    </div>
                </div>
                ${(result.keyWords && result.keyWords.length) ? `
                    <div class="mt-5">
                        <div class="text-xs font-semibold text-slate-500 mb-2">重点单词</div>
                        <div class="flex flex-wrap gap-2">
                            ${result.keyWords.map(w => `<span class="px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">${w}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${(result.tips) ? `
                    <div class="mt-5 text-xs text-slate-500">
                        <i class="fa-solid fa-circle-info mr-1"></i>${result.tips}
                    </div>
                ` : ''}
            </div>

            <!-- 素材生成状态 -->
            <div class="bg-white rounded-2xl border shadow-sm p-6 mb-6" id="ai-material-status">
                <div class="flex items-center justify-between mb-4">
                    <div class="text-sm font-semibold text-slate-800 flex items-center">
                        <i class="fa-solid fa-database mr-2 text-slate-500"></i>素材生成状态
                        <span class="ml-2 text-xs text-slate-500">已生成 ${result.materials?.context?.length || 0} 个单词的例句</span>
                    </div>
                </div>
                <div class="grid grid-cols-4 gap-3 text-sm">
                    <div class="flex items-center justify-between rounded-lg border p-3"><span>语境</span>${badge(c.contextOk)}</div>
                    <div class="flex items-center justify-between rounded-lg border p-3"><span>拼写</span>${badge(c.spellingOk)}</div>
                    <div class="flex items-center justify-between rounded-lg border p-3"><span>匹配</span>${badge(c.matchingOk)}</div>
                    <div class="flex items-center justify-between rounded-lg border p-3"><span>卡片</span>${badge(c.flashcardOk)}</div>
                </div>
            </div>

            <!-- AI素材列表 -->
            <div class="bg-white rounded-2xl border shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="text-sm font-semibold text-slate-800">AI素材列表</div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-slate-500">共 ${result.materials?.context?.length || 0} 个单词</span>
                        <button onclick="teacher.batchImportToReview()" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition">
                            <i class="fa-solid fa-file-import mr-1"></i>一键导入核验
                        </button>
                    </div>
                </div>
                <div class="space-y-3 overflow-y-auto" style="max-height: 50vh;">
                    ${(result.materials?.context || []).length === 0 ? `
                        <div class="text-center text-slate-500 py-8">
                            <i class="fa-solid fa-inbox text-4xl mb-3 text-slate-300"></i>
                            <p>暂无生成的素材</p>
                        </div>
                    ` : (result.materials?.context || []).map((i, idx) => `
                        <div class="rounded-xl border p-4 hover:bg-slate-50 transition">
                            <div class="flex items-start justify-between mb-2">
                                <div class="text-sm font-bold text-slate-900">${idx + 1}. ${i.word}</div>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-slate-500">${result.materials?.flashcard?.[idx]?.phonetic || ''}</span>
                                    <span class="px-2 py-0.5 rounded-full text-xs ${teacherReview.state.reviewedSentences?.[i.word]?.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                                        ${teacherReview.state.reviewedSentences?.[i.word]?.status === 'approved' ? '已通过' : '待审核'}
                                    </span>
                                </div>
                            </div>
                            <div class="text-sm font-medium text-slate-800 mb-2">${(i.sentence || '').replace('___','<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">___</span>')}</div>
                            <div class="text-xs text-slate-600 mb-2">${result.materials?.flashcard?.[idx]?.meaning || ''}</div>
                            <div class="grid grid-cols-2 gap-2 text-xs text-slate-700">
                                ${(i.options || []).slice(0,4).map((o, optIdx) => `<div class="rounded border px-2 py-1 ${optIdx===i.correctIndex?'border-emerald-300 bg-emerald-50':'border-slate-200 bg-white'}">${String.fromCharCode(65+optIdx)}. ${o}</div>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-4 flex items-center justify-between">
                    <span class="text-xs text-slate-500">如素材不符合用法，请到“核验”页进行修订。</span>
                    <button onclick="teacher.switchAITab('publish')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                        进入发布<i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                </div>
            </div>
        `;

        // 素材列表面板 - 显示所有单词的详细素材
        if (materialsPane) {
            materialsPane.innerHTML = `
                <div class="bg-white rounded-2xl border shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-sm font-semibold text-slate-800">素材列表</div>
                        <span class="text-xs text-slate-500">共 ${result.materials?.context?.length || 0} 个单词</span>
                    </div>
                    <div class="space-y-4 max-h-[60vh] overflow-y-auto">
                        ${(result.materials?.context || []).length === 0 ? `
                            <div class="text-center text-slate-500 py-8">
                                <i class="fa-solid fa-inbox text-4xl mb-3 text-slate-300"></i>
                                <p>暂无生成的素材</p>
                            </div>
                        ` : (result.materials?.context || []).map((item, idx) => `
                            <div class="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition">
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <span class="text-lg font-bold text-slate-900">${item.word}</span>
                                        <span class="text-sm text-slate-500 ml-2">${result.materials?.flashcard?.[idx]?.phonetic || ''}</span>
                                        <span class="text-xs text-slate-400 ml-2">${result.materials?.flashcard?.[idx]?.pos || ''}</span>
                                    </div>
                                    <span class="px-2 py-1 rounded text-xs ${teacherReview.state.reviewedSentences?.[item.word]?.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                                        ${teacherReview.state.reviewedSentences?.[item.word]?.status === 'approved' ? '已通过' : '待审核'}
                                    </span>
                                </div>
                                
                                <!-- 例句 -->
                                <div class="bg-slate-50 rounded-lg p-3 mb-3">
                                    <div class="text-sm text-slate-700 leading-relaxed">
                                        ${(item.sentence || '').replace('___', '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">___</span>')}
                                    </div>
                                </div>
                                
                                <!-- 选项 -->
                                ${item.options ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        ${item.options.slice(0, 4).map((opt, optIdx) => `
                                            <div class="text-sm px-3 py-2 rounded-lg border ${optIdx === item.correctIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}">
                                                ${String.fromCharCode(65 + optIdx)}. ${opt}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                
                                <!-- 释义 -->
                                <div class="text-sm text-slate-600">
                                    <span class="font-medium">释义：</span>${result.materials?.flashcard?.[idx]?.meaning || ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        verifyPane.innerHTML = `
            <div class="bg-white rounded-2xl border shadow-sm p-6">
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <div class="text-sm font-semibold text-slate-800 flex items-center">
                            <i class="fa-solid fa-clipboard-check mr-2 text-amber-600"></i>人工核验
                            <span id="ai-verify-progress" class="ml-3 text-xs text-slate-500"></span>
                        </div>
                        <div class="text-xs text-slate-500 mt-2">请点击左侧"核验"标签进入句子审核界面</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="teacher.switchAITab('verify')" class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold">进入核验</button>
                        <button onclick="teacher.saveDraft()" class="px-4 py-2 border border-amber-600 text-amber-700 rounded-lg hover:bg-amber-50 text-sm font-semibold">保存草稿</button>
                    </div>
                </div>
            </div>
        `;
        this.updateVerifyProgress(wordlist);

        // 获取学生数量（使用已声明的user变量）
        const studentCount = db.getStudentsByTeacher(user.id).length;
        
        publishPane.innerHTML = `
            <div class="bg-white rounded-2xl border shadow-sm p-6">
                <div class="bg-indigo-50 rounded-xl p-4 mb-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                <i class="fa-solid fa-users text-indigo-600"></i>
                            </div>
                            <div>
                                <div class="text-sm font-semibold text-slate-800">发布对象</div>
                                <div class="text-xs text-slate-500">任务将发布给您的所有学生</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-indigo-600">${studentCount}</div>
                            <div class="text-xs text-slate-500">名学生</div>
                        </div>
                    </div>
                </div>
                
                <div class="text-sm font-semibold text-slate-800 mb-3">截止时间 <span class="text-rose-500">*</span></div>
                <div class="flex space-x-2">
                    <input type="date" id="ai-task-deadline-date" class="flex-1 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" required>
                    <input type="time" id="ai-task-deadline-time" value="23:59" class="w-28 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm">
                </div>
                <div class="mt-4 text-xs text-slate-500">
                    <i class="fa-solid fa-circle-info mr-1"></i>
                    请设置任务的截止时间，学生需要在截止时间前完成检测。
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="teacher.switchAITab('verify')" class="px-4 py-2 text-slate-700 border rounded-lg hover:bg-slate-50 transition">回到核验</button>
                    <button onclick="teacher.publishAITask()" class="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition ${studentCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${studentCount === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-paper-plane mr-1"></i>确认发布给学生
                    </button>
                </div>
            </div>
        `;

        this.switchAITab('overview');
    },

    switchAITab(tab) {
        const panes = {
            overview: document.getElementById('ai-pane-overview'),
            materials: document.getElementById('ai-pane-materials'),
            verify: document.getElementById('ai-pane-verify'),
            publish: document.getElementById('ai-pane-publish')
        };
        const nav = {
            overview: document.getElementById('ai-nav-overview'),
            materials: document.getElementById('ai-nav-materials'),
            verify: document.getElementById('ai-nav-verify'),
            publish: document.getElementById('ai-nav-publish')
        };
        
        // 如果切换到核验标签，渲染核验界面
        if (tab === 'verify') {
            const wordlist = db.findWordList(this.currentAIWordlistId);
            if (wordlist) {
                const grade = wordlist.grade || 'middle';
                teacherReview.initReviewSession(this.currentAIWordlistId, wordlist.words, grade);
                
                // 检查是否有已审核的句子
                const user = auth.getCurrentUser();
                const hasReviewed = teacherReview.hasReviewedSentences(this.currentAIWordlistId, user.id);
                
                if (hasReviewed) {
                    helpers.showToast('已加载您之前审核过的句子', 'info');
                }
                
                // 在核验面板中渲染审核界面
                const verifyPane = document.getElementById('ai-pane-verify');
                if (verifyPane) {
                    teacherReview.renderReviewInterface(verifyPane);
                }
            }
        }
        
        Object.keys(panes).forEach(k => {
            if (panes[k]) panes[k].classList.add('hidden');
            if (nav[k]) {
                nav[k].classList.remove('border-indigo-500', 'text-indigo-600');
                nav[k].classList.add('border-transparent', 'text-slate-500');
            }
        });
        const activePane = panes[tab];
        const activeNav = nav[tab];
        if (activePane) activePane.classList.remove('hidden');
        if (activeNav) {
            activeNav.classList.remove('border-transparent', 'text-slate-500');
            activeNav.classList.add('border-indigo-500', 'text-indigo-600');
        }
    },
    
    openVerification() {
        const modal = document.getElementById('modal-ai-verify');
        if (!modal) return;
        const wordlist = db.findWordList(this.currentAIWordlistId);
        if (!wordlist) return;
        
        // 使用新的teacherReview模块初始化审核会话
        const grade = wordlist.grade || 'middle';
        teacherReview.initReviewSession(this.currentAIWordlistId, wordlist.words, grade);
        
        // 检查是否有已审核的句子
        const user = auth.getCurrentUser();
        const hasReviewed = teacherReview.hasReviewedSentences(this.currentAIWordlistId, user.id);
        
        if (hasReviewed) {
            // 加载已审核的句子
            const savedReview = teacherReview.loadReviewedSentences(this.currentAIWordlistId, user.id);
            if (savedReview) {
                helpers.showToast('已加载您之前审核过的句子', 'info');
            }
        }
        
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        
        // 使用新的teacherReview模块渲染审核界面
        const container = document.getElementById('ai-verify-content');
        if (container) {
            teacherReview.renderReviewInterface(container);
        } else {
            // 如果没有新容器，使用旧的方式渲染
            this._currentVerifyWord = wordlist.words[0] || '';
            this.renderVerifyModal(wordlist);
        }
    },
    
    closeVerifyModal() {
        const modal = document.getElementById('modal-ai-verify');
        if (!modal) return;
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    },
    
    renderVerifyModal(wordlist) {
        const listEl = document.getElementById('verify-word-list');
        const headerWord = document.getElementById('verify-current-word');
        if (!listEl || !headerWord) return;
        const mats = (this._aiAnalysisResult && this._aiAnalysisResult.materials) || {};
        const ctx = mats.context || [];
        const match = mats.matching || [];
        const flash = mats.flashcard || [];
        const ver = this._verificationState || {};
        listEl.innerHTML = '';
        wordlist.words.forEach(w => {
            const v = ver[w] || {};
            const item = document.createElement('button');
            item.className = `w-full text-left px-3 py-2 rounded border ${this._currentVerifyWord === w ? 'bg-slate-100 border-slate-300' : 'bg-white hover:bg-slate-50'} flex justify-between items-center`;
            item.onclick = () => this.selectVerifyWord(w, wordlist);
            item.innerHTML = `<span class="text-sm">${w}</span>`;
            listEl.appendChild(item);
        });
        headerWord.innerText = this._currentVerifyWord || '';
        const cw = this._currentVerifyWord;
        const ci = ctx.find(x => x.word === cw) || { sentence:'', options:[], correctIndex:0 };
        const mi = match.find(x => x.word === cw) || { options:[], correctIndex:0 };
        const fi = flash.find(x => x.word === cw) || { phonetic:'', meaning:'', sentence:'' };
        const vpass = (this._verificationSimple && this._verificationSimple[cw]) || false;
        const passEl = document.getElementById('verify-pass');
        if (passEl) passEl.checked = !!vpass;
        document.getElementById('verify-sentence').value = ci.sentence || '';
        ['verify-opt-0','verify-opt-1','verify-opt-2','verify-opt-3'].forEach((id, idx) => {
            document.getElementById(id).value = ci.options && ci.options[idx] ? ci.options[idx] : '';
        });
        document.getElementById('verify-phonetic').value = fi.phonetic || '';
        document.getElementById('verify-meaning').value = fi.meaning || '';
        document.getElementById('verify-fsentence').value = fi.sentence || '';
        ['verify-mopt-0','verify-mopt-1','verify-mopt-2','verify-mopt-3'].forEach((id, idx) => {
            document.getElementById(id).value = mi.options && mi.options[idx] ? mi.options[idx] : '';
        });
        this.updateVerifyProgress(wordlist);
        const prog = document.getElementById('ai-verify-progress-modal');
        if (prog) {
            const words = wordlist.words || [];
            let done = 0;
            words.forEach(w => {
                const vv = ver[w] || {};
                if (vv.context && vv.spelling && vv.matching && vv.flashcard) done++;
            });
            prog.innerText = `核验完成度：${done}/${words.length}`;
        }
    },
    
    selectVerifyWord(word, wordlist) {
        this._currentVerifyWord = word;
        this.renderVerifyModal(wordlist);
    },
    
    toggleVerifyPass() {
        const w = this._currentVerifyWord;
        if (!w) return;
        if (!this._verificationSimple) this._verificationSimple = {};
        const checkbox = document.getElementById('verify-pass');
        this._verificationSimple[w] = !!(checkbox && checkbox.checked);
        const wl = db.findWordList(this.currentAIWordlistId);
        const u = auth.getCurrentUser();
        if (wl && u) db.saveAIDraft(wl.id, { materials: this._aiAnalysisResult.materials, verificationSimple: this._verificationSimple, verification: this._verificationState || {} }, u.id);
        this.updateVerifyProgress(wl);
        const prog = document.getElementById('ai-verify-progress-modal');
        if (prog && wl) {
            const words = wl.words || [];
            let done = words.filter(wx => this._verificationSimple && this._verificationSimple[wx]).length;
            prog.innerText = `核验完成度：${done}/${words.length}`;
        }
    },
    
    saveVerifyItemFromModal() {
        const mats = this._aiAnalysisResult.materials;
        const w = this._currentVerifyWord;
        if (!w) return;
        const ctxIdx = mats.context.findIndex(x => x.word === w);
        const matchIdx = mats.matching.findIndex(x => x.word === w);
        const flashIdx = mats.flashcard.findIndex(x => x.word === w);
        const sentence = document.getElementById('verify-sentence').value.trim();
        const opts = ['verify-opt-0','verify-opt-1','verify-opt-2','verify-opt-3'].map(id => document.getElementById(id).value.trim()).filter(s => s.length);
        const phonetic = document.getElementById('verify-phonetic').value.trim();
        const meaning = document.getElementById('verify-meaning').value.trim();
        const fsent = document.getElementById('verify-fsentence').value.trim();
        const mopts = ['verify-mopt-0','verify-mopt-1','verify-mopt-2','verify-mopt-3'].map(id => document.getElementById(id).value.trim()).filter(s => s.length);
        if (ctxIdx > -1) {
            mats.context[ctxIdx].sentence = sentence;
            mats.context[ctxIdx].options = opts;
            const correctIndex = opts.findIndex(o => o.toLowerCase() === w.toLowerCase());
            mats.context[ctxIdx].correctIndex = correctIndex >= 0 ? correctIndex : 0;
        }
        if (matchIdx > -1) {
            mats.matching[matchIdx].options = mopts;
            const targetMeaning = meaning || (db.findWord(w)?.meaning || '');
            const mcorrectIdx = mopts.findIndex(o => o === targetMeaning);
            mats.matching[matchIdx].correctIndex = mcorrectIdx >= 0 ? mcorrectIdx : 0;
        }
        if (flashIdx > -1) {
            mats.flashcard[flashIdx].phonetic = phonetic;
            mats.flashcard[flashIdx].meaning = meaning;
            mats.flashcard[flashIdx].sentence = fsent;
        }
        // Automatically mark this word as verified
        if (!this._verificationSimple) this._verificationSimple = {};
        this._verificationSimple[w] = true;
        const wl = db.findWordList(this.currentAIWordlistId);
        const u = auth.getCurrentUser();
        if (wl && u) db.saveAIDraft(wl.id, { materials: mats, verificationSimple: this._verificationSimple, verification: this._verificationState || {} }, u.id);
        this.updateVerifyProgress(wl);
        helpers.showToast('已保存当前单词', 'success');
    },
    
    renderVerificationList(wordlist) {
        const list = document.getElementById('ai-verify-list');
        if (!list) return;
        list.innerHTML = '';
        const mats = (this._aiAnalysisResult && this._aiAnalysisResult.materials) || {};
        const ctx = mats.context || [];
        const match = mats.matching || [];
        const flash = mats.flashcard || [];
        const ver = this._verificationState || {};
        wordlist.words.forEach((w, i) => {
            const ci = ctx.find(x => x.word === w) || { sentence: '', options: [], correctIndex: 0 };
            const mi = match.find(x => x.word === w) || { options: [], correctIndex: 0 };
            const fi = flash.find(x => x.word === w) || { phonetic: '', meaning: '', sentence: '' };
            const item = document.createElement('div');
            item.className = 'bg-white rounded border p-3';
            const v = ver[w] || {};
            item.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="font-medium text-slate-700">${w}</div>
                    <div class="space-x-2 text-xs">
                        <label class="inline-flex items-center">
                            <input type="checkbox" ${v.context ? 'checked' : ''} onchange="teacher.markVerified('${w}','context')" class="mr-1">语境
                        </label>
                        <label class="inline-flex items-center">
                            <input type="checkbox" ${v.spelling ? 'checked' : ''} onchange="teacher.markVerified('${w}','spelling')" class="mr-1">拼写
                        </label>
                        <label class="inline-flex items-center">
                            <input type="checkbox" ${v.matching ? 'checked' : ''} onchange="teacher.markVerified('${w}','matching')" class="mr-1">匹配
                        </label>
                        <label class="inline-flex items-center">
                            <input type="checkbox" ${v.flashcard ? 'checked' : ''} onchange="teacher.markVerified('${w}','flashcard')" class="mr-1">卡片
                        </label>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <div class="text-xs text-slate-500 mb-1">语境例句</div>
                        <textarea id="v-sentence-${i}" class="w-full border rounded p-2 text-sm" rows="2">${ci.sentence || ''}</textarea>
                        <div class="text-xs text-slate-500 mt-2 mb-1">选项（逗号分隔）</div>
                        <textarea id="v-options-${i}" class="w-full border rounded p-2 text-sm" rows="2">${(ci.options || []).join(', ')}</textarea>
                        <div class="mt-2 flex items-center space-x-2">
                            <label class="text-xs text-slate-500">正确索引</label>
                            <input id="v-correct-${i}" type="number" min="0" class="w-16 border rounded p-1 text-sm" value="${ci.correctIndex || 0}">
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-slate-500 mb-1">卡片信息</div>
                        <input id="v-phonetic-${i}" class="w-full border rounded p-2 text-sm mb-2" placeholder="音标" value="${fi.phonetic || ''}">
                        <input id="v-meaning-${i}" class="w-full border rounded p-2 text-sm mb-2" placeholder="中文释义" value="${fi.meaning || ''}">
                        <textarea id="v-fsentence-${i}" class="w-full border rounded p-2 text-sm" rows="2" placeholder="例句">${fi.sentence || ''}</textarea>
                        <div class="text-xs text-slate-500 mt-2 mb-1">匹配选项（逗号分隔）</div>
                        <textarea id="v-moptions-${i}" class="w-full border rounded p-2 text-sm" rows="2">${(mi.options || []).join(', ')}</textarea>
                        <div class="mt-2 flex items-center space-x-2">
                            <label class="text-xs text-slate-500">正确索引</label>
                            <input id="v-mcorrect-${i}" type="number" min="0" class="w-16 border rounded p-1 text-sm" value="${mi.correctIndex || 0}">
                        </div>
                    </div>
                </div>
                <div class="mt-3 text-right">
                    <button onclick="teacher.saveVerificationItem('${w}', ${i})" class="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm">保存</button>
                </div>
            `;
            list.appendChild(item);
        });
        this.updateVerifyProgress(wordlist);
    },
    
    saveVerificationItem(word, i) {
        const mats = this._aiAnalysisResult.materials;
        const ctxIdx = mats.context.findIndex(x => x.word === word);
        const matchIdx = mats.matching.findIndex(x => x.word === word);
        const flashIdx = mats.flashcard.findIndex(x => x.word === word);
        const sentence = document.getElementById(`v-sentence-${i}`).value.trim();
        const optionsStr = document.getElementById(`v-options-${i}`).value;
        const opts = optionsStr.split(',').map(s => s.trim()).filter(s => s.length);
        const correct = parseInt(document.getElementById(`v-correct-${i}`).value) || 0;
        const phonetic = document.getElementById(`v-phonetic-${i}`).value.trim();
        const meaning = document.getElementById(`v-meaning-${i}`).value.trim();
        const fsent = document.getElementById(`v-fsentence-${i}`).value.trim();
        const moptsStr = document.getElementById(`v-moptions-${i}`).value;
        const mopts = moptsStr.split(',').map(s => s.trim()).filter(s => s.length);
        const mcorrect = parseInt(document.getElementById(`v-mcorrect-${i}`).value) || 0;
        if (ctxIdx > -1) {
            mats.context[ctxIdx].sentence = sentence;
            mats.context[ctxIdx].options = opts;
            mats.context[ctxIdx].correctIndex = correct;
        }
        if (matchIdx > -1) {
            mats.matching[matchIdx].options = mopts;
            mats.matching[matchIdx].correctIndex = mcorrect;
        }
        if (flashIdx > -1) {
            mats.flashcard[flashIdx].phonetic = phonetic;
            mats.flashcard[flashIdx].meaning = meaning;
            mats.flashcard[flashIdx].sentence = fsent;
        }
        const draft = { materials: mats, verification: this._verificationState || {} };
        const wl = db.findWordList(this.currentAIWordlistId);
        if (wl) db.saveAIDraft(wl.id, draft);
        this.updateVerifyProgress(wl);
        helpers.showToast('已保存该单词的核验修改', 'success');
    },
    
    markVerified(word, mode) {
        if (!this._verificationState) this._verificationState = {};
        if (!this._verificationState[word]) this._verificationState[word] = {};
        this._verificationState[word][mode] = true;
        const wl = db.findWordList(this.currentAIWordlistId);
        const u = auth.getCurrentUser();
        if (wl && u) db.saveAIDraft(wl.id, { materials: this._aiAnalysisResult.materials, verification: this._verificationState }, u.id);
        this.updateVerifyProgress(wl);
    },
    
    saveDraft() {
        const wl = db.findWordList(this.currentAIWordlistId);
        const u = auth.getCurrentUser();
        if (!wl || !u) return;
        
        // 保存teacherReview的审核数据
        if (teacherReview && teacherReview.state && teacherReview.state.isModified) {
            teacherReview.saveReviewedSentences();
            helpers.showToast('审核数据已保存', 'success');
        }
        
        // 同时保存旧的草稿数据（向后兼容）
        if (this._aiAnalysisResult) {
            const words = wl.words || [];
            if (!this._verificationSimple) this._verificationSimple = {};
            words.forEach(w => { this._verificationSimple[w] = true; });
            this._verificationCompleted = true;
            db.saveAIDraft(wl.id, { materials: this._aiAnalysisResult.materials, verification: this._verificationState || {}, verificationSimple: this._verificationSimple || {}, verificationCompleted: true }, u.id);
        }
        
        this.updateVerifyProgress(wl);
    },
    
    updateVerifyProgress(wordlist) {
        if (!wordlist) return;
        const progEl = document.getElementById('ai-verify-progress');
        const words = wordlist.words || [];
        
        // 使用新的teacherReview模块获取审核进度
        const user = auth.getCurrentUser();
        let approvedCount = 0;
        
        if (teacherReview && teacherReview.state && teacherReview.state.reviewedSentences) {
            approvedCount = teacherReview.getApprovedCount();
        } else {
            // 回退到旧的核验方式
            approvedCount = words.filter(w => this._verificationSimple && this._verificationSimple[w]).length;
        }
        
        if (progEl) progEl.innerText = `核验完成度：${approvedCount}/${words.length}`;
    },

    /**
     * 关闭AI模态框
     */
    closeAIModal() {
        const modal = document.getElementById('modal-ai');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
        this.currentAIWordlistId = null;
    },

    /**
     * 发布AI任务
     * 支持多任务类型选择和截止时间设置
     */
    publishAITask() {
        if (!this.currentAIWordlistId) {
            helpers.showToast('请先选择词表！', 'warning');
            return;
        }

        // 获取截止时间（必填）
        const deadlineDateEl = document.getElementById('ai-task-deadline-date');
        const deadlineTimeEl = document.getElementById('ai-task-deadline-time');
        const deadlineDate = deadlineDateEl?.value;
        const deadlineTime = deadlineTimeEl?.value || '23:59';
        
        // 验证截止时间
        if (!deadlineDate) {
            helpers.showToast('请设置截止时间！', 'warning');
            deadlineDateEl?.focus();
            return;
        }
        
        const deadline = new Date(`${deadlineDate}T${deadlineTime}`).getTime();
        
        // 检查截止时间是否在未来
        if (deadline < Date.now()) {
            helpers.showToast('截止时间不能早于当前时间！', 'warning');
            return;
        }

        const wordlist = db.findWordList(this.currentAIWordlistId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }
        
        const user = auth.getCurrentUser();
        if (!user) {
            helpers.showToast('请先登录！', 'error');
            return;
        }

        const analysis = this._aiAnalysisResult || {};
        const materials = analysis.materials || {};
        
        // 检查素材是否就绪
        const allWordsCount = wordlist.words.length;
        
        if (!(Array.isArray(materials.context) && materials.context.length === allWordsCount)) {
            helpers.showToast('检测素材未就绪，请先完成AI分析生成。', 'warning');
            return;
        }

        // 默认使用所有检测模式（语境、拼写、匹配）
        const taskTypes = ['context', 'spelling', 'matching'];
        const selectedTypeNames = '语境选择、听音拼写、词义匹配';

        // 获取该教师的所有学生
        const allStudents = db.getStudentsByTeacher(user.id);
        const assignedStudents = allStudents.map(s => s.id);
        
        // 调试
        console.log('=== Publish Task Debug ===');
        console.log('Teacher ID:', user.id);
        console.log('All students:', allStudents.map(s => ({ id: s.id, name: s.name, class: s.class, teacherId: s.teacherId })));
        console.log('Assigned student IDs:', assignedStudents);
        
        if (assignedStudents.length === 0) {
            helpers.showToast('您还没有学生，请先添加学生！', 'warning');
            return;
        }

        // 在发布任务前，先将AI生成的例句更新到词库
        const updatedCount = db.batchUpdateWordSentences(materials);
        console.log(`已更新 ${updatedCount} 个单词的例句到词库`);

        db.addTask({
            teacherId: user.id,
            title: `AI智能检测：${wordlist.title}`,
            wordListId: wordlist.id,
            wordListTitle: wordlist.title,
            type: 'test',
            taskTypes: taskTypes,
            taskTypeNames: selectedTypeNames,
            deadline: deadline,
            assignedStudents: assignedStudents,
            aiAnalysis: analysis,
            aiMaterials: { context: materials.context, spelling: materials.spelling, matching: materials.matching, flashcard: materials.flashcard }
        });

        this.closeAIModal();
        this.renderTasks();
        
        const typeCount = taskTypes.length;
        const deadlineMsg = deadline ? `，截止时间：${deadlineDate}` : '';
        helpers.showToast(`检测任务已发布给${assignedStudents.length}名学生！包含${typeCount}种检测模式${deadlineMsg}`, 'success');
    },

    /**
     * 显示已有的素材
     */
    showExistingMaterials(wordlist, existingReview) {
        const modal = document.getElementById('modal-ai');
        const loading = document.getElementById('ai-loading');
        const result = document.getElementById('ai-result');
        const subtitle = document.getElementById('ai-modal-subtitle');
        
        if (subtitle) subtitle.textContent = `${wordlist.title} · ${wordlist.words.length} 个单词`;
        
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        loading.classList.add('hidden');
        result.classList.remove('hidden');
        
        // 从审核记录重建素材
        const materials = {
            context: [],
            spelling: [],
            matching: [],
            flashcard: []
        };
        
        Object.values(existingReview.sentences).forEach(data => {
            materials.context.push({
                word: data.word,
                sentence: data.sentence,
                options: data.options,
                correctIndex: data.correctIndex
            });
            materials.spelling.push({
                word: data.word,
                phonetic: data.phonetic,
                audio: ''
            });
            materials.matching.push({
                word: data.word,
                meaning: data.meaning,
                options: [data.meaning, '选项2', '选项3', '选项4'],
                correctIndex: 0
            });
            materials.flashcard.push({
                word: data.word,
                phonetic: data.phonetic,
                meaning: data.meaning,
                sentence: data.sentence.replace('___', data.word)
            });
        });
        
        this._aiAnalysisResult = {
            materials: materials,
            conditions: {
                contextOk: materials.context.length === wordlist.words.length,
                spellingOk: materials.spelling.length === wordlist.words.length,
                matchingOk: materials.matching.length === wordlist.words.length,
                flashcardOk: materials.flashcard.length === wordlist.words.length,
                coverageRate: 100
            },
            difficulty: 'medium',
            recommendedModes: ['context', 'spelling'],
            suggestedDuration: Math.ceil(wordlist.words.length * 0.5),
            analysis: `使用已审核的素材（${materials.context.length}个单词）`
        };
        
        // 初始化teacherReview状态
        const grade = wordlist.grade || 'middle';
        teacherReview.initReviewSession(wordlist.id, wordlist.words, grade);
        teacherReview.state.reviewedSentences = existingReview.sentences;
        
        this.updateAIResultDisplay(this._aiAnalysisResult, wordlist);
        this.switchAITab('overview');
        
        helpers.showToast('已加载已审核的素材', 'success');
    },

    /**
     * 一键导入核验 - 将AI生成的素材导入到核验界面
     */
    batchImportToReview() {
        const wordlist = db.findWordList(this.currentAIWordlistId);
        if (!wordlist) return;
        
        // 获取当前AI生成的素材
        const materials = this._aiAnalysisResult?.materials;
        if (!materials || !materials.context) {
            helpers.showToast('暂无素材可导入', 'warning');
            return;
        }
        
        // 确认对话框
        if (!confirm(`确定要将AI生成的 ${materials.context.length} 个素材导入到核验界面吗？\n\n这将覆盖核验界面中已有的旧数据。`)) {
            return;
        }
        
        // 初始化teacherReview，传入AI生成的素材
        const grade = wordlist.grade || 'middle';
        teacherReview.initReviewSessionWithMaterials(
            this.currentAIWordlistId, 
            wordlist.words, 
            grade,
            materials
        );
        
        helpers.showToast(`已将 ${materials.context.length} 个素材导入核验界面！`, 'success');
        
        // 自动切换到核验标签
        this.switchAITab('verify');
    },

    /**
     * 一键通过所有核验（保留旧方法供核验界面使用）
     */
    batchApproveAll() {
        const wordlist = db.findWordList(this.currentAIWordlistId);
        if (!wordlist) return;
        
        // 确认对话框
        if (!confirm('确定要一键通过所有素材的核验吗？\n\n通过后可直接进入发布环节。')) {
            return;
        }
        
        // 初始化teacherReview（如果还没有）
        const grade = wordlist.grade || 'middle';
        if (!teacherReview.state.currentWordlistId) {
            teacherReview.initReviewSession(this.currentAIWordlistId, wordlist.words, grade);
        }
        
        // 获取当前素材
        const materials = this._aiAnalysisResult?.materials;
        if (!materials || !materials.context) {
            helpers.showToast('暂无素材可核验', 'warning');
            return;
        }
        
        // 批量审核通过
        materials.context.forEach((item, idx) => {
            const word = item.word;
            if (!teacherReview.state.reviewedSentences[word]) {
                // 创建新的审核数据
                teacherReview.state.reviewedSentences[word] = {
                    word: word,
                    sentence: item.sentence,
                    meaning: materials.flashcard?.[idx]?.meaning || '',
                    pos: 'noun',
                    phonetic: materials.flashcard?.[idx]?.phonetic || `/${word}/`,
                    options: item.options,
                    correctIndex: item.correctIndex,
                    status: 'approved',
                    reviewedAt: Date.now(),
                    reviewerId: auth.getCurrentUser()?.id,
                    isBatchApproved: true
                };
            } else {
                // 更新现有数据
                teacherReview.state.reviewedSentences[word].status = 'approved';
                teacherReview.state.reviewedSentences[word].reviewedAt = Date.now();
                teacherReview.state.reviewedSentences[word].isBatchApproved = true;
            }
        });
        
        teacherReview.state.isModified = true;
        teacherReview.saveReviewedSentences();
        
        // 刷新显示
        this.updateAIResultDisplay(this._aiAnalysisResult, wordlist);
        
        helpers.showToast(`已批量通过 ${materials.context.length} 个素材的核验！`, 'success');
        
        // 自动切换到发布标签
        setTimeout(() => {
            this.switchAITab('publish');
        }, 500);
    },

    /**
     * 导出Excel
     */
    exportExcel() {
        const user = auth.getCurrentUser();
        const logs = db.getLearningLogsByTeacher(user.id);
        
        if (logs.length === 0) {
            helpers.showToast('暂无可导出的数据！', 'warning');
            return;
        }

        const rows = [
            ['记录日期', '所属班级', '学生姓名', '当日新学单词数', '复习单词数', '综合正确率(%)', '薄弱词汇']
        ];

        logs.forEach(log => {
            const student = db.findStudent(log.studentId);
            if (student) {
                rows.push([
                    log.date,
                    student.class,
                    student.name,
                    log.learnedCount,
                    log.reviewCount,
                    log.correctRate,
                    log.weakWord
                ]);
            }
        });

        const filename = `学生学情明细_${helpers.getTodayDate()}.csv`;
        helpers.exportCSV(filename, rows);
        helpers.showToast('导出成功！', 'success');
    },

    /**
     * 显示创建任务模态框
     */
    showCreateTaskModal() {
        const modal = document.getElementById('modal-create-task');
        const user = auth.getCurrentUser();
        
        // 加载词表选项
        const wordlists = db.getWordListsByTeacher(user.id);
        const wordlistSelect = document.getElementById('new-task-wordlist');
        wordlistSelect.innerHTML = '<option value="">请选择词表</option>';
        wordlists.forEach(wl => {
            const option = document.createElement('option');
            option.value = wl.id;
            option.textContent = wl.title;
            wordlistSelect.appendChild(option);
        });
        
        // 加载学生列表
        const students = db.getStudentsByTeacher(user.id);
        const studentsContainer = document.getElementById('new-task-students');
        studentsContainer.innerHTML = '';
        students.forEach(s => {
            const div = document.createElement('div');
            div.className = 'flex items-center';
            div.innerHTML = `
                <input type="checkbox" id="task-student-${s.id}" value="${s.id}" class="mr-2 rounded border-slate-300">
                <label for="task-student-${s.id}" class="text-sm text-slate-700">${s.class} - ${s.name}</label>
            `;
            studentsContainer.appendChild(div);
        });
        
        // 设置默认截止时间为7天后
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        document.getElementById('new-task-deadline').value = deadline.toISOString().split('T')[0];
        
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 隐藏创建任务模态框
     */
    hideCreateTaskModal() {
        const modal = document.getElementById('modal-create-task');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            // 清空表单
            document.getElementById('new-task-title').value = '';
            document.getElementById('new-task-wordlist').value = '';
            document.getElementById('new-task-students').innerHTML = '';
        }, 300);
    },

    /**
     * 确认创建任务
     */
    confirmCreateTask() {
        const title = document.getElementById('new-task-title').value.trim();
        const wordlistId = document.getElementById('new-task-wordlist').value;
        const deadline = document.getElementById('new-task-deadline').value;
        
        // 获取选中的任务类型（多选）
        const typeCheckboxes = document.querySelectorAll('input[name="task-type"]:checked');
        const taskTypes = Array.from(typeCheckboxes).map(cb => cb.value);
        
        // 获取选中的学生
        const checkboxes = document.querySelectorAll('#new-task-students input[type="checkbox"]:checked');
        const assignedStudents = Array.from(checkboxes).map(cb => cb.value);
        
        if (!title) {
            helpers.showToast('请填写任务名称', 'warning');
            return;
        }
        if (!wordlistId) {
            helpers.showToast('请选择词表', 'warning');
            return;
        }
        if (taskTypes.length === 0) {
            helpers.showToast('请至少选择一种任务类型', 'warning');
            return;
        }
        if (assignedStudents.length === 0) {
            helpers.showToast('请至少选择一个学生', 'warning');
            return;
        }
        
        const user = auth.getCurrentUser();
        const wordlist = db.findWordList(wordlistId);
        
        // 创建任务 - 支持多种类型
        const task = {
            id: 'task_' + Date.now(),
            teacherId: user.id,
            title: title,
            wordListId: wordlistId,
            wordListTitle: wordlist ? wordlist.title : '',
            type: taskTypes.length > 1 ? 'mixed' : taskTypes[0], // 混合类型或单一类型
            taskTypes: taskTypes, // 存储所有选中的类型
            status: 'active',
            assignedStudents: assignedStudents,
            deadline: deadline ? new Date(deadline).getTime() : null,
            createdAt: Date.now()
        };
        
        db.addTask(task);
        
        this.hideCreateTaskModal();
        this.renderTasks();
        helpers.showToast('任务创建成功！', 'success');
    },

    /**
     * 显示添加学生模态框
     */
    showAddStudentModal() {
        const modal = document.getElementById('modal-add-student');
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
        }
        // 清空输入
        const namesInput = document.getElementById('new-student-names');
        const classInput = document.getElementById('new-student-class');
        if (namesInput) namesInput.value = '';
        if (classInput) classInput.value = '';
        // 隐藏预览
        this.hideStudentImportPreview();
        // 添加输入监听
        if (namesInput) {
            namesInput.oninput = () => this.previewStudentImport();
        }
    },

    /**
     * 隐藏添加学生模态框
     */
    hideAddStudentModal() {
        const modal = document.getElementById('modal-add-student');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    },

    /**
     * 预览学生导入
     */
    previewStudentImport() {
        const namesText = document.getElementById('new-student-names')?.value.trim() || '';
        const previewDiv = document.getElementById('student-import-preview');
        const countSpan = document.getElementById('student-preview-count');
        const listDiv = document.getElementById('student-preview-list');
        
        if (!namesText) {
            this.hideStudentImportPreview();
            return;
        }
        
        // 解析姓名（每行一个）
        const names = namesText.split('\n').map(n => n.trim()).filter(n => n);
        
        if (names.length === 0) {
            this.hideStudentImportPreview();
            return;
        }
        
        if (countSpan) countSpan.innerText = names.length;
        if (listDiv) {
            listDiv.innerHTML = names.slice(0, 10).join('、') + (names.length > 10 ? ` ...等${names.length}人` : '');
        }
        if (previewDiv) previewDiv.classList.remove('hidden');
    },

    /**
     * 隐藏学生导入预览
     */
    hideStudentImportPreview() {
        const previewDiv = document.getElementById('student-import-preview');
        if (previewDiv) previewDiv.classList.add('hidden');
    },

    /**
     * 批量保存新学生
     */
    saveNewStudents() {
        const namesText = document.getElementById('new-student-names')?.value.trim();
        const className = document.getElementById('new-student-class')?.value.trim();
        
        if (!className) {
            helpers.showToast('请填写班级！', 'warning');
            return;
        }
        
        if (!namesText) {
            helpers.showToast('请填写学生姓名列表！', 'warning');
            return;
        }
        
        // 解析姓名（每行一个）
        const names = namesText.split('\n').map(n => n.trim()).filter(n => n);
        
        if (names.length === 0) {
            helpers.showToast('未找到有效的学生姓名！', 'warning');
            return;
        }
        
        const user = auth.getCurrentUser();
        let added = 0;
        let skipped = 0;
        
        names.forEach(name => {
            // 检查是否已存在
            const existing = db.findStudentByClassAndName(className, name);
            if (existing) {
                skipped++;
                return;
            }
            
            const student = {
                id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                teacherId: user.id,
                name: name,
                class: className,
                coins: 0,
                badges: [],
                streak: 0,
                totalLearned: 0,
                totalTests: 0,
                totalCorrect: 0,
                totalQuestions: 0
            };
            
            db.addStudent(student);
            added++;
        });
        
        this.hideAddStudentModal();
        this.renderStudents();
        
        let msg = `成功添加 ${added} 名学生！`;
        if (skipped > 0) msg += ` (${skipped}名已存在)`;
        helpers.showToast(msg, 'success');
    },

    /**
     * 导出学习日志
     */
    exportLearningLogs() {
        const user = auth.getCurrentUser();
        const logs = db.getLearningLogsByTeacher(user.id);
        const dateFilter = document.getElementById('export-date-range')?.value || 'all';
        const today = helpers.getTodayDate();
        
        let filteredLogs = logs;
        if (dateFilter === 'today') {
            filteredLogs = logs.filter(l => l.date === today);
        } else if (dateFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filteredLogs = logs.filter(l => new Date(l.date) >= weekAgo);
        }
        
        const rows = [['日期', '班级', '姓名', '新学', '复习', '正确率', '难词']];
        filteredLogs.forEach(log => {
            const student = db.findStudent(log.studentId);
            rows.push([
                log.date,
                student ? student.class : '-',
                student ? student.name : '-',
                log.learnedCount || 0,
                log.reviewCount || 0,
                (log.correctRate || 0) + '%',
                log.weakWord || ''
            ]);
        });
        
        const filename = `学情数据_${helpers.getTodayDate()}.csv`;
        helpers.exportCSV(filename, rows);
        helpers.showToast('导出成功！', 'success');
    }
};

// 监听日期筛选变化
document.addEventListener('DOMContentLoaded', () => {
    const dateRange = document.getElementById('export-date-range');
    if (dateRange) {
        dateRange.addEventListener('change', () => {
            if (teacher.currentTab === 'tab-stats') {
                teacher.renderStats();
            }
        });
    }
});
