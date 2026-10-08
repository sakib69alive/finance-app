// অ্যাপ আইকন (PNG) বানায় — কোনো বাইরের লাইব্রেরি লাগে না।
// চালান: node tools/make-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const T = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  T[n] = c >>> 0;
}
const crc32 = buf => {
  let c = 0xffffffff;
  for (const x of buf) c = T[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const C1 = [63, 66, 46], C2 = [90, 86, 56];
const IVORY = [245, 230, 197], APRICOT = [215, 139, 48];

// rounded: ব্যাকগ্রাউন্ডের কোণা গোল কিনা; box: বারগুলো কোন জায়গায় থাকবে (0..1)
function draw(size, { rounded, box }) {
  const out = Buffer.alloc(size * size * 4);
  const [b0, b1] = box;
  const B = b1 - b0;
  const bw = 0.22 * B, gap = 0.17 * B, rad = 0.06 * B;
  const bars = [0.45, 0.7, 1].map((hgt, i) => ({
    x0: b0 + i * (bw + gap), x1: b0 + i * (bw + gap) + bw, y0: b1 - hgt * B, y1: b1, a: [0.7, 0.92, 1][i], col: [IVORY, IVORY, APRICOT][i],
  }));
  const S = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, bl = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const x = (px + (sx + 0.5) / S) / size;
          const y = (py + (sy + 0.5) / S) / size;
          if (rounded && !inRoundRect(x, y, 0, 0, 1, 1, 0.22)) continue;
          const t = (x + y) / 2;
          let cr = C1[0] + (C2[0] - C1[0]) * t;
          let cg = C1[1] + (C2[1] - C1[1]) * t;
          let cb = C1[2] + (C2[2] - C1[2]) * t;
          for (const bar of bars) {
            if (inRoundRect(x, y, bar.x0, bar.y0, bar.x1, bar.y1, rad)) {
              cr += (bar.col[0] - cr) * bar.a; cg += (bar.col[1] - cg) * bar.a; cb += (bar.col[2] - cb) * bar.a;
            }
          }
          r += cr; g += cg; bl += cb; a += 1;
        }
      }
      const i = (py * size + px) * 4;
      if (a > 0) {
        out[i] = Math.round(r / a); out[i + 1] = Math.round(g / a); out[i + 2] = Math.round(bl / a);
      }
      out[i + 3] = Math.round((a / (S * S)) * 255);
    }
  }
  return encodePNG(size, size, out);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
const jobs = [
  ['icon-192.png', 192, { rounded: true, box: [0.2, 0.8] }],
  ['icon-512.png', 512, { rounded: true, box: [0.2, 0.8] }],
  ['maskable-512.png', 512, { rounded: false, box: [0.29, 0.71] }],
  ['apple-touch-icon.png', 180, { rounded: false, box: [0.22, 0.78] }],
];
for (const [name, size, opts] of jobs) {
  fs.writeFileSync(path.join(dir, name), draw(size, opts));
  console.log('তৈরি হলো', name);
}
