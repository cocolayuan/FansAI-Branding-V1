'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const build = require('./build.cjs');

const original = build.decode(build.baseline());
const current = build.decode(fs.readFileSync(path.join(build.ROOT, 'mobile/index.html'), 'utf8'));
const code = build.compile();
const css = build.styles();
const inserted = build.START + code + build.END;
build.exactlyOnce(current.app, inserted);
build.exactlyOnce(current.app, build.NEW_SLOT);
const restoredMetadata = build.applyPatches(current.app.replace(inserted, '').replace(build.NEW_SLOT, build.SLOT), build.PROJECT_METADATA_APP_PATCHES, true);
const restoredHeaders = build.applyPatches(restoredMetadata, build.PRIMARY_HEADER_APP_PATCHES, true);
const restoredLoading = build.applyPatches(restoredHeaders, build.TAB_LOADING_APP_PATCHES, true);
const restoredGrowthTools = build.applyPatches(restoredLoading, build.GROWTH_TOOL_APP_PATCHES, true);
const restoredWorkbench = build.applyPatches(restoredGrowthTools, build.WORKBENCH_APP_PATCHES, true);
const restoredApp = build.applyPatches(build.applyPatches(restoredWorkbench, build.NAV_APP_PATCHES, true), build.CUSTOMER_APP_PATCHES, true);
assert.equal(restoredApp, original.app, 'Application code outside the explicit Customer, Workbench, Growth-icon, and navigation patches remains byte-identical');
assert.ok(current.app.includes('cseg:"board",per:"m",cf:"project_status_1",q:""'), 'Customer library defaults to initiation while the board remains the initial subtab');
new vm.Script(current.app, { filename: 'mobile/embedded-app.js' });
const style = build.STYLE_START + css + '</style>\n';
build.exactlyOnce(current.inner, style);
const restoredMetadataInner = build.applyPatches(current.inner.replace(style, ''), build.PROJECT_METADATA_INNER_PATCHES, true);
const restoredHeaderInner = build.applyPatches(restoredMetadataInner, build.PRIMARY_HEADER_INNER_PATCHES, true);
const restoredLoadingInner = build.applyPatches(restoredHeaderInner, build.TAB_LOADING_INNER_PATCHES, true);
const restoredInner = build.replaceScript(build.applyPatches(restoredLoadingInner, build.NAV_INNER_PATCHES, true), 'appsrc', build.plainScript(original.inner, 'appsrc'));
assert.equal(restoredInner, original.inner, 'Other HTML, CSS, runtimes, data and assets remain byte-identical');
const restoredMetadataOuter = build.applyPatches(current.outer, build.PROJECT_METADATA_OUTER_PATCHES, true);
assert.equal(build.replaceScript(restoredMetadataOuter, 'inner', build.plainScript(original.outer, 'inner')), original.outer,
  'Outer document and iframe wrapper remain byte-identical');
assert.equal(build.generate().output, current.outer, 'Build is reproducible from editable source');

assert.equal(build.PROJECT_TITLE, 'FansAI Branding Data');
assert.equal(build.PROJECT_METADATA_APP_PATCHES.length, 4);
assert.equal(build.PROJECT_METADATA_INNER_PATCHES.length, 1);
assert.equal(build.PROJECT_METADATA_OUTER_PATCHES.length, 2);
for (const [source, patches] of [[current.app, build.PROJECT_METADATA_APP_PATCHES], [current.inner, build.PROJECT_METADATA_INNER_PATCHES], [current.outer, build.PROJECT_METADATA_OUTER_PATCHES]]) {
  for (const patch of patches) build.exactlyOnce(source, patch.after);
}
for (const [name, source] of [['root', fs.readFileSync(path.join(build.ROOT, 'index.html'), 'utf8')], ['mobile wrapper', current.outer], ['mobile content', current.inner]]) {
  assert.equal(/<title>([^<]*)<\/title>/.exec(source)?.[1], build.PROJECT_TITLE, `${name} uses the requested project display name`);
}
const projectPackage = JSON.parse(fs.readFileSync(path.join(build.ROOT, 'package.json'), 'utf8'));
assert.equal(projectPackage.displayName, build.PROJECT_TITLE);assert.equal(projectPackage.name, 'fansai-branding-v1', 'The technical package identity is retained');
const mobileManifest = JSON.parse(fs.readFileSync(path.join(build.ROOT, 'mobile/manifest.json'), 'utf8'));
const originalManifest = JSON.parse(execFileSync('git', ['show', `${build.BASELINE_REF}:mobile/manifest.json`], { cwd: build.ROOT, encoding: 'utf8' }));
assert.deepEqual(mobileManifest, build.projectManifest(current.outer, originalManifest), 'Publishing metadata retains the original file, runtime, Rive, version and offline fields');
assert.equal(mobileManifest.name, build.PROJECT_TITLE);
assert.equal(mobileManifest.sha256, require('node:crypto').createHash('sha256').update(current.outer).digest('hex'), 'The published manifest matches the actual standalone HTML bytes');
console.log('PASS Project metadata: display titles, technical identity, manifest SHA, and reversible metadata patches.');

