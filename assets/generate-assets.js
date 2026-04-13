const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c2 = n;
    for (let k = 0; k < 8; k++) c2 = (c2 & 1) ? (0xEDB88320 ^ (c2 >>> 1)) : (c2 >>> 1);
    table[n] = c2;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, Buffer.from(type), data, crcBuf]);
}

function createPNG(width, height, drawPixel, filename) {
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = [0];
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      row.push(r, g, b, a);
    }
    rawRows.push(Buffer.from(row));
  }
  const raw = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);

  fs.writeFileSync(filename, png);
  console.log(`  ✅ ${filename}: ${width}x${height} (${(png.length / 1024).toFixed(1)} KB)`);
}

// Logo spatial: orbe + anneaux + étoiles
function drawLogo(x, y, w, h) {
  const cx = w / 2, cy = h * 0.4;
  const maxR = Math.min(w, h) * 0.35;

  // Fond noir
  if (y < 2 || y > h - 3 || x < 2 || x > w - 3) return [0, 0, 0, 0];

  // Étoiles scintillantes
  let hash = ((x * 374761393 + y * 668265263 + 42) % 100000 + 100000) % 100000;
  if (hash % 120 === 0) {
    const b = 160 + (hash % 95);
    return [b, b, b, 140 + (hash % 115)];
  }

  const dOrbe = Math.hypot(x - cx, y - cy);

  // Halo externe
  if (dOrbe < maxR * 1.1 && dOrbe > maxR * 0.5) {
    const alpha = Math.floor(25 * (1 - dOrbe / (maxR * 1.1)));
    if (alpha > 3) return [0, 200, 255, alpha];
  }

  // Orbe central
  const orbeR = maxR * 0.15;
  if (dOrbe < orbeR) {
    const t = dOrbe / orbeR;
    return [
      Math.floor(t * 100),
      Math.floor(230 - t * 60),
      255,
      255
    ];
  }

  // Reflet blanc sur orbe
  const rD = Math.hypot(x - (cx - orbeR * 0.25), y - (cy - orbeR * 0.25));
  if (rD < orbeR * 0.3) return [220, 245, 255, 140];

  // Anneaux elliptiques
  const rings = [
    { rx: maxR * 0.95, ry: maxR * 0.32, t: 2, c: [80, 200, 255, 60] },
    { rx: maxR * 0.7, ry: maxR * 0.24, t: 3, c: [0, 212, 255, 100] },
    { rx: maxR * 0.45, ry: maxR * 0.15, t: 4, c: [0, 212, 255, 170] },
  ];

  for (const ring of rings) {
    const dx = (x - cx) / ring.rx;
    const dy = (y - cy) / ring.ry;
    const dist = Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) * ring.rx;
    if (dist < ring.t) {
      const a = Math.floor(ring.c[3] * (1 - dist / ring.t));
      return [ring.c[0], ring.c[1], ring.c[2], a];
    }
  }

  return [0, 0, 0, 0];
}

console.log('🎨 Génération des assets Success Polaris...');
createPNG(1024, 1024, drawLogo, __dirname + '/icon.png');
createPNG(1024, 1024, drawLogo, __dirname + '/adaptive-icon.png');
createPNG(512, 512, drawLogo, __dirname + '/splash.png');
createPNG(64, 64, drawLogo, __dirname + '/favicon.png');
console.log('✅ Terminé!');
