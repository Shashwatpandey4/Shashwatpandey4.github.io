// Figures for the diagnosis-ladder post.
const { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT } = require('./rough.cjs');
const F = {};
const PALE_B = '#c7dbf6', PALE_O = '#f2cdbc', DIM = '#cbd1d6';

// ==================================================== 1. the ladder (hand)
F.ladder = () => {
  const f = fig(740, 330, 601);
  f.caption(0, 14, 'escalate only as far as the evidence requires');
  const rungs = [
    ['1  symptom', 'how slow, against what', 'runs the kernel', ORANGE],
    ['2  bound', 'achieved GB/s vs the bus, flops vs peak', 'runs the kernel', ORANGE],
    ['3  resources', 'registers, spills, shared memory, occupancy', 'static', BLUE],
    ['4  IR', 'what TritonGPU decided: layouts, async copies, dots', 'static', BLUE],
    ['5  instructions', 'what ptxas emitted: PTX and SASS', 'static', BLUE],
  ];
  rungs.forEach(([name, what, kind, col], i) => {
    const y = 36 + i * 50, w = 150 + i * 106;
    // a light solid fill, not hachure: two lines of text on cross-hatching is
    // unreadable however much halo you put behind the glyphs
    f.rect(0, y, w, 38, { fill: i < 2 ? col : '#eef4fc', fillStyle: 'solid', sw: 1.3, stroke: col });
    f.text(10, y + 17, name, { size: 13, fill: i < 2 ? '#ffffff' : INK });
    f.text(10, y + 33, what, { size: 11, fill: i < 2 ? '#ffffff' : MUTED });
    f.text(w + 10, y + 25, kind, { size: 11.5, fill: MUTED, mono: true });
  });
  f.line(0, 292, 720, 292, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 312, 'Most kernels are explained at rung 2. Only the survivors are worth reading IR for, and everything above');
  f.caption(0, 328, 'rung 2 is static — byte-identical on every run, with no profiler and no thermal state to worry about.');
  return f.toSVG('A five rung diagnosis ladder, escalating from runtime symptom to emitted instructions');
};

