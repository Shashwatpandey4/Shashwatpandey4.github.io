// Splice generated figures into a prose template and validate the result.
//
// Validation is not optional and not cosmetic. Part 1 shipped once with all ten
// figures broken, because they were checked as standalone XML and over HTTP but
// never through the markdown renderer the site actually loads. The three checks
// below are exactly the failures that happened:
//   1. a blank line inside <figure> ends the HTML block (CommonMark), so the
//      rest of the figure is parsed as markdown
//   2. four-space indentation then turns that remainder into a code block, so it
//      renders as visible escaped markup
//   3. therefore: run it through marked and assert zero escaped SVG child tags
const fs = require('fs');
const path = require('path');

const FIGS = require('./part1_figs.cjs');
const TEMPLATE = path.join(__dirname, 'part1_template.md');
const OUT = path.join(__dirname, '..', 'posts', 'cuda_gemm.md');

let md = fs.readFileSync(TEMPLATE, 'utf8');

const wanted = [...md.matchAll(/\{\{svg:(\w+)\}\}/g)].map(m => m[1]);
const missing = wanted.filter(k => !FIGS[k]);
if (missing.length) {
  console.error('  no generator for:', missing.join(', '));
  process.exit(1);
}
const unused = Object.keys(FIGS).filter(k => !wanted.includes(k));
if (unused.length) console.log('  note: generated but unused:', unused.join(', '));

for (const key of wanted) {
  md = md.replace(`{{svg:${key}}}`, () => FIGS[key]());
}
if (/\{\{svg:/.test(md)) { console.error('  unreplaced markers remain'); process.exit(1); }

// ---- check 1 & 2: the markdown pipeline's two traps ----
const figures = md.match(/<figure>[\s\S]*?<\/figure>/g) || [];
let blanks = 0, deep = 0;
for (const f of figures) {
  for (const line of f.split('\n')) {
    if (line.trim() === '') blanks++;
    if (line.length - line.trimStart().length >= 4) deep++;
  }
}
if (blanks || deep) {
  console.error(`  FAIL: ${blanks} blank lines and ${deep} deeply-indented lines inside figures`);
  process.exit(1);
}

// ---- check 3: through the real renderer ----
let marked;
try { ({ marked } = require('marked')); } catch (e) {
  console.error('  marked not installed here; run: npm install marked --no-save');
  process.exit(1);
}
const body = md.split('---').slice(1).join('---').trim();
const html = marked.parse(body);
const liveSvg = (html.match(/<svg[\s>]/g) || []).length;
const escaped = (html.match(/&lt;(path|text|rect|line|g|svg)\b/g) || []).length;
if (escaped) {
  console.error(`  FAIL: ${escaped} escaped SVG child tags after marked`);
  process.exit(1);
}
if (liveSvg !== figures.length) {
  console.error(`  FAIL: ${liveSvg} live <svg> for ${figures.length} <figure> blocks`);
  process.exit(1);
}

// ---- report ----
fs.writeFileSync(OUT, md);
const words = md.replace(/<svg[\s\S]*?<\/svg>/g, '').split(/\s+/).filter(Boolean).length;
const kb = (Buffer.byteLength(md) / 1024).toFixed(0);
const handDrawn = wanted.filter(k => FIGS[k]().includes('<path')).length;
console.log(`  wrote ${path.relative(process.cwd(), OUT)}`);
console.log(`  ${figures.length} figures (${handDrawn} hand-drawn, ${figures.length - handDrawn} crisp)`);
console.log(`  ${(md.match(/^## /gm) || []).length} sections, ${words} words of prose, ${kb} KB total`);
console.log(`  marked: ${liveSvg} live svg, ${escaped} escaped children  [PASS]`);
console.log(`  figures: ${blanks} blank lines, ${deep} deep indents  [PASS]`);
