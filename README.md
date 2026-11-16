# FansAI Branding Data

[移动端预览](https://cocolayuan.github.io/FansAI-Branding-V1/mobile/) · [Chart 展示](https://cocolayuan.github.io/FansAI-Branding-V1/) · [设计规范 V2](docs/design-system-v2.md) · [Skill V2](skills/fansai-branding-data-v2/SKILL.md) · [下载当前版本](https://github.com/cocolayuan/FansAI-Branding-V1/archive/refs/heads/main.zip)

FansAI 的移动端数据体验与品牌组件：黑色画布、薄荷与冰蓝、清晰读数、克制的有色玻璃及直接交互。当前确认版包括 Growth、Customer、Decisions、Workbench；所有业务数据均为 Demo。

项目显示名称为 **FansAI Branding Data**，仓库地址保持不变。**V2 是设计规范与 skill 的版本号**，独立于应用包和历史 release 版本。

## 设计与图表

- **先有数据意义，再选图形。** 计数用单位点阵或计数柱；构成用比例块；转化用同尺度阶段柱；历史用真实时间曲线。缺失是 `—`，真实零是 `0`。
- **数字先于材质。** 深灰青承载密集数据，少量白色分析面建立节奏；轻字重读数、明确单位、充足留白。斜纹与形状辅助状态区分。
- **动效解释变化。** 计数入场、比例展开、选中明细联动；减少动态时仍显示准确结果。保留 Growth 的重点 ROI 仪表盘，不将所有 KPI 仪表盘化。
- **组件保持同一体系。** 四 Tab 标题和真实加载骨架统一；业务图标采用 Figma 原资源；所有目标移动浮层沿用 Growth 浅灰蓝底部 Sheet。

| 指标关系 | 当前组件 |
| --- | --- |
| 客户 / 新增 / 签约数量 | Global KPI 点阵、短划线与计数柱 |
| 在制 / 交付 / 延期项目 | 阶段比例块、交付端点、琥珀斜纹计数柱 |
| 已收与待收 | 可选择的比例块与精确金额 |
| 合同集中度 | 100 点占比矩阵与分组明细 |
| 阶段转化与 BD 贡献 | 阶段数量柱、排序比较条 |
| ROI 与历史 | Growth 主仪表盘、真实日期曲线与读数联动 |

详细语义、倍率、分母、颜色、交互与已拒绝方案见 [Chart 规范](skills/fansai-branding-data-v2/references/charts.md)。

## 使用 Skill V2

将 [`skills/fansai-branding-data-v2`](skills/fansai-branding-data-v2) 文件夹安装到你的 Codex skills 目录，再使用：

> 使用 $fansai-branding-data-v2 优化 Customer 的项目图表，保留现有数据和其他页面。

该 skill 提供图表、视觉、浮层及工程四份按需引用文档，是独立的 Branding V2；不替换其他桌面数据中台 skill。

## 本地预览与构建

移动端交付文件为 [mobile/index.html](mobile/index.html)，React、字体、图标及 Rive 运行资源已内嵌。可以下载后直接打开；本轮验证环境为本地 HTTP 与发布预览，未把 `file://` 作为已验证结果。建议使用本地 HTTP 预览：

```sh
python3 -m http.server 8791
```

然后打开 `http://localhost:8791/mobile/`。

重新构建需要 **Node.js 20+ 和完整 Git 历史**；构建器以已固定的基线提交恢复原应用，再应用限定范围补丁。下载 ZIP 可使用生成页面，但不具备重新构建所需的 Git 历史。

```sh
git clone https://github.com/cocolayuan/FansAI-Branding-V1.git
cd FansAI-Branding-V1
npm ci
npm run build:mobile
npm run check:mobile
npm test
```

源码入口：[`mobile/customers-src`](mobile/customers-src)、[`mobile/workbench-src`](mobile/workbench-src)、[`mobile/header-src`](mobile/header-src)、[`mobile/navigation-src`](mobile/navigation-src)。构建与检查覆盖数据语义、路由、作用域、生成文件一致性及未修改内容的精确恢复。

[Customer 实现与图片来源](docs/customers-redesign.md) · [Workbench / 标题 / 图标实现](docs/workbench-redesign.md) · [Rive 源码](rive/) · [Rive 动画预览](https://cocolayuan.github.io/FansAI-Branding-V1/rive/preview.html)

历史 [v1.1.0 ZIP](https://github.com/cocolayuan/FansAI-Branding-V1/releases/download/v1.1.0/FansAI-Branding-V1.zip) 保留为归档，不代表当前确认版。
