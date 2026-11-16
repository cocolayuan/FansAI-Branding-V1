'use strict';

// Regenerate the standalone mobile page without rebuilding its other tabs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { appPatches: NAV_APP_PATCHES, innerPatches: NAV_INNER_PATCHES } = require('./integration.cjs');
const { appPatches: TAB_LOADING_APP_PATCHES, innerPatches: TAB_LOADING_INNER_PATCHES } = require('../navigation-src/patches.cjs');
const { appPatches: PRIMARY_HEADER_APP_PATCHES, innerPatches: PRIMARY_HEADER_INNER_PATCHES } = require('../header-src/patches.cjs');
const ROOT = path.resolve(__dirname, '../..');
const WORKBENCH_ROOT = path.resolve(__dirname, '../workbench-src');
const HEADER_ROOT = path.resolve(__dirname, '../header-src');
const PROJECT_TITLE = 'FansAI Branding Data';
// Pin the original export so rebuilds remain stable after this change is merged.
const BASELINE_REF = '1ceb4418f96d99744212d6b12b82226519c43e61';
const SLOT = '(0,ie.jsx)(KM,{B:S.data,n:u.n,r:u.r,S:e})';
const NEW_SLOT = '(0,ie.jsx)(FansaiCustomersBoard,{B:S.data,n:u.n,r:u.r,S:e})';
const START = '\n/* fansai-customers-mint:start */\n';
const END = '\n/* fansai-customers-mint:end */\n';
const STYLE_START = '<style id="fansai-customers-mint">';
const JSX_FILES = ['customers.jsx', 'kpi-cards.jsx', 'customer-sheet.jsx', 'customer-filter.jsx', 'customer-details.jsx', 'project-modal.jsx', '../workbench-src/workbench.jsx', '../navigation-src/loading.jsx', '../header-src/header.jsx'];
const CSS_FILES = ['customers.css', 'kpi-cards.css', 'customer-sheet.css', 'customer-filter.css', 'customer-details.css', 'project-modal.css', '../workbench-src/workbench.css', '../navigation-src/loading.css', '../header-src/header.css'];
// Replace only the two three-card summaries; keep the original queries, period
// calculations, searches, stage chips, lists and batch-limit notes in place.
const CUSTOMER_LIBRARY_METRICS_PATCH = {
  name: 'Customer library three-card metrics only',
  before: '(0,ie.jsxs)("div",{className:"kg",style:{marginTop:6},children:[(0,ie.jsxs)("div",{className:"kpi",children:[(0,ie.jsx)("div",{className:"l",children:l("客户数")}),(0,ie.jsx)("div",{className:"v dnum",children:E?E.totalCustomers:"—"}),(0,ie.jsx)("div",{className:"s",children:E?l("在跟项目 {projects} · 高风险 {risk}",{projects:E.totalProjects,risk:E.highRiskCustomers}):"—"})]}),(0,ie.jsxs)("button",{type:"button",className:`kpi ${m==="new"?"on":""}`,onClick:()=>t({cf:m==="new"?"all":"new"}),children:[(0,ie.jsx)("div",{className:"l",children:l("新增客户")}),(0,ie.jsx)("div",{className:"v dnum",children:B??T}),(0,ie.jsx)("div",{className:"s",children:l("{period}新建档",{period:u.n})})]}),(0,ie.jsxs)("div",{className:"kpi",children:[(0,ie.jsx)("div",{className:"l",children:l("已签约客户")}),(0,ie.jsx)("div",{className:"v dnum",children:B??N}),(0,ie.jsx)("div",{className:"s",children:l("{period}签了合同",{period:u.n})})]})]})',
  after: '(0,ie.jsx)(FansaiCustomerLibraryMetrics,{summary:E,newCount:b.isLoading||b.isError?null:T,signedCount:b.isLoading||b.isError?null:N,periodLabel:u.n,newSelected:m==="new",onToggleNew:()=>t({cf:m==="new"?"all":"new"})})',
};
const CUSTOMER_PROJECT_METRICS_PATCH = {
  name: 'Customer project three-card metrics only',
  before: '(0,ie.jsxs)("div",{className:"kg",style:{marginTop:12},children:[(0,ie.jsxs)("div",{className:"kpi",children:[(0,ie.jsx)("div",{className:"l",children:l("在制项目")}),(0,ie.jsx)("div",{className:"v dnum",children:N}),(0,ie.jsx)("div",{className:"s",children:l("立项到验收")})]}),(0,ie.jsxs)("div",{className:"kpi",children:[(0,ie.jsx)("div",{className:"l",children:l("本周交付")}),(0,ie.jsx)("div",{className:"v dnum",children:E}),(0,ie.jsxs)("div",{className:"s",children:[O(B),"–",O(R)]})]}),(0,ie.jsxs)("div",{className:"kpi",children:[(0,ie.jsx)("div",{className:"l",children:l("已延期")}),(0,ie.jsx)("div",{className:`v dnum ${k?"negc":""}`,children:k}),(0,ie.jsx)("div",{className:"s",children:l("过了交付日")})]})]})',
  after: '(0,ie.jsx)(FansaiCustomerProjectMetrics,{activeCount:N,weekCount:E,lateCount:k,weekLabel:O(B)+"–"+O(R),stageCounts:[0,1,2,3].map(stage=>P.filter(project=>project.stg===stage).length)})',
};
const CUSTOMER_FILTER_PATCH = {
  name: 'Customer time/currency and project currency filter sheets only',
  before: 'T.filterKind?Q(T.filterKind):T.node',
  after: '(T.filterKind==="cust"||T.filterKind==="proj")?gxEl(FansaiCustomerFilter,{key:T.seq,kind:T.filterKind,state:f,canUSD:h,open:P,onApply:values=>{xe(values);Se()},onClose:Se}):T.filterKind?Q(T.filterKind):T.node',
};
const CUSTOMER_DETAIL_PATCH = {
  name: 'Customer record detail sheet only',
  before: '(0,ie.jsx)(JM,{id:P,S:e,today:d,canProj:y,closeSheet:n})',
  after: '(0,ie.jsx)(FansaiCustomerDetail,{id:P,S:e,today:d,canProj:y,closeSheet:n})',
};
const CUSTOMER_ACCOUNT_PATCH = {
  name: 'Customer header account sheet only; preserve the original account in other tabs',
  before: '(0,ue.jsx)(lM,{initialSession:Ye,onClose:Se})',
  after: 'C.tab==="cust"?(0,ue.jsx)(FansaiCustomerAccount,{initialSession:Ye,onClose:Se}):(0,ue.jsx)(lM,{initialSession:Ye,onClose:Se})',
};
const CUSTOMER_MODAL_PATCH = {
  name: 'Customer project detail modal only',
  before: '(0,ie.jsx)(eE,{p:P,S:e,closeSheet:n,goApprovals:()=>{n(),t({sc:"pending",ph:"all",tab:"appr",page:null,nav:[]}),window.scrollTo(0,0)}})',
  after: '(0,ie.jsx)(FansaiCustomerProjectModal,{p:P,source:h.data?.rows?.find(row=>String(row.id)===P.id),S:e,closeSheet:n,goApprovals:()=>{n(),t({sc:"pending",ph:"all",tab:"appr",page:null,nav:[]}),window.scrollTo(0,0)}})',
};
const CUSTOMER_APP_PATCHES = [
  {
    name: 'Customer heading only',
    before: 'cust:["客户业务 · Customers","客户经营"]',
    after: 'cust:["","Customer"]',
  },
  {
    name: 'Initial customer library stage',
    before: 'cseg:"board",per:"m",cf:"all",q:""',
    after: 'cseg:"board",per:"m",cf:"project_status_1",q:""',
  },
  CUSTOMER_MODAL_PATCH,
  CUSTOMER_DETAIL_PATCH,
  CUSTOMER_FILTER_PATCH,
  CUSTOMER_ACCOUNT_PATCH,
  CUSTOMER_LIBRARY_METRICS_PATCH,
  CUSTOMER_PROJECT_METRICS_PATCH,
];
// Apply after the Customer account patch. The complete expression is the anchor
// so no other lM call can accidentally receive the Workbench-only wrapper.
const WORKBENCH_ACCOUNT_PATCH = {
  name: 'Workbench home account sheet only; preserve Customer and secondary-page routing',
  before: CUSTOMER_ACCOUNT_PATCH.after,
  after: 'C.tab==="cust"?(0,ue.jsx)(FansaiCustomerAccount,{initialSession:Ye,onClose:Se}):C.tab==="more"&&!C.page?(0,ue.jsx)(FansaiWorkbenchAccount,{initialSession:Ye,onClose:Se}):(0,ue.jsx)(lM,{initialSession:Ye,onClose:Se})',
};
const WORKBENCH_APP_PATCHES = [
  {
    name: 'Workbench home component only; preserve the Tj secondary-page branch',
    before: '(0,fa.jsx)(P9,{...e})',
    after: '(0,fa.jsx)(FansaiWorkbench,{...e})',
  },
  {
    name: 'Workbench home heading',
    before: 'more:["FansAI · Workbench","工作台"]',
    after: 'more:["","Workbench"]',
  },
  WORKBENCH_ACCOUNT_PATCH,
];
// This helper is used only by the four existing Growth quick-entry images.
// Keep their button markup, translations, routes, layout and functional icons.
const GROWTH_TOOL_ICON_PATCH = {
  name: 'Growth four quick-entry images only; original Figma PNGs',
  before: 'function gxBrandToolIcon(index) { return gxEl(gxAnimatedToolIcon,{index}); }',
  after: `function gxBrandToolIcon(index) {
  const asset=WB_ICONS[['content','materials','generation','accounts'][index]];
  return gxEl('img',{src:asset.src,width:asset.width,height:asset.height,className:'gx-tool-art',style:{objectFit:'contain',background:'#000',borderRadius:'16px'},alt:'','aria-hidden':true,draggable:false,decoding:'async','data-figma-node':asset.nodeId});
}`,
};
const GROWTH_TOOL_APP_PATCHES = [GROWTH_TOOL_ICON_PATCH];
// Project display metadata only. Keep tab titles, routes and business copy.
const PROJECT_METADATA_APP_PATCHES = [
  {
    name: 'Chinese-locale project metadata title',
    before: 'metadata:{title:"FansAI 数据中台",description:"FansAI 投资人驾驶舱与增长运营数据中台"}',
    after: `metadata:{title:"${PROJECT_TITLE}",description:"FansAI 投资人驾驶舱与增长运营数据中台"}`,
  },
  {
    name: 'English-locale project metadata title',
    before: 'metadata:{title:"FansAI Data Platform",description:"FansAI investor cockpit and growth operations data platform"}',
    after: `metadata:{title:"${PROJECT_TITLE}",description:"FansAI investor cockpit and growth operations data platform"}`,
  },
  {
    name: 'Chinese-locale default project page title',
    before: 'blog:"博客管理",default:"FansAI 数据中台",materialGenerations:"生成任务"',
    after: `blog:"博客管理",default:"${PROJECT_TITLE}",materialGenerations:"生成任务"`,
  },
  {
    name: 'English-locale default project page title',
    before: 'blog:"Blog Management",default:"FansAI Data Platform",materialGenerations:"Generation Tasks"',
    after: `blog:"Blog Management",default:"${PROJECT_TITLE}",materialGenerations:"Generation Tasks"`,
  },
];
const PROJECT_METADATA_INNER_PATCHES = [{
  name: 'Embedded mobile document title',
  before: '<meta charset="utf-8">',
  after: `<meta charset="utf-8">\n<title>${PROJECT_TITLE}</title>`,
}];
const PROJECT_METADATA_OUTER_PATCHES = [
  {
    name: 'Standalone mobile browser title',
    before: '<title>FansAI · Growth 青蓝优化版</title>',
    after: `<title>${PROJECT_TITLE}</title>`,
  },
  {
    name: 'Mobile preview frame accessible title',
    before: '<iframe id="app" title="FansAI 数据中台" allow="clipboard-write"></iframe>',
    after: `<iframe id="app" title="${PROJECT_TITLE}" allow="clipboard-write"></iframe>`,
  },
];
function applyPatches(text, patches, reverse = false) {
  for (const patch of reverse ? [...patches].reverse() : patches) {
    const from = reverse ? patch.after : patch.before;
    const to = reverse ? patch.before : patch.after;
    exactlyOnce(text, from);
    text = text.replace(from, to);
  }
  return text;
}

