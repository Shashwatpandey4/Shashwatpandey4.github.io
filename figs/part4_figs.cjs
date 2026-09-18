// Every figure for Part 4, keyed. Same two-style policy as Parts 1-3.
//
// Part 4's recurring form is "two paths, same destination": the hand-written
// .cu path and the Triton path, compared at each IR level. Triton is BLUE,
// hand-written CUDA is ORANGE, and where a figure shows a wrong measurement
// next to a corrected one the wrong one is GRAY.
const { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT } = require('./rough.cjs');

const F = {};
const PALE_B = '#c7dbf6';
const PALE_O = '#f2cdbc';
const DIM = '#cbd1d6';

// ================================================== 1. two front-ends (hand)
F.two_frontends = () => {
  const f = fig(740, 340, 211);
  f.caption(0, 14, 'two front-ends, one backend  ·  and only the middle is LLVM');
  // .cu path
  f.rect(0, 32, 200, 28, { fill: PALE_O, fillStyle: 'solid', sw: 1.3 });
  f.text(10, 51, 'kernel.cu  (135 lines)', { size: 12.5, fill: INK, mono: true });
  f.arrow(100, 62, 100, 86, { stroke: MUTED });
  f.rect(0, 90, 200, 26, { sw: 1.3, stroke: ORANGE });
  f.text(10, 108, 'NVVM  (cicc / clang)', { size: 12, fill: ORANGE, mono: true });
  // triton path
  f.rect(420, 32, 200, 28, { fill: PALE_B, fillStyle: 'solid', sw: 1.3 });
  f.text(430, 51, 'kernel.py  (43 lines)', { size: 12.5, fill: INK, mono: true });
  f.arrow(520, 62, 520, 86, { stroke: MUTED });
  f.rect(420, 90, 200, 26, { sw: 1.3, stroke: BLUE });
  f.text(430, 108, 'Triton IR   (ttir)', { size: 12, fill: BLUE, mono: true });
  f.arrow(520, 118, 520, 132, { stroke: MUTED });
  f.rect(420, 136, 200, 26, { fill: BLUE, fillStyle: 'solid', sw: 1.3 });
  f.text(430, 154, 'TritonGPU IR (ttgir)', { size: 12, fill: '#ffffff', mono: true });
  f.text(630, 148, 'MLIR', { size: 13, fill: BLUE });
  f.text(630, 164, 'layouts', { size: 11.5, fill: MUTED });
  // converge on LLVM IR
  f.arrow(100, 120, 250, 184, { stroke: MUTED });
  f.arrow(520, 166, 380, 184, { stroke: MUTED });
  f.rect(190, 188, 320, 30, { fill: INK, fillStyle: 'solid', sw: 1.4 });
  f.text(202, 208, 'LLVM IR   (.ll / .llir)', { size: 13, fill: '#ffffff', mono: true });
  f.text(524, 208, '<- this is LLVM', { size: 12.5, fill: INK });
  f.arrow(350, 220, 350, 244, { stroke: MUTED });
  f.rect(190, 248, 320, 26, { sw: 1.3, stroke: INK });
  f.text(202, 266, 'PTX   (a virtual ISA)', { size: 12.5, fill: INK, mono: true });
  f.arrow(350, 276, 350, 296, { stroke: ORANGE });
  f.rect(190, 300, 320, 28, { fill: ORANGE, fillStyle: 'solid', sw: 1.4 });
  f.text(202, 320, 'ptxas  ->  SASS', { size: 12.5, fill: '#ffffff', mono: true });
  f.text(524, 320, 'closed. NOT LLVM.', { size: 12.5, fill: ORANGE });
  f.text(0, 266, 'ptxas -v', { size: 11.5, fill: MUTED, mono: true });
  f.text(0, 284, 'reads out here', { size: 11.5, fill: MUTED });
  return f.toSVG('Two compiler front-ends converging on LLVM IR, then PTX, then closed-source ptxas');
};

// ================================================= 2. ttgir layout (hand)
F.ttgir_layout = () => {
  const f = fig(740, 330, 223);
  f.caption(0, 14, 'one TritonGPU layout, four of Part 1’s rungs');
  f.rect(0, 28, 430, 74, { fill: '#f6f7f8', fillStyle: 'solid', sw: 1.2, stroke: GRAY });
  f.text(10, 48, '#ttg.blocked<{', { size: 12, fill: INK, mono: true });
  f.text(20, 66, 'sizePerThread = [1, 4],', { size: 12, fill: BLUE, mono: true });
  f.text(20, 84, 'warpsPerCTA = [1, 4], order = [1, 0]', { size: 12, fill: ORANGE, mono: true });
  f.text(10, 98, '}>', { size: 12, fill: INK, mono: true });
  const rows = [
    ['order = [1, 0]', 'rung 2: coalescing', 'consecutive threads take consecutive columns', ORANGE],
    ['sizePerThread', 'rung 4-5: blocktiling', 'each thread owns a register tile of outputs', BLUE],
    ['warpsPerCTA', 'rung 8: warptiling', 'the block tile splits into warp-sized rectangles', ORANGE],
    ['(the layout itself)', 'rung 6: vectorization', 'contiguity is what makes a wide load legal', BLUE],
  ];
  rows.forEach(([k, r, why, col], i) => {
    const y = 122 + i * 46;
    f.text(0, y + 14, k, { size: 12, fill: col, mono: true });
    f.arrow(150, y + 10, 182, y + 10, { stroke: FAINT, sw: 1 });
    f.text(192, y + 14, r, { size: 13, fill: INK });
    f.text(192, y + 32, why, { size: 11.5, fill: MUTED });
  });
  f.line(0, 312, 720, 312, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 328, 'And the loop body gains ttg.local_alloc (rung 3) plus six ttg.async_copy_global_to_local (rung 9).');
  return f.toSVG('A TritonGPU blocked layout encodes coalescing, blocktiling, warptiling and vectorization');
};