// ============================================ 2. the ceiling was wrong (crisp)
F.ceiling = () => {
  const X = gb => (120 + gb / 300 * 520).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">WHICH BANDWIDTH IS THE CEILING?  ·  MEASURED ON THIS CARD</text>`);
  const rows = [
    ['device-to-device copy', 226.4, GRAY, 'counts read AND write'],
    ['pure read (reduction)', 250.1, BLUE, 'what a weight-streaming GEMM does'],
  ];
  rows.forEach(([lab, gb, col, note], i) => {
    const y = 36 + i * 46;
    L.push(`<text x="0" y="${y + 17}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    const end = 200 + (+X(gb) - 120);
    L.push(`<rect x="200" y="${y}" width="${(+X(gb) - 120).toFixed(1)}" height="24" fill="${col}" rx="3"/>`);
    // the copy bar ends where the lm_head marker sits, so label it inside
    L.push(i === 0
      ? `<text x="${(end - 10).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="12.5" fill="#fff" text-anchor="end">${gb} GB/s</text>`
      : `<text x="${(end + 10).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="12.5" fill="${col}">${gb} GB/s</text>`);
    L.push(`<text x="200" y="${y + 40}" font-family="monospace" font-size="10.5" fill="${MUTED}">${note}</text>`);
  });
  const mk = (200 + (+X(238.5) - 120)).toFixed(1);
  L.push(`<line x1="${mk}" y1="30" x2="${mk}" y2="150" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${(+mk - 6).toFixed(1)}" y="166" font-family="monospace" font-size="11.5" fill="${ORANGE}" text-anchor="end">lm_head measured 238.5</text>`);
  L.push(`<text x="0" y="200" font-family="monospace" font-size="12" fill="${ORANGE}">105% of the copy figure. 95% of the read figure. Same kernel.</text>`);
  L.push(`<text x="0" y="220" font-family="monospace" font-size="11.5" fill="${INK}">The reference was wrong, not the measurement — and it was the reference I</text>`);
  L.push(`<text x="0" y="238" font-family="monospace" font-size="11.5" fill="${INK}">published three days earlier as a plausibility check.</text>`);
  return `<svg viewBox="0 0 740 248" role="img" aria-label="Copy bandwidth is 226 GB/s and read bandwidth 250, so lm_head at 238 is legitimate">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================ 3. which wall (crisp)
F.bound = () => {
  const rows = [
    ['qkv_proj', 7.0, 148.3, 59, 0.30, 1, false],
    ['o_proj', 5.8, 138.9, 56, 0.28, 1, false],
    ['down_proj', 21.7, 201.0, 80, 0.40, 1, true],
    ['gate_up_proj', 42.6, 204.8, 82, 0.41, 1, true],
    ['lm_head', 570.9, 238.5, 95, 0.48, 2, true],
  ];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">EVERY DECODE SHAPE AT M=1  ·  % OF THE 250 GB/S READ CEILING</text>`);
  rows.forEach(([lab, us, gb, pct, tf, pk, wall], i) => {
    const y = 34 + i * 38;
    L.push(`<text x="0" y="${y + 18}" font-family="monospace" font-size="11.5" fill="${INK}">${lab}</text>`);
    L.push(`<text x="118" y="${y + 18}" font-family="monospace" font-size="10.5" fill="${MUTED}">${us} us</text>`);
    L.push(`<rect x="190" y="${y + 3}" width="${(pct / 100 * 380).toFixed(1)}" height="20" fill="${wall ? ORANGE : BLUE}" rx="3"/>`);
    L.push(`<text x="${(196 + pct / 100 * 380).toFixed(1)}" y="${y + 18}" font-family="monospace" font-size="11.5" fill="${wall ? ORANGE : BLUE}">${pct}%</text>`);
    L.push(`<text x="700" y="${y + 18}" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">${tf} TF (${pk}% peak)</text>`);
  });
  L.push(`<line x1="570" y1="28" x2="570" y2="224" stroke="${INK}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
  L.push(`<text x="570" y="240" font-family="monospace" font-size="10.5" fill="${INK}" text-anchor="middle">100% of ceiling</text>`);
  L.push(`<text x="0" y="268" font-family="monospace" font-size="12" fill="${ORANGE}">Three shapes are at the wall. No kernel work moves them.</text>`);
  L.push(`<text x="0" y="288" font-family="monospace" font-size="12" fill="${BLUE}">Two are at 56-59%, and those are the only two the rungs above can help.</text>`);
  L.push(`<text x="0" y="308" font-family="monospace" font-size="10.5" fill="${MUTED}">Every shape is at 1-2% of the bf16 tensor-core peak. That is decode: arithmetic is not the constraint.</text>`);
  return `<svg viewBox="0 0 740 318" role="img" aria-label="Three of five decode shapes are already at the memory bandwidth ceiling">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================== 4. what caps occupancy (crisp)
F.occupancy = () => {
  const rows = [
    [2, 12544, 4, 8, 'registers'],
    [3, 25088, 5, 4, 'SHARED MEM'],
    [4, 37632, 5, 2, 'SHARED MEM'],
    [5, 50176, 5, 2, 'SHARED MEM'],
  ];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">BLOCKS PER SM, LIMITED TWO WAYS  ·  BN=64, 4 WARPS  ·  ADA: 64K REGS, 100 KB SMEM</text>`);
  L.push(`<text x="120" y="34" font-family="monospace" font-size="10" fill="${MUTED}">SMEM</text>`);
  L.push(`<text x="250" y="34" font-family="monospace" font-size="10" fill="${GRAY}">BY REGISTERS</text>`);
  L.push(`<text x="420" y="34" font-family="monospace" font-size="10" fill="${ORANGE}">BY SHARED MEM</text>`);
  L.push(`<text x="700" y="34" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="end">LIMITER</text>`);
  rows.forEach(([st, smem, byreg, bysmem, lim], i) => {
    const y = 44 + i * 40;
    const shipped = st === 4;
    L.push(`<rect x="0" y="${y}" width="700" height="34" fill="${shipped ? '#fdf4f0' : (i % 2 ? '#fafbfb' : '#fff')}"/>`);
    L.push(`<text x="6" y="${y + 22}" font-family="monospace" font-size="12" fill="${INK}">${st} stages</text>`);
    L.push(`<text x="120" y="${y + 22}" font-family="monospace" font-size="11" fill="${MUTED}">${(smem / 1024).toFixed(1)} KB</text>`);
    for (let k = 0; k < byreg; k++)
      L.push(`<rect x="${250 + k * 16}" y="${y + 10}" width="12" height="14" fill="${GRAY}" opacity="0.55"/>`);
    for (let k = 0; k < bysmem; k++)
      L.push(`<rect x="${420 + k * 16}" y="${y + 10}" width="12" height="14" fill="${ORANGE}"/>`);
    L.push(`<text x="700" y="${y + 22}" font-family="monospace" font-size="11" fill="${lim === 'registers' ? GRAY : ORANGE}" text-anchor="end">${lim}</text>`);
    if (shipped) L.push(`<text x="182" y="${y + 22}" font-family="monospace" font-size="9.5" fill="${ORANGE}">shipped</text>`);
  });
  L.push(`<text x="0" y="222" font-family="monospace" font-size="12" fill="${INK}">Shared memory scales linearly with depth: 12,544 bytes per stage.</text>`);
  L.push(`<text x="0" y="242" font-family="monospace" font-size="11.5" fill="${ORANGE}">The config I shipped in Part 4 is exactly where it takes a block per SM away.</text>`);
  return `<svg viewBox="0 0 740 252" role="img" aria-label="Shared memory rather than registers limits blocks per SM from three stages upward">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================================== 5. the depth sweep (crisp)
F.depth = () => {
  const data = {
    qkv_proj:   [[2, 9.2, 50, 4], [3, 6.3, 72, 4], [4, 6.9, 66, 2], [5, 7.5, 61, 2]],
    o_proj:     [[2, 9.4, 38, 4], [3, 6.5, 55, 4], [4, 6.5, 55, 2], [5, 7.0, 50, 2]],
    gate_up:    [[2, 42.8, 90, 2], [3, 43.4, 89, 2], [4, 45.9, 84, 1], [5, 47.5, 81, 1]],
    down_proj:  [[2, 42.3, 45, 2], [3, 24.4, 79, 2], [4, 23.7, 81, 1], [5, 24.2, 79, 1]],
  };
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">MICROSECONDS VS PIPELINE DEPTH  ·  TIMED THROUGH ATTEST  ·  BEST IN BLUE</text>`);
  let y = 30;
  for (const [name, rows] of Object.entries(data)) {
    const best = Math.min(...rows.map(r => r[1]));
    const max = Math.max(...rows.map(r => r[1]));
    L.push(`<text x="0" y="${y + 14}" font-family="monospace" font-size="11.5" fill="${INK}">${name}</text>`);
    rows.forEach(([st, us, pct, blk], i) => {
      const x = 150 + i * 132;
      const h = (us / max * 44).toFixed(1);
      const isBest = us === best;
      L.push(`<rect x="${x}" y="${(y + 52 - h).toFixed(1)}" width="46" height="${h}" fill="${isBest ? BLUE : DIM}" rx="2"/>`);
      L.push(`<text x="${x + 23}" y="${(y + 48 - h).toFixed(1)}" font-family="monospace" font-size="10" fill="${isBest ? BLUE : MUTED}" text-anchor="middle">${us}</text>`);
      L.push(`<text x="${x + 23}" y="${y + 64}" font-family="monospace" font-size="9.5" fill="${MUTED}" text-anchor="middle">s${st} · ${blk}blk</text>`);
    });
    y += 82;
  }
  L.push(`<text x="0" y="${y + 12}" font-family="monospace" font-size="11.5" fill="${INK}">gate_up (90% of ceiling) wants the MINIMUM depth. down_proj (K=4864) pays 1.8x</text>`);
  L.push(`<text x="0" y="${y + 30}" font-family="monospace" font-size="11.5" fill="${INK}">for going shallow. Depth pays until shared memory costs a block per SM.</text>`);
  L.push(`<text x="0" y="${y + 50}" font-family="monospace" font-size="10.5" fill="${MUTED}">qkv at 2 and 3 stages has identical occupancy (33%) and differs by 1.46x, so occupancy is not the whole story.</text>`);
  return `<svg viewBox="0 0 740 ${y + 60}" role="img" aria-label="Optimal pipeline depth differs per shape and trades against occupancy">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================ 6. IR and instructions (crisp)
F.emitted = () => {
  const rows = [
    ['qkv_proj', 12, 14, 1, 16, 0], ['o_proj', 12, 14, 1, 16, 0],
    ['gate_up_proj', 9, 14, 1, 32, 0], ['down_proj', 9, 14, 1, 32, 0],
    ['lm_head', 6, 14, 1, 16, 0],
  ];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">RUNG 4 (TTGIR)  AND  RUNG 5 (SASS)  ·  ALL FIVE SHAPES</text>`);
  const cols = [['async_copy', 250], ['dot_op', 360], ['convert_layout', 480], ['HMMA', 600], ['LDSM', 690]];
  cols.forEach(([c, x]) => L.push(`<text x="${x}" y="34" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="middle">${c}</text>`));
  rows.forEach(([lab, a, d, c, h, ld], i) => {
    const y = 42 + i * 32;
    L.push(`<rect x="0" y="${y}" width="700" height="27" fill="${i % 2 ? '#fafbfb' : '#fff'}"/>`);
    L.push(`<text x="6" y="${y + 19}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    [[a, 250], [d, 360], [c, 480], [h, 600]].forEach(([v, x]) =>
      L.push(`<text x="${x}" y="${y + 19}" font-family="monospace" font-size="12" fill="${MUTED}" text-anchor="middle">${v}</text>`));
    L.push(`<text x="690" y="${y + 19}" font-family="monospace" font-size="15" fill="${ORANGE}" text-anchor="middle">${ld}</text>`);
  });
  L.push(`<rect x="650" y="36" width="80" height="166" fill="${ORANGE}" opacity="0.07"/>`);
  L.push(`<text x="0" y="230" font-family="monospace" font-size="12" fill="${ORANGE}">LDSM is zero on every shape. Part 4 found this on one config; it holds on all five.</text>`);
  L.push(`<text x="0" y="250" font-family="monospace" font-size="11.5" fill="${INK}">Triton emits the same MMAs and feeds them with ordinary shared loads.</text>`);
  L.push(`<text x="0" y="270" font-family="monospace" font-size="10.5" fill="${MUTED}">Which can only pay on the two shapes that are NOT bandwidth-bound. On the other three the feed cannot matter.</text>`);
  return `<svg viewBox="0 0 740 280" role="img" aria-label="Across all five shapes Triton emits MMA instructions but never ldmatrix">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================================== 7. two bugs (hand)
F.bugs = () => {
  const f = fig(740, 300, 613);
  f.caption(0, 14, 'both found by an impossible number, not a wrong one');
  f.rect(0, 30, 700, 106, { sw: 1.3, stroke: ORANGE });
  f.text(12, 52, '1.  in the ladder itself', { size: 13.5, fill: ORANGE });
  f.text(12, 74, 'resources() read list(cache.values())[-1]', { size: 12, fill: INK, mono: true });
  f.text(12, 94, 'that is the LAST COMPILED kernel, not the one launched', { size: 12, fill: MUTED });
  f.text(12, 118, 'symptom: identical shared memory for 4 different pipeline depths', { size: 12, fill: ORANGE });
  f.rect(0, 152, 700, 106, { sw: 1.3, stroke: BLUE });
  f.text(12, 174, '2.  in attest, published three days earlier', { size: 13.5, fill: BLUE });
  f.text(12, 196, 'plausibility compared against a COPY benchmark', { size: 12, fill: INK, mono: true });
  f.text(12, 216, 'a weight-streaming GEMM is read-dominated, not a copy', { size: 12, fill: MUTED });
  f.text(12, 240, 'symptom: a legitimate kernel reading 105% of the bus', { size: 12, fill: BLUE });
  f.caption(0, 280, 'Neither would have shown up as a slightly-off ratio. Smem must scale with depth; bandwidth cannot exceed');
  f.caption(0, 296, 'the bus. A number with a physical bound attached is auditable — one without is decoration.');
  return f.toSVG('Two bugs, each caught because the number it produced was impossible rather than merely wrong');
};

module.exports = F;
