---
name: fansai-branding-data-v2
description: Design and refine FansAI Branding Data mobile dashboards, semantic charts, customer and project views, workbench entries, and sheets using the confirmed mint-blue visual system. Use for FansAI mobile UI and chart work; this is a separate branding V2 lineage from the desktop data-system skills.
metadata:
  version: "2.0.0"
  updated: "2026-11-16"
---

# FansAI Branding Data · V2

应用当前已确认的 FansAI 移动端设计语言：黑色画布、深灰青卡片、薄荷与冰蓝数据色、克制的有色玻璃和光影。借鉴 Apple Health / Watch 的组件化读数与直接交互，保持清晰的数据意义、国际化排版与充足留白。创意来自数据组织、图形比例和响应，不靠堆叠发光、仪表盘或装饰线。

本版本总结 2026-11-16 前本项目已确认的实现与偏好。它是 **FansAI Branding Data 的 V2**，不是把另一套桌面数据中台 V3 降级。后续用户的明确反馈优先；不要将本版本视为所有 FansAI 产品或所有页面的强制改版授权。

## 按任务读取

- 修改任何 chart、KPI 或数据动效：先读 [图表表达](references/charts.md)，确认数据关系、单位和分母，再选形态。
- 页面、排版、标题、卡片、图标、列表：读 [视觉与组件](references/visual-system.md)。
- 筛选、详情、日期币种或账号浮层：读 [移动端浮层](references/mobile-overlays.md)，使用同一浅色底部 Sheet 家族。
- 接入现有工程、验证或发布：读 [工程与交付](references/implementation.md)。

## 设计时保持的判断

1. **先理解读数。** 明确指标是计数、组成、时间趋势、阶段转化、排名还是实际目标进度。一个累计数不能生成没有来源的历史曲线。缺失为 `—`，真实零仍为 `0`。
2. **先延续体系，再做变化。** 对齐当前 Growth 的字体、移动端分段切换、圆角与留白；可以换图形表达，不把每张卡复制为同一仪表盘。
3. **数字先于材质。** 主数字清楚，单位较小；少量薄荷、冰蓝、钴蓝/长春花蓝与琥珀区分意义。需要时用斜纹、形状和标签共同区分状态，不能只靠近似颜色。
4. **动效解释变化。** 计数标记、比例块、选中状态和读数联动；入场有限、隐藏暂停、卸载清理，减少动态时直接呈现最终数据。装饰 canvas 必须与数据标记区分。
5. **面和间距组织层级。** 数据密集的客户/项目列表保持深色。白色分析卡适量使用，白色小模块的标题和数字用较轻字重。取消没有信息作用的细分隔线，不删除有必要的数据曲线或定位线。
6. **资源与几何准确。** 用户指定 Figma 图标时先核对同名节点，缺失就说明；下载并使用原资源。云朵等比、PNG 不拉伸，画布圆角成组一致。Demo 人像不暗示真实员工身份。
7. **沿用操作语义。** 保留路由、权限、筛选和已有数据。只读详情右上“关闭”；有草稿才有提交按钮。未开放入口按实际产品要求隐藏，不创造可用性假象。

## 当前基准组件

- 主标题：`Growth`、`Customer`、`Decisions`、`Workbench`，统一青色字、白句点及原始云朵，窄屏等比适配。
- Customer：回款比例块、合同集中度点阵、阶段数量柱、BD 贡献条、六张 Global KPI 微图表。
- Workbench：客户业务与产品增长的图标/文字分离；内部项目与知识库保留整卡；`Shared Space` 英文标题。
- 四 Tab 真实加载态共用黑底深灰青圆角骨架；就绪内容不为了动画延迟。
- 所有本次目标页面的移动浮层复用 Growth 浅灰蓝 Sheet。不要恢复过去的白底大弹窗或仅右下角深色“关闭”按钮。

## 交付边界

默认只修改用户指定范围。设计草稿先保存在本地，仓库链接本身不等于发布授权；用户明确要求同步确认版本时，完成检查后执行该次同步，无需重复索要同一授权。记录真实测试结果，不把编译成功写成视觉验证，也不把单次发布授权扩展为未来草稿自动发布。
