# 项目规则

这是 React 18 + TypeScript + Vite 的纯前端单页工具。源代码根为 `web_converter/`；项目能力和安全边界以 `README.md` 为准。

## 命令

```bash
cd web_converter
npm install
npm run dev
npm run build
npm run preview
```

项目没有自动化测试脚本。验证文档或代码事实时至少运行 `npm run build`，不要声称“测试通过”。

## 结构与边界

- 六个模块由 `App.tsx` 内的 `ModuleId` 切换，不是六条 URL 路由。
- 文件转换、合并、模板填充和拆分应保持浏览器本地处理；大结果使用 Web Worker 与 OPFS。
- 上下文缓存是唯一主动调用远程 API 的模块；请求经 `/ark` 代理到火山方舟 Responses API。
- API Key 只能存在于用户输入和当前页面状态，不写入源码、日志、示例、localStorage 或文档。
- `examples/context-cache-food-localization.txt` 是内部数据载荷，不是 Markdown 文档，不得把内容复制进 README、issue 或调试输出。
- 预置模型、价格、TTL 上限等易变信息以官方文档为准；不要再提交整页供应商快照。
- 不手工修改 `dist/assets/*`。需要产物时从 `web_converter/` 重新构建。
- 保护现有工作树中的 README、锁文件、`web_converter/dist/` 和依赖安装痕迹，不替用户重置或回滚。

## 关键字段契约

- Excel / CSV 转 JSONL：`custom_id`、`content` 必需，`image_url` 可选。
- 模板填充：占位符格式为 `{{列名}}`，输出增加 `content` 列。
- 拆分 CSV：单个分片上限为 20,000 行，包含表头和两行空行。

## 深入入口

- `README.md`：使用、数据边界与官方链接。
- `web_converter/src/App.tsx`：模块和主工作流。
- `web_converter/src/ContextCacheCreator.tsx`：缓存请求契约。
- `web_converter/src/worker.ts`、`*Worker.ts`：转换细节。
