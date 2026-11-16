'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

module.exports = function checkWorkbench({ build, original, current, context, fakeReact, allNodes, byClass, nodeText, resetHooks }) {
  let checks = 0;
  const check = (name, fn) => { fn();checks++;console.log('PASS Workbench: ' + name); };
  const between = (source, start, end) => {
    const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
    assert.ok(first >= 0 && last > first, `Original Workbench seam exists: ${start}`);
    return source.slice(first, last);
  };
  const catalogSource = between(original.app, 'vy=[', '],AM=') + ']';
  const iconSource = between(original.app, 'pu={', ',vy=');
  const permissionSource = between(original.app, 'h7={', 'function lU(');
  const homeSource = between(original.app, 'function P9(', 'var ue=');
  // JSX-runtime adaptation lets the original homepage and the new homepage use
  // the same tree traversal and real click callbacks, without a browser or API.
  context.fa = {
    Fragment: fakeReact.Fragment,
    jsx: (type, props) => fakeReact.createElement(type, props, props?.children),
    jsxs: (type, props) => fakeReact.createElement(type, props, props?.children),
  };
  context.Nm = () => fakeReact.createElement('svg', { 'data-original-user-star': true });
  vm.runInContext('var ' + catalogSource + ';var ' + iconSource + ';var ' + permissionSource + '\n' + homeSource, context);
  const catalog = context.vy;
  const iconKeys = vm.runInContext('WB_ICON_KEYS', context);
  const embedded = build.workbenchIcons();
  const render = (component, props) => { resetHooks();return component(props); };
  const buttons = tree => allNodes(tree, node => node.type === 'button');
  const expectedIcons = {
    '客户业务/数据看板': ['business-dashboard', '198:55994'],
    '客户业务/客户资料': ['customers', '198:55996'],
    '客户业务/项目管理': ['projects', '198:55998'],
    '客户业务/审批管理': ['approvals', '198:56000'],
    '客户业务/财务分析': ['finance', '198:56002'],
    '客户业务/创作者列表': ['creators', '198:56004'],
    '产品增长/数据看板': ['growth-dashboard', '198:56006'],
    '产品增长/内容资产': ['content', '198:56008'],
    '产品增长/素材库': ['materials', '198:56010'],
    '产品增长/生成任务': ['generation', '198:56012'],
    '产品增长/账号管理': ['accounts', '198:56014'],
    '产品增长/达人库': ['influencers', '198:56016'],
    '产品增长/博客管理': ['blog', '198:56018'],
    '产品增长/数据管理': ['data', '198:56020'],
    '内部项目/供应商': ['suppliers', '198:56022'],
    '内部项目/内部项目': ['internal-projects', '198:56024'],
    '知识分类/知识库': ['knowledge', '209:64'],
  };

  check('Visible entries retain original permissions and routes while only the internal-project preview remains unavailable', () => {
    const items = catalog.flatMap(section => section.groups.flatMap(group => group.items));
    assert.equal(items.length, 33);assert.equal(items.filter(item => item[2]).length, 16);
    const permissionCases = [
      { perms: undefined, visible: 17, groups: ['客户业务', '产品增长', '内部项目', '知识分类'], sections: ['经营', '共享空间'] },
      { perms: { menuCodes: [], actionCodes: [] }, visible: 1, groups: ['内部项目'], sections: ['经营'] },
      { perms: { menuCodes: ['bd.customers', 'dashboard', 'file_library.public'], actionCodes: [] }, visible: 4, groups: ['客户业务', '产品增长', '内部项目', '知识分类'], sections: ['经营', '共享空间'] },
      { perms: { menuCodes: ['file_library.public'], actionCodes: [] }, visible: 2, groups: ['内部项目', '知识分类'], sections: ['经营', '共享空间'] },
      { perms: { menuCodes: Object.values(context.h7), actionCodes: [] }, visible: 17, groups: ['客户业务', '产品增长', '内部项目', '知识分类'], sections: ['经营', '共享空间'] },
    ];
    for (const { perms, visible, groups, sections } of permissionCases) {
      const originalActions = [], newActions = [];
      const callbacks = target => ({ perms, go: value => target.push(['go', value]), toast: value => target.push(['toast', value]) });
      const previous = render(context.P9, callbacks(originalActions));
      const next = render(context.FansaiWorkbench, callbacks(newActions));
      const previousButtons = buttons(previous), nextButtons = buttons(next);
      assert.equal(nextButtons.length, visible);
      assert.equal(byClass(next, 'is-glass').length, visible, 'Every visible Workbench entry uses its assigned glass asset');
      assert.equal(allNodes(next, node => node.type === 'img').length, visible);
      assert.deepEqual(byClass(next, 'wb-group').map(group => group.props['data-group']), groups);
      assert.deepEqual(byClass(next, 'wb-section').map(section => section.props['data-section']), sections);
      for (const group of byClass(next, 'wb-group')) assert.ok(buttons(group).length > 0, 'Filtered groups cannot leave an empty heading');
      for (const section of byClass(next, 'wb-section')) assert.ok(byClass(section, 'wb-group').length > 0, 'Filtered sections cannot leave an empty shell');
      previousButtons.forEach(button => button.props.onClick());
      nextButtons.forEach(button => button.props.onClick());
      const expectedActions = originalActions.filter(([kind, value]) => kind === 'go' || value.includes('「内部项目」'));
      assert.deepEqual(newActions, expectedActions, 'Retained entries forward exactly their original route or internal-project toast');
      assert.equal(newActions.filter(([kind]) => kind === 'toast').length, 1);
      assert.equal(byClass(next, 'is-unavailable').length, 1);
      assert.equal(byClass(next, 'wb-entry-status').length, 1);
      assert.equal(nodeText(byClass(byClass(next, 'is-unavailable')[0], 'wb-entry-label')[0]), '内部项目');
      assert.equal(newActions.filter(([kind]) => kind === 'go').length, visible - 1);
      const retainedOriginalLabels = previousButtons.filter((button, index) => originalActions[index][0] === 'go' || originalActions[index][1].includes('「内部项目」')).map(button => nodeText(byClass(button, 'l')[0]));
      assert.deepEqual(nextButtons.map(button => nodeText(byClass(button, 'wb-entry-label')[0])), retainedOriginalLabels);
      const shared = byClass(next, 'wb-section').find(section => section.props['data-section'] === '共享空间');
      if (shared) {
        assert.deepEqual(buttons(shared).map(button => nodeText(byClass(button, 'wb-entry-label')[0])), ['知识库']);
        const heading = byClass(shared, 'wb-section-head')[0];
        assert.equal(nodeText(allNodes(heading, node => node.type === 'h2')[0]), 'Shared Space');
        assert.equal(allNodes(heading, node => node.type === 'p').length, 0, 'Shared Space no longer renders the removed description');
      }
      const business = byClass(next, 'wb-section').find(section => section.props['data-section'] === '经营');
      assert.equal(byClass(business, 'wb-section-head').length, 0);
      assert.ok(!nodeText(business).includes('创造收入与增长的三条线'));
    }
    assert.equal(catalog.flatMap(section => section.groups.flatMap(group => group.items)).length, 33, 'Visibility filtering never mutates the original catalog');
  });
  check('The original 16 Figma PNGs and new Knowledge PNG remain local, distinct, and embedded byte-for-byte', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'icons.json'), 'utf8'));
    assert.equal(manifest.sourceFileKey, '5eV9HU93QC0oYubyKtNSMB');
    assert.equal(manifest.parentNodeId, '198:55949');assert.equal(manifest.icons.length, 17);
    assert.deepEqual(Object.keys(embedded).sort(), Object.values(expectedIcons).map(([key]) => key).sort());
    assert.equal(new Set(manifest.icons.map(icon => icon.nodeId)).size, 17);
    assert.equal(new Set(manifest.icons.map(icon => icon.sha256)).size, 17);
    for (const icon of manifest.icons) {
      const filename = path.resolve(__dirname, icon.filename);
      assert.ok(filename.startsWith(path.join(__dirname, 'assets') + path.sep));
      const bytes = fs.readFileSync(filename), asset = embedded[icon.key];
      const dimensions = icon.key === 'knowledge' ? [1024, 1024] : [430, 390];
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
      assert.equal(bytes.readUInt32BE(16), dimensions[0]);assert.equal(bytes.readUInt32BE(20), dimensions[1]);
      assert.equal(bytes.length, icon.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), icon.sha256);
      assert.equal(icon.sourceFileKey, manifest.sourceFileKey);
      assert.equal(asset.width, dimensions[0]);assert.equal(asset.height, dimensions[1]);assert.equal(asset.nodeId, icon.nodeId);
      assert.ok(asset.src.startsWith('data:image/png;base64,'));
      assert.ok(Buffer.from(asset.src.slice('data:image/png;base64,'.length), 'base64').equals(bytes));
      assert.equal(context.WB_ICONS[icon.key].src, asset.src, 'The compiled component consumes the verified local asset');
    }
  });
  check('Business and Growth entries use distinct semantic icons without changing empty-route behavior', () => {
    assert.deepEqual(Object.keys(iconKeys).sort(), Object.keys(expectedIcons).sort());
    assert.equal(new Set(Object.values(iconKeys)).size, 17);
    for (const section of catalog) for (const group of section.groups) for (const item of group.items) {
      const semantic = group.g + '/' + item[0], expected = expectedIcons[semantic];
      const actions = [];
      const entry = render(context.WBEntry, { group: group.g, item, go: route => actions.push(['go', route]), toast: value => actions.push(['toast', value]) });
      const images = allNodes(entry, node => node.type === 'img');
      if (expected) {
        const [key, nodeId] = expected;
        assert.equal(iconKeys[semantic], key);assert.equal(images.length, 1);
        assert.equal(entry.props['data-icon-key'], key);assert.equal(entry.props['data-figma-node'], nodeId);
        assert.equal(images[0].props.src, embedded[key].src);assert.equal(images[0].props.alt, '');
        assert.equal(images[0].props.width, key === 'knowledge' ? 1024 : 430);
        assert.equal(images[0].props.height, key === 'knowledge' ? 1024 : 390);
      } else {
        assert.equal(images.length, 0);assert.equal(byClass(entry, 'wb-functional-icon').length, 1);
        assert.equal(allNodes(entry, node => node.type === 'path')[0].props.d, context.pu[item[1]]);
      }
      entry.props.onClick();
      assert.equal(actions.length, 1);
      assert.equal(actions[0][0], item[2] ? 'go' : 'toast');
      if (item[2]) assert.equal(actions[0][1], item[2]);
      else assert.ok(actions[0][1].includes(item[0]), 'Unavailable original routes never invoke go');
    }
    assert.notEqual(embedded[iconKeys['客户业务/数据看板']].src, embedded[iconKeys['产品增长/数据看板']].src);
  });
  check('The four Growth shortcuts reuse the exact approved PNGs without changing their routes or shared source', () => {
    assert.equal(build.GROWTH_TOOL_APP_PATCHES.length, 1);
    assert.equal(build.GROWTH_TOOL_ICON_PATCH.before, 'function gxBrandToolIcon(index) { return gxEl(gxAnimatedToolIcon,{index}); }');
    build.exactlyOnce(original.app, build.GROWTH_TOOL_ICON_PATCH.before);
    build.exactlyOnce(current.app, build.GROWTH_TOOL_ICON_PATCH.after);
    const routes = [];
    const icons = vm.createContext({ WB_ICONS: embedded, vy: catalog, go: route => routes.push(route), l: value => value,
      gxEl: (type, props, ...children) => ({ type, props, children }) });
    vm.runInContext(build.GROWTH_TOOL_ICON_PATCH.after, icons);
    for (const [index, key] of ['content', 'materials', 'generation', 'accounts'].entries()) {
      const image = icons.gxBrandToolIcon(index), asset = embedded[key];
      assert.equal(image.type, 'img');assert.equal(image.props.src, asset.src);
      assert.equal(image.props.width, 430);assert.equal(image.props.height, 390);
      assert.equal(image.props['data-figma-node'], asset.nodeId);assert.equal(image.props.alt, '');
      assert.equal(image.props['aria-hidden'], true);
    }
    const originalShortcuts = between(original.app, 'function gxBrandToolIcon(index)', 'function ');
    const restoredGrowth = build.applyPatches(current.app, build.GROWTH_TOOL_APP_PATCHES, true);
    assert.ok(restoredGrowth.includes(originalShortcuts), 'The helper replacement reverses to the exact original shortcut source');
    const toolsDefinition = "const tools=vy[0].groups[1].items.filter(t=>t[2].startsWith('page')).slice(0,4);";
    assert.ok(current.app.includes(toolsDefinition));
    const tileStart = original.app.indexOf("gxEl('div',{className:'gx-tools'}");
    assert.ok(tileStart >= 0);
    const tileExpression = original.app.slice(tileStart, original.app.indexOf('\n', tileStart)).trim().replace(/,$/, '');
    assert.ok(current.app.includes(tileExpression), 'The original Growth button, label, and tile markup remains byte-identical');
    const shortcuts = vm.runInContext(toolsDefinition + '\n' + tileExpression, icons);
    const tiles = buttons(shortcuts);
    assert.deepEqual(tiles.map(node => nodeText(node)), ['内容资产', '素材库', '生成任务', '账号管理']);
    tiles.forEach(tile => tile.props.onClick());
    assert.deepEqual(routes, ['page:content', 'page:mat:lib', 'page:mat:gen', 'page:acct']);
    // The whole-app reverse check above proves that labels, routing callbacks,
    // tile layout, and the original Growth CSS have no unlisted edits.
  });
  check('Only the Workbench homepage is replaced; secondary pages, the shared icon table, and permission rules stay intact', () => {
    for (const preserved of [catalogSource, iconSource, permissionSource, homeSource,
      between(original.app, 'function Tj(', 'var fa='), between(original.app, 'function lU(', 'function ')]) {
      assert.ok(current.app.includes(preserved), 'Original secondary-page and shared-source bytes remain intact');
    }
    const homepage = {}, secondary = {};
    const host = vm.createContext({ fa: { jsx: (type, props) => ({ type, props }) }, FansaiWorkbench: homepage, Tj: secondary });
    vm.runInContext(between(current.app, 'function gk(', 'function P9('), host);
    for (const page of [null, 'finance', 'financeMargins', 'mat', 'kb', 'sup', 'unknown']) {
      const props = { S: { page }, updateS() {}, openPage() {}, openSheet() {}, closeSheet() {}, toast() {}, go() {}, perms: {} };
      const node = host.gk(props);
      assert.equal(node.type, page === null ? homepage : secondary);
      for (const key of page === null ? Object.keys(props) : ['S', 'updateS', 'openPage', 'openSheet', 'closeSheet', 'toast', 'perms']) {
        assert.equal(node.props[key], props[key], `Original ${key} callback/state reaches the correct renderer`);
      }
    }
  });
  check('The Workbench account wrapper preserves the original authenticated account component and callbacks', () => {
    const oldAccount = context.lM;
    const session = {}, onClose = () => {}, captured = [];
    context.lM = props => { captured.push(props);return fakeReact.createElement('original-workbench-account', props); };
    try {
      const tree = render(context.FansaiWorkbenchAccount, { initialSession: session, onClose });
      assert.equal(captured.length, 1);assert.equal(captured[0].initialSession, session);assert.equal(captured[0].onClose, onClose);
      assert.equal(byClass(tree, 'cx-sheet').length, 1);
      assert.equal(allNodes(tree, node => node.type === 'original-workbench-account').length, 1);
      assert.equal(byClass(tree, 'cx-sheet-close')[0].props.onClick, onClose);
    } finally { context.lM = oldAccount; }
  });
  check('Entrance motion is finite, starts on visible groups, and stops for reduced motion, hidden documents, and cleanup', () => {
    const oldRef = fakeReact.useRef, oldEffect = fakeReact.useEffect;
    function scenario({ reduced = false, hidden = false, observerAvailable = true, stopBy = 'cleanup' } = {}) {
      const listeners = {}, mediaListeners = {}, observed = new Set(), animations = [];
      let observerCallback, cleanup, disconnected = false;
      const media = { matches: reduced, addEventListener: (name, fn) => { mediaListeners[name] = fn; }, removeEventListener: name => { delete mediaListeners[name]; } };
      const doc = { hidden, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: name => { delete listeners[name]; } };
      const tiles = Array.from({ length: 12 }, () => ({ animate(frames, options) {
        assert.ok(Number.isFinite(options.duration) && options.duration > 0 && options.duration <= 600);
        assert.ok(Number.isFinite(options.delay) && options.delay >= 0 && options.delay <= 250);
        assert.ok(options.iterations == null || options.iterations === 1, 'Entrance cannot loop');
        assert.equal(frames.at(-1).opacity, 1);
        const animation = { cancelled: false, cancel() { this.cancelled = true; } };animations.push(animation);return animation;
      } }));
      const group = { querySelectorAll: () => [...tiles, {}] };
      doc.defaultView = { matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)');return media; } };
      if (observerAvailable) doc.defaultView.IntersectionObserver = class {
        constructor(callback) { observerCallback = callback; }
        observe(node) { observed.add(node); }
        unobserve(node) { observed.delete(node); }
        disconnect() { observed.clear();disconnected = true; }
      };
      const node = { ownerDocument: doc, querySelectorAll: () => [group] };
      fakeReact.useRef = () => ({ current: node });
      fakeReact.useEffect = effect => { cleanup = effect(); };
      context.useWBEntrance('catalog-signature');
      assert.equal(animations.length, 0);
      if (!reduced && !hidden && observerAvailable) {
        assert.equal(observed.has(group), true);
        observerCallback([{ target: group, isIntersecting: false }]);assert.equal(animations.length, 0);
        observerCallback([{ target: group, isIntersecting: true }]);
        assert.equal(animations.length, tiles.length);assert.equal(observed.has(group), false, 'A visible group is unobserved after its first entrance');
        if (stopBy === 'reduce') { media.matches = true;mediaListeners.change(); }
        if (stopBy === 'hidden') { doc.hidden = true;listeners.visibilitychange(); }
        if (stopBy !== 'cleanup') assert.ok(animations.every(animation => animation.cancelled));
      } else assert.equal(observed.size, 0, 'Static content remains available when motion is disabled or unsupported');
      cleanup();
      assert.ok(animations.every(animation => animation.cancelled));
      assert.equal(Object.keys(listeners).length, 0);assert.equal(Object.keys(mediaListeners).length, 0);
      if (observerCallback) assert.equal(disconnected, true);
    }
    try {
      scenario();scenario({ reduced: true });scenario({ hidden: true });scenario({ observerAvailable: false });
      scenario({ stopBy: 'reduce' });scenario({ stopBy: 'hidden' });
    } finally { fakeReact.useRef = oldRef;fakeReact.useEffect = oldEffect; }
    const css = fs.readFileSync(path.join(__dirname, 'workbench.css'), 'utf8');
    assert.match(css, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)[\s\S]*transition\s*:\s*none/);
    assert.match(css, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)[\s\S]*transform\s*:\s*none/);
  });
  console.log(`${checks} Workbench rendering, asset, routing, and motion checks passed.`);
};
