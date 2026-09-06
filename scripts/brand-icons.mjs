/**
 * The brand generator (OCL-37).
 *
 * One file draws the whole identity, because a wordmark that lives in a
 * component and a favicon that lives in a binary drift apart the first time
 * someone nudges a curve. Here the letters exist once, as geometry — segments,
 * arcs and discs on a 20-unit ink height — and everything else is emitted from
 * it: the SVG sources under `apps/web/public/brand/`, the PNG fallbacks, and
 * the path data the React `Wordmark` inlines.
 *
 * Monochrome by construction. Nothing in here names a colour except the two
 * files that cannot inherit one (the favicon, which a browser tab paints on its
 * own background, and the PNGs, which are pixels). Every other output is
 * `currentColor`, so the mark takes the colour of the theme around it and works
 * the same in nebula, xai and overclock without a second asset.
 *
 * No dependency. The rasteriser is analytic — each primitive knows its own
 * distance function, so a pixel is 16 samples of "am I within half a stroke of
 * anything" — and the PNG is written by hand on top of node:zlib. A brand
 * pipeline that needs a toolchain installed is a brand pipeline that stops
 * being run.
 *
 *   node scripts/brand-icons.mjs              # regenerate every brand asset
 *   node scripts/brand-icons.mjs --preview    # + a large proof sheet in /tmp
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_DIR = join(ROOT, "apps/web/public/brand");
const GENERATED_DIR = join(ROOT, "apps/web/src/components/__generated__");

// ---------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------

/**
 * One stroke for the whole identity. The wordmark is a monoline geometric
 * lowercase: every letter is built from the same circle and the same weight, so
 * there is nothing left to "colour in" and nothing that reads heavier than its
 * neighbour. Doctrine §1: hierarchy comes from weight and size, never hue.
 */
const STROKE = 2;

/** Baseline, x-height and ascender. Round letters are a 12-unit circle. */
const BASELINE = 20;
const XHEIGHT_TOP = 8;
const ASCENDER_TOP = 2;
const BOWL_R = (12 - STROKE) / 2; // centreline radius of o/e/c

const seg = (x1, y1, x2, y2) => ({ k: "seg", a: [x1, y1], b: [x2, y2] });
const arc = (cx, cy, r, from, to) => ({ k: "arc", c: [cx, cy], r, from, to });
const ring = (cx, cy, r) => ({ k: "ring", c: [cx, cy], r });
const disc = (cx, cy, r) => ({ k: "disc", c: [cx, cy], r });

/**
 * The letters of "pilotdeck", left to right, each already placed on the grid.
 *
 * Sidebearings are hand-set rather than uniform: a `v` opens at the top and an
 * `r` ends in air, so the same numeric gap reads wider after them. The numbers
 * below are the optical corrections, not a formula.
 */
const LETTERS = [
  { ch: "o", art: [ring(6, 14, BOWL_R)] },
  { ch: "v", art: [seg(16.4, XHEIGHT_TOP, 21, BASELINE), seg(21, BASELINE, 25.6, XHEIGHT_TOP)] },
  { ch: "e", art: [seg(30, 14, 40, 14), arc(35, 14, BOWL_R, 0, 315)] },
  { ch: "r", art: [seg(45.4, XHEIGHT_TOP, 45.4, BASELINE), arc(49.4, 12, 4, 180, 90)] },
  { ch: "c", art: [arc(59.2, 14, BOWL_R, 45, 315)] },
  { ch: "l", art: [seg(69.6, ASCENDER_TOP, 69.6, BASELINE)] },
  { ch: "i", art: [seg(75, XHEIGHT_TOP, 75, BASELINE), disc(75, 4.3, STROKE / 2)] },
  { ch: "c", art: [arc(85.4, 14, BOWL_R, 45, 315)] },
  {
    ch: "k",
    art: [
      seg(95.4, ASCENDER_TOP, 95.4, BASELINE),
      seg(100.8, XHEIGHT_TOP, 95.4, 13.4),
      seg(95.4, 13.4, 100.8, BASELINE),
    ],
  },
];

