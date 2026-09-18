// Every figure for Part 2, keyed. Same two-style policy as Part 1: conceptual
// figures are hand-drawn (roughjs, Excalidraw's engine), quantitative ones are
// crisp, because a reader comparing bar lengths should not have to see through
// sketch wobble.
//
// Part 2 is mostly about measurement going wrong, so several figures are
// deliberately "the same quantity, measured two ways" -- a paired-bar form, with
// the honest number in ORANGE and the flattering one in GRAY. That pairing is
// the argument; keep it consistent across lie_l2 / lie_insitu / micro_vs_e2e.
const { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT } = require('./rough.cjs');

const F = {};
const PALE_B = '#c7dbf6';
const PALE_O = '#f2cdbc';
const DIM = '#cbd1d6';

// ==================================================== 1. two questions (hand)
F.two_questions = () => {
  const f = fig(740, 320, 11);
  f.caption(0, 14, 'the same GEMM, asked two different questions');
  // ---- left: prefill
  f.text(8, 42, 'PREFILL', { size: 15, fill: INK });
  f.text(8, 60, '2048 rows at once', { size: 13, fill: MUTED });
  f.grid(8, 72, 4, 9, 15, { outline: true });
  f.cells(8, 72, 15, [[0, 0], [1, 0], [2, 0], [3, 0]], { fill: PALE_B });
  f.dim(2, 72, 2, 207, 'M=2048', { mono: true, size: 11 });
  f.text(76, 106, 'x', { size: 16, fill: MUTED });
  f.solid(96, 72, 46, 135, { fill: PALE_B, stroke: BLUE, sw: 1.2 });
  f.text(100, 146, 'W', { size: 15, fill: INK });
  f.text(8, 232, 'each weight is read once', { size: 13, fill: INK });
  f.text(8, 250, 'and used 2048 times', { size: 13, fill: BLUE });
  f.rect(8, 262, 190, 30, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(18, 282, 'bound by ARITHMETIC', { size: 13.5, fill: '#ffffff' });
  // ---- divider
  f.line(276, 34, 276, 296, { stroke: FAINT, sw: 1.2, roughness: 0.4 });
  // ---- right: decode
  f.text(312, 42, 'DECODE', { size: 15, fill: INK });
  f.text(312, 60, 'one row at a time', { size: 13, fill: MUTED });
  f.grid(312, 72, 4, 1, 15, { outline: true });
  f.cells(312, 72, 15, [[0, 0], [1, 0], [2, 0], [3, 0]], { fill: PALE_O });
  f.dim(306, 72, 306, 87, 'M=1', { mono: true, size: 11 });
  f.text(380, 106, 'x', { size: 16, fill: MUTED });
  f.solid(400, 72, 46, 135, { fill: PALE_O, stroke: ORANGE, sw: 1.2 });
  f.text(404, 146, 'W', { size: 15, fill: INK });
  f.text(462, 96, 'same 942 MB of weights,', { size: 13, fill: INK });
  f.text(462, 114, 'whether M is 1 or 2048', { size: 13, fill: ORANGE });
  f.text(312, 232, 'each weight is read once', { size: 13, fill: INK });
  f.text(312, 250, 'and used ONCE', { size: 13, fill: ORANGE });
  f.rect(312, 262, 190, 30, { fill: ORANGE, fillStyle: 'solid', sw: 1.3 });
  f.text(322, 282, 'bound by BANDWIDTH', { size: 13.5, fill: '#ffffff' });
  f.text(524, 282, 'nothing to reuse', { size: 13, fill: MUTED });
  f.caption(0, 314, 'Part 1 raised reuse on the left-hand problem. Decode is the right-hand one, where reuse does not exist.');
  return f.toSVG('Prefill is arithmetic-bound, decode is bandwidth-bound');
};

// ================================================= 2. arithmetic intensity (hand)
F.arith_intensity = () => {
  const f = fig(740, 340, 29);
  f.caption(0, 14, 'flops per byte, for three shapes of the same operation');
  const rows = [
    ['one dot product', '1xK  .  Kx1', '2K flops', '8K bytes', '0.25', ORANGE, 0],
    ['matrix-vector', '1xK  .  KxN', '2KN flops', '4K(N+1) bytes', '~0.5', ORANGE, 1],
    ['matrix-matrix', 'MxK  .  KxN', '2MKN flops', '4(MK+KN+MN)', '~170', BLUE, 2],
  ];
  rows.forEach(([name, shape, fl, by, ai, col, i]) => {
    const y = 42 + i * 74;
    f.text(0, y + 20, name, { size: 14.5, fill: INK });
    f.text(0, y + 38, shape, { size: 12, fill: MUTED, mono: true });
    f.rect(160, y, 108, 26, { fill: PALE_B, fillStyle: 'solid', sw: 1.2 });
    f.text(168, y + 18, fl, { size: 12, fill: INK, mono: true });
    f.rect(160, y + 30, 148, 26, { fill: PALE_O, fillStyle: 'solid', sw: 1.2 });
    f.text(168, y + 48, by, { size: 12, fill: INK, mono: true });
    f.text(326, y + 34, '=', { size: 16, fill: MUTED });
    f.rect(352, y + 12, 96, 32, { fill: col, fillStyle: 'solid', sw: 1.3 });
    f.text(400, y + 34, ai, { size: 15, fill: '#ffffff', anchor: 'middle', mono: true });
    f.text(456, y + 34, 'flops/byte', { size: 12.5, fill: MUTED });
  });
  f.text(560, 66, 'the K cancels:', { size: 13, fill: INK });
  f.text(560, 84, 'a longer dot product', { size: 13, fill: MUTED });
  f.text(560, 102, 'does not help you', { size: 13, fill: MUTED });
  f.text(560, 216, 'reuse across N', { size: 13, fill: INK });
  f.text(560, 234, 'and M is where', { size: 13, fill: MUTED });
  f.text(560, 252, 'the flops/byte', { size: 13, fill: MUTED });
  f.text(560, 270, 'come from', { size: 13, fill: BLUE });
  f.text(560, 190, '(at M=N=K=1024)', { size: 11.5, fill: MUTED, mono: true });
  // the ridge scale
  f.line(0, 292, 520, 292, { stroke: MUTED, sw: 1.1, roughness: 0.4 });
  f.text(0, 310, '0.25', { size: 11.5, fill: ORANGE, mono: true });
  f.line(10, 286, 10, 298, { stroke: ORANGE, sw: 1.6, roughness: 0.3 });
  f.line(420, 286, 420, 298, { stroke: INK, sw: 1.8, roughness: 0.3 });
  f.text(420, 310, 'RIDGE = 125', { size: 11.5, fill: INK, anchor: 'middle', mono: true });
  f.text(530, 296, 'what this GPU wants', { size: 12, fill: MUTED });
  f.caption(0, 334, 'A single dot product is 500x below what the machine wants. No kernel can fix that; only a different shape can.');
  return f.toSVG('Arithmetic intensity of a dot product, matrix-vector and matrix-matrix product');
};

// ============================================================ 3. roofline (crisp)
F.roofline = () => {
  const X = i => (70 + (Math.log10(i) + 1) * 157.5).toFixed(1);
  const Y = p => (300 - (Math.log10(p) + 2) * 60).toFixed(1);
  const RIDGE = 28.41 / 0.227;
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">ROOFLINE  ·  RTX 4060 LAPTOP  ·  28.41 TFLOP/S BF16, 227 GB/S MEASURED</text>`);
  // grid + axes
  for (const p of [0.01, 0.1, 1, 10, 100]) {
    L.push(`<line x1="70" y1="${Y(p)}" x2="700" y2="${Y(p)}" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="62" y="${(+Y(p) + 4).toFixed(1)}" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">${p}</text>`);
  }
  for (const i of [0.1, 1, 10, 100, 1000]) {
    L.push(`<line x1="${X(i)}" y1="60" x2="${X(i)}" y2="300" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="${X(i)}" y="316" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="middle">${i}</text>`);
  }
  L.push(`<text x="10" y="50" font-family="monospace" font-size="10.5" fill="${MUTED}">TFLOP/s</text>`);
  L.push(`<text x="700" y="334" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">arithmetic intensity (flops/byte)</text>`);
  // the two roofs
  L.push(`<polyline points="${X(0.1)},${Y(0.0227)} ${X(RIDGE)},${Y(28.41)}" fill="none" stroke="${ORANGE}" stroke-width="2.4"/>`);
  L.push(`<polyline points="${X(RIDGE)},${Y(28.41)} 700,${Y(28.41)}" fill="none" stroke="${BLUE}" stroke-width="2.4"/>`);
  L.push(`<text x="150" y="232" font-family="monospace" font-size="11" fill="${ORANGE}" transform="rotate(-20 150 232)">memory roof = 227 GB/s x intensity</text>`);
  L.push(`<text x="700" y="${(+Y(28.41) - 12).toFixed(1)}" font-family="monospace" font-size="11" fill="${BLUE}" text-anchor="end">compute roof = 28.41 TFLOP/s</text>`);
  // ridge
  L.push(`<line x1="${X(RIDGE)}" y1="${Y(28.41)}" x2="${X(RIDGE)}" y2="300" stroke="${INK}" stroke-width="1.2" stroke-dasharray="4 3"/>`);
  L.push(`<circle cx="${X(RIDGE)}" cy="${Y(28.41)}" r="4.5" fill="${INK}"/>`);
  L.push(`<text x="${(+X(RIDGE) - 9).toFixed(1)}" y="${(+Y(28.41) + 24).toFixed(1)}" font-family="monospace" font-size="11" fill="${INK}" text-anchor="end">ridge: 125 flops/byte</text>`);
  // the real shapes
  const pts = [
    [0.25, 'decode, 1 token', ORANGE, -6, -12, 'start'],
    [14.6, 'decode, batch 16', ORANGE, -6, -12, 'start'],
    [368, 'prefill, 2048 rows', BLUE, 0, 22, 'middle'],
  ];
  for (const [i, lab, col, dx, dy, anc] of pts) {
    const p = Math.min(0.227 * i, 28.41);
    L.push(`<line x1="${X(i)}" y1="${Y(p)}" x2="${X(i)}" y2="300" stroke="${col}" stroke-width="1.1" stroke-dasharray="3 3"/>`);
    L.push(`<circle cx="${X(i)}" cy="${Y(p)}" r="5" fill="${col}" stroke="#fff" stroke-width="1.6"/>`);
    L.push(`<text x="${(+X(i) + dx).toFixed(1)}" y="${(+Y(p) + dy).toFixed(1)}" font-family="monospace" font-size="11" fill="${col}" text-anchor="${anc}">${lab}</text>`);
  }
  L.push(`<rect x="70" y="60" width="${(+X(RIDGE) - 70).toFixed(1)}" height="240" fill="${ORANGE}" opacity="0.045"/>`);
  L.push(`<text x="${((70 + +X(RIDGE)) / 2).toFixed(1)}" y="76" font-family="monospace" font-size="11" fill="${ORANGE}" text-anchor="middle">MEMORY-BOUND: only bytes matter</text>`);
  L.push(`<text x="0" y="356" font-family="monospace" font-size="10.5" fill="${MUTED}">Log-log. Both decode shapes sit under the sloped roof, where performance is bandwidth x intensity and nothing else.</text>`);
  return `<svg viewBox="0 0 740 366" role="img" aria-label="Roofline model with decode and prefill shapes plotted">\n${L.join('\n  ').replace(/^/, '  ')}\n</svg>`;
};

// =================================================== 4. traffic breakdown (crisp)
F.traffic_breakdown = () => {
  const tot = 1077.1;
  const w = (v) => (v / tot * 640).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">BYTES MOVED PER DECODE STEP  ·  QWEN2.5-0.5B, BATCH 16, BF16</text>`);
  L.push(`<rect x="0" y="32" width="${w(942.2)}" height="30" fill="${ORANGE}"/>`);
  L.push(`<rect x="${w(942.2)}" y="32" width="${w(96.0)}" height="30" fill="${BLUE}"/>`);
  L.push(`<rect x="${(+w(942.2) + +w(96.0)).toFixed(1)}" y="32" width="${w(38.9)}" height="30" fill="${DIM}"/>`);
  L.push(`<text x="12" y="52" font-family="monospace" font-size="12" fill="#fff">weights   942.2 MB   87.5%</text>`);
  L.push(`<text x="${(+w(942.2) + 6).toFixed(1)}" y="52" font-family="monospace" font-size="11" fill="#fff">KV 8.9%</text>`);
  L.push(`<text x="0" y="86" font-family="monospace" font-size="11" fill="${MUTED}">ITEMISED</text>`);
  const rows = [
    ['weights: q/k/v/o proj', 231.5, ORANGE],
    ['weights: gate/up proj', 465.6, ORANGE],
    ['weights: down proj', 232.8, ORANGE],
    ['weights: embed + lm_head', 12.3, ORANGE],
    ['KV cache read', 96.0, BLUE],
    ['activations (all of them)', 38.9, DIM],
  ];
  rows.forEach(([lab, v, col], i) => {
    const y = 100 + i * 26;
    L.push(`<text x="0" y="${y + 13}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="220" y="${y}" width="${(v / 480 * 400).toFixed(1)}" height="17" fill="${col}"/>`);
    L.push(`<text x="${(224 + v / 480 * 400).toFixed(1)}" y="${y + 13}" font-family="monospace" font-size="11" fill="${MUTED}">${v.toFixed(1)} MB</text>`);
  });
  L.push(`<line x1="0" y1="264" x2="700" y2="264" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="284" font-family="monospace" font-size="11.5" fill="${ORANGE}">Fuse every elementwise op in the model perfectly and you are competing for 3.6% of the traffic.</text>`);
  L.push(`<text x="0" y="302" font-family="monospace" font-size="10.5" fill="${MUTED}">Weights are a fixed toll: the same 942 MB regardless of batch size. That is the whole story of the next figure.</text>`);
  return `<svg viewBox="0 0 740 312" role="img" aria-label="Traffic breakdown for one decode step: weights 87.5 percent">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================= 5. traffic per token (crisp)
F.traffic_per_token = () => {
  const data = [[1, 951], [4, 245], [16, 67], [32, 38], [128, 16]];
  const H = 190, base = 240;
  const Y = v => (base - Math.log10(v / 8) / Math.log10(951 / 8) * H).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">MEGABYTES MOVED PER TOKEN GENERATED  ·  LOG SCALE</text>`);
  for (const g of [16, 64, 256, 951]) {
    L.push(`<line x1="70" y1="${Y(g)}" x2="700" y2="${Y(g)}" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="62" y="${(+Y(g) + 4).toFixed(1)}" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">${g}</text>`);
  }
  data.forEach(([b, mb], i) => {
    const x = 110 + i * 120;
    const col = i === 0 ? ORANGE : (i === 4 ? BLUE : GRAY);
    L.push(`<rect x="${x}" y="${Y(mb)}" width="66" height="${(base - +Y(mb)).toFixed(1)}" fill="${col}" rx="4"/>`);
    L.push(`<text x="${x + 33}" y="${(+Y(mb) - 8).toFixed(1)}" font-family="monospace" font-size="12.5" fill="${col}" text-anchor="middle">${mb} MB</text>`);
    L.push(`<text x="${x + 33}" y="260" font-family="monospace" font-size="11.5" fill="${INK}" text-anchor="middle">batch ${b}</text>`);
  });
  L.push(`<line x1="70" y1="${base}" x2="700" y2="${base}" stroke="${INK}" stroke-width="1.2"/>`);
  L.push(`<text x="196" y="292" font-family="monospace" font-size="11.5" fill="${ORANGE}">59x cheaper per token, with the same weights and the same kernels.</text>`);
  L.push(`<text x="0" y="292" font-family="monospace" font-size="11.5" fill="${INK}">1 -&gt; 128:</text>`);
  L.push(`<text x="0" y="310" font-family="monospace" font-size="10.5" fill="${MUTED}">Per token = 942 MB / batch + about 9 MB per sequence. Batching does not make kernels faster; it amortises a toll.</text>`);
  return `<svg viewBox="0 0 740 320" role="img" aria-label="Bytes per generated token falls from 951 MB at batch 1 to 16 MB at batch 128">\n  ${L.join('\n  ')}\n</svg>`;
};

