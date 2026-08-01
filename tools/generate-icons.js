/**
 * Generates the site's icon set and social card from the same crescent geometry
 * as the app icons, so the favicon in a browser tab is the icon on the home
 * screen. Ported from the app repo's scripts/generate-icons.js and
 * scripts/generate-feature-graphic.js — pure Node (zlib PNG encoder), no image
 * libraries, so it runs anywhere.
 *
 * Usage: node tools/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GREEN = [0x0c, 0x2b, 0x21];
const GOLD = [0xc8, 0xa3, 0x52];
const CREAM = [0xe8, 0xdf, 0xc8];
const GLOW = [0x1b, 0x47, 0x37];

// ---- PNG encoding ---------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Drawing --------------------------------------------------------------

/** Anti-aliased circle coverage at pixel (x, y). */
function circle(x, y, cx, cy, r) {
  return Math.max(0, Math.min(1, 0.5 - (Math.hypot(x - cx, y - cy) - r)));
}

/** distance from a point to segment ab, for the stroke font */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Renders one square icon: crescent (big circle minus a cut circle offset
 * toward the top-right) plus the small "call dot" in the opening. `bg` null
 * renders on transparency.
 */
function renderIcon(size, { bg, fg, scale = 1 }) {
  const rgba = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.3 * scale;
  const cutR = R * 0.92;
  const cutDx = R * 0.5;
  const cutDy = -R * 0.28;
  const dotR = size * 0.052 * scale;
  const dotX = cx + R * 0.98;
  const dotY = cy - R * 0.75;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const crescent = circle(x, y, cx, cy, R) * (1 - circle(x, y, cx + cutDx, cy + cutDy, cutR));
      const cover = Math.max(crescent, circle(x, y, dotX, dotY, dotR));
      if (bg) {
        rgba[i] = bg[0] + (fg[0] - bg[0]) * cover;
        rgba[i + 1] = bg[1] + (fg[1] - bg[1]) * cover;
        rgba[i + 2] = bg[2] + (fg[2] - bg[2]) * cover;
        rgba[i + 3] = 255;
      } else {
        rgba[i] = fg[0];
        rgba[i + 1] = fg[1];
        rgba[i + 2] = fg[2];
        rgba[i + 3] = Math.round(cover * 255);
      }
    }
  }
  return encodePng(size, size, rgba);
}

// ---- Social card (1200x630) ------------------------------------------------