/** Where the emphasis breaks: "over" leads, "click" follows one step down. */
const LEAD = LETTERS.slice(0, 4).flatMap((l) => l.art);
const TRAIL = LETTERS.slice(4).flatMap((l) => l.art);

/**
 * The trailing half sits one step back, and it does it with alpha alone. The
 * old wordmark spent a second colour on this (`over` white, `click` mist), which
 * is exactly the thing that stops working the moment the theme changes.
 */
const TRAIL_OPACITY = 0.55;

/**
 * Tight to the ink plus a half-unit bleed guard on every side: round caps sit
 * exactly on the ink box, and a viewBox flush against them shaves the top of
 * the `l` and the left of the `o` at small sizes.
 */
const WORDMARK_VIEWBOX = "-0.5 0.5 102.8 21";

/**
 * The reduced mark: the `o` of pilotdeck with its centre struck — a ring and a
 * target, which is the whole name in one glyph. Same stroke-to-diameter ratio
 * as the wordmark's `o` (1:6), so the two are visibly the same alphabet.
 */
const MONOGRAM_VIEWBOX = "0 0 32 32";
const MONOGRAM_STROKE = 4.4;
const MONOGRAM = [ring(16, 16, 11), disc(16, 16, 4)];

/** The two values the favicon may name, straight from the doctrine's §2 table. */
const FAVICON_INK_LIGHT = "#0A0A0B"; // --oc-surface, for a light browser chrome
const FAVICON_INK_DARK = "#F7F7F8"; // --oc-text-1, for a dark one

// ---------------------------------------------------------------------------
// Geometry → SVG
// ---------------------------------------------------------------------------

const round = (n) => Number(n.toFixed(3)).toString();

/** A point on a circle, in math angles on a y-down canvas. */
function onCircle([cx, cy], r, deg) {
  const t = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy - r * Math.sin(t)];
}

/**
 * SVG's sweep flag is "positive angle on a y-down canvas", which is clockwise
 * on screen; our angles grow counter-clockwise on screen, so a growing sweep is
 * flag 0 and a shrinking one is flag 1.
 */
