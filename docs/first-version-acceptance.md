# 第一版验收清单

依据：`gzh_tool_design_v3.md`

## 已实现

- 写作台 / 排版台双工作台：`src/App.tsx`
- 内容 AST：`src/domain/types.ts`
- 8 套版式配置：`src/domain/stylePresets.ts`
- AI 写作：OpenAI 兼容请求 + 本地兜底：`src/domain/aiClient.ts`、`src/domain/aiWriting.ts`
- AI 自适应排版：模型请求、返回校验、本地规则兜底：`src/domain/aiLayoutSchema.ts`、`src/domain/aiLayout.ts`
- 版式合并：base → AI overrides → 用户 overrides：`src/domain/styleEngine.ts`
- 微信内联 HTML 渲染：`src/domain/wechatRenderer.ts`
- 复制到公众号：`text/html` + `execCommand` 兜底：`src/domain/clipboard.ts`
- 草稿列表 / 版本历史 / 设置 / 自定义版式保存：`src/domain/draftLibrary.ts`、`src/domain/aiSettings.ts`、`src/domain/customStyles.ts`
- 图片拖拽 / 粘贴 / Markdown 图片块：`src/domain/imageAssets.ts`
- 块级微调：`src/domain/blockOverrides.ts`
- Tiptap 块编辑：`src/components/WriterEditor.tsx`、`src/domain/tiptapAdapter.ts`
- Tauri 桌面打包骨架：`src-tauri/`

## 第一版刻意降级

- 桌面端：已接 Tauri 骨架，但不做签名、公证、自动更新。
- 真实图片公网托管：当前使用 data URL 本地预览；公众号最终图片仍建议后台补图。

## 验收命令

```bash
npm test
npm run build
npm run tauri:build
```

当前覆盖 15 个以上测试文件，包含草稿列表、版本历史、Tiptap AST 往返、渲染、复制和 AI 兜底。

当前本机执行 `npm run tauri:build` 已完成前端 `beforeBuildCommand`，随后卡在 Cargo 下载 crates.io 依赖：全局 Git 代理为 `127.0.0.1:7890`，但该端口不可连，错误为 `failed to download from https://index.crates.io/config.json`。启动代理或清除 `git config --global http.proxy/https.proxy` 后重跑即可继续桌面产物构建。

## 下一阶段建议

1. 增加更细的组件变体 UI。
2. 图片公网托管或公众号图片工作流。
3. Tauri 签名、自动更新和安装包品牌化。
4. 更完整的 AI 提示词与流式生成体验。
