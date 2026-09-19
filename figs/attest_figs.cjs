// Figures for the attest post. Same two-style policy as the GEMM series.
const { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT } = require('./rough.cjs');

const F = {};
const PALE_B = '#c7dbf6';
const PALE_O = '#f2cdbc';
const DIM = '#cbd1d6';

// ============================================== 1. where the field is (crisp)
F.field_state = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">REPORTED FAST_1 ON KERNELBENCH LEVEL 1  ·  FROM THE 2026 SURVEY</text>`);
  const rows = [
    ['KernelCoder (SFT)', 17.0, GRAY],
    ['InCoder-32B (SFT)', 22.2, GRAY],
    ['Kernel-Smith (agent)', 70.0, BLUE],
  ];
  rows.forEach(([lab, v, col], i) => {
    const y = 36 + i * 42;
    L.push(`<text x="0" y="${y + 17}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="230" y="${y}" width="${(v / 100 * 420).toFixed(1)}" height="24" fill="${col}" rx="3"/>`);
    L.push(`<text x="${(238 + v / 100 * 420).toFixed(1)}" y="${y + 17}" font-family="monospace" font-size="13" fill="${col}">${v}%</text>`);
  });
  L.push(`<line x1="230" y1="30" x2="230" y2="168" stroke="${INK}" stroke-width="1.3"/>`);
  L.push(`<line x1="650" y1="30" x2="650" y2="168" stroke="${FAINT}" stroke-width="1" stroke-dasharray="4 3"/>`);
  L.push(`<text x="650" y="184" font-family="monospace" font-size="10.5" fill="${MUTED}" text-anchor="middle">100%</text>`);
  L.push(`<text x="0" y="212" font-family="monospace" font-size="11.5" fill="${INK}">The generation numbers climb fast. What decides them is a benchmark harness.</text>`);
  L.push(`<text x="0" y="232" font-family="monospace" font-size="10.5" fill="${MUTED}">A fourth system reports "99% faster than PyTorch eager", which is a different metric and not plotted beside these.</text>`);
  return `<svg viewBox="0 0 740 242" role="img" aria-label="Reported fast_1 rates on KernelBench Level 1 from the 2026 survey">\n  ${L.join('\n  ')}\n</svg>`;
};

// ====================================== 2. the harness, copy-pasted (hand)
F.scattered = () => {
  const f = fig(740, 320, 401);
  f.caption(0, 14, 'the discipline existed — as copy-paste');
  const rows = [
    ['warmup', 14, ORANGE], ['gpu_state', 10, ORANGE],
    ['require_exclusive_gpu', 7, ORANGE], ['graph_time', 4, ORANGE],
    ['sample_truth / score', 1, BLUE],
  ];
  rows.forEach(([name, n, col], i) => {
    const y = 38 + i * 38;
    f.text(0, y + 16, name, { size: 12.5, fill: INK, mono: true });
    for (let k = 0; k < n; k++) {
      f.solid(232 + k * 22, y, 16, 20, { fill: col, stroke: col, sw: 1 });
    }
    f.text(232 + n * 22 + 8, y + 16, `${n} ${n === 1 ? 'file' : 'files'}`,
           { size: 11.5, fill: MUTED, mono: true });
  });
  f.line(0, 232, 720, 232, { stroke: FAINT, sw: 1, roughness: 0.4 });
  f.text(0, 256, 'graph_time lives in four files. Two of them rotate the inputs.', { size: 13, fill: INK });
  f.text(0, 276, 'I reached for one of the other two while writing Part 4, and it', { size: 13, fill: ORANGE });
  f.text(0, 296, 'reported 850 GB/s on a 227 GB/s bus.', { size: 13, fill: ORANGE });
  f.caption(0, 316, 'A rule that exists in fourteen copies is not a rule. It is a habit, and habits fail when you are busy.');
  return f.toSVG('Measurement primitives duplicated across many files, so one copy went stale');
};

