// Every figure for the FlashAttention post, keyed. Same two-style policy as the
// GEMM series: hand-drawn for the algebra and the dataflow, crisp for anything
// compared by length.
//
// Colour convention here: BLUE is my Triton kernel, ORANGE is the naive path
// that flash replaces, GRAY is PyTorch's production implementation.
const { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT } = require('./rough.cjs');

const F = {};
const PALE_B = '#c7dbf6';
const PALE_O = '#f2cdbc';
const DIM = '#cbd1d6';

// ============================================ 1. the scores matrix (crisp)
F.scores_matrix = () => {
  const sc = v => (v / 1000 * 330).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">SIZE OF THE ATTENTION SCORE MATRIX, BF16  ·  14 HEADS, QWEN2.5-0.5B</text>`);
  const rows = [
    ['batch 1, seq 512', 7.3, DIM],
    ['batch 1, seq 2048', 117.4, PALE_O],
    ['batch 8, seq 2048  (a real prefill)', 939.5, ORANGE],
  ];
  rows.forEach(([lab, v, col], i) => {
    const y = 34 + i * 40;
    L.push(`<text x="0" y="${y + 17}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="250" y="${y + 2}" width="${Math.max(+sc(v), 1.5).toFixed(1)}" height="22" fill="${col}" rx="3"/>`);
    // the last bar ends on the reference line, so label it inside
    L.push(i === 2
      ? `<text x="${(246 + +sc(v)).toFixed(1)}" y="${y + 18}" font-family="monospace" font-size="12.5" fill="#fff" text-anchor="end">${v} MB</text>`
      : `<text x="${(254 + Math.max(+sc(v), 1.5)).toFixed(1)}" y="${y + 18}" font-family="monospace" font-size="12.5" fill="${MUTED}">${v} MB</text>`);
  });
  L.push(`<line x1="${(250 + +sc(942.2)).toFixed(1)}" y1="28" x2="${(250 + +sc(942.2)).toFixed(1)}" y2="170" stroke="${INK}" stroke-width="1.8" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${(250 + +sc(942.2) - 6).toFixed(1)}" y="186" font-family="monospace" font-size="11" fill="${INK}" text-anchor="end">every weight in the model: 942.2 MB</text>`);
  L.push(`<line x1="0" y1="200" x2="700" y2="200" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="224" font-family="monospace" font-size="12" fill="${ORANGE}">The intermediate is the size of the entire model. In fp32 it is 1879 MB.</text>`);
  L.push(`<text x="0" y="242" font-family="monospace" font-size="11.5" fill="${INK}">It exists only to be softmaxed and multiplied away on the next line.</text>`);
  L.push(`<text x="0" y="264" font-family="monospace" font-size="10.5" fill="${MUTED}">Scores are S x S per head per batch element: quadratic in sequence length, where everything else is linear.</text>`);
  return `<svg viewBox="0 0 740 274" role="img" aria-label="The attention score matrix at prefill is 939 MB, the same size as every weight in the model">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================= 2. why softmax blocks it (hand)
F.softmax_problem = () => {
  const f = fig(740, 300, 307);
  f.caption(0, 14, 'softmax is not elementwise, and that is the whole problem');
  f.text(0, 42, 'one row of scores, split into two tiles', { size: 13, fill: INK });
  f.grid(0, 52, 5, 1, 34, { outline: true });
  f.grid(190, 52, 5, 1, 34, { outline: true });
  f.text(85, 100, 'tile A', { size: 12, fill: BLUE, anchor: 'middle' });
  f.text(275, 100, 'tile B', { size: 12, fill: ORANGE, anchor: 'middle' });
  f.text(0, 136, 'to turn tile A into probabilities you need:', { size: 13, fill: INK });
  f.rect(14, 148, 330, 28, { sw: 1.3, stroke: ORANGE });
  f.text(24, 167, 'max over the WHOLE row', { size: 12.5, fill: ORANGE, mono: true });
  f.rect(14, 182, 330, 28, { sw: 1.3, stroke: ORANGE });
  f.text(24, 201, 'sum over the WHOLE row', { size: 12.5, fill: ORANGE, mono: true });
  f.text(360, 167, '<- lives in tile B', { size: 12.5, fill: MUTED });
  f.text(360, 201, '<- lives in tile B', { size: 12.5, fill: MUTED });
  f.arrow(420, 90, 470, 120, { stroke: MUTED });
  f.text(470, 86, 'the normaliser is', { size: 12.5, fill: INK });
  f.text(470, 104, 'outside the tile', { size: 12.5, fill: ORANGE });
  f.line(0, 230, 720, 230, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 250, 'The textbook fix is three passes over the row — max, then sum, then normalise — and three passes over an');
  f.caption(0, 268, 'S x S matrix means materialising it, which is the thing we are trying not to do.');
  f.caption(0, 288, 'This is why attention resisted tiling long after matmul stopped resisting it.');
  return f.toSVG('Softmax needs a whole-row max and sum, so a tile of scores cannot become a tile of probabilities');
};

// ================================================= 3. online softmax (hand)
F.online_softmax = () => {
  const f = fig(740, 340, 311);
  f.caption(0, 14, 'online softmax, with real numbers');
  // block 1
  f.text(0, 42, 'block 1 scores', { size: 13, fill: BLUE });
  f.solid(0, 52, 210, 26, { fill: PALE_B, stroke: BLUE, sw: 1.2 });
  f.text(10, 70, '[ 1,  3,  2 ]', { size: 12.5, fill: INK, mono: true });
  f.text(230, 70, 'm = 3', { size: 12.5, fill: INK, mono: true });
  f.text(330, 70, 'l = 1.503', { size: 12.5, fill: INK, mono: true });
  f.text(470, 70, 'acc = p1 @ v1', { size: 12.5, fill: MUTED, mono: true });
  // block 2
  f.text(0, 106, 'block 2 scores', { size: 13, fill: ORANGE });
  f.solid(0, 116, 210, 26, { fill: PALE_O, stroke: ORANGE, sw: 1.2 });
  f.text(10, 134, '[ 5,  0 ]', { size: 12.5, fill: INK, mono: true });
  f.text(230, 134, '5 > 3 !', { size: 12.5, fill: ORANGE, mono: true });
  f.text(330, 134, 'everything so far', { size: 12, fill: ORANGE });
  f.text(330, 150, 'used the wrong max', { size: 12, fill: ORANGE });
  // the correction
  f.rect(0, 170, 700, 76, { fill: BLUE, fillStyle: 'solid', sw: 1.4 });
  f.text(12, 192, 'alpha = exp(m_old - m_new) = exp(3 - 5) = 0.135', { size: 12.5, fill: '#ffffff', mono: true });
  f.text(12, 214, 'l   = 1.503 x 0.135  +  (1 + 0.0067)  =  1.210', { size: 12.5, fill: '#ffffff', mono: true });
  f.text(12, 236, 'acc = acc   x 0.135  +  p2 @ v2', { size: 12.5, fill: '#ffffff', mono: true });
  f.text(430, 214, 'rescale the past,', { size: 12, fill: '#ffffff' });
  f.text(430, 236, 'then add the present', { size: 12, fill: '#ffffff' });
  f.text(0, 268, 'and the state is now EXACTLY what one pass over all five scores would give.', { size: 13, fill: INK });
  f.line(0, 284, 720, 284, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 304, 'One multiply per block corrects an unbounded amount of history, because every accumulated term carried the');
  f.caption(0, 322, 'same wrong normaliser. It is an identity, not an approximation — which is what "exact" means in the paper title.');
  return f.toSVG('Online softmax rescales the running sum and output when a later block contains a larger score');
};

// =================================================== 4. the flash loop (hand)
F.flash_loop = () => {
  const f = fig(740, 330, 313);
  f.caption(0, 14, 'one program, BM rows of output, and nothing written to DRAM');
  f.solid(0, 34, 150, 26, { fill: PALE_B, stroke: BLUE, sw: 1.2 });
  f.text(8, 52, 'Q tile [BM, D]', { size: 12, fill: INK, mono: true });
  f.text(160, 52, 'loaded once', { size: 12, fill: MUTED });
  // the KV walk
  f.text(0, 86, 'walk the keys in blocks of BN:', { size: 13, fill: INK });
  for (let i = 0; i < 4; i++) {
    const x = i * 78;
    f.solid(x, 96, 68, 24, { fill: i === 1 ? ORANGE : PALE_O, stroke: ORANGE, sw: 1.1 });
    f.text(x + 34, 113, 'K' + i, { size: 11.5, fill: i === 1 ? '#ffffff' : INK, anchor: 'middle', mono: true });
  }
  f.text(320, 113, '. . .', { size: 13, fill: MUTED });
  // the dashed SRAM box
  f.region(0, 132, 430, 130, { stroke: INK, sw: 1.7, dash: '6 4' });
  f.text(12, 152, 'in registers + shared memory only:', { size: 12.5, fill: INK });
  f.text(20, 176, 's   = Q @ Kj.T          [BM, BN]', { size: 12, fill: INK, mono: true });
  f.text(20, 196, 'm,l = update running stats', { size: 12, fill: BLUE, mono: true });
  f.text(20, 216, 'acc = acc*alpha + p @ Vj', { size: 12, fill: BLUE, mono: true });
  f.text(20, 240, 'then DISCARD s', { size: 12, fill: ORANGE, mono: true });
  f.text(446, 176, 'the BM x BN patch is the', { size: 12.5, fill: MUTED });
  f.text(446, 194, 'largest thing that exists', { size: 12.5, fill: MUTED });
  f.text(446, 212, 'at any moment.', { size: 12.5, fill: MUTED });
  f.text(446, 240, 'never S x S.', { size: 13, fill: ORANGE });
  f.arrow(215, 268, 215, 290, { stroke: MUTED });
  f.solid(60, 294, 310, 26, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(70, 312, 'O tile = acc / l      one division, at the end', { size: 12, fill: '#ffffff', mono: true });
  return f.toSVG('The FlashAttention loop keeps scores in shared memory and discards each block');
};

// ========================================================= 5. GQA (hand)
F.gqa = () => {
  const f = fig(740, 290, 317);
  f.caption(0, 14, 'grouped-query attention: 14 query heads, 2 KV heads');
  f.text(0, 44, 'query heads', { size: 13, fill: INK });
  for (let i = 0; i < 14; i++) {
    f.solid(0 + i * 32, 54, 26, 22, { fill: i < 7 ? PALE_B : '#e3edfb', stroke: BLUE, sw: 1 });
    f.text(13 + i * 32, 70, String(i), { size: 9.5, fill: INK, anchor: 'middle', mono: true });
  }
  // brackets make the 7:1 grouping visible; two lone arrows did not
  for (const [x0, x1, tx] of [[0, 220, 115], [224, 444, 339]]) {
    f.line(x0, 82, x1, 82, { stroke: MUTED, sw: 1.1, roughness: 0.4 });
    f.line(x0, 82, x0, 88, { stroke: MUTED, sw: 1, roughness: 0.3 });
    f.line(x1, 82, x1, 88, { stroke: MUTED, sw: 1, roughness: 0.3 });
    f.arrow((x0 + x1) / 2, 84, tx, 106, { stroke: MUTED });
  }
  f.text(0, 132, 'KV heads', { size: 13, fill: INK });
  f.solid(80, 108, 70, 26, { fill: ORANGE, fillStyle: 'solid', sw: 1.2 });
  f.text(115, 126, 'kv 0', { size: 11.5, fill: '#ffffff', anchor: 'middle', mono: true });
  f.solid(304, 108, 70, 26, { fill: ORANGE, fillStyle: 'solid', sw: 1.2 });
  f.text(339, 126, 'kv 1', { size: 11.5, fill: '#ffffff', anchor: 'middle', mono: true });
  f.text(400, 126, 'seven query heads share each one', { size: 12.5, fill: MUTED });
  f.text(0, 168, 'in the kernel it is one line:', { size: 13, fill: INK });
  f.rect(0, 178, 300, 28, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(10, 197, 'hkv = hq // 7', { size: 13, fill: '#ffffff', mono: true });
  f.text(320, 197, 'and it decides the largest number in this post', { size: 12.5, fill: BLUE });
  f.text(0, 232, 'KV bytes read per decode step, batch 32, 512 keys:', { size: 12.5, fill: INK });
  f.text(20, 254, 'GQA-native, 2 heads   :   8.4 MB', { size: 12.5, fill: BLUE, mono: true });
  f.text(20, 274, 'expanded to 14 heads  :  58.7 MB   <- 7x', { size: 12.5, fill: ORANGE, mono: true });
  return f.toSVG('Grouped-query attention: 14 query heads share 2 key-value heads, 7 to 1');
};

// ==================================================== 6. correctness (crisp)
F.correctness = () => {
  const X = e => (250 + (Math.log10(e) + 3.2) * 300).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">RMS(ERR) / RMS(TRUTH) VS AN FP64 REFERENCE  ·  B2 H14 SEQ512 CAUSAL  ·  LOG SCALE</text>`);
  const rows = [
    ['triton flash (mine)', 1.98e-3, BLUE],
    ['sdpa FLASH_ATTENTION', 1.98e-3, GRAY],
    ['naive, fp32 accumulate', 1.60e-3, ORANGE],
    ['sdpa MATH', 1.60e-3, GRAY],
  ];
  rows.forEach(([lab, e, col], i) => {
    const y = 34 + i * 34;
    L.push(`<text x="0" y="${y + 17}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="250" y="${y + 3}" width="${(+X(e) - 250).toFixed(1)}" height="20" fill="${col}" rx="3"/>`);
    L.push(`<text x="${(+X(e) + 8).toFixed(1)}" y="${y + 18}" font-family="monospace" font-size="12" fill="${col}">${e.toExponential(2)}</text>`);
  });
  L.push(`<path d="M 600 44 q 14 17 0 34" fill="none" stroke="${INK}" stroke-width="1.3"/>`);
  L.push(`<text x="622" y="65" font-family="monospace" font-size="11" fill="${INK}">identical</text>`);
  L.push(`<path d="M 600 112 q 14 17 0 34" fill="none" stroke="${INK}" stroke-width="1.3"/>`);
  L.push(`<text x="622" y="133" font-family="monospace" font-size="11" fill="${INK}">identical</text>`);
  L.push(`<line x1="0" y1="182" x2="700" y2="182" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="206" font-family="monospace" font-size="12" fill="${BLUE}">Two implementations agreeing to every digit is stronger than either being small.</text>`);
  L.push(`<text x="0" y="226" font-family="monospace" font-size="11.5" fill="${INK}">Flash is slightly LESS accurate than fp32 naive, by construction: P is cast to</text>`);
  L.push(`<text x="0" y="244" font-family="monospace" font-size="11.5" fill="${INK}">bf16 to feed the tensor cores. Production makes the same trade.</text>`);
  return `<svg viewBox="0 0 740 254" role="img" aria-label="The Triton kernel and PyTorch FlashAttention have identical error against an fp64 reference">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================================== 7. the metric lie (crisp)
F.metric_lie = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">OUTPUT MAGNITUDE DOWN A CAUSAL SEQUENCE  ·  SEQ 512</text>`);
  // magnitude falls with row index
  const pts = [[0, 0.821], [1, 0.62], [4, 0.40], [16, 0.25], [64, 0.145], [256, 0.085], [511, 0.060]];
  const X = r => (90 + Math.log2(r + 1) / 9 * 560).toFixed(1);
  const Y = m => (150 - m / 0.9 * 110).toFixed(1);
  for (const m of [0.2, 0.4, 0.6, 0.8]) {
    L.push(`<line x1="90" y1="${Y(m)}" x2="650" y2="${Y(m)}" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="82" y="${(+Y(m) + 4).toFixed(1)}" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="end">${m}</text>`);
  }
  L.push(`<polyline points="${pts.map(([r, m]) => `${X(r)},${Y(m)}`).join(' ')}" fill="none" stroke="${ORANGE}" stroke-width="2.2"/>`);
  for (const [r, m] of [pts[0], pts[pts.length - 1]]) {
    L.push(`<circle cx="${X(r)}" cy="${Y(m)}" r="5" fill="${ORANGE}"/>`);
  }
  L.push(`<text x="${(+X(0) + 10).toFixed(1)}" y="${(+Y(0.821) - 8).toFixed(1)}" font-family="monospace" font-size="10.5" fill="${ORANGE}">row 0: attends to ONE key, magnitude 0.82</text>`);
  L.push(`<text x="650" y="102" font-family="monospace" font-size="10.5" fill="${ORANGE}" text-anchor="end">row 511: averages 512 of them, 0.06</text>`);
  L.push(`<line x1="${X(511)}" y1="108" x2="${X(511)}" y2="${(+Y(0.06) - 8).toFixed(1)}" stroke="${ORANGE}" stroke-width="1" stroke-dasharray="2 2"/>`);
  L.push(`<line x1="90" y1="150" x2="650" y2="150" stroke="${INK}" stroke-width="1.1"/>`);
  L.push(`<text x="90" y="168" font-family="monospace" font-size="10.5" fill="${MUTED}">row 0</text>`);
  L.push(`<text x="650" y="168" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">row 511</text>`);
  L.push(`<line x1="0" y1="186" x2="700" y2="186" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="210" font-family="monospace" font-size="12" fill="${INK}">the same correct kernel, two metrics:</text>`);
  L.push(`<rect x="0" y="220" width="330" height="30" fill="${ORANGE}" rx="3"/>`);
  L.push(`<text x="10" y="240" font-family="monospace" font-size="12.5" fill="#fff">max|err| / RMS   =  5.29e-02</text>`);
  L.push(`<rect x="350" y="220" width="330" height="30" fill="${BLUE}" rx="3"/>`);
  L.push(`<text x="360" y="240" font-family="monospace" font-size="12.5" fill="#fff">RMS(err) / RMS  =  1.98e-03</text>`);
  L.push(`<text x="0" y="274" font-family="monospace" font-size="11" fill="${MUTED}">RMS is set by the many small rows, max error by the few large ones. Part 2's Lie 4 was the mirror of this.</text>`);
  return `<svg viewBox="0 0 740 284" role="img" aria-label="Causal output magnitude falls tenfold down the sequence, inflating a max-over-RMS error metric">\n  ${L.join('\n  ')}\n</svg>`;
};

