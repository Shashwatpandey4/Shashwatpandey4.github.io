// Every figure for Part 3, keyed. Same two-style policy as Parts 1 and 2:
// hand-drawn (roughjs) for the conceptual ones, crisp for anything a reader
// compares by length.
//
// Part 3's recurring form is "predicted vs measured". Where both exist the
// prediction is GRAY and the measurement is BLUE or ORANGE, so the eye can find
// the honest number without reading the legend.
const { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT } = require('./rough.cjs');

const F = {};
const PALE_B = '#c7dbf6';
const PALE_O = '#f2cdbc';
const DIM = '#cbd1d6';

// ===================================================== 1. two levers (hand)
F.two_levers = () => {
  const f = fig(740, 300, 71);
  f.caption(0, 14, 'a bandwidth-bound kernel has exactly two escapes');
  f.rect(0, 30, 300, 30, { fill: INK, fillStyle: 'solid', sw: 1.3 });
  f.text(12, 51, '942 MB of weights, every step', { size: 13.5, fill: '#ffffff' });
  f.arrow(80, 66, 80, 96, { stroke: MUTED });
  f.arrow(300, 66, 460, 96, { stroke: MUTED });
  // lever 1
  f.text(0, 116, '1.  read them fewer times', { size: 14.5, fill: GRAY });
  f.text(14, 138, 'batch more tokens per step', { size: 12.5, fill: MUTED });
  f.text(14, 156, '(Part 2 §4: 951 -> 16 MB/token)', { size: 12.5, fill: MUTED, mono: true });
  f.rect(14, 168, 250, 28, { sw: 1.3, stroke: GRAY });
  f.text(24, 187, 'the serving system decides', { size: 12.5, fill: GRAY });
  // lever 2
  f.text(400, 116, '2.  make them smaller', { size: 14.5, fill: ORANGE });
  f.text(414, 138, 'store int8, compute bf16', { size: 12.5, fill: MUTED });
  f.text(414, 156, '942 MB -> 471 MB', { size: 12.5, fill: ORANGE, mono: true });
  f.rect(414, 168, 250, 28, { fill: ORANGE, fillStyle: 'solid', sw: 1.3 });
  f.text(424, 187, 'the kernel decides  <- this post', { size: 12.5, fill: '#ffffff' });
  f.line(0, 222, 720, 222, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 244, 'Neither is a faster kernel. Part 1 spent nine rungs raising arithmetic intensity and Part 2 showed that');
  f.caption(0, 262, 'arithmetic intensity is not the binding constraint here. Both escapes change the numerator instead: how');
  f.caption(0, 280, 'many bytes have to cross the bus at all.');
  f.caption(0, 298, 'They also compose — and §16 shows that the second one stops paying once you do enough of the first.');
  return f.toSVG('Two escapes from a bandwidth bound: batch more, or shrink the weights');
};

