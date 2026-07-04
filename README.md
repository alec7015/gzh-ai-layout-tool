# 公众号 AI 自动排版器

个人自用的本地版公众号写作与排版工具，按 `gzh_tool_design_v3.md` 开发第一版。

## 公开访问

- GitHub 仓库：https://github.com/alec7015/gzh-ai-layout-tool
- 在线预览：https://alec7015.github.io/gzh-ai-layout-tool/
- 源码 ZIP：https://github.com/alec7015/gzh-ai-layout-tool/archive/refs/heads/main.zip

部分平台会限制直接抓取 GitHub 的 `tree/main/子目录` 页面；需要导入源码时建议使用仓库根地址或源码 ZIP。

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的 `http://127.0.0.1:5173/`。

## 桌面运行 / 打包

```bash
npm run tauri:dev
npm run tauri:build
```

默认生成 Windows Tauri 产物，不包含签名、公证或自动更新。

如果本机全局 Git 代理指向不可用端口，Cargo 下载依赖会失败，例如：

```text
Failed to connect to 127.0.0.1 port 7890
failed to download from `https://index.crates.io/config.json`
```

可先启动对应代理，或临时清除代理后重跑：

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
npm run tauri:build
```

## 验证命令

```bash
npm test
npm run build
npm run tauri:build
```

## 第一版已实现

- 写作台：Tiptap 块编辑、魔法粘贴富文本净化、多图版式、主题/风格本地生成、润色/扩写/精简/起标题、本地 AI 接口设置保存。
- 排版台：8 套版式、AI 规则推荐、主题色/字号/段距微调、块级颜色/背景/对齐 override。
- 预览：手机 / 平板 / 桌面三档设备框，明暗预览复用同一份渲染结果。
- 渲染：AST + Style Preset 生成微信兼容内联 HTML，支持列表、表格、单图和多图。
- 复制：复制前重塑列表/表格、外链图转 Base64，优先 `text/html` Clipboard API，失败时自动退回 `execCommand`。
- 本地保存：草稿列表、版本历史、AI 设置、自定义版式保存到浏览器/Tauri WebView `localStorage`。
- 图片：写作区支持 Markdown 图片块、拖拽/粘贴图片转 data URL，多图使用公众号兼容的 inline-block 输出。
- 桌面端：已接入 Tauri 2.x 骨架，可执行 `npm run tauri:build` 打包。

## 暂未接入

- 写作与智能排版已预留 OpenAI 兼容 `chat/completions` 请求；未配置 API Key 或模型返回不合法时自动走本地规则兜底。
- 真实图片公网托管：当前使用 data URL 本地预览，公众号最终图片仍建议后台补图。
- 签名、公证、自动更新：个人自用第一版暂不接入。

## 项目结构

```text
src/domain/          核心 AST、版式、AI 规则、渲染、复制、存储模块
src/App.tsx          写作台与排版台主界面
src/styles.css       应用布局与视觉样式
src-tauri/           Tauri 桌面打包骨架
gzh_tool_design_v3.md 设计文档
```
