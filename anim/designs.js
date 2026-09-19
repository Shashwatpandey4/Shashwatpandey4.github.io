// Ten 3D designs. Each exports { radius, elev, azim, build(THREE) } and build
// returns { group, update(t) }. Framing/responsiveness is scene.js's job.
import { PAL } from './scene.js';

const C = (T, h) => new T.Color(h);
const lerpMat = (m, col, op, k = 0.14) => {
  m.color.lerp(col, k); m.opacity += (op - m.opacity) * k;
};

// shared: a flat grid of thin plates
function plates(T, group, n, gap, y = 0) {
  const geo = new T.BoxGeometry(1, 0.16, 1);
  const eg = new T.EdgesGeometry(geo);
  const out = [];
  const off = i => (i - (n - 1) / 2) * gap;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial(
      { color: C(T, PAL.idle), transparent: true, opacity: 0.26 }));
    const e = new T.LineSegments(eg, new T.LineBasicMaterial(
      { color: C(T, PAL.idle), transparent: true, opacity: 0.62 }));
    m.position.set(off(c), y, off(r)); e.position.copy(m.position);
    group.add(m, e); out.push({ m, e, r, c, y });
  }
  return out;
}

// ------------------------------------------------------------------ 1
export const tileSweep = {
  radius: 9, elev: 0.60,
  build(T) {
    const g = new T.Group(), N = 10, BM = 3;
    const cells = plates(T, g, N, 1.16);
    const blue = C(T, PAL.blue), rust = C(T, PAL.rust), idle = C(T, PAL.idle);
    return { group: g, update(t) {
      g.rotation.y = Math.sin(t * 0.12) * 0.4 - 0.3;
      const per = N / BM | 0, k = Math.floor(t / 0.46) % (per * per);
      const br = (k / per | 0) * BM, bc = (k % per) * BM;
      for (const c of cells) {
        const on = c.r >= br && c.r < br + BM && c.c >= bc && c.c < bc + BM;
        const done = c.r < br || (c.r < br + BM && c.c < bc);
        lerpMat(c.m.material, on ? blue : done ? rust : idle, on ? .95 : done ? .40 : .22);
        lerpMat(c.e.material, on ? blue : done ? rust : idle, on ? 1 : done ? .70 : .55);
        c.m.position.y += ((on ? .55 : 0) - c.m.position.y) * .14;
        c.e.position.y = c.m.position.y;
      }
    }};
  }};

// ------------------------------------------------------------------ 2
export const matmul = {
  radius: 12, elev: 0.58, azim: 0.5,
  build(T) {
    const g = new T.Group(), N = 8, BM = 2, KD = 5, GAP = 1.16;
    const off = i => (i - (N - 1) / 2) * GAP;
    const Cc = plates(T, g, N, GAP);
    const geo = new T.BoxGeometry(1, 0.16, 1), eg = new T.EdgesGeometry(geo);
    const mk = (x, y, z, rot, tag) => {
      const m = new T.Mesh(geo, new T.MeshBasicMaterial(
        { color: C(T, PAL.idle), transparent: true, opacity: .12 }));
      const e = new T.LineSegments(eg, new T.LineBasicMaterial(
        { color: C(T, PAL.idle), transparent: true, opacity: .32 }));
      m.position.set(x, y, z); e.position.copy(m.position);
      m.rotation.copy(rot); e.rotation.copy(rot);
      g.add(m, e); return Object.assign({ m, e }, tag);
    };
    const A = [], B = [];
    const rx = new T.Euler(0, 0, Math.PI / 2), rz = new T.Euler(Math.PI / 2, 0, 0);
    for (let r = 0; r < N; r++) for (let k = 0; k < KD; k++)
      A.push(mk(off(0) - 2.2 - k * .95, 2.0, off(r), rx, { r }));
    for (let c = 0; c < N; c++) for (let k = 0; k < KD; k++)
      B.push(mk(off(c), 2.0, off(0) - 2.2 - k * .95, rz, { c }));
    const blue = C(T, PAL.blue), rust = C(T, PAL.rust), vio = C(T, PAL.violet), idle = C(T, PAL.idle);
    return { group: g, update(t) {
      g.rotation.y = Math.sin(t * .10) * .3 - .2;
      const per = N / BM | 0, k = Math.floor(t / .55) % (per * per);
      const br = (k / per | 0) * BM, bc = (k % per) * BM;
      for (const c of Cc) {
        const on = c.r >= br && c.r < br + BM && c.c >= bc && c.c < bc + BM;
        lerpMat(c.m.material, on ? vio : idle, on ? .95 : .12);
        lerpMat(c.e.material, on ? vio : idle, on ? 1 : .32);
        c.m.position.y += ((on ? .5 : 0) - c.m.position.y) * .14;
        c.e.position.y = c.m.position.y;
      }
      for (const a of A) { const on = a.r >= br && a.r < br + BM;
        lerpMat(a.m.material, on ? blue : idle, on ? .85 : .1);
        lerpMat(a.e.material, on ? blue : idle, on ? .95 : .28); }
      for (const b of B) { const on = b.c >= bc && b.c < bc + BM;
        lerpMat(b.m.material, on ? rust : idle, on ? .85 : .1);
        lerpMat(b.e.material, on ? rust : idle, on ? .95 : .28); }
    }};
  }};

