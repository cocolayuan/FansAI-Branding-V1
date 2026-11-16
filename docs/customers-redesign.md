# Customers redesign aligned with Growth

The mobile Customers tab follows Growth’s dark gray-teal surfaces, bright cyan and mint data, and white statistical trays. Two proportional panels show how signed amounts split between received and outstanding payments; their widths use the actual shares, and selecting either panel updates the amount above. Customer-concentration dots, conversion stages, and expandable BD rows add visual treatments within that established system. The header reads “Customer”, customer records open with the initiation filter selected, and both customer and project lists use dark surfaces. All Customer overlays use a shared bottom-sheet shell based on Growth’s filter treatment. Period and currency selections now stay in a local draft until Apply; Cancel discards the draft. The record/project workflows retain their existing data and action semantics.

The figures are the existing embedded **Demo** data. The new visualizations derive from those figures; they do not connect to a live CRM or create transactions.

The supplied Figma reference, node `158:182`, was inspected through the Figma MCP. It is a semicircular pointer gauge. This iteration follows the requested alternative form: it borrows the reference’s cyan contrast and quiet gray treatment, while using two panels whose widths represent the actual payment shares. It is not a one-to-one reproduction and does not copy decorative Figma assets.

Editable implementation:

- `mobile/customers-src/customers.jsx` — React board component.
- `mobile/customers-src/customers.css` — Customers-only styles and motion.
- `mobile/customers-src/kpi-cards.jsx` and `kpi-cards.css` — the two approved three-card KPI groups in the customer library and projects subtab.
- `mobile/customers-src/customer-sheet.jsx` and `customer-sheet.css` — shared Customer overlay shell and Customer-only wrapper around the original account component.
- `mobile/customers-src/customer-filter.jsx` and `customer-filter.css` — staged time/currency controls with explicit Apply and Cancel.
- `mobile/customers-src/customer-details.jsx` and `customer-details.css` — customer details using the original queries and aggregation.
- `mobile/customers-src/project-modal.jsx` and `project-modal.css` — project detail content using the shared shell.
- `mobile/customers-src/avatars.json` and `assets/` — local Demo portraits with their source and license metadata.
- `mobile/customers-src/integration.cjs` — keeps Growth mounted while inactive and limits pull-to-refresh to scrolling app content, preserving fixed navigation taps.
- `mobile/customers-src/build.cjs` — injects the component and styles into the standalone mobile file.
- `mobile/customers-src/check.cjs` — syntax, CSS scope, reproducibility and exact preservation checks.

Run from the repository root with Node 20 or newer. A fresh checkout installs the exact dependencies from the tracked lockfile:

```sh
npm ci
npm run build:mobile
npm run check:mobile
npm test
```

The build reads the original `mobile/index.html` from Git commit `1ceb4418f96d99744212d6b12b82226519c43e61`. This pinned baseline remains stable after merging the redesign. It replaces the board and Customer detail component calls, adds Customer-only filter and account routing, inserts the new React components, embeds the local portrait bytes, applies explicit Customer heading/default-stage patches, retains the existing Growth subtree between visits, restricts pull-to-refresh to app content, and appends scoped styles inside the existing embedded document. All patches are reversible for preservation checks. The original account component and its authenticated mutations remain intact and are reused by the Customer wrapper. Growth and all other tabs retain their original account entry. Fonts, Demo data, the outer wrapper, and unrelated tab content remain intact.

The build dependency is pinned to `esbuild@0.25.0` in `package.json` and the lockfile. Normal checkouts use that local dependency. `FANSAI_ESBUILD_PATH` and the adjacent workspace lookup remain optional tooling fallbacks; they are not required after `npm ci`.

The checks reverse the insertion and compare the entire original embedded application, document and wrapper byte for byte. They also exercise the actual pull-to-refresh handler with fixed-navigation, content, and input targets, plus the Growth memo boundary’s inactive/active transitions. They render the Customers components against the original embedded fixtures with a small React hook/tree test harness, exercise selection updates, payment proportions, empty/missing-data cases, filter drafts, Customer-only routing, original account callbacks, project actions, and offline portrait fallbacks. Detail checks use the original customer aggregation helpers and verify that separate currencies and unrelated customers are not combined. A host model runs the actual shared-sheet effect through focus trapping, Escape, close, reopen, and cleanup. The repository’s existing data checks also run. Visual and interaction review is performed separately in the browser; static checks alone do not establish visual fidelity.

The Growth navigation repair changes lifecycle only: its existing section is still hidden when inactive, and its existing visibility observers pause chart engines. A cold Customer entry does not preload Growth. Returning to Growth reuses its mounted WebGL/chart subtree and supplies current props instead of recreating it. Growth visual markup, assets, and secondary pages are unchanged.