// =============================================== 8. prefill performance (crisp)
F.prefill_perf = () => {
  const data = [
    ['B1 seq512', 16.1, 57, 1.233, 17.4],
    ['B1 seq1024', 20.1, 71, 1.081, 31.9],
    ['B1 seq2048', 24.0, 84, 1.060, 41.8],
    ['B2 seq2048', 25.6, 90, 1.052, 44.6],
    ['B8 seq2048', 26.1, 92, 0.983, 45.4],
  ];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">PREFILL ATTENTION, CAUSAL  ·  TRITON KERNEL THROUGHPUT VS THE BF16 PEAK</text>`);
  const sc = t => (t / 30 * 440).toFixed(1);
  data.forEach(([lab, tf, pct, k, vn], i) => {
    const y = 32 + i * 40;
    L.push(`<text x="0" y="${y + 18}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="120" y="${y + 3}" width="${sc(tf)}" height="22" fill="${BLUE}" rx="3"/>`);
    L.push(`<text x="128" y="${y + 19}" font-family="monospace" font-size="11.5" fill="#fff">${tf} TFLOP/s</text>`);
    L.push(`<text x="${(124 + +sc(tf)).toFixed(1)}" y="${y + 19}" font-family="monospace" font-size="11.5" fill="${BLUE}">${pct}%</text>`);
    L.push(`<text x="700" y="${y + 19}" font-family="monospace" font-size="10.5" fill="${k >= 1 ? MUTED : ORANGE}" text-anchor="end">${k.toFixed(3)}x sdpa  ·  ${vn.toFixed(0)}x naive</text>`);
  });
  L.push(`<line x1="${(120 + +sc(28.41)).toFixed(1)}" y1="26" x2="${(120 + +sc(28.41)).toFixed(1)}" y2="222" stroke="${ORANGE}" stroke-width="1.8" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${(120 + +sc(28.41) + 6).toFixed(1)}" y="238" font-family="monospace" font-size="10.5" fill="${ORANGE}" text-anchor="end">28.41 peak</text>`);
  L.push(`<text x="0" y="262" font-family="monospace" font-size="12" fill="${BLUE}">Prefill attention is compute-bound, and this reaches 92% of the ceiling.</text>`);
  L.push(`<text x="0" y="280" font-family="monospace" font-size="10.5" fill="${MUTED}">The 1.23x at seq 512 is fixed overhead, not arithmetic. At the shape a real prefill uses, PyTorch is slightly ahead.</text>`);
  return `<svg viewBox="0 0 740 290" role="img" aria-label="The Triton attention kernel reaches 92 percent of the bf16 tensor core peak on prefill">\n  ${L.join('\n  ')}\n</svg>`;
};