// ====================================================== 6. bus ceiling (crisp)
F.bus_ceiling = () => {
  const sc = v => (v / 5000 * 620).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">MICROSECONDS PER DECODE STEP  ·  942 MB OF WEIGHTS ON A 227 GB/S BUS</text>`);
  const rows = [
    ['cuBLAS, measured', 4668, GRAY, '87% of the roof already'],
    ['perfect kernel (942 MB / 227 GB/s)', 4053, BLUE, 'the floor: +15.2% over cuBLAS'],
    ['the +20% target', 3890, ORANGE, 'needs 237 GB/s on a 227 GB/s bus'],
  ];
  rows.forEach(([lab, v, col, note], i) => {
    const y = 40 + i * 58;
    L.push(`<text x="0" y="${y + 12}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="0" y="${y + 20}" width="${sc(v)}" height="22" fill="${col}" rx="3"/>`);
    L.push(`<text x="${(+sc(v) + 8).toFixed(1)}" y="${y + 36}" font-family="monospace" font-size="12" fill="${col}">${v} us</text>`);
    L.push(`<text x="700" y="${y + 12}" font-family="monospace" font-size="11" fill="${MUTED}" text-anchor="end">${note}</text>`);
  });
  L.push(`<line x1="${sc(4053)}" y1="30" x2="${sc(4053)}" y2="220" stroke="${BLUE}" stroke-width="1.6" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${(+sc(4053) - 6).toFixed(1)}" y="240" font-family="monospace" font-size="11" fill="${BLUE}" text-anchor="end">PHYSICAL FLOOR</text>`);
  L.push(`<rect x="${sc(3890)}" y="146" width="${(+sc(4053) - +sc(3890)).toFixed(1)}" height="22" fill="${ORANGE}" opacity="0.2"/>`);
  L.push(`<text x="0" y="272" font-family="monospace" font-size="11.5" fill="${ORANGE}">The target was below the floor. No kernel reaches it; only moving fewer bytes does.</text>`);
  L.push(`<text x="0" y="290" font-family="monospace" font-size="10.5" fill="${MUTED}">Both inputs were already measured and on disk. Ten minutes of arithmetic would have retargeted a week of work.</text>`);
  return `<svg viewBox="0 0 740 300" role="img" aria-label="The 20 percent target sits below the physical bandwidth floor">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================================== 7. decode shape (hand)
F.decode_shape = () => {
  const f = fig(740, 348, 17);
  f.caption(0, 14, 'a 128x128 tile meets a 1x896 problem');
  // the output matrix, 1 row tall
  f.text(0, 44, 'C  (M=1, N=896)', { size: 13.5, fill: INK, mono: true });
  f.grid(0, 54, 7, 1, 60, { outline: true });
  for (let c = 0; c < 7; c++) f.text(c * 60 + 30, 76, `b${c}`, { size: 12, fill: MUTED, anchor: 'middle', mono: true });
  f.dim(0, 48, 420, 48, 'N=896  =  7 tiles of BN=128', { mono: true, size: 11 });
  f.text(436, 78, '-> 7 blocks total', { size: 14, fill: ORANGE });
  // the SMs
  f.text(0, 128, '24 SMs on this GPU', { size: 13.5, fill: INK });
  for (let i = 0; i < 24; i++) {
    const x = (i % 12) * 34, y = 140 + Math.floor(i / 12) * 34;
    if (i < 7) f.solid(x, y, 28, 28, { fill: BLUE, stroke: BLUE, sw: 1.1 });
    else f.rect(x, y, 28, 28, { sw: 1.1, stroke: GRAY });
  }
  f.text(424, 158, '7 busy', { size: 13, fill: BLUE });
  f.text(424, 190, '17 idle before the kernel starts', { size: 13, fill: ORANGE });
  // the wasted rows
  f.text(0, 240, 'and inside one block:', { size: 13.5, fill: INK });
  f.grid(178, 224, 8, 8, 9, { outline: true });
  f.cells(178, 224, 9, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0]], { fill: BLUE });
  f.text(262, 240, '1 real row', { size: 12.5, fill: BLUE });
  f.text(262, 258, '127 rows of padding', { size: 12.5, fill: ORANGE });
  f.text(262, 276, '63 of every 64 accumulators wasted', { size: 12.5, fill: MUTED });
  f.line(0, 296, 720, 296, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 316, 'The autotuner’s best of 188 configurations reached 15.7% of cuBLAS here. No tile shape fixes it: there is no');
  f.caption(0, 330, 'parallelism along M or N to find. The parallelism has to come from somewhere else.');
  return f.toSVG('At M equals 1 a tiled kernel launches 7 blocks on 24 SMs and pads 127 of 128 rows');
};

// ========================================================== 8. split-K (hand)
F.splitk = () => {
  const f = fig(740, 348, 37);
  f.caption(0, 14, 'split-K: take the parallelism from the reduction instead');
  f.text(0, 44, 'K = 896, split 4 ways', { size: 13.5, fill: INK, mono: true });
  const cols = [BLUE, ORANGE, GRAY, '#8b5cf6'];
  for (let s = 0; s < 4; s++) {
    const x = s * 104;
    f.solid(x, 56, 92, 34, { fill: cols[s], stroke: cols[s], sw: 1.2 });
    f.text(x + 46, 78, `k slice ${s}`, { size: 11.5, fill: '#ffffff', anchor: 'middle', mono: true });
    f.arrow(x + 46, 96, x + 46, 126, { stroke: MUTED, sw: 1.1 });
    f.rect(x + 8, 128, 76, 30, { sw: 1.2, stroke: cols[s] });
    f.text(x + 46, 148, `block ${s}`, { size: 11.5, fill: INK, anchor: 'middle', mono: true });
    f.arrow(x + 46, 160, 208, 196, { stroke: FAINT, sw: 1 });
  }
  f.text(430, 78, 'block count is now a free', { size: 13, fill: INK });
  f.text(430, 96, 'parameter, not a function', { size: 13, fill: MUTED });
  f.text(430, 114, 'of the output size', { size: 13, fill: MUTED });
  f.rect(120, 196, 180, 32, { fill: PALE_B, fillStyle: 'solid', sw: 1.3 });
  f.text(130, 217, 'partial sums in gmem', { size: 13, fill: INK });
  f.arrow(310, 212, 350, 212);
  f.rect(360, 196, 130, 32, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(370, 217, 'reduce pass', { size: 13, fill: '#ffffff' });
  f.text(506, 217, '= C', { size: 15, fill: INK });
  f.text(120, 254, 'the cost: nsplit x M x N x 4 bytes of extra traffic', { size: 12.5, fill: ORANGE });
  f.text(120, 272, 'that did not exist before', { size: 12.5, fill: MUTED });
  f.chip(0, 196, 't0', { fill: BLUE });
  f.chip(0, 222, 't1', { fill: ORANGE });
  f.text(0, 262, 'each owns 4', { size: 12, fill: MUTED });
  f.text(0, 278, 'cols (float4)', { size: 12, fill: MUTED });
  f.line(0, 298, 720, 298, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 318, 'Worth 5.7x to 13x over the tiled ladder at M=1 — but only while that extra traffic stays small next to the');
  f.caption(0, 332, 'weights. That is a ratio worth writing down before building it, not after.');
  return f.toSVG('Split-K assigns each block a slice of the reduction dimension, then reduces partial sums');
};

// ================================================ 9. pipeline stages (crisp)
F.pipeline_stages = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">EFFECTIVE BANDWIDTH VS CP.ASYNC PIPELINE DEPTH  ·  DECODE SHAPES, GB/S</text>`);
  const shapes = [
    ['o_proj    (N=896)', 156, 176, 3, 1792],
    ['qkv       (N=1152)', 181, 197, 6, 2304],
    ['gate_up   (N=9728)', 225, 226, 2, 19456],
  ];
  const sc = v => (v / 240 * 420).toFixed(1);
  L.push(`<line x1="${sc(227)}" y1="30" x2="${sc(227)}" y2="244" stroke="${ORANGE}" stroke-width="1.6" stroke-dasharray="5 4"/>`);
  shapes.forEach(([lab, two, best, depth, thr], i) => {
    const y = 38 + i * 74;
    L.push(`<text x="0" y="${y + 12}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<text x="176" y="${y + 12}" font-family="monospace" font-size="10.5" fill="${MUTED}">32N/WN = ${thr} threads</text>`);
    if (depth === 2) {
      L.push(`<rect x="0" y="${y + 28}" width="${sc(best)}" height="20" fill="${GRAY}" rx="3"/>`);
      L.push(`<text x="${(+sc(best) + 6).toFixed(1)}" y="${y + 43}" font-family="monospace" font-size="11" fill="${GRAY}">${best} @ 2 stages — no depth helps</text>`);
    } else {
      L.push(`<rect x="0" y="${y + 20}" width="${sc(two)}" height="17" fill="${DIM}" rx="3"/>`);
      L.push(`<text x="${(+sc(two) + 6).toFixed(1)}" y="${y + 33}" font-family="monospace" font-size="11" fill="${MUTED}">${two} @ 2 stages</text>`);
      L.push(`<rect x="0" y="${y + 40}" width="${sc(best)}" height="17" fill="${BLUE}" rx="3"/>`);
      L.push(`<text x="${(+sc(best) + 6).toFixed(1)}" y="${y + 53}" font-family="monospace" font-size="11" fill="${BLUE}">${best} @ ${depth} stages</text>`);
    }
  });
  L.push(`<text x="${(+sc(227) + 8).toFixed(1)}" y="258" font-family="monospace" font-size="11" fill="${ORANGE}">227 GB/s bus</text>`);
  L.push(`<text x="0" y="288" font-family="monospace" font-size="11.5" fill="${INK}">The two narrow, thread-starved shapes want depth; the one already at the bus does not.</text>`);
  L.push(`<text x="0" y="306" font-family="monospace" font-size="10.5" fill="${MUTED}">With BM=WM=16 the thread count reduces to 32N/WN and the tile stops being a variable. Depth is the only lever left.</text>`);
  return `<svg viewBox="0 0 740 316" role="img" aria-label="Pipeline depth helps thread-starved shapes and not saturated ones">\n  ${L.join('\n  ')}\n</svg>`;
};

