# Workbench mobile home

The initial local iteration applies the established Growth and Customer mobile treatment to the Workbench home: a black canvas, gray-blue surfaces, cyan heading, clear section hierarchy, and the 16 supplied ice-blue glass business icons. It preserves the existing entry catalog, permissions, routes and unavailable-entry messages. The separately authorized November 16 additions are recorded below; the original Workbench revision did not change other tabs.

## Guideline provenance and mobile policy

The exact installed skill name “UI Guideline Skill V1” was not found. A standalone historical data-system V1.3 source was verified at the project paths `fansai-data_Skill-working/fansai-data-system_Skill_V1.3/SKILL.md` and `github-fansai-data-skill/fansai-data-system_Skill_V1.3/SKILL.md`; the two files have identical SHA-256 `f12db22f3c714b73c5929770c5488aa7a51b6792bcc2a736a275983ec28697c6`. They explicitly document the V1.0–V1.3 lineage. This is distinct from the installed `fansai-data-system-v3` skill.

V1.3 contributes restrained typography, Chinese label weight 500, consistent spacing, rounded groups, and a clear separation between display and functional elements. Its desktop 36px margins, shallow mint-white background, and desktop modal examples are not transplanted into this mobile view. The existing Growth/Customer mobile pages are the direct visual baseline; the implementation reuses the embedded fonts, mobile gutters, dark surfaces, and cyan hierarchy rather than adding remote font dependencies. Entry targets remain at least 44px, labels wrap, and keyboard focus is visible.

Two similarly named references were deliberately distinguished during the source audit. `Fansai UI Guideline.html` is a branded chat demonstration marked v1.0 with Lime, Sun, Sky and Mono palettes; its v1.1 companion is also not an installed data-system skill. The project document `output/branding-data-platform-v1-preview/New-branding-Data-platform-V1.0-设计偏好确认稿.md` is closer to the current mobile design, but explicitly says it awaits confirmation and no skill has been created or installed. Neither is represented here as an approved formal skill. The existing mobile policy document `output/FansAI-Growth-青蓝优化版-20261106/design-knowledge/FansAI-青蓝Dark-UX规范.md` provides project-specific mobile adaptations; it is not relabeled as V1.

## Original Figma assets

The original 16-icon asset set comes from Figma file `5eV9HU93QC0oYubyKtNSMB`, parent node `198:55949`. `mobile/workbench-src/icons.json` records individual node IDs, original filenames, dimensions, byte lengths and SHA-256 values. Each of those PNGs is 430×390 pixels; the containing Figma frames were 512×512. The separately supplied Knowledge icon, node `209:64`, is now the 17th manifest entry and retains its original 1024×1024 PNG bytes. The PNGs remain unmodified and are fitted with `object-fit: contain`, including their supplied black backing. They are not cropped, recolored, vector-recreated, or replaced by another brand-icon library.

The builder embeds the original PNG bytes as `WB_ICONS[key] = { src, width, height, nodeId }`. It checks the PNG signature, dimensions, byte count and checksum before embedding. The standalone mobile page therefore makes no external image request for these icons. The manifest retains source identifiers without expiring asset URLs.

Mappings use group plus entry label, so the customer and growth “数据看板” entries receive different supplied images. The original 16 assets cover the existing business groups: customer business (6), product growth (8), and internal projects (2). The released Knowledge entry now uses its separately supplied original PNG. The source catalog is intact; November 16 hides unreleased lower entries at render time, as detailed below.

## Integration boundaries

- `mobile/workbench-src/workbench.jsx` renders the home from the existing `sU(vy, perms)` catalog and permission filter, then applies the November 16 visibility rule. It passes each released route to the original `go` callback. The retained internal-project preview still calls the original translated “开发中” toast; this iteration does not enable unfinished features.
- `mobile/workbench-src/workbench.css` scopes the design to `#v-more` and its visible-home ancestors. It does not restyle the `Tj` secondary-page renderer or global `pu` icon definitions.
- `mobile/customers-src/build.cjs` compiles the additional Workbench module through the existing `CXReact` runtime and appends the scoped stylesheet. `WORKBENCH_APP_PATCHES` contains three explicit, reversible changes: replace only the `gk` home call from `P9` to `FansaiWorkbench`; change the home heading to “Workbench”; and wrap the account entry only when `C.tab === "more" && !C.page`.
- The Workbench account wrapper reuses the approved mobile account shell and original `lM` content. Session data, forms, validation, mutations, language, role and logout logic remain the original implementation. Customer account routing is preserved; Workbench secondary pages and unrelated tabs keep their previous account entry.