// ======================================================== 9. memory (crisp)
F.memory = () => {
  // ratios are naive/flash as measured, not recomputed from rounded labels
  const data = [
    ['prefill B1 seq512', 0.9, 41.4, 44], ['prefill B1 seq2048', 3.7, 574.6, 152],
    ['prefill B8 seq2048', 29.4, 4479.7, 148], ['decode B32 Sk1024', 0.1, 354.4, 5866],
    ['decode B32 Sk4096', 0.1, 1416.9, 23452],
  ];
  const X = mb => (150 + (Math.log10(Math.max(mb, 0.05)) + 1.4) * 95).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">PEAK MEMORY FOR ONE ATTENTION CALL, MB  ·  LOG SCALE</text>`);
  for (const m of [0.1, 1, 10, 100, 1000]) {
    L.push(`<line x1="${X(m)}" y1="26" x2="${X(m)}" y2="232" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="${X(m)}" y="248" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="middle">${m}</text>`);
  }
  data.forEach(([lab, fl, nv, ratio], i) => {
    const y = 34 + i * 38;
    L.push(`<text x="0" y="${y + 17}" font-family="monospace" font-size="11" fill="${INK}">${lab}</text>`);
    L.push(`<line x1="${X(fl)}" y1="${y + 12}" x2="${X(nv)}" y2="${y + 12}" stroke="${FAINT}" stroke-width="1.4"/>`);
    L.push(`<circle cx="${X(fl)}" cy="${y + 12}" r="5" fill="${BLUE}"/>`);
    L.push(`<circle cx="${X(nv)}" cy="${y + 12}" r="5" fill="${ORANGE}"/>`);
    L.push(`<text x="${(+X(nv) + 10).toFixed(1)}" y="${y + 16}" font-family="monospace" font-size="10.5" fill="${ORANGE}">${ratio}x</text>`);
  });
  L.push(`<text x="150" y="266" font-family="monospace" font-size="10.5" fill="${BLUE}">blue flash</text>`);
  L.push(`<text x="250" y="266" font-family="monospace" font-size="10.5" fill="${ORANGE}">orange naive</text>`);
  L.push(`<text x="0" y="292" font-family="monospace" font-size="12" fill="${ORANGE}">The naive path needs 4.5 GB for one prefill attention, on an 8 GB card.</text>`);
  L.push(`<text x="0" y="310" font-family="monospace" font-size="11.5" fill="${INK}">Flash needs 30 MB, and its footprint does not grow with sequence length at all.</text>`);
  L.push(`<text x="0" y="330" font-family="monospace" font-size="10.5" fill="${MUTED}">A 45x time saving is excellent. Being able to run the shape at all is categorical. That is why this mattered.</text>`);
  return `<svg viewBox="0 0 740 340" role="img" aria-label="Naive attention peaks at 4.5 GB for one prefill call against 30 MB for flash">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================== 10. decode decomposition (crisp)
F.decode_decomp = () => {
  const data = [
    ['Sk 128', 4.62, 0.99, 4.67], ['Sk 512', 5.34, 4.37, 1.22],
    ['Sk 1024', 5.44, 4.54, 1.20], ['Sk 2048', 5.26, 4.45, 1.18],
    ['Sk 4096', 5.20, 4.11, 1.26],
  ];
  const sc = v => ((v - 1) / 4.6 * 410).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">DECODE ATTENTION, ONE QUERY ROW, BATCH 32  ·  VS PYTORCH FLASHATTENTION</text>`);
  L.push(`<text x="120" y="32" font-family="monospace" font-size="10" fill="${MUTED}">TOTAL = GQA-native KV  x  kernel</text>`);
  data.forEach(([lab, tot, gqa, ker], i) => {
    const y = 40 + i * 44;
    L.push(`<text x="0" y="${y + 20}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="120" y="${y + 2}" width="${sc(gqa)}" height="14" fill="${ORANGE}" rx="2"/>`);
    L.push(`<rect x="${(120 + +sc(gqa)).toFixed(1)}" y="${y + 2}" width="${(+sc(tot) - +sc(gqa)).toFixed(1)}" height="14" fill="${BLUE}" rx="2"/>`);
    L.push(`<text x="${(124 + +sc(tot)).toFixed(1)}" y="${y + 14}" font-family="monospace" font-size="12.5" fill="${INK}">${tot.toFixed(2)}x</text>`);
    L.push(`<text x="124" y="${y + 32}" font-family="monospace" font-size="10" fill="${ORANGE}">GQA ${gqa.toFixed(2)}x</text>`);
    L.push(`<text x="220" y="${y + 32}" font-family="monospace" font-size="10" fill="${BLUE}">kernel ${ker.toFixed(2)}x</text>`);
  });
  L.push(`<line x1="120" y1="34" x2="120" y2="264" stroke="${INK}" stroke-width="1.4"/>`);
  L.push(`<text x="0" y="288" font-family="monospace" font-size="12" fill="${INK}">"5x faster than FlashAttention" is really 1.2x faster kernel, and a 4.4x</text>`);
  L.push(`<text x="0" y="306" font-family="monospace" font-size="12" fill="${ORANGE}">advantage from being allowed to exploit GQA at all. See the next figure.</text>`);
  L.push(`<text x="0" y="326" font-family="monospace" font-size="10.5" fill="${MUTED}">At Sk=128 the whole KV fits L2, so GQA buys nothing and the 4.7x is fixed cost in SDPA's kernel at tiny sizes.</text>`);
  return `<svg viewBox="0 0 740 336" role="img" aria-label="The 5x decode advantage factors into 4.4x from GQA and 1.2x from the kernel">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================ 11. the SDPA fallback (hand)
F.sdpa_fallback = () => {
  const f = fig(740, 300, 331);
  f.caption(0, 14, 'what enable_gqa=True actually does');
  f.rect(0, 30, 700, 30, { sw: 1.3, stroke: INK });
  f.text(10, 50, 'with sdpa_kernel(FLASH_ATTENTION):  sdpa(q, k, v, enable_gqa=True)', { size: 12, fill: INK, mono: true });
  f.arrow(350, 62, 350, 84, { stroke: MUTED });
  f.rect(0, 88, 340, 30, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(10, 108, 'returns correct numbers', { size: 12.5, fill: '#ffffff' });
  f.rect(360, 88, 340, 30, { fill: ORANGE, fillStyle: 'solid', sw: 1.3 });
  f.text(370, 108, 'from the MATH backend', { size: 12.5, fill: '#ffffff' });
  f.text(0, 142, 'and in a warning stream nobody reads:', { size: 13, fill: INK });
  f.rect(14, 152, 686, 66, { fill: '#f2f3f4', fillStyle: 'solid', sw: 1.2, stroke: GRAY });
  f.text(24, 172, 'UserWarning: Flash attention kernel not used because:', { size: 11.5, fill: MUTED, mono: true });
  f.text(24, 190, 'UserWarning: Flash attention has been runtime disabled.', { size: 11.5, fill: MUTED, mono: true });
  f.text(24, 210, 'both fused kernels require query, key and value to have the', { size: 11.5, fill: MUTED, mono: true });
  f.text(0, 242, 'so the choice is: expand KV to 14 heads and read 7x the bytes to get the', { size: 12.5, fill: INK });
  f.text(0, 260, 'fast kernel, or keep GQA and get the 4.5 GB one.', { size: 12.5, fill: ORANGE });
  f.caption(0, 284, 'The check is three lines: run it inside warnings.catch_warnings(record=True) and assert nothing says "not used".');
  return f.toSVG('enable_gqa returns correct numbers from the math backend and warns about it quietly');
};

// ====================================================== 12. autotuning (crisp)
F.autotune = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">72 CONFIGS SWEPT PER REGIME  ·  ONE-CONFIG DEFAULT VS BEST</text>`);
  const rows = [
    ['prefill B1 seq2048', 351.7, 356.9, 12.6, 'BM=64 BN=32 w4 s2', BLUE],
    ['decode  B32 Sk2048', 228.0, 613.5, 19.3, 'BM=16 BN=64 w4 s2', ORANGE],
  ];
  rows.forEach(([lab, best, dflt, worst, cfg, col], i) => {
    const y = 34 + i * 96;
    const sc = v => (v / 700 * 300).toFixed(1);
    L.push(`<text x="0" y="${y + 16}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="200" y="${y}" width="${sc(best)}" height="20" fill="${BLUE}" rx="3"/>`);
    L.push(`<text x="${(204 + +sc(best)).toFixed(1)}" y="${y + 15}" font-family="monospace" font-size="11.5" fill="${BLUE}">best ${best}us   ${cfg}</text>`);
    L.push(`<rect x="200" y="${y + 26}" width="${sc(dflt)}" height="20" fill="${col === ORANGE ? ORANGE : DIM}" rx="3"/>`);
    L.push(`<text x="${(204 + +sc(dflt)).toFixed(1)}" y="${y + 41}" font-family="monospace" font-size="11.5" fill="${col}">one config ${dflt}us  (${(dflt / best).toFixed(2)}x)</text>`);
    L.push(`<text x="200" y="${y + 64}" font-family="monospace" font-size="10.5" fill="${MUTED}">worst config in the sweep: ${worst}x off the best</text>`);
  });
  L.push(`<line x1="0" y1="222" x2="700" y2="222" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="246" font-family="monospace" font-size="12" fill="${ORANGE}">BM=64 computes 64 output rows when Sq=1 and throws away 63 of them.</text>`);
  L.push(`<text x="0" y="266" font-family="monospace" font-size="11.5" fill="${INK}">Part 4 ended by saying "autotune before you optimize". I did not, one post later,</text>`);
  L.push(`<text x="0" y="284" font-family="monospace" font-size="11.5" fill="${INK}">and every decode number in the first draft was 2.69x too slow.</text>`);
  return `<svg viewBox="0 0 740 294" role="img" aria-label="Using one config for every shape made the decode kernel 2.69 times slower than optimal">\n  ${L.join('\n  ')}\n</svg>`;
};

module.exports = F;
