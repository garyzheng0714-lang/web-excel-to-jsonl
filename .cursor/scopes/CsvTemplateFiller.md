# Feature Spec: CSV Template Filler (CSV 模板填充器)

## 1. 概述
该模块旨在帮助用户通过“模板+数据”的方式批量生成文本内容。用户上传 CSV 文件，并在界面上定义一个文本模板（支持引用 CSV 表头变量），系统将自动遍历 CSV 的每一行，将模板中的变量替换为对应单元格的内容，生成一段新的文本，并将其保存到新增的 `content` 列中。

## 2. 用户故事
*   作为用户，我希望上传一个包含多列数据的 CSV 文件。
*   作为用户，我希望在界面上编写一段文本模板，并能方便地引用 CSV 中的列名（例如 `{{姓名}}`）。
*   作为用户，我希望系统能自动将每一行数据填充到模板中。
*   作为用户，我希望下载处理后的 CSV 文件，其中包含原始数据和新增的 `content` 列（填充后的文本）。

## 3. 功能需求

### 3.1 输入
*   支持文件格式：CSV (`.csv`)。
*   文件大小限制：与现有模块一致（支持大文件流式处理）。

### 3.2 界面交互
1.  **文件上传区**：
    *   支持拖拽或点击上传 CSV 文件。
    *   上传后解析并显示 CSV 表头（列名），作为可用变量展示给用户。
2.  **模板编辑区**：
    *   提供多行文本输入框 (Textarea)。
    *   **变量插入辅助**：在输入框附近列出所有检测到的表头，用户点击表头即可在光标处插入变量占位符（格式如 `{{ColumnName}}`）。
3.  **控制区**：
    *   “开始生成”按钮：点击后开始处理。
    *   进度条：显示处理进度（已处理行数/总行数）。
4.  **结果输出**：
    *   处理完成后，显示成功状态。
    *   提供“下载结果 CSV”按钮。

### 3.3 处理逻辑
1.  **解析**：读取 CSV 文件头，提取列名。
2.  **遍历**：逐行读取 CSV 数据。
3.  **渲染**：
    *   获取用户输入的模板字符串。
    *   使用当前行的数据替换模板中的变量占位符 `{{Key}}`。
    *   如果变量对应的单元格为空，替换为空字符串。
    *   如果模板中引用了不存在的列名，保留原样或替换为空（需确认，默认保留原样以便调试）。
4.  **写入**：
    *   保留原始行所有数据。
    *   新增一列 `content`，写入渲染后的文本。
    *   将结果流式写入临时文件 (OPFS)。

### 3.4 输出
*   文件格式：CSV。
*   文件名：`原始文件名_filled.csv`。
*   编码：UTF-8 (带 BOM 以防 Excel 乱码，或标准 UTF-8)。

## 4. 技术设计

### 4.1 组件结构
*   新增组件 `CsvTemplateFiller.tsx`：
    *   管理文件上传状态。
    *   管理模板输入状态。
    *   展示可用变量列表。
    *   调用 Worker 进行处理。
*   修改 `App.tsx`：
    *   在 `MODULES` 列表中注册新模块 `csv_template_filler`。
    *   在主区域渲染 `CsvTemplateFiller` 组件。

### 4.2 Worker 设计
*   新增 `csvTemplateWorker.ts`：
    *   接收消息：`{ file: File, template: string }`。
    *   使用 `PapaParse` 流式解析 CSV。
    *   执行字符串替换逻辑。
    *   使用 `Papa.unparse` 格式化输出行。
    *   流式写入 OPFS 临时文件。
    *   发送进度消息：`{ type: 'progress', processed: number }`。
    *   发送完成消息：`{ type: 'complete', tempFilename: string, processed: number }`。

### 4.3 关键算法 (模板替换)
```typescript
function renderTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const value = row[key.trim()];
    return value !== undefined ? value : match; // 如果找不到key，保留原样
  });
}
```

## 5. 待确认项
*   Q1: 是否需要支持 Excel (.xlsx) 输入？(目前需求描述主要提到了 CSV，但现有模块支持 Excel，建议保持一致支持 Excel 读取，但输出统一为 CSV)。
    *   *建议*：为了简化流式处理，输入支持 Excel/CSV，输出统一为 CSV。
*   Q2: 模板变量语法是否确定为 `{{Key}}`？
    *   *建议*：是，这是通用的做法。