// ===================================================== 3. the scorecard (crisp)
F.scorecard = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">DID TRITON GENERATE PART 1'S LADDER BY ITSELF?  ·  READ FROM THE TTGIR, NOTHING RUN</text>`);
  const rows = [
    ['rung 2', 'coalescing', 'blocked layout, order = [1,0]', 2],
    ['rung 3', 'shared memory', 'ttg.local_alloc', 2],
    ['rung 4-5', 'blocktiling', 'ttg.dot_op + sizePerThread', 4],
    ['rung 6', 'vectorization', 'tt.divisibility = 16', 9],
    ['rung 8', 'warptiling', 'warpsPerCTA in the layout', 4],
    ['rung 9', 'double buffering', 'ttg.async_copy + commit_group', 6],
  ];
  rows.forEach(([r, name, ev, n], i) => {
    const y = 32 + i * 34;
    L.push(`<rect x="0" y="${y}" width="700" height="28" fill="${i % 2 ? '#fafbfb' : '#ffffff'}"/>`);
    L.push(`<text x="6" y="${y + 19}" font-family="monospace" font-size="12" fill="${MUTED}">${r}</text>`);
    L.push(`<text x="76" y="${y + 19}" font-family="monospace" font-size="12.5" fill="${INK}">${name}</text>`);
    L.push(`<rect x="230" y="${y + 5}" width="48" height="18" fill="${BLUE}" rx="3"/>`);
    L.push(`<text x="254" y="${y + 18}" font-family="monospace" font-size="11" fill="#fff" text-anchor="middle">YES</text>`);
    L.push(`<text x="292" y="${y + 19}" font-family="monospace" font-size="11.5" fill="${BLUE}">${ev}</text>`);
    L.push(`<text x="700" y="${y + 19}" font-family="monospace" font-size="11" fill="${MUTED}" text-anchor="end">x${n}</text>`);
  });
  L.push(`<line x1="0" y1="240" x2="700" y2="240" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="264" font-family="monospace" font-size="12" fill="${INK}">Source mentions none of them. Rung 1 was the naive baseline; rung 7 was the</text>`);
  L.push(`<text x="0" y="280" font-family="monospace" font-size="12" fill="${INK}">mis-tuned A6000 config. Every rung that bought anything is in that IR.</text>`);
  L.push(`<text x="0" y="304" font-family="monospace" font-size="11" fill="${ORANGE}">Left to the human: BM, BN, BK, num_warps, num_stages. See section 14.</text>`);
  return `<svg viewBox="0 0 740 314" role="img" aria-label="Triton generated every optimization rung of Part 1 unasked">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================= 4. JIT vs AOT alignment (hand)
F.divisibility = () => {
  const f = fig(740, 290, 227);
  f.caption(0, 14, 'the same optimization, two different amounts of information');
  // AOT
  f.text(0, 42, 'nvcc  (ahead of time)', { size: 14, fill: ORANGE });
  f.rect(0, 52, 300, 26, { sw: 1.2, stroke: GRAY });
  f.text(8, 70, 'const float *A;  // ?', { size: 12, fill: INK, mono: true });
  f.text(0, 100, 'is A 16-byte aligned?', { size: 12.5, fill: INK });
  f.rect(0, 110, 300, 26, { fill: ORANGE, fillStyle: 'solid', sw: 1.2 });
  f.text(8, 128, 'cannot know. must assume not.', { size: 11.5, fill: '#ffffff' });
  f.arrow(150, 138, 150, 160, { stroke: MUTED });
  f.rect(0, 164, 300, 26, { sw: 1.2, stroke: ORANGE });
  f.text(8, 182, '4x  ld.global.f32', { size: 12, fill: ORANGE, mono: true });
  f.text(0, 212, 'so Part 1 rung 6 had to say it', { size: 12.5, fill: MUTED });
  f.text(0, 230, 'by hand, with a float4 cast', { size: 12.5, fill: MUTED });
  f.line(340, 34, 340, 250, { stroke: FAINT, sw: 1.2, roughness: 0.4 });
  // JIT
  f.text(380, 42, 'Triton  (just in time)', { size: 14, fill: BLUE });
  f.rect(380, 52, 300, 26, { sw: 1.2, stroke: GRAY });
  f.text(388, 70, 'A.data_ptr() = 0x7f..400', { size: 12, fill: INK, mono: true });
  f.text(380, 100, 'is A 16-byte aligned?', { size: 12.5, fill: INK });
  f.rect(380, 110, 300, 26, { fill: BLUE, fillStyle: 'solid', sw: 1.2 });
  f.text(388, 128, 'look at it. specialise on it.', { size: 11.5, fill: '#ffffff' });
  f.arrow(530, 138, 530, 160, { stroke: MUTED });
  f.rect(380, 164, 300, 26, { sw: 1.2, stroke: BLUE });
  f.text(388, 182, 'tt.divisibility = 16  ->  vectorized', { size: 12, fill: BLUE, mono: true });
  f.text(380, 212, 'nine of these in the ttgir,', { size: 12.5, fill: MUTED });
  f.text(380, 230, 'one per pointer argument', { size: 12.5, fill: MUTED });
  f.caption(0, 268, 'The compiler was never dumber than me. It was working with less information — and a large fraction of');
  f.caption(0, 286, 'what a JIT "optimizes better" is really just knowing more at the moment it compiles.');
  return f.toSVG('An AOT compiler cannot prove pointer alignment; a JIT simply reads the pointer');
};

// ====================================================== 5. the thin waist (hand)
F.thin_waist = () => {
  const f = fig(740, 306, 229);
  f.caption(0, 14, 'where the decisions actually get made');
  // wide band: MLIR
  f.rect(0, 34, 700, 54, { fill: BLUE, fillStyle: 'solid', sw: 1.4 });
  f.text(12, 56, 'MLIR  (TritonGPU)', { size: 13.5, fill: '#ffffff' });
  f.text(12, 78, 'layouts \u00b7 coalescing \u00b7 pipelining \u00b7 fragment assignment', { size: 11.5, fill: '#ffffff' });
  // the narrow waist
  f.rect(190, 106, 330, 52, { fill: GRAY, fillStyle: 'hachure', sw: 1.4, hachureGap: 7 });
  f.text(202, 128, 'LLVM IR', { size: 13.5, fill: INK, halo: true });
  f.text(202, 148, 'hot loop is opaque asm', { size: 11.5, fill: INK, halo: true });
  f.text(0, 128, 'the thin', { size: 12.5, fill: MUTED });
  f.text(0, 146, 'waist', { size: 12.5, fill: MUTED });
  f.text(548, 122, 'both paths bottom', { size: 11.5, fill: MUTED });
  f.text(548, 140, 'out in inline asm,', { size: 11.5, fill: MUTED });
  f.text(548, 158, 'so LLVM is blind', { size: 11.5, fill: MUTED });
  // wide band: ptxas
  f.rect(0, 176, 700, 54, { fill: ORANGE, fillStyle: 'solid', sw: 1.4 });
  f.text(12, 198, 'ptxas  (closed)', { size: 13.5, fill: '#ffffff' });
  f.text(12, 220, 'instruction scheduling \u00b7 register allocation \u00b7 spilling', { size: 11.5, fill: '#ffffff' });
  f.line(0, 250, 720, 250, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 270, 'To understand GPU matmul codegen, learn MLIR layouts and read ptxas -v. LLVM IR is where you confirm');
  f.caption(0, 288, 'what the layer above already decided \u2014 which a post titled "LLVM optimizations" had better say out loud.');
  return f.toSVG('MLIR decides layout, ptxas decides scheduling, and LLVM is a thin waist between them');
};

// ============================================ 6. the instruction table (crisp)
F.instr_table = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">GATE_UP, BN=32 BK=128 4 WARPS 2 STAGES  ·  IDENTICAL CONFIG, BOTH PATHS</text>`);
  L.push(`<text x="560" y="38" font-family="monospace" font-size="11.5" fill="${BLUE}" text-anchor="middle">TRITON</text>`);
  L.push(`<text x="660" y="38" font-family="monospace" font-size="11.5" fill="${ORANGE}" text-anchor="middle">BY HAND</text>`);
  const rows = [
    ['mma.sync.m16n8k16', 'PTX', 8, 8, 'same instruction, chosen independently'],
    ['HMMA', 'SASS', 8, 8, 'identical tensor-core work'],
    ['ldmatrix', 'PTX', 0, 8, 'Triton never emits it'],
    ['LDSM', 'SASS', 0, 8, 'ordinary shared loads instead'],
  ];
  rows.forEach(([name, lvl, a, b, note], i) => {
    const y = 48 + i * 42;
    const gap = a !== b;
    L.push(`<rect x="0" y="${y}" width="700" height="34" fill="${gap ? '#fdf4f0' : '#f4f8fd'}"/>`);
    L.push(`<text x="8" y="${y + 15}" font-family="monospace" font-size="12.5" fill="${INK}">${name}</text>`);
    L.push(`<text x="8" y="${y + 29}" font-family="monospace" font-size="10" fill="${MUTED}">${lvl}  \u00b7  ${note}</text>`);
    L.push(`<text x="560" y="${y + 23}" font-family="monospace" font-size="17" fill="${a === 0 ? ORANGE : BLUE}" text-anchor="middle">${a}</text>`);
    L.push(`<text x="660" y="${y + 23}" font-family="monospace" font-size="17" fill="${ORANGE}" text-anchor="middle">${b}</text>`);
  });
  L.push(`<text x="0" y="238" font-family="monospace" font-size="12" fill="${INK}">The MMA counts matching exactly is the strongest evidence in this post.</text>`);
  L.push(`<text x="0" y="258" font-family="monospace" font-size="11" fill="${ORANGE}">The ldmatrix row is the entire codegen gap. Section 14 prices it at 1.85x.</text>`);
  return `<svg viewBox="0 0 740 268" role="img" aria-label="Both paths emit 8 MMA instructions but only the hand-written one uses ldmatrix">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================================== 7. the register cliff (crisp)
F.reg_cliff = () => {
  const data = [[2, 38, 38, 0], [4, 37, 38, 0], [8, 42, 48, 0], [16, 54, 64, 0],
                [32, 80, 97, 0], [64, 128, 188, 0], [128, 218, 255, 2],
                [256, 255, 255, 184], [512, 255, 255, 578]];
  const X = a => (86 + (Math.log2(a) - 1) / 8 * 560).toFixed(1);
  const Y = r => (250 - r / 280 * 200).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">REGISTERS PER THREAD VS ACCUMULATORS PER THREAD  ·  48 CONFIGS, STATIC</text>`);
  for (const r of [0, 64, 128, 192, 255]) {
    L.push(`<line x1="86" y1="${Y(r)}" x2="660" y2="${Y(r)}" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="78" y="${(+Y(r) + 4).toFixed(1)}" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">${r}</text>`);
  }
  L.push(`<line x1="86" y1="${Y(255)}" x2="660" y2="${Y(255)}" stroke="${ORANGE}" stroke-width="1.8" stroke-dasharray="5 4"/>`);
  L.push(`<text x="96" y="${(+Y(255) - 8).toFixed(1)}" font-family="monospace" font-size="11" fill="${ORANGE}">255-register budget</text>`);
  // the prediction line: regs = acc + 35
  const p0 = 2, p1 = 220;
  L.push(`<polyline points="${X(p0)},${Y(p0 + 35)} ${X(p1)},${Y(Math.min(p1 + 35, 255))}" fill="none" stroke="${GRAY}" stroke-width="1.4" stroke-dasharray="4 3"/>`);
  L.push(`<text x="300" y="120" font-family="monospace" font-size="11" fill="${GRAY}">prediction: regs = acc/thread + 35</text>`);
  for (const [a, lo, hi, sp] of data) {
    const col = sp > 0 ? ORANGE : BLUE;
    L.push(`<line x1="${X(a)}" y1="${Y(lo)}" x2="${X(a)}" y2="${Y(hi)}" stroke="${col}" stroke-width="3"/>`);
    L.push(`<circle cx="${X(a)}" cy="${Y((lo + hi) / 2)}" r="4.5" fill="${col}"/>`);
    L.push(`<text x="${X(a)}" y="268" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="middle">${a}</text>`);
    if (sp > 0) {
      L.push(`<text x="${X(a)}" y="${(+Y(255) - 22).toFixed(1)}" font-family="monospace" font-size="10.5" fill="${ORANGE}" text-anchor="middle">${sp}B</text>`);
    }
  }
  L.push(`<line x1="86" y1="250" x2="660" y2="250" stroke="${INK}" stroke-width="1.2"/>`);
  L.push(`<text x="86" y="284" font-family="monospace" font-size="10.5" fill="${MUTED}">acc floats/thread = BM*BN/(num_warps*32)</text>`);
  L.push(`<text x="660" y="284" font-family="monospace" font-size="10.5" fill="${ORANGE}" text-anchor="end">orange = spilling, bytes labelled</text>`);
  L.push(`<text x="0" y="308" font-family="monospace" font-size="11.5" fill="${INK}">Spilling begins exactly where the accumulator alone would exceed the budget.</text>`);
  return `<svg viewBox="0 0 740 318" role="img" aria-label="Register count tracks accumulators per thread and spills begin at the 255-register budget">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================ 8. lie: launch overhead (crisp)
F.lie_launch = () => {
  const data = [
    ['qkv_proj', 1, 0.599, 1.151], ['qkv_proj', 16, 0.607, 1.156],
    ['o_proj', 1, 0.569, 1.263], ['o_proj', 16, 0.584, 1.206],
    ['gate_up', 1, 0.885, 1.048], ['gate_up', 16, 0.913, 1.090],
    ['down_proj', 1, 1.018, 1.373], ['down_proj', 16, 0.835, 1.067],
    ['lm_head', 1, 0.988, 1.000], ['lm_head', 16, 0.988, 1.001],
  ];
  const X = r => (150 + (r - 0.5) / 1.0 * 460).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">TRITON / CUBLAS BF16  ·  SAME KERNELS, EAGER VS INSIDE A CUDA GRAPH</text>`);
  data.forEach(([n, m, e, g], i) => {
    const y = 30 + i * 25;
    const ctrl = n === 'lm_head';
    L.push(`<text x="0" y="${y + 13}" font-family="monospace" font-size="11" fill="${ctrl ? INK : MUTED}">${n} M=${m}</text>`);
    L.push(`<line x1="${X(e)}" y1="${y + 8}" x2="${X(g)}" y2="${y + 8}" stroke="${FAINT}" stroke-width="1.4"/>`);
    L.push(`<circle cx="${X(e)}" cy="${y + 8}" r="4.5" fill="${GRAY}"/>`);
    L.push(`<circle cx="${X(g)}" cy="${y + 8}" r="4.5" fill="${ctrl ? INK : BLUE}"/>`);
    if (i === 0) {
      L.push(`<text x="${X(e)}" y="${y - 4}" font-family="monospace" font-size="10" fill="${GRAY}" text-anchor="middle">eager</text>`);
      L.push(`<text x="${X(g)}" y="${y - 4}" font-family="monospace" font-size="10" fill="${BLUE}" text-anchor="middle">graph</text>`);
    }
  });
  L.push(`<line x1="${X(1.0)}" y1="24" x2="${X(1.0)}" y2="286" stroke="${INK}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${X(1.0)}" y="300" font-family="monospace" font-size="11" fill="${INK}" text-anchor="middle">1.0x = cuBLAS</text>`);
  L.push(`<text x="150" y="300" font-family="monospace" font-size="10.5" fill="${MUTED}">0.5x</text>`);
  L.push(`<text x="610" y="300" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">1.5x</text>`);
  L.push(`<text x="0" y="324" font-family="monospace" font-size="11.5" fill="${GRAY}">Eager: Triton's launch path ~20us, torch's ~6us, on kernels that run 6-10us.</text>`);
  L.push(`<text x="0" y="342" font-family="monospace" font-size="11.5" fill="${INK}">Losing 8 of 10 becomes winning 8 of 10. lm_head (1.1ms/call) does not move: the control.</text>`);
  return `<svg viewBox="0 0 740 352" role="img" aria-label="Removing launch overhead flips Triton from losing 8 of 10 shapes to winning 8 of 10">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================= 9. lie: L2, again (crisp)
F.lie_l2_again = () => {
  const sc = v => (v / 900 * 560).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">IMPLIED BANDWIDTH, GATE_UP  ·  ONE PINNED WEIGHT VS A ROTATION</text>`);
  L.push(`<text x="0" y="44" font-family="monospace" font-size="12" fill="${GRAY}">first graph capture: ONE 17.4 MB weight matrix</text>`);
  L.push(`<text x="0" y="60" font-family="monospace" font-size="10.5" fill="${MUTED}">graphs pin their pointers, so every replay re-read the same tile. 17.4 MB fits a 33.55 MB L2.</text>`);
  L.push(`<rect x="0" y="70" width="${sc(850)}" height="26" fill="${DIM}" rx="3"/>`);
  L.push(`<text x="8" y="88" font-family="monospace" font-size="12" fill="#333">850 GB/s  "2.047x"</text>`);
  L.push(`<text x="0" y="132" font-family="monospace" font-size="12" fill="${BLUE}">corrected: one kernel node per weight, rotation x4</text>`);
  L.push(`<text x="0" y="148" font-family="monospace" font-size="10.5" fill="${MUTED}">the replay now streams 4 distinct matrices, exceeding L2, exactly as decode does.</text>`);
  L.push(`<rect x="0" y="158" width="${sc(236.7)}" height="26" fill="${BLUE}" rx="3"/>`);
  L.push(`<text x="8" y="176" font-family="monospace" font-size="12" fill="#fff">236.7 GB/s  1.090x</text>`);
  L.push(`<line x1="${sc(227)}" y1="62" x2="${sc(227)}" y2="196" stroke="${ORANGE}" stroke-width="1.8" stroke-dasharray="5 4"/>`);
  L.push(`<text x="${(+sc(227) + 8).toFixed(1)}" y="210" font-family="monospace" font-size="11" fill="${ORANGE}">227 GB/s: the measured bus</text>`);
  L.push(`<text x="0" y="240" font-family="monospace" font-size="11.5" fill="${ORANGE}">A kernel cannot read 850 GB/s off a 227 GB/s bus. The ratio looked perfectly fine.</text>`);
  L.push(`<text x="0" y="260" font-family="monospace" font-size="11.5" fill="${INK}">What caught it was dividing bytes by time. The roofline is a lie detector.</text>`);
  return `<svg viewBox="0 0 740 270" role="img" aria-label="A pinned weight matrix in a CUDA graph implied 850 GB per second on a 227 GB per second bus">\n  ${L.join('\n  ')}\n</svg>`;
};

