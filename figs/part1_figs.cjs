// Every figure for Part 1, keyed. Conceptual figures are hand-drawn (roughjs,
// the library Excalidraw uses); quantitative ones are crisp, because a reader
// comparing bar lengths should not have to see through sketch wobble.
//
// Following siboehm's figure vocabulary: specific named threads rather than an
// abstract "warp", BM/BN/BK/TM/TN labelled on every tiling diagram, matrices
// drawn as exact grids with per-thread ownership highlighted, and pointer-
// advance arrows for the K loop.
const { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT } = require('./rough.cjs');

const F = {};
const PALE_B = '#c7dbf6';
const PALE_O = '#f2cdbc';

// ============================================================ 1. time split
F.time_split = () => `<svg viewBox="0 0 740 176" role="img" aria-label="Share of GPU time by kernel, prefill and decode">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">SHARE OF GPU TIME BY KERNEL</text>
  <text x="0" y="52" font-family="monospace" font-size="12" fill="${INK}">prefill</text>
  <rect x="78" y="40" width="467" height="18" fill="${BLUE}"/>
  <rect x="549" y="40" width="97" height="18" fill="${ORANGE}"/>
  <rect x="650" y="40" width="70" height="18" fill="#cbd1d6"/>
  <text x="86" y="53" font-family="monospace" font-size="11" fill="#fff">matmul  73.0%</text>
  <text x="555" y="53" font-family="monospace" font-size="10.5" fill="#fff">attn 15.4</text>
  <text x="655" y="53" font-family="monospace" font-size="10.5" fill="#333">rest 12</text>
  <text x="0" y="96" font-family="monospace" font-size="12" fill="${INK}">decode</text>
  <rect x="78" y="84" width="542" height="18" fill="${BLUE}"/>
  <rect x="624" y="84" width="54" height="18" fill="${ORANGE}"/>
  <rect x="682" y="84" width="38" height="18" fill="#cbd1d6"/>
  <text x="86" y="97" font-family="monospace" font-size="11" fill="#fff">matmul  84.7%</text>
  <text x="630" y="97" font-family="monospace" font-size="10.5" fill="#fff">8.4</text>
  <text x="687" y="97" font-family="monospace" font-size="10.5" fill="#333">6.9</text>
  <line x1="78" y1="118" x2="720" y2="118" stroke="${FAINT}"/>
  <text x="78" y="136" font-family="monospace" font-size="10.5" fill="${MUTED}">0%</text>
  <text x="383" y="136" font-family="monospace" font-size="10.5" fill="${MUTED}">50%</text>
  <text x="694" y="136" font-family="monospace" font-size="10.5" fill="${MUTED}">100%</text>
  <text x="0" y="158" font-family="monospace" font-size="10.5" fill="${MUTED}">Nsight Systems, RTX 4060 Laptop, Qwen2.5-0.5B. "matmul" is the GEMM kernels; "attn" is FlashAttention;</text>
  <text x="0" y="170" font-family="monospace" font-size="10.5" fill="${MUTED}">"rest" is RMSNorm, SiLU, sampling and KV-cache writes.</text>
</svg>`;

// ================================================== 2. CUDA thread hierarchy
F.thread_hierarchy = () => {
  const f = fig(740, 250, 21);
  f.caption(0, 14, 'a kernel launch, from the outside in');
  // grid of blocks
  f.text(8, 40, 'grid', { size: 15, fill: INK });
  f.grid(8, 50, 5, 4, 26, { outline: true });
  f.cells(8, 50, 26, [[1, 1]], { fill: PALE_B });
  f.dim(8, 44, 138, 44, 'gridDim.x', { mono: true, size: 11 });
  f.arrow(146, 90, 196, 90);
  // one block, of threads
  f.text(204, 40, 'one block', { size: 15, fill: INK });
  f.grid(204, 50, 8, 4, 26, { outline: true });
  f.cells(204, 50, 26, [[0, 0]], { fill: BLUE });
  f.cells(204, 50, 26, [[1, 0]], { fill: ORANGE });
  f.dim(204, 44, 412, 44, 'blockDim.x', { mono: true, size: 11 });
  f.arrow(420, 90, 470, 90);
  // one warp
  f.text(478, 40, 'one warp = 32 threads', { size: 15, fill: INK });
  f.grid(478, 50, 8, 4, 16, { outline: true });
  f.cells(478, 50, 16, [[0, 0]], { fill: BLUE });
  f.cells(478, 50, 16, [[1, 0]], { fill: ORANGE });
  f.text(478, 136, 'issued in lockstep:', { size: 13, fill: INK });
  f.text(478, 154, 'one instruction,', { size: 13, fill: INK });
  f.text(478, 172, '32 addresses at once', { size: 13, fill: BLUE });
  f.chip(204, 160, 't0', { fill: BLUE });
  f.chip(244, 160, 't1', { fill: ORANGE });
  f.text(286, 174, 'we will follow these two all the way down', { size: 13, fill: MUTED });
  f.caption(0, 222, 'Threads do not execute alone. The warp is the unit that talks to memory, and that is the fact every');
  f.caption(0, 240, 'optimization in this post is about.');
  return f.toSVG('CUDA launch hierarchy: grid of blocks, block of threads, warp of 32');
};