The build applies Customer patches, navigation repairs, Workbench patches, the separately authorized Growth quick-entry image patch, primary-tab loading patches, then shared-primary-header patches. The preservation check reverses the patch groups in the opposite order before comparing the original embedded application. The complete existing Customer-account expression is the Workbench account patch anchor, so a different account call cannot be accidentally replaced.

Entrance motion is finite: each visible group settles once with a short stagger. It stops on hidden documents, unmount, and reduced-motion preference. Icons do not continuously rotate, pulse or modify their source artwork.

## Local verification and publishing boundary

Run the shared pipeline from the repository root:

```sh
node mobile/customers-src/build.cjs
node mobile/customers-src/check.cjs
```

The source baseline remains Git commit `1ceb4418f96d99744212d6b12b82226519c43e61`. The build is local and preserves earlier uncommitted Customer changes through the same source modules and patches. Browser review and interaction testing are separate from the exact-source and asset-integrity checks; compilation alone does not establish visual fidelity.

For the initial Workbench revision, the local pipeline passed 21 Customer, 8 KPI, 6 Workbench and 7 original data checks, plus scoped CSS validation, syntax, reproducibility, navigation checks and exact baseline restoration. `git diff --check` also passed. The Workbench checks compare all 33 entries with the original permission-filtered catalog and callbacks, verify the 16 original PNG checksums and embedded bytes, distinguish the two dashboard icon mappings, and exercise the finite-motion lifecycle. These results predate the November 16 additions.

Browser review covered the default preview plus 320px and 393px browser viewport overrides. Because the existing preview/browser scales its inner frame, the effective inner window widths measured 291px and 357px. The narrow home had no horizontal overflow or overflowing entry content. The grid uses three columns at 350 CSS px and below; wider groups use four, while groups with only two or three entries fill their own row. Labels wrap without truncation. All 16 images loaded at their original 430×390 dimensions and retained `object-fit: contain` in their mapped slots.

Observed flows included customer operating board, projects, Growth, content assets and return navigation, the unavailable internal-project toast, and Workbench account/profile views. The original content-assets subpage retains its own appearance and hides the root navigation. The account sheet uses the shared pale mobile shell; Escape closed it and restored focus to its trigger. No account save, password, locale, role or logout mutation was executed. Final browser error logs were empty. The temporary viewport override was reset, and the preview was left on Workbench.

Review images are stored in the parent workspace at `outputs/FansAI-Workbench-review/`: `workbench-home-figma-icons.png`, `workbench-business-icons.png`, `workbench-operations.png` and `workbench-narrow.png`.

This iteration does not authorize or perform a commit, push, pull request, remote repository change, or deployment.

## November 16: four Growth quick-entry images

The user explicitly authorized replacing the four pixel-art images under Growth with the corresponding supplied glass assets. A fresh Figma design-context check and the complete parent-frame screenshot confirmed these mappings:

| Existing Growth entry | Existing route | Embedded asset key | Figma node | Original PNG |
| --- | --- | --- | --- | --- |
| 内容资产 | `page:content` | `content` | `198:56008` | `e2b2b.png` |
| 素材库 | `page:mat:lib` | `materials` | `198:56010` | `4a70c.png` |
| 生成任务 | `page:mat:gen` | `generation` | `198:56012` | `96c44.png` |
| 账号管理 | `page:acct` | `accounts` | `198:56014` | `9d2b4.png` |

`GROWTH_TOOL_APP_PATCHES` contains one reversible replacement of the unique `gxBrandToolIcon(index)` helper. It returns a decorative image from the existing `WB_ICONS` data, retains `gx-tool-art`, and uses `object-fit: contain`, a black background, and the requested 16px corners. No duplicate asset download or image transformation is required. The existing Growth buttons, translated labels, `go` callbacks, source catalog and tile markup are unchanged. Existing 76/64/56px responsive image slots and press feedback continue to come from Growth's original styles.

