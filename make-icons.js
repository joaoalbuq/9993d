/* ============================================================
   make-icons.js — the PWA icons, drawn at build time.

   House style holds: no asset pipeline, no downloads, zero
   dependencies — the same chip the felt draws in canvas, here
   rasterized into real PNGs by a minimal encoder built on zlib.

   node 3dfullscreen/make-icons.js
   → media/icon-180.png          apple-touch-icon (iOS home screen)
   → media/icon-192.png          manifest "any"
   → media/icon-512.png          manifest "any"
   → media/icon-512-maskable.png manifest "maskable" (art scaled
                                 into the circular safe zone)

   The mark: deep-house green, a gold chip ring with its eight
   edge notches, and 999 printed at the center — the table's own
   chip texture, in logo form. 4× supersampled so the circles
   come out smooth at every size.
   ============================================================ */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

/* ---- a minimal RGBA PNG encoder (8-bit, no interlace) ----- */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;                    /* filter: none */
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---- the mark --------------------------------------------- */
const DEEP = [0x0b, 0x2b, 0x1d];
const GOLD = [0xd8, 0xb5, 0x6a];
const SS = 4;                                    /* supersample factor */

/* one digit, 5×7 — the corner-index voice, in pixels */
const NINE = [
  '.###.',
  '#...#',
  '#...#',
  '.####',
  '....#',
  '....#',
  '.###.'
];

function makeIcon(size, art) {
  const S = size * SS;
  const px = Buffer.alloc(S * S * 4);
  const set = (x, y, c, a) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = Math.round(a * 255);
  };
  const disc = (cx, cy, r, c, a) => {
    const r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(S, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(S, Math.ceil(cx + r)); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) set(x, y, c, a);
      }
  };
  const ring = (cx, cy, r, w, c, a) => {
    const o = (r + w / 2) * (r + w / 2), i2 = (r - w / 2) * (r - w / 2);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = dx * dx + dy * dy;
        if (d <= o && d >= i2) set(x, y, c, a);
      }
  };

  /* cloth base */
  for (let i = 0; i < S * S; i++) {
    px[i * 4] = DEEP[0]; px[i * 4 + 1] = DEEP[1]; px[i * 4 + 2] = DEEP[2]; px[i * 4 + 3] = 255;
  }

  const c0 = S / 2;
  const R = 0.38 * S * art;                      /* chip radius */
  ring(c0, c0, R, 0.055 * S * art, GOLD, 1);     /* the chip edge */
  for (let k = 0; k < 8; k++) {                  /* its eight notches */
    const a = k * Math.PI / 4;
    disc(c0 + Math.cos(a) * R, c0 + Math.sin(a) * R, 0.045 * S * art, GOLD, 1);
  }

  /* 999 at the center — three glyphs of the corner-index 9 */
  const cell = 0.035 * S * art;
  const totalW = 17 * cell;                      /* 5+1+5+1+5 */
  const x0 = c0 - totalW / 2, y0 = c0 - 3.5 * cell;
  for (let g = 0; g < 3; g++) {
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (NINE[row][col] === '#') {
          const gx = x0 + g * 6 * cell + col * cell;
          for (let yy = 0; yy < cell; yy++)
            for (let xx = 0; xx < cell; xx++)
              set(gx + xx, y0 + row * cell + yy, GOLD, 1);
        }
  }

  /* box downsample */
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < SS; dy++)
        for (let dx = 0; dx < SS; dx++) {
          const i = ((y * SS + dy) * S + x * SS + dx) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3];
        }
      const n = SS * SS, o = (y * size + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
    }
  return encodePNG(size, size, out);
}

const OUT = path.join(__dirname, 'media');
fs.mkdirSync(OUT, { recursive: true });
const jobs = [
  ['icon-180.png', 180, 1],                      /* apple-touch-icon */
  ['icon-192.png', 192, 1],                      /* manifest any */
  ['icon-512.png', 512, 1],                      /* manifest any */
  ['icon-512-maskable.png', 512, 0.82]           /* maskable: art inside the safe circle */
];
for (const [name, size, art] of jobs) {
  const png = makeIcon(size, art);
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(name, size + 'px', png.length + ' bytes');
}
