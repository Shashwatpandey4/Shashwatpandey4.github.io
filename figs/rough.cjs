// Excalidraw-style figure generator.
//
// Excalidraw's hand-drawn look is roughjs underneath, and roughjs has a headless
// generator that emits plain SVG path data -- so these can be produced from a
// script and committed as inline SVG, with no GUI step, no React runtime and no
// image assets.
//
// Palette is the one validated for this site (see figs/README.md): blue and
// orange as the two real hues (CVD deltaE 14.3, well clear of the 8 target) plus
// a deliberate neutral. Green is deliberately absent: paired with orange it sat
// at deltaE 7.0 for deuteranopia, which is the classic red/green trap, and in
// these figures those two colors carry "fast vs slow".
//
// Output is FLAT -- one element per line, no blank lines, two-space indent max.
// A blank line inside an <svg> closes the HTML block in CommonMark and markdown
// eats the rest of the figure; four-space indent then turns it into a code
// block. Both happened.

const rough = require('roughjs');

const INK = '#1a1a1a';
const BLUE = '#1a73e8';
const ORANGE = '#c2410c';
const GRAY = '#6b7280';
const MUTED = '#666666';
const FAINT = '#dfe3e6';
const HAND = "'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive";

function fig(width, height, seed = 7) {
  const gen = rough.generator({ seed });
  const parts = [];

  const emitDrawable = (drawable, opts = {}) => {
    for (const p of gen.toPaths(drawable)) {
      const stroke = p.stroke === 'none' ? 'none' : p.stroke;
      const sw = opts.strokeWidth != null ? opts.strokeWidth : p.strokeWidth;
      parts.push(
        `  <path d="${p.d}" stroke="${stroke}" stroke-width="${sw}" ` +
        `fill="${p.fill || 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
  };

  const api = {
    rect(x, y, w, h, o = {}) {
      emitDrawable(gen.rectangle(x, y, w, h, {
        roughness: o.roughness ?? 1.1,
        bowing: o.bowing ?? 1,
        stroke: o.stroke ?? INK,
        strokeWidth: o.sw ?? 1.4,
        fill: o.fill,
        fillStyle: o.fillStyle ?? 'hachure',
        fillWeight: o.fillWeight ?? 1.6,
        hachureAngle: o.hachureAngle ?? -41,
        hachureGap: o.hachureGap ?? 5,
      }));
      return api;
    },
    solid(x, y, w, h, o = {}) {
      return api.rect(x, y, w, h, { ...o, fillStyle: 'solid', fillWeight: 1 });
    },
    line(x1, y1, x2, y2, o = {}) {
      emitDrawable(gen.line(x1, y1, x2, y2, {
        roughness: o.roughness ?? 1.0,
        bowing: o.bowing ?? 1,
        stroke: o.stroke ?? INK,
        strokeWidth: o.sw ?? 1.3,
      }));
      return api;
    },
    ellipse(cx, cy, w, h, o = {}) {
      emitDrawable(gen.ellipse(cx, cy, w, h, {
        roughness: o.roughness ?? 1.1,
        stroke: o.stroke ?? INK,
        strokeWidth: o.sw ?? 1.4,
        fill: o.fill,
        fillStyle: o.fillStyle ?? 'hachure',
      }));
      return api;
    },
    // open arrowhead, drawn as two short strokes so it stays sketchy
    arrow(x1, y1, x2, y2, o = {}) {
      api.line(x1, y1, x2, y2, o);
      const a = Math.atan2(y2 - y1, x2 - x1);
      const L = o.head ?? 9;
      const s = o.spread ?? 0.42;
      api.line(x2, y2, x2 - L * Math.cos(a - s), y2 - L * Math.sin(a - s), o);
      api.line(x2, y2, x2 - L * Math.cos(a + s), y2 - L * Math.sin(a + s), o);
      return api;
    },
    text(x, y, str, o = {}) {
      const anchor = o.anchor ? ` text-anchor="${o.anchor}"` : '';
      const weight = o.weight ? ` font-weight="${o.weight}"` : '';
      const family = o.mono
        ? 'monospace'
        : (o.family || HAND);
      parts.push(
        `  <text x="${x}" y="${y}" font-family="${family}" ` +
        `font-size="${o.size ?? 14}" fill="${o.fill ?? INK}"${anchor}${weight}>` +
        esc(str) + `</text>`
      );
      return api;
    },
    raw(s) { parts.push('  ' + s); return api; },
    toSVG(label) {
      return [
        `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">`,
        ...parts,
        `</svg>`,
      ].join('\n');
    },
  };
  return api;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { fig, INK, BLUE, ORANGE, GRAY, MUTED, FAINT, HAND, esc };