// ------------------------------------------------------------------ 3
export const warpSplit = {
  radius: 10, elev: 0.62,
  build(T) {
    const g = new T.Group(), N = 12, BM = 4;
    const cells = plates(T, g, N, 1.1);
    const blue = C(T, PAL.blue), vio = C(T, PAL.violet), idle = C(T, PAL.idle);
    return { group: g, update(t) {
      g.rotation.y = Math.sin(t * .11) * .42 - .28;
      const per = N / BM | 0, k = Math.floor(t / .5) % (per * per);
      const br = (k / per | 0) * BM, bc = (k % per) * BM;
      for (const c of cells) {
        const on = c.r >= br && c.r < br + BM && c.c >= bc && c.c < bc + BM;
        let col = idle;
        if (on) { const q = ((c.r - br) < BM / 2 ? 0 : 1) + ((c.c - bc) < BM / 2 ? 0 : 2);
                  col = (q === 0 || q === 3) ? blue : vio; }
        lerpMat(c.m.material, col, on ? .92 : .12);
        lerpMat(c.e.material, col, on ? 1 : .36);
        const lift = on ? .35 + (((c.r - br) < BM / 2) === ((c.c - bc) < BM / 2) ? .45 : 0) : 0;
        c.m.position.y += (lift - c.m.position.y) * .14;
        c.e.position.y = c.m.position.y;
      }
    }};
  }};

// ------------------------------------------------------------------ 4
export const memTower = {
  radius: 9.5, elev: 0.34,
  build(T) {
    const g = new T.Group();
    const tiers = [['registers', 3.2, PAL.blue], ['shared', 5.0, PAL.violet],
                   ['L2', 7.0, PAL.teal], ['DRAM', 9.2, PAL.rust]];
    const slabs = [];
    tiers.forEach(([, w, col], i) => {
      const y = 4.2 - i * 2.4;
      const geo = new T.BoxGeometry(w, .5, w);
      const m = new T.Mesh(geo, new T.MeshBasicMaterial(
        { color: C(T, col), transparent: true, opacity: .16 }));
      const e = new T.LineSegments(new T.EdgesGeometry(geo),
        new T.LineBasicMaterial({ color: C(T, col), transparent: true, opacity: .75 }));
      m.position.y = y; e.position.y = y; g.add(m, e); slabs.push({ m, e, y });
    });
    const mote = new T.BoxGeometry(.3, .3, .3);
    const motes = [];
    for (let i = 0; i < 26; i++) {
      const m = new T.Mesh(mote, new T.MeshBasicMaterial(
        { color: C(T, PAL.blue), transparent: true, opacity: .85 }));
      g.add(m); motes.push({ m, ph: Math.random(), x: (Math.random() - .5) * 5, z: (Math.random() - .5) * 5 });
    }
    return { group: g, update(t) {
      g.rotation.y = t * .10;
      for (const o of motes) {
        const u = (t * .22 + o.ph) % 1;            // bottom -> top: DRAM to registers
        o.m.position.set(o.x * (1 - u * .55), -3 + u * 7.6, o.z * (1 - u * .55));
        o.m.material.opacity = Math.sin(u * Math.PI) * .9;
      }
      slabs.forEach((s, i) => { s.m.material.opacity = .13 + .07 * Math.sin(t * .8 - i); });
    }};
  }};

