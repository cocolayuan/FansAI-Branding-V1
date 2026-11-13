# Customers redesign aligned with Growth

The mobile Customers tab follows Growth’s dark gray-teal surfaces, bright cyan and mint data, and white statistical trays. A proportional collection arc shows how signed amounts split between received and outstanding payments; selecting a segment updates its readout. Customer-concentration dots, conversion stages, and expandable BD rows add visual treatments within that established system. The header reads “Customer”, customer records open with the initiation filter selected, and both customer and project lists use dark surfaces. The existing period/currency filters and record/project workflows retain their data logic.

The figures are the existing embedded **Demo** data. The new visualizations derive from those figures; they do not connect to a live CRM or create transactions.

Editable implementation:

- `mobile/customers-src/customers.jsx` — React board component.
- `mobile/customers-src/customers.css` — Customers-only styles and motion.
- `mobile/customers-src/integration.cjs` — keeps Growth mounted while inactive and limits pull-to-refresh to scrolling app content, preserving fixed navigation taps.
- `mobile/customers-src/build.cjs` — injects the component and styles into the standalone mobile file.
- `mobile/customers-src/check.cjs` — syntax, CSS scope, reproducibility and exact preservation checks.

Run from the repository root. In a fresh checkout, install the pinned build-only dependency without changing the tracked manifest or lockfile:

```sh
npm install --no-save --package-lock=false esbuild@0.24.0
node mobile/customers-src/build.cjs
node mobile/customers-src/check.cjs
```

The build reads the original `mobile/index.html` from Git commit `1ceb4418f96d99744212d6b12b82226519c43e61`. This pinned baseline remains stable after merging the redesign. It replaces the board component call, inserts the new React component, applies explicit Customer heading/default-stage patches, retains the existing Growth subtree between visits, restricts pull-to-refresh to app content, and appends scoped styles inside the existing embedded document. All patches are reversible for preservation checks. Fonts, Demo data, the outer wrapper, and unrelated tab content remain intact.

The build was verified with `esbuild@0.24.0`. It searches the normal Node resolution path, then this workspace’s adjacent `iridescent-earth-react/node_modules/esbuild`. For another checkout, set `FANSAI_ESBUILD_PATH` to an installed esbuild module directory.

The checks reverse the insertion and compare the entire original embedded application, document and wrapper byte for byte. They also exercise the actual pull-to-refresh handler with fixed-navigation, content, and input targets, plus the Growth memo boundary’s inactive/active transitions. They render the Customers component against the original embedded fixture with a small React hook/tree test harness, exercise selection updates and empty/missing-data cases, and run the repository’s existing data checks. Visual and interaction review is performed separately in the browser; static checks alone do not establish visual fidelity.

The Growth navigation repair changes lifecycle only: its existing section is still hidden when inactive, and its existing visibility observers pause chart engines. A cold Customer entry does not preload Growth. Returning to Growth reuses its mounted WebGL/chart subtree and supplies current props instead of recreating it. Growth visual markup, assets, and secondary pages are unchanged.