The old pixel SVG definitions remain in the baseline source for exact restoration. The original pixel-motion code safely skips an image without a business-silhouette child; it does not animate or rewrite the PNG. This narrow change does not replace the global `pu` paths or alter Growth charts, metrics, filters, data or navigation destinations. The change remains local only; verification of the November 16 revision is recorded separately from the earlier review above.

## November 16: Workbench entry refinement

With the full Demo permission set, the home now shows 17 entries: 16 with existing destinations and the specifically retained internal-project preview. Sixteen lower entries without routes are hidden. The original `sU(vy, perms)` permission filtering runs first; the new visibility filter then removes empty groups and sections. It does not mutate the catalog, grant a route, or bypass permissions. A more restricted account can see fewer entries.

The redundant two-line “经营” section heading and description are omitted; its customer, product-growth and internal-project groups retain their titles. Customer and product-growth entries use `is-separated`: each glass icon tile and its caption are visually separate. Internal-project entries keep their black full-card treatment, and the unavailable internal-project preview carries its development pill in the upper-right corner. Its click still produces the existing “开发中” toast. The released Knowledge entry remains available; empty lower sections do not leave blank headings or gaps.

These are Workbench-home presentation and visibility changes. Its original route handlers, secondary pages, account behavior and the earlier Customer work are retained. The previous 33-entry verification above describes the initial version, while the November 16 checks must verify the final 17-entry default view and the permission-filtered subsets.

## November 16: shared primary-tab loading

The separately authorized loading revision gives Growth, Customer, Decision and Workbench the same Growth-derived dark rounded skeleton. `mobile/navigation-src/loading.jsx` provides `FansaiTabSkeleton` and a per-tab `FansaiTabContent` Suspense boundary; `loading.css` scopes the placeholders and temporary loading background to the four primary sections. The skeleton exposes a translated loading status while hiding its decorative shapes from assistive technology.

`mobile/navigation-src/patches.cjs` exports nine exact patches: four primary-section boundaries and five existing pending branches (Growth home, Customer board, Customer library, Customer projects, and Decision list). The existing Growth keepalive remains inside its own boundary. Customer and Decision search controls remain outside their query-owned pending content. Existing loading flags, queries, error states, successful content and secondary-page loading remain unchanged.

The shared skeleton is driven by actual pending work, with no timer, artificial delay or minimum display duration. Ready content appears immediately. Workbench's bundled catalog is synchronous, so its boundary provides the common fallback if it suspends without forcing a fake loading interval. No shimmer, looping animation, fixed overlay or route-state mutation is introduced. `TAB_LOADING_APP_PATCHES` is applied after the navigation repair so its Growth boundary can match the existing keepalive; `TAB_LOADING_INNER_PATCHES` is currently empty. The build and preservation checks export and reverse both groups explicitly.

## Shared primary titles and the original cloud asset

`mobile/header-src/header.jsx` now supplies the same primary-title component for “Growth”, “Customer”, “Decisions” and “Workbench”. It uses the embedded Geist font system, cyan text, and the original Figma cloud SVG from node `115:33467`. `logo.json` records the original 38×38 dimensions, `0 0 38 38` viewBox, byte length and checksum. The builder embeds the unchanged SVG as an image data URI; its paths, root dimensions and original `preserveAspectRatio` attribute are not edited or recolored. Rendering it in a square 38×38 box corrects the previous flattened presentation.

The SVG contains the cloud only. A single separate 7×7 white square period sits at the lower-left of the same 38×38 tail-marker box. The image and period share one uniformly scaled wrapper, so the period does not add horizontal width. This corrects the earlier screenshot-only assumption that the SVG already included the period. No inline SVG recreation or duplicate dot is used.

All four titles start from the same 43px/700 typography. The component measures its actual available width and proportionally fits the label, 4px gap and tail-marker wrapper when needed; it responds to container resize and embedded-font readiness, and cleans up its observers and listeners. The image element remains 38×38. It does not hide overflow to mask a collision with the existing avatar or Growth filter button.

`PRIMARY_HEADER_APP_PATCHES` contains three reversible changes: Growth's visible intro title subtree, the other primary pages' title content, and omission of the primary-only eyebrow. The Growth outer header remains hidden; the existing date/filter control stays in place. Secondary pages continue using the original `Et` title and `Gt` eyebrow. No navigation label, account action, chart or filter callback is replaced.

