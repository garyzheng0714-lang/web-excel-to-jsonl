# Excel/CSV <-> JSONL 数据集转换工具

这是一个纯前端运行的数据集格式转换工具，旨在帮助开发者轻松处理 AI 批量推理数据。它提供 Excel/CSV 与 JSONL 格式之间的相互转换、CSV 合并与拆分、模板填充以及上下文缓存创建等功能，特别针对大文件进行了优化，并支持 DeepSeek 推理内容提取。

## ✨ 核心特性

- **六大功能模块**：
  - **Excel/CSV 转 JSONL**：将表格数据转换为 Batch API 兼容的 JSONL 格式。
  - **CSV 模板填充**：使用自定义模板和 CSV 数据批量生成文本内容。
  - **JSON/JSONL 转 CSV**：将 JSONL 数据集转换为易于阅读和编辑的 CSV 表格。
  - **合并 CSV**：将多个 CSV 文件合并为一个，自动对齐表头。
  - **上下文缓存**：通过 Volcengine/Doubao API 创建上下文缓存（需 API Key）。
  - **拆分 CSV**：将大型 CSV 按 20000 行拆分为多个 Excel+ZIP 文件。
- **大文件支持**：利用 Web Workers 和 OPFS (Origin Private File System) 技术，支持处理 GB 级别的大文件，避免浏览器卡顿或崩溃。
- **隐私安全**：除上下文缓存模块外，所有数据处理均在本地浏览器完成，不会上传到任何服务器。
- **智能字段提取**：
  - 在 JSON 转 CSV 时，自动提取 `content` (用户输入)、`output` (模型回答)。
  - **支持 DeepSeek**：自动提取 `reasoning_content` (思维链/思考过程) 字段。
- **实时预览**：提供文件内容的快速预览（大文件使用虚拟滚动渲染，防止卡顿）。

## 🧭 界面概览

- **SaaS 风格工作台**：顶部状态栏 + 左侧模块导航 + 右侧结果与历史面板。
- **统一状态面板**：处理进度、警告与错误集中展示，便于快速定位问题。
- **最近结果**：右侧优先展示最近产出，支持一键预览与下载。

## 🚀 快速开始

### 开发环境

本项目基于 Vite + React + TypeScript 构建。

1. **安装依赖**

```bash
cd web_converter
npm install
```

2. **启动开发服务器**

```bash
npm run dev
```

3. **构建生产版本**

```bash
npm run build
```

## 📖 使用指南

### 1. Excel/CSV 转 JSONL

适用于将整理好的表格数据转换为批量推理（Batch API）所需的 JSONL 格式。

- **输入**：`.xlsx`, `.xls`, `.csv`
- **必需表头**：`custom_id`、`content`。可选：`image_url`（多模态图文输入）。
- **处理逻辑**：
  - 每行生成一个包含 `custom_id` 和 `body`（含 `messages`、`max_tokens`、`top_p`、`temperature`）的 JSON 对象。
  - 自动校验 `custom_id` 唯一性，跳过无效行并报告错误。

### 2. CSV 模板填充

使用自定义模板和 CSV/Excel 数据批量生成文本内容。

- **输入**：`.csv`, `.xlsx`, `.xls`
- **模板语法**：使用 `{{列名}}` 占位符引用 CSV 中的列。
- **输出**：在原数据基础上新增 `content` 列，保存为 `.csv`。

### 3. JSON/JSONL 转 CSV

适用于将模型生成的日志、批量处理结果或现有的 JSONL 数据集转换为表格，以便进行人工审查或分析。

- **输入**：`.json` (数组或对象), `.jsonl`
- **输出**：`.csv` (带 BOM，可被 Excel 直接打开)
- **处理逻辑**：
  - **智能展平**：自动解包 `body`、提取 `messages` 中的对话内容，提取 `response.body.choices` 中的模型回答。
  - **思考过程提取**：如果数据中包含 DeepSeek 格式的 `reasoning_content`，会自动提取为独立的一列。
  - **大文件流式处理**：通过流式读取和写入，极低内存占用。

### 4. 合并 CSV

将多个 CSV 文件合并为一个数据集。

- **输入**：多个 `.csv` 文件（支持从上传或历史结果中选取）。
- **处理逻辑**：自动扫描所有文件的表头并取并集，缺失列自动留空。

### 5. 上下文缓存

通过 Volcengine/Doubao API 创建上下文缓存，降低重复系统提示的推理成本。

- **支持模型**：Doubao Seed 1.8、1.6、1.6 Lite、1.6 Flash、1.6 Thinking 等。
- **可配置参数**：API Key、模型选择（含自定义模型 ID）、Thinking 模式、TTL。
- **注意**：此模块需要调用远程 API，数据会发送到 Volcengine 服务器。

### 6. 拆分 CSV

将大型 CSV 拆分为多个 ZIP 压缩包，每个包含一个 Excel 文件。

- **输入**：`.csv`
- **处理逻辑**：
  - 按每文件最多 20000 行（含表头和 2 行空行）拆分。
  - 每个分片生成 `.xlsx` 文件并压缩为 `.zip`。
  - 支持不拆分模式（仅插入空行并转换格式）。

## 🛠 技术栈

- **前端框架**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [Lucide React](https://lucide.dev/)
- **数据处理**:
  - [PapaParse](https://www.papaparse.com/) (CSV 解析)
  - [SheetJS (xlsx)](https://docs.sheetjs.com/) (Excel 解析)
  - [JSZip](https://stuk.github.io/jszip/) (ZIP 压缩，用于拆分工具)
- **文件下载**: [StreamSaver.js](https://jimmywarting.github.io/StreamSaver.js/) + File System Access API
- **并发与存储**: Web Workers, OPFS

## 📄 许可证

MIT License