// ------------------------------------------------------------------ 5
export const rippleGrid = {
  radius: 11, elev: 0.46,
  build(T) {
    const g = new T.Group(), SEG = 46, SZ = 18;
    const geo = new T.PlaneGeometry(SZ, SZ, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(geo, new T.MeshBasicMaterial(
      { color: C(T, PAL.blue), wireframe: true, transparent: true, opacity: .46 }));
    g.add(mesh);
    const pos = geo.attributes.position, base = pos.array.slice();
    return { group: g, update(t) {
      g.rotation.y = Math.sin(t * .09) * .32 - .2;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2], d = Math.hypot(x, z);
        pos.array[i * 3 + 1] =
          Math.sin(d * .55 - t * 1.5) * 1.15 * Math.exp(-d * .10) +
          Math.sin(x * .32 + t * .8) * .32;
      }
      pos.needsUpdate = true;
    }};
  }};

// ------------------------------------------------------------------ 6
export const wireIco = {
  radius: 7, elev: 0.3,
  build(T) {
    const g = new T.Group();
    const geo = new T.IcosahedronGeometry(5, 1);
    const mesh = new T.LineSegments(new T.WireframeGeometry(geo),
      new T.LineBasicMaterial({ color: C(T, PAL.blue), transparent: true, opacity: .5 }));
    const inner = new T.Mesh(new T.IcosahedronGeometry(4.6, 1),
      new T.MeshBasicMaterial({ color: C(T, PAL.blue), transparent: true, opacity: .07 }));
    g.add(mesh, inner);
    return { group: g, update(t) {
      g.rotation.y = t * .18; g.rotation.x = Math.sin(t * .13) * .3;
      const s = 1 + Math.sin(t * .9) * .035; g.scale.setScalar(s);
      mesh.material.opacity = .42 + Math.sin(t * .9) * .1;
    }};
  }};

// ------------------------------------------------------------------ 7
export const pointField = {
  radius: 10, elev: 0.32,
  build(T) {
    const g = new T.Group(), N = 900;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 3 + Math.random() * 6, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
      seed[i * 3] = r * Math.sin(b) * Math.cos(a);
      seed[i * 3 + 1] = r * Math.cos(b) * .55;
      seed[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    }
    pos.set(seed);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.add(new T.Points(geo, new T.PointsMaterial(
      { color: C(T, PAL.blue), size: .14, transparent: true, opacity: .85, sizeAttenuation: true })));
    return { group: g, update(t) {
      g.rotation.y = t * .09;
      for (let i = 0; i < N; i++) {
        pos[i * 3 + 1] = seed[i * 3 + 1] + Math.sin(t * .7 + seed[i * 3] * .3) * .5;
      }
      geo.attributes.position.needsUpdate = true;
    }};
  }};

// ------------------------------------------------------------------ 8
export const systolic = {
  radius: 9.5, elev: 0.58,
  build(T) {
    const g = new T.Group(), N = 11;
    const cells = plates(T, g, N, 1.14);
    const blue = C(T, PAL.blue), teal = C(T, PAL.teal), idle = C(T, PAL.idle);
    return { group: g, update(t) {
      g.rotation.y = Math.sin(t * .1) * .34 - .24;
      const front = (t * 3.4) % (N * 2.2);
      for (const c of cells) {
        const d = c.r + c.c, k = Math.max(0, 1 - Math.abs(d - front) * .55);
        const col = k > .5 ? blue : k > .12 ? teal : idle;
        lerpMat(c.m.material, col, .20 + k * .75, .25);
        lerpMat(c.e.material, col, .52 + k * .45, .25);
        c.m.position.y += (k * .7 - c.m.position.y) * .25;
        c.e.position.y = c.m.position.y;
      }
    }};
  }};