// ======================================================== 3. memory hierarchy
F.mem_hierarchy = () => {
  const f = fig(740, 290, 13);
  f.caption(0, 14, 'where a number can live  ·  RTX 4060 Laptop (sm_89)');
  const rows = [
    ['registers', '256 KB / SM', '~100 TB/s', '~1 cycle', 392, BLUE, 'solid'],
    ['shared mem', '100 KB / SM', '~12 TB/s', '~30 cycles', 300, BLUE, 'hachure'],
    ['L2 cache', '32 MB', '~2 TB/s', '~200 cycles', 196, GRAY, 'hachure'],
    ['DRAM', '8 GB', '227 GB/s', '~400 cycles', 92, ORANGE, 'solid'],
  ];
  f.text(236, 40, 'bandwidth (log scale)', { size: 12, fill: MUTED });
  f.text(646, 40, 'latency', { size: 12, fill: MUTED });
  rows.forEach(([name, size, bw, lat, w, col, style], i) => {
    const y = 52 + i * 48;
    f.rect(0, y, 120, 34, { fill: col, fillStyle: style, sw: 1.4, hachureGap: 6 });
    f.text(10, y + 22, name, { size: 14, fill: style === 'solid' ? '#fff' : INK,
                               halo: style === 'hachure' });
    f.text(130, y + 22, size, { size: 12.5, fill: INK, mono: true });
    f.rect(236, y + 8, w, 18, { fill: col, fillStyle: 'solid', sw: 1.1 });
    f.text(244, y + 22, bw, { size: 12, fill: '#fff', mono: true });
    f.text(646, y + 22, lat, { size: 12, fill: INK, mono: true });
  });
  f.line(0, 250, 720, 250, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 272, 'One step down costs about an order of magnitude of bandwidth and a similar factor of latency.');
  f.caption(0, 288, 'Every trick below is a way of moving work UP this diagram.');
  return f.toSVG('GPU memory hierarchy: size, bandwidth, latency at four levels');
};

// ========================================================= 4. matrix tiling
F.matrix_tiling = () => {
  const f = fig(740, 300, 31);
  f.caption(0, 14, 'the problem, tiled  ·  C = A x B');
  // A
  f.text(36, 42, 'A', { size: 16, fill: INK });
  f.grid(30, 52, 6, 8, 18, { outline: true });
  f.cells(30, 52, 18, [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2]], { fill: PALE_B });
  f.dim(30, 46, 138, 46, 'K', { mono: true, size: 11 });
  f.dim(24, 52, 24, 196, 'M', { mono: true, size: 11 });
  f.text(150, 128, 'x', { size: 18, fill: MUTED });
  // B
  f.text(176, 42, 'B', { size: 16, fill: INK });
  f.grid(172, 52, 8, 6, 18, { outline: true });
  f.cells(172, 52, 18, [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5]], { fill: PALE_O });
  f.dim(172, 46, 316, 46, 'N', { mono: true, size: 11 });
  f.dim(166, 52, 166, 160, 'K', { mono: true, size: 11 });
  f.text(330, 128, '=', { size: 18, fill: MUTED });
  // C
  f.text(360, 42, 'C', { size: 16, fill: INK });
  f.grid(356, 52, 8, 8, 18, { outline: true });
  f.cells(356, 52, 18, [[3, 2]], { fill: INK });
  f.region(356, 88, 72, 72, { stroke: BLUE, sw: 2 });
  f.dim(356, 46, 500, 46, 'N', { mono: true, size: 11 });
  f.text(516, 100, 'one output element', { size: 13, fill: INK });
  f.text(516, 118, 'needs one row of A', { size: 13, fill: BLUE });
  f.text(516, 136, 'and one column of B', { size: 13, fill: ORANGE });
  f.text(516, 172, 'one block owns the', { size: 13, fill: INK });
  f.text(516, 190, 'dashed tile:', { size: 13, fill: INK });
  f.text(516, 208, 'BM x BN of C', { size: 13, fill: BLUE, mono: true });
  f.line(0, 238, 720, 238, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 260, 'Every kernel in this post computes exactly this. What changes is which thread owns which part of C,');
  f.caption(0, 278, 'and how many times each input element has to cross the memory bus to get there.');
  f.caption(0, 296, 'The dashed tile and the labels BM / BN / BK recur in every diagram from here on.');
  return f.toSVG('The GEMM problem tiled: A times B equals C, with BM BN BK labelled');
};