// =================================================== 10. bf16 under graphs (crisp)
F.bf16_graph = () => {
  const data = [
    ['qkv_proj', 1, 1.151, 206.5], ['qkv_proj', 16, 1.156, 206.0],
    ['o_proj', 1, 1.263, 194.7], ['o_proj', 16, 1.206, 194.6],
    ['gate_up', 1, 1.048, 236.7], ['gate_up', 16, 1.090, 236.3],
    ['down_proj', 1, 1.373, 234.0], ['down_proj', 16, 1.067, 233.6],
    ['lm_head', 1, 1.000, 248.3], ['lm_head', 16, 1.001, 240.3],
  ];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">TRITON BF16 VS CUBLAS, UNDER GRAPHS, WEIGHTS STREAMED  ·  DECODE SHAPES</text>`);
  data.forEach(([n, m, r, gb], i) => {
    const y = 30 + i * 25;
    const w = (r - 1) / 0.42 * 320;
    L.push(`<text x="0" y="${y + 13}" font-family="monospace" font-size="11" fill="${INK}">${n} M=${m}</text>`);
    L.push(`<rect x="150" y="${y + 1}" width="${Math.max(w, 1.5).toFixed(1)}" height="16" fill="${r >= 1.02 ? BLUE : GRAY}" rx="2"/>`);
    L.push(`<text x="${(154 + Math.max(w, 1.5)).toFixed(1)}" y="${y + 13}" font-family="monospace" font-size="11" fill="${r >= 1.02 ? BLUE : GRAY}">${r.toFixed(3)}x</text>`);
    L.push(`<text x="700" y="${y + 13}" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="end">${gb.toFixed(1)} GB/s</text>`);
  });
  L.push(`<line x1="150" y1="24" x2="150" y2="286" stroke="${INK}" stroke-width="1.4"/>`);
  L.push(`<text x="150" y="300" font-family="monospace" font-size="10.5" fill="${INK}" text-anchor="middle">1.0x</text>`);
  L.push(`<text x="0" y="326" font-family="monospace" font-size="11.5" fill="${BLUE}">Wins 8 of 10, by 1.05x to 1.37x. Bandwidth 195-248 GB/s on a 227 GB/s bus:</text>`);
  L.push(`<text x="0" y="344" font-family="monospace" font-size="11.5" fill="${INK}">these are at the wall, which is where Part 2 said the ceiling was.</text>`);
  return `<svg viewBox="0 0 740 354" role="img" aria-label="Triton bf16 beats cuBLAS on eight of ten decode shapes under CUDA graphs">\n  ${L.join('\n  ')}\n</svg>`;
};