// ------------------------------------------------------------------ 9
export const roofline = {
  radius: 11, elev: 0.40, azim: -0.5,
  build(T) {
    const g = new T.Group(), SEG = 54, SZ = 16;
    const geo = new T.PlaneGeometry(SZ, SZ, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, base = pos.array.slice();
    const mesh = new T.Mesh(geo, new T.MeshBasicMaterial(
      { color: C(T, PAL.rust), wireframe: true, transparent: true, opacity: .38 }));
    g.add(mesh);
    // the roofline itself: perf = min(intensity * bw, peak)
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      const inten = (x + SZ / 2) / SZ * 3.2;
      pos.array[i * 3 + 1] = Math.min(inten * 1.5, 3.4) - 1.2 + Math.sin(z * .4) * .05;
    }
    pos.needsUpdate = true;
    const ridge = new T.Mesh(new T.BoxGeometry(.12, 3.0, SZ),
      new T.MeshBasicMaterial({ color: C(T, PAL.blue), transparent: true, opacity: .3 }));
    ridge.position.set(-SZ / 2 + (3.4 / 1.5) / 3.2 * SZ, .4, 0);
    g.add(ridge);
    return { group: g, update(t) {
      g.rotation.y = Math.sin(t * .1) * .3 - .35;
      mesh.material.opacity = .32 + Math.sin(t * .7) * .07;
      ridge.material.opacity = .22 + Math.sin(t * 1.3) * .12;
    }};
  }};

// ------------------------------------------------------------------ 10
export const tubeFlow = {
  radius: 8, elev: 0.28,
  build(T) {
    const g = new T.Group();
    const knot = new T.TorusKnotGeometry(4.2, .55, 200, 20, 2, 3);
    const mesh = new T.LineSegments(new T.WireframeGeometry(knot),
      new T.LineBasicMaterial({ color: C(T, PAL.violet), transparent: true, opacity: .32 }));
    g.add(mesh);
    const bead = new T.Mesh(new T.SphereGeometry(.34, 12, 12),
      new T.MeshBasicMaterial({ color: C(T, PAL.blue), transparent: true, opacity: .9 }));
    g.add(bead);
    const curve = new T.TorusKnotGeometry(4.2, .001, 300, 3, 2, 3);
    const pts = curve.attributes.position;
    return { group: g, update(t) {
      g.rotation.y = t * .16; g.rotation.x = Math.sin(t * .11) * .25;
      const i = Math.floor((t * 60) % pts.count);
      bead.position.set(pts.getX(i), pts.getY(i), pts.getZ(i));
      mesh.material.opacity = .28 + Math.sin(t * .8) * .06;
    }};
  }};

export const ALL = {
  'tile-sweep':  { d: tileSweep,  label: 'Block tile sweeping an output matrix' },
  'matmul':      { d: matmul,     label: 'A x B = C, the Part 1 figure in 3D' },
  'warp-split':  { d: warpSplit,  label: 'Block tile splitting into warp tiles' },
  'mem-tower':   { d: memTower,   label: 'Memory hierarchy, with data rising to registers' },
  'ripple-grid': { d: rippleGrid, label: 'Wave mesh — a rippling wireframe plane' },
  'wire-ico':    { d: wireIco,    label: 'Wireframe icosahedron, breathing' },
  'point-field': { d: pointField, label: 'Drifting point cloud' },
  'systolic':    { d: systolic,   label: 'Systolic wavefront marching a grid' },
  'roofline':    { d: roofline,   label: 'The roofline as a 3D surface' },
  'tube-flow':   { d: tubeFlow,   label: 'Torus knot with a bead tracing it' },
};