// ========================================================== 5. naive access
F.naive_access = () => {
  const f = fig(740, 330, 11);
  f.caption(0, 14, 'the naive mapping: threadIdx.x picks the ROW of C');
  f.chip(0, 26, 't0', { fill: BLUE });
  f.chip(40, 26, 't1', { fill: ORANGE });
  f.text(84, 40, 'adjacent threads in the same warp', { size: 13, fill: MUTED });
  // A, rows far apart
  f.text(36, 78, 'A', { size: 15, fill: INK });
  f.grid(30, 88, 10, 6, 18, { outline: true });
  f.cells(30, 88, 18, [[3, 0]], { fill: BLUE });
  f.cells(30, 88, 18, [[3, 1]], { fill: ORANGE });
  f.arrow(14, 60, 40, 86, { stroke: BLUE });
  f.arrow(54, 60, 58, 104, { stroke: ORANGE });
  f.text(30, 216, 'row 0 and row 1 of A', { size: 12.5, fill: INK });
  f.text(30, 234, 'same k, different rows', { size: 12.5, fill: MUTED, mono: true });
  // the memory strip
  f.text(250, 78, 'A as it really sits in memory (row-major)', { size: 13, fill: MUTED });
  f.rect(250, 88, 460, 20, { fill: '#f4f6f7', fillStyle: 'solid', stroke: FAINT, sw: 1 });
  f.solid(268, 88, 14, 20, { fill: BLUE, stroke: BLUE, sw: 1 });
  f.rect(250, 116, 460, 20, { fill: '#f4f6f7', fillStyle: 'solid', stroke: FAINT, sw: 1 });
  f.solid(268, 116, 14, 20, { fill: ORANGE, stroke: ORANGE, sw: 1 });
  f.dim(282, 150, 710, 150, 'K floats = 3584 bytes apart', { size: 11.5 });
  f.text(250, 196, 'the two values t0 and t1 want are 3584 bytes apart,', { size: 13, fill: INK });
  f.text(250, 214, 'so they land in different 32-byte sectors.', { size: 13, fill: INK });
  f.text(250, 240, 'Across the whole warp: 32 sectors fetched,', { size: 13, fill: ORANGE });
  f.text(250, 258, '1024 bytes moved to deliver 128.', { size: 13, fill: ORANGE });
  f.line(0, 284, 720, 284, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 306, 'Measured: 0.112 TFLOPS, about 15 GB/s of useful bandwidth out of 227 GB/s available.');
  f.caption(0, 324, 'The kernel is not short of arithmetic. It is drowning in bytes it never uses.');
  return f.toSVG('Naive mapping: adjacent threads read rows of A 3584 bytes apart');
};

// ======================================================== 6. coalesced access
F.coalesced = () => {
  const f = fig(740, 310, 17);
  f.caption(0, 14, 'after the swap: threadIdx.x picks the COLUMN of C');
  f.chip(0, 26, 't0', { fill: BLUE });
  f.chip(40, 26, 't1', { fill: ORANGE });
  f.text(84, 40, 'the same two threads', { size: 13, fill: MUTED });
  // B, adjacent columns
  f.text(36, 78, 'B', { size: 15, fill: INK });
  f.grid(30, 88, 10, 6, 18, { outline: true });
  f.cells(30, 88, 18, [[4, 2]], { fill: BLUE });
  f.cells(30, 88, 18, [[5, 2]], { fill: ORANGE });
  f.arrow(14, 60, 102, 122, { stroke: BLUE });
  f.arrow(54, 60, 122, 122, { stroke: ORANGE });
  f.text(30, 216, 'same row of B,', { size: 12.5, fill: INK });
  f.text(30, 234, 'adjacent columns', { size: 12.5, fill: MUTED, mono: true });
  // memory strip: adjacent
  f.text(250, 78, 'B as it really sits in memory', { size: 13, fill: MUTED });
  f.rect(250, 88, 460, 20, { fill: '#f4f6f7', fillStyle: 'solid', stroke: FAINT, sw: 1 });
  f.solid(360, 88, 13, 20, { fill: BLUE, stroke: BLUE, sw: 1 });
  f.solid(373, 88, 13, 20, { fill: ORANGE, stroke: ORANGE, sw: 1 });
  f.solid(386, 88, 118, 20, { fill: PALE_B, stroke: PALE_B, sw: 1 });
  f.text(392, 103, 'the other 30 threads', { size: 10.5, fill: INK, mono: true });
  f.dim(360, 130, 504, 130, '32 adjacent floats = 128 bytes = ONE transaction', { size: 11.5 });
  f.text(250, 180, 'identical arithmetic. identical instruction count.', { size: 13, fill: INK });
  f.text(250, 198, 'only the addresses moved.', { size: 13, fill: INK });
  f.text(250, 226, '1024 bytes  ->  128 bytes', { size: 14, fill: BLUE, mono: true });
  f.text(250, 248, '0.112  ->  0.847 TFLOPS   (7.6x)', { size: 14, fill: BLUE, mono: true });
  f.line(0, 274, 720, 274, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 296, 'A is now read at one address by all 32 threads, which the hardware broadcasts for free.');
  return f.toSVG('Coalesced mapping: adjacent threads read adjacent floats, one transaction');
};