Decision retains its original grayscale data content. Only on its primary page, the previous whole-app grayscale filter moves to the ready `main` content and avatar, letting the new black title area display cyan. A `main:not(:has(.fs-tab-skeleton))` guard preserves the approved blue-gray loading skeleton. Other pages and sheets retain their original filter boundaries. The header stylesheet does not change Decision list colors or the separate bottom navigation.

The placeholder fill is the Growth base `#10191f`. While a visible primary section contains the skeleton, the navigation uses its existing dark-glass tokens. This is a CSS-only temporary state: it does not change `data-appearance`, dispatch a preference event, or write storage. The user's normal navigation appearance resumes when pending content disappears.

## November 16: initial loading-revision verification

The initial November 16 loading revision passed 518 scoped CSS selectors, 21 Customer checks, 8 KPI checks, 3 shared-loading checks, 7 Workbench/Growth-icon checks, and 7 original-data checks. Syntax, route isolation, navigation repair, exact baseline restoration, build reproducibility and `git diff --check` passed.

Browser review confirmed 17 visible Workbench entries, one development badge, separated business/growth captions and the retained internal-project cards. The 320px and 393px browser overrides produced 291px and 357px inner viewports; neither had horizontal page overflow or overflowing labels. All 16 Workbench PNGs and the four Growth shortcut PNGs loaded at their original 430px natural width. The four shortcut node IDs matched the fresh Figma context.

A real Customer request visibly displayed the new dark skeleton and clickable dark-glass navigation. Decision content was already ready when observed, so no Decision loading screenshot is claimed. Each primary tab opened successfully, and repeated Customer/Growth/Workbench switches plus Decision-to-Workbench returned to ready content with no stuck visible skeleton. Browser error logs were empty. The temporary viewport override was reset, and the local preview was left on Workbench. No GitHub updates were made.

Screenshots of that earlier revision in the parent workspace's `outputs/FansAI-Workbench-review/`:

- `workbench-separated-icons-20261116.png`
- `workbench-internal-tag-20261116.png`
- `workbench-narrow-20261116.png`
- `growth-figma-quick-icons-20261116.png`
- `customer-shared-loading-20261116.png`

## November 16 follow-up: Knowledge, title hierarchy and matching canvases

The Knowledge entry now uses the untouched Figma PNG from node `209:64`, `assets/6ca3e.png`, at its original 1024×1024 resolution. Its manifest entry is appended as `knowledge`; the original 16 business PNGs and their checksums remain unchanged. Knowledge uses the same two-column grid, black card, image stage and caption treatment as Supplier. Its original `kbf:all` destination is retained.

Workbench group-heading weight increases from 500 to 650, with more inner space and a 28px gap between group cards instead of 16px. The shared section is headed “Shared Space” at 26px/650, without its previous description. Workbench image stages and Growth's four quick-entry image canvases have matching 16px corners and black backing; images remain contained without cropping or stretching.

The final build passed 536 scoped CSS selectors, 21 Customer, 8 KPI, 3 loading, 3 primary-header, 7 Workbench/Growth-icon and 7 original-data checks. Exact baseline restoration, syntax, navigation, routes, reproducibility and `git diff --check` passed.

Browser inspection confirmed that Knowledge and Supplier have identical card dimensions (approximately 135.83×144.99 CSS px in the measured viewport), 18px card corners and 88×88 image stages with 16px corners. Knowledge loaded at 1024×1024 and Supplier at 430×390. The Knowledge entry opened its original page, whose title remained “知识库”; its Back control returned to Workbench.

All four primary titles showed one original cloud image and one separate period. At the tested 291px inner viewport, every title fit without horizontal overflow or touching its right-hand control; the cloud image remained square. The 357px inner-viewport review confirmed the common cyan/700 treatment and preserved avatar/date controls. All four Growth quick-entry images had square 64px boxes, 16px corners, black backgrounds and `object-fit: contain`. Browser error logs were empty. The viewport override was reset and the local preview was left on Workbench; no GitHub update occurred.

Latest review images in `outputs/FansAI-Workbench-review/`:

- `workbench-brand-spacing-20261116.png`
- `workbench-brand-narrow-20261116.png`
- `shared-space-knowledge-20261116.png`
- `growth-brand-header-20261116.png`
- `customer-brand-header-20261116.png`
- `decisions-brand-header-20261116.png`
- `growth-rounded-tools-20261116.png`
