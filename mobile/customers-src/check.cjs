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
const restoredApp = build.applyPatches(build.applyPatches(current.app.replace(inserted, '').replace(build.NEW_SLOT, build.SLOT), build.NAV_APP_PATCHES, true), build.CUSTOMER_APP_PATCHES, true);
assert.equal(restoredApp, original.app, 'Application code outside the explicit Customer and navigation patches remains byte-identical');
assert.ok(current.app.includes('cust:["","Customer"]'), 'Only the Customer header uses the requested English title');
assert.ok(current.app.includes('cseg:"board",per:"m",cf:"project_status_1",q:""'), 'Customer library defaults to initiation while the board remains the initial subtab');
new vm.Script(current.app, { filename: 'mobile/embedded-app.js' });
const style = build.STYLE_START + css + '</style>\n';
build.exactlyOnce(current.inner, style);
const restoredInner = build.replaceScript(build.applyPatches(current.inner.replace(style, ''), build.NAV_INNER_PATCHES, true), 'appsrc', build.plainScript(original.inner, 'appsrc'));
assert.equal(restoredInner, original.inner, 'Other HTML, CSS, runtimes, data and assets remain byte-identical');
assert.equal(build.replaceScript(current.outer, 'inner', build.plainScript(original.outer, 'inner')), original.outer,
  'Outer document and iframe wrapper remain byte-identical');
assert.equal(build.generate().output, current.outer, 'Build is reproducible from editable source');

// Parse block boundaries so nested media/supports rules cannot hide broad selectors.
function validateCSS(source, modal = false) {
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
        assert.match(header, /^@(?:-webkit-)?keyframes\s+(?:cx-|customers-)/, 'Keyframes have a Customers-specific prefix');
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
          const modalComponent = /^\.cx-project-[a-z][\w-]*(?=[\s.#:[>+~]|$)/.test(selector);
          const modalHost = /^\.fansai-mobile-scope \.sheet(?:\.on)?:has\(\.cx-project-modal\)(?:>\.grab)?$/.test(selector);
          const modalScrim = selector === '.fansai-mobile-scope:has(.cx-project-modal)>.scrim';
          assert.ok(modal ? modalComponent || modalHost || modalScrim : selector.includes('#v-cust'), `Selector must be scoped to ${modal ? 'the Customer project modal' : 'Customers'}: ${selector}`);
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
const count = build.CSS_FILES.reduce((sum, filename) => sum + validateCSS(fs.readFileSync(path.join(__dirname, filename), 'utf8'), filename === 'project-modal.css'), 0);
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
  createElement(type, props, ...children) {
    const fullProps = { ...(props || {}), children };
    return typeof type === 'function' ? type(fullProps) : { type, props: fullProps, children };
  },
  useState(initial) {
    const slot = hookIndex++;
    if (!(slot in hookValues)) hookValues[slot] = initial;
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
  byClass(tree, 'cx-project-close')[0].props.onClick();
  const buttons = allNodes(byClass(tree, 'cx-project-foot')[0], node => node.type === 'button');
  assert.equal(buttons.length, 2);
  buttons[0].props.onClick();buttons[1].props.onClick();
  assert.equal(closed, 2);assert.equal(approved, 1);
  assert.equal(allNodes(tree, node => node.type === 'li' && node.props['data-state'] === 'done').length, 2);
  assert.equal(allNodes(tree, node => node.type === 'li' && node.props['aria-current'] === 'step').length, 1);
  tree = renderProject(project);
  assert.equal(allNodes(byClass(tree, 'cx-project-foot')[0], node => node.type === 'button').length, 1, 'No approval action is added to a project without pending approval');
});

// Run the actual layout effect against a small host model. This validates the
// existing sheet's open/close lifecycle and focus contract; browser review owns
// real layout, scrolling, and animation behavior.
check('Project modal traps focus while open and releases the host on close and cleanup', () => {
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
  const trigger = new Element(), node = new Element('cx-project-modal'), close = new Element(), body = new Element(), footerClose = new Element(), approval = new Element();
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
  fakeReact.useRef = () => ({ current: refs++ === 0 ? node : close });
  fakeReact.useLayoutEffect = effect => { cleanup = effect(); };
  try {
    context.FansaiCustomerProjectModal({ p: { ...project, apr: true }, source: projectSource, S: cny, closeSheet: () => closeCount++, goApprovals() {} });
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
execFileSync(process.execPath, ['tests/data.test.cjs'], { cwd: build.ROOT, stdio: 'inherit' });