// Parse block boundaries so nested media/supports rules cannot hide broad selectors.
function validateCSS(source, filename) {
  const workbench = filename === '../workbench-src/workbench.css';
  const loading = filename === '../navigation-src/loading.css';
  const primaryHeader = filename === '../header-src/header.css';
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  let index = 0, selectors = 0;
  function walk(keyframes = false) {
    while (index < text.length) {
      while (/\s/.test(text[index] || '') && index < text.length) index++;
      if (text[index] === '}') { index++; return; }
      if (index === text.length) return;
      const start = index;
      let quote = '', parens = 0;
      while (index < text.length) {
        const char = text[index];
        if (quote) { if (char === quote && text[index - 1] !== '\\') quote = ''; }
        else if (char === '"' || char === "'") quote = char;
        else if (char === '(') parens++;
        else if (char === ')') parens--;
        else if (!parens && (char === '{' || char === ';' || char === '}')) break;
        index++;
      }
      const header = text.slice(start, index).trim();
      assert.notEqual(text[index], '}', `Unexpected closing brace after ${header}`);
      assert.equal(text[index], '{', `Expected CSS block after ${header}`);
      index++;
      if (/^@(media|supports|container|layer)\b/.test(header)) { walk(false); continue; }
      if (/^@(?:-webkit-)?keyframes\b/.test(header)) {
        assert.ok(!loading, 'The shared loading skeleton remains static');
        assert.match(header, workbench ? /^@(?:-webkit-)?keyframes\s+wb-/ : /^@(?:-webkit-)?keyframes\s+(?:cx-|customers-)/, 'Keyframes have their surface-specific prefix');
        walk(true); continue;
      }
      assert.ok(!header.startsWith('@'), `Unexpected global CSS rule: ${header}`);
      if (!keyframes) {
        // Commas inside :is() and :has() are not selector boundaries.
        let depth = 0, piece = '';
        const pieces = [];
        for (const char of header) {
          if (char === '(') depth++;
          if (char === ')') depth--;
          if (char === ',' && depth === 0) { pieces.push(piece.trim()); piece = ''; }
          else piece += char;
        }
        pieces.push(piece.trim());
        for (const selector of pieces) {
          const prefixes = { 'customer-sheet.css': 'sheet|account', 'customer-filter.css': 'filter', 'customer-details.css': 'customer', 'project-modal.css': 'project' };
          const component = new RegExp('^(?:\\.fansai-mobile-scope )?\\.cx-(?:' + (prefixes[filename] || 'none') + ')(?:-[a-z][\\w-]*)?(?=[\\s.#:[>+~]|$)').test(selector);
          const host = /^\.fansai-mobile-scope \.sheet(?:\.on)?:has\(\.cx-sheet\)(?:\s*>\s*\.grab)?$/.test(selector);
          const scrim = /^\.fansai-mobile-scope:has\(\.cx-sheet\)\s*>\s*\.scrim(?:\.on)?$/.test(selector);
          const workbenchHost = '.fansai-mobile-scope:has(#v-more:not([hidden]))';
          const workbenchSelector = selector === '#v-more' || selector.startsWith('#v-more ') ||
            selector === workbenchHost || selector.startsWith(workbenchHost + ' ') || selector.startsWith(workbenchHost + '>');
          const primaryTabs = ':is(#v-ops,#v-cust,#v-appr,#v-more)';
          const loadingHost = '.fansai-mobile-scope:has(' + primaryTabs + ':not([hidden]) .fs-tab-skeleton)';
          const loadingSelector = selector.startsWith('.fansai-mobile-scope ' + primaryTabs + ' .fs-tab-skeleton') ||
            selector.startsWith('.fansai-mobile-scope ' + primaryTabs + ' :is(.fs-tab-skeleton') ||
            selector === loadingHost || selector.startsWith(loadingHost + ' ') || selector.startsWith(loadingHost + '>');
          const decisionHeaderHost = '.fansai-mobile-scope.page-grayscale:has(#v-appr:not([hidden]))>.app';
          const headerSelector = /^\.fansai-mobile-scope \.fh-[a-z][\w-]*(?=[\s.#:[>+~]|$)/.test(selector) ||
            selector.startsWith('.fansai-mobile-scope .hd:has(.fh-primary-title)') ||
            selector.startsWith('.fansai-mobile-scope #v-ops .gx-intro h1:has(.fh-primary-title)') ||
            selector === '.fansai-mobile-scope #v-ops .gx-intro:has(.fh-primary-title) .gx-filter' ||
            [decisionHeaderHost, decisionHeaderHost + '>main:not(:has(.fs-tab-skeleton))', decisionHeaderHost + '>.hd>.av'].includes(selector);
          const allowed = primaryHeader ? headerSelector : loading ? loadingSelector : workbench ? workbenchSelector : ['customers.css', 'kpi-cards.css'].includes(filename) ? selector.includes('#v-cust') : component || filename === 'customer-sheet.css' && (host || scrim);
          assert.ok(allowed, `Selector must be scoped to its declared surface (${filename}): ${selector}`);
          selectors++;
        }
      }
      let brace = 1;
      quote = '';
      while (index < text.length && brace) {
        const char = text[index++];
        if (quote) { if (char === quote && text[index - 2] !== '\\') quote = ''; }
        else if (char === '"' || char === "'") quote = char;
        else if (char === '{') brace++;
        else if (char === '}') brace--;
      }
      assert.equal(brace, 0, `Unclosed CSS block: ${header}`);
    }
  }
  walk();
  assert.ok(selectors > 0, 'Scoped Customers CSS exists');
  return selectors;
}
const count = build.CSS_FILES.reduce((sum, filename) => sum + validateCSS(fs.readFileSync(path.join(__dirname, filename), 'utf8'), filename), 0);
console.log(`PASS: ${count} scoped CSS selectors, JS syntax, reproducible build, and exact preservation of all other app code/assets.`);

// Exercise the actual pull-to-refresh touch handler against content and fixed-nav targets.
// A short downward finger movement on navigation must not consume the tap.
function checkPullRefreshTargets() {
  const start = current.app.indexOf('function $B(');
  const end = current.app.indexOf('}nn();var fk=', start) + 1;
  assert.ok(start >= 0 && end > start, 'Pull-refresh source seam exists');
  class FakeElement {
    constructor(insideApp = false, input = false) { this.insideApp = insideApp; this.input = input; this.parentElement = null; }
    closest(selector) { return selector === '.fansai-mobile-scope' ? this : this.input ? this : null; }
  }
  const content = {
    contains: target => target.insideApp,
    classList: { add() {}, remove() {} }, style: {},
  };
  function gesture(insideApp, input = false) {
    const handlers = {};
    let prevented = 0;
    const context = vm.createContext({
      Element: FakeElement,
      Dc: { useRef: value => ({ current: value }), useState: value => [value, () => {}], useEffect: effect => effect() },
      qu: { jsx: () => null, jsxs: () => null }, l: value => value, YB: 70,
      document: { addEventListener: (name, fn) => { handlers[name] = fn; }, removeEventListener() {} },
      window: { scrollY: 0, getComputedStyle: () => ({ overflowY: 'visible' }), setTimeout: () => 1, location: { reload() {} } },
      requestAnimationFrame: () => 1, cancelAnimationFrame() {}, clearTimeout() {},
    });
    vm.runInContext(current.app.slice(start, end), context);
    context.$B({ disabled: false, contentRef: { current: content } });
    const target = new FakeElement(insideApp, input);
    handlers.touchstart({ target, touches: [{ identifier: 1, clientX: 12, clientY: 12 }] });
    handlers.touchmove({ target, touches: [{ identifier: 1, clientX: 12, clientY: 24 }], cancelable: true, preventDefault() { prevented++; } });
    return prevented;
  }
  assert.equal(gesture(false), 0, 'Fixed navigation taps do not enter pull-to-refresh or prevent their click');
  assert.ok(gesture(true) > 0, 'Pull-to-refresh still handles gestures inside app content');
  assert.equal(gesture(true, true), 0, 'Input gestures still bypass pull-to-refresh');
  console.log('PASS Navigation: fixed-tab gestures remain native while content pull-to-refresh still works.');
}
checkPullRefreshTargets();

function checkGrowthKeepAlive() {
  const patch = build.NAV_APP_PATCHES.find(value => value.before === 'function Pj(');
  assert.ok(patch, 'Growth lifecycle patch is explicit');
  const source = patch.after.split('\nfunction Pj(')[0];
  let component, compare;
  vm.runInNewContext(source, { ju: { memo(render, comparator) { component = render; compare = comparator; return render; } } });
  const previousChild = { type: 'Growth', props: { period: 'today' } };
  assert.equal(component({ children: previousChild }), previousChild, 'Boundary preserves the original Growth child object');
  assert.equal(component({ children: null }), null, 'Cold inactive Growth does not initialize');
  assert.equal(compare({ active: true, children: previousChild }, { active: false, children: null }), true,
    'Leaving Growth retains its mounted subtree instead of disposing it');
  assert.equal(compare({ active: false, children: previousChild }, { active: false, children: null }), true,
    'Customer interactions do not rerender hidden Growth');
  assert.equal(compare({ active: false, children: previousChild }, { active: true, children: {} }), false,
    'Returning to Growth refreshes its props');
  assert.equal(compare({ active: true, children: previousChild }, { active: true, children: {} }), false,
    'Growth remains reactive while active');
  console.log('PASS Navigation: Growth retains its inactive subtree and refreshes on return.');
}
checkGrowthKeepAlive();

function checkCustomerEntryRouting() {
  const originalAccount = {}, customerAccount = {}, workbenchAccount = {}, session = {}, close = () => {};
  assert.equal(build.WORKBENCH_ACCOUNT_PATCH.before, build.CUSTOMER_ACCOUNT_PATCH.after, 'The Workbench account extension retains the exact Customer account branch');
  for (const tab of ['cust', 'ops', 'appr', 'more']) for (const page of [null, 'finance', 'mat', 'kb']) {
    const account = vm.runInNewContext(build.WORKBENCH_ACCOUNT_PATCH.after, {
      C: { tab, page }, ue: { jsx: (type, props) => ({ type, props }) }, lM: originalAccount,
      FansaiCustomerAccount: customerAccount, FansaiWorkbenchAccount: workbenchAccount, Ye: session, Se: close,
    });
    assert.equal(account.type, tab === 'cust' ? customerAccount : tab === 'more' && !page ? workbenchAccount : originalAccount);
    assert.equal(account.props.initialSession, session);assert.equal(account.props.onClose, close);
  }
  const filterType = {}, state = {}, legacyNode = {}, applied = [];
  for (const kind of ['cust', 'proj', 'other', null]) {
    const result = vm.runInNewContext(build.CUSTOMER_FILTER_PATCH.after, {
      T: { filterKind: kind, seq: 7, node: legacyNode }, FansaiCustomerFilter: filterType,
      gxEl: (type, props) => ({ type, props }), f: state, h: false, P: true,
      xe: values => applied.push(values), Se: () => applied.push('closed'), Q: value => 'legacy:' + value,
    });
    if (kind === 'cust' || kind === 'proj') {
      assert.equal(result.type, filterType);assert.equal(result.props.key, 7);assert.equal(result.props.state, state);
      assert.equal(result.props.canUSD, false);assert.equal(result.props.open, true);
      const values = { cur: 'CNY' };result.props.onApply(values);
      assert.equal(applied.at(-2), values);assert.equal(applied.at(-1), 'closed');
    } else assert.equal(result, kind ? 'legacy:' + kind : legacyNode);
  }
  console.log('PASS Entry routing: Customer filters and Customer/Workbench-home accounts use the new surfaces; secondary-page accounts and host callbacks remain intact.');
}
checkCustomerEntryRouting();

// Render the actual compiled component against the captured Customers fixture.
// This small React-compatible tree harness exercises hooks and event callbacks;
// it intentionally does not pretend to verify DOM layout or browser animations.
const { gunzipSync } = require('node:zlib');
const gz = /window\.__FAKE_GZ\s*=\s*"([^"]+)"/.exec(original.inner);
assert.ok(gz, 'Original offline fixtures are embedded');
const fixtures = JSON.parse(gunzipSync(Buffer.from(gz[1], 'base64')).toString('utf8'));
const fixtureKey = '/api/admin/bd/dashboard/mgmt?level=month&key=2026-10&basis=contract';
const captured = JSON.parse(fixtures[fixtureKey].b).data;
const adapterStart = original.app.indexOf('function Uz(');
const adapterEnd = original.app.indexOf('var zM=', adapterStart);
assert.ok(adapterStart >= 0 && adapterEnd > adapterStart, 'Original Customers adapter is present');
let hookValues = [], hookIndex = 0;
const fakeReact = {
  Fragment: Symbol('fragment'),
  Suspense: Symbol('suspense'),
  createElement(type, props, ...children) {
    const fullProps = { ...(props || {}), children };
    return typeof type === 'function' ? type(fullProps) : { type, props: fullProps, children };
  },
  useState(initial) {
    const slot = hookIndex++;
    if (!(slot in hookValues)) hookValues[slot] = typeof initial === 'function' ? initial() : initial;
    return [hookValues[slot], value => { hookValues[slot] = typeof value === 'function' ? value(hookValues[slot]) : value; }];
  },
  useRef(initial) { return { current: initial }; },
  useEffect() {},
  useLayoutEffect() {},
  useId() { return 'cx-test-project'; },
};
const context = vm.createContext({
  F: value => value,
  X: () => fakeReact,
  Oo: value => value == null ? '—' : String(value),
  Vm: () => '',
  l: (value, params = {}) => value.replace(/\{([^}]+)\}/g, (match, key) => params[key] ?? match),
  ic: JSON.parse(/\bic=(\[[^\]]+\])/.exec(original.app)[1]),
  Ra: () => '2026-10-29',
  Ly: period => ({ n: { m: '本月', lm: '上月', q: '本季度', y: '今年' }[period], r: '测试统计周期' }),
});
vm.runInContext(original.app.slice(adapterStart, adapterEnd) + '\n' + code, context);
const board = context.HM(captured, captured.period);
const cny = { cur: 'CNY', fx: 7.2 };
function render(B = board, S = cny, reset = false) {
  if (reset) hookValues = [];
  hookIndex = 0;
  const tree = context.FansaiCustomersBoard({ B, n: '本月', r: '10/1–10/29', S });
  assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(tree)), 'Rendered output contains no invalid numerical values');
  return tree;
}
function allNodes(tree, predicate) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => allNodes(child, predicate));
  if (typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...allNodes(tree.children, predicate)];
}
function byClass(tree, name) {
  return allNodes(tree, node => (node.props.className || '').split(' ').includes(name));
}
function nodeText(tree) {
  if (tree == null || typeof tree === 'boolean') return '';
  if (Array.isArray(tree)) return tree.map(nodeText).join('');
  return typeof tree === 'object' ? nodeText(tree.children) : String(tree);
}
let customerChecks = 0;
function check(name, fn) {
  fn(); customerChecks++;
  console.log('PASS Customers: ' + name);
}
check('Captured amounts and collection share retain their original values', () => {
  const tree = render(board, cny, true);
  assert.equal(nodeText(byClass(tree, 'cx-hero-number')[0]), '¥640,000');
  assert.match(nodeText(byClass(tree, 'cx-hero-meta')[0]), /62\.5%/);
  const received = byClass(byClass(tree, 'cx-collection-blocks')[0], 'is-received')[0];
  const pending = byClass(byClass(tree, 'cx-collection-blocks')[0], 'is-pending')[0];
  assert.equal(received.props['data-share'], .625);
  assert.equal(pending.props['data-share'], .375);
  assert.equal(received.props['data-share'] + pending.props['data-share'], 1);
  assert.equal(received.props.style.flexGrow, .625, 'Received panel width derives from the actual share');
  assert.equal(pending.props.style.flexGrow, .375, 'Pending panel width derives from the actual share');
});
check('Collection panels select and reset the same cash detail as the legend', () => {
  let tree = render(board, cny, true);
  byClass(byClass(tree, 'cx-collection-blocks')[0], 'is-received')[0].props.onClick();
  tree = render();
  assert.equal(nodeText(byClass(tree, 'cx-hero-number')[0]), '¥400,000');
  assert.equal(byClass(byClass(tree, 'cx-collection-blocks')[0], 'is-received')[0].props['aria-pressed'], true);
  byClass(byClass(tree, 'cx-collection-blocks')[0], 'is-received')[0].props.onClick();
  assert.equal(nodeText(byClass(render(), 'cx-hero-number')[0]), '¥640,000');
});
check('A fully collected amount renders one panel with an honest 100% share', () => {
  const tree = render({ ...board, left: 0 }, cny, true);
  const parts = byClass(tree, 'cx-collection-part');
  assert.equal(parts.length, 1);
  assert.equal(parts[0].props['data-share'], 1);
  assert.equal(parts[0].props.style.flexGrow, 1);
  assert.match(parts[0].props['aria-label'], /100\.0%/);
});
check('Cash selection toggles the amount and restores the aggregate', () => {
  let tree = render(board, cny, true);
  let buttons = allNodes(byClass(tree, 'cx-cash-legend')[0], node => node.type === 'button');
  buttons[1].props.onClick();
  tree = render();
  assert.equal(nodeText(byClass(tree, 'cx-hero-number')[0]), '¥240,000');
  buttons = allNodes(byClass(tree, 'cx-cash-legend')[0], node => node.type === 'button');
  assert.equal(buttons[1].props['aria-pressed'], true);
  buttons[1].props.onClick();
  assert.equal(nodeText(byClass(render(), 'cx-hero-number')[0]), '¥640,000');
});
check('Customer group selection updates the linked record', () => {
  let tree = render(board, cny, true);
  const buttons = allNodes(byClass(tree, 'cx-mix-tabs')[0], node => node.type === 'button');
  buttons[1].props.onClick();
  tree = render();
  assert.ok(nodeText(byClass(tree, 'cx-selected')[0]).includes(board.conc[1][0].split(' · ')[1]));
  assert.ok(nodeText(byClass(tree, 'cx-selected')[0]).includes(Math.round(board.conc[1][1] * 10000).toLocaleString('en-US')));
});
check('Period changes clamp an earlier stage selection to available stages', () => {
  let tree = render(board, cny, true);
  const buttons = allNodes(byClass(tree, 'cx-stages')[0], node => node.type === 'button');
  buttons[buttons.length - 1].props.onClick();
  const shortBoard = { ...board, fun: board.fun.slice(0, 2) };
  tree = render(shortBoard);
  const selected = allNodes(byClass(tree, 'cx-stages')[0], node => node.type === 'button' && node.props['aria-pressed']);
  assert.equal(selected.length, 1);
  assert.ok(nodeText(selected[0]).includes(shortBoard.fun[1][0]));
  assert.match(nodeText(byClass(tree, 'cx-stage-detail')[0]), /100%/);
});
check('An empty funnel renders an explicit empty state', () => {
  const tree = render({ ...board, fun: [] });
  assert.equal(allNodes(byClass(tree, 'cx-stages')[0], node => node.type === 'button').length, 0);
  assert.match(nodeText(byClass(tree, 'cx-stage-detail')[0]), /暂无阶段/);
});
check('A missing target remains unknown in visible and accessible output', () => {
  const tree = render({ ...board, goal: null }, cny, true);
  const goal = byClass(tree, 'cx-goal')[0];
  assert.match(nodeText(goal), /当前未设目标/);
  assert.ok(allNodes(goal, node => node.type === 'summary').some(node => nodeText(node).includes('—')));
  assert.equal(allNodes(goal, node => node.props.role === 'progressbar' && node.props['aria-valuenow'] != null).length, 0);
});
check('Zero amounts do not fabricate a collection ratio or customer distribution', () => {
  const empty = { ...board, recv: 0, left: 0, sign: 0, back: 0, signC: 0, conc: [], concTotal: 0, cr3: 0, cr5: 0, fun: [], bd: [] };
  const tree = render(empty, cny, true);
  assert.match(nodeText(tree), /暂无签约金额/);
  assert.equal(byClass(tree, 'cx-collection-part').length, 0);
  assert.equal(byClass(tree, 'cx-matrix-dot').length, 0);
  assert.ok(!nodeText(byClass(tree, 'cx-hero-meta')[0]).includes('0.0%'));
  assert.ok(nodeText(byClass(tree, 'cx-finance-strip')[0]).includes('—'));
});
check('USD uses the host exchange rate and missing amounts remain missing', () => {
  const tree = render(board, { cur: 'USD', fx: 8 }, true);
  assert.equal(nodeText(byClass(tree, 'cx-hero-number')[0]), '$80,000');
  const amount = context.CXAmount({ value: null, state: { cur: 'USD', fx: 8 } });
  assert.equal(nodeText(amount), '$—');
});
check('A mismatched period shows no stale board values', () => {
  const tree = render({ ...board, mismatch: true }, cny, true);
  assert.match(nodeText(tree), /本月暂无业务数据/);
  assert.equal(byClass(tree, 'cx-cash').length, 0);
});
check('Demo portraits are embedded offline and unknown names retain an initials fallback', () => {
  const avatars = build.avatarData();
  for (const [name, src] of Object.entries(avatars)) {
    const avatar = context.CXAvatar({ name });
    const image = allNodes(avatar, node => node.type === 'img')[0];
    assert.equal(image.props.src, src);
    assert.ok(src.startsWith('data:image/jpeg;base64,'));
    assert.equal(image.props.alt, '', 'Decorative portraits do not claim to depict the Demo identity');
    const target = { hidden: false };
    image.props.onError({ currentTarget: target });
    assert.equal(target.hidden, true, 'A failed image reveals the existing initials');
  }
  const unknown = context.CXAvatar({ name: 'New Owner' });
  assert.equal(allNodes(unknown, node => node.type === 'img').length, 0);
  assert.equal(nodeText(unknown), 'NO');
});

