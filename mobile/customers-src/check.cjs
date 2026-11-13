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
const css = fs.readFileSync(path.join(__dirname, 'customers.css'), 'utf8');
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
function validateCSS(source) {
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
          assert.ok(selector.includes('#v-cust'), `Selector must be scoped to Customers: ${selector}`);
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
const count = validateCSS(css);
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
};
const context = vm.createContext({
  F: value => value,
  X: () => fakeReact,
  Oo: value => value == null ? '—' : String(value),
  Vm: () => '',
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
  assert.equal(byClass(tree, 'cx-gauge-received')[0].props['data-share'], .625);
  assert.equal(byClass(tree, 'cx-gauge-pending')[0].props['data-share'], .375);
  assert.equal(byClass(tree, 'cx-gauge-received')[0].props['data-share'] + byClass(tree, 'cx-gauge-pending')[0].props['data-share'], 1);
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
  assert.match(nodeText(tree), /本期暂无签约金额/);
  assert.equal(byClass(tree, 'cx-gauge-received').length, 0);
  assert.equal(byClass(tree, 'cx-gauge-pending').length, 0);
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
console.log(`${customerChecks} Customers rendering checks passed.`);
execFileSync(process.execPath, ['tests/data.test.cjs'], { cwd: build.ROOT, stdio: 'inherit' });
