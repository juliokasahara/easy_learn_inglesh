#!/usr/bin/env node
/**
 * EasyLearn English — Gerador de ícones PNG
 *
 * Gera os ícones 16×16, 48×48 e 128×128 usando apenas Node.js built-ins.
 * Nenhuma dependência externa necessária.
 *
 * Uso:
 *   node generate-icons.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, 'icons');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── CRC-32 (necessário para chunks PNG) ──────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── Chunk PNG ─────────────────────────────────────────────────────────────────
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4);
  const crcBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ── Cria PNG RGBA sólido com círculo e letra "E" ─────────────────────────────
function createIconPNG(size) {
  // Paleta
  const BG = [0x1a, 0x73, 0xe8, 0xFF]; // azul #1a73e8
  const FG = [0xFF, 0xFF, 0xFF, 0xFF]; // branco

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowBytes = 1 + size * 4; // filtro + RGBA
  const raw = Buffer.alloc(size * rowBytes, 0); // inicia transparente

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r  = size * 0.46;

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filtro "None"
    for (let x = 0; x < size; x++) {
      const dx   = x - cx;
      const dy   = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const base = y * rowBytes + 1 + x * 4;

      if (dist > r) continue; // fora do círculo → transparente

      // fundo azul por padrão
      let px = BG;

      // Desenha letra "E" em coordenadas normalizadas [0..1]
      const nx = x / size;
      const ny = y / size;

      const inHorizontalRange = nx >= 0.26 && nx <= 0.73;
      const isVerticalBar     = nx >= 0.26 && nx <= 0.40;
      const isTopBar          = ny >= 0.22 && ny <= 0.34 && inHorizontalRange;
      const isMidBar          = ny >= 0.44 && ny <= 0.56 && nx >= 0.26 && nx <= 0.64;
      const isBotBar          = ny >= 0.66 && ny <= 0.78 && inHorizontalRange;

      if (
        (isVerticalBar && ny >= 0.22 && ny <= 0.78) ||
        isTopBar || isMidBar || isBotBar
      ) {
        px = FG;
      }

      raw[base]     = px[0];
      raw[base + 1] = px[1];
      raw[base + 2] = px[2];
      raw[base + 3] = px[3];
    }
  }

  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Gera os três tamanhos ────────────────────────────────────────────────────
for (const size of [16, 48, 128]) {
  const png      = createIconPNG(size);
  const filePath = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`✓  icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\n✅  Ícones gerados com sucesso na pasta icons/');
console.log('\nPróximos passos:');
console.log('  1. Abra  chrome://extensions/  (ou  edge://extensions/)');
console.log('  2. Ative o "Modo desenvolvedor" (canto superior direito)');
console.log('  3. Clique em "Carregar sem compactação"');
console.log('  4. Selecione esta pasta:', __dirname);
