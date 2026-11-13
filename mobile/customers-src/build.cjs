'use strict';

// Regenerate the standalone mobile page without rebuilding its other tabs.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { appPatches: NAV_APP_PATCHES, innerPatches: NAV_INNER_PATCHES } = require('./integration.cjs');
const ROOT = path.resolve(__dirname, '../..');
// Pin the original export so rebuilds remain stable after this change is merged.
const BASELINE_REF = '1ceb4418f96d99744212d6b12b82226519c43e61';
const SLOT = '(0,ie.jsx)(KM,{B:S.data,n:u.n,r:u.r,S:e})';
const NEW_SLOT = '(0,ie.jsx)(FansaiCustomersBoard,{B:S.data,n:u.n,r:u.r,S:e})';
const START = '\n/* fansai-customers-mint:start */\n';
const END = '\n/* fansai-customers-mint:end */\n';
const STYLE_START = '<style id="fansai-customers-mint">';
const JSX_FILES = ['customers.jsx', 'project-modal.jsx'];
const CSS_FILES = ['customers.css', 'project-modal.css'];
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
function styles() {
  return CSS_FILES.map(filename => fs.readFileSync(path.join(__dirname, filename), 'utf8')).join('\n');
}
function compile() {
  const jsx = 'var CX_AVATARS = ' + JSON.stringify(avatarData()) + ';\n' +
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
  const app = applyPatches(applyPatches(source.app.replace('function KM(', START + code + END + 'function KM(').replace(SLOT, NEW_SLOT), CUSTOMER_APP_PATCHES), NAV_APP_PATCHES);
  let inner = applyPatches(replaceScript(source.inner, 'appsrc', Buffer.from(app).toString('base64')), NAV_INNER_PATCHES);
  exactlyOnce(inner, '</head>');
  inner = inner.replace('</head>', STYLE_START + css + '</style>\n</head>');
  const output = replaceScript(source.outer, 'inner', Buffer.from(inner).toString('base64'));
  return { output, code, css };
}
if (require.main === module) {
  const { output } = generate();
  fs.writeFileSync(path.join(ROOT, 'mobile/index.html'), output);
  console.log('Built mobile/index.html: Customers board, project modal, embedded portraits, heading, initial stage, scoped styles, and navigation repairs.');
}
module.exports = { ROOT, BASELINE_REF, JSX_FILES, CSS_FILES, CUSTOMER_MODAL_PATCH, CUSTOMER_APP_PATCHES, NAV_APP_PATCHES, NAV_INNER_PATCHES, applyPatches, SLOT, NEW_SLOT, START, END, STYLE_START, exactlyOnce, plainScript, replaceScript, decode, baseline, avatarData, styles, compile, generate };
