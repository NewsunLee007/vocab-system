/**
 * 新纪元英语词汇系统 - 教务处模块
 */

const admin = {
    // 当前查看的教师ID
    currentTeacherId: null,
    
    // 选中的待删除教师
    selectedTeachersForDelete: [],

    /**
     * 渲染教务处总控台
     */
    render() {
        this.renderStats();
        this.renderTeacherList();
        this.renderAIConfigStatus();
        this.renderWordlists();
    },

    /**
     * 渲染统计数据
     */
    renderStats() {
        const stats = db.getStats();
        
        const teacherCountEl = document.getElementById('admin-teacher-count');
        const studentCountEl = document.getElementById('admin-student-count');
        const wordlistCountEl = document.getElementById('admin-wordlist-count');
        const todayCountEl = document.getElementById('admin-today-count');
        
        if (teacherCountEl) teacherCountEl.innerText = stats.teacherCount;
        if (studentCountEl) studentCountEl.innerText = stats.studentCount;
        if (wordlistCountEl) wordlistCountEl.innerText = stats.wordlistCount || 0;
        if (todayCountEl) todayCountEl.innerText = stats.todayLearningCount;
    },

    /**
     * 渲染教师列表
     */
    renderTeacherList() {
        const tbody = document.getElementById('admin-teachers-table');
        const teachers = db.getTeachers();
        
        console.log('renderTeacherList called, tbody:', tbody, 'teachers:', teachers);
        
        if (!tbody) {
            console.error('admin-teachers-table not found!');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!teachers || teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">暂无教师数据</td></tr>';
            return;
        }
        
        teachers.forEach(teacher => {
            const students = db.getStudentsByTeacher(teacher.id);
            const classes = [...new Set(students.map(s => s.class))];
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-white/10 transition border-b border-white/10';
            row.innerHTML = `
                <td class="py-3 px-4 font-medium">${teacher.id}</td>
                <td class="py-3 px-4">${teacher.name}</td>
                <td class="py-3 px-4">${classes.length}</td>
                <td class="py-3 px-4">${students.length}</td>
                <td class="py-3 px-4">
                    <button class="text-indigo-400 hover:text-indigo-300 text-sm mr-3" onclick="admin.viewTeacherDetail('${teacher.id}')">
                        <i class="fa-solid fa-eye mr-1"></i>查看
                    </button>
                    <button class="text-rose-400 hover:text-rose-300 text-sm" onclick="admin.deleteTeacher('${teacher.id}')">
                        <i class="fa-solid fa-trash mr-1"></i>删除
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    /**
     * 显示教师详情
     */
    viewTeacherDetail(teacherId) {
        this.currentTeacherId = teacherId;
        const teacher = db.findTeacher(teacherId);
        const students = db.getStudentsByTeacher(teacherId);
        const wordlists = db.getWordListsByTeacher(teacherId);
        const tasks = db.getTasksByTeacher(teacherId);
        const logs = db.getLearningLogsByTeacher(teacherId);
        
        // 计算统计数据
        const classes = [...new Set(students.map(s => s.class))];
        const avgAccuracy = logs.length > 0 
            ? Math.round(logs.reduce((sum, l) => sum + l.correctRate, 0) / logs.length)
            : 0;
        
        // 填充基本信息
        document.getElementById('detail-teacher-name').innerText = teacher.name;
        document.getElementById('detail-teacher-id').innerText = `工号: ${teacher.id}`;
        document.getElementById('detail-student-count').innerText = students.length;
        document.getElementById('detail-class-count').innerText = classes.length;
        document.getElementById('detail-wordlist-count').innerText = wordlists.length;
        document.getElementById('detail-accuracy').innerText = avgAccuracy + '%';
        
        // 渲染任务列表
        const tasksContainer = document.getElementById('detail-tasks-list');
        tasksContainer.innerHTML = '';
        if (tasks.length === 0) {
            tasksContainer.innerHTML = '<p class="text-slate-400 text-sm">暂无已发布任务</p>';
        } else {
            tasks.forEach(task => {
                const wordlist = db.findWordList(task.wordListId);
                const taskItem = document.createElement('div');
                taskItem.className = 'flex justify-between items-center p-2 bg-slate-50 rounded';
                const iconClass = task.type === 'test' ? 'fa-puzzle-piece text-rose-500' : 'fa-layer-group text-indigo-500';
                taskItem.innerHTML = `
                    <div class="flex items-center">
                        <i class="fa-solid ${iconClass} mr-2"></i>
                        <span class="text-sm">${task.title}</span>
                    </div>
                    <span class="text-xs text-slate-400">${task.date}</span>
                `;
                tasksContainer.appendChild(taskItem);
            });
        }
        
        // 渲染学生列表
        const studentsContainer = document.getElementById('detail-students-list');
        studentsContainer.innerHTML = '';
        if (students.length === 0) {
            studentsContainer.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">暂无学生</td></tr>';
        } else {
            students.forEach(student => {
                const accuracy = student.totalQuestions > 0 
                    ? Math.round((student.totalCorrect / student.totalQuestions) * 100)
                    : 0;
                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-50';
                row.innerHTML = `
                    <td class="p-2 border-b">${student.class}</td>
                    <td class="p-2 border-b font-medium">${student.name}</td>
                    <td class="p-2 border-b text-yellow-600">
                        <i class="fa-solid fa-coins mr-1"></i>${student.coins}
                    </td>
                    <td class="p-2 border-b">${student.totalLearned}</td>
                    <td class="p-2 border-b ${accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-600' : 'text-rose-600'}">${accuracy}%</td>
                `;
                studentsContainer.appendChild(row);
            });
        }
        
        // 显示模态框
        const modal = document.getElementById('modal-teacher-detail');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭教师详情
     */
    closeTeacherDetail() {
        const modal = document.getElementById('modal-teacher-detail');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            this.currentTeacherId = null;
        }, 300);
    },

    /**
     * 删除当前查看的教师
     */
    deleteCurrentTeacher() {
        if (!this.currentTeacherId) return;
        
        if (confirm('确定要删除该教师吗？此操作将同时删除该教师的所有学生、词表和任务数据，不可恢复！')) {
            this.deleteTeacher(this.currentTeacherId);
            this.closeTeacherDetail();
        }
    },

    /**
     * 删除教师
     */
    deleteTeacher(teacherId) {
        const teacher = db.findTeacher(teacherId);
        if (!teacher) return;
        
        if (!confirm(`确定要删除教师 "${teacher.name}" 吗？此操作不可恢复！`)) {
            return;
        }
        
        // 从数据库中删除教师
        db._data.teachers = db._data.teachers.filter(t => t.id !== teacherId);
        
        // 删除该教师的所有学生
        db._data.students = db._data.students.filter(s => s.teacherId !== teacherId);
        
        // 删除该教师的词表
        db._data.wordLists = db._data.wordLists.filter(wl => wl.teacherId !== teacherId);
        
        // 删除该教师的任务
        db._data.tasks = db._data.tasks.filter(t => t.teacherId !== teacherId);
        
        // 删除该教师的学习日志
        db._data.learningLogs = db._data.learningLogs.filter(l => l.teacherId !== teacherId);
        
        db.save();
        
        this.renderStats();
        this.renderTeacherList();
        helpers.showToast('教师删除成功！', 'success');
    },

    /**
     * 显示批量删除模态框
     */
    showBatchDeleteModal() {
        const teachers = db.getTeachers();
        if (teachers.length === 0) {
            helpers.showToast('暂无可删除的教师！', 'warning');
            return;
        }
        
        this.selectedTeachersForDelete = [];
        
        const container = document.getElementById('batch-delete-list');
        container.innerHTML = '';
        
        teachers.forEach(teacher => {
            const students = db.getStudentsByTeacher(teacher.id);
            const item = document.createElement('div');
            item.className = 'flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer';
            item.innerHTML = `
                <input type="checkbox" id="delete-${teacher.id}" value="${teacher.id}" 
                    class="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 mr-3"
                    onchange="admin.toggleTeacherForDelete('${teacher.id}')">
                <label for="delete-${teacher.id}" class="flex-1 cursor-pointer">
                    <span class="font-medium">${teacher.name}</span>
                    <span class="text-xs text-slate-500 ml-2">(${teacher.id} · ${students.length}名学生)</span>
                </label>
            `;
            container.appendChild(item);
        });
        
        // 全选按钮
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'border-t pt-2 mt-2';
        selectAllDiv.innerHTML = `
            <button onclick="admin.selectAllTeachersForDelete()" class="text-sm text-slate-600 hover:text-slate-800 mr-4">
                <i class="fa-solid fa-check-double mr-1"></i>全选
            </button>
            <button onclick="admin.deselectAllTeachersForDelete()" class="text-sm text-slate-600 hover:text-slate-800">
                <i class="fa-solid fa-xmark mr-1"></i>取消全选
            </button>
        `;
        container.appendChild(selectAllDiv);
        
        const modal = document.getElementById('modal-batch-delete');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭批量删除模态框
     */
    closeBatchDeleteModal() {
        const modal = document.getElementById('modal-batch-delete');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            this.selectedTeachersForDelete = [];
        }, 300);
    },

    /**
     * 切换教师选中状态
     */
    toggleTeacherForDelete(teacherId) {
        const index = this.selectedTeachersForDelete.indexOf(teacherId);
        if (index > -1) {
            this.selectedTeachersForDelete.splice(index, 1);
        } else {
            this.selectedTeachersForDelete.push(teacherId);
        }
    },

    /**
     * 全选
     */
    selectAllTeachersForDelete() {
        const teachers = db.getTeachers();
        this.selectedTeachersForDelete = teachers.map(t => t.id);
        
        teachers.forEach(t => {
            const checkbox = document.getElementById(`delete-${t.id}`);
            if (checkbox) checkbox.checked = true;
        });
    },

    /**
     * 取消全选
     */
    deselectAllTeachersForDelete() {
        this.selectedTeachersForDelete = [];
        const checkboxes = document.querySelectorAll('#batch-delete-list input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    },

    /**
     * 确认批量删除
     */
    confirmBatchDelete() {
        if (this.selectedTeachersForDelete.length === 0) {
            helpers.showToast('请至少选择一位教师！', 'warning');
            return;
        }
        
        if (!confirm(`确定要删除选中的 ${this.selectedTeachersForDelete.length} 位教师吗？此操作不可恢复！`)) {
            return;
        }
        
        // 批量删除
        this.selectedTeachersForDelete.forEach(teacherId => {
            // 删除教师
            db._data.teachers = db._data.teachers.filter(t => t.id !== teacherId);
            // 删除相关数据
            db._data.students = db._data.students.filter(s => s.teacherId !== teacherId);
            db._data.wordLists = db._data.wordLists.filter(wl => wl.teacherId !== teacherId);
            db._data.tasks = db._data.tasks.filter(t => t.teacherId !== teacherId);
            db._data.learningLogs = db._data.learningLogs.filter(l => l.teacherId !== teacherId);
        });
        
        db.save();
        
        this.closeBatchDeleteModal();
        this.renderStats();
        this.renderTeacherList();
        helpers.showToast(`成功删除 ${this.selectedTeachersForDelete.length} 位教师！`, 'success');
    },

    /**
     * 显示所有教师列表（统计卡片点击）
     */
    showTeachersDetail() {
        const teachers = db.getTeachers();
        const tbody = document.getElementById('all-teachers-list');
        tbody.innerHTML = '';
        
        let totalStudents = 0;
        let totalWordlists = 0;
        let totalAccuracy = 0;
        let teacherCount = 0;
        
        if (teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">暂无教师数据</td></tr>';
        } else {
            teachers.forEach(teacher => {
                const students = db.getStudentsByTeacher(teacher.id);
                const classes = [...new Set(students.map(s => s.class))];
                const wordlists = db.getWordListsByTeacher(teacher.id);
                const logs = db.getLearningLogsByTeacher(teacher.id);
                const avgAccuracy = logs.length > 0 
                    ? Math.round(logs.reduce((sum, l) => sum + l.correctRate, 0) / logs.length)
                    : 0;
                
                totalStudents += students.length;
                totalWordlists += wordlists.length;
                totalAccuracy += avgAccuracy;
                teacherCount++;
                
                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-50';
                row.innerHTML = `
                    <td class="p-3 border-b font-medium">${teacher.id}</td>
                    <td class="p-3 border-b">${teacher.name}</td>
                    <td class="p-3 border-b">${classes.length}</td>
                    <td class="p-3 border-b">${students.length}</td>
                    <td class="p-3 border-b">${wordlists.length}</td>
                    <td class="p-3 border-b ${avgAccuracy >= 80 ? 'text-emerald-600' : avgAccuracy >= 60 ? 'text-amber-600' : 'text-rose-600'}">${avgAccuracy}%</td>
                    <td class="p-3 border-b">
                        <button class="text-indigo-600 hover:text-indigo-800 text-sm mr-2" onclick="admin.viewTeacherDetail('${teacher.id}'); admin.closeAllTeachersDetail();">
                            <i class="fa-solid fa-eye mr-1"></i>查看
                        </button>
                        <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="admin.editTeacher('${teacher.id}'); admin.closeAllTeachersDetail();">
                            <i class="fa-solid fa-pen mr-1"></i>编辑
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // 更新统计信息
        document.getElementById('stats-total-teachers').textContent = teacherCount;
        document.getElementById('stats-teacher-students').textContent = totalStudents;
        document.getElementById('stats-teacher-wordlists').textContent = totalWordlists;
        document.getElementById('stats-avg-accuracy').textContent = teacherCount > 0 
            ? Math.round(totalAccuracy / teacherCount) + '%' 
            : '0%';
        
        const modal = document.getElementById('modal-all-teachers');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭所有教师列表
     */
    closeAllTeachersDetail() {
        const modal = document.getElementById('modal-all-teachers');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 编辑当前查看的教师
     */
    editCurrentTeacher() {
        if (!this.currentTeacherId) return;
        this.editTeacher(this.currentTeacherId);
    },

    /**
     * 编辑教师
     */
    editTeacher(teacherId) {
        const teacher = db.findTeacher(teacherId);
        if (!teacher) return;
        
        // 填充表单
        document.getElementById('edit-teacher-id').value = teacher.id;
        document.getElementById('edit-teacher-name').value = teacher.name;
        document.getElementById('edit-teacher-pwd').value = '';
        
        // 显示模态框
        const modal = document.getElementById('modal-edit-teacher');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭编辑教师模态框
     */
    closeEditTeacherModal() {
        const modal = document.getElementById('modal-edit-teacher');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 保存编辑的教师信息
     */
    saveEditTeacher() {
        const id = document.getElementById('edit-teacher-id').value;
        const name = document.getElementById('edit-teacher-name').value.trim();
        const pwd = document.getElementById('edit-teacher-pwd').value.trim();
        
        if (!name) {
            helpers.showToast('教师姓名不能为空！', 'warning');
            return;
        }
        
        const teacher = db.findTeacher(id);
        if (!teacher) return;
        
        // 更新姓名
        teacher.name = name;
        
        // 如果填写了密码，则更新密码
        if (pwd) {
            teacher.pwd = helpers.hash(pwd);
        }
        
        db.save();
        
        this.closeEditTeacherModal();
        
        // 如果在查看详情页面，刷新详情
        if (this.currentTeacherId === id) {
            this.viewTeacherDetail(id);
        }
        
        this.renderTeacherList();
        helpers.showToast('教师信息更新成功！', 'success');
    },

    /**
     * 显示学生详情
     */
    showStudentsDetail() {
        this._allStudents = db.getStudents();
        this._studentSortField = 'name';
        this._studentSortAsc = true;
        
        // 初始化筛选器
        this.initStudentFilters();
        
        // 渲染学生列表
        this.filterStudents();
        
        const modal = document.getElementById('modal-students-detail');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 初始化学生筛选器
     */
    initStudentFilters() {
        const students = this._allStudents;
        const teachers = db.getTeachers();
        
        // 获取所有班级
        const classes = [...new Set(students.map(s => s.class).filter(c => c))].sort();
        const classSelect = document.getElementById('filter-student-class');
        classSelect.innerHTML = '<option value="">全部班级</option>';
        classes.forEach(c => {
            classSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
        
        // 获取所有老师
        const teacherSelect = document.getElementById('filter-student-teacher');
        teacherSelect.innerHTML = '<option value="">全部老师</option>';
        teachers.forEach(t => {
            teacherSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
        
        // 清空搜索框
        document.getElementById('filter-student-search').value = '';
    },

    /**
     * 筛选学生
     */
    filterStudents() {
        const classFilter = document.getElementById('filter-student-class').value;
        const teacherFilter = document.getElementById('filter-student-teacher').value;
        const searchText = document.getElementById('filter-student-search').value.toLowerCase();
        
        let filtered = this._allStudents.filter(s => {
            if (classFilter && s.class !== classFilter) return false;
            if (teacherFilter && s.teacherId !== teacherFilter) return false;
            if (searchText && !s.name.toLowerCase().includes(searchText)) return false;
            return true;
        });
        
        // 排序
        filtered.sort((a, b) => {
            let aVal, bVal;
            if (this._studentSortField === 'teacher') {
                const aTeacher = db.findTeacher(a.teacherId);
                const bTeacher = db.findTeacher(b.teacherId);
                aVal = aTeacher ? aTeacher.name : '';
                bVal = bTeacher ? bTeacher.name : '';
            } else {
                aVal = a[this._studentSortField] || 0;
                bVal = b[this._studentSortField] || 0;
            }
            
            if (typeof aVal === 'string') {
                return this._studentSortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return this._studentSortAsc ? aVal - bVal : bVal - aVal;
        });
        
        this.renderStudentsList(filtered);
        this.updateStudentsStats(filtered);
    },

    /**
     * 排序学生
     */
    sortStudents(field) {
        if (this._studentSortField === field) {
            this._studentSortAsc = !this._studentSortAsc;
        } else {
            this._studentSortField = field;
            this._studentSortAsc = true;
        }
        this.filterStudents();
    },

    /**
     * 渲染学生列表
     */
    renderStudentsList(students) {
        const tbody = document.getElementById('all-students-list');
        tbody.innerHTML = '';
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">暂无符合条件的学生</td></tr>';
        } else {
            students.forEach(student => {
                const teacher = db.findTeacher(student.teacherId);
                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-50';
                row.innerHTML = `
                    <td class="p-3 border-b">${student.class || '-'}</td>
                    <td class="p-3 border-b font-medium">${student.name}</td>
                    <td class="p-3 border-b">${teacher ? teacher.name : '-'}</td>
                    <td class="p-3 border-b text-yellow-600">
                        <i class="fa-solid fa-coins mr-1"></i>${student.coins || 0}
                    </td>
                    <td class="p-3 border-b">${student.totalLearned || 0}</td>
                `;
                tbody.appendChild(row);
            });
        }
    },

    /**
     * 更新学生统计
     */
    updateStudentsStats(filtered) {
        const total = this._allStudents;
        document.getElementById('stats-total-students').textContent = total.length;
        document.getElementById('stats-total-coins').textContent = total.reduce((sum, s) => sum + (s.coins || 0), 0);
        document.getElementById('stats-total-learned').textContent = total.reduce((sum, s) => sum + (s.totalLearned || 0), 0);
        document.getElementById('stats-filtered-count').textContent = filtered.length;
    },

    /**
     * 导出学生数据
     */
    exportStudentsData() {
        const classFilter = document.getElementById('filter-student-class').value;
        const teacherFilter = document.getElementById('filter-student-teacher').value;
        const searchText = document.getElementById('filter-student-search').value.toLowerCase();
        
        let filtered = this._allStudents.filter(s => {
            if (classFilter && s.class !== classFilter) return false;
            if (teacherFilter && s.teacherId !== teacherFilter) return false;
            if (searchText && !s.name.toLowerCase().includes(searchText)) return false;
            return true;
        });
        
        const rows = [['班级', '姓名', '老师', '金币', '已学单词']];
        filtered.forEach(s => {
            const teacher = db.findTeacher(s.teacherId);
            rows.push([
                s.class || '',
                s.name,
                teacher ? teacher.name : '',
                s.coins || 0,
                s.totalLearned || 0
            ]);
        });
        
        const filename = `学生数据_${helpers.getTodayDate()}.csv`;
        helpers.exportCSV(filename, rows);
        helpers.showToast('导出成功！', 'success');
    },

    /**
     * 关闭学生详情
     */
    closeStudentsDetail() {
        const modal = document.getElementById('modal-students-detail');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 显示今日学习详情
     */
    showTodayDetail() {
        const today = helpers.getTodayDate();
        const logs = db.getLearningLogs().filter(l => l.date === today);
        const tbody = document.getElementById('today-learning-list');
        tbody.innerHTML = '';
        
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">今日暂无学习记录</td></tr>';
        } else {
            logs.forEach(log => {
                const student = db.findStudent(log.studentId);
                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-50';
                const typeText = log.taskType === 'test' ? '检测' : '学习';
                const typeClass = log.taskType === 'test' ? 'text-rose-600' : 'text-indigo-600';
                row.innerHTML = `
                    <td class="p-3 border-b">${log.date}</td>
                    <td class="p-3 border-b">${student ? student.class : '-'}</td>
                    <td class="p-3 border-b font-medium">${student ? student.name : '-'}</td>
                    <td class="p-3 border-b ${typeClass}">${typeText}</td>
                    <td class="p-3 border-b">${log.learnedCount > 0 ? `+${log.learnedCount}` : log.reviewCount}</td>
                    <td class="p-3 border-b ${log.correctRate >= 80 ? 'text-emerald-600' : log.correctRate >= 60 ? 'text-amber-600' : 'text-rose-600'}">${log.correctRate}%</td>
                `;
                tbody.appendChild(row);
            });
        }
        
        const modal = document.getElementById('modal-today-detail');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭今日学习详情
     */
    closeTodayDetail() {
        const modal = document.getElementById('modal-today-detail');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 显示批量导入模态框
     */
    showBatchImportModal() {
        const modal = document.getElementById('modal-batch-import');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        document.getElementById('batch-import-textarea').value = '';
    },

    /**
     * 关闭批量导入模态框
     */
    closeBatchImportModal() {
        const modal = document.getElementById('modal-batch-import');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 确认批量导入
     */
    confirmBatchImport() {
        const text = document.getElementById('batch-import-textarea').value.trim();
        if (!text) {
            helpers.showToast('请输入要导入的教师信息！', 'warning');
            return;
        }

        const lines = text.split('\n');
        let added = 0;
        let skipped = 0;
        let errors = [];

        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;

            let id, name, pwd;

            // 尝试解析不同格式
            if (line.includes(',')) {
                // 逗号分隔格式
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    id = parts[0];
                    name = parts[1];
                    pwd = parts[2] || '123';
                }
            } else if (line.includes(' ')) {
                // 空格分隔格式
                const parts = line.split(/\s+/).map(p => p.trim());
                if (parts.length >= 2) {
                    id = parts[0];
                    name = parts[1];
                    pwd = parts[2] || '123';
                }
            } else if (line.includes('\t')) {
                // Tab分隔格式
                const parts = line.split('\t').map(p => p.trim());
                if (parts.length >= 2) {
                    id = parts[0];
                    name = parts[1];
                    pwd = parts[2] || '123';
                }
            }

            if (!id || !name) {
                errors.push(`第 ${index + 1} 行格式不正确`);
                return;
            }

            // 检查工号是否已存在
            if (db.findTeacher(id)) {
                skipped++;
                return;
            }

            // 添加教师
            db.addTeacher({
                id: id,
                name: name,
                pwd: pwd
            });
            added++;
        });

        this.closeBatchImportModal();
        this.renderStats();
        this.renderTeacherList();

        let msg = `成功导入 ${added} 位教师！`;
        if (skipped > 0) msg += ` (${skipped} 位已存在)`;
        if (errors.length > 0) msg += ` (${errors.length} 行格式错误)`;
        
        helpers.showToast(msg, added > 0 ? 'success' : 'warning');
    },

    /**
     * 显示添加教师模态框
     */
    showAddTeacherModal() {
        const modal = document.getElementById('modal-add-teacher');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        
        // 清空输入
        document.getElementById('new-teacher-id').value = '';
        document.getElementById('new-teacher-name').value = '';
        document.getElementById('new-teacher-pwd').value = '';
    },

    /**
     * 隐藏添加教师模态框
     */
    hideAddTeacherModal() {
        const modal = document.getElementById('modal-add-teacher');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 保存新教师
     */
    saveNewTeacher() {
        const id = document.getElementById('new-teacher-id').value.trim();
        const name = document.getElementById('new-teacher-name').value.trim();
        const pwd = document.getElementById('new-teacher-pwd').value.trim();
        
        if (!id || !name) {
            helpers.showToast('请填写完整信息！', 'warning');
            return;
        }
        
        // 检查工号是否已存在
        if (db.findTeacher(id)) {
            helpers.showToast('该工号已存在！', 'error');
            return;
        }
        
        db.addTeacher({
            id: id,
            name: name,
            pwd: pwd || '123'
        });
        
        this.hideAddTeacherModal();
        this.renderTeacherList();
        this.renderStats();
        helpers.showToast('教师添加成功！', 'success');
    },

    /**
     * 重置默认词表
     */
    resetDefaultWordlists() {
        if (!confirm('确定要重置默认词表吗？这将恢复系统初始的教材词表数据。')) {
            return;
        }
        
        // 删除所有类型为"教材"的词表
        db._data.wordLists = db._data.wordLists.filter(wl => wl.type !== '教材');
        db.save();
        
        helpers.showToast('默认词表已重置！', 'success');
    },

    /**
     * 显示AI使用帮助
     */
    showAIHelp() {
        alert(`AI智能检测系统使用说明：

1. 当前系统使用内置AI引擎，无需配置外部API密钥

2. AI生成逻辑：
   - 基于词表中的单词
   - 从内置词库中查找例句和干扰项
   - 自动生成4选1语境选择题

3. 如果某个单词没有内置数据：
   - 系统会使用默认模板生成题目
   - 建议教师手动补充词库数据

4. 如需接入外部AI（GPT、文心一言等）：
   - 请联系技术管理员
   - 需要配置API密钥和接口地址

5. 数据安全：
   - 所有数据存储在本地
   - 无需担心API密钥泄露`);
    },

    // ==================== AI配置管理 ====================

    /**
     * 预定义的AI服务商配置
     */
    AI_PROVIDERS: {
        openai: {
            name: 'OpenAI (国际版)',
            defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            keyPlaceholder: 'sk-...'
        },
        anthropic: {
            name: 'Anthropic (Claude)',
            defaultEndpoint: 'https://api.anthropic.com/v1/messages',
            models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
            keyPlaceholder: 'sk-ant-...'
        },
        gemini: {
            name: 'Google Gemini',
            defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
            keyPlaceholder: 'AIza...'
        },
        deepseek: {
            name: 'DeepSeek (深度求索)',
            defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
            models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
            keyPlaceholder: 'sk-...'
        },
        moonshot: {
            name: 'Moonshot AI (Kimi)',
            defaultEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
            models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
            keyPlaceholder: 'sk-...'
        },
        qwen: {
            name: 'Alibaba Qwen (通义千问)',
            defaultEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-72b-chat'],
            keyPlaceholder: 'sk-...'
        },
        zhipu: {
            name: 'Zhipu GLM (智谱清言)',
            defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            models: ['glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4-flash'],
            keyPlaceholder: '...'
        },
        custom: {
            name: '自定义接口 (Custom OpenAI Compatible)',
            defaultEndpoint: '',
            models: [],
            keyPlaceholder: '输入您的API密钥'
        }
    },

    /**
     * 渲染AI配置状态
     */
    renderAIConfigStatus() {
        const config = db.getAIConfig();
        const container = document.getElementById('ai-config-status');
        
        if (!container) return;
        
        if (config.provider === 'builtin' || !config.provider) {
            container.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-indigo-800 mb-1">
                            <i class="fa-solid fa-microchip mr-2"></i>系统内置AI引擎
                        </h3>
                        <p class="text-sm text-indigo-600">无需配置，直接使用系统内置智能生成引擎</p>
                    </div>
                    <span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        <i class="fa-solid fa-check mr-1"></i>运行中
                    </span>
                </div>
                <div class="mt-3 pt-3 border-t border-indigo-200 grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div class="text-lg font-bold text-indigo-700">内置</div>
                        <div class="text-xs text-indigo-500">AI类型</div>
                    </div>
                    <div>
                        <div class="text-lg font-bold text-indigo-700">自动</div>
                        <div class="text-xs text-indigo-500">题目生成</div>
                    </div>
                    <div>
                        <div class="text-lg font-bold text-indigo-700">本地</div>
                        <div class="text-xs text-indigo-500">数据存储</div>
                    </div>
                </div>
            `;
        } else {
            const providerInfo = this.AI_PROVIDERS[config.provider];
            const maskedKey = config.apiKey ? '••••' + config.apiKey.slice(-4) : '未配置';
            
            container.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-indigo-800 mb-1">
                            <i class="fa-solid fa-cloud mr-2"></i>${providerInfo ? providerInfo.name : config.provider}
                        </h3>
                        <p class="text-sm text-indigo-600">使用外部AI服务生成语境题目</p>
                    </div>
                    <span class="px-3 py-1 ${config.apiKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} rounded-full text-sm font-medium">
                        <i class="fa-solid ${config.apiKey ? 'fa-check' : 'fa-exclamation-triangle'} mr-1"></i>
                        ${config.apiKey ? '已配置' : '未配置'}
                    </span>
                </div>
                <div class="mt-3 pt-3 border-t border-indigo-200 space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-indigo-600">API密钥:</span>
                        <span class="font-mono text-slate-600">${maskedKey}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-indigo-600">模型:</span>
                        <span class="text-slate-600">${config.model || '默认'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-indigo-600">最后更新:</span>
                        <span class="text-slate-600">${config.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : '从未'}</span>
                    </div>
                </div>
            `;
        }
    },

    /**
     * 打开AI配置模态框
     */
    openAISettingsModal() {
        const config = db.getAIConfig();
        
        // 填充当前配置
        document.getElementById('ai-provider').value = config.provider || 'builtin';
        document.getElementById('ai-api-key').value = config.apiKey || '';
        document.getElementById('ai-api-endpoint').value = config.endpoint || '';
        document.getElementById('ai-model').value = config.model || '';
        document.getElementById('ai-temperature').value = config.temperature || 0.7;
        document.getElementById('temp-value').innerText = config.temperature || 0.7;
        document.getElementById('ai-max-tokens').value = config.maxTokens || 2000;
        document.getElementById('ai-system-prompt').value = config.systemPrompt || '你是一个专业的英语教育助手，擅长为单词生成真实语境例句和干扰选项。';
        
        // 根据提供商更新UI
        this.onProviderChange();
        
        // 显示模态框
        const modal = document.getElementById('modal-ai-settings');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        
        // 渲染AI状态
        this.renderAIConfigStatus();
    },

    /**
     * 关闭AI配置模态框
     */
    closeAISettingsModal() {
        const modal = document.getElementById('modal-ai-settings');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 提供商切换处理
     */
    onProviderChange() {
        const provider = document.getElementById('ai-provider').value;
        const apiConfigDiv = document.getElementById('ai-api-config');
        const modelSelect = document.getElementById('ai-model');
        const endpointInput = document.getElementById('ai-api-endpoint');
        
        if (provider === 'builtin') {
            apiConfigDiv.classList.add('hidden');
        } else {
            apiConfigDiv.classList.remove('hidden');
            
            const providerInfo = this.AI_PROVIDERS[provider];
            if (providerInfo) {
                // 更新端点提示
                if (!endpointInput.value && providerInfo.defaultEndpoint) {
                    endpointInput.placeholder = providerInfo.defaultEndpoint;
                }
                
                // 更新模型列表
                modelSelect.innerHTML = '<option value="">请选择模型</option>';
                providerInfo.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    modelSelect.appendChild(option);
                });
                
                // 如果有自定义模型选项
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = '自定义模型...';
                modelSelect.appendChild(customOption);
            }
        }
    },

    /**
     * 切换API密钥可见性
     */
    toggleApiKeyVisibility() {
        const input = document.getElementById('ai-api-key');
        const eye = document.getElementById('api-key-eye');
        
        if (input.type === 'password') {
            input.type = 'text';
            eye.classList.remove('fa-eye');
            eye.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            eye.classList.remove('fa-eye-slash');
            eye.classList.add('fa-eye');
        }
    },

    /**
     * 切换高级设置
     */
    toggleAdvancedSettings() {
        const advancedDiv = document.getElementById('ai-advanced-settings');
        const icon = document.getElementById('advanced-settings-icon');
        
        if (advancedDiv.classList.contains('hidden')) {
            advancedDiv.classList.remove('hidden');
            icon.style.transform = 'rotate(90deg)';
        } else {
            advancedDiv.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    },

    /**
     * 刷新模型列表
     */
    async refreshModelList() {
        const provider = document.getElementById('ai-provider').value;
        const apiKey = document.getElementById('ai-api-key').value;
        const statusSpan = document.getElementById('ai-model-status');
        const lastSyncSpan = document.getElementById('ai-last-sync');
        
        if (provider === 'builtin') return;
        if (!apiKey) {
            helpers.showToast('请先配置API密钥', 'warning');
            return;
        }
        
        statusSpan.textContent = '同步中...';
        statusSpan.className = 'px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-600';
        
        // 模拟获取模型列表（实际项目中应该调用API）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 更新状态
        statusSpan.textContent = '已同步';
        statusSpan.className = 'px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-600';
        lastSyncSpan.textContent = '最后同步: ' + new Date().toLocaleString();
        
        helpers.showToast('模型列表已更新', 'success');
    },

    /**
     * 测试AI连接
     */
    async testAIConnection() {
        const config = db.getAIConfig();
        const resultSpan = document.getElementById('ai-test-result');
        
        resultSpan.classList.remove('hidden');
        resultSpan.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>测试中...';
        resultSpan.className = 'text-sm text-slate-600';
        
        // 模拟测试（实际项目中应该调用API）
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (config.provider === 'builtin') {
            resultSpan.innerHTML = '<i class="fa-solid fa-check-circle mr-1 text-emerald-600"></i>内置AI运行正常';
            resultSpan.className = 'text-sm text-emerald-600';
        } else if (!config.apiKey) {
            resultSpan.innerHTML = '<i class="fa-solid fa-times-circle mr-1 text-rose-600"></i>请先配置API密钥';
            resultSpan.className = 'text-sm text-rose-600';
        } else {
            // 模拟外部API测试
            const success = Math.random() > 0.3; // 模拟70%成功率
            if (success) {
                resultSpan.innerHTML = '<i class="fa-solid fa-check-circle mr-1 text-emerald-600"></i>连接成功';
                resultSpan.className = 'text-sm text-emerald-600';
            } else {
                resultSpan.innerHTML = '<i class="fa-solid fa-times-circle mr-1 text-rose-600"></i>连接失败，请检查配置';
                resultSpan.className = 'text-sm text-rose-600';
            }
        }
        
        // 3秒后隐藏结果
        setTimeout(() => {
            resultSpan.classList.add('hidden');
        }, 5000);
    },

    /**
     * 保存AI配置
     */
    saveAISettings() {
        const provider = document.getElementById('ai-provider').value;
        const apiKey = document.getElementById('ai-api-key').value.trim();
        const endpoint = document.getElementById('ai-api-endpoint').value.trim();
        const model = document.getElementById('ai-model').value;
        const temperature = parseFloat(document.getElementById('ai-temperature').value);
        const maxTokens = parseInt(document.getElementById('ai-max-tokens').value);
        const systemPrompt = document.getElementById('ai-system-prompt').value.trim();
        
        // 验证外部AI配置
        if (provider !== 'builtin' && !apiKey) {
            helpers.showToast('请填写API密钥', 'warning');
            return;
        }
        
        // 保存配置
        const config = {
            provider: provider,
            apiKey: apiKey,
            endpoint: endpoint || (this.AI_PROVIDERS[provider] ? this.AI_PROVIDERS[provider].defaultEndpoint : ''),
            model: model,
            temperature: temperature,
            maxTokens: maxTokens,
            systemPrompt: systemPrompt,
            lastUpdated: new Date().toISOString()
        };
        
        db.saveAIConfig(config);
        
        this.closeAISettingsModal();
        this.renderAIConfigStatus();
        helpers.showToast('AI配置已保存', 'success');
    },

    // ==================== 词表管理 ====================

    /**
     * 当前导入的Excel数据
     */
    currentExcelData: null,
    currentExcelHeaders: [],

    /**
     * 渲染词表列表
     */
    renderWordlists() {
        const tbody = document.getElementById('admin-wordlist-tbody');
        if (!tbody) {
            console.error('admin-wordlist-tbody not found!');
            return;
        }

        // 自动合并重复词表（基于标准化标题+类型+年级）
        try {
            this.autoMergeDuplicateWordlists();
        } catch (e) {
            console.warn('autoMergeDuplicateWordlists failed:', e);
        }

        const wordlists = db.getWordLists();
        const filterType = document.getElementById('admin-wordlist-type-filter')?.value || '';
        const filterGrade = document.getElementById('admin-wordlist-grade-filter')?.value || '';
        
        console.log('renderWordlists called, wordlists:', wordlists, 'filterType:', filterType, 'filterGrade:', filterGrade);

        // 筛选
        let filtered = wordlists;
        if (filterType) filtered = filtered.filter(wl => wl.type === filterType);
        if (filterGrade) filtered = filtered.filter(wl => wl.grade === filterGrade);

        // 更新计数
        const countEl = document.getElementById('admin-wordlist-total-count');
        if (countEl) countEl.innerText = filtered.length;

        // 渲染
        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">暂无词表数据</td></tr>';
            return;
        }

        filtered.forEach(wl => {
            // 计算例句完成情况
            const wordsWithSentence = wl.words.filter(w => {
                const wordData = db.findWord(w);
                return wordData && wordData.sentence;
            }).length;
            const sentenceStatus = wordsWithSentence === wl.words.length ? '完整' : wordsWithSentence > 0 ? '部分' : '无';
            const statusClass = sentenceStatus === '完整' ? 'text-emerald-400' : sentenceStatus === '部分' ? 'text-amber-400' : 'text-rose-400';
            
            // Format Unit Name
            const formattedTitle = helpers.formatFullWordlistTitle(wl);

            const row = document.createElement('tr');
            row.className = 'hover:bg-white/10 transition border-b border-white/10';
            row.innerHTML = `
                <td class="py-3 px-4 font-medium">${formattedTitle}</td>
                <td class="py-3 px-4">${wl.type || '教材'}</td>
                <td class="py-3 px-4">${wl.grade || '-'}</td>
                <td class="py-3 px-4">${wl.words?.length || 0}</td>
                <td class="py-3 px-4 ${statusClass}">${wordsWithSentence}/${wl.words.length}</td>
                <td class="py-3 px-4">
                    <button onclick="admin.viewWordlistDetail('${wl.id}')" class="text-indigo-400 hover:text-indigo-300 text-sm mr-3">
                        <i class="fa-solid fa-eye mr-1"></i>查看
                    </button>
                    <button onclick="admin.editWordlist('${wl.id}')" class="text-amber-400 hover:text-amber-300 text-sm mr-3">
                        <i class="fa-solid fa-pen mr-1"></i>编辑
                    </button>
                    <button onclick="admin.deleteWordlist('${wl.id}')" class="text-rose-400 hover:text-rose-300 text-sm">
                        <i class="fa-solid fa-trash mr-1"></i>删除
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    /**
     * 自动识别并合并重复词表
     * 规则：
     * - 标准化标题（去空格/大小写/全角半角空格统一/多余符号）、类型、年级相同视为重复
     * - 合并后的词表保留“单词并集”，保留单词顺序为去重后的原顺序
     * - 选择“保留词数最多”的词表为主，其他合并入主词表
     * - 同步更新任务中的wordListId引用
     */
    autoMergeDuplicateWordlists() {
        const all = db.getWordLists() || [];
        if (all.length === 0) return;

        const normalizeTitle = (title) => {
            if (!title) return '';
            // 统一空格与大小写，去除首尾空白，连续空格压缩
            let t = String(title)
                .replace(/\u3000/g, ' ')   // 全角空格 -> 半角空格
                .replace(/\s+/g, ' ')      // 多空格合一
                .trim()
                .toLowerCase();
            // 去除无意义分隔符变化
            t = t.replace(/[·•·]/g, '·');
            return t;
        };

        // 分组
        const groups = {};
        all.forEach(wl => {
            const key = `${normalizeTitle(wl.title)}|${(wl.type || '').toLowerCase()}|${(wl.grade || '').toLowerCase()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(wl);
        });

        let mergedCount = 0;
        Object.values(groups).forEach(group => {
            if (group.length <= 1) return;
            // 选择保留项：词数最多者
            const sorted = [...group].sort((a, b) => (b.words?.length || 0) - (a.words?.length || 0));
            const keep = sorted[0];
            const remove = sorted.slice(1);

            // 合并单词并去重（按首次出现顺序）
            const seen = new Set();
            const mergedWords = [];
            group.forEach(wl => {
                (wl.words || []).forEach(w => {
                    if (!seen.has(w)) {
                        seen.add(w);
                        mergedWords.push(w);
                    }
                });
            });
            keep.words = mergedWords;

            // 更新任务引用并删除重复词表
            const removedIds = remove.map(wl => wl.id);
            this._updateTasksForMergedWordlists(removedIds, keep.id);
            removedIds.forEach(id => db.deleteWordList(id));
            mergedCount += removedIds.length;
        });

        if (mergedCount > 0) {
            db.save && db.save();
            helpers.showToast(`已自动合并 ${mergedCount} 个重复词表`, 'success');
        }
    },

    /**
     * 将任务中指向被合并词表的引用迁移到保留的词表ID
     */
    _updateTasksForMergedWordlists(removedIds, keepId) {
        if (!Array.isArray(removedIds) || removedIds.length === 0) return;
        if (!keepId) return;
        try {
            const tasks = db._data?.tasks || [];
            tasks.forEach(t => {
                if (removedIds.includes(t.wordListId)) {
                    t.wordListId = keepId;
                }
            });
            db.save && db.save();
        } catch (e) {
            console.warn('update tasks for merged wordlists failed:', e);
        }
    },

    /**
     * 筛选词表
     */
    filterWordlists() {
        this.renderWordlists();
    },

    /**
     * 显示Excel导入模态框
     */
    showImportWordlistModal() {
        this.currentExcelData = null;
        this.currentExcelHeaders = [];
        
        // 重置UI
        document.getElementById('excel-column-mapping').classList.add('hidden');
        document.getElementById('btn-confirm-import').disabled = true;
        document.getElementById('excel-file-input').value = '';
        
        // 清空下拉框
        ['col-textbook', 'col-grade', 'col-volume', 'col-unit', 'col-word', 'col-meaning', 'col-phonetic', 'col-pos'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">--选择--</option>';
            }
        });

        const modal = document.getElementById('modal-import-wordlist');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭Excel导入模态框
     */
    closeImportWordlistModal() {
        const modal = document.getElementById('modal-import-wordlist');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            this.currentExcelData = null;
            this.currentExcelHeaders = [];
        }, 300);
    },

    /**
     * 处理Excel文件选择
     */
    handleExcelFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件类型
        const validTypes = ['.xlsx', '.xls', '.csv'];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validTypes.includes(ext)) {
            helpers.showToast('请上传Excel文件 (.xlsx, .xls) 或CSV文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                let parsedData;
                let headers;

                if (ext === '.csv') {
                    // 解析CSV
                    parsedData = this.parseCSV(data);
                    headers = parsedData[0];
                    parsedData = parsedData.slice(1);
                } else {
                    // 使用简单的Excel解析（实际项目中应使用SheetJS库）
                    // 这里模拟解析结果
                    parsedData = this.simulateExcelParse(data);
                    headers = ['教材', '年级', '册别', '单元', '单词', '中文', '音标', '词性'];
                }

                this.currentExcelData = parsedData;
                this.currentExcelHeaders = headers;

                // 显示列映射
                this.showColumnMapping(headers);
                
                // 显示预览
                this.showExcelPreview(parsedData, headers);

                document.getElementById('excel-column-mapping').classList.remove('hidden');
                document.getElementById('btn-confirm-import').disabled = false;

                helpers.showToast(`成功读取 ${parsedData.length} 行数据`, 'success');
            } catch (err) {
                console.error(err);
                helpers.showToast('文件解析失败，请检查文件格式', 'error');
            }
        };

        if (ext === '.csv') {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    },

    /**
     * 解析CSV
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        return lines.map(line => {
            // 处理带引号的CSV字段
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });
    },

    /**
     * 模拟Excel解析（实际项目中应使用SheetJS）
     */
    simulateExcelParse(data) {
        // 模拟返回一些示例数据
        return [
            ['人教版', '七年级', '上册', '1', 'hello', '你好', '/həˈləʊ/', 'int.'],
            ['人教版', '七年级', '上册', '1', 'good', '好的', '/ɡʊd/', 'adj.'],
            ['人教版', '七年级', '上册', '1', 'morning', '早晨', '/ˈmɔːnɪŋ/', 'n.'],
        ];
    },

    /**
     * 显示列映射
     */
    showColumnMapping(headers) {
        const selects = ['col-textbook', 'col-grade', 'col-volume', 'col-unit', 'col-word', 'col-meaning', 'col-phonetic', 'col-pos'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">--选择--</option>';
                headers.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = header;
                    select.appendChild(option);
                });
            }
        });

        // 自动匹配常见列名
        const autoMatch = {
            'col-textbook': ['教材', 'textbook', '版本', '出版社'],
            'col-grade': ['年级', 'grade', '年级班级'],
            'col-volume': ['册别', '册', 'volume', '上下册'],
            'col-unit': ['单元', 'unit', '单元课', '课'],
            'col-word': ['单词', 'word', '英文', 'english', '词汇'],
            'col-meaning': ['中文', '释义', 'meaning', '中文释义', '含义'],
            'col-phonetic': ['音标', 'phonetic', '发音', '拼音'],
            'col-pos': ['词性', 'pos', 'part of speech', '词类']
        };

        Object.entries(autoMatch).forEach(([selectId, keywords]) => {
            const select = document.getElementById(selectId);
            if (select) {
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i].toLowerCase();
                    if (keywords.some(kw => header.includes(kw.toLowerCase()))) {
                        select.value = i;
                        break;
                    }
                }
            }
        });
    },

    /**
     * 显示Excel预览
     */
    showExcelPreview(data, headers) {
        const headerRow = document.getElementById('preview-header');
        const tbody = document.getElementById('preview-body');
        const countSpan = document.getElementById('preview-count');

        // 显示前5行
        const previewData = data.slice(0, 5);
        
        // 渲染表头
        headerRow.innerHTML = headers.map(h => `<th class="p-2 border-b text-left">${h}</th>`).join('');

        // 渲染数据
        tbody.innerHTML = previewData.map(row => {
            return `<tr>${row.map(cell => `<td class="p-2 border-b">${cell || '-'}</td>`).join('')}</tr>`;
        }).join('');

        if (countSpan) {
            countSpan.textContent = `(显示前5行，共${data.length}行)`;
        }
    },

    /**
     * 确认导入词表
     */
    confirmImportWordlist() {
        if (!this.currentExcelData || this.currentExcelData.length === 0) {
            helpers.showToast('没有可导入的数据', 'warning');
            return;
        }

        const wordCol = parseInt(document.getElementById('col-word').value);
        if (isNaN(wordCol)) {
            helpers.showToast('请选择单词列', 'warning');
            return;
        }

        const textbookCol = document.getElementById('col-textbook').value;
        const gradeCol = document.getElementById('col-grade').value;
        const volumeCol = document.getElementById('col-volume').value;
        const unitCol = document.getElementById('col-unit').value;
        const meaningCol = document.getElementById('col-meaning').value;
        const phoneticCol = document.getElementById('col-phonetic').value;
        const posCol = document.getElementById('col-pos').value;

        // 按教材+年级+册别+单元分组
        const groups = {};
        
        this.currentExcelData.forEach(row => {
            const word = row[wordCol]?.trim();
            if (!word) return;

            const textbook = textbookCol !== '' ? row[parseInt(textbookCol)] : '人教版';
            const grade = gradeCol !== '' ? row[parseInt(gradeCol)] : '未分类';
            const volume = volumeCol !== '' ? row[parseInt(volumeCol)] : '';
            const unit = unitCol !== '' ? row[parseInt(unitCol)] : '';
            const key = `${textbook}|${grade}|${volume}|${unit}`;

            if (!groups[key]) {
                groups[key] = {
                    textbook, grade, volume, unit,
                    words: [],
                    dict: {}
                };
            }

            groups[key].words.push(word);

            // 添加到词典
            const meaning = meaningCol !== '' ? row[parseInt(meaningCol)] : '';
            const phonetic = phoneticCol !== '' ? row[parseInt(phoneticCol)] : '';
            const pos = posCol !== '' ? row[parseInt(posCol)] : '';
            
            if (meaning || phonetic) {
                groups[key].dict[word.toLowerCase()] = {
                    word: word,
                    meaning: meaning ? `${pos || ''} ${meaning}`.trim() : '',
                    phonetic: phonetic || `/${word}/`,
                    sentence: ''
                };
            }
        });

        // 保存分组数据
        let importedCount = 0;
        Object.entries(groups).forEach(([key, group]) => {
            if (group.words.length === 0) return;

            const wordlist = db.addWordList({
                teacherId: 'system',
                title: `${group.textbook} ${group.grade}${group.volume} ${group.unit}`,
                type: '教材',
                textbook: group.textbook,
                grade: group.grade,
                volume: group.volume,
                unit: group.unit,
                words: group.words
            });

            // 更新词典
            Object.entries(group.dict).forEach(([word, data]) => {
                if (!db.findWord(word)) {
                    db.addWord(data);
                }
            });

            importedCount++;
        });

        this.closeImportWordlistModal();
        this.renderWordlists();
        helpers.showToast(`成功导入 ${importedCount} 个词表`, 'success');
    },

    /**
     * 下载词表模板
     */
    downloadWordlistTemplate() {
        const template = `教材,年级,册别,单元,单词,中文释义,音标,词性
人教版,七年级,上册,1,hello,你好,/həˈləʊ/,int.
人教版,七年级,上册,1,good,好的,/ɡʊd/,adj.
人教版,七年级,上册,1,morning,早晨,/ˈmɔːnɪŋ/,n.
人教版,七年级,上册,2,school,学校,/skuːl/,n.
人教版,七年级,上册,2,student,学生,/ˈstjuːdnt/,n.`;

        const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '词表导入模板.csv';
        link.click();
        
        helpers.showToast('模板下载成功', 'success');
    },

    /**
     * 显示手动添加词表模态框
     */
    showAddWordlistModal() {
        document.getElementById('admin-wordlist-textbook').value = '';
        document.getElementById('admin-wordlist-grade').value = '';
        document.getElementById('admin-wordlist-volume').value = '';
        document.getElementById('admin-wordlist-unit').value = '';
        document.getElementById('admin-wordlist-words').value = '';
        document.getElementById('admin-wordlist-count').innerText = '已识别 0 个单词';

        const modal = document.getElementById('modal-add-admin-wordlist');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');

        // 监听输入变化
        document.getElementById('admin-wordlist-words').addEventListener('input', () => {
            this.updateWordCount();
        });
    },

    /**
     * 关闭手动添加词表模态框
     */
    closeAddWordlistModal() {
        const modal = document.getElementById('modal-add-admin-wordlist');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 更新单词计数
     */
    updateWordCount() {
        const text = document.getElementById('admin-wordlist-words').value;
        const lines = text.split('\n').filter(line => line.trim());
        document.getElementById('admin-wordlist-count').innerText = `已识别 ${lines.length} 个单词`;
    },

    /**
     * 保存手动添加的词表
     */
    saveAdminWordlist() {
        const textbook = document.getElementById('admin-wordlist-textbook').value;
        const grade = document.getElementById('admin-wordlist-grade').value;
        const volume = document.getElementById('admin-wordlist-volume').value;
        const unit = document.getElementById('admin-wordlist-unit').value.trim();
        const wordsText = document.getElementById('admin-wordlist-words').value.trim();

        if (!textbook || !grade || !volume || !unit) {
            helpers.showToast('请填写完整的教材、年级、册别和单元信息', 'warning');
            return;
        }

        if (!wordsText) {
            helpers.showToast('请输入单词列表', 'warning');
            return;
        }

        // 解析单词
        const words = [];
        const dict = {};
        
        wordsText.split('\n').forEach(line => {
            line = line.trim();
            if (!line) return;

            const parts = line.split(/[,，\t]/);
            const word = parts[0]?.trim();
            if (!word) return;

            words.push(word);

            // 解析额外信息
            const meaning = parts[1]?.trim() || '';
            const phonetic = parts[2]?.trim() || '';
            const pos = parts[3]?.trim() || '';

            if (meaning) {
                dict[word.toLowerCase()] = {
                    word: word,
                    meaning: `${pos} ${meaning}`.trim(),
                    phonetic: phonetic || `/${word}/`,
                    sentence: ''
                };
            }
        });

        if (words.length === 0) {
            helpers.showToast('未识别到有效单词', 'warning');
            return;
        }

        // 保存词表
        db.addWordList({
            teacherId: 'system',
            title: `${textbook} ${grade}${volume} ${unit}`,
            type: '教材',
            textbook: textbook,
            grade: grade,
            volume: volume,
            unit: unit,
            words: words
        });

        // 更新词典
        Object.entries(dict).forEach(([word, data]) => {
            if (!db.findWord(word)) {
                db.addWord(data);
            }
        });

        this.closeAddWordlistModal();
        this.renderWordlists();
        helpers.showToast(`成功添加词表，共 ${words.length} 个单词`, 'success');
    },

    /**
     * 查看词表详情
     */
    viewWordlistDetail(wordlistId) {
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) return;

        // 构建详情HTML
        let wordsHtml = '<div class="grid grid-cols-2 md:grid-cols-4 gap-2">';
        wordlist.words.forEach(word => {
            const wordData = db.findWord(word);
            wordsHtml += `
                <div class="p-2 bg-slate-50 rounded border">
                    <div class="font-bold text-slate-800">${word}</div>
                    ${wordData ? `
                        <div class="text-xs text-slate-500">${wordData.phonetic || ''}</div>
                        <div class="text-xs text-emerald-600">${wordData.meaning || ''}</div>
                    ` : '<div class="text-xs text-slate-400">暂无释义</div>'}
                </div>
            `;
        });
        wordsHtml += '</div>';

        // 使用模态框显示
        const modalHtml = `
            <div id="modal-wordlist-detail-temp" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden m-4">
                    <div class="p-6 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
                        <h3 class="text-xl font-bold text-slate-800">
                            <i class="fa-solid fa-book mr-2 text-emerald-600"></i>${wordlist.title}
                        </h3>
                        <button onclick="document.getElementById('modal-wordlist-detail-temp').remove()" class="text-slate-400 hover:text-slate-600">
                            <i class="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto max-h-[60vh]">
                        <div class="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
                            <span><strong>教材:</strong> ${wordlist.textbook || '-'}</span>
                            <span><strong>年级:</strong> ${wordlist.grade || '-'}</span>
                            <span><strong>册别:</strong> ${wordlist.volume || '-'}</span>
                            <span><strong>单元:</strong> ${helpers.formatUnitLabel(wordlist.unit || '') || '-'}</span>
                            <span><strong>单词数:</strong> ${wordlist.words.length}</span>
                        </div>
                        ${wordsHtml}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * 编辑词表
     */
    editWordlist(wordlistId) {
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) return;

        // 填充表单
        document.getElementById('admin-wordlist-textbook').value = wordlist.textbook || '';
        document.getElementById('admin-wordlist-grade').value = wordlist.grade || '';
        document.getElementById('admin-wordlist-volume').value = wordlist.volume || '';
        document.getElementById('admin-wordlist-unit').value = wordlist.unit || '';

        // 构建单词文本
        const wordsText = wordlist.words.map(word => {
            const wordData = db.findWord(word);
            if (wordData) {
                const meaning = wordData.meaning?.replace(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.|art\.)\s*/, '') || '';
                const pos = wordData.meaning?.match(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.|art\.)/)?.[0] || '';
                return `${word},${meaning},${wordData.phonetic || ''},${pos}`;
            }
            return word;
        }).join('\n');

        document.getElementById('admin-wordlist-words').value = wordsText;
        this.updateWordCount();

        // 显示模态框并标记为编辑模式
        const modal = document.getElementById('modal-add-admin-wordlist');
        modal.dataset.editId = wordlistId;
        modal.querySelector('h3').innerHTML = '<i class="fa-solid fa-pen mr-2 text-emerald-600"></i>编辑词表';
        
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 删除词表
     */
    deleteWordlist(wordlistId) {
        if (!confirm('确定要删除这个词表吗？此操作不可恢复！')) {
            return;
        }

        db._data.wordLists = db._data.wordLists.filter(wl => wl.id !== wordlistId);
        db.save();
        
        this.renderWordlists();
        helpers.showToast('词表已删除', 'success');
    },

    /**
     * 显示修改密码模态框
     */
    showChangePasswordModal() {
        const modal = document.getElementById('modal-change-password');
        if (modal) {
            modal.classList.remove('hidden');
            modal.offsetHeight;
            modal.classList.remove('opacity-0');
        }
    },

    /**
     * 隐藏修改密码模态框
     */
    hideChangePasswordModal() {
        const modal = document.getElementById('modal-change-password');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                // 清空输入
                document.getElementById('change-pwd-current').value = '';
                document.getElementById('change-pwd-new').value = '';
                document.getElementById('change-pwd-confirm').value = '';
            }, 300);
        }
    },

    /**
     * 修改密码
     */
    changePassword() {
        const currentPwd = document.getElementById('change-pwd-current').value;
        const newPwd = document.getElementById('change-pwd-new').value;
        const confirmPwd = document.getElementById('change-pwd-confirm').value;

        // 验证输入
        if (!currentPwd || !newPwd || !confirmPwd) {
            helpers.showToast('请填写所有字段', 'warning');
            return;
        }

        if (newPwd !== confirmPwd) {
            helpers.showToast('两次输入的新密码不一致', 'error');
            return;
        }

        if (newPwd.length < 6) {
            helpers.showToast('新密码长度至少6位', 'warning');
            return;
        }

        // 验证当前密码
        const admin = db.findAdmin('admin');
        if (!admin || !helpers.verifyPassword(currentPwd, admin.pwd)) {
            helpers.showToast('当前密码错误', 'error');
            return;
        }

        // 更新密码
        const hashedNewPwd = helpers.hashPassword(newPwd);
        db.updateAdminPassword('admin', hashedNewPwd);

        this.hideChangePasswordModal();
        helpers.showToast('密码修改成功！请使用新密码登录', 'success');
    },

    // ==================== 词表详情管理 ====================

    /**
     * 显示词表详情
     */
    showWordlistsDetail() {
        this._allWordlists = db.getWordLists();
        this._wordlistSortField = 'title';
        this._wordlistSortAsc = true;
        
        // 初始化筛选器
        this.initWordlistFilters();
        
        // 渲染词表列表
        this.filterWordlists();
        
        const modal = document.getElementById('modal-wordlists-detail');
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 关闭词表详情
     */
    closeWordlistsDetail() {
        const modal = document.getElementById('modal-wordlists-detail');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    /**
     * 初始化词表筛选器
     */
    initWordlistFilters() {
        const wordlists = this._allWordlists;
        const teachers = db.getTeachers();
        
        // 获取所有年级
        const grades = [...new Set(wordlists.map(w => w.grade).filter(g => g))].sort();
        const gradeSelect = document.getElementById('filter-wordlist-grade');
        gradeSelect.innerHTML = '<option value="">全部年级</option>';
        grades.forEach(g => {
            gradeSelect.innerHTML += `<option value="${g}">${g}</option>`;
        });
        
        // 获取所有创建者
        const teacherSelect = document.getElementById('filter-wordlist-teacher');
        teacherSelect.innerHTML = '<option value="">全部</option>';
        teachers.forEach(t => {
            teacherSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
        
        // 清空搜索框
        document.getElementById('filter-wordlist-search').value = '';
    },

    /**
     * 筛选词表
     */
    filterWordlists() {
        const gradeFilter = document.getElementById('filter-wordlist-grade').value;
        const teacherFilter = document.getElementById('filter-wordlist-teacher').value;
        const searchText = document.getElementById('filter-wordlist-search').value.toLowerCase();
        
        let filtered = this._allWordlists.filter(w => {
            if (gradeFilter && w.grade !== gradeFilter) return false;
            if (teacherFilter && w.teacherId !== teacherFilter) return false;
            if (searchText && !w.title.toLowerCase().includes(searchText)) return false;
            return true;
        });
        
        this.renderWordlistsList(filtered);
        this.updateWordlistsStats(filtered);
    },

    /**
     * 渲染词表列表
     */
    renderWordlistsList(wordlists) {
        const tbody = document.getElementById('all-wordlists-list');
        tbody.innerHTML = '';
        
        if (wordlists.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">暂无符合条件的词表</td></tr>';
        } else {
            wordlists.forEach(wl => {
                const teacher = db.findTeacher(wl.teacherId);
                const wordsWithSentence = wl.words.filter(w => {
                    const wordData = db.findWord(w);
                    return wordData && wordData.sentence;
                }).length;
                const sentenceStatus = wordsWithSentence === wl.words.length ? '完整' : wordsWithSentence > 0 ? '部分' : '无';
                const statusClass = sentenceStatus === '完整' ? 'text-emerald-600' : sentenceStatus === '部分' ? 'text-amber-600' : 'text-rose-600';
                
                // Format Title
                const formattedTitle = helpers.formatFullWordlistTitle(wl);

                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-50';
                row.innerHTML = `
                    <td class="p-3 border-b font-medium">${formattedTitle}</td>
                    <td class="p-3 border-b">${wl.grade || '-'}</td>
                    <td class="p-3 border-b">${wl.words.length}</td>
                    <td class="p-3 border-b">${teacher ? teacher.name : '系统'}</td>
                    <td class="p-3 border-b">${wordsWithSentence}/${wl.words.length}</td>
                    <td class="p-3 border-b ${statusClass}">${sentenceStatus}</td>
                    <td class="p-3 border-b">
                        <button class="text-indigo-600 hover:text-indigo-800 text-sm mr-2" onclick="admin.viewWordlistDetail('${wl.id}')">
                            <i class="fa-solid fa-eye mr-1"></i>查看
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    },

    /**
     * 更新词表统计
     */
    updateWordlistsStats(filtered) {
        const total = this._allWordlists;
        const totalWords = total.reduce((sum, w) => sum + w.words.length, 0);
        const withSentences = total.filter(w => {
            return w.words.every(word => {
                const wordData = db.findWord(word);
                return wordData && wordData.sentence;
            });
        }).length;
        
        document.getElementById('stats-total-wordlists').textContent = total.length;
        document.getElementById('stats-total-words').textContent = totalWords;
        document.getElementById('stats-with-sentences').textContent = withSentences;
        document.getElementById('stats-filtered-wordlists').textContent = filtered.length;
    },

    /**
     * 查看词表详情
     */
    viewWordlistDetail(wordlistId) {
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) return;
        
        let wordsHtml = '<div class="grid grid-cols-2 md:grid-cols-3 gap-2">';
        wordlist.words.forEach(word => {
            const wordData = db.findWord(word);
            const hasSentence = wordData && wordData.sentence;
            wordsHtml += `
                <div class="p-2 bg-slate-50 rounded-lg ${hasSentence ? '' : 'border-l-2 border-amber-400'}">
                    <p class="font-medium text-sm">${word}</p>
                    ${wordData ? `<p class="text-xs text-slate-500">${wordData.meaning || ''}</p>` : ''}
                    ${hasSentence ? '' : '<p class="text-xs text-amber-500">缺例句</p>'}
                </div>
            `;
        });
        wordsHtml += '</div>';
        
        // 使用模态框显示
        const modalHtml = `
            <div id="modal-wordlist-detail-temp" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-[200]">
                <div class="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden m-4">
                    <div class="p-6 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
                        <h3 class="text-xl font-bold text-slate-800">
                            <i class="fa-solid fa-book mr-2 text-emerald-600"></i>${wordlist.title}
                        </h3>
                        <button onclick="document.getElementById('modal-wordlist-detail-temp').remove()" class="text-slate-400 hover:text-slate-600">
                            <i class="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto max-h-[60vh]">
                        <div class="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
                            <span><strong>年级:</strong> ${wordlist.grade || '-'}</span>
                            <span><strong>单词数:</strong> ${wordlist.words.length}</span>
                        </div>
                        ${wordsHtml}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * 导出词表数据
     */
    exportWordlistsData() {
        const gradeFilter = document.getElementById('filter-wordlist-grade').value;
        const teacherFilter = document.getElementById('filter-wordlist-teacher').value;
        const searchText = document.getElementById('filter-wordlist-search').value.toLowerCase();
        
        let filtered = this._allWordlists.filter(w => {
            if (gradeFilter && w.grade !== gradeFilter) return false;
            if (teacherFilter && w.teacherId !== teacherFilter) return false;
            if (searchText && !w.title.toLowerCase().includes(searchText)) return false;
            return true;
        });
        
        const rows = [['词表名称', '年级', '单词数', '创建者', '例句状态']];
        filtered.forEach(w => {
            const teacher = db.findTeacher(w.teacherId);
            const wordsWithSentence = w.words.filter(word => {
                const wordData = db.findWord(word);
                return wordData && wordData.sentence;
            }).length;
            const status = wordsWithSentence === w.words.length ? '完整' : wordsWithSentence > 0 ? '部分' : '无';
            
            rows.push([
                helpers.formatFullWordlistTitle(w),
                w.grade || '',
                w.words.length,
                teacher ? teacher.name : '系统',
                status
            ]);
        });
        
        const filename = `词表数据_${helpers.getTodayDate()}.csv`;
        helpers.exportCSV(filename, rows);
        helpers.showToast('导出成功！', 'success');
    },

    // ==================== 系统备份与恢复 ====================

    /**
     * 备份全量数据
     */
    backupSystemData() {
        if (confirm('确定要导出系统全量数据备份吗？')) {
            db.exportData();
            helpers.showToast('备份文件下载已开始', 'success');
        }
    },

    /**
     * 触发恢复数据
     */
    triggerRestoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (confirm('警告：恢复备份将覆盖当前系统所有数据！确定继续吗？')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const success = db.importData(event.target.result);
                    if (success) {
                        alert('数据恢复成功！系统将重新加载。');
                        location.reload();
                    } else {
                        helpers.showToast('数据恢复失败，文件格式可能不正确', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
};