function renderFilter(props, reset = false) {
  if (reset) hookValues = [];
  hookIndex = 0;
  return context.FansaiCustomerFilter(props);
}
check('Customer filter edits and reset stay local until Apply; Cancel discards the draft', () => {
  const applied = [];
  let closed = 0;
  const props = { kind: 'cust', state: { per: 'lm', cur: 'CNY', fx: 8 }, canUSD: true, onApply: values => applied.push(values), onClose: () => closed++ };
  let tree = renderFilter(props, true);
  allNodes(byClass(tree, 'cx-filter-periods')[0], node => node.type === 'button')[2].props.onClick();
  allNodes(byClass(tree, 'cx-filter-currencies')[0], node => node.type === 'button')[1].props.onClick();
  tree = renderFilter(props);
  assert.equal(applied.length, 0);assert.equal(props.state.per, 'lm');assert.equal(props.state.cur, 'CNY');
  assert.equal(nodeText(allNodes(byClass(tree, 'cx-filter-periods')[0], node => node.props['aria-pressed'])[0]), '本季度');
  byClass(tree, 'cx-sheet-close')[0].props.onClick();
  assert.equal(closed, 1);assert.equal(applied.length, 0);
  tree = renderFilter(props, true);
  assert.equal(nodeText(allNodes(byClass(tree, 'cx-filter-periods')[0], node => node.props['aria-pressed'])[0]), '上月', 'A newly opened sheet starts from the committed state');
  byClass(tree, 'cx-sheet-secondary')[0].props.onClick();
  tree = renderFilter(props);
  assert.equal(applied.length, 0, 'Reset does not silently commit shared state');
  assert.equal(nodeText(allNodes(byClass(tree, 'cx-filter-periods')[0], node => node.props['aria-pressed'])[0]), '本月');
  allNodes(byClass(tree, 'cx-filter-currencies')[0], node => node.type === 'button')[1].props.onClick();
  tree = renderFilter(props);
  const form = byClass(tree, 'cx-filter-form')[0];
  assert.equal(byClass(tree, 'cx-sheet-primary')[0].props.form, form.props.id, 'The external footer submit button targets the actual form');
  form.props.onSubmit({ preventDefault() {} });
  assert.equal(applied.length, 1);assert.equal(JSON.stringify(applied[0]), JSON.stringify({ per: 'm', cur: 'USD' }));
});
check('Project currency filtering cannot change the Customer period or apply unavailable USD', () => {
  const applied = [];
  const props = { kind: 'proj', state: { per: 'y', cur: 'USD', fx: 8 }, canUSD: false, onApply: values => applied.push(values), onClose() {} };
  let tree = renderFilter(props, true);
  assert.equal(byClass(tree, 'cx-filter-periods').length, 0);
  const currencies = allNodes(byClass(tree, 'cx-filter-currencies')[0], node => node.type === 'button');
  assert.equal(currencies[1].props.disabled, true);assert.equal(currencies[0].props['aria-pressed'], true);
  // Even stale local state cannot bypass the loaded-exchange-rate guard.
  currencies[1].props.onClick();tree = renderFilter(props);
  byClass(tree, 'cx-filter-form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(JSON.stringify(applied[0]), JSON.stringify({ cur: 'CNY' }));
  assert.equal(props.state.per, 'y');
  assert.equal(JSON.stringify(context.cxCustomerFilterValues('cust', { per: 'invalid', cur: 'USD' }, false)), JSON.stringify({ per: 'm', cur: 'CNY' }));
});
check('Customer account wrapper reuses the original account component and callbacks', () => {
  const session = {}, onClose = () => {};
  let accountProps;
  context.lM = props => { accountProps = props;return { type: 'original-account', props, children: [] }; };
  hookValues = [];hookIndex = 0;
  const tree = context.FansaiCustomerAccount({ initialSession: session, onClose });
  assert.equal(accountProps.initialSession, session);assert.equal(accountProps.onClose, onClose);
  assert.equal(allNodes(tree, node => node.type === 'original-account').length, 1);
  assert.equal(byClass(tree, 'cx-sheet-close')[0].props.onClick, onClose);
});

const projectSource = JSON.parse(fixtures['/api/admin/bd/projects?page=1&pageSize=100'].b).data.rows[0];
const project = {
  id: String(projectSource.id), n: projectSource.name, c: projectSource.customerName, code: projectSource.code,
  amt: Number(projectSource.contractAmount), cost: Number(projectSource.estimatedCost), inv: projectSource.invoicedAmount,
  rec: projectSource.paidAmount, currency: projectSource.currency, bd: projectSource.bdOwnerName, ae: projectSource.ownerName,
  stg: 2, settled: false, apr: false, due: '—', late: 0,
};
check('Project finance keeps captured values, known zeroes, and unknown inputs distinct', () => {
  const values = context.cxProjectDetailValues(project, projectSource);
  assert.equal(values.amount, 40000);
  assert.equal(values.cost, 0);
  assert.equal(values.received, 40000);
  assert.equal(values.gross, 40000);
  assert.equal(values.margin, 100);
  const unknown = context.cxProjectDetailValues(project, { contractAmount: null, estimatedCost: null, invoicedAmount: '', paidAmount: null });
  for (const key of ['amount', 'cost', 'invoiced', 'received', 'gross', 'margin']) assert.equal(unknown[key], null);
  const missingCost = context.cxProjectDetailValues(project, { contractAmount: 40000, estimatedCost: null });
  assert.equal(missingCost.gross, null, 'Unknown cost cannot fabricate gross profit');
  const zero = context.CXProjectMoney({ value: 0, currency: 'CNY', state: cny });
  assert.equal(nodeText(zero), '¥0');
  assert.equal(nodeText(context.CXProjectMoney({ value: null, currency: 'CNY', state: cny })), '—');
  assert.equal(nodeText(context.CXProjectMoney({ value: 40000, currency: 'CNY', state: { cur: 'USD', fx: 8 } })), '$5,000');
  assert.equal(nodeText(context.CXProjectMoney({ value: 40000, currency: 'CNY', state: { cur: 'USD', fx: 0 } })), '—');
});
check('Project detail keeps its original close and approval actions and stage meaning', () => {
  let closed = 0, approved = 0;
  const renderProject = p => context.FansaiCustomerProjectModal({ p, source: projectSource, S: cny, closeSheet: () => closed++, goApprovals: () => approved++ });
  let tree = renderProject({ ...project, apr: true });
  assert.ok(nodeText(tree).includes(project.n));
  assert.equal(nodeText(byClass(tree, 'cx-project-hero-money')[0]), '¥40,000');
  byClass(tree, 'cx-sheet-close')[0].props.onClick();
  const buttons = allNodes(byClass(tree, 'cx-sheet-footer')[0], node => node.type === 'button');
  assert.equal(buttons.length, 1);
  buttons[0].props.onClick();
  assert.equal(closed, 1);assert.equal(approved, 1);
  assert.equal(allNodes(tree, node => node.type === 'li' && node.props['data-state'] === 'done').length, 2);
  assert.equal(allNodes(tree, node => node.type === 'li' && node.props['aria-current'] === 'step').length, 1);
  tree = renderProject(project);
  assert.equal(byClass(tree, 'cx-sheet-footer').length, 0, 'No approval action or redundant close footer is added to a project without pending approval');
});

// Use the original aggregation and customer adapter for detail coverage. The
// query hooks are supplied with captured results; no network mutations run.
context.Ha = () => 'en-US';context.mu = (value, currency) => `${currency} ${value}`;
context.Oo = (value, state) => `${state.cur === 'USD' ? '$' : '¥'}${(value * 10000 / (state.cur === 'USD' ? state.fx : 1)).toLocaleString('en-US')}`;
context.zM = { project_status_2: ['合同', 'p-teal'] };context.jz = value => value || '—';
const originalFunction = (start, end) => original.app.slice(original.app.indexOf(start), original.app.indexOf(end, original.app.indexOf(start)));
vm.runInContext(originalFunction('var rA=', 'function Uz(') + originalFunction('function Qm(', 'function Ym(') + originalFunction('function VM(', 'function qz('), context);
const customerRecord = JSON.parse(fixtures['/api/admin/bd/customers?page=1&pageSize=1&customerId=56809'].b).data.rows[0];
let customerQuery, customerProjects, projectQueryOptions;
context.ZM = () => customerQuery;
context.Ey = options => { projectQueryOptions = options;return customerProjects; };
function renderCustomer(canProj = true) {
  return context.FansaiCustomerDetail({ id: String(customerRecord.id), S: cny, today: '2026-10-29', canProj, closeSheet() {} });
}
check('Customer detail retains a usable sheet and close control in loading, error, and missing states', () => {
  customerProjects = {};
  for (const [query, expected] of [[{ isLoading: true }, '正在加载客户资料'], [{ isError: true, error: { message: 'Offline' } }, '客户加载失败'], [{ data: null }, '找不到这个客户']]) {
    customerQuery = query;
    const tree = renderCustomer();
    assert.equal(byClass(tree, 'cx-sheet').length, 1);assert.equal(byClass(tree, 'cx-sheet-close').length, 1);
    assert.ok(nodeText(tree).includes(expected));assert.equal(projectQueryOptions.enabled, false);
  }
});
check('Customer detail scopes receivables to this customer and preserves separate currency totals', () => {
  customerQuery = { data: customerRecord };
  customerProjects = { isSuccess: true, data: { total: 3, rows: [
    { id: 1, customerId: customerRecord.id, pendingAmount: 100, currency: 'CNY', overdueDays: 0 },
    { id: 2, customerId: customerRecord.id, pendingAmount: 50, currency: 'USD', overdueDays: 3 },
    { id: 3, customerId: 999999, pendingAmount: 900, currency: 'CNY', overdueDays: 99 },
  ] } };
  let tree = renderCustomer();
  assert.equal(projectQueryOptions.search, customerRecord.name);assert.equal(projectQueryOptions.enabled, true);
  const metrics = nodeText(byClass(tree, 'cx-customer-metrics')[0]);
  assert.ok(metrics.includes('今年签约¥40,000'));assert.ok(metrics.includes('应收未收¥100 + USD 50'));assert.ok(metrics.includes('逾期笔数1 笔'));
  assert.equal(allNodes(byClass(tree, 'cx-customer-projects')[0], node => node.type === 'button' || node.type === 'a').length, 0, 'Snapshot project rows do not invent a nested workflow');
  tree = renderCustomer(false);
  assert.equal(projectQueryOptions.enabled, false);assert.ok(nodeText(byClass(tree, 'cx-customer-metrics')[0]).includes('应收未收—'));
  customerProjects = { isError: true };
  assert.ok(nodeText(byClass(renderCustomer(), 'cx-customer-metrics')[0]).includes('应收未收—'), 'Failed project data cannot become a zero receivable');
});
check('Customer project snapshots preserve known zero and missing amounts', () => {
  const p = { id: 1, amount: 0 };
  assert.equal(context.cxCustomerProjectAmount([{ projectId: 1, signedAt: '2026-10-01', contractAmount: '0.00' }], p), 0);
  assert.equal(context.cxCustomerProjectAmount([{ projectId: 1, signedAt: '2026-10-01', contractAmount: null }], p), null);
  assert.equal(context.cxCustomerProjectAmount([{ projectId: 1, signedAt: null, estimatedAmount: ' ' }], p), null);
  assert.equal(context.cxCustomerProjectAmount([{ projectId: 1, signedAt: null, estimatedAmount: '250.00' }], p), 250);
});

// Run the actual layout effect against a small host model. This validates the
// existing sheet's open/close lifecycle and focus contract; browser review owns
// real layout, scrolling, and animation behavior.
check('The shared Customer sheet traps focus while open and releases the host on close and cleanup', () => {
  const listeners = {}, frames = new Map();
  let frameId = 0, observerCallback, cleanup, closeCount = 0, disconnected = false;
  const doc = { activeElement: null, hidden: false, body: { style: { overflow: 'auto' } }, documentElement: { style: { overflow: '' } },
    addEventListener(name, callback) { listeners[name] = callback; }, removeEventListener(name) { delete listeners[name]; } };
  class Element {
    constructor(classes = '') { this.classes = new Set(classes.split(' '));this.attrs = new Map();this.children = [];this.parentElement = null;this.inert = false;this.isConnected = true;this.ownerDocument = doc;this.classList = { contains: value => this.classes.has(value) }; }
    append(...children) { for (const child of children) { child.parentElement = this;this.children.push(child); } }
    getAttribute(name) { return this.attrs.get(name) ?? null; }
    setAttribute(name, value) { this.attrs.set(name, value); }
    removeAttribute(name) { this.attrs.delete(name); }
    closest(selector) { return (selector === '[inert]' ? this.inert : this.classes.has(selector.slice(1))) ? this : this.parentElement?.closest(selector) ?? null; }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    focus() { doc.activeElement = this; }
    getClientRects() { return [{}]; }
  }
  const scope = new Element('fansai-mobile-scope'), content = new Element('app'), nav = new Element('fg-nav'), scrim = new Element('scrim'), host = new Element('sheet on');
  scrim.id = 'scrim';scope.append(content, nav, scrim, host);
  const trigger = new Element(), node = new Element('cx-sheet'), close = new Element(), body = new Element(), footerClose = new Element(), approval = new Element();
  content.append(trigger);host.append(node);node.append(close, body, footerClose, approval);trigger.focus();
  nav.inert = true;nav.setAttribute('aria-hidden', 'false');host.setAttribute('aria-labelledby', 'original-title');host.setAttribute('aria-hidden', 'false');
  node.querySelectorAll = selector => selector === '[data-cx-modal-reveal]' ? [] : [close, body, footerClose, approval];
  scope.querySelector = () => nav;
  const media = { matches: true, addEventListener() {}, removeEventListener() {} };
  doc.defaultView = { HTMLElement: Element, matchMedia: () => media,
    MutationObserver: class { constructor(callback) { observerCallback = callback; } observe() {} disconnect() { disconnected = true; } },
    requestAnimationFrame(callback) { frames.set(++frameId, callback);return frameId; }, cancelAnimationFrame(id) { frames.delete(id); } };
  const flush = () => { for (const [id, callback] of [...frames]) { frames.delete(id);callback(); } };
  const oldRef = fakeReact.useRef, oldLayout = fakeReact.useLayoutEffect;
  let refs = 0;
  fakeReact.useRef = initial => ({ current: refs++ === 0 ? node : refs === 2 ? close : initial });
  fakeReact.useLayoutEffect = effect => { cleanup = effect(); };
  try {
    context.CXCustomerSheet({ title: 'Customer sheet', onClose: () => closeCount++, children: 'Content' });
    assert.equal(doc.activeElement, close);assert.equal(content.inert, true);assert.equal(scrim.inert, false);
    assert.equal(doc.body.style.overflow, 'hidden');assert.equal(doc.documentElement.style.overflow, 'hidden');
    let prevented = 0;
    approval.focus();listeners.keydown({ key: 'Tab', shiftKey: false, preventDefault() { prevented++; } });
    assert.equal(doc.activeElement, close);
    listeners.keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevented++; } });
    assert.equal(doc.activeElement, approval);assert.equal(prevented, 2);
    listeners.focusin({ target: trigger });assert.equal(doc.activeElement, close);
    listeners.keydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });assert.equal(closeCount, 1);
    host.classes.delete('on');host.setAttribute('aria-hidden', 'true');observerCallback();flush();
    assert.equal(doc.activeElement, trigger);assert.equal(content.inert, false);assert.equal(content.getAttribute('aria-hidden'), null);
    assert.equal(nav.inert, true);assert.equal(nav.getAttribute('aria-hidden'), 'false');
    assert.equal(doc.body.style.overflow, 'auto');assert.equal(doc.documentElement.style.overflow, '');
    host.classes.add('on');host.setAttribute('aria-hidden', 'false');observerCallback();assert.equal(doc.activeElement, close);
    cleanup();flush();assert.equal(disconnected, true);assert.equal(Object.keys(listeners).length, 0);
    assert.equal(content.inert, false);assert.equal(doc.body.style.overflow, 'auto');assert.equal(doc.activeElement, trigger);
    assert.equal(host.getAttribute('aria-labelledby'), 'original-title');assert.equal(host.getAttribute('aria-describedby'), null);
  } finally { fakeReact.useRef = oldRef;fakeReact.useLayoutEffect = oldLayout; }
});
console.log(`${customerChecks} Customers rendering checks passed.`);

