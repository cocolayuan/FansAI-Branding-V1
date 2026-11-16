# 工程、验证与发布

参考工程：[FansAI Branding Data](https://github.com/cocolayuan/FansAI-Branding-V1)。以下路径以仓库根目录为起点；用于定位已验证组件，不要求其他工程复制同一打包方式。

本版核对日期为2026-11-16，工程记录见仓库 `docs/customers-redesign.md` 与 `docs/workbench-redesign.md`。后续任务需检查当前源码与资源清单；历史记录不证明未来版本仍保持相同行为。

| 范围 | 当前源码 |
| --- | --- |
| 客户经营主图表 | `mobile/customers-src/customers.jsx`、`customers.css` |
| Global KPI | `mobile/customers-src/kpi-cards.jsx`、`kpi-cards.css` |
| 统一 Sheet 与账号壳 | `mobile/customers-src/customer-sheet.jsx`、`customer-sheet.css` |
| 筛选/详情 | `customer-filter.*`、`customer-details.*`、`project-modal.*` |
| Workbench | `mobile/workbench-src/workbench.*`、`icons.json` |
| 主标题和云标 | `mobile/header-src/` |
| 四 Tab 骨架 | `mobile/navigation-src/` |
| 可复现单文件构建 | `mobile/customers-src/build.cjs`、`check.cjs` |

## 先确认范围

识别当前实现、已有路由、权限和数据源，再动目标组件。保留其他页已确认的设计。原始同步 `sources/` 是只读参考，不修改。现有单文件 HTML 是构建产物，不手工改压缩/base64片段；通过模块和明确补丁生成。

真实值、零值、未知值、时间段、币种、快照和目标分母必须保持区别。示例记录可用于演示但明确 Demo；不要为更漂亮的图替换源数据或编造增长趋势。

## 与变更匹配的验证

- 对变更所涉及的数据选择、比例、聚合、未知/零、空态和真实交互做检查；纯样式调整优先实看，不为每个CSS值写镜像测试。
- 验证当前页面及受影响入口：选中/取消、滚动、键盘、详情返回、四 Tab 回切。使用实际手机宽度，长金额和长标题不截断、不横向溢出。
- Figma 资源检查本地文件、节点映射、自然尺寸、实际画布和浏览器比例；logo不能压扁，圆角需看实际裁切结果。
- 运行构建与相关检查后，确认生成文件和源码一致。保持现有字节反向恢复/作用域检查，避免改到无关内容。
- 区分本地 HTTP、`file://`、发布预览三种环境；只报告实际验证过的环境。不为了验证账号界面执行密码修改、退出登录等真实写操作。
- 保存能说明结果的截图；文档和 skill 不包含本机私人路径、凭据、临时资产URL或不可复用的会话信息。

## 发布与 skill 维护

未定稿先本地修改和预览。仅提供 GitHub/Figma 链接不等于发布授权。用户明确要求同步确认版本时，完成必要检查后同步该次授权的工程与文档；不重复索要已经给出的发布确认，也不把本次授权当作以后自动发布的许可。

同步前读取当前远端状态，保留其他修改，通过正常提交与合并发布，避免强推覆盖。发布后核对实际分支/提交与 Pages 结果；部署仍在进行时继续检查，不能把分支 push 写成网页已更新。

此 skill 的仓库版本与安装版本应保持一致。新偏好先确认属于特定页面、图表语义还是可复用规则，再更新相应 reference；不要把一次示例数据、临时妥协或尚未采用的方案写成永久标准。版本号与应用包版本各自管理。