// ====================================================== 11. W8A16, three ways (crisp)
F.w8a16_three = () => {
  const data = [
    ['qkv_proj', 1, 11.3, 7.1, 6.7], ['qkv_proj', 16, 11.4, 7.2, 6.6],
    ['o_proj', 1, 10.2, 6.8, 5.8], ['o_proj', 16, 9.8, 6.9, 5.6],
    ['gate_up', 1, 76.1, 38.6, 42.5], ['gate_up', 16, 80.7, 39.8, 43.3],
    ['down_proj', 1, 52.3, 36.4, 23.7], ['down_proj', 16, 39.5, 36.8, 22.3],
  ];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">MICROSECONDS PER CALL  ·  CUBLAS BF16 / KB8 (135 LINES CUDA) / TRITON (43 LINES)</text>`);
  data.forEach(([n, m, c, k, t], i) => {
    const y = 28 + i * 33;
    const s = v => (v / 85 * 420).toFixed(1);
    L.push(`<text x="0" y="${y + 20}" font-family="monospace" font-size="11" fill="${INK}">${n} M=${m}</text>`);
    L.push(`<rect x="150" y="${y}" width="${s(c)}" height="9" fill="${DIM}" rx="2"/>`);
    L.push(`<rect x="150" y="${y + 10}" width="${s(k)}" height="9" fill="${ORANGE}" rx="2"/>`);
    L.push(`<rect x="150" y="${y + 20}" width="${s(t)}" height="9" fill="${BLUE}" rx="2"/>`);
    L.push(`<text x="580" y="${y + 13}" font-family="monospace" font-size="11.5" fill="${t <= k ? BLUE : ORANGE}">${(k / t).toFixed(3)}x vs kb8</text>`);
  });
  L.push(`<text x="150" y="300" font-family="monospace" font-size="10.5" fill="${MUTED}">grey cuBLAS</text>`);
  L.push(`<text x="260" y="300" font-family="monospace" font-size="10.5" fill="${ORANGE}">orange kb8</text>`);
  L.push(`<text x="366" y="300" font-family="monospace" font-size="10.5" fill="${BLUE}">blue triton</text>`);
  L.push(`<text x="0" y="326" font-family="monospace" font-size="11.5" fill="${INK}">lm_head (not shown, 570-600us): 2.49x vs cuBLAS on both, 1.00x Triton vs kb8.</text>`);
  L.push(`<text x="0" y="344" font-family="monospace" font-size="11.5" fill="${BLUE}">Triton >= kb8 on 8 of 10 rows. Sampled fp64 error identical to 2 s.f. on every row.</text>`);
  return `<svg viewBox="0 0 740 354" role="img" aria-label="Triton W8A16 matches or beats the hand-written kernel on eight of ten shapes">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================================ 12. codegen or config? (crisp)
F.attribution = () => {
  const rows = [
    ['gate_up  M=1', 39.0, 71.7, 42.6, 'CODEGEN'],
    ['gate_up  M=16', 39.3, 53.0, 47.9, 'CODEGEN'],
    ['down_proj M=1', 34.0, 33.6, 23.3, 'CONFIG'],
    ['down_proj M=16', 34.2, 35.9, 23.2, 'CONFIG'],
  ];
  const s = v => (v / 80 * 380).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">THE SAME TRITON KERNEL, FORCED TO USE KB8'S OWN TILE CONFIG</text>`);
  rows.forEach(([n, k, tk, tb, v], i) => {
    const y = 30 + i * 62;
    L.push(`<text x="0" y="${y + 14}" font-family="monospace" font-size="11.5" fill="${INK}">${n}</text>`);
    L.push(`<text x="0" y="${y + 32}" font-family="monospace" font-size="11" fill="${v === 'CONFIG' ? BLUE : ORANGE}">${v}</text>`);
    L.push(`<rect x="130" y="${y}" width="${s(k)}" height="14" fill="${ORANGE}" rx="2"/>`);
    L.push(`<text x="${(134 + +s(k)).toFixed(1)}" y="${y + 11}" font-family="monospace" font-size="10.5" fill="${ORANGE}">kb8 ${k}us</text>`);
    L.push(`<rect x="130" y="${y + 17}" width="${s(tk)}" height="14" fill="${v === 'CONFIG' ? BLUE : GRAY}" rx="2"/>`);
    L.push(`<text x="${(134 + +s(tk)).toFixed(1)}" y="${y + 28}" font-family="monospace" font-size="10.5" fill="${v === 'CONFIG' ? BLUE : GRAY}">triton @ kb8 cfg ${tk}us (${(k / tk).toFixed(2)}x)</text>`);
    L.push(`<rect x="130" y="${y + 34}" width="${s(tb)}" height="14" fill="${PALE_B}" rx="2"/>`);
    L.push(`<text x="${(134 + +s(tb)).toFixed(1)}" y="${y + 45}" font-family="monospace" font-size="10.5" fill="${MUTED}">triton @ own best ${tb}us</text>`);

  });
  L.push(`<line x1="0" y1="286" x2="700" y2="286" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="310" font-family="monospace" font-size="12" fill="${INK}">At a fixed config the hand-written kernel is equal (1.01x) or far better (0.54x).</text>`);
  L.push(`<text x="0" y="330" font-family="monospace" font-size="12" fill="${BLUE}">Triton wins overall because trying fifty configs is free. That is the whole story.</text>`);
  return `<svg viewBox="0 0 740 340" role="img" aria-label="At a fixed tile config the hand-written kernel is equal or better; Triton wins on search">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================================== 13. what search buys (crisp)
F.search_value = () => {
  const data = [
    ['qkv_proj', 1, 6.7, 6.7, 13.7], ['o_proj', 1, 6.2, 6.2, 13.2],
    ['gate_up', 1, 40.4, 41.3, 73.4], ['down_proj', 1, 21.7, 22.4, 58.2],
    ['lm_head', 1, 572.4, 627.4, 1719.3],
  ];
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">24 CONFIGS PER SHAPE, W8A16, M=1  ·  NORMALISED TO THE BEST CONFIG</text>`);
  data.forEach(([n, m, b, d, w], i) => {
    const y = 32 + i * 46;
    const sc = v => ((v / b - 1) / 2.1 * 440).toFixed(1);
    L.push(`<text x="0" y="${y + 17}" font-family="monospace" font-size="11.5" fill="${INK}">${n}</text>`);
    L.push(`<text x="152" y="${y + 17}" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="end">${b}us</text>`);
    L.push(`<line x1="160" y1="${y + 13}" x2="${(160 + +sc(w)).toFixed(1)}" y2="${y + 13}" stroke="${FAINT}" stroke-width="1.4"/>`);
    L.push(`<circle cx="160" cy="${y + 13}" r="5" fill="${BLUE}"/>`);
    L.push(`<text x="160" y="${y - 1}" font-family="monospace" font-size="9.5" fill="${BLUE}" text-anchor="middle">best</text>`);
    L.push(`<circle cx="${(160 + +sc(d)).toFixed(1)}" cy="${y + 13}" r="4.5" fill="${GRAY}"/>`);
    L.push(`<circle cx="${(160 + +sc(w)).toFixed(1)}" cy="${y + 13}" r="5" fill="${ORANGE}"/>`);
    L.push(`<text x="${(160 + +sc(w)).toFixed(1)}" y="${y - 1}" font-family="monospace" font-size="9.5" fill="${ORANGE}" text-anchor="middle">worst ${(w / b).toFixed(2)}x</text>`);
    // when the default IS the best, one label instead of two on top of each other
    L.push(+sc(d) < 14
      ? `<text x="176" y="${y + 30}" font-family="monospace" font-size="10" fill="${GRAY}">default = best</text>`
      : `<text x="${(160 + +sc(d)).toFixed(1)}" y="${y + 30}" font-family="monospace" font-size="10" fill="${GRAY}" text-anchor="middle">default ${(d / b).toFixed(2)}x</text>`);
  });
  L.push(`<line x1="0" y1="266" x2="700" y2="266" stroke="${FAINT}"/>`);
  L.push(`<text x="0" y="288" font-family="monospace" font-size="11.5" fill="${BLUE}">Search cost: 0-5 seconds for 24 configs, mostly compile cache.</text>`);
  L.push(`<text x="0" y="306" font-family="monospace" font-size="11.5" fill="${GRAY}">A naive BN=64/4 warps/3 stages default is within 0-10% of best everywhere.</text>`);
  L.push(`<text x="0" y="324" font-family="monospace" font-size="11.5" fill="${ORANGE}">The worst config is 1.6x-3.0x slower. The space matters; the cliff is easy to avoid.</text>`);
  return `<svg viewBox="0 0 740 334" role="img" aria-label="Config search costs seconds, a naive default is near-best, and the worst config is three times slower">\n  ${L.join('\n  ')}\n</svg>`;
};