The four BD portraits are illustrative stock photos, not verified photographs of the Demo people. They are embedded in the standalone HTML, so displaying them does not depend on an external image request. The manifest retains the original image URLs and attribution: [Jurica Koletić](https://unsplash.com/photos/man-wearing-henley-top-portrait-7YVZYZeITc8), [Michael Dam](https://unsplash.com/photos/closeup-photography-of-woman-smiling-mEZ3PoFGs_k), [Joseph Gonzalez](https://unsplash.com/photos/man-wearing-white-v-neck-shirt-iFgRcqHznqg), and [Aiony Haust](https://unsplash.com/photos/woman-wearing-black-crew-neck-shirt-3TLl_97HNJo), under the [Unsplash License](https://unsplash.com/license).

## Local-only overlay audit

This overlay iteration is for local review only. It does not include a commit, push, pull-request update, or deployment. The audit covers the reachable Customer entries below; it does not exercise account writes or logout against a live service.

| Customer entry | Surface and state | Preserved behavior and validation |
| --- | --- | --- |
| Operating board → time/currency | `FansaiCustomerFilter`, `kind="cust"` | Local draft, reset, Cancel, and one Apply; original month/quarter/year scopes and FX guard. |
| Customer library → time/currency | Same `cust` filter | Shares committed period/currency state with the board; does not change customer stage/search. |
| Projects → amount unit | Same filter, `kind="proj"` | Currency only; Apply cannot alter the Customer period. Unavailable USD cannot be submitted. |
| Customer record | `FansaiCustomerDetail` | Loading, error, missing and success states retain a close control; original query/aggregation; unknown receivables stay unknown. |
| Customer record → project rows | Read-only project summaries | No new nested action is invented; raw known zero and missing amounts stay distinct. |
| Project record | `FansaiCustomerProjectModal` | Shared shell; original stage meaning, close callback and optional approval navigation. |
| Header avatar while in Customer | `FansaiCustomerAccount` wrapping original `lM` | Original session and close callbacks pass through; other tabs still route to original `lM`. |
| Account → profile/password/language/role | Existing internal account views | Original forms, validation, mutation endpoints, role conditions, and locale actions remain unmodified. The avatar picker remains inline; upload uses the existing native file input. |
| Every Customer sheet | `CXCustomerSheet` | Shared Growth-derived header, scrolling body and optional action footer; focus trap, Escape, background inert state, scroll lock and restoration tested through open/close/reopen. |

The host deliberately retains closed sheet nodes. The shell therefore observes the host’s actual `.on` and `aria-hidden` state and releases focus/scroll locks on close. A new host sequence remounts a fresh filter draft. CSS is limited to Customer component prefixes and the host containing `.cx-sheet`; the exact source reversal check protects all unrelated sheets and tabs.

Local browser verification for this iteration covered both Customer time/currency entries, project currency, customer details, ordinary and approval-stage project details, and account menu/profile/password/language/role views. Cancel, Escape and scrim dismissal preserved the applied filters; Reset remained a draft until Apply; reopening restored the applied values. Keyboard focus wrapped within the sheet and returned to its trigger. Long details scrolled with their title and Close still reachable. At 320px and 393px viewport widths, the sheet had no horizontal overflow and the footer stayed visible. Customer → Growth navigation and the original Growth filter were also checked. No browser console errors were reported. Account save, password, role, locale and logout mutations were not executed during UI verification.

Review captures are local at `outputs/FansAI-Customers-review/customer-filter-sheet-v4.png` and `customer-project-sheet-v4.png` in the parent project workspace. The mobile rule is documented in the repository's [FansAI Branding Data V2 guideline](../skills/fansai-branding-data-v2/SKILL.md) and implemented by the [shared bottom-sheet source](../mobile/customers-src/customer-sheet.jsx); desktop modal defaults remain separate.

## Local-only KPI card iteration

The approved Nano Banana Pro Global direction is limited to two groups of three KPI cards: customer library totals and project totals. Integration replaces only the two original `kg` expressions inside the Customer renderer. The board, search, filter chips, lists, detail sheets, account sheets, and other tabs keep their existing implementation, including the earlier uncommitted overlay work. This iteration does not include a commit, push, pull-request update, or deployment.

| KPI | Existing data scope | Behavior retained |
| --- | --- | --- |
| Customer count | Customer summary endpoint: total customers, followed projects, and high-risk customers. This summary is independent of period, search, and stage. | Missing summary displays “—”. |
| New customers | Customers created in the selected period within the latest available batch of up to 100 customers. | Loading or failed list requests display “—”. Clicking toggles the existing new-customer filter between `new` and `all`. |
| Signed customers | Customers in that same batch with at least one project signed in the selected period. | Counts customers, not contracts; loading or failed list requests display “—”. No new click action. |
| Active projects | Project adapter results at stages 0–3: initiation through acceptance, within the latest batch of up to 100 projects. | Independent of the selected project-stage chip. No click action. |
| Delivery this week | Those projects with an expected delivery date from Monday through Sunday of the current week, at stages 0–3. | Uses the existing week range and flag; no click action. |
| Delayed projects | Projects at stages 0–2 whose expected delivery date is before today. | Uses the original computed `late` flag, not the API's separate overdue-days metric. No click action. |

The project renderer retains its existing loading and error branches before the KPI group mounts. The active-project graphic receives the actual counts at stages 0, 1, 2, and 3, calculated from the same project batch. The only error-state correction is inside the two derived customer KPIs: a failed customer-list request now supplies `null`, displayed as “—”, instead of displaying an empty-list zero. Existing queries, successful summary calculations, period calculation, and batch-limit notes remain unchanged. Both JSX replacements are explicit and reversible, so the preservation check can restore the complete original application after removing the authorized Customer changes.

The Global card implementation was reviewed locally at 393px and 320px viewport widths. The current-period library shows 112 / 66 / 4; changing to the previous month keeps the global 112 and changes the period counts to 34 / 0, with a true empty signed-customer chart. The new-customer card still toggles its existing filter. Project cards show 25 / 2 / 6, with stage proportions 15 / 5 / 5. Each card's content fits its own width at the narrow viewport; the existing stage-chip strip remains horizontally scrollable. Customer → Growth navigation was checked again. The library was restored to the current month and initiation stage before leaving it. Local review captures are `outputs/FansAI-Customers-review/customer-kpi-global-implemented-library.png` and `customer-kpi-global-implemented-projects.png` in the parent workspace.
