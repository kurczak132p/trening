// Generuje ikony PNG (bez zależności): node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [23, 25, 31], FG = [255, 90, 31], FG2 = [255, 138, 92];

// Kształty w układzie 0..1 (prostokąty z zaokrągleniem)
const SHAPES = [
  { x: 0.30, y: 0.465, w: 0.40, h: 0.07, r: 0.02, c: FG2 },  // gryf
  { x: 0.17, y: 0.33, w: 0.08, h: 0.34, r: 0.025, c: FG },   // talerz duży L
  { x: 0.75, y: 0.33, w: 0.08, h: 0.34, r: 0.025, c: FG },   // talerz duży P
  { x: 0.25, y: 0.38, w: 0.055, h: 0.24, r: 0.02, c: FG },   // talerz mały L
  { x: 0.695, y: 0.38, w: 0.055, h: 0.24, r: 0.02, c: FG },  // talerz mały P
  { x: 0.12, y: 0.445, w: 0.05, h: 0.11, r: 0.015, c: FG2 }, // końcówka L
  { x: 0.83, y: 0.445, w: 0.05, h: 0.11, r: 0.015, c: FG2 }, // końcówka P
];

function inside(s, x, y) {
  if (x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) return false;
  const cx = Math.min(Math.max(x, s.x + s.r), s.x + s.w - s.r);
  const cy = Math.min(Math.max(y, s.y + s.r), s.y + s.h - s.r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= s.r * s.r;
}

function render(size) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 3);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0;
    for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
      const x = (i + (si + 0.5) / SS) / size, y = (j + (sj + 0.5) / SS) / size;
      let c = BG;
      for (const s of SHAPES) if (inside(s, x, y)) c = s.c;
      r += c[0]; g += c[1]; b += c[2];
    }
    const o = (j * size + i) * 3, n = SS * SS;
    px[o] = Math.round(r / n); px[o + 1] = Math.round(g / n); px[o + 2] = Math.round(b / n);
  }
  return px;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const px = render(size);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let j = 0; j < size; j++) {
    raw[j * (size * 3 + 1)] = 0;
    px.copy(raw, j * (size * 3 + 1) + 1, j * size * 3, (j + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
for (const s of [180, 192, 512]) fs.writeFileSync(path.join(out, `icon-${s}.png`), png(s));
console.log('Ikony zapisane w', out);