// ============================================== 2. int8 on the roofline (crisp)
F.int8_roofline = () => {
  const sc = v => (v / 1100 * 560).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">BYTES PER DECODE STEP, BF16 VS W8A16  ·  BATCH 16</text>`);
  const rows = [
    ['bf16', 942.2, 96.0, 38.9, ORANGE],
    ['W8A16', 471.1, 96.0, 38.9, BLUE],
  ];
  rows.forEach(([lab, w, kv, act, col], i) => {
    const y = 36 + i * 62;
    const tot = w + kv + act;
    L.push(`<text x="0" y="${y + 20}" font-family="monospace" font-size="13" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="76" y="${y}" width="${sc(w)}" height="28" fill="${col}"/>`);
    L.push(`<rect x="${(76 + +sc(w)).toFixed(1)}" y="${y}" width="${sc(kv)}" height="28" fill="${GRAY}"/>`);
    L.push(`<rect x="${(76 + +sc(w) + +sc(kv)).toFixed(1)}" y="${y}" width="${sc(act)}" height="28" fill="${DIM}"/>`);
    L.push(`<text x="86" y="${y + 19}" font-family="monospace" font-size="11.5" fill="#fff">weights ${w.toFixed(1)} MB</text>`);
    L.push(`<text x="${(82 + +sc(tot)).toFixed(1)}" y="${y + 19}" font-family="monospace" font-size="12.5" fill="${INK}">= ${tot.toFixed(1)} MB</text>`);
    L.push(`<text x="76" y="${y + 44}" font-family="monospace" font-size="10.5" fill="${MUTED}">KV cache ${kv.toFixed(1)} + activations ${act.toFixed(1)} — unchanged, still bf16</text>`);
  });
  L.push(`<line x1="0" y1="168" x2="700" y2="168" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="192" font-family="monospace" font-size="12" fill="${INK}">1077.1 / 606.0  =</text>`);
  const rs = v => ((v - 1) / 0.80 * 300).toFixed(1);
  L.push(`<rect x="230" y="178" width="${rs(1.78)}" height="22" fill="${BLUE}" rx="3"/>`);
  L.push(`<text x="${(234 + +rs(1.78)).toFixed(1)}" y="194" font-family="monospace" font-size="13" fill="${BLUE}">1.78x  ceiling</text>`);
  L.push(`<text x="0" y="228" font-family="monospace" font-size="12" fill="${INK}">written down BEFORE</text>`);
  L.push(`<text x="0" y="244" font-family="monospace" font-size="12" fill="${INK}">building the kernel:</text>`);
  L.push(`<rect x="230" y="212" width="${rs(1.652)}" height="20" fill="${GRAY}" rx="3"/>`);
  L.push(`<text x="${(234 + +rs(1.652)).toFixed(1)}" y="227" font-family="monospace" font-size="12" fill="${GRAY}">1.652x  traffic-weighted, batch 1</text>`);
  L.push(`<rect x="230" y="236" width="${rs(1.567)}" height="20" fill="${GRAY}" rx="3"/>`);
  L.push(`<text x="${(234 + +rs(1.567)).toFixed(1)}" y="251" font-family="monospace" font-size="12" fill="${GRAY}">1.567x  traffic-weighted, batch 16</text>`);
  L.push(`<line x1="230" y1="172" x2="230" y2="258" stroke="${INK}" stroke-width="1.3"/>`);
  L.push(`<text x="0" y="282" font-family="monospace" font-size="10.5" fill="${MUTED}">Below 1.78x: the KV cache and activations do not shrink, and k_proj / v_proj (0.2 MB) never reach the bus.</text>`);
  return `<svg viewBox="0 0 740 292" role="img" aria-label="int8 weights cut per-step traffic from 1077 to 606 MB, a 1.78x ceiling">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================== 3. exact dequantisation (hand)
F.dequant_exact = () => {
  const f = fig(740, 300, 83);
  f.caption(0, 14, 'why int8 -> bf16 loses nothing');
  f.text(0, 44, 'bf16, 16 bits:', { size: 13.5, fill: INK });
  const bw = 34;
  f.solid(130, 30, bw, 26, { fill: INK, stroke: INK, sw: 1.2 });
  f.text(147, 48, 'S', { size: 12, fill: '#ffffff', anchor: 'middle', mono: true });
  f.solid(166, 30, bw * 8, 26, { fill: GRAY, stroke: GRAY, sw: 1.2 });
  f.text(302, 48, '8 exponent bits', { size: 12, fill: '#ffffff', anchor: 'middle', mono: true });
  f.solid(440, 30, bw * 7, 26, { fill: BLUE, stroke: BLUE, sw: 1.2 });
  f.text(559, 48, '7 mantissa bits', { size: 12, fill: '#ffffff', anchor: 'middle', mono: true });
  f.text(130, 76, 'plus the implicit leading 1  ->  8 significant bits', { size: 12.5, fill: BLUE, mono: true });
  f.text(130, 96, 'so every integer 0..256 is exactly representable', { size: 12.5, fill: INK, mono: true });
  f.line(0, 118, 720, 118, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.text(0, 146, 'int8 weight:', { size: 13.5, fill: INK });
  f.solid(130, 132, 300, 26, { fill: PALE_O, stroke: ORANGE, sw: 1.3 });
  f.text(280, 150, '-128 ... +127', { size: 13, fill: INK, anchor: 'middle', mono: true });
  f.text(444, 150, 'fits inside 0..256 with room to spare', { size: 12.5, fill: ORANGE });
  f.arrow(280, 166, 280, 196, { stroke: MUTED });
  f.text(300, 188, 'exact, every value, no rounding', { size: 13, fill: BLUE });
  f.rect(0, 206, 340, 32, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(12, 227, 'all W8A16 error is in the QUANTISER', { size: 13, fill: '#ffffff' });
  f.rect(360, 206, 340, 32, { sw: 1.3, stroke: GRAY });
  f.text(372, 227, 'none of it is in the kernel', { size: 13, fill: GRAY });
  f.caption(0, 264, 'This is specific to 8-bit weights. bf16 has exactly enough significand for int8 and no more, which is also why');
  f.caption(0, 282, 'the int4 bit trick in §10 works — and why the same approach would not extend to int16 weights.');
  return f.toSVG('bf16 represents every integer to 256 exactly, so int8 dequantisation is lossless');
};

// ================================================ 4. scale placement (hand)
F.scale_placement = () => {
  const f = fig(740, 320, 97);
  f.caption(0, 14, 'where the scale multiply has to happen');
  // per-channel
  f.text(0, 42, 'PER-CHANNEL: one scale per output column', { size: 13.5, fill: BLUE });
  f.grid(0, 52, 12, 3, 20, { outline: true });
  f.cells(0, 52, 20, [[0, 0], [0, 1], [0, 2]], { fill: PALE_B });
  f.text(252, 58, 'K = 896 ->', { size: 11.5, fill: MUTED, mono: true });
  f.text(252, 82, 's[n] is constant', { size: 12.5, fill: INK });
  f.text(252, 100, 'all the way down K', { size: 12.5, fill: BLUE });
  f.rect(420, 58, 280, 30, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(430, 78, 'factors out -> EPILOGUE, once', { size: 13, fill: '#ffffff', mono: true });
  f.text(420, 106, 'K loop stays pure int -> bf16', { size: 12, fill: MUTED });
  f.line(0, 132, 720, 132, { stroke: FAINT, sw: 1, roughness: 0.4 });
  // group-wise
  f.text(0, 160, 'GROUP-128: a new scale every 128 columns', { size: 13.5, fill: ORANGE });
  f.grid(0, 170, 12, 3, 20, { outline: true });
  for (let g = 0; g < 4; g++) {
    f.region(g * 60, 170, 60, 60, { stroke: ORANGE, sw: 1.4, dash: '4 3' });
    f.text(g * 60 + 30, 246, `s[n,${g}]`, { size: 10.5, fill: ORANGE, anchor: 'middle', mono: true });
  }
  f.text(252, 194, 's[n,g] changes', { size: 12.5, fill: INK });
  f.text(252, 212, 'partway down K', { size: 12.5, fill: ORANGE });
  f.rect(420, 176, 280, 30, { fill: ORANGE, fillStyle: 'solid', sw: 1.3 });
  f.text(430, 196, 'cannot factor -> IN the K loop', { size: 13, fill: '#ffffff', mono: true });
  f.text(420, 224, 'one multiply per group per lane;', { size: 12, fill: MUTED });
  f.text(420, 242, 'group boundary must align to the', { size: 12, fill: MUTED });
  f.text(420, 260, 'MMA K-step or the indexing rots', { size: 12, fill: MUTED });
  f.caption(0, 290, 'The in-loop version costs more, and I shipped it anyway: group-128 had LOWER output error than per-channel on');
  f.caption(0, 308, 'every projection (6.7e-3 vs up to 1.15e-2), because one large weight no longer stretches the scale for 4864 of them.');
  return f.toSVG('Per-channel scales factor out of the K loop; group-wise scales cannot');
};

// ==================================================== 5. wmma vs mma (hand)
F.wmma_vs_mma = () => {
  const f = fig(740, 300, 103);
  f.caption(0, 14, 'the same tile, two interfaces');
  // wmma
  f.text(0, 42, 'wmma  (what I tried first)', { size: 14, fill: GRAY });
  f.rect(0, 54, 300, 26, { fill: PALE_O, fillStyle: 'solid', sw: 1.2 });
  f.text(10, 72, 'int8 tile in shared memory', { size: 12, fill: INK, mono: true });
  f.arrow(150, 84, 150, 104, { stroke: ORANGE });
  f.text(164, 100, 'must expand FIRST', { size: 12, fill: ORANGE });
  f.rect(0, 108, 300, 26, { fill: DIM, fillStyle: 'solid', sw: 1.2 });
  f.text(10, 126, 'bf16 tile in shared memory', { size: 12, fill: INK, mono: true });
  f.text(0, 152, '<- 2x the smem, all the bytes back', { size: 12, fill: ORANGE });
  f.arrow(150, 160, 150, 182, { stroke: MUTED });
  f.rect(0, 186, 300, 26, { sw: 1.3, stroke: GRAY });
  f.text(10, 204, 'load_matrix_sync -> fragment', { size: 12, fill: GRAY, mono: true });
  f.text(0, 230, 'opaque: no hook between', { size: 12.5, fill: MUTED });
  f.text(0, 248, 'smem and fragment', { size: 12.5, fill: MUTED });
  f.text(0, 272, 'reached 90 GB/s of 227', { size: 13, fill: ORANGE, mono: true });
  f.line(340, 34, 340, 286, { stroke: FAINT, sw: 1.2, roughness: 0.4 });
  // mma.sync
  f.text(380, 42, 'mma.sync  (what shipped)', { size: 14, fill: BLUE });
  f.rect(380, 54, 300, 26, { fill: PALE_O, fillStyle: 'solid', sw: 1.2 });
  f.text(390, 72, 'int8 tile in shared memory', { size: 12, fill: INK, mono: true });
  f.arrow(530, 84, 530, 182, { stroke: BLUE });
  f.text(544, 110, 'each lane reads its own', { size: 12, fill: BLUE });
  f.text(544, 128, 'bytes and converts them', { size: 12, fill: BLUE });
  f.text(544, 146, 'in REGISTERS', { size: 12, fill: BLUE });
  f.rect(380, 186, 300, 26, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(390, 204, '{b0, b1} -> mma.sync', { size: 12, fill: '#ffffff', mono: true });
  f.text(380, 230, 'smem only ever holds int8,', { size: 12.5, fill: MUTED });
  f.text(380, 248, 'so twice the K fits in it', { size: 12.5, fill: MUTED });
  f.text(380, 272, 'reached 216 GB/s of 227', { size: 13, fill: BLUE, mono: true });
  return f.toSVG('wmma forces dequantisation in shared memory; mma.sync allows it in registers');
};

// ==================================================== 6. mma / ldmatrix (hand)
F.mma_lanes = () => {
  const f = fig(740, 356, 109);
  f.caption(0, 14, 'ldmatrix.sync.aligned.m8n8.x4.shared.b16');
  f.text(0, 44, 'shared memory, A tile (bf16, row-major)', { size: 13, fill: INK });
  f.grid(0, 54, 16, 8, 17, { outline: true });
  for (let r = 0; r < 8; r++) f.cells(0, 54, 17, [[0, r]], { fill: PALE_B });
  f.text(0, 210, 'each of 32 lanes supplies ONE row address', { size: 12.5, fill: MUTED });
  f.chip(0, 220, 't0', { fill: BLUE });
  f.chip(40, 220, 't1', { fill: BLUE });
  f.chip(80, 220, 't2', { fill: BLUE });
  f.text(122, 234, '...', { size: 13, fill: MUTED });
  f.chip(146, 220, 't31', { fill: BLUE });
  f.arrow(292, 130, 356, 130, { stroke: BLUE });
  f.text(296, 120, '1 instr', { size: 11.5, fill: BLUE, mono: true });
  // four 8x8 tiles delivered
  f.text(370, 44, 'four 8x8 tiles, already permuted', { size: 13, fill: INK });
  const names = ['a0', 'a1', 'a2', 'a3'];
  for (let i = 0; i < 4; i++) {
    const x = 370 + (i % 2) * 150, y = 54 + Math.floor(i / 2) * 90;
    f.grid(x, y, 8, 8, 9, { outline: true });
    f.text(x + 36, y + 86, names[i], { size: 12, fill: BLUE, anchor: 'middle', mono: true });
  }
  f.text(0, 268, 'a shared-memory transpose, free,', { size: 12.5, fill: MUTED });
  f.text(0, 286, 'with no bank-conflict problem to solve', { size: 12.5, fill: MUTED });
  f.line(0, 306, 720, 306, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 326, 'A is the activation matrix and stays bf16, so ldmatrix handles it directly. B is the weight matrix, where the');
  f.caption(0, 344, 'int8 lives — and B is the fragment the next figure builds by hand.');
  return f.toSVG('ldmatrix.x4 delivers four 8x8 tiles in mma.sync fragment layout in one instruction');
};

// ================================================== 7. B fragment gather (hand)
F.bfrag_gather = () => {
  const f = fig(740, 320, 127);
  f.caption(0, 14, 'how one lane builds its B fragment, dequantising on the way');
  f.text(0, 44, 'shared memory, B tile (int8, [N][K])', { size: 13, fill: INK });
  f.grid(0, 54, 16, 8, 18, { outline: true });
  // lane 5: n = (5%4)*2 = 2, k = (5/4)*2 = 2  -> (k=2,3) and (k=10,11) at n=2,3
  f.cells(0, 54, 18, [[2, 2], [3, 2], [2, 3], [3, 3]], { fill: ORANGE });
  f.cells(0, 54, 18, [[10, 2], [11, 2], [10, 3], [11, 3]], { fill: ORANGE, opacity: 0.55 });
  f.text(200, 44, 'K ->', { size: 11.5, fill: MUTED, mono: true });
  f.text(300, 66, 'N (output channels) runs down', { size: 11.5, fill: MUTED });
  f.chip(300, 88, 't5', { fill: ORANGE });
  f.text(300, 128, 'lane 5:', { size: 12.5, fill: INK, mono: true });
  f.text(300, 146, 'n = (t % 4) * 2  = 2', { size: 12, fill: MUTED, mono: true });
  f.text(300, 164, 'k = (t / 4) * 2  = 2', { size: 12, fill: MUTED, mono: true });
  f.text(300, 182, 'and k + 8      = 10', { size: 12, fill: MUTED, mono: true });
  f.text(300, 210, 'two 16-bit loads', { size: 12.5, fill: ORANGE });
  f.text(300, 228, '= four int8 weights', { size: 12.5, fill: ORANGE });
  f.arrow(470, 150, 520, 150, { stroke: MUTED });
  f.rect(530, 100, 170, 30, { fill: PALE_O, fillStyle: 'solid', sw: 1.2 });
  f.text(540, 120, 'int8 x4 in a reg', { size: 12, fill: INK, mono: true });
  f.arrow(615, 134, 615, 158, { stroke: BLUE });
  f.text(628, 150, 'convert', { size: 11.5, fill: BLUE });
  f.rect(530, 162, 170, 30, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(540, 182, '{b0, b1} bf16', { size: 12, fill: '#ffffff', mono: true });
  f.text(530, 214, 'never written back', { size: 12, fill: MUTED });
  f.text(530, 232, 'to shared memory', { size: 12, fill: MUTED });
  f.line(0, 254, 720, 254, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 274, 'Weights stay in nn.Linear’s native [N][K] layout, so the plugin quantises in place — no repacking pass and no');
  f.caption(0, 292, 'second copy of the weights at load time. The cost is a strided read per lane, which is cheap because it hits');
  f.caption(0, 310, 'shared memory, not DRAM. Scales are [N][K/G]: one load per group per lane.');
  return f.toSVG('A lane gathers four int8 weights with two 16-bit loads and dequantises them in registers');
};

// ==================================================== 8. kb8 speedups (crisp)
F.kb8_speedups = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">KB8 MMA.SYNC W8A16 VS CUBLAS BF16  ·  BATCH 1, STREAMED, INTERLEAVED</text>`);
  const rows = [
    ['gate_up  N=9728', 2.031, 216.0, 212.7],
    ['lm_head  N=151936', 1.918, 221.5, 231.0],
    ['down_proj  K=4864', 1.810, 142.8, 157.7],
    ['qkv  N=1152', 1.694, 137.5, 162.3],
    ['o_proj  N=896', 1.665, 115.2, 138.4],
  ];
  L.push(`<text x="300" y="32" font-family="monospace" font-size="10" fill="${MUTED}">SPEEDUP</text>`);
  L.push(`<text x="516" y="32" font-family="monospace" font-size="10" fill="${MUTED}">GB/S: MINE  /  CUBLAS</text>`);
  rows.forEach(([lab, sp, mine, cub], i) => {
    const y = 40 + i * 38;
    L.push(`<text x="0" y="${y + 16}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="180" y="${y + 2}" width="${((sp - 1) / 1.1 * 260).toFixed(1)}" height="20" fill="${BLUE}" rx="3"/>`);
    L.push(`<text x="${(184 + (sp - 1) / 1.1 * 260).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="12.5" fill="${BLUE}">${sp.toFixed(3)}x</text>`);
    const worse = mine < cub;
    L.push(`<text x="516" y="${y + 17}" font-family="monospace" font-size="12" fill="${worse ? ORANGE : INK}">${mine.toFixed(1)}</text>`);
    L.push(`<text x="572" y="${y + 17}" font-family="monospace" font-size="12" fill="${MUTED}">/  ${cub.toFixed(1)}</text>`);
    if (worse) L.push(`<text x="648" y="${y + 17}" font-family="monospace" font-size="11" fill="${ORANGE}">slower bus!</text>`);
  });
  L.push(`<line x1="180" y1="34" x2="180" y2="228" stroke="${INK}" stroke-width="1.4"/>`);
  L.push(`<text x="180" y="246" font-family="monospace" font-size="10.5" fill="${INK}" text-anchor="middle">1.0x</text>`);
  L.push(`<text x="0" y="274" font-family="monospace" font-size="11.5" fill="${ORANGE}">o_proj achieves 17% LOWER bandwidth than cuBLAS and is 1.665x faster.</text>`);
  L.push(`<text x="0" y="292" font-family="monospace" font-size="11.5" fill="${INK}">On a bandwidth-bound problem GB/s is not the score. Bytes are.</text>`);
  L.push(`<text x="0" y="312" font-family="monospace" font-size="10.5" fill="${MUTED}">Sampled fp64 error 6.2e-3 to 1.2e-2; cuBLAS's own bf16 rounding is about 6.1e-3. Batch 16 spans 1.389x-2.057x.</text>`);
  return `<svg viewBox="0 0 740 322" role="img" aria-label="The int8 kernel wins every decode shape while achieving lower bandwidth than cuBLAS on four of five">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================== 9. OOB address (hand)
F.oob_address = () => {
  const f = fig(740, 300, 131);
  f.caption(0, 14, 'a guarded load that still faulted');
  f.text(0, 44, 'A, at M = 1, with a 16-row tile', { size: 13, fill: INK });
  f.grid(0, 54, 14, 1, 20, { outline: true });
  f.cells(0, 54, 20, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
                      [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0]], { fill: PALE_B });
  f.text(292, 70, 'row 0: real', { size: 12.5, fill: BLUE });
  for (let r = 1; r < 6; r++) {
    f.region(0, 54 + r * 20, 280, 20, { stroke: ORANGE, sw: 1.1, dash: '3 3' });
  }
  f.text(292, 118, 'rows 1..15: do not exist', { size: 12.5, fill: ORANGE });
  f.text(292, 136, 'never fetched — the copy was', { size: 12.5, fill: MUTED });
  f.text(292, 154, 'predicated off, correctly', { size: 12.5, fill: MUTED });
  f.line(0, 186, 720, 186, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.text(0, 210, 'what I had wrong:', { size: 13.5, fill: INK });
  f.rect(0, 220, 340, 30, { sw: 1.3, stroke: GRAY });
  f.text(10, 240, 'predicate suppresses the COPY', { size: 12.5, fill: GRAY, mono: true });
  f.rect(360, 220, 340, 30, { fill: ORANGE, fillStyle: 'solid', sw: 1.3 });
  f.text(370, 240, 'not the ADDRESS COMPUTATION', { size: 12.5, fill: '#ffffff', mono: true });
  f.caption(0, 270, 'The address for row 15 was still being formed, 15·K elements past the end of A. Forming an out-of-range address is');
  f.caption(0, 288, 'itself the fault. Fix: clamp instead of predicate — ar = g < M ? g : M-1 — so every lane forms a legal address.');
  return f.toSVG('cp.async predication suppresses the copy but not the address computation');
};

// ================================================== 10. int4 bit trick (hand)
F.int4_bits = () => {
  const f = fig(740, 290, 137);
  f.caption(0, 14, 'unpacking an int4 with one OR');
  f.text(0, 46, 'one byte:', { size: 13, fill: INK });
  f.solid(90, 32, 150, 28, { fill: ORANGE, stroke: ORANGE, sw: 1.2 });
  f.text(165, 51, 'nib 1', { size: 12, fill: '#ffffff', anchor: 'middle', mono: true });
  f.solid(240, 32, 150, 28, { fill: PALE_O, stroke: ORANGE, sw: 1.2 });
  f.text(315, 51, 'nib 0', { size: 12, fill: INK, anchor: 'middle', mono: true });
  f.text(404, 51, 'two weights, biased +8 so each is 0..15', { size: 12.5, fill: MUTED });
  f.text(0, 100, 'bf16 128.0  =', { size: 13, fill: INK, mono: true });
  f.solid(140, 84, 260, 28, { fill: GRAY, stroke: GRAY, sw: 1.2 });
  f.text(270, 103, '0x4300', { size: 13, fill: '#ffffff', anchor: 'middle', mono: true });
  f.text(414, 103, 'low four bits are the mantissa tail: zero', { size: 12.5, fill: MUTED });
  f.text(0, 148, '0x4300 | nib =', { size: 13, fill: INK, mono: true });
  f.solid(140, 132, 260, 28, { fill: BLUE, stroke: BLUE, sw: 1.2 });
  f.text(270, 151, 'bf16(128 + nib)', { size: 13, fill: '#ffffff', anchor: 'middle', mono: true });
  f.text(414, 151, 'an integer became a float, exactly', { size: 12.5, fill: BLUE });
  f.arrow(270, 164, 270, 190, { stroke: MUTED });
  f.rect(100, 196, 400, 30, { sw: 1.3, stroke: INK });
  f.text(112, 216, 'subtract 136 in the epilogue -> the signed value', { size: 12.5, fill: INK, mono: true });
  f.caption(0, 254, 'No conversion instruction, no lookup, no multiply: the OR lands the nibble exactly where bf16 keeps its last four');
  f.caption(0, 272, 'significand bits. It only works because bf16 has exactly 8 significant bits (§3). It is also the fastest part of a');
  f.caption(0, 288, 'kernel I could not ship.');
  return f.toSVG('The 0x4300 OR nibble trick converts an int4 to bf16 with a single OR');
};

// ================================================= 11. int4 error (crisp)
F.int4_error = () => {
  const X = e => (250 + (Math.log10(e) + 3) * 145).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">GEMM OUTPUT RELATIVE ERROR  ·  o_proj  ·  LOG SCALE</text>`);
  for (const e of [1e-3, 1e-2, 1e-1]) {
    L.push(`<line x1="${X(e)}" y1="30" x2="${X(e)}" y2="234" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="${X(e)}" y="252" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="middle">${e}</text>`);
  }
  const rows = [
    ['cuBLAS bf16 (noise floor)', 6.1e-3, GRAY],
    ['int8, group 128', 7.41e-3, BLUE],
    ['int4, group 8', 7.52e-2, ORANGE],
    ['int4, group 16', 8.94e-2, ORANGE],
    ['int4, group 32', 1.04e-1, ORANGE],
    ['int4, group 64', 1.17e-1, ORANGE],
    ['int4, group 128', 1.34e-1, ORANGE],
  ];
  rows.forEach(([lab, e, col], i) => {
    const y = 34 + i * 28;
    L.push(`<text x="0" y="${y + 15}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="250" y="${y + 2}" width="${(+X(e) - 250).toFixed(1)}" height="18" fill="${col}" rx="3"/>`);
    L.push(`<text x="${(+X(e) + 8).toFixed(1)}" y="${y + 16}" font-family="monospace" font-size="11.5" fill="${col}">${(e * 100).toFixed(e < 1e-2 ? 2 : 1)}%</text>`);
  });
  L.push(`<rect x="${X(5e-3)}" y="30" width="${(+X(9e-3) - +X(5e-3)).toFixed(1)}" height="60" fill="${BLUE}" opacity="0.08"/>`);
  L.push(`<text x="${X(9e-3)}" y="26" font-family="monospace" font-size="10.5" fill="${BLUE}">int8 is inside the library's own noise</text>`);
  L.push(`<text x="0" y="280" font-family="monospace" font-size="11.5" fill="${ORANGE}">Round-to-nearest int4 is two orders of magnitude worse, at every group size.</text>`);
  L.push(`<text x="0" y="298" font-family="monospace" font-size="10.5" fill="${MUTED}">Even group 8 is still 7%, and is small enough that the scales stop saving space. The fix is a better quantiser.</text>`);
  return `<svg viewBox="0 0 740 308" role="img" aria-label="int8 group-128 error is within cuBLAS bf16 noise while int4 is 7 to 13 percent at every group size">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================== 12. gap accounting (crisp)
F.gap_accounting = () => {
  const sc = v => ((v - 1) / 0.70 * 380).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">WHERE +65% BECAME +4%  ·  BATCH 1, HUGGINGFACE EAGER LOOP</text>`);
  const rows = [
    ['GEMM alone, microbenchmark', 1.652, BLUE, 'traffic-weighted over all five shapes'],
    ['x Amdahl on GPU time', 1.502, GRAY, 'GEMM is 84.7% of decode GPU time'],
    ['x Amdahl on WALL time', 1.115, GRAY, '69% of an eager step is not GPU work'],
    ['measured, HF A/B interleaved', 1.036, ORANGE, '15.72 -> 15.17 ms/token'],
  ];
  rows.forEach(([lab, v, col, note], i) => {
    const y = 36 + i * 52;
    L.push(`<text x="0" y="${y + 15}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="250" y="${y + 2}" width="${Math.max(+sc(v), 2).toFixed(1)}" height="20" fill="${col}" rx="3"/>`);
    L.push(`<text x="${(254 + Math.max(+sc(v), 2)).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="13" fill="${col}">${v.toFixed(3)}x</text>`);
    L.push(`<text x="250" y="${y + 38}" font-family="monospace" font-size="10.5" fill="${MUTED}">${note}</text>`);
  });
  L.push(`<line x1="250" y1="30" x2="250" y2="228" stroke="${INK}" stroke-width="1.4"/>`);
  L.push(`<text x="0" y="262" font-family="monospace" font-size="11.5" fill="${INK}">Nothing unexplained is left. The biggest single term is not about kernels at all.</text>`);
  L.push(`<line x1="0" y1="276" x2="700" y2="276" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="300" font-family="monospace" font-size="12" fill="${BLUE}">Same kernel, under vLLM (graphs + compile, so wall time IS GPU time):</text>`);
  L.push(`<rect x="250" y="310" width="${sc(1.502)}" height="18" fill="${DIM}" rx="3"/>`);
  L.push(`<text x="${(254 + +sc(1.502)).toFixed(1)}" y="324" font-family="monospace" font-size="12" fill="${GRAY}">1.502x ceiling</text>`);
  L.push(`<rect x="250" y="332" width="${sc(1.397)}" height="18" fill="${BLUE}" rx="3"/>`);
  L.push(`<text x="${(254 + +sc(1.397)).toFixed(1)}" y="346" font-family="monospace" font-size="12" fill="${BLUE}">1.397x measured (93% of it)</text>`);
  return `<svg viewBox="0 0 740 358" role="img" aria-label="The microbenchmark to end-to-end gap accounted for by Amdahl on GPU time and on wall time">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================================== 13. graph overhead (crisp)
F.overhead = () => {
  const sc = v => (v / 24 * 520).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">ONE DECODE STEP, MILLISECONDS  ·  EAGER VS CUDA GRAPH</text>`);
  const rows = [['bf16', 22.100, 6.846, 3.23], ['W8A16', 19.300, 5.690, 3.39]];
  rows.forEach(([lab, eager, graph, x], i) => {
    const y = 36 + i * 76;
    L.push(`<text x="0" y="${y + 16}" font-family="monospace" font-size="12.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="76" y="${y + 2}" width="${sc(graph)}" height="22" fill="${BLUE}" rx="3"/>`);
    L.push(`<rect x="${(76 + +sc(graph)).toFixed(1)}" y="${y + 2}" width="${(+sc(eager) - +sc(graph)).toFixed(1)}" height="22" fill="${ORANGE}" rx="3"/>`);
    L.push(`<text x="82" y="${y + 18}" font-family="monospace" font-size="11" fill="#fff">GPU ${graph.toFixed(2)}</text>`);
    L.push(`<text x="${(82 + +sc(graph)).toFixed(1)}" y="${y + 18}" font-family="monospace" font-size="11" fill="#fff">Python + launch overhead</text>`);
    L.push(`<text x="${(80 + +sc(eager)).toFixed(1)}" y="${y + 18}" font-family="monospace" font-size="12" fill="${INK}">${eager.toFixed(1)} ms eager</text>`);
    L.push(`<text x="76" y="${y + 42}" font-family="monospace" font-size="11.5" fill="${BLUE}">graphs are worth ${x}x here</text>`);
    L.push(`<text x="300" y="${y + 42}" font-family="monospace" font-size="11" fill="${MUTED}">${(100 - graph / eager * 100).toFixed(0)}% of the eager step was not GPU work</text>`);
  });
  L.push(`<line x1="0" y1="196" x2="700" y2="196" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="220" font-family="monospace" font-size="11.5" fill="${ORANGE}">3.2x, from a framework feature, dwarfing everything in Parts 1 and 2 combined.</text>`);
  L.push(`<text x="0" y="238" font-family="monospace" font-size="10.5" fill="${MUTED}">Optimizing a kernel in a harness that spends 69% of its time in Python measures the harness. Hence vLLM from here on.</text>`);
  return `<svg viewBox="0 0 740 248" role="img" aria-label="CUDA graphs cut the decode step from 22.1 to 6.85 ms, a 3.2x win from a framework feature">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================= 14. torch.compile (hand)
F.torch_compile = () => {
  const f = fig(740, 320, 149);
  f.caption(0, 14, 'the kernel that was never called');
  f.text(0, 42, 'my apply():', { size: 13, fill: INK });
  f.rect(0, 52, 330, 76, { sw: 1.3, stroke: INK });
  f.text(12, 74, 'if flat.shape[0] <= 16:', { size: 12, fill: INK, mono: true });
  f.text(28, 92, 'return w8a16_gemm(...)', { size: 12, fill: BLUE, mono: true });
  f.text(12, 110, 'return F.linear(...)', { size: 12, fill: ORANGE, mono: true });
  f.text(0, 150, 'what I assumed:', { size: 13, fill: GRAY });
  f.text(14, 172, 'a runtime decision, per call', { size: 12.5, fill: GRAY });
  f.text(0, 204, 'what torch.compile does:', { size: 13, fill: ORANGE });
  f.text(14, 226, 'traces with ONE shape,', { size: 12.5, fill: ORANGE });
  f.text(14, 244, 'resolves the `if` at TRACE time,', { size: 12.5, fill: ORANGE });
  f.text(14, 262, 'bakes the branch into the graph', { size: 12.5, fill: ORANGE });
  // the graph
  f.text(400, 42, 'the captured graph:', { size: 13, fill: INK });
  f.rect(400, 52, 300, 30, { fill: DIM, fillStyle: 'solid', sw: 1.2 });
  f.text(410, 72, 'trace batch: 2048 rows', { size: 12, fill: INK, mono: true });
  f.arrow(550, 86, 550, 108, { stroke: ORANGE });
  f.text(562, 102, '2048 > 16', { size: 11.5, fill: ORANGE, mono: true });
  f.rect(400, 112, 300, 30, { fill: ORANGE, fillStyle: 'solid', sw: 1.3 });
  f.text(410, 132, 'F.linear baked in. No branch.', { size: 12, fill: '#ffffff', mono: true });
  f.arrow(550, 146, 550, 170, { stroke: MUTED });
  f.rect(400, 174, 300, 30, { sw: 1.3, stroke: GRAY });
  f.text(410, 194, 'every later call replays THIS', { size: 12, fill: GRAY, mono: true });
  f.text(400, 226, 'kernel calls counted: 0', { size: 13.5, fill: ORANGE, mono: true });
  f.text(400, 248, 'reported speedup:  1.01x', { size: 13.5, fill: ORANGE, mono: true });
  f.line(0, 278, 720, 278, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 298, 'A Python conditional inside a traced function is not a runtime decision — it is a compile-time one, decided once,');
  f.caption(0, 316, 'by whichever shape arrived first. The counter that found this is three lines and I should have had it on day one.');
  return f.toSVG('torch.compile resolved a shape guard at trace time, baking the fallback into every graph');
};

// ================================================== 15. wrong layers (crisp)
F.wrong_layers = () => {
  const sc = v => (v / 1.8 * 460).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">EARLIER WMMA KERNEL VS F.LINEAR, PER SHAPE  ·  BATCH 1, IN SITU</text>`);
  const rows = [
    ['gate/up_proj    8.3 MB', 1.632, BLUE],
    ['lm_head       259.7 MB', 1.519, BLUE],
    ['gate_up fused  16.6 MB', 1.043, GRAY],
    ['q/o_proj        1.5 MB', 1.018, GRAY],
    ['down_proj       8.3 MB', 0.877, ORANGE],
  ];
  rows.forEach(([lab, v, col], i) => {
    const y = 34 + i * 36;
    L.push(`<text x="0" y="${y + 16}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="200" y="${y + 2}" width="${sc(v)}" height="20" fill="${col}" rx="3"/>`);
    L.push(v < 1
      ? `<text x="${(200 + +sc(v) - 8).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="12.5" fill="#fff" text-anchor="end">${v.toFixed(3)}x</text>`
      : `<text x="${(200 + +sc(v) + 8).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="12.5" fill="${col}">${v.toFixed(3)}x</text>`);
  });
  L.push(`<line x1="${(200 + +sc(1.0)).toFixed(1)}" y1="28" x2="${(200 + +sc(1.0)).toFixed(1)}" y2="212" stroke="${INK}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${(200 + +sc(1.0)).toFixed(1)}" y="228" font-family="monospace" font-size="11" fill="${INK}" text-anchor="middle">1.0x</text>`);
  L.push(`<text x="0" y="256" font-family="monospace" font-size="11.5" fill="${ORANGE}">k_proj and v_proj are 0.2 MB. They never reach the bus, so halving them does nothing.</text>`);
  L.push(`<text x="0" y="274" font-family="monospace" font-size="11.5" fill="${INK}">Converting all 169 Linears therefore made the Linear layers slower in aggregate.</text>`);
  L.push(`<text x="0" y="294" font-family="monospace" font-size="10.5" fill="${MUTED}">Interim fix: calibrate at load time, keep whichever path wins. Real fix: a kernel that loses on none of them.</text>`);
  return `<svg viewBox="0 0 740 304" role="img" aria-label="The earlier kernel lost on down_proj and the small projections, so converting every layer was a net loss">\n  ${L.join('\n  ')}\n</svg>`;
};