function exactlyOnce(text, needle) {
  assert.equal(text.split(needle).length - 1, 1, `Expected one occurrence: ${needle.slice(0, 90)}`);
}
function plainScript(text, id) {
  const re = new RegExp(`<script\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>([\\s\\S]*?)<\\/script>`);
  const match = re.exec(text);
  assert.ok(match, `Embedded script ${id} exists`);
  return match[1];
}
function replaceScript(text, id, value) {
  const before = plainScript(text, id);
  const re = new RegExp(`(<script\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>)([\\s\\S]*?)(<\\/script>)`);
  return text.replace(re, (_, open, contents, close) => {
    assert.equal(contents, before);
    return open + value + close;
  });
}
function decode(text) {
  const inner = Buffer.from(plainScript(text, 'inner'), 'base64').toString('utf8');
  const app = Buffer.from(plainScript(inner, 'appsrc'), 'base64').toString('utf8');
  return { outer: text, inner, app };
}
function baseline() {
  return execFileSync('git', ['show', `${BASELINE_REF}:mobile/index.html`], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024,
  });
}
function esbuild() {
  const candidates = [process.env.FANSAI_ESBUILD_PATH, 'esbuild', path.resolve(ROOT, '../iridescent-earth-react/node_modules/esbuild')].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('esbuild is required. Set FANSAI_ESBUILD_PATH to an installed esbuild module directory.');
}
function avatarData() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'avatars.json'), 'utf8'));
  return Object.fromEntries(Object.entries(manifest).map(([name, entry]) => {
    const filename = path.resolve(__dirname, entry.filename);
    assert.ok(filename.startsWith(__dirname + path.sep), 'Avatar assets must be local to customers-src');
    assert.match(filename, /\.jpg$/i, 'Avatar assets are JPEGs');
    const bytes = fs.readFileSync(filename);
    assert.ok(bytes[0] === 0xff && bytes[1] === 0xd8, 'Avatar asset contains JPEG bytes');
    return [name, 'data:image/jpeg;base64,' + bytes.toString('base64')];
  }));
}
function workbenchIcons() {
  const manifest = JSON.parse(fs.readFileSync(path.join(WORKBENCH_ROOT, 'icons.json'), 'utf8'));
  assert.equal(manifest.parentNodeId, '198:55949', 'Workbench icons retain their supplied Figma source');
  assert.equal(manifest.icons.length, 17, 'Workbench uses the 16 supplied business-entry icons and the Knowledge asset');
  const keys = new Set();
  return Object.fromEntries(manifest.icons.map(entry => {
    assert.ok(entry.key && !keys.has(entry.key), 'Workbench icon keys must be unique');
    keys.add(entry.key);
    const filename = path.resolve(WORKBENCH_ROOT, entry.filename);
    assert.ok(filename.startsWith(WORKBENCH_ROOT + path.sep), 'Workbench assets must be local to workbench-src');
    assert.match(filename, /\.png$/i, 'Workbench source assets are PNGs');
    const bytes = fs.readFileSync(filename);
    assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Workbench asset contains PNG bytes');
    assert.equal(bytes.length, entry.bytes, 'Workbench source byte length matches its manifest');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, 'Workbench source pixels remain unmodified');
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', 'Workbench PNG starts with an image header');
    assert.equal(bytes.readUInt32BE(16), entry.width, 'Workbench width matches its PNG header');
    assert.equal(bytes.readUInt32BE(20), entry.height, 'Workbench height matches its PNG header');
    return [entry.key, {
      src: 'data:image/png;base64,' + bytes.toString('base64'),
      width: entry.width, height: entry.height, nodeId: entry.nodeId,
    }];
  }));
}
function headerLogo() {
  const manifest = JSON.parse(fs.readFileSync(path.join(HEADER_ROOT, 'logo.json'), 'utf8'));
  assert.equal(manifest.nodeId, '115:33467', 'Primary headers use the verified original Figma cloud asset');
  assert.equal(manifest.width, 38);
  assert.equal(manifest.height, 38);
  assert.equal(manifest.viewBox, '0 0 38 38');
  const filename = path.resolve(HEADER_ROOT, manifest.filename);
  assert.ok(filename.startsWith(HEADER_ROOT + path.sep), 'Header asset must remain local to header-src');
  assert.match(filename, /\.svg$/i);
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.length, manifest.bytes, 'Header SVG byte length matches its manifest');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256, 'Header SVG bytes remain unmodified');
  const source = bytes.toString('utf8');
  assert.match(source, /<svg\b[^>]*\bwidth="38"[^>]*\bheight="38"[^>]*\bviewBox="0 0 38 38"/);
  return {src:'data:image/svg+xml;base64,' + bytes.toString('base64'),width:38,height:38,viewBox:manifest.viewBox,nodeId:manifest.nodeId};
}
function styles() {
  return CSS_FILES.map(filename => fs.readFileSync(path.join(__dirname, filename), 'utf8')).join('\n');
}
function projectManifest(output, source = JSON.parse(fs.readFileSync(path.join(ROOT, 'mobile/manifest.json'), 'utf8'))) {
  return {...source, name:PROJECT_TITLE, sha256:createHash('sha256').update(output).digest('hex')};
}
function compile() {
  const jsx = 'var CX_AVATARS = ' + JSON.stringify(avatarData()) + ';\n' +
    'var WB_ICONS = ' + JSON.stringify(workbenchIcons()) + ';\n' +
    'var FH_LOGO = ' + JSON.stringify(headerLogo()) + ';\n' +
    JSX_FILES.map(filename => fs.readFileSync(path.join(__dirname, filename), 'utf8')).join('\n');
  return esbuild().transformSync(jsx, {
    loader: 'jsx', target: 'es2020', jsxFactory: 'CXReact.createElement', jsxFragment: 'CXReact.Fragment',
    charset: 'utf8', legalComments: 'inline', minify: false,
  }).code;
}
function generate() {
  const source = decode(baseline());
  const code = compile();
  const css = styles();
  assert.ok(!css.includes('</style'), 'CSS cannot close its embedding style element');
  exactlyOnce(source.app, 'function KM(');
  exactlyOnce(source.app, SLOT);
  let app = source.app.replace('function KM(', START + code + END + 'function KM(').replace(SLOT, NEW_SLOT);
  app = applyPatches(app, CUSTOMER_APP_PATCHES);
  app = applyPatches(app, NAV_APP_PATCHES);
  app = applyPatches(app, WORKBENCH_APP_PATCHES);
  app = applyPatches(app, GROWTH_TOOL_APP_PATCHES);
  app = applyPatches(app, TAB_LOADING_APP_PATCHES);
  app = applyPatches(app, PRIMARY_HEADER_APP_PATCHES);
  app = applyPatches(app, PROJECT_METADATA_APP_PATCHES);
  let inner = applyPatches(replaceScript(source.inner, 'appsrc', Buffer.from(app).toString('base64')), NAV_INNER_PATCHES);
  inner = applyPatches(inner, TAB_LOADING_INNER_PATCHES);
  inner = applyPatches(inner, PRIMARY_HEADER_INNER_PATCHES);
  inner = applyPatches(inner, PROJECT_METADATA_INNER_PATCHES);
  exactlyOnce(inner, '</head>');
  inner = inner.replace('</head>', STYLE_START + css + '</style>\n</head>');
  const output = applyPatches(replaceScript(source.outer, 'inner', Buffer.from(inner).toString('base64')), PROJECT_METADATA_OUTER_PATCHES);
  return { output, code, css };
}
if (require.main === module) {
  const { output } = generate();
  fs.writeFileSync(path.join(ROOT, 'mobile/index.html'), output);
  fs.writeFileSync(path.join(ROOT, 'mobile/manifest.json'), JSON.stringify(projectManifest(output), null, 2) + '\n');
  console.log('Built mobile/index.html: Customers redesign, Workbench home, original Figma Growth quick-entry images, and shared tab loading skeletons.');
}
module.exports = { ROOT, WORKBENCH_ROOT, HEADER_ROOT, PROJECT_TITLE, BASELINE_REF, JSX_FILES, CSS_FILES, CUSTOMER_LIBRARY_METRICS_PATCH, CUSTOMER_PROJECT_METRICS_PATCH, CUSTOMER_FILTER_PATCH, CUSTOMER_DETAIL_PATCH, CUSTOMER_ACCOUNT_PATCH, CUSTOMER_MODAL_PATCH, CUSTOMER_APP_PATCHES, WORKBENCH_ACCOUNT_PATCH, WORKBENCH_APP_PATCHES, GROWTH_TOOL_ICON_PATCH, GROWTH_TOOL_APP_PATCHES, NAV_APP_PATCHES, NAV_INNER_PATCHES, TAB_LOADING_APP_PATCHES, TAB_LOADING_INNER_PATCHES, PRIMARY_HEADER_APP_PATCHES, PRIMARY_HEADER_INNER_PATCHES, PROJECT_METADATA_APP_PATCHES, PROJECT_METADATA_INNER_PATCHES, PROJECT_METADATA_OUTER_PATCHES, applyPatches, SLOT, NEW_SLOT, START, END, STYLE_START, exactlyOnce, plainScript, replaceScript,decode, baseline, avatarData, workbenchIcons, headerLogo, projectManifest, styles, compile, generate };