// ================================================ 3. the three regimes (crisp)
F.regimes = () => {
  const X = e => (120 + (Math.log10(e) + 4) * 128).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">CORRECTNESS SCORE = MAX|ERR| / RMS(TRUTH)  ·  LOG SCALE  ·  BF16 ULP = 3.9E-3</text>`);
  // bands
  const bands = [['exact-ish', 1e-4, 1.56e-2, BLUE], ['lossy', 1.56e-2, 0.25, GRAY], ['WRONG', 0.25, 10, ORANGE]];
  for (const [nm, a, b, col] of bands) {
    L.push(`<rect x="${X(a)}" y="30" width="${(+X(b) - +X(a)).toFixed(1)}" height="86" fill="${col}" opacity="0.10"/>`);
    L.push(`<text x="${((+X(a) + +X(b)) / 2).toFixed(1)}" y="48" font-family="monospace" font-size="12" fill="${col}" text-anchor="middle">${nm}</text>`);
  }
  const pts = [
    ['bf16 GEMM', 7.97e-3, BLUE, 74],
    ['int8 group-128', 2.2e-2, GRAY, 96],
    ['cuBLAS default bf16 path', 7.6e-1, ORANGE, 74],
    ['a cp.async tail race', 1.58, ORANGE, 96],
  ];
  for (const [lab, e, col, y] of pts) {
    L.push(`<circle cx="${X(e)}" cy="${y}" r="5" fill="${col}"/>`);
    // labels near the right edge point back at their dot instead of off-canvas
    const right = +X(e) > 470;
    L.push(right
      ? `<text x="${(+X(e) - 10).toFixed(1)}" y="${y + 4}" font-family="monospace" font-size="10.5" fill="${col}" text-anchor="end">${lab}</text>`
      : `<text x="${(+X(e) + 10).toFixed(1)}" y="${y + 4}" font-family="monospace" font-size="10.5" fill="${col}">${lab}</text>`);
  }
  L.push(`<line x1="120" y1="122" x2="700" y2="122" stroke="${INK}" stroke-width="1.1"/>`);
  for (const e of [1e-4, 1e-3, 1e-2, 1e-1, 1]) {
    L.push(`<line x1="${X(e)}" y1="122" x2="${X(e)}" y2="127" stroke="${INK}" stroke-width="1"/>`);
    L.push(`<text x="${X(e)}" y="142" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="middle">${e}</text>`);
  }
  L.push(`<text x="0" y="172" font-family="monospace" font-size="11.5" fill="${INK}">The verdicts are orders of magnitude apart, so this is a gate, not a tuned threshold.</text>`);
  L.push(`<text x="0" y="192" font-family="monospace" font-size="10.5" fill="${MUTED}">cuBLAS's own default path lands in WRONG, which is the point of scoring against arithmetic instead of a library.</text>`);
  return `<svg viewBox="0 0 740 202" role="img" aria-label="Three correctness regimes: exact-ish, lossy and wrong, orders of magnitude apart">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================== 4. what sampling catches and misses (crisp)
F.sampling = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">SAME OUTPUT, CORRUPTED FOUR WAYS  ·  512 SAMPLES OF 155,648 ELEMENTS</text>`);
  L.push(`<text x="300" y="34" font-family="monospace" font-size="10.5" fill="${MUTED}">SAMPLED</text>`);
  L.push(`<text x="520" y="34" font-family="monospace" font-size="10.5" fill="${MUTED}">EXHAUSTIVE</text>`);
  const rows = [
    ['unmodified', '7.97e-03', 'exact-ish', '1.17e-02', 'exact-ish', false],
    ['one element zeroed', '7.97e-03', 'MISSED', '3.32e-01', 'WRONG', true],
    ['one row scaled 1.004x', '1.79e-02', 'lossy', '2.48e-02', 'lossy', false],
    ['last 256 columns zeroed', '1.58e+00', 'WRONG', '3.82e+00', 'WRONG', false],
  ];
  rows.forEach(([lab, ss, sv, es, ev, miss], i) => {
    const y = 44 + i * 38;
    L.push(`<rect x="0" y="${y}" width="700" height="32" fill="${miss ? '#fdf4f0' : (i % 2 ? '#fafbfb' : '#fff')}"/>`);
    L.push(`<text x="8" y="${y + 21}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<text x="300" y="${y + 21}" font-family="monospace" font-size="11.5" fill="${MUTED}">${ss}</text>`);
    L.push(`<text x="392" y="${y + 21}" font-family="monospace" font-size="11.5" fill="${miss ? ORANGE : (sv === 'WRONG' ? ORANGE : BLUE)}">${sv}</text>`);
    L.push(`<text x="520" y="${y + 21}" font-family="monospace" font-size="11.5" fill="${MUTED}">${es}</text>`);
    L.push(`<text x="612" y="${y + 21}" font-family="monospace" font-size="11.5" fill="${ev === 'WRONG' ? ORANGE : BLUE}">${ev}</text>`);
  });
  L.push(`<text x="0" y="216" font-family="monospace" font-size="11.5" fill="${ORANGE}">512 samples miss one bad element with probability 0.997. That is arithmetic, not a bug.</text>`);
  L.push(`<text x="0" y="236" font-family="monospace" font-size="11.5" fill="${INK}">Real kernel bugs are systematic: a race drops a tile, a wrong index shifts a row.</text>`);
  return `<svg viewBox="0 0 740 246" role="img" aria-label="Sampled verification catches systematic corruption but misses a single element">\n  ${L.join('\n  ')}\n</svg>`;
};

