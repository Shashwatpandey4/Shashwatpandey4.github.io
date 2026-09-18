// Shared bootstrap for the 3D designs.
//
// The responsive part is the point. A fixed camera position works at one
// viewport and clips or shrinks at every other, so instead each design declares
// the radius of its bounding sphere and this frames it: distance is derived
// from the vertical FOV, widened when the canvas is narrower than it is tall so
// a phone in portrait still sees the whole object.
import * as THREE from 'three';

export function mount(host, design, opts = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearAlpha(0);
  renderer.domElement.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(renderer.domElement);

  const built = design.build(THREE, opts);
  scene.add(built.group);

  // tilt the whole object rather than moving the camera, so framing stays valid
  const elev = opts.elev ?? design.elev ?? 0.62;
  const azim = opts.azim ?? design.azim ?? 0.0;

  function frame() {
    const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    const aspect = w / h;
    cam.aspect = aspect;
    const R = (built.radius ?? design.radius ?? 8) * (opts.zoom ?? 1);
    const vFov = cam.fov * Math.PI / 180;
    // fit vertically, and horizontally too when the canvas is narrow
    let d = R / Math.sin(vFov / 2);
    if (aspect < 1) d /= aspect * 0.92;
    cam.position.set(
      Math.sin(azim) * Math.cos(elev) * d,
      Math.sin(elev) * d,
      Math.cos(azim) * Math.cos(elev) * d);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }

  let raf = 0;
  const t0 = performance.now();
  function tick(now) {
    built.update((now - t0) / 1000);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(tick);
  }
  const start = () => { if (!raf && !reduce.matches) raf = requestAnimationFrame(tick); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  const ro = new ResizeObserver(frame);
  ro.observe(host);
  frame();
  if (reduce.matches) { built.update(2.0); renderer.render(scene, cam); }
  else start();
  new IntersectionObserver(e => e[0].isIntersecting ? start() : stop(), { rootMargin: '120px' })
    .observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  return { stop, frame, renderer };
}

// palette, shared so the designs stay a family
export const PAL = {
  blue: '#1a73e8', rust: '#c2410c', violet: '#7c3aed',
  idle: '#dfe3e6', ink: '#1a1a1a', teal: '#0f766e',
};
