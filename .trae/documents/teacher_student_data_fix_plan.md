# 教师学生数据关联问题修复计划

## 问题分析

### 1. 教师数据显示问题
- **问题**：教师列表中的工号显示为长字符串（如"cmndc2yta0009ju04i88y8wgs"），而不是期望的工号格式（如"t001"）
- **原因**：`admin.js`中显示的是`teacher.username`，但数据库中可能存储的是长字符串ID

### 2. 教师统计数据问题
- **问题**：所有教师的班级数、学生数、词表数、正确率都显示为0
- **原因**：`getStudentsByTeacher`方法可能没有正确关联学生，或者学生数据中没有正确的`teacherId`

### 3. 学生教师关联问题
- **问题**：学生列表中的老师列显示为"-"，没有显示教师姓名
- **原因**：学生数据中可能没有正确的`teacherId`，或者`db.findTeacher`方法没有正确找到教师

### 4. 教师端学生管理问题
- **问题**：教师端学生管理板块显示学生为0，但数据库中有49个学生
- **原因**：教师端获取学生的方法可能有问题，或者数据关联不正确

### 5. 教师端词表管理问题
- **问题**：教师端词表管理下面的教材词表没有任何管理（原来已经关联了）
- **原因**：词表关联问题，可能是`getWordListsByTeacher`方法没有正确关联词表

## 修复计划

### [x] Task 1: 修复教师数据显示问题
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 修复教师列表中的工号显示问题，确保显示正确的工号格式
  - 检查`admin.js`中的教师数据处理逻辑
- **Success Criteria**:
  - 教师列表中的工号显示为正确的格式（如"t001"）
  - 教师姓名正确显示
- **Test Requirements**:
  - `programmatic` TR-1.1: 教师列表显示正确的工号和姓名
  - `human-judgement` TR-1.2: 教师列表界面美观，数据显示清晰
- **Notes**: 可能需要检查数据库中教师数据的存储格式

### [x] Task 2: 修复教师统计数据问题
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 修复`getStudentsByTeacher`方法，确保正确关联学生
  - 检查学生数据中的`teacherId`字段
  - 确保`getWordListsByTeacher`和`getLearningLogsByTeacher`方法正确实现
- **Success Criteria**:
  - 每个教师的班级数、学生数、词表数、正确率正确显示
  - 学生总数显示为49
- **Test Requirements**:
  - `programmatic` TR-2.1: 教师统计数据正确显示
  - `human-judgement` TR-2.2: 统计数据与实际数据一致
- **Notes**: 需要确保学生数据中包含正确的`teacherId`

### [x] Task 3: 修复学生教师关联问题
- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - 确保学生数据中包含正确的`teacherId`
  - 修复`db.findTeacher`方法，确保能正确找到教师
  - 确保学生列表中的老师列正确显示教师姓名
- **Success Criteria**:
  - 学生列表中的老师列显示正确的教师姓名
  - 学生筛选功能中的教师筛选正常工作
- **Test Requirements**:
  - `programmatic` TR-3.1: 学生列表显示正确的教师姓名
  - `human-judgement` TR-3.2: 学生列表界面美观，数据显示清晰
- **Notes**: 需要检查学生数据的结构和教师数据的关联

### [/] Task 4: 修复教师端学生管理问题
- **Priority**: P1
- **Depends On**: Task 3
- **Description**:
  - 检查教师端获取学生的方法
  - 确保教师能看到自己的学生
  - 修复学生管理板块的显示问题
- **Success Criteria**:
  - 教师端学生管理板块显示正确的学生数量
  - 教师能看到自己的学生列表
- **Test Requirements**:
  - `programmatic` TR-4.1: 教师端学生管理显示正确的学生数量
  - `human-judgement` TR-4.2: 教师端学生管理界面正常
- **Notes**: 需要检查教师端的学生获取逻辑

### [ ] Task 5: 修复教师端词表管理问题
- **Priority**: P1
- **Depends On**: Task 4
- **Description**:
  - 检查教师端获取词表的方法
  - 确保教师能看到自己的词表和关联的教材词表
  - 修复词表管理板块的显示问题
- **Success Criteria**:
  - 教师端词表管理板块显示正确的词表数量
  - 教师能看到关联的教材词表
- **Test Requirements**:
  - `programmatic` TR-5.1: 教师端词表管理显示正确的词表数量
  - `human-judgement` TR-5.2: 教师端词表管理界面正常
- **Notes**: 需要检查教师端的词表获取逻辑

## 实施时间估计
- Task 1: 15分钟
- Task 2: 30分钟
- Task 3: 20分钟
- Task 4: 20分钟
- Task 5: 20分钟
- 总计：105分钟

## 测试计划
- 测试教师列表数据显示
- 测试教师统计数据显示
- 测试学生列表教师姓名显示
- 测试教师端学生管理功能
- 测试教师端词表管理功能
- 确保所有功能正常运行

## 预期结果
- 教师列表显示正确的工号和姓名
- 教师统计数据正确显示
- 学生列表显示正确的教师姓名
- 教师端学生管理显示正确的学生数量
- 教师端词表管理显示正确的词表数量
- 所有功能正常运行