function arcPath({ c, r, from, to }) {
  const [x1, y1] = onCircle(c, r, from);
  const [x2, y2] = onCircle(c, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 0 : 1;
  return `M${round(x1)} ${round(y1)}A${round(r)} ${round(r)} 0 ${large} ${sweep} ${round(x2)} ${round(y2)}`;
}

/** Stroked art becomes one `d`; a full circle needs two arcs to close. */
function strokePath(art) {
  const parts = [];
  for (const p of art) {
    if (p.k === "seg") {
      const [x1, y1] = p.a;
      const [x2, y2] = p.b;
      parts.push(`M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}`);
    } else if (p.k === "arc") {
      parts.push(arcPath(p));
    } else if (p.k === "ring") {
      const [cx, cy] = p.c;
      parts.push(
        `M${round(cx - p.r)} ${round(cy)}` +
          `A${round(p.r)} ${round(p.r)} 0 1 0 ${round(cx + p.r)} ${round(cy)}` +
          `A${round(p.r)} ${round(p.r)} 0 1 0 ${round(cx - p.r)} ${round(cy)}`,
      );
    }
  }
  return parts.join("");
}

/** Filled art (the `i` dot, the monogram's centre) rides its own element. */
const discs = (art) => art.filter((p) => p.k === "disc");

function discMarkup(art, indent) {
  return discs(art)
    .map((p) => `${indent}<circle cx="${round(p.c[0])}" cy="${round(p.c[1])}" r="${round(p.r)}" fill="currentColor" />`)
    .join("\n");
}

const STROKE_ATTRS = (w) =>
  `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

/** The `<g>` pair the component inlines and the standalone file repeats. */
function wordmarkGroups(indent) {
  const group = (art, opacity) => {
    const d = strokePath(art);
    const dots = discMarkup(art, `${indent}  `);
    const alpha = opacity === 1 ? "" : ` opacity="${opacity}"`;
    return (
      `${indent}<g${alpha}>\n` +
      `${indent}  <path d="${d}" ${STROKE_ATTRS(STROKE)} />\n` +
      (dots ? `${dots}\n` : "") +
      `${indent}</g>`
    );
  };
  return `${group(LEAD, 1)}\n${group(TRAIL, TRAIL_OPACITY)}`;
}

function monogramMarkup(indent) {
  return (
    `${indent}<path d="${strokePath(MONOGRAM)}" ${STROKE_ATTRS(MONOGRAM_STROKE)} />\n` +
    `${discMarkup(MONOGRAM, indent)}`
  );
}

const svgFile = (title, viewBox, body, extraHead = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}">\n` +
  `  <title>${title}</title>\n` +
  extraHead +
  `${body}\n` +
  `</svg>\n`;

// ---------------------------------------------------------------------------
// Geometry → pixels
// ---------------------------------------------------------------------------

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

function distToSegment([px, py], [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp01(((px - x1) * dx + (py - y1) * dy) / len2);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function distToArc([px, py], { c, r, from, to }) {
  const [cx, cy] = c;
  const deg = (Math.atan2(cy - py, px - cx) * 180) / Math.PI;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const within = [deg, deg + 360, deg - 360].some((a) => a >= lo && a <= hi);
  if (within) return Math.abs(Math.hypot(px - cx, py - cy) - r);
  const ends = [onCircle(c, r, from), onCircle(c, r, to)];
  return Math.min(...ends.map(([x, y]) => Math.hypot(px - x, py - y)));
}

/** True when the sample lands on ink: within half a stroke, or inside a disc. */
function covers(point, art, stroke) {
  const half = stroke / 2;
  for (const p of art) {
    if (p.k === "seg" && distToSegment(point, p.a, p.b) <= half) return true;
    if (p.k === "arc" && distToArc(point, p) <= half) return true;
    if (p.k === "ring" && Math.abs(Math.hypot(point[0] - p.c[0], point[1] - p.c[1]) - p.r) <= half) return true;
    if (p.k === "disc" && Math.hypot(point[0] - p.c[0], point[1] - p.c[1]) <= p.r) return true;
  }
  return false;
}

/** A rounded tile, so the PNG fallbacks are a shape and not a bleeding square. */
function coversTile([x, y], size, radius) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

const SAMPLES = 4; // 4×4 per pixel: enough for a 32px ring, cheap enough to be free

function coverage(px, py, sample) {
  let hits = 0;
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      const x = px + (sx + 0.5) / SAMPLES;
      const y = py + (sy + 0.5) / SAMPLES;
      if (sample(x, y)) hits++;
    }
  }
  return hits / (SAMPLES * SAMPLES);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, body, crc]);
}

/** 8-bit RGBA, no interlace, every scanline unfiltered. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const at = y * (1 + width * 4);
    raw[at] = 0;
    rgba.copy(raw, at + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * The PNG fallbacks: white monogram on the near-black tile.
 *
 * A PNG cannot follow the theme, and white-on-transparent disappears on a light
 * browser chrome, so the raster set commits to the canvas the product already
 * is (`--oc-bg`, #000) instead of gambling on the tab's background.
 */