// ==================================================== 7. smem tiling, K loop
F.smem_kloop = () => {
  const f = fig(740, 300, 23);
  f.caption(0, 14, 'walking the K dimension in chunks of BK');
  // A strip with three chunks
  f.text(30, 44, 'A', { size: 15, fill: INK });
  f.grid(30, 54, 9, 4, 20, { outline: true });
  f.region(30, 54, 60, 80, { stroke: BLUE, sw: 2 });
  f.region(90, 54, 60, 80, { stroke: MUTED, sw: 1.2, dash: '3 3' });
  f.region(150, 54, 60, 80, { stroke: MUTED, sw: 1.2, dash: '3 3' });
  f.dim(30, 48, 90, 48, 'BK', { mono: true, size: 11 });
  f.arrow(60, 146, 120, 146, { stroke: BLUE, sw: 1.2 });
  f.text(126, 150, 'A += BK', { size: 12, fill: BLUE, mono: true });
  // B strip
  f.text(280, 44, 'B', { size: 15, fill: INK });
  f.grid(280, 54, 4, 9, 20, { outline: true });
  f.region(280, 54, 80, 60, { stroke: ORANGE, sw: 2 });
  f.region(280, 114, 80, 60, { stroke: MUTED, sw: 1.2, dash: '3 3' });
  f.region(280, 174, 80, 60, { stroke: MUTED, sw: 1.2, dash: '3 3' });
  f.dim(274, 54, 274, 114, 'BK', { mono: true, size: 11 });
  f.arrow(372, 84, 372, 144, { stroke: ORANGE, sw: 1.2 });
  f.text(380, 120, 'B += BK*N', { size: 12, fill: ORANGE, mono: true });
  // SMEM boxes
  f.text(470, 44, 'shared memory', { size: 14, fill: INK });
  f.rect(470, 54, 100, 60, { fill: BLUE, fillStyle: 'hachure', sw: 1.4, hachureGap: 7 });
  f.text(500, 90, 'As', { size: 15, fill: INK, mono: true });
  f.rect(590, 54, 100, 60, { fill: ORANGE, fillStyle: 'hachure', sw: 1.4, hachureGap: 7 });
  f.text(624, 90, 'Bs', { size: 15, fill: INK, mono: true });
  f.text(470, 140, 'loaded once per chunk,', { size: 13, fill: INK });
  f.text(470, 158, 'then read BS times', { size: 13, fill: INK });
  f.text(470, 176, 'from 30 cycles away', { size: 13, fill: BLUE });
  f.text(470, 206, 'DRAM trips per element:', { size: 12.5, fill: MUTED });
  f.text(470, 224, 'K  ->  K/BK', { size: 14, fill: BLUE, mono: true });
  f.line(0, 250, 720, 250, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 272, 'A 32x reduction in DRAM traffic. It bought 1.3x: 0.847 -> 1.121 TFLOPS.');
  f.caption(0, 290, 'The bottleneck simply moved -- the inner loop now does two SHARED-memory loads per multiply-add.');
  return f.toSVG('Shared-memory cache blocking with pointer advance through K');
};

// ==================================================== 8. cooperative GMEM load
F.gmem_load = () => {
  const f = fig(740, 250, 29);
  f.caption(0, 14, 'who loads what: 256 threads filling a 128x8 tile of As');
  f.grid(30, 40, 16, 8, 20, { outline: true });
  const tag = (c, r, label, col) => {
    f.cells(30, 40, 20, [[c, r]], { fill: col, opacity: 0.85 });
    f.text(30 + c * 20 + 10, 40 + r * 20 + 14, label,
      { size: 9, fill: '#fff', anchor: 'middle', mono: true });
  };
  for (let c = 0; c < 8; c++) tag(c, 0, `t${c}`, BLUE);
  for (let c = 0; c < 8; c++) tag(c, 1, `t${c + 8}`, ORANGE);
  f.text(360, 60, 'innerRowA = threadIdx.x / BK', { size: 12.5, fill: INK, mono: true });
  f.text(360, 80, 'innerColA = threadIdx.x % BK', { size: 12.5, fill: INK, mono: true });
  f.text(360, 112, 'consecutive threads take consecutive', { size: 13, fill: INK });
  f.text(360, 130, 'COLUMNS, so the tile is filled with', { size: 13, fill: INK });
  f.text(360, 148, 'coalesced reads too', { size: 13, fill: BLUE });
  f.dim(30, 34, 190, 34, 'BK = 8', { mono: true, size: 11 });
  f.dim(24, 40, 24, 200, 'BM = 128', { mono: true, size: 11 });
  f.line(0, 214, 720, 214, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 236, 'The same coalescing rule from section 4, applied to filling the cache rather than to the arithmetic.');
  return f.toSVG('Cooperative global-to-shared load: thread to address mapping');
};

// ======================================================= 9. 1D blocktiling
F.blocktile_1d = () => {
  const f = fig(740, 280, 37);
  f.caption(0, 14, 'one thread, TM outputs stacked down a column of C');
  f.text(30, 44, 'As', { size: 14, fill: INK, mono: true });
  f.grid(30, 54, 1, 8, 22, { outline: true });
  f.cells(30, 54, 22, [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7]], { fill: BLUE });
  f.dim(24, 54, 24, 230, 'TM = 8', { mono: true, size: 11 });
  f.text(84, 44, 'Bs', { size: 14, fill: INK, mono: true });
  f.grid(84, 54, 1, 1, 22, { outline: true });
  f.cells(84, 54, 22, [[0, 0]], { fill: ORANGE });
  f.text(112, 70, 'ONE value', { size: 13, fill: ORANGE });
  f.text(112, 88, 'held in a register', { size: 12.5, fill: MUTED });
  f.text(200, 44, 'C', { size: 14, fill: INK, mono: true });
  f.grid(200, 54, 1, 8, 22, { outline: true });
  f.cells(200, 54, 22, [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7]], { fill: '#8aa9d6' });
  for (let i = 0; i < 8; i++) f.arrow(112, 65 + i * 3, 196, 65 + i * 22, { stroke: ORANGE, sw: 0.8, head: 5, roughness: 0.5 });
  f.text(266, 90, 'that single Bs value is reused', { size: 13.5, fill: INK });
  f.text(266, 110, 'for all TM rows', { size: 13.5, fill: INK });
  f.text(266, 146, 'loads per multiply-add:', { size: 12.5, fill: MUTED });
  f.text(266, 166, '2.00  ->  1.13', { size: 15, fill: BLUE, mono: true });
  f.text(266, 196, '1.121  ->  3.712 TFLOPS', { size: 14, fill: BLUE, mono: true });
  f.line(0, 226, 720, 226, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 248, 'The first real jump in the whole post, and it comes from giving one thread more to do rather than');
  f.caption(0, 266, 'from touching memory differently.');
  return f.toSVG('1D blocktiling: one Bs value feeds TM multiply-adds');
};

