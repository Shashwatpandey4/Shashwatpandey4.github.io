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
// A fourth check guards reproducibility: roughjs picks a fresh random seed per
// shape unless the DRAWABLE carries one, which silently made every build emit
// different path data and turned a no-op rebuild into a 245-line diff.
const fs = require('fs');
const path = require('path');

// usage: node build.cjs <part>   (default: all known parts)
const PARTS = {
  part1: { figs: './part1_figs.cjs', tpl: 'part1_template.md', out: 'cuda_gemm.md' },
  part2: { figs: './part2_figs.cjs', tpl: 'part2_template.md', out: 'decode_roofline.md' },
  part3: { figs: './part3_figs.cjs', tpl: 'part3_template.md', out: 'w8a16_vllm.md' },
  part4: { figs: './part4_figs.cjs', tpl: 'part4_template.md', out: 'triton_mlir_llvm.md' },
  flash: { figs: './flash_figs.cjs', tpl: 'flash_template.md', out: 'flashattention_triton.md' },
  attest: { figs: './attest_figs.cjs', tpl: 'attest_template.md', out: 'attest_harness.md' },
  diagnose: { figs: './diagnose_figs.cjs', tpl: 'diagnose_template.md', out: 'diagnosis_ladder.md' },
};
const which = process.argv[2];
const todo = which ? [which] : Object.keys(PARTS).filter(k =>
  fs.existsSync(path.join(__dirname, PARTS[k].tpl)));
if (which && !PARTS[which]) { console.error('unknown part:', which); process.exit(1); }

let anyFail = false;
for (const part of todo) { buildPart(part); }
process.exit(anyFail ? 1 : 0);

function buildPart(part) {
const spec = PARTS[part];
const FIGS = require(spec.figs);
const TEMPLATE = path.join(__dirname, spec.tpl);
const OUT = path.join(__dirname, '..', 'posts', spec.out);
console.log(`\n== ${part} -> posts/${spec.out}`);

let md = fs.readFileSync(TEMPLATE, 'utf8');

const wanted = [...md.matchAll(/\{\{svg:(\w+)\}\}/g)].map(m => m[1]);
const missing = wanted.filter(k => !FIGS[k]);
if (missing.length) {
  console.error('  no generator for:', missing.join(', ')); anyFail = true; return;
}
// ---- check 0: same figure twice must be byte-identical ----
const flaky = wanted.filter(k => FIGS[k]() !== FIGS[k]());
if (flaky.length) {
  console.error('  FAIL: non-deterministic figures:', flaky.join(', '));
  console.error('  (roughjs needs `seed` on each drawable, not just the generator)');
  anyFail = true; return;
}

const unused = Object.keys(FIGS).filter(k => !wanted.includes(k));
if (unused.length) console.log('  note: generated but unused:', unused.join(', '));

for (const key of wanted) {
  md = md.replace(`{{svg:${key}}}`, () => FIGS[key]());
}
if (/\{\{svg:/.test(md)) { console.error('  unreplaced markers remain'); anyFail = true; return; }

// ---- check 0.5: text that runs off the edge of its own viewBox ----
// Long monospace captions overflowing the right edge was the single most common
// defect while drafting, and it is invisible in a downscaled screenshot. Advance
// widths are approximated per family; the tolerance is loose enough that only
// real overflows trip it.
const overflow = [];
for (const key of wanted) {
  const svg = FIGS[key]();
  const vb = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!vb) continue;
  const X0 = parseFloat(vb[1]), W = parseFloat(vb[3]);
  const re = /<text x="(-?[\d.]+)" y="(-?[\d.]+)"([^>]*)>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const x = parseFloat(m[1]), attrs = m[3];
    const body = m[4].replace(/&[a-z]+;/g, 'x');
    if (!body) continue;
    const sz = parseFloat((attrs.match(/font-size="([\d.]+)"/) || [0, 14])[1]);
    const mono = /monospace/.test(attrs);
    const w = body.length * sz * (mono ? 0.60 : 0.50);
    const anchor = (attrs.match(/text-anchor="(\w+)"/) || [0, 'start'])[1];
    const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    const right = left + w;
    if (right > X0 + W + 1 || left < X0 - 1) {
      overflow.push(`${key}: "${body.slice(0, 40)}..." spans ${left.toFixed(0)}..${right.toFixed(0)}, box ${X0}..${X0 + W}`);
    }
  }
}
if (overflow.length) {
  console.error(`  FAIL: ${overflow.length} text runs outside its viewBox`);
  for (const o of overflow.slice(0, 14)) console.error('    ' + o);
  anyFail = true; return;
}

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
  anyFail = true; return;
}

// ---- check 3: through the real renderer ----
let marked;
try { ({ marked } = require('marked')); } catch (e) {
  console.error('  marked not installed; run: npm install'); anyFail = true; return;
}
const body = md.split('---').slice(1).join('---').trim();
const html = marked.parse(body);
const liveSvg = (html.match(/<svg[\s>]/g) || []).length;
const escaped = (html.match(/&lt;(path|text|rect|line|g|svg)\b/g) || []).length;
if (escaped) {
  console.error(`  FAIL: ${escaped} escaped SVG child tags after marked`); anyFail = true; return;
}
if (liveSvg !== figures.length) {
  console.error(`  FAIL: ${liveSvg} live <svg> for ${figures.length} <figure> blocks`); anyFail = true; return;
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
}
