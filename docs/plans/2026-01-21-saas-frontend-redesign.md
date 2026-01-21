# SaaS Frontend Redesign (2026-01-21)

## 背景与目标
- 目标: 将当前 Swiss/brutalist UI 重构为产品化 SaaS 风格, 强调高级克制与流程清晰.
- 约束: 保留现有功能模块与 Worker 数据流, 不改变 OPFS/streamsaver 行为.
- 成功标准: 信息架构更清晰, 状态反馈更集中, 视觉体系统一, 在桌面与移动端均可用.

## 页面结构与信息架构
- AppShell: 顶部应用栏 + 左侧导航 + 主工作区 + 右侧会话面板.
- 顶部应用栏: 品牌名/环境/状态/记录概览.
- 左侧导航: 模块列表(Icon + 文本), 支持折叠.
- 主工作区: 模块标题与说明 -> 操作区 -> 结果与状态区.
- 右侧会话面板: 最近结果(优先) + 历史记录(折叠/滚动) + 快捷链接.

## 视觉系统
- 主色: 冷蓝灰系(Primary #2b3a4a, Accent #3f5a7a, Muted #8a97a5).
- 背景: 低对比渐变 + 轻噪点纹理, 避免纯平.
- 组件: 轻量圆角(6-8px), 细边框(1px), 轻投影层级.
- 字体: IBM Plex Sans(正文), IBM Plex Mono(数字/状态), Source Serif 4(标题点缀).
- 动效: 页面进入淡入/轻位移, 模块切换淡入, 控制时长与次数.

## 组件体系
- ModuleHeader: 标题/简介/提示标签.
- TaskCard: 上传/输入区 + 操作按钮 + 状态区.
- StatusPanel: 统一的进度/阶段/警告/错误展示.
- ResultCard: 结果文件与下载按钮, 与完成态绑定.
- HistoryPanel: 最近结果卡片 + 历史列表.
- PreviewModal: 标准 SaaS 弹层, 顶部操作区, 保留虚拟表格/文本预览.

## 数据流与状态
- 状态统一: Idle -> Ready -> Processing -> Completed/Error.
- 进度与阶段信息集中在 StatusPanel, 警告与错误使用统一样式差异.
- 下载按钮从完成提示中拆出, 固定在 ResultCard.

## 风险与注意事项
- 预览区域高度依赖 ResizeObserver, 需保证容器高度稳定.
- 视觉调整不触达 Worker 逻辑, 注意避免破坏现有 class 依赖.

## 实施范围
- 仅前端布局与样式重构, 不新增路由与后端依赖.