// ======================================================= 16. vLLM A/B (crisp)
F.vllm_ab = () => {
  const sc = v => (v / 5.4 * 520).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">VLLM 0.27.1 + TORCH.COMPILE + CUDA GRAPHS  ·  BATCH 1, 128 TOKENS</text>`);
  const rows = [['vLLM bf16', 4.977, 200.9, ORANGE], ['vLLM + kb8 W8A16', 3.563, 280.5, BLUE]];
  rows.forEach(([lab, ms, tps, col], i) => {
    const y = 36 + i * 58;
    L.push(`<text x="0" y="${y + 16}" font-family="monospace" font-size="12.5" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="170" y="${y + 2}" width="${sc(ms)}" height="24" fill="${col}" rx="3"/>`);
    L.push(`<text x="178" y="${y + 19}" font-family="monospace" font-size="12" fill="#fff">${ms.toFixed(3)} ms/token</text>`);
    L.push(`<text x="${(174 + +sc(ms)).toFixed(1)}" y="${y + 19}" font-family="monospace" font-size="12.5" fill="${col}">${tps.toFixed(1)} tok/s</text>`);
  });
  L.push(`<rect x="170" y="150" width="200" height="34" fill="${BLUE}" rx="3"/>`);
  L.push(`<text x="270" y="173" font-family="monospace" font-size="17" fill="#fff" text-anchor="middle">1.397x</text>`);
  L.push(`<text x="386" y="164" font-family="monospace" font-size="12" fill="${INK}">+39.7%, generated text identical</text>`);
  L.push(`<text x="386" y="180" font-family="monospace" font-size="11" fill="${MUTED}">kernel on 100% of Linear calls</text>`);
  L.push(`<line x1="0" y1="204" x2="700" y2="204" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="214" font-family="monospace" font-size="11" fill="${MUTED}">INTERLEAVED, TWO ENGINES IN ONE PROCESS, CLOCKS PINNED 2505 MHZ</text>`);
  // min / median / max are what the runs actually recorded -- per-round values
  // were not kept, so nothing here is drawn as an individual observation.
  const PX = r => (60 + (r - 1.380) / 0.021 * 580);
  const runs = [['run 1, 6 rounds', 1.3856, 1.3922, 1.3937, 242],
                ['run 2, 3 rounds', 1.3881, 1.3886, 1.3887, 268]];
  for (const [lab, lo, med, hi, y] of runs) {
    L.push(`<line x1="${PX(lo).toFixed(1)}" y1="${y}" x2="${PX(hi).toFixed(1)}" y2="${y}" stroke="${BLUE}" stroke-width="3"/>`);
    L.push(`<line x1="${PX(lo).toFixed(1)}" y1="${y - 5}" x2="${PX(lo).toFixed(1)}" y2="${y + 5}" stroke="${BLUE}" stroke-width="1.6"/>`);
    L.push(`<line x1="${PX(hi).toFixed(1)}" y1="${y - 5}" x2="${PX(hi).toFixed(1)}" y2="${y + 5}" stroke="${BLUE}" stroke-width="1.6"/>`);
    L.push(`<circle cx="${PX(med).toFixed(1)}" cy="${y}" r="5" fill="${BLUE}" stroke="#fff" stroke-width="1.5"/>`);
    L.push(`<text x="0" y="${y + 4}" font-family="monospace" font-size="11" fill="${INK}">${lab}</text>`);
    L.push(`<text x="${(PX(hi) + 10).toFixed(1)}" y="${y + 4}" font-family="monospace" font-size="11" fill="${BLUE}">median ${med}</text>`);
  }
  L.push(`<line x1="60" y1="286" x2="640" y2="286" stroke="${INK}" stroke-width="1.1"/>`);
  L.push(`<text x="60" y="302" font-family="monospace" font-size="10.5" fill="${MUTED}">1.380</text>`);
  L.push(`<text x="640" y="302" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">1.401</text>`);
  L.push(`<line x1="${PX(1.397).toFixed(1)}" y1="228" x2="${PX(1.397).toFixed(1)}" y2="286" stroke="${ORANGE}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
  L.push(`<text x="${PX(1.397).toFixed(1)}" y="224" font-family="monospace" font-size="10.5" fill="${ORANGE}" text-anchor="end">sequential: 1.397 </text>`);
  L.push(`<text x="0" y="326" font-family="monospace" font-size="11.5" fill="${INK}">Bars are min-max per run, dots the median. Nine rounds land at 1.389-1.392x: drift did not inflate 1.397x.</text>`);
  return `<svg viewBox="0 0 740 336" role="img" aria-label="vLLM goes from 4.977 to 3.563 ms per token, a 1.397x speedup confirmed by interleaved rounds">\n  ${L.join('\n  ')}\n</svg>`;
};

// ====================================================== 17. accuracy (crisp)
F.accuracy = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">WIKITEXT-2-RAW TEST, FULL SPLIT  ·  299,077 TOKENS  ·  ALL 169 LINEARS QUANTISED</text>`);
  const base = 13.660, span = 0.014;
  const X = v => (140 + (v - base) / span * 480).toFixed(1);
  L.push(`<text x="0" y="52" font-family="monospace" font-size="12.5" fill="${INK}">bf16</text>`);
  L.push(`<circle cx="${X(13.6650)}" cy="46" r="7" fill="${GRAY}"/>`);
  L.push(`<text x="${(+X(13.6650)).toFixed(1)}" y="32" font-family="monospace" font-size="12" fill="${GRAY}" text-anchor="middle">13.6650</text>`);
  L.push(`<text x="0" y="92" font-family="monospace" font-size="12.5" fill="${INK}">int8 g128</text>`);
  L.push(`<circle cx="${X(13.6687)}" cy="86" r="7" fill="${BLUE}"/>`);
  L.push(`<text x="${(+X(13.6687)).toFixed(1)}" y="110" font-family="monospace" font-size="12" fill="${BLUE}" text-anchor="middle">13.6687</text>`);
  L.push(`<line x1="140" y1="66" x2="620" y2="66" stroke="${FAINT}" stroke-width="1"/>`);
  L.push(`<text x="140" y="134" font-family="monospace" font-size="10.5" fill="${MUTED}">13.660</text>`);
  L.push(`<text x="620" y="134" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">13.674</text>`);
  L.push(`<text x="0" y="168" font-family="monospace" font-size="12" fill="${INK}">degradation: +0.0037 perplexity =</text>`);
  L.push(`<rect x="290" y="150" width="120" height="26" fill="${BLUE}" rx="3"/>`);
  L.push(`<text x="350" y="169" font-family="monospace" font-size="14" fill="#fff" text-anchor="middle">+0.027%</text>`);
  L.push(`<text x="424" y="168" font-family="monospace" font-size="11" fill="${MUTED}">bf16 repeats to 4 d.p., so this is signal</text>`);
  L.push(`<line x1="0" y1="194" x2="700" y2="194" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="218" font-family="monospace" font-size="11" fill="${MUTED}">BUT GREEDY DECODING, 128 TOKENS:</text>`);
  for (let i = 0; i < 128; i++) {
    const x = (i % 64) * 10.4, y = 228 + Math.floor(i / 64) * 18;
    L.push(`<rect x="${x.toFixed(1)}" y="${y}" width="8.4" height="13" fill="${i < 51 ? BLUE : ORANGE}" opacity="${i < 51 ? 0.85 : 0.75}"/>`);
  }
  L.push(`<text x="0" y="284" font-family="monospace" font-size="11.5" fill="${BLUE}">51 tokens identical</text>`);
  L.push(`<text x="190" y="284" font-family="monospace" font-size="11.5" fill="${ORANGE}">then every token after differs</text>`);
  L.push(`<text x="0" y="306" font-family="monospace" font-size="10.5" fill="${MUTED}">Both facts are true at once. Argmax turns any logit change into a different token, and then the two contexts diverge.</text>`);
  L.push(`<text x="0" y="322" font-family="monospace" font-size="10.5" fill="${MUTED}">Perplexity is the claim I can support. "Identical output" is not, and reporting only the first hides this.</text>`);
  return `<svg viewBox="0 0 740 332" role="img" aria-label="Perplexity rises 0.027 percent while greedy decoding diverges after 51 of 128 tokens">\n  ${L.join('\n  ')}\n</svg>`;
};