// ================================ 5. the lies, caught by the library (crisp)
F.caught = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">SAME KERNEL, SAME GPU, SAME AFTERNOON  ·  ONLY THE HARNESS DIFFERS</text>`);
  const sc = us => (us / 90 * 300).toFixed(1);
  const groups = [
    ['gate_up_proj  (17.4 MB, fits L2)', [
      ['one pinned input', 50.0, 348, 4, ORANGE],
      ['rotated past L2', 81.3, 214, 1, BLUE]]],
    ['o_proj M=1  (1.6 MB)', [
      ['eager timing', 24.3, 66, 2, ORANGE],
      ['CUDA graph', 10.3, 156, 1, BLUE]]],
  ];
  let y = 34;
  for (const [title, rows] of groups) {
    L.push(`<text x="0" y="${y + 12}" font-family="monospace" font-size="11.5" fill="${INK}">${title}</text>`);
    y += 22;
    for (const [lab, us, gb, nf, col] of rows) {
      L.push(`<text x="16" y="${y + 15}" font-family="monospace" font-size="11" fill="${MUTED}">${lab}</text>`);
      L.push(`<rect x="188" y="${y}" width="${sc(us)}" height="20" fill="${col}" rx="3"/>`);
      L.push(`<text x="${(192 + +sc(us)).toFixed(1)}" y="${y + 15}" font-family="monospace" font-size="11.5" fill="${col}">${us} us</text>`);
      L.push(`<text x="580" y="${y + 15}" font-family="monospace" font-size="11" fill="${gb > 227 ? ORANGE : MUTED}">${gb} GB/s</text>`);
      L.push(`<text x="700" y="${y + 15}" font-family="monospace" font-size="11" fill="${nf > 1 ? ORANGE : MUTED}" text-anchor="end">${nf} flag${nf === 1 ? '' : 's'}</text>`);
      y += 26;
    }
    y += 12;
  }
  L.push(`<line x1="${(188 + +sc(227 / 227 * 90 * 0)).toFixed(1)}" y1="0" x2="0" y2="0" stroke="none"/>`);
  L.push(`<text x="0" y="${y + 14}" font-family="monospace" font-size="11.5" fill="${ORANGE}">Fixing only the measurement: 1.63x on gate_up, 2.4x on o_proj. No kernel changed.</text>`);
  L.push(`<text x="0" y="${y + 34}" font-family="monospace" font-size="10.5" fill="${MUTED}">348 GB/s on a 226.9 GB/s measured bus is the flag that fires first, and it fires by division rather than by taste.</text>`);
  return `<svg viewBox="0 0 740 ${y + 44}" role="img" aria-label="Fixing only the harness changes the reported time by 1.6 to 2.4 times">\n  ${L.join('\n  ')}\n</svg>`;
};

