# Excel/CSV <-> JSONL 数据集转换工具

一个纯前端运行的数据集格式转换工作台，用于在浏览器中处理 Excel、CSV、JSON、JSONL 等文件，并生成适合 AI 批量推理、人工审查或二次处理的数据集。

## Overview

主应用位于 `web_converter/`，使用 Vite + React + TypeScript 构建。项目根目录提供了一个构建包装脚本，用于安装子项目依赖、构建前端，并把产物复制到根目录 `dist/`，便于 Vercel 等静态托管平台部署。

除“上下文缓存”模块需要调用远程 API 外，文件转换、预览、拆分和合并逻辑都在浏览器本地完成。

## Features

- Excel/CSV 转 Batch API 风格 JSONL
- JSON/JSONL 转 CSV，支持自动展平常见批量推理结果结构
- CSV 模板填充，使用 `{{列名}}` 占位符批量生成文本
- 多 CSV 合并，自动对齐表头
- 大 CSV 拆分为多个 Excel 文件并打包 ZIP
- Volcengine/Doubao 上下文缓存创建工具
- 大文件流式处理、虚拟滚动预览、OPFS 本地缓存
- 结果历史、下载、删除和预览面板

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS
- PapaParse for CSV parsing
- SheetJS `xlsx` for Excel parsing and generation
- JSZip for ZIP output
- StreamSaver.js and File System Access API for large downloads
- Web Workers and OPFS for large file processing
- Lucide React icons

## Project Structure

```text
.
├── package.json              # Root build wrapper for deployment
├── vercel.json               # Root deployment config
├── README.md
├── SKILL.md                  # Frontend design skill metadata in this repo
└── web_converter/
    ├── package.json          # Main app scripts and dependencies
    ├── src/
    │   ├── App.tsx           # Main workspace and module routing
    │   ├── ContextCacheCreator.tsx
    │   ├── CsvTemplateFiller.tsx
    │   ├── SplitTool.tsx
    │   ├── *Worker.ts        # Conversion workers
    │   └── components/       # App shell, panels and upload/result UI
    └── vite.config.ts
```

## Getting Started

Install and run the main app:

```bash
cd web_converter
npm install
npm run dev
```

Build the main app:

```bash
cd web_converter
npm run build
```

Build from the repository root for deployment:

```bash
npm run build
```

The root build command installs dependencies in `web_converter/`, builds the Vite app, then copies `web_converter/dist/*` into the root `dist/` directory.

## Scripts

Root:

| Command | Description |
| --- | --- |
| `npm run install-modules` | Install dependencies inside `web_converter/` |
| `npm run build` | Build the frontend and copy output to root `dist/` |

`web_converter/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build the production bundle |
| `npm run preview` | Preview the production build |

## Usage Notes

### Excel/CSV to JSONL

Use a `.xlsx`, `.xls`, or `.csv` file with at least:

- `custom_id`
- `content`

Optional:

- `image_url` for multimodal inputs

Each valid row becomes a JSONL record with request body fields such as messages, temperature, top_p and max_tokens.

### JSON/JSONL to CSV

The converter can read JSON arrays, objects, or JSONL lines. It attempts to extract common fields from model batch results, including prompt content, response output and DeepSeek `reasoning_content` when present.

### Context Cache

The context cache module sends the entered content and API key to the configured Volcengine endpoint through the app's `/ark` proxy route. Use this module only with data that is allowed to leave the browser.

## Notes

- Generated files and `node_modules/` are present in the repository history, but active development should happen from `web_converter/src/`.
- The repository does not currently expose a checked-in license file.