// ====================================================== 10. lie: L2 (crisp)
F.lie_l2 = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">GATE_UP_PROJ AT M=16, THE SAME KERNEL MEASURED TWO WAYS</text>`);
  L.push(`<text x="0" y="42" font-family="monospace" font-size="12" fill="${GRAY}">HOT LOOP: one weight matrix, reused 300x</text>`);
  L.push(`<text x="0" y="60" font-family="monospace" font-size="10.5" fill="${MUTED}">16.6 MB of weights in a 33.5 MB L2. After iteration 1 they never leave cache.</text>`);
  L.push(`<rect x="0" y="70" width="${(578 / 620 * 620).toFixed(1)}" height="22" fill="${DIM}" rx="3"/>`);
  L.push(`<text x="8" y="86" font-family="monospace" font-size="11.5" fill="#333">mine  578 GB/s</text>`);
  L.push(`<rect x="0" y="96" width="${(342 / 620 * 620).toFixed(1)}" height="22" fill="#e8ebed" rx="3"/>`);
  L.push(`<text x="8" y="112" font-family="monospace" font-size="11.5" fill="#333">cuBLAS 342 GB/s</text>`);
  L.push(`<text x="586" y="86" font-family="monospace" font-size="15" fill="${GRAY}">169%</text>`);
  L.push(`<text x="0" y="150" font-family="monospace" font-size="12" fill="${ORANGE}">STREAMED: rotating copies, total &gt; L2 (what the model does)</text>`);
  L.push(`<text x="0" y="168" font-family="monospace" font-size="10.5" fill="${MUTED}">Decode reads 988 MB of distinct weights per step and reuses none of them.</text>`);
  L.push(`<rect x="0" y="178" width="${(223 / 620 * 620).toFixed(1)}" height="22" fill="${ORANGE}" rx="3"/>`);
  L.push(`<text x="8" y="194" font-family="monospace" font-size="11.5" fill="#fff">mine  223 GB/s</text>`);
  L.push(`<rect x="0" y="204" width="${(200 / 620 * 620).toFixed(1)}" height="22" fill="${PALE_O}" rx="3"/>`);
  L.push(`<text x="8" y="220" font-family="monospace" font-size="11.5" fill="#333">cuBLAS 200 GB/s</text>`);
  L.push(`<text x="586" y="194" font-family="monospace" font-size="15" fill="${ORANGE}">109%</text>`);
  L.push(`<line x1="${(227 / 620 * 620).toFixed(1)}" y1="170" x2="${(227 / 620 * 620).toFixed(1)}" y2="234" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
  L.push(`<text x="236" y="248" font-family="monospace" font-size="10.5" fill="${INK}">227 GB/s bus: both kernels are now against the wall</text>`);
  L.push(`<text x="0" y="278" font-family="monospace" font-size="11.5" fill="${ORANGE}">A microbenchmark that reuses its input is measuring the cache.</text>`);
  L.push(`<text x="0" y="296" font-family="monospace" font-size="10.5" fill="${MUTED}">The 169% repeated to within a point over three runs, across three configurations, with a plausible mechanism.</text>`);
  return `<svg viewBox="0 0 740 306" role="img" aria-label="A 169 percent speedup collapses to 109 percent once the benchmark streams past L2">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================= 11. lie: thermal (crisp)
F.lie_thermal = () => {
  const X = t => (70 + t / 60 * 610).toFixed(1);
  const Y = mhz => (230 - (mhz - 1000) / 2400 * 170).toFixed(1);
  const trace = [[0, 3105], [4, 3090], [8, 2860], [14, 2450], [20, 2100], [28, 1800], [36, 1540], [46, 1340], [60, 1210]];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">SM CLOCK DURING ONE 60-SECOND AUTOTUNER SWEEP</text>`);
  for (const m of [1000, 2000, 3000]) {
    L.push(`<line x1="70" y1="${Y(m)}" x2="680" y2="${Y(m)}" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="62" y="${(+Y(m) + 4).toFixed(1)}" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">${m}</text>`);
  }
  L.push(`<text x="10" y="50" font-family="monospace" font-size="10.5" fill="${MUTED}">MHz</text>`);
  L.push(`<polyline points="${trace.map(([t, m]) => `${X(t)},${Y(m)}`).join(' ')}" fill="none" stroke="${ORANGE}" stroke-width="2.4"/>`);
  L.push(`<circle cx="${X(0)}" cy="${Y(3105)}" r="5" fill="${BLUE}" stroke="#fff" stroke-width="1.6"/>`);
  L.push(`<text x="${(+X(0) + 12).toFixed(1)}" y="${(+Y(3105) - 10).toFixed(1)}" font-family="monospace" font-size="11" fill="${BLUE}">cuBLAS reference measured HERE: 7.45 TFLOPS, 60 C</text>`);
  L.push(`<rect x="${X(10)}" y="60" width="${(+X(60) - +X(10)).toFixed(1)}" height="170" fill="${ORANGE}" opacity="0.06"/>`);
  L.push(`<text x="${X(30)}" y="${(+Y(1700)).toFixed(1)}" font-family="monospace" font-size="11" fill="${ORANGE}" text-anchor="middle">188 candidates measured in here: 1.87 TFLOPS, 87 C</text>`);
  L.push(`<line x1="70" y1="230" x2="680" y2="230" stroke="${INK}" stroke-width="1.2"/>`);
  L.push(`<text x="70" y="248" font-family="monospace" font-size="10.5" fill="${MUTED}">0s</text>`);
  L.push(`<text x="680" y="248" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">60s</text>`);
  L.push(`<text x="0" y="278" font-family="monospace" font-size="11.5" fill="${INK}">Reference cold, candidates hot. The whole 2.6x drift landed in the ratio: reported <tspan fill="${ORANGE}">372% speedup</tspan>.</text>`);
  L.push(`<text x="0" y="296" font-family="monospace" font-size="10.5" fill="${MUTED}">On another shape the reported figure was 259.8%; interleaved it was 68.1% — the kernel was losing badly. Twice.</text>`);
  return `<svg viewBox="0 0 740 306" role="img" aria-label="GPU clock falls from 3105 to 1210 MHz during an autotuner sweep, manufacturing a fake speedup">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================== 12. lie: cuBLAS (crisp)
F.lie_cublas = () => {
  const X = e => (250 + (Math.log10(e) + 7) * 62).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">MAX SAMPLED ERROR VS AN FP64 REFERENCE  ·  BF16, K=4864  ·  LOG SCALE</text>`);
  for (const e of [1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1]) {
    L.push(`<line x1="${X(e)}" y1="38" x2="${X(e)}" y2="168" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="${X(e)}" y="186" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="middle">1e${Math.round(Math.log10(e))}</text>`);
  }
  const rows = [
    ['cuBLAS, default bf16 path', 7.6e-1, ORANGE, 'reduces partials in reduced precision'],
    ['cuBLAS, DISALLOW_REDUCED', 3.9e-3, GRAY, 'the same library, 200x more accurate'],
    ['my kernel (fp32 accumulate)', 3.5e-3, BLUE, 'about one bf16 ulp. Correct.'],
  ];
  rows.forEach(([lab, e, col, note], i) => {
    const y = 46 + i * 40;
    L.push(`<text x="0" y="${y + 14}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="250" y="${y}" width="${(+X(e) - 250).toFixed(1)}" height="20" fill="${col}" rx="3"/>`);
    L.push(`<text x="${(+X(e) + 8).toFixed(1)}" y="${y + 15}" font-family="monospace" font-size="11" fill="${col}">${e.toExponential(1)}</text>`);
    L.push(`<text x="250" y="${y + 34}" font-family="monospace" font-size="10.5" fill="${MUTED}">${note}</text>`);
  });
  L.push(`<text x="0" y="216" font-family="monospace" font-size="11.5" fill="${ORANGE}">Scoring a kernel against a library marks it wrong for being more accurate than its reference.</text>`);
  L.push(`<text x="0" y="234" font-family="monospace" font-size="10.5" fill="${MUTED}">Fix: recompute a spread-out sample of C in double on the host and compare both implementations against that.</text>`);
  return `<svg viewBox="0 0 740 244" role="img" aria-label="cuBLAS default bf16 path is 200 times less accurate than the same library with reduced-precision reduction disabled">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================== 13. lie: relative error (hand)
F.lie_relerr = () => {
  const f = fig(740, 310, 43);
  f.caption(0, 14, 'one output element of a K=4864 dot product');
  f.text(0, 46, 'positive partials', { size: 13, fill: INK });
  f.solid(160, 32, 300, 22, { fill: BLUE, stroke: BLUE, sw: 1.2 });
  f.text(466, 49, '+10.0173', { size: 13, fill: BLUE, mono: true });
  f.text(0, 82, 'negative partials', { size: 13, fill: INK });
  f.solid(160, 68, 299, 22, { fill: ORANGE, stroke: ORANGE, sw: 1.2 });
  f.text(466, 85, '-9.9973', { size: 13, fill: ORANGE, mono: true });
  f.line(0, 100, 560, 100, { stroke: MUTED, sw: 1.2, roughness: 0.4 });
  f.text(0, 122, 'the result', { size: 13, fill: INK });
  f.solid(160, 108, 3, 22, { fill: INK, stroke: INK, sw: 1.2 });
  f.text(466, 125, '0.0200', { size: 13, fill: INK, mono: true });
  f.text(0, 160, 'now slip one partial by a single bf16 ulp:', { size: 13.5, fill: INK });
  f.text(20, 182, 'ulp at magnitude 10  =  10 x 2^-8  =  0.039', { size: 12.5, fill: MUTED, mono: true });
  f.text(20, 202, 'the result moves 0.0152  ->  0.0348', { size: 12.5, fill: MUTED, mono: true });
  f.rect(0, 216, 340, 34, { fill: ORANGE, fillStyle: 'solid', sw: 1.3 });
  f.text(12, 238, 'relative error:  76%   FAIL', { size: 13.5, fill: '#ffffff', mono: true });
  f.rect(360, 216, 340, 34, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(372, 238, 'error / RMS(C):  1.5e-3   PASS', { size: 13.5, fill: '#ffffff', mono: true });
  f.caption(0, 272, 'Same kernel, same slip, two metrics. At K=4864 enough elements cancel that relative error rejected all 188');
  f.caption(0, 288, 'configurations in the search space. Score against the scale the arithmetic works at: max|C-truth| / RMS(truth),');
  f.caption(0, 304, 'where one bf16 ulp is 3.9e-3, fp32 is near 1e-6, and a real indexing bug is O(1). Three regimes, orders apart.');
  return f.toSVG('Relative error on a cancelling dot product reports 76 percent for a correct kernel');
};

// ========================================================= 14. lie: race (hand)
F.lie_race = () => {
  const f = fig(740, 330, 53);
  f.caption(0, 14, 'cp.async.wait_group N  =  "wait until AT MOST N groups are outstanding"');
  // steady state
  f.text(0, 44, 'STEADY STATE  —  correct', { size: 13.5, fill: BLUE });
  const lab = ['buf 0', 'buf 1', 'buf 2'];
  for (let s = 0; s < 3; s++) {
    const y = 56 + s * 30;
    f.text(0, y + 18, lab[s], { size: 12, fill: MUTED, mono: true });
    f.solid(60 + s * 108, y, 96, 22, { fill: PALE_B, stroke: BLUE, sw: 1.2 });
    f.text(68 + s * 108, y + 16, 'cp.async', { size: 11, fill: INK, mono: true });
    if (s < 2) {
      f.solid(168 + s * 108, y, 96, 22, { fill: BLUE, stroke: BLUE, sw: 1.2 });
      f.text(178 + s * 108, y + 16, 'read ok', { size: 11, fill: '#ffffff', mono: true });
    }
  }
  f.text(446, 100, 'the 1 group still permitted', { size: 12.5, fill: MUTED });
  f.text(446, 118, 'to be in flight is the NEXT', { size: 12.5, fill: MUTED });
  f.text(446, 136, 'buffer, not this one', { size: 12.5, fill: BLUE });
  f.line(0, 158, 720, 158, { stroke: FAINT, sw: 1, roughness: 0.4 });
  // tail
  f.text(0, 182, 'LAST TILE  —  race', { size: 13.5, fill: ORANGE });
  f.text(0, 216, 'buf 2', { size: 12, fill: MUTED, mono: true });
  f.solid(60, 198, 96, 22, { fill: PALE_O, stroke: ORANGE, sw: 1.2 });
  f.text(68, 214, 'cp.async', { size: 11, fill: INK, mono: true });
  f.solid(168, 198, 96, 22, { fill: ORANGE, stroke: ORANGE, sw: 1.2 });
  f.text(176, 214, 'READ!', { size: 11, fill: '#ffffff', mono: true });
  f.text(278, 214, '<- nothing new was issued, so the group', { size: 12.5, fill: ORANGE });
  f.text(292, 232, 'still permitted to be outstanding is', { size: 12.5, fill: ORANGE });
  f.text(292, 250, 'the very buffer about to be read', { size: 12.5, fill: ORANGE });
  f.text(0, 280, 'passed below ~600 blocks   ·   wrong at 1187   ·   error varied with batch size', { size: 12.5, fill: INK, mono: true });
  f.caption(0, 306, 'Fix: allow min(NSTAGE-2, remaining tiles) outstanding, not a constant. Two lines. I fixed this once, then');
  f.caption(0, 322, 'reintroduced it weeks later when generalising from two stages to N — and a 90%-passing gate is not a gate.');
  return f.toSVG('The cp.async tail race: on the last tile the permitted outstanding copy is the buffer being read');
};

// ==================================================== 15. lie: in situ (crisp)
F.lie_insitu = () => {
  const sc = v => (v / 1.4 * 400).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">DOWN_PROJ, ONE CONFIGURATION, SPEEDUP VS CUBLAS</text>`);
  L.push(`<text x="0" y="46" font-family="monospace" font-size="12" fill="${GRAY}">as the autotuner drove it</text>`);
  L.push(`<text x="0" y="62" font-family="monospace" font-size="10.5" fill="${MUTED}">tight loop, one shape, same weights</text>`);
  L.push(`<rect x="260" y="34" width="${sc(1.22)}" height="24" fill="${DIM}" rx="3"/>`);
  L.push(`<text x="${(260 + +sc(1.22) + 8).toFixed(1)}" y="51" font-family="monospace" font-size="14" fill="${GRAY}">1.22x</text>`);
  L.push(`<text x="0" y="106" font-family="monospace" font-size="12" fill="${ORANGE}">as the model drives it</text>`);
  L.push(`<text x="0" y="122" font-family="monospace" font-size="10.5" fill="${MUTED}">once per layer, interleaved, new weights</text>`);
  L.push(`<rect x="260" y="94" width="${sc(0.85)}" height="24" fill="${ORANGE}" rx="3"/>`);
  L.push(`<text x="${(260 + +sc(0.85) - 10).toFixed(1)}" y="111" font-family="monospace" font-size="14" fill="#fff" text-anchor="end">0.85x</text>`);
  L.push(`<line x1="${(260 + +sc(1.0)).toFixed(1)}" y1="26" x2="${(260 + +sc(1.0)).toFixed(1)}" y2="130" stroke="${INK}" stroke-width="1.6" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${(260 + +sc(1.0)).toFixed(1)}" y="146" font-family="monospace" font-size="11" fill="${INK}" text-anchor="middle">1.0x = cuBLAS</text>`);
  L.push(`<text x="0" y="176" font-family="monospace" font-size="11.5" fill="${ORANGE}">A win became a loss. The measurement was clean both times; the workload was not the same workload.</text>`);
  L.push(`<text x="0" y="194" font-family="monospace" font-size="10.5" fill="${MUTED}">The one of the six with no bug to point at: a tight loop is simply a different thing than a model.</text>`);
  return `<svg viewBox="0 0 740 204" role="img" aria-label="The same kernel configuration measures 1.22x in a tuner loop and 0.85x inside the model">\n  ${L.join('\n  ')}\n</svg>`;
};

