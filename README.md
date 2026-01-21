# Excel/CSV <-> JSONL 数据集转换工具

这是一个纯前端运行的数据集格式转换工具，旨在帮助开发者轻松处理 AI 训练数据。它支持 Excel/CSV 与 JSONL 格式之间的相互转换，特别针对大文件进行了优化，并支持最新的 DeepSeek 推理内容提取。

## ✨ 核心特性

- **双向转换**：
  - **Excel/CSV 转 JSONL**：将表格数据转换为 OpenAI 兼容的 JSONL 格式（支持 Batch API）。
  - **JSON/JSONL 转 CSV**：将 JSONL 数据集转换为易于阅读和编辑的 CSV 表格。
- **大文件支持**：利用 Web Workers 和 OPFS (Origin Private File System) 技术，支持处理 GB 级别的大文件，避免浏览器卡顿或崩溃。
- **隐私安全**：所有数据处理均在本地浏览器完成，不会上传到任何服务器。
- **智能字段提取**：
  - 在 JSON 转 CSV 时，自动提取 `content` (用户输入)、`output` (模型回答)。
  - **🆕 支持 DeepSeek**：自动提取 `reasoning_content` (思维链/思考过程) 字段。
- **实时预览**：提供文件内容的快速预览（大文件自动截断预览，防止卡顿）。

## 🧭 界面概览

- **SaaS 风格工作台**：顶部状态栏 + 左侧模块导航 + 右侧结果与历史面板。
- **统一状态面板**：处理进度、警告与错误集中展示，便于快速定位问题。
- **最近结果**：右侧优先展示最近产出，支持一键预览与下载。

## 🚀 快速开始

### 开发环境

本项目基于 Vite + React 构建。

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

适用于将整理好的表格数据转换为微调（Fine-tuning）或批量处理（Batch API）所需的 JSONL 格式。

- **输入**：`.xlsx`, `.xls`, `.csv`
- **处理逻辑**：
  - 自动识别表头。
  - 将每行数据转换为符合 OpenAI 格式的 JSON 对象。
  - 支持自定义系统提示词（System Prompt）。

### 2. JSON/JSONL 转 Excel/CSV

适用于将模型生成的日志、批量处理结果或现有的 JSONL 数据集转换为表格，以便进行人工审查或分析。

- **输入**：`.json` (数组或对象), `.jsonl`
- **输出**：`.csv` (可被 Excel 直接打开)
- **处理逻辑**：
  - **智能展平**：自动提取 `messages` 中的对话内容。
  - **思考过程提取**：如果数据中包含 DeepSeek 格式的 `reasoning_content`，会自动提取为独立的一列。
  - **大文件流式处理**：通过流式读取和写入，极低内存占用。

## 🛠 技术栈

- **前端框架**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/)
- **数据处理**: 
  - [PapaParse](https://www.papaparse.com/) (CSV 解析)
  - [SheetJS (xlsx)](https://docs.sheetjs.com/) (Excel 解析)
- **并发与存储**: Web Workers, OPFS

## 📄 许可证

MIT License
