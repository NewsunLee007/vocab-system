# ZPD Cadet Training 中文显示修复及积分系统打通计划

## 问题一：系统没有正确显示中文
- **当前状态分析**：在 ZPD 游戏中，像“Spelling Bee”等模块会读取传入单词对象的 `cn`（中文释义）属性来显示题目。然而，当学生在主系统点击“进入闯关”时，`student.js` 在构建传递给游戏的 `zootopia_datasets` 数据集时，仅仅简单调用了 `db.findWord(w).meaning`。如果该单词是老师手动录入且仅通过 AI 生成了例句和释义（存储在 `teacherReviewedSentences` 中，而未写入全局基础词典），那么 `meaning` 就会是空字符串。这导致游戏收到 `cn: ''`，从而在界面上什么中文也显示不出来（如截图一中上方空白）。
- **提议的更改**：
  修改 `js/modules/student.js` 中的 `prepareZootopiaDatasetFromWordlist` 函数：
  1. 在遍历提取单词前，设置 `this.currentWordlistId = wordlistId` 建立上下文。
  2. 将简单的 `db.findWord()` 替换为更强大的 `this.enrichWordData(w)`。这个方法会自动去读取该词表下 AI 生成/教师审核过的最新翻译和例句，确保提取到正确的中文释义。
  3. 增加兜底防御：如果实在找不到中文，使用 `[未翻译] 单词` 作为后备，避免出现界面纯空白的致命 UI 错误。

## 问题二：游戏系统中的积分系统要和主系统打通
- **当前状态分析**：ZPD 游戏作为一个独立运行的 React 单页应用，在玩家完成游戏关卡（胜利或失败结束）时，虽然内部会计算 `score` 并在 `zootopia.html` 内记录历史，但并没有将这份努力转化为系统核心的“金币/积分”奖励，导致主系统的金币数量不发生变化。
- **提议的更改**：
  修改 `zootopia.html` 中的 `saveScore` 函数：
  1. 拦截游戏结束时的总分数 `score`。
  2. 按照合理的兑换比例（例如：10 游戏分 = 1 主系统金币）计算出奖励金币数。
  3. 利用 `window.opener` 跨窗口通信机制，调用主系统的 `window.opener.db.addCoins(userId, amount)` 给学生充值金币。
  4. 同时调用主系统的 `window.opener.helpers.showToast`，在主窗口弹出类似于 `ZPD特训奖励: +X 金币` 的绿色成功提示，增强正向反馈。

## 验证步骤
1. 在教师端选择一个 AI 刚刚生成完（且未合并到全局词库）的教材词表，切换到学生端并点击“ZPD Cadet Training”闯关。
2. 进入 Spelling Bee 或 Rapid Fire 游戏，验证此时界面中央能否正常显示单词对应的中文释义。
3. 故意答对几个题目获得游戏分数，然后点击“Abort/退出”或完成关卡，返回主系统页面，观察是否有绿色 Toast 提示金币增加，且顶部金币总数发生相应的增长。