// ============================================== 14. scale placement (crisp)
F.scale_modes = () => {
  const data = [
    ['qkv_proj',     7.73, 2.141, 2.042, 2.719],
    ['o_proj',       8.51, 2.892, 2.565, 2.545],
    ['gate_up_proj', 8.22, 3.037, 2.244, 2.351],
    ['down_proj',    6.69, 2.344, 1.898, 2.035],
  ];
  const X = v => (150 + v / 3.3 * 470).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">SAMPLED FP64 ERROR (x1e-2)  \u00b7  THREE SCALE PLACEMENTS  \u00b7  INT8 GROUP-128</text>`);
  // legend once, not per row
  const leg = [['bf16 weight', ORANGE, 150], ['fp32 weight (kb8)', BLUE, 276], ['fp32 partial', GRAY, 462]];
  for (const [lab, col, x] of leg) {
    L.push(`<circle cx="${x}" cy="34" r="4.5" fill="${col}"/>`);
    L.push(`<text x="${x + 10}" y="38" font-family="monospace" font-size="10.5" fill="${col}">${lab}</text>`);
  }
  data.forEach(([n, base, m0, m1, m2], i) => {
    const y = 56 + i * 40;
    L.push(`<rect x="0" y="${y - 12}" width="700" height="32" fill="${i % 2 ? '#fafbfb' : '#ffffff'}"/>`);
    L.push(`<text x="0" y="${y + 8}" font-family="monospace" font-size="11.5" fill="${INK}">${n}</text>`);
    L.push(`<line x1="${X(base / 10)}" y1="${y - 10}" x2="${X(base / 10)}" y2="${y + 18}" stroke="${GRAY}" stroke-width="1.5" stroke-dasharray="3 3"/>`);
    for (const [v, col] of [[m0, ORANGE], [m1, BLUE], [m2, GRAY]]) {
      L.push(`<circle cx="${X(v)}" cy="${y + 4}" r="5" fill="${col}" stroke="#fff" stroke-width="1.4"/>`);
    }
  });
  L.push(`<text x="0" y="234" font-family="monospace" font-size="10" fill="${GRAY}">dashed = unquantised bf16</text>`);
  L.push(`<line x1="150" y1="216" x2="620" y2="216" stroke="${INK}" stroke-width="1.1"/>`);
  for (const v of [1, 2, 3]) {
    L.push(`<line x1="${X(v)}" y1="216" x2="${X(v)}" y2="221" stroke="${INK}" stroke-width="1"/>`);
    L.push(`<text x="${X(v)}" y="234" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="middle">${v}e-2</text>`);
  }
  L.push(`<text x="0" y="262" font-family="monospace" font-size="11.5" fill="${INK}">Spread across placements: under 1.6x. Cost of quantising at all: about 3x.</text>`);
  L.push(`<text x="0" y="280" font-family="monospace" font-size="11.5" fill="${BLUE}">All the W8A16 error is in the quantiser. Part 3 argued it; this measures it.</text>`);
  return `<svg viewBox="0 0 740 290" role="img" aria-label="All three scale placements give similar error, far above the unquantised baseline">\n  ${L.join('\n  ')}\n</svg>`;
};

module.exports = F;