// KPI coverage uses the original period and project adapters as well as the
// actual integration expressions. Summary, customer-page, and project counts
// intentionally remain distinct; these fixtures contain different totals.
vm.runInContext(originalFunction('var BM=', 'var rA=') + originalFunction('function Ym(', 'function VM(') + originalFunction('function qz(', 'var ye='), context);
const customerPage = JSON.parse(fixtures['/api/admin/bd/customers?page=1&pageSize=100'].b).data;
const customerSummary = JSON.parse(fixtures['/api/admin/bd/customers/summary'].b).data;
const projectRows = JSON.parse(fixtures['/api/admin/bd/projects?page=1&pageSize=100'].b).data.rows;
const metricToday = '2026-10-29';
const adaptedProjects = projectRows.map(row => context.GM(row, metricToday)).filter(Boolean);
const libraryPatch = build.CUSTOMER_APP_PATCHES.find(patch => patch.after.includes('(FansaiCustomerLibraryMetrics,'));
const projectPatch = build.CUSTOMER_APP_PATCHES.find(patch => patch.after.includes('(FansaiCustomerProjectMetrics,'));
assert.ok(libraryPatch && projectPatch, 'Both KPI integrations are explicit, reversible patches');
const metricNode = (type, props) => ({ type, props });
function libraryMetrics({ period = 'm', selection = 'all', query = {}, onChange = () => {} } = {}) {
  const newCount = customerPage.rows.map(row => context.Qm(row, metricToday)).filter(row => context.Ym(row.createdAt, period, metricToday)).length;
  const signedCount = customerPage.rows.filter(row => row.projects.some(project => project.signedAt && context.Ym(project.signedAt, period, metricToday))).length;
  return vm.runInNewContext(libraryPatch.after, {
    ie: { jsx: metricNode }, FansaiCustomerLibraryMetrics: context.FansaiCustomerLibraryMetrics,
    E: customerSummary, b: query, T: newCount, N: signedCount,
    u: { n: context.Ly(period, metricToday).n }, m: selection, t: onChange,
  });
}
function projectMetrics() {
  const [start, end] = context.sA(metricToday);
  return vm.runInNewContext(projectPatch.after, {
    ie: { jsx: metricNode }, FansaiCustomerProjectMetrics: context.FansaiCustomerProjectMetrics,
    P: adaptedProjects, N: adaptedProjects.filter(project => project.stg <= 3).length,
    E: adaptedProjects.filter(project => project.wk).length, k: adaptedProjects.filter(project => project.late).length,
    B: start, R: end, O: value => value.slice(5).replace('-', '/'),
  });
}
function renderMetrics(integration) {
  hookValues = [];hookIndex = 0;
  const tree = integration.type(integration.props);
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(tree)), 'KPI output contains no invalid numerical values');
  return tree;
}
const metricNumbers = tree => byClass(tree, 'cx-kpi-number').map(nodeText);
const countMarks = tree => allNodes(tree, node => Object.hasOwn(node.props, 'data-count'));
const representedCount = tree => countMarks(tree).reduce((sum, node) => sum + node.props['data-count'], 0);
let kpiChecks = 0;
function checkKpi(name, fn) { fn();kpiChecks++;console.log('PASS KPI: ' + name); }