function renderMonogramPng(size, { radius, inset }) {
  const scale = (size / 32) * inset;
  const offset = (size - 32 * scale) / 2;
  const toArt = (x, y) => [(x - offset) / scale, (y - offset) / scale];
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = radius === 0 ? 1 : coverage(x, y, (sx, sy) => coversTile([sx, sy], size, radius));
      const mark = coverage(x, y, (sx, sy) => covers(toArt(sx, sy), MONOGRAM, MONOGRAM_STROKE));
      // Tile is black, mark is white: the composite is a plain lerp on a
      // premultiplied-by-nothing pair, so the value is the mark's coverage.
      const alpha = Math.max(tile, mark);
      const level = alpha === 0 ? 0 : Math.round((mark / alpha) * 255);
      const at = (y * size + x) * 4;
      rgba[at] = level;
      rgba[at + 1] = level;
      rgba[at + 2] = level;
      rgba[at + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

/** The proof sheet: the wordmark, large, so a curve can be judged by eye. */
function renderWordmarkPng(height) {
  const [vx, vy, vw, vh] = WORDMARK_VIEWBOX.split(" ").map(Number);
  const scale = height / vh;
  const width = Math.round(vw * scale);
  const rgba = Buffer.alloc(width * height * 4);
  const toArt = (x, y) => [x / scale + vx, y / scale + vy];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lead = coverage(x, y, (sx, sy) => covers(toArt(sx, sy), LEAD, STROKE));
      const trail = coverage(x, y, (sx, sy) => covers(toArt(sx, sy), TRAIL, STROKE));
      const alpha = Math.max(lead, trail * TRAIL_OPACITY);
      // The sheet is judged on the canvas the product actually is, opaque, so
      // white-on-white viewers cannot hide a bad curve.
      const level = Math.round(alpha * 255);
      const at = (y * width + x) * 4;
      rgba[at] = rgba[at + 1] = rgba[at + 2] = level;
      rgba[at + 3] = 255;
    }
  }
  return encodePng(width, height, rgba);
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  console.log(`wrote ${path.replace(`${ROOT}/`, "")}`);
}

const wordmarkSvg = svgFile("pilotdeck", WORDMARK_VIEWBOX, wordmarkGroups("  "));
const monogramSvg = svgFile("pilotdeck", MONOGRAM_VIEWBOX, monogramMarkup("  "));
const faviconSvg = svgFile(
  "pilotdeck",
  MONOGRAM_VIEWBOX,
  monogramMarkup("  "),
  `  <style>\n` +
    `    svg { color: ${FAVICON_INK_LIGHT} }\n` +
    `    @media (prefers-color-scheme: dark) { svg { color: ${FAVICON_INK_DARK} } }\n` +
    `  </style>\n`,
);

function generatedTs() {
  const dots = (art) =>
    discs(art).map((p) => `{ cx: ${round(p.c[0])}, cy: ${round(p.c[1])}, r: ${round(p.r)} }`);
  return `// AUTO-GENERATED by scripts/brand-icons.mjs — the identity lives there. Do not edit.
export const BRAND_ART = {
  stroke: ${STROKE},
  wordmark: {
    viewBox: "${WORDMARK_VIEWBOX}",
    trailOpacity: ${TRAIL_OPACITY},
    lead: { d: "${strokePath(LEAD)}", dots: [${dots(LEAD).join(", ")}] },
    trail: { d: "${strokePath(TRAIL)}", dots: [${dots(TRAIL).join(", ")}] },
  },
  monogram: {
    viewBox: "${MONOGRAM_VIEWBOX}",
    stroke: ${MONOGRAM_STROKE},
    d: "${strokePath(MONOGRAM)}",
    dots: [${dots(MONOGRAM).join(", ")}],
  },
} as const;
`;
}

write(join(BRAND_DIR, "wordmark.svg"), wordmarkSvg);
write(join(BRAND_DIR, "monogram.svg"), monogramSvg);
write(join(BRAND_DIR, "favicon.svg"), faviconSvg);
write(join(BRAND_DIR, "icon-32.png"), renderMonogramPng(32, { radius: 6, inset: 0.92 }));
// iOS masks the touch icon itself, so this one stays a full square.
write(join(BRAND_DIR, "apple-touch-icon-180.png"), renderMonogramPng(180, { radius: 0, inset: 0.66 }));
write(join(GENERATED_DIR, "brandArt.ts"), generatedTs());

if (process.argv.includes("--preview")) {
  const out = process.env.BRAND_PREVIEW_DIR || "/tmp";
  write(join(out, "wordmark-preview.png"), renderWordmarkPng(160));
  write(join(out, "monogram-preview.png"), renderMonogramPng(256, { radius: 48, inset: 0.72 }));
}
