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
    // ---- composite devices, after siboehm's figure vocabulary -------------
    // A matrix as an exact grid. Proportions stay true even though strokes are
    // sketchy -- that combination is what makes his tiling figures readable.
    grid(x, y, cols, rows, cell, o = {}) {
      const w = cols * cell, h = rows * cell;
      parts.push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" ` +
                 `fill="${o.fill || '#f6f7f8'}" stroke="none"/>`);
      for (let c = 0; c <= cols; c++) {
        parts.push(`  <line x1="${x + c * cell}" y1="${y}" x2="${x + c * cell}" ` +
                   `y2="${y + h}" stroke="${o.rule || '#dfe3e6'}" stroke-width="0.7"/>`);
      }
      for (let r = 0; r <= rows; r++) {
        parts.push(`  <line x1="${x}" y1="${y + r * cell}" x2="${x + w}" ` +
                   `y2="${y + r * cell}" stroke="${o.rule || '#dfe3e6'}" stroke-width="0.7"/>`);
      }
      if (o.outline !== false) api.rect(x, y, w, h, { sw: 1.3, roughness: 0.9 });
      return api;
    },
    // Fill named cells of a grid: list of [col,row] pairs.
    cells(x, y, cell, list, o = {}) {
      for (const [c, r] of list) {
        parts.push(`  <rect x="${x + c * cell + 0.8}" y="${y + r * cell + 0.8}" ` +
                   `width="${cell - 1.6}" height="${cell - 1.6}" ` +
                   `fill="${o.fill || BLUE}" opacity="${o.opacity ?? 1}" stroke="none"/>`);
      }
      return api;
    },
    // A dashed region marking a tile, with its dimension labels.
    region(x, y, w, h, o = {}) {
      parts.push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ` +
                 `stroke="${o.stroke || INK}" stroke-width="${o.sw ?? 1.6}" ` +
                 `stroke-dasharray="${o.dash || '5 3'}"/>`);
      return api;
    },
    // Dimension bracket: |<--- label --->| along x or y.
    dim(x1, y1, x2, y2, label, o = {}) {
      const c = o.stroke || MUTED;
      api.line(x1, y1, x2, y2, { stroke: c, sw: 1, roughness: 0.5 });
      if (y1 === y2) {
        api.line(x1, y1 - 4, x1, y1 + 4, { stroke: c, sw: 1, roughness: 0.4 });
        api.line(x2, y2 - 4, x2, y2 + 4, { stroke: c, sw: 1, roughness: 0.4 });
        api.text((x1 + x2) / 2, y1 - 7, label,
                 { size: o.size ?? 12, fill: c, anchor: 'middle', mono: o.mono });
      } else {
        api.line(x1 - 4, y1, x1 + 4, y1, { stroke: c, sw: 1, roughness: 0.4 });
        api.line(x2 - 4, y2, x2 + 4, y2, { stroke: c, sw: 1, roughness: 0.4 });
        api.text(x1 - 8, (y1 + y2) / 2 + 4, label,
                 { size: o.size ?? 12, fill: c, anchor: 'end', mono: o.mono });
      }
      return api;
    },
    // A labelled thread chip, so a specific thread can be tracked across figures.
    chip(x, y, label, o = {}) {
      const w = o.w ?? 34, h = o.h ?? 18;
      api.solid(x, y, w, h, { fill: o.fill || BLUE, stroke: o.fill || BLUE, sw: 1.1 });
      api.text(x + w / 2, y + h - 5, label,
               { size: o.size ?? 11, fill: '#ffffff', anchor: 'middle', mono: true });
      return api;
    },
    caption(x, y, str, o = {}) {
      return api.text(x, y, str, { size: o.size ?? 12.5, fill: o.fill || MUTED, mono: o.mono });
    },
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