checkKpi('Captured Customer totals, period counts, and contract counts retain their distinct scopes', () => {
  const integration = libraryMetrics(), tree = renderMetrics(integration);
  assert.equal(integration.props.summary, customerSummary);
  assert.equal(customerPage.total, 153);assert.equal(customerPage.rows.length, 100);
  assert.equal(customerSummary.signedContracts, 5);
  assert.deepEqual(metricNumbers(tree), ['112', '66', '4'], 'Summary customers, period additions, and signed customers are not substituted or added together');
  const cards = byClass(tree, 'cx-kpi-card');
  assert.match(nodeText(byClass(cards[0], 'cx-kpi-caption')[0]), /在跟 25 · 高风险 0/);
  assert.equal(representedCount(cards[0]), 112);assert.equal(representedCount(cards[1]), 66);assert.equal(representedCount(cards[2]), 4);
  const allDots = allNodes(cards[0], node => node.type === 'g' && node.props.key !== undefined);
  const allDashes = allNodes(cards[1], node => node.type === 'g' && node.props.key !== undefined);
  assert.equal(allDots.length, 126);assert.equal(countMarks(cards[0]).length, 112);
  assert.equal(allDashes.length, 70);assert.equal(countMarks(cards[1]).length, 66);
  assert.equal(countMarks(cards[2]).length, 4);
  const previous = libraryMetrics({ period: 'lm' });
  assert.equal(previous.props.newCount, 34);assert.equal(previous.props.signedCount, 0);
  const previousTree = renderMetrics(previous);
  assert.deepEqual(metricNumbers(previousTree), ['112', '34', '0']);
  assert.match(nodeText(previousTree), /上月新建档/);
});
checkKpi('Captured projects retain the original active, week, late, and stage definitions', () => {
  const integration = projectMetrics(), tree = renderMetrics(integration);
  assert.deepEqual(metricNumbers(tree), ['25', '2', '6']);
  assert.deepEqual(Array.from(integration.props.stageCounts), [15, 5, 5, 0]);
  const segments = byClass(tree, 'cx-kpi-stage');
  assert.deepEqual(segments.map(node => node.props['data-count']), [15, 5, 5]);
  assert.deepEqual(segments.map(node => node.props['data-share']), [.6, .2, .2]);
  assert.deepEqual(segments.map(node => node.props.style.flexGrow), [15, 5, 5]);
  assert.equal(segments.reduce((sum, node) => sum + node.props['data-share'], 0), 1);
  assert.equal(byClass(tree, 'is-stage-3').length, 0, 'Zero acceptance projects add no fabricated segment');
  const cards = byClass(tree, 'cx-kpi-card');
  assert.equal(countMarks(cards[1]).length, 2);assert.equal(representedCount(cards[1]), 2);
  assert.equal(countMarks(cards[2]).length, 6);assert.equal(representedCount(cards[2]), 6);
  assert.match(nodeText(byClass(cards[1], 'cx-kpi-caption')[0]), /10\/26–11\/01/);
  assert.equal(allNodes(tree, node => node.type === 'button' || typeof node.props.onClick === 'function').length, 0, 'Read-only project cards do not invent a filter action');
});
checkKpi('Only the new-customer card toggles the existing new/all filter callback', () => {
  const changes = [];
  for (const [selection, next, selected] of [['all', 'new', false], ['new', 'all', true]]) {
    const integration = libraryMetrics({ selection, onChange: value => changes.push(value) });
    const tree = renderMetrics(integration), buttons = allNodes(tree, node => node.type === 'button');
    assert.equal(buttons.length, 1);assert.match(nodeText(buttons[0]), /新增客户/);
    assert.equal(buttons[0].props.onClick, integration.props.onToggleNew);
    assert.equal(buttons[0].props['aria-pressed'], selected);
    buttons[0].props.onClick();
    assert.deepEqual(JSON.parse(JSON.stringify(changes.at(-1))), { cf: next });
  }
});
checkKpi('Loading and failed customer pages keep period counts unknown rather than showing zero or stale counts', () => {
  for (const query of [{ isLoading: true }, { isError: true }]) {
    const integration = libraryMetrics({ query });
    assert.equal(integration.props.newCount, null);assert.equal(integration.props.signedCount, null);
    const tree = renderMetrics(integration), cards = byClass(tree, 'cx-kpi-card');
    assert.deepEqual(metricNumbers(tree), ['112', '—', '—'], 'An available independent summary remains usable');
    assert.equal(countMarks(cards[1]).length, 0);assert.equal(countMarks(cards[2]).length, 0);
    assert.match(byClass(cards[1], 'cx-kpi-chart')[0].props['aria-label'], /数据暂不可用/);
  }
});
checkKpi('Known zero and unavailable counts remain distinct in labels, numbers, and marks', () => {
  for (const value of [null, undefined, '', ' ', false, true, -1, 1.5, NaN, Infinity, 'not a count', Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(context.cxKpiCount(value), null);
    const tree = renderMetrics({ type: context.FansaiCustomerLibraryMetrics, props: { summary: { totalCustomers: value, totalProjects: value, highRiskCustomers: value }, newCount: value, signedCount: value, periodLabel: '本月' } });
    assert.deepEqual(metricNumbers(tree), ['—', '—', '—']);assert.equal(countMarks(tree).length, 0);
  }
  const library = renderMetrics({ type: context.FansaiCustomerLibraryMetrics, props: { summary: { totalCustomers: 0, totalProjects: 0, highRiskCustomers: 0 }, newCount: 0, signedCount: 0, periodLabel: '本月' } });
  assert.deepEqual(metricNumbers(library), ['0', '0', '0']);assert.equal(countMarks(library).length, 0);
  assert.match(nodeText(library), /在跟 0 · 高风险 0/);
  for (const value of [0, null]) {
    const projects = renderMetrics({ type: context.FansaiCustomerProjectMetrics, props: { activeCount: value, weekCount: value, lateCount: value, weekLabel: '本周', stageCounts: [value, value, value, value] } });
    assert.deepEqual(metricNumbers(projects), Array(3).fill(value === 0 ? '0' : '—'));
    assert.equal(countMarks(projects).length, 0);
    const label = byClass(projects, 'cx-kpi-chart')[0].props['aria-label'];
    assert.match(label, value === 0 ? /暂无在制项目/ : /阶段数据暂不可用/);
  }
});
checkKpi('Stage composition includes acceptance and suppresses incomplete or inconsistent totals', () => {
  const tree = context.CXKpiStages({ counts: [0, 3, 0, 2], activeCount: 5 });
  const segments = byClass(tree, 'cx-kpi-stage');
  assert.deepEqual(segments.map(node => node.props['data-count']), [3, 2]);
  assert.deepEqual(segments.map(node => node.props['data-share']), [.6, .4]);
  assert.equal(byClass(tree, 'is-stage-3').length, 2, 'Acceptance remains represented in the segment and its legend');
  assert.match(tree.props['aria-label'], /合同 3，验收 2/);
  for (const [counts, activeCount] of [[[15, 5, 5, 0], 24], [[15, null, 5, 0], 20], [[15, 5, 5], 25], [null, 25], [[0, 0, 0, 0], 0]]) {
    const empty = context.CXKpiStages({ counts, activeCount });
    assert.equal(countMarks(empty).length, 0);assert.equal(byClass(empty, 'cx-kpi-stage').length, 0);
    assert.match(empty.props['aria-label'], activeCount === 0 ? /暂无在制项目/ : /阶段数据暂不可用/);
  }
});
checkKpi('Counts exceeding the mark capacity are grouped without losing the remainder', () => {
  const renderers = [
    { capacity: 126, render: value => context.CXKpiMatrix({ value }) },
    { capacity: 70, render: value => context.CXKpiMatrix({ value, dashes: true }) },
    ...['bars', 'stems', 'hatched'].map(variant => ({ capacity: 12, render: value => context.CXKpiCountBars({ value, variant }) })),
  ];
  for (const { capacity, render: renderChart } of renderers) {
    for (const value of [0, 1, capacity, capacity + 1, capacity * 10, capacity * 10 + 1, 12345]) {
      const model = context.cxKpiUnits(value, capacity), tree = renderChart(value), marks = countMarks(tree);
      assert.equal(model.value, value);assert.ok(model.slots <= capacity);
      assert.ok(Math.abs((model.filled + model.lastFraction) * model.unit - value) < 1e-7);
      assert.equal(marks.length, model.slots);
      assert.ok(Math.abs(representedCount(tree) - value) < 1e-7, `The rendered ${capacity}-slot chart preserves ${value}`);
      const scale = byClass(tree, 'cx-kpi-scale');
      assert.equal(scale.length, value > capacity ? 1 : 0);
      if (value > capacity) {
        assert.equal(nodeText(scale[0]), '×' + model.unit.toLocaleString('en-US'));
        assert.ok(tree.props['aria-label'].includes(model.unit.toLocaleString('en-US')));
      }
      if (model.lastFraction) {
        assert.ok(Math.abs(marks.at(-1).props['data-count'] - value % model.unit) < 1e-7);
        assert.ok(tree.props['aria-label'].includes(`末格 ${value % model.unit} 个`));
        const partial = marks.at(-1);
        const slot = partial.type === 'g' ? partial : allNodes(tree, node => node.type === 'g' && allNodes(node, child => child === partial).length === 1).at(-1);
        const live = byClass(slot, 'is-live')[0], track = byClass(slot, 'is-dim')[0];
        const dimension = partial.type === 'g' ? 'height' : 'width';
        assert.ok(live && track, 'The partial mark retains a full-size reference track');
        assert.ok(Math.abs(live.props[dimension] / track.props[dimension] - model.lastFraction) < 1e-7,
          'The visible remainder is proportional, rather than only relabeled as partial');
      }
    }
  }
});
checkKpi('KPI motion respects reduced motion, visibility, first entry, and effect cleanup', () => {
  const oldRef = fakeReact.useRef, oldEffect = fakeReact.useEffect;
  function scenario(reduced, hidden = false, hideDuringMotion = false) {
    let effectCleanup, intersection, observed = false, disconnected = 0;
    const listeners = {}, mediaListeners = {}, animations = [];
    const animate = () => { const animation = { cancelled: false, cancel() { this.cancelled = true; } };animations.push(animation);return animation; };
    const numbers = [{ animate }], marks = [{ dataset: { cxKpiMark: '0', cxKpiMotion: 'bar' }, animate }];
    const media = { matches: reduced, addEventListener(name, fn) { mediaListeners[name] = fn; }, removeEventListener(name) { delete mediaListeners[name]; } };
    const doc = { hidden, addEventListener(name, fn) { listeners[name] = fn; }, removeEventListener(name) { delete listeners[name]; } };
    doc.defaultView = { matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)');return media; },
      IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() { observed = true; } disconnect() { disconnected++; } } };
    const node = { ownerDocument: doc, animate, querySelectorAll: selector => selector === '[data-cx-kpi-number]' ? numbers : marks };
    fakeReact.useRef = () => ({ current: node });fakeReact.useEffect = effect => { effectCleanup = effect(); };
    context.useCXKpiMotion('112|66|4');
    assert.equal(observed, true);assert.equal(animations.length, 0, 'Motion waits until the cards enter the viewport');
    intersection([{ isIntersecting: false }]);assert.equal(animations.length, 0);
    intersection([{ isIntersecting: true }]);assert.ok(disconnected > 0);
    assert.equal(animations.length, reduced || hidden ? 0 : 2);
    if (!reduced && !hidden) {
      if (hideDuringMotion) { doc.hidden = true;listeners.visibilitychange(); }
      else { media.matches = true;mediaListeners.change(); }
      assert.ok(animations.every(animation => animation.cancelled));
    }
    effectCleanup();
    assert.equal(Object.keys(listeners).length, 0);assert.equal(Object.keys(mediaListeners).length, 0);
    assert.ok(animations.every(animation => animation.cancelled));
  }
  try { scenario(true);scenario(false);scenario(false, true);scenario(false, false, true); }
  finally { fakeReact.useRef = oldRef;fakeReact.useEffect = oldEffect; }
  const kpiCSS = fs.readFileSync(path.join(__dirname, 'kpi-cards.css'), 'utf8');
  assert.match(kpiCSS, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)[\s\S]*transition\s*:\s*none/);
  assert.match(kpiCSS, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)[\s\S]*transform\s*:\s*none/);
});
console.log(`${kpiChecks} KPI rendering, integration, and motion checks passed.`);