// Monoline stroke font, uppercase only — the letters used by the card.
const FONT = {
  ' ': [],
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.18, 0.62], [0.82, 0.62]]],
  C: [[[1, 0.22], [0.68, 0], [0.32, 0], [0.06, 0.24], [0, 0.5], [0.06, 0.76], [0.32, 1], [0.68, 1], [1, 0.78]]],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.74, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]], [[0.2, 0], [0.8, 0]], [[0.2, 1], [0.8, 1]]],
  M: [[[0, 1], [0, 0], [0.5, 0.62], [1, 0], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  P: [[[0, 1], [0, 0], [0.72, 0], [0.96, 0.22], [0.72, 0.46], [0, 0.46]]],
  R: [[[0, 1], [0, 0], [0.72, 0], [0.96, 0.22], [0.72, 0.46], [0, 0.46]], [[0.42, 0.46], [1, 1]]],
  S: [[[1, 0.2], [0.7, 0], [0.3, 0], [0.05, 0.2], [0.2, 0.44], [0.8, 0.56], [0.95, 0.8], [0.7, 1], [0.3, 1], [0, 0.8]]],
  V: [[[0, 0], [0.5, 1], [1, 0]]],
  Y: [[[0, 0], [0.5, 0.52], [1, 0]], [[0.5, 0.52], [0.5, 1]]],
};

function renderCard(W, H) {
  const rgba = new Uint8Array(W * H * 4);

  const put = (x, y, color, cov) => {
    if (cov <= 0 || x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    const a = Math.min(1, cov);
    rgba[i] += (color[0] - rgba[i]) * a;
    rgba[i + 1] += (color[1] - rgba[i + 1]) * a;
    rgba[i + 2] += (color[2] - rgba[i + 2]) * a;
    rgba[i + 3] = 255;
  };

  /** Draws uppercase `text` with cap-height `capH`, left edge x0, top y0. */
  const drawText = (text, x0, y0, capH, strokeW, color, opts = {}) => {
    text = text.toUpperCase();
    const spacing = opts.spacing ?? 0.28; // gap between glyphs, in cap heights
    const cellW = 0.66; // glyph advance, in cap heights
    let scale = capH;
    if (opts.maxW && ((cellW + spacing) * text.length - spacing) * capH > opts.maxW) {
      scale = opts.maxW / ((cellW + spacing) * text.length - spacing);
    }
    const adv = (cellW + spacing) * scale;
    const half = strokeW / 2;
    const segs = [];
    for (let gi = 0; gi < text.length; gi++) {
      const glyph = FONT[text[gi]] || FONT[' '];
      const gx = x0 + gi * adv;
      for (const poly of glyph) {
        for (let k = 0; k < poly.length - 1; k++) {
          segs.push([
            gx + poly[k][0] * cellW * scale, y0 + poly[k][1] * scale,
            gx + poly[k + 1][0] * cellW * scale, y0 + poly[k + 1][1] * scale,
          ]);
        }
      }
    }
    const yTop = Math.max(0, Math.floor(y0 - half));
    const yBot = Math.min(H, Math.ceil(y0 + scale + half));
    const runW = adv * text.length + strokeW;
    const xL = Math.max(0, Math.floor(x0 - half));
    const xR = Math.min(W, Math.ceil(x0 + runW));
    for (let y = yTop; y < yBot; y++) {
      for (let x = xL; x < xR; x++) {
        let d = Infinity;
        for (const s of segs) {
          const dd = segDist(x + 0.5, y + 0.5, s[0], s[1], s[2], s[3]);
          if (dd < d) d = dd;
          if (d <= 0) break;
        }
        put(x, y, color, half + 0.5 - d);
      }
    }
    return runW;
  };

  // Crescent, same proportions as the app icon, on a glowing green field.
  const ccx = 300;
  const ccy = H / 2;
  const R = 190;
  const cutR = R * 0.92;
  const cutDx = R * 0.5;
  const cutDy = -R * 0.28;
  const dotR = R * 0.173;
  const dotX = ccx + R * 0.98;
  const dotY = ccy - R * 0.78;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const g = Math.exp(-(((x - ccx) ** 2 + (y - ccy) ** 2) / (R * 2.4) ** 2)) * 0.55;
      rgba[i] = GREEN[0] + (GLOW[0] - GREEN[0]) * g;
      rgba[i + 1] = GREEN[1] + (GLOW[1] - GREEN[1]) * g;
      rgba[i + 2] = GREEN[2] + (GLOW[2] - GREEN[2]) * g;
      rgba[i + 3] = 255;
      const crescent = circle(x, y, ccx, ccy, R) * (1 - circle(x, y, ccx + cutDx, ccy + cutDy, cutR));
      const cover = Math.max(crescent, circle(x, y, dotX, dotY, dotR));
      if (cover > 0) {
        rgba[i] += (GOLD[0] - rgba[i]) * cover;
        rgba[i + 1] += (GOLD[1] - rgba[i + 1]) * cover;
        rgba[i + 2] += (GOLD[2] - rgba[i + 2]) * cover;
      }
    }
  }

  // Wordmark + rule + tagline, as one left-aligned lockup beside the mark.
  const wmX = 566;
  const wmTop = 196;
  const wmH = 150;
  const wmW = drawText('HAYYA', wmX, wmTop, wmH, 18, GOLD, { spacing: 0.3, maxW: 540 });
  const ruleY = wmTop + wmH + 26;
  for (let x = wmX; x < wmX + wmW - 18; x++) put(x, ruleY, GOLD, 0.85);
  drawText('NEVER MISS A PRAYER', wmX, ruleY + 26, 40, 6, CREAM, { spacing: 0.32, maxW: wmW - 18 });

  return encodePng(W, H, rgba);
}

// ---- Write ----------------------------------------------------------------

const out = path.join(__dirname, '..', 'assets');
fs.mkdirSync(out, { recursive: true });

const files = {
  // Rendered at each size rather than downscaled, so small ones stay crisp.
  'favicon-16.png': renderIcon(16, { bg: GREEN, fg: GOLD }),
  'favicon-32.png': renderIcon(32, { bg: GREEN, fg: GOLD }),
  'apple-touch-icon.png': renderIcon(180, { bg: GREEN, fg: GOLD }),
  'icon-192.png': renderIcon(192, { bg: GREEN, fg: GOLD }),
  'icon-512.png': renderIcon(512, { bg: GREEN, fg: GOLD }),
  // The hero/nav mark: gold on transparency, so it sits on any background.
  'crescent.png': renderIcon(512, { bg: null, fg: GOLD, scale: 1.25 }),
  'og-image.png': renderCard(1200, 630),
};

for (const [name, buf] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, name), buf);
  console.log(`wrote assets/${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}