// =================================================== 18. batch erodes it (crisp)
F.batch_win = () => {
  const sc = v => ((v - 1) / 0.70 * 470).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">THE SAME KERNEL AND SERVER, TWO BATCH SIZES</text>`);
  const rows = [
    ['batch 1', 1.652, 1.397, '4.977 -> 3.563 ms/token'],
    ['batch 32', 1.072, 1.070, '6110 -> 6535 tok/s'],
  ];
  rows.forEach(([lab, est, meas, note], i) => {
    const y = 36 + i * 92;
    L.push(`<text x="0" y="${y + 18}" font-family="monospace" font-size="13" fill="${INK}">${lab}</text>`);
    L.push(`<text x="96" y="${y + 16}" font-family="monospace" font-size="10.5" fill="${MUTED}">GEMM-only est.</text>`);
    L.push(`<rect x="230" y="${y + 2}" width="${Math.max(+sc(est), 2).toFixed(1)}" height="20" fill="${DIM}" rx="3"/>`);
    L.push(`<text x="${(234 + Math.max(+sc(est), 2)).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="12.5" fill="${GRAY}">${est.toFixed(3)}x</text>`);
    L.push(`<text x="96" y="${y + 46}" font-family="monospace" font-size="10.5" fill="${MUTED}">server, measured</text>`);
    L.push(`<rect x="230" y="${y + 32}" width="${Math.max(+sc(meas), 2).toFixed(1)}" height="20" fill="${i === 0 ? BLUE : ORANGE}" rx="3"/>`);
    L.push(`<text x="${(234 + Math.max(+sc(meas), 2)).toFixed(1)}" y="${y + 47}" font-family="monospace" font-size="12.5" fill="${i === 0 ? BLUE : ORANGE}">${meas.toFixed(3)}x</text>`);
    L.push(`<text x="230" y="${y + 68}" font-family="monospace" font-size="10.5" fill="${MUTED}">${note}   ·   estimate overshoots by ${((est / meas - 1) * 100).toFixed(1)}%</text>`);
  });
  L.push(`<line x1="230" y1="30" x2="230" y2="212" stroke="${INK}" stroke-width="1.4"/>`);
  L.push(`<text x="230" y="228" font-family="monospace" font-size="10.5" fill="${INK}" text-anchor="middle">1.0x</text>`);
  L.push(`<text x="0" y="258" font-family="monospace" font-size="11.5" fill="${ORANGE}">Weight quantisation is a LATENCY optimization. Batch well and it does progressively less.</text>`);
  L.push(`<text x="0" y="278" font-family="monospace" font-size="10.5" fill="${MUTED}">Amdahl takes a fixed share of the excess over 1.0: a 1.652x GEMM dilutes to 1.502x, a 1.072x one to 1.058x.</text>`);
  L.push(`<text x="0" y="294" font-family="monospace" font-size="10.5" fill="${MUTED}">So a small win survives the trip to end-to-end almost intact and a large one does not. Hence the convergence.</text>`);
  return `<svg viewBox="0 0 740 304" role="img" aria-label="The speedup falls from 1.397x at batch 1 to 1.070x at batch 32 as weights are amortised">\n  ${L.join('\n  ')}\n</svg>`;
};

module.exports = F;