// The loading change is deliberately stateless: exercise actual patched
// branches and permanent per-tab boundaries, without inventing a timer model.
let loadingChecks = 0;
function checkLoading(name, fn) { fn();loadingChecks++;console.log('PASS Tab loading: ' + name); }
const loadingPatches = build.TAB_LOADING_APP_PATCHES;
assert.equal(loadingPatches.length, 9, 'Four primary boundaries and five real pending branches are the entire loading patch surface');
function sameTree(actual, expected) {
  if (actual === expected) return;
  if (typeof actual === 'function' && typeof expected === 'function') {
    assert.equal(actual.toString(), expected.toString(), 'New closures preserve their original callback body');
  } else if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
    for (const key of Object.keys(expected)) sameTree(actual[key], expected[key]);
  } else assert.equal(actual, expected);
}
checkLoading('Each permanent tab boundary preserves its original visibility, child, and callback objects', () => {
  const tabs = ['ops', 'cust', 'appr', 'more'];
  const symbols = { FansaiGrowthKeepAlive: 'keep-growth', FansaiTabContent: 'tab-boundary', _0: 'growth', oE: 'customers', MB: 'decisions', gk: 'workbench' };
  const stable = { f: { page: null }, t: {}, de: 42, re: 'roi-key' };
  const cleared = [];
  for (const key of ['xe', 'Ne', 'G', 'Qe', 'je', 'Se', 'fe', 'W', 'Oe', 'y', 'Xe']) stable[key] = () => {};
  stable.Oe = value => cleared.push(value);
  for (const [index, tab] of tabs.entries()) {
    const patch = loadingPatches[index];
    build.exactlyOnce(current.app, patch.after);
    for (const activeTab of tabs) for (const page of [null, 'kb']) {
      const globals = { ...symbols, ...stable, C: { tab: activeTab, page }, ue: { jsx: (type, props) => ({ type, props }) } };
      const before = vm.runInNewContext(patch.before, globals), after = vm.runInNewContext(patch.after, globals);
      assert.equal(after.type, 'section');assert.equal(after.props.id, 'v-' + tab);
      assert.equal(after.props.hidden, before.props.hidden);
      const boundary = after.props.children;
      assert.equal(boundary.type, 'tab-boundary');assert.equal(boundary.props.tab, tab);
      sameTree(boundary.props.children, before.props.children);
      assert.equal(after.props.hidden, !!page || activeTab !== tab);
      if (tab === 'cust' && activeTab === 'cust' && !page) {
        before.props.children.props.clearPendingCusSheetId();
        boundary.props.children.props.clearPendingCusSheetId();
        assert.deepEqual(cleared.slice(-2), [null, null]);
      }
    }
  }
  assert.ok(loadingPatches.every(patch => !patch.before.includes('id:"v-page"') && !patch.after.includes('fg-nav')),
    'Secondary pages and fixed navigation stay outside the new loading boundaries');
});
checkLoading('Real pending states use the shared skeleton while ready, error, and Growth secondary branches remain intact', () => {
  const skeleton = {}, oldGrowthLoading = {}, ready = {}, error = {};
  const jsx = (type, props) => ({ type, props });
  const globals = { FansaiTabSkeleton: skeleton, JW: oldGrowthLoading, U: { jsx }, ie: { jsx }, Ke: { jsx }, ready, error, cA: () => error };
  const growth = loadingPatches[4].after;
  const growthBranch = growth.slice(growth.indexOf('):') + 2, growth.indexOf('}function KB('));
  for (const page of [null, 'met', 'fin', 'ads']) {
    const node = vm.runInNewContext(growthBranch, { ...globals, e: { S: { page } } });
    assert.equal(node.type, page === null ? skeleton : oldGrowthLoading);
    if (page === null) assert.equal(node.props.tab, 'ops');
  }
  const board = loadingPatches[5].after.slice('A=()=>'.length) + 'ready';
  const library = loadingPatches[6].after.slice('children:'.length) + 'ready';
  const project = '(' + loadingPatches[7].after.slice('D='.length) + 'return ready;})()';
  const decisionSource = loadingPatches[8].after;
  const decision = decisionSource.slice(decisionSource.indexOf('children:') + 'children:'.length) + 'error:ready';
  for (const [expression, stateKey, pendingKey, tab, missingIsError] of [
    [board, 'S', 'isLoading', 'cust', true], [library, 'C', 'isLoading', 'cust', false],
    [project, 'h', 'isLoading', 'cust', true], [decision, 'p', 'isPending', 'appr', false],
  ]) {
    const pending = vm.runInNewContext(expression, { ...globals, [stateKey]: { [pendingKey]: true, isError: true } });
    assert.equal(pending.type, skeleton);assert.equal(pending.props.tab, tab);
    assert.equal(vm.runInNewContext(expression, { ...globals, [stateKey]: { [pendingKey]: false, data: {} } }), ready);
    assert.equal(vm.runInNewContext(expression, { ...globals, [stateKey]: { [pendingKey]: false, isError: true, error: 'offline' } }), error);
    if (missingIsError) assert.equal(vm.runInNewContext(expression, { ...globals, [stateKey]: { data: null } }), error);
  }
});
checkLoading('Rapid tab changes keep independent fallbacks and immediately pass ready children without timers or effects', () => {
  const oldHooks = {}, oldWindow = context.window, oldTimeout = context.setTimeout, oldFrame = context.requestAnimationFrame;
  const noLifecycle = () => { throw new Error('Stateless tab loading must not schedule timers, effects, or state'); };
  for (const name of ['useState', 'useRef', 'useEffect', 'useLayoutEffect']) { oldHooks[name] = fakeReact[name];fakeReact[name] = noLifecycle; }
  context.window = { setTimeout: noLifecycle, requestAnimationFrame: noLifecycle };
  context.setTimeout = noLifecycle;context.requestAnimationFrame = noLifecycle;
  const saved = [];
  try {
    for (const tab of ['ops', 'cust', 'more', 'appr', 'ops', 'more', 'cust']) {
      const child = { type: 'ready-' + tab, props: { request: saved.length }, children: [] };
      const boundary = context.FansaiTabContent({ tab, children: child });
      assert.equal(boundary.type, fakeReact.Suspense);
      assert.equal(boundary.children.length, 1);assert.equal(boundary.children[0], child, 'Ready content is passed through without a loading dwell');
      const fallback = boundary.props.fallback;
      assert.equal(fallback.props['data-loading-tab'], tab);
      assert.equal(fallback.props.role, 'status');assert.equal(fallback.props['aria-busy'], 'true');
      assert.ok(fallback.props['aria-label'].includes('加载中'));
      assert.equal(byClass(fallback, 'fs-tab-skeleton-tile').length, 6);
      assert.equal(allNodes(fallback, node => node.type === 'button' || node.type === 'a' || typeof node.props.onClick === 'function').length, 0);
      assert.equal(byClass(fallback, 'fs-tab-skeleton-shapes')[0].props['aria-hidden'], 'true');
      saved.push({ tab, child, boundary });
    }
    for (const { tab, child, boundary } of saved) {
      assert.equal(boundary.props.fallback.props['data-loading-tab'], tab, 'A later tab cannot mutate an earlier boundary fallback');
      assert.equal(boundary.children[0], child);
    }
  } finally {
    Object.assign(fakeReact, oldHooks);context.window = oldWindow;context.setTimeout = oldTimeout;context.requestAnimationFrame = oldFrame;
  }
});
console.log(`${loadingChecks} tab loading integration and lifecycle checks passed.`);
let headerChecks = 0;
function checkHeader(name, fn) { fn();headerChecks++;console.log('PASS Primary headers: ' + name); }
checkHeader('All four English titles use one copy of the unchanged original 38×38 Figma SVG', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(build.HEADER_ROOT, 'logo.json'), 'utf8'));
  const bytes = fs.readFileSync(path.join(build.HEADER_ROOT, manifest.filename));
  assert.equal(manifest.sourceFileKey, '5eV9HU93QC0oYubyKtNSMB');assert.equal(manifest.nodeId, '115:33467');
  assert.equal(manifest.width, 38);assert.equal(manifest.height, 38);assert.equal(manifest.viewBox, '0 0 38 38');
  assert.equal(bytes.length, manifest.bytes);
  assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  const logo = build.headerLogo();
  assert.ok(logo.src.startsWith('data:image/svg+xml;base64,'));
  assert.ok(Buffer.from(logo.src.slice('data:image/svg+xml;base64,'.length), 'base64').equals(bytes));
  assert.equal(context.FH_LOGO.src, logo.src);
  for (const [tab, title] of Object.entries({ ops: 'Growth', cust: 'Customer', appr: 'Decisions', more: 'Workbench' })) {
    const tree = context.FansaiPrimaryTitle({ tab });
    assert.equal(tree.props['data-primary-tab'], tab);
    assert.equal(nodeText(byClass(tree, 'fh-title-text')[0]), title);
    const images = allNodes(tree, node => node.type === 'img');
    assert.equal(images.length, 1);assert.equal(images[0].props.src, logo.src);
    assert.equal(images[0].props.width, 38);assert.equal(images[0].props.height, 38);
    assert.equal(images[0].props.alt, '');assert.equal(images[0].props['data-figma-node'], '115:33467');
    assert.equal(byClass(tree, 'fh-title-dot').length, 1, 'Each header adds exactly one separate square period');
    assert.equal(byClass(tree, 'gx-heading-dot').length, 0, 'The previous Growth-only marker is not duplicated');
  }
});
checkHeader('Primary title patches preserve secondary titles, contextual eyebrows, and host heading structure', () => {
  const patches = build.PRIMARY_HEADER_APP_PATCHES;
  assert.equal(patches.length, 3);
  for (const patch of patches) build.exactlyOnce(current.app, patch.after);
  const titleComponent = {}, secondaryTitle = {}, secondaryContext = {};
  const jsx = (type, props) => ({ type, props });
  const growth = vm.runInNewContext(patches[0].after, { FansaiPrimaryTitle: titleComponent, gxEl: (type, props, ...children) => ({ type, props, children }) });
  assert.equal(growth.type, 'h1');assert.equal(growth.children.length, 1);
  assert.equal(growth.children[0].type, titleComponent);assert.equal(growth.children[0].props.tab, 'ops');
  for (const tab of ['ops', 'cust', 'appr', 'more']) for (const page of [null, 'met', 'finance', 'kb']) {
    const globals = { C: { tab, page }, ue: { jsx }, Et: secondaryTitle, Gt: secondaryContext, FansaiPrimaryTitle: titleComponent };
    const originalTitle = vm.runInNewContext(patches[1].before, globals);
    const title = vm.runInNewContext(patches[1].after, globals);
    assert.equal(title.type, originalTitle.type);assert.equal(title.props.id, originalTitle.props.id);assert.equal(title.props.className, originalTitle.props.className);
    if (page) assert.equal(title.props.children, secondaryTitle, 'Secondary pages retain their exact existing title object');
    else { assert.equal(title.props.children.type, titleComponent);assert.equal(title.props.children.props.tab, tab); }
    const eyebrow = vm.runInNewContext(patches[2].after, globals);
    if (page) sameTree(eyebrow, vm.runInNewContext(patches[2].before, globals));
    else assert.equal(eyebrow, null);
  }
});
checkHeader('Responsive title fitting uses one bounded scale and releases resize and font callbacks', () => {
  const oldRef = fakeReact.useRef, oldLayout = fakeReact.useLayoutEffect;
  const resizeListeners = {}, fontListeners = {};
  let available = 200, naturalLabel = 200, scale = 1, writes = 0, observerCallback, fontReady, cleanup, observed, disconnected = false;
  const doc = { fonts: {
    addEventListener: (name, callback) => { fontListeners[name] = callback; },
    removeEventListener: name => { delete fontListeners[name]; },
    ready: { then(callback) { fontReady = callback; } },
  } };
  doc.defaultView = {
    ResizeObserver: class { constructor(callback) { observerCallback = callback; } observe(node) { observed = node; } disconnect() { disconnected = true; } },
    addEventListener: (name, callback) => { resizeListeners[name] = callback; },
    removeEventListener: name => { delete resizeListeners[name]; },
  };
  const node = { ownerDocument: doc, get clientWidth() { return available; }, style: { setProperty(name, value) {
    assert.equal(name, '--fh-title-scale');scale = Number(value);writes++;
    assert.ok(Number.isFinite(scale) && scale > 0 && scale <= 1);
  } } };
  const label = { getBoundingClientRect: () => ({ width: naturalLabel * scale }) };
  let refs = 0;
  fakeReact.useRef = () => ({ current: refs++ === 0 ? node : label });
  fakeReact.useLayoutEffect = effect => { cleanup = effect(); };
  try {
    context.FansaiPrimaryTitle({ tab: 'more' });
    assert.equal(observed, node);assert.ok(scale < 1);
    assert.ok((naturalLabel + 38 + 4) * scale <= available);
    available = 500;observerCallback();assert.equal(scale, 1);
    available = 160;resizeListeners.resize();assert.ok((naturalLabel + 38 + 4) * scale <= available);
    naturalLabel = 400;fontListeners.loadingdone();assert.ok((naturalLabel + 38 + 4) * scale <= available);
    const previousScale = scale;available = 0;observerCallback();assert.equal(scale, previousScale, 'A temporarily hidden header does not divide by zero');
    cleanup();assert.equal(disconnected, true);
    assert.equal(Object.keys(resizeListeners).length, 0);assert.equal(Object.keys(fontListeners).length, 0);
    const finishedWrites = writes;
    available = 500;observerCallback();fontReady();
    assert.equal(writes, finishedWrites, 'Queued resize/font completion cannot write into an unmounted header');
  } finally { fakeReact.useRef = oldRef;fakeReact.useLayoutEffect = oldLayout; }
});
console.log(`${headerChecks} primary header asset and integration checks passed.`);
require('../workbench-src/check.cjs')({
  build, original, current, context, fakeReact, allNodes, byClass, nodeText,
  resetHooks() { hookValues = [];hookIndex = 0; },
});
execFileSync(process.execPath, ['tests/data.test.cjs'], { cwd: build.ROOT, stdio: 'inherit' });
