# web-excel-to-jsonl

![类型](https://img.shields.io/badge/%E7%B1%BB%E5%9E%8B-%E8%A1%A8%E6%A0%BC%E5%B7%A5%E5%85%B7-0ea5e9)
![技术栈](https://img.shields.io/badge/%E6%8A%80%E6%9C%AF%E6%A0%88-React%20%2B%20Vite%20%2B%20SheetJS-16a34a)
![状态](https://img.shields.io/badge/%E7%8A%B6%E6%80%81-%E9%9D%99%E6%80%81%E5%89%8D%E7%AB%AF-7c3aed)
![README](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-111827)

一个浏览器端数据集转换工作台，用于在 Excel、CSV、JSON、JSONL 等格式之间转换、拆分、合并和预览。

## 仓库定位

- 分类：表格工具 / 数据转换 / AI 数据集准备。
- 服务对象：需要把表格数据整理成 JSONL、把模型批处理结果还原为 CSV，或进行 CSV 合并/拆分的运营、数据和 AI 工作流。
- 与其他表格仓库的区别：本仓库是通用浏览器端文件转换工具，不依赖飞书多维表格，也不是海报、报名或短链业务系统。

## 功能概览

- Excel/CSV 转 Batch API 风格 JSONL。
- JSON/JSONL 转 CSV，支持常见模型批处理结果结构的字段提取。
- CSV 模板填充，使用 `{{列名}}` 占位符批量生成文本。
- 多个 CSV 合并，并自动对齐表头。
- 大 CSV 拆分为多个 Excel 文件并打包 ZIP。
- Volcengine/Doubao 上下文缓存创建辅助工具。
- 支持大文件处理、虚拟滚动预览、OPFS 本地缓存和历史结果管理。
- 根目录提供构建包装脚本，便于静态托管平台部署。

## 技术栈

- 前端：React 18、TypeScript、Vite、Tailwind CSS。
- 文件处理：SheetJS `xlsx`、PapaParse、JSZip、StreamSaver.js。
- 大文件能力：Web Workers、OPFS、File System Access API。
- UI 辅助：Lucide React、clsx、tailwind-merge。

## 快速开始

主应用位于 `web_converter/`。

```bash
cd web_converter
npm install
npm run dev
```

构建主应用：

```bash
cd web_converter
npm run build
```

从仓库根目录执行部署构建：

```bash
npm install
npm run build
```

根目录构建会安装 `web_converter/` 依赖、构建 Vite 应用，并把 `web_converter/dist/*` 复制到根目录 `dist/`。

## 项目结构

```text
.
├── package.json              # 根目录部署构建包装脚本
├── vercel.json               # 静态托管配置
├── web_converter/            # 主前端应用
│   ├── src/
│   │   ├── App.tsx           # 主工作台与模块切换
│   │   ├── ContextCacheCreator.tsx
│   │   ├── CsvTemplateFiller.tsx
│   │   ├── SplitTool.tsx
│   │   ├── *Worker.ts        # 转换、拆分、合并 worker
│   │   └── components/       # 应用框架、上传、结果和侧栏组件
│   ├── package.json
│   └── vite.config.ts
├── 上下文缓存.md
├── 上下文缓存模型列表.md
└── README.md
```

## 常用脚本

根目录：

| 命令 | 说明 |
| --- | --- |
| `npm run install-modules` | 安装 `web_converter/` 内的依赖 |
| `npm run build` | 构建前端并复制产物到根目录 `dist/` |

`web_converter/`：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务 |
| `npm run build` | 构建生产产物 |
| `npm run preview` | 预览生产构建 |

## 使用说明

### Excel/CSV 转 JSONL

上传 `.xlsx`、`.xls` 或 `.csv` 文件。常见输入列包括：

- `custom_id`
- `content`
- 可选 `image_url`

每条有效记录会生成一行 JSONL，请求体中包含 messages、temperature、top_p、max_tokens 等字段。

### JSON/JSONL 转 CSV

支持 JSON 数组、对象或 JSONL 行。工具会尝试提取 prompt、response、DeepSeek `reasoning_content` 等常见批处理结果字段。

### CSV 模板填充

使用 `{{列名}}` 写模板，根据 CSV 每一行批量生成文本，适合提示词、邮件、标签和描述批处理。

### 上下文缓存

上下文缓存模块会通过应用的 `/ark` 代理路由向 Volcengine endpoint 发送内容与 API key。仅在数据允许离开本地浏览器时使用该模块。

## 注意事项

- 除上下文缓存模块外，主要文件转换、预览、拆分和合并逻辑在浏览器本地完成。
- 仓库历史中包含构建产物和依赖目录，日常开发应以 `web_converter/src/` 为准。
- 当前仓库没有单独的 license 文件。