// ======================================================= 10. outer product
F.outer_product = () => {
  const f = fig(740, 320, 5);
  f.caption(0, 14, 'one thread, one step of k, TM x TN outputs');
  f.text(4, 46, 'regM', { size: 14, fill: BLUE });
  f.text(0, 62, '8 from As', { size: 11, fill: MUTED });
  for (let i = 0; i < 8; i++) f.raw(`<rect x="58" y="${78 + i * 23}" width="20" height="19" fill="${BLUE}"/>`);
  f.dim(52, 78, 52, 262, 'TM', { mono: true, size: 11 });
  f.text(94, 46, 'regN', { size: 14, fill: ORANGE });
  f.text(142, 46, '8 from Bs', { size: 11, fill: MUTED });
  for (let j = 0; j < 8; j++) f.raw(`<rect x="${94 + j * 23}" y="55" width="19" height="19" fill="${ORANGE}"/>`);
  f.dim(94, 49, 278, 49, 'TN', { mono: true, size: 11 });
  f.rect(94, 78, 184, 184, { fill: BLUE, fillStyle: 'hachure', hachureGap: 13, hachureAngle: -45, sw: 1.5 });
  for (let i = 1; i < 8; i++) {
    f.line(94 + i * 23, 78, 94 + i * 23, 262, { stroke: '#b8cdea', sw: 0.7, roughness: 0.5 });
    f.line(94, 78 + i * 23, 278, 78 + i * 23, { stroke: '#b8cdea', sw: 0.7, roughness: 0.5 });
  }
  f.arrow(292, 120, 328, 120);
  f.text(340, 112, '16 values loaded', { size: 15, fill: INK });
  f.text(340, 134, '64 multiply-adds', { size: 15, fill: INK });
  f.text(340, 156, '0.25 loads per FMA', { size: 15, fill: BLUE });
  f.line(340, 176, 706, 176, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.text(340, 200, 'rung 3   1 output / thread', { size: 13, fill: MUTED });
  f.text(636, 200, '2.00', { size: 13, fill: ORANGE, mono: true });
  f.text(340, 222, 'rung 4   8x1 / thread', { size: 13, fill: MUTED });
  f.text(636, 222, '1.13', { size: 13, fill: MUTED, mono: true });
  f.text(340, 244, 'rung 5   8x8 / thread', { size: 13, fill: MUTED });
  f.text(636, 244, '0.25', { size: 13, fill: BLUE, mono: true });
  f.text(660, 200, 'loads', { size: 10.5, fill: MUTED });
  f.text(660, 212, 'per FMA', { size: 10.5, fill: MUTED });
  f.line(0, 276, 720, 276, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 298, 'The 64 running sums live in registers and never touch memory until the kernel ends.');
  f.caption(0, 316, 'Measured: 3.712 -> 4.695 TFLOPS.');
  return f.toSVG('Register outer product: 16 loaded values produce 64 multiply-adds');
};

// ========================================================= 11. loop nesting
F.loop_nest = () => {
  const f = fig(740, 250, 41);
  f.caption(0, 14, 'the four nested loops, outermost first');
  const boxes = [
    ['bkIdx', 'walk K in chunks of BK', 0, 30, 700, 200, BLUE],
    ['dotIdx', 'one column of the BK chunk', 24, 62, 652, 152, ORANGE],
    ['load regM / regN', 'TM + TN values into registers', 48, 94, 604, 44, GRAY],
    ['resIdxM x resIdxN', 'TM x TN fused multiply-adds', 48, 150, 604, 52, BLUE],
  ];
  boxes.forEach(([name, note, x, y, w, h, col], i) => {
    f.rect(x, y, w, h, { sw: 1.5, stroke: col, roughness: 0.9 });
    f.text(x + 12, y + 22, name, { size: 14, fill: col, mono: true });
    f.text(x + 12 + (name.length * 8.2), y + 22, note, { size: 12.5, fill: MUTED });
  });
  f.text(60, 176, 'the 64 FMAs live here', { size: 13, fill: INK });
  f.text(60, 194, 'and this is the ONLY place memory is not touched', { size: 12.5, fill: BLUE });
  f.caption(0, 244, 'Nest it the other way -- loads inside the arithmetic -- and the fragments spill out of registers. Same maths, a third of the speed.');
  return f.toSVG('Loop nesting: bkIdx, dotIdx, register load, then the TM by TN FMAs');
};

// ============================================================ 12. transpose
F.transpose = () => {
  const f = fig(740, 260, 43);
  f.caption(0, 14, 'the 8 values one thread needs from As, in one k step');
  f.text(0, 48, 'As stored [BM][BK]', { size: 14, fill: ORANGE });
  f.grid(200, 34, 8, 4, 20, { outline: true });
  f.cells(200, 34, 20, [[2, 0], [2, 1], [2, 2], [2, 3]], { fill: ORANGE });
  f.text(376, 60, 'stride BK apart', { size: 13, fill: ORANGE });
  f.text(376, 80, '8 x LDS.32', { size: 14, fill: ORANGE, mono: true });
  f.text(0, 152, 'As stored [BK][BM]', { size: 14, fill: BLUE });
  f.grid(200, 138, 8, 1, 20, { outline: true });
  f.cells(200, 138, 20, [[2, 0], [3, 0], [4, 0], [5, 0]], { fill: BLUE });
  f.text(376, 152, 'contiguous', { size: 13, fill: BLUE });
  f.text(376, 172, '2 x LDS.128', { size: 14, fill: BLUE, mono: true });
  f.arrow(300, 118, 300, 132, { stroke: INK });
  f.text(312, 128, 'transpose as it lands in shared memory', { size: 12.5, fill: MUTED });
  f.line(0, 202, 720, 202, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 224, 'Costs 4 scalar SMEM writes once per tile; saves 6 SMEM reads per thread per k step.');
  f.caption(0, 242, 'With float4 on the global loads: 4.695 -> 7.252 TFLOPS, 83% of cuBLAS.');
  return f.toSVG('Transposing As turns eight scattered reads into two vectorized ones');
};

// ============================================================ 13. warptiling
F.warptile = () => {
  const f = fig(740, 330, 47);
  f.caption(0, 14, 'three levels of ownership: block, then warp, then thread');
  f.grid(20, 34, 8, 8, 26, { outline: true });
  f.region(20, 34, 104, 104, { stroke: BLUE, sw: 2 });
  f.region(124, 34, 104, 104, { stroke: MUTED, sw: 1.2, dash: '4 3' });
  f.region(20, 138, 104, 104, { stroke: MUTED, sw: 1.2, dash: '4 3' });
  f.region(124, 138, 104, 104, { stroke: MUTED, sw: 1.2, dash: '4 3' });
  f.cells(20, 34, 26, [[0, 0], [1, 0]], { fill: BLUE });
  f.dim(20, 28, 228, 28, 'BN', { mono: true, size: 11 });
  f.dim(14, 34, 14, 242, 'BM', { mono: true, size: 11 });
  f.dim(20, 252, 124, 252, 'WN', { mono: true, size: 11 });
  f.text(248, 56, 'the block tile splits into', { size: 13.5, fill: INK });
  f.text(248, 74, 'four WARP tiles (WM x WN),', { size: 13.5, fill: BLUE });
  f.text(248, 92, 'each split into thread tiles', { size: 13.5, fill: INK });
  f.text(248, 110, '(TM x TN)', { size: 13.5, fill: MUTED, mono: true });
  // schedulers
  f.text(248, 152, 'why: each SM has four warp schedulers', { size: 13, fill: INK });
  for (let i = 0; i < 4; i++) {
    f.rect(248 + i * 76, 164, 66, 34, { fill: i === 0 ? BLUE : GRAY, fillStyle: 'hachure', sw: 1.3, hachureGap: 6 });
    // label sits on hachure, so it needs the halo
    f.text(281 + i * 76, 186, `sched ${i}`, { size: 11, fill: INK, anchor: 'middle', mono: true, halo: true });
  }
  f.text(248, 222, 'giving each warp a contiguous rectangle keeps its', { size: 12.5, fill: MUTED });
  f.text(248, 240, 'reads in the same SMEM banks and lets the four', { size: 12.5, fill: MUTED });
  f.text(248, 258, 'schedulers stay out of each other’s way', { size: 12.5, fill: MUTED });
  f.line(0, 284, 720, 284, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 306, 'Same kernel as rung 6 plus one level of hierarchy. What it is worth depends entirely on the tile');
  f.caption(0, 324, 'parameters -- which is the subject of the next figure.');
  return f.toSVG('Warptiling: block tile splits into warp tiles then thread tiles');
};

// ====================================================== 14. tile quantization
F.tile_quant = () => {
  const f = fig(740, 300, 53);
  f.caption(0, 14, 'why a big tile can be the wrong tile: 896 columns, 512 rows');
  // 128x128 tiles -> 7 x 4 = 28 blocks
  f.text(0, 42, 'BM=BN=128', { size: 13.5, fill: ORANGE, mono: true });
  f.grid(0, 52, 7, 4, 22, { outline: true });
  f.text(0, 168, '28 blocks', { size: 13, fill: INK, mono: true });
  f.text(0, 186, 'on 24 SMs', { size: 13, fill: INK, mono: true });
  // the wave picture
  f.text(190, 42, 'how they land on 24 SMs', { size: 13.5, fill: INK });
  for (let i = 0; i < 24; i++) {
    f.raw(`<rect x="${190 + (i % 12) * 20}" y="${52 + Math.floor(i / 12) * 22}" width="17" height="18" fill="${ORANGE}"/>`);
  }
  f.text(190, 112, 'wave 1: all 24 busy', { size: 12, fill: ORANGE, mono: true });
  for (let i = 0; i < 24; i++) {
    const on = i < 4;
    f.raw(`<rect x="${190 + (i % 12) * 20}" y="${130 + Math.floor(i / 12) * 22}" width="17" height="18" ` +
          `fill="${on ? ORANGE : '#eceff1'}" stroke="${on ? 'none' : '#d8dcdf'}"/>`);
  }
  f.text(190, 190, 'wave 2: 4 busy, 20 IDLE', { size: 12, fill: ORANGE, mono: true });
  // small tile
  f.text(460, 42, 'BM=BN=64', { size: 13.5, fill: BLUE, mono: true });
  f.grid(460, 52, 14, 8, 11, { outline: true });
  f.text(460, 168, '112 blocks', { size: 13, fill: BLUE, mono: true });
  f.text(460, 186, '4.7 full waves -- the', { size: 12.5, fill: BLUE });
  f.text(460, 204, 'ragged edge is amortised', { size: 12.5, fill: BLUE });
  f.line(0, 232, 720, 232, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 254, 'This is why the A6000 configuration loses here. Its 128x128 tile is right for 84 SMs and wrong for 24,');
  f.caption(0, 272, 'and nothing about the kernel code has to change to fix it -- only the template parameters.');
  f.caption(0, 290, 'If I had only ever benchmarked square 4096x4096, I would never have seen it.');
  return f.toSVG('Tile quantization: a 128 tile makes 28 blocks on 24 SMs, wasting most of a second wave');
};

// ============================================================== 15. a6000
F.a6000 = () => `<svg viewBox="0 0 740 262" role="img" aria-label="Same warptiling kernel, A6000 config versus retuned for 24 SMs">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">SAME KERNEL, DIFFERENT TILE PARAMETERS &#183; TFLOPS</text>
  <g font-family="monospace" font-size="10.5">
  <text x="0" y="44" fill="${INK}">qkv_proj  M=128</text>
  <rect x="132" y="32" width="93" height="15" fill="#cbd1d6"/><text x="231" y="44" fill="${MUTED}">1.854  A6000 config</text>
  <rect x="132" y="49" width="177" height="15" fill="${BLUE}"/><text x="315" y="61" fill="${BLUE}">3.547  retuned &#8594; +91%</text>
  <text x="0" y="98" fill="${INK}">o_proj    M=128</text>
  <rect x="132" y="86" width="72" height="15" fill="#cbd1d6"/><text x="210" y="98" fill="${MUTED}">1.442</text>
  <rect x="132" y="103" width="138" height="15" fill="${BLUE}"/><text x="276" y="115" fill="${BLUE}">2.764  +92%</text>
  <text x="0" y="152" fill="${INK}">down_proj M=128</text>
  <rect x="132" y="140" width="82" height="15" fill="#cbd1d6"/><text x="220" y="152" fill="${MUTED}">1.631</text>
  <rect x="132" y="157" width="155" height="15" fill="${BLUE}"/><text x="293" y="169" fill="${BLUE}">3.103  +90%</text>
  <text x="0" y="206" fill="${INK}">lm_head   M=128</text>
  <rect x="132" y="194" width="380" height="15" fill="#cbd1d6"/><text x="518" y="206" fill="${MUTED}">7.604  A6000 config</text>
  <rect x="132" y="211" width="309" height="15" fill="${ORANGE}"/><text x="447" y="223" fill="${ORANGE}">6.182  retuned &#8594; &#8722;19%</text>
  </g>
  <line x1="132" y1="238" x2="720" y2="238" stroke="${FAINT}"/>
  <text x="0" y="256" font-family="monospace" font-size="10.5" fill="${MUTED}">A6000 config: 128x128 block tile, 128 accumulators/thread. Retuned winners on 24 SMs: 64x64 and 32x128, 32 accumulators.</text>
</svg>`;

// ======================================================= 16. double buffering
F.dbuf_timeline = () => {
  const f = fig(740, 220, 59);
  f.caption(0, 14, 'time ->');
  f.text(0, 46, 'single', { size: 14, fill: INK });
  const seg = (x, y, w, label, col, style) => {
    f.rect(x, y, w, 18, { fill: col, fillStyle: style || 'solid', sw: 1.2, hachureGap: 5 });
    if (label) f.text(x + 6, y + 13, label,
                      { size: 10.5, fill: style ? INK : '#fff', mono: true, halo: !!style });
  };
  seg(70, 34, 92, 'load i', ORANGE);
  f.rect(162, 34, 22, 18, { fill: '#eceff1', fillStyle: 'solid', stroke: '#d8dcdf', sw: 1 });
  seg(184, 34, 62, 'math i', BLUE);
  seg(246, 34, 92, 'load i+1', ORANGE);
  f.rect(338, 34, 22, 18, { fill: '#eceff1', fillStyle: 'solid', stroke: '#d8dcdf', sw: 1 });
  seg(360, 34, 62, 'math i+1', BLUE);
  seg(422, 34, 92, 'load i+2', ORANGE);
  f.text(524, 47, 'stalls twice per tile', { size: 12.5, fill: MUTED });
  f.text(0, 100, 'double', { size: 14, fill: INK });
  seg(70, 88, 92, 'load i', ORANGE);
  seg(162, 88, 62, 'math i', BLUE);
  seg(162, 108, 92, 'load i+1', ORANGE, 'hachure');
  seg(224, 88, 62, 'math i+1', BLUE);
  seg(224, 108, 92, 'load i+2', ORANGE, 'hachure');
  seg(286, 88, 62, 'math i+2', BLUE);
  f.text(360, 101, 'the loads are still there,', { size: 12.5, fill: MUTED });
  f.text(360, 119, 'just no longer on the critical path', { size: 12.5, fill: MUTED });
  f.line(0, 150, 720, 150, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.caption(0, 172, 'Double buffering does not make anything faster. It makes the waiting happen somewhere else.');
  f.caption(0, 190, 'Measured: 7.591 -> 8.115 TFLOPS, 97.9% of cuBLAS on this shape.');
  f.caption(0, 212, 'That is the last rung.');
  return f.toSVG('Single versus double buffered K loop timeline');
};

// ============================================================== 17. ladder
F.ladder = () => {
  const rungs = [
    ['1  naive', 0.112, 7, ORANGE], ['2  coalesce', 0.847, 53, ORANGE],
    ['3  shared mem', 1.121, 71, ORANGE], ['4  1D blocktile', 3.712, 234, '#7a97c4'],
    ['5  2D blocktile', 4.695, 296, '#7a97c4'], ['6  vectorize', 7.252, 457, BLUE],
    ['7  warptile (A6000)', 7.089, 447, '#cbd1d6'], ['8  warptile (tuned)', 7.591, 478, BLUE],
    ['9  + double buffer', 8.115, 511, BLUE],
  ];
  const rows = rungs.map(([name, v, w, col], i) => {
    const y = 34 + i * 22;
    return `  <text x="0" y="${y + 10}" fill="${INK}">${name}</text>\n` +
      `  <rect x="196" y="${y}" width="${w}" height="14" fill="${col}"/>\n` +
      `  <text x="${202 + w}" y="${y + 11}" fill="${i === 8 ? BLUE : MUTED}">${v.toFixed(3)}</text>`;
  }).join('\n');
  return `<svg viewBox="0 0 740 320" role="img" aria-label="All nine kernel versions in TFLOPS against cuBLAS">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">o_proj (896x896), M=2048, fp32 &#183; TFLOPS</text>
  <line x1="196" y1="24" x2="700" y2="24" stroke="${FAINT}"/>
  <text x="196" y="20" font-family="monospace" font-size="9.5" fill="#999">0</text>
  <text x="440" y="20" font-family="monospace" font-size="9.5" fill="#999">4</text>
  <text x="684" y="20" font-family="monospace" font-size="9.5" fill="#999">8</text>
  <g font-family="monospace" font-size="10.5">
${rows}
  </g>
  <line x1="708" y1="30" x2="708" y2="238" stroke="${INK}" stroke-dasharray="3 3"/>
  <text x="600" y="252" font-family="monospace" font-size="10.5" fill="${INK}">cuBLAS 8.138</text>
  <text x="0" y="280" font-family="monospace" font-size="11" fill="${BLUE}">72.8x from rung 1 to rung 9. 97.9% of cuBLAS.</text>
  <text x="0" y="300" font-family="monospace" font-size="10.5" fill="${MUTED}">A sustained fp32 GEMM on this GPU measured 7.02 TFLOPS earlier in the project, and both cuBLAS and rung 9</text>
  <text x="0" y="314" font-family="monospace" font-size="10.5" fill="${MUTED}">beat it here, because that 7.02 was itself measured under sustained load while these bursts run hotter.</text>
</svg>`;
};

// ============================================================ 18. inversion
F.inversion = () => `<svg viewBox="0 0 740 258" role="img" aria-label="The same nine kernels at M=1, where the ladder inverts">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">o_proj (896x896), M=1 &#183; TFLOPS &#183; SAME NINE KERNELS</text>
  <line x1="196" y1="24" x2="700" y2="24" stroke="${FAINT}"/>
  <text x="196" y="20" font-family="monospace" font-size="9.5" fill="#999">0</text>
  <text x="440" y="20" font-family="monospace" font-size="9.5" fill="#999">0.16</text>
  <text x="674" y="20" font-family="monospace" font-size="9.5" fill="#999">0.32</text>
  <g font-family="monospace" font-size="10.5">
  <text x="0" y="44" fill="${INK}">1  naive</text>
  <rect x="196" y="34" width="25" height="14" fill="#cbd1d6"/><text x="227" y="45" fill="${MUTED}">0.016</text>
  <text x="0" y="66" fill="${INK}">2  coalesce</text>
  <rect x="196" y="56" width="46" height="14" fill="${BLUE}"/><text x="248" y="67" fill="${BLUE}">0.029</text>
  <text x="0" y="88" fill="${INK}">3  shared mem</text>
  <rect x="196" y="78" width="31" height="14" fill="#cbd1d6"/><text x="233" y="89" fill="${MUTED}">0.020</text>
  <text x="0" y="110" fill="${INK}">4  1D blocktile</text>
  <rect x="196" y="100" width="39" height="14" fill="#cbd1d6"/><text x="241" y="111" fill="${MUTED}">0.025</text>
  <text x="0" y="132" fill="${INK}">5  2D blocktile</text>
  <rect x="196" y="122" width="16" height="14" fill="${ORANGE}"/><text x="218" y="133" fill="${ORANGE}">0.010  &#8592; slower than rung 2</text>
  <text x="0" y="154" fill="${INK}">6  vectorize</text>
  <rect x="196" y="144" width="22" height="14" fill="${ORANGE}"/><text x="224" y="155" fill="${MUTED}">0.014</text>
  <text x="0" y="176" fill="${INK}">9  + double buffer</text>
  <rect x="196" y="166" width="58" height="14" fill="${BLUE}"/><text x="260" y="177" fill="${MUTED}">0.037</text>
  </g>
  <line x1="690" y1="30" x2="690" y2="194" stroke="${INK}" stroke-dasharray="3 3"/>
  <text x="560" y="208" font-family="monospace" font-size="10.5" fill="${INK}">cuBLAS 0.314</text>
  <text x="0" y="234" font-family="monospace" font-size="11" fill="${ORANGE}">The best kernel of the nine reaches 11.7% of cuBLAS. The ladder has inverted.</text>
  <text x="0" y="252" font-family="monospace" font-size="10.5" fill="${MUTED}">Rung 5 &#8212; the register outer product, the idea that unlocked everything at M=2048 &#8212; is now 3x slower than rung 2.</text>
</svg>`;

module.exports = F;
