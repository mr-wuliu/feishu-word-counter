# 飞书文档实时字数统计油猴脚本

这个目录包含一个 Tampermonkey / Violentmonkey userscript：

- `feishu-word-counter.user.js`
- `feishu.png`

## 安装

1. 打开 Tampermonkey 管理面板。
2. 新建脚本。
3. 把 `feishu-word-counter.user.js` 的内容粘贴进去并保存。
4. 打开或刷新飞书文档编辑页面。

脚本会在页面右下方显示 `字数 x`，默认避开飞书右下角的评论 / 帮助按钮。鼠标悬停可看到中文字符、英文单词和数字的拆分统计。

显示块可以拖动，位置会自动记住；双击显示块可以恢复默认位置。

## 统计规则

- 每个中文汉字按 1 个字计。
- 连续英文按 1 个单词计。
- 连续数字按 1 个数字项计。
- 标点和空白不计入总数。

## 适配说明

飞书页面结构可能会变动。脚本会优先统计 `.page-block-children` 正文区域，并排除标题、文档信息、图标封面入口、悬浮评论区和虚拟预渲染区域。如果找不到明确编辑区，会回退到页面主体文本。若右下角数字明显偏大，通常是飞书 DOM 结构变化导致脚本读到了标题、侧栏或菜单文本，需要调整 `editorSelectors`、`ignoredSelectors` 或 `titleSelectors`。