// ==================================== 6. a real claim, attested (crisp)
F.attested = () => {
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">TRITON W8A16 VS CUBLAS BF16, M=1  ·  EVERY CLAIM WITH ITS CONDITIONS</text>`);
  const rows = [
    ['qkv_proj', 1.668, 0.004, 148, '2.00e-02', 66],
    ['o_proj', 1.767, 0.002, 139, '1.69e-02', 84],
    ['gate_up_proj', 1.787, 0.013, 205, '2.64e-02', 8],
    ['down_proj', 2.334, 0.020, 201, '2.24e-02', 16],
  ];
  L.push(`<text x="176" y="34" font-family="monospace" font-size="10" fill="${MUTED}">SPEEDUP</text>`);
  L.push(`<text x="430" y="34" font-family="monospace" font-size="10" fill="${MUTED}">IQR</text>`);
  L.push(`<text x="500" y="34" font-family="monospace" font-size="10" fill="${MUTED}">IMPLIED</text>`);
  L.push(`<text x="600" y="34" font-family="monospace" font-size="10" fill="${MUTED}">ROT</text>`);
  L.push(`<text x="700" y="34" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="end">SCORE</text>`);
  rows.forEach(([lab, sp, iqr, gb, sc, rot], i) => {
    const y = 42 + i * 34;
    L.push(`<rect x="0" y="${y}" width="700" height="28" fill="${i % 2 ? '#fafbfb' : '#fff'}"/>`);
    L.push(`<text x="6" y="${y + 19}" font-family="monospace" font-size="12" fill="${INK}">${lab}</text>`);
    L.push(`<rect x="176" y="${y + 6}" width="${((sp - 1) / 1.4 * 230).toFixed(1)}" height="16" fill="${BLUE}" rx="2"/>`);
    L.push(`<text x="${(180 + (sp - 1) / 1.4 * 230).toFixed(1)}" y="${y + 19}" font-family="monospace" font-size="11.5" fill="${BLUE}">${sp.toFixed(3)}x</text>`);
    L.push(`<text x="430" y="${y + 19}" font-family="monospace" font-size="11" fill="${MUTED}">${iqr.toFixed(3)}</text>`);
    L.push(`<text x="500" y="${y + 19}" font-family="monospace" font-size="11" fill="${MUTED}">${gb}</text>`);
    L.push(`<text x="600" y="${y + 19}" font-family="monospace" font-size="11" fill="${MUTED}">x${rot}</text>`);
    L.push(`<text x="700" y="${y + 19}" font-family="monospace" font-size="11" fill="${MUTED}" text-anchor="end">${sc}</text>`);
  });
  L.push(`<line x1="176" y1="38" x2="176" y2="178" stroke="${INK}" stroke-width="1.2"/>`);
  L.push(`<line x1="${(176 + (227 - 1) / 1.4 * 0).toFixed(1)}" y1="0" x2="0" y2="0" stroke="none"/>`);
  L.push(`<text x="0" y="204" font-family="monospace" font-size="11.5" fill="${BLUE}">Four of four carry no flags: every bandwidth under the 226.9 GB/s bus, every IQR</text>`);
  L.push(`<text x="0" y="222" font-family="monospace" font-size="11.5" fill="${BLUE}">below 2% of the effect, every score in the band where int8 belongs.</text>`);
  L.push(`<text x="0" y="242" font-family="monospace" font-size="10.5" fill="${MUTED}">Part 3 measured 1.693-2.208x for these shapes by hand. Reproducing that, rather than improving on it, is the test.</text>`);
  return `<svg viewBox="0 0 740 252" role="img" aria-label="Four attested claims with speedup, spread, implied bandwidth, rotation and correctness score">\n  ${L.join('\n  ')}\n</svg>`;
};

