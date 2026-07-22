// Gera assets/icon.png (512x512) sem dependências externas.
// Ícone: fundo roxo com gradiente + lente de câmera (círculos concêntricos).
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const S = 512;
const buf = Buffer.alloc(S * S * 4);

function px(x, y, r, g, b, a = 255) {
  const i = (y * S + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

const cx = S / 2, cy = S / 2;
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    // fundo: gradiente roxo (diagonal)
    const t = (x + y) / (2 * S);
    let r = Math.round(124 - t * 40);   // 0x7c -> menor
    let g = Math.round(58 + t * 20);
    let b = Math.round(237 - t * 30);
    const d = Math.hypot(x - cx, y - cy);
    // anel externo branco (corpo da lente)
    if (d < 175 && d > 150) { r = 245; g = 245; b = 250; }
    // lente escura
    else if (d <= 150 && d > 60) { r = 30; g = 27; b = 45; }
    // reflexo/centro claro
    else if (d <= 60) { r = 96 + Math.round((60 - d)); g = 165; b = 250; }
    // brilho pequeno
    if (Math.hypot(x - (cx + 45), y - (cy - 45)) < 22) { r = 255; g = 255; b = 255; }
    px(x, y, r, g, b, 255);
  }
}

// monta scanlines com filtro 0
const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

const out = path.join(__dirname, '..', 'assets', 'icon.png');
fs.writeFileSync(out, png);
console.log('icon.png escrito:', png.length, 'bytes ->', out);