// =================================================== 16. micro vs e2e (crisp)
F.micro_vs_e2e = () => {
  const sc = p => (p / 60 * 420).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">PERCENT FASTER  ·  THE SAME KERNEL, TWO SCOPES</text>`);
  const rows = [
    ['decode GEMM, traffic-weighted', 57.0, BLUE, 'every measurement here is correct'],
    ['end to end, real tokens (best)', 3.7, ORANGE, 'so is every measurement here'],
    ['end to end, real tokens (worst)', 0.3, ORANGE, ''],
  ];
  rows.forEach(([lab, p, col, note], i) => {
    const y = 36 + i * 50;
    L.push(`<text x="0" y="${y + 16}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="230" y="${y + 2}" width="${Math.max(+sc(p), 2).toFixed(1)}" height="22" fill="${col}" rx="3"/>`);
    L.push(`<text x="${(234 + Math.max(+sc(p), 2)).toFixed(1)}" y="${y + 19}" font-family="monospace" font-size="13" fill="${col}">+${p}%</text>`);
    if (note) L.push(`<text x="230" y="${y + 40}" font-family="monospace" font-size="10.5" fill="${MUTED}">${note}</text>`);
  });
  L.push(`<line x1="0" y1="194" x2="700" y2="194" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="216" font-family="monospace" font-size="11.5" fill="${INK}">A factor of roughly fifteen, and this time it is not measurement error.</text>`);
  L.push(`<text x="0" y="234" font-family="monospace" font-size="10.5" fill="${MUTED}">Part 3 accounts for the gap: a fusion the serving framework already had, a Python branch traced at the wrong time, one PTX instruction.</text>`);
  return `<svg viewBox="0 0 740 244" role="img" aria-label="A 57 percent microbenchmark win becomes 0.3 to 3.7 percent end to end">\n  ${L.join('\n  ')}\n</svg>`;
};

module.exports = F;
