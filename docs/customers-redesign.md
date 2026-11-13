# Customers redesign aligned with Growth

The mobile Customers tab follows Growth’s dark gray-teal surfaces, bright cyan and mint data, and white statistical trays. Its interactive collection ribbon, customer-concentration dots, conversion stages, and expandable BD rows add new visual treatments within that established system. Customer records, project flows, the existing period/currency filters, and all four navigation tabs retain their existing logic.

The figures are the existing embedded **Demo** data. The new visualizations derive from those figures; they do not connect to a live CRM or create transactions.

Editable implementation:

- `mobile/customers-src/customers.jsx` — React board component.
- `mobile/customers-src/customers.css` — Customers-only styles and motion.
- `mobile/customers-src/build.cjs` — injects the component and styles into the standalone mobile file.
- `mobile/customers-src/check.cjs` — syntax, CSS scope, reproducibility and exact preservation checks.

Run from the repository root. In a fresh checkout, install the pinned build-only dependency without changing the tracked manifest or lockfile:

```sh
npm install --no-save --package-lock=false esbuild@0.24.0
node mobile/customers-src/build.cjs
node mobile/customers-src/check.cjs
```

The build reads the original `mobile/index.html` from Git commit `1ceb4418f96d99744212d6b12b82226519c43e61`. This pinned baseline remains stable after merging the redesign. It changes only the board component call, inserts the replacement React component, and appends a scoped stylesheet inside the existing embedded document. It keeps fonts, data, Rive runtime, navigation, the outer wrapper and all unrelated tab code intact.

The build was verified with `esbuild@0.24.0`. It searches the normal Node resolution path, then this workspace’s adjacent `iridescent-earth-react/node_modules/esbuild`. For another checkout, set `FANSAI_ESBUILD_PATH` to an installed esbuild module directory.

The checks reverse the insertion and compare the entire original embedded application, document and wrapper byte for byte. They render the Customers component against the original embedded fixture with a small React hook/tree test harness, exercise selection updates and empty/missing-data cases, and run the repository’s existing data checks. Visual and interaction review is performed separately in the browser; static checks alone do not establish visual fidelity.
