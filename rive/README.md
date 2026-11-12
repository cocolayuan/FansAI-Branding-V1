# 玻璃 Tab · Rive

[交互预览](preview.html) · [下载 .riv](build/fansai-glass-tabs.riv) · [编辑源文件](scene.rml)

- **483ms 竖轴翻面**：银白 → 细侧面 → 青蓝；按压与释放回弹。
- **减少动态**：直接切换静态选中态；静止时不循环。
- **4 Artboards**：`Growth` / `Customers` / `Decision` / `Workbench`，均为 64 × 72。
- **状态机**：`TabIcon`；View Model：`TabIconState`，实例 `Default`。
- **布尔属性**：`active`、`pressed`、`reducedMotion`。每个图标单独实例，启用 `autoBind`。

外观来自内嵌批准图集，翻面由 Rive 二维投影完成。[图集](assets/approved-atlas.png) · [生成器](generate.mjs) · [配置](rive.yaml)

Rive 负责图标翻面、选中和按压；玻璃底座、滑动光与页面入场由 CSS / WAAPI 负责。[原 App 接入 JS](integration/glass-nav.js) / [CSS](integration/glass-nav.css) 原样保留，依赖原 App 的 React 别名 `ju`、`l`、路由及 `__FG_RIVE_BUFFER` / `__FG_SHEET_URL`，不能独立直接执行。

本地预览：在仓库根目录运行 `python3 -m http.server 8080`，打开 `http://localhost:8080/rive/preview.html`。运行时与动画均在本地，可断网运行。

可选重建：安装 Rive CLI 后，在本目录运行 `node generate.mjs`、`rive . --once`。生成器会覆盖 `scene.rml`，手改源文件后不要直接重新生成。

[运行时 MIT 许可](runtime/LICENSE) · [文件校验](manifest.json)
