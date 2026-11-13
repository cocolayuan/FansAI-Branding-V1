'use strict';

// Regenerate the standalone mobile page without rebuilding its other tabs.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
// Pin the original export so rebuilds remain stable after this change is merged.
const BASELINE_REF = '1ceb4418f96d99744212d6b12b82226519c43e61';
const SLOT = '(0,ie.jsx)(KM,{B:S.data,n:u.n,r:u.r,S:e})';
const NEW_SLOT = '(0,ie.jsx)(FansaiCustomersBoard,{B:S.data,n:u.n,r:u.r,S:e})';
const START = '\n/* fansai-customers-mint:start */\n';
const END = '\n/* fansai-customers-mint:end */\n';
const STYLE_START = '<style id="fansai-customers-mint">';

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
function compile() {
  const jsx = fs.readFileSync(path.join(__dirname, 'customers.jsx'), 'utf8');
  return esbuild().transformSync(jsx, {
    loader: 'jsx', target: 'es2020', jsxFactory: 'CXReact.createElement', jsxFragment: 'CXReact.Fragment',
    charset: 'utf8', legalComments: 'inline', minify: false,
  }).code;
}
function generate() {
  const source = decode(baseline());
  const code = compile();
  const css = fs.readFileSync(path.join(__dirname, 'customers.css'), 'utf8');
  assert.ok(!css.includes('</style'), 'CSS cannot close its embedding style element');
  exactlyOnce(source.app, 'function KM(');
  exactlyOnce(source.app, SLOT);
  const app = source.app.replace('function KM(', START + code + END + 'function KM(').replace(SLOT, NEW_SLOT);
  let inner = replaceScript(source.inner, 'appsrc', Buffer.from(app).toString('base64'));
  exactlyOnce(inner, '</head>');
  inner = inner.replace('</head>', STYLE_START + css + '</style>\n</head>');
  const output = replaceScript(source.outer, 'inner', Buffer.from(inner).toString('base64'));
  return { output, code, css };
}
if (require.main === module) {
  const { output } = generate();
  fs.writeFileSync(path.join(ROOT, 'mobile/index.html'), output);
  console.log('Built mobile/index.html: Customers component and scoped styles only.');
}
module.exports = { ROOT, BASELINE_REF, SLOT, NEW_SLOT, START, END, STYLE_START, exactlyOnce, plainScript, replaceScript, decode, baseline, compile, generate };