// attest/demo_thermal.py: one 780-second burn, 53,909 timings of the SAME
// 2048-cube bf16 matmul, GPU pinned at its 80 W cap and 87 C. True ratio is
// 1.000 by construction, so every deviation is the protocol lying.
F.thermal = () => {
  const T = [[0,591.2,2475,64],[27,599.8,2445,71],[53,603.5,2430,76],[80,607.2,2430,80],
    [107,611.3,2385,83],[134,615.6,2370,85],[162,626.7,2340,87],[190,643.3,2295,87],
    [218,656.0,2235,87],[248,665.1,2205,87],[277,674.0,2175,87],[307,684.0,2160,86],
    [337,688.3,2115,86],[368,693.1,2115,87],[399,696.4,2115,87],[430,708.1,2085,86],
    [461,708.2,2070,86],[492,708.2,2085,86],[523,713.3,2055,87],[555,723.8,2025,86],
    [587,723.7,2025,86],[619,713.6,2025,86],[650,723.8,2025,87],[682,723.9,2025,87],
    [714,736.1,1980,87],[747,729.3,1995,86]];
  const X = t => (72 + t / 780 * 520).toFixed(1);
  const Yu = u => (206 - (u - 580) / 175 * 160).toFixed(1);
  const Yc = c => (206 - (c - 1950) / 575 * 160).toFixed(1);
  const L = [];
  L.push(`<text x="0" y="14" font-family="monospace" font-size="11" fill="${MUTED}">THE SAME FUNCTION, TIMED 53,909 TIMES OVER 780 SECONDS AT THE 80 W CAP</text>`);
  for (const u of [600, 650, 700]) {
    L.push(`<line x1="72" y1="${Yu(u)}" x2="592" y2="${Yu(u)}" stroke="${FAINT}" stroke-width="0.8"/>`);
    L.push(`<text x="66" y="${(+Yu(u) + 4).toFixed(1)}" font-family="monospace" font-size="10" fill="${ORANGE}" text-anchor="end">${u}</text>`);
  }
  for (const c of [2000, 2200, 2400]) {
    L.push(`<text x="598" y="${(+Yc(c) + 4).toFixed(1)}" font-family="monospace" font-size="10" fill="${BLUE}">${c}</text>`);
  }
  L.push(`<text x="10" y="42" font-family="monospace" font-size="10" fill="${ORANGE}">us</text>`);
  L.push(`<text x="598" y="42" font-family="monospace" font-size="10" fill="${BLUE}">MHz</text>`);
  L.push(`<polyline points="${T.map(r => `${X(r[0])},${Yc(r[2])}`).join(' ')}" fill="none" stroke="${BLUE}" stroke-width="2" opacity="0.75"/>`);
  L.push(`<polyline points="${T.map(r => `${X(r[0])},${Yu(r[1])}`).join(' ')}" fill="none" stroke="${ORANGE}" stroke-width="2.4"/>`);
  // the two halves the sequential protocol would have compared
  L.push(`<line x1="${X(390)}" y1="46" x2="${X(390)}" y2="206" stroke="${GRAY}" stroke-width="1" stroke-dasharray="3 3"/>`);
  L.push(`<text x="${X(195)}" y="62" font-family="monospace" font-size="10.5" fill="${GRAY}" text-anchor="middle">"reference" half: 626.6 us</text>`);
  L.push(`<text x="${X(585)}" y="62" font-family="monospace" font-size="10.5" fill="${GRAY}" text-anchor="middle">"candidate" half: 713.7 us</text>`);
  L.push(`<line x1="72" y1="206" x2="592" y2="206" stroke="${INK}" stroke-width="1.2"/>`);
  L.push(`<text x="72" y="224" font-family="monospace" font-size="10" fill="${MUTED}">0s · 44 C</text>`);
  L.push(`<text x="592" y="224" font-family="monospace" font-size="10" fill="${MUTED}" text-anchor="end">780s · 87 C</text>`);
  L.push(`<text x="0" y="256" font-family="monospace" font-size="12" fill="${INK}">true ratio 1.000</text>`);
  L.push(`<text x="0" y="276" font-family="monospace" font-size="12" fill="${ORANGE}">  sequential   0.878x   <tspan fill="${MUTED}">error -12.2%</tspan></text>`);
  L.push(`<text x="0" y="294" font-family="monospace" font-size="12" fill="${BLUE}">  interleaved  1.000x   <tspan fill="${MUTED}">error +0.0%, IQR 0.008</tspan></text>`);
  return `<svg viewBox="0 0 740 304" role="img" aria-label="Timing of one unchanged function rising 14 percent as the GPU clock falls, and the two protocols' answers">\n  ${L.join('\n  ')}\n</svg>`;
};

module.exports = F;
