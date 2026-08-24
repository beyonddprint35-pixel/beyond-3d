import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const sourcePath = path.join(publicDir, "beyond-logo.png");
const darkPath = path.join(publicDir, "beyond-apple-dark.png");
const lightPath = path.join(publicDir, "beyond-apple-light.png");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const LIGHT_MODE_BACKGROUND = [6, 19, 31];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function parsePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Source logo is not a PNG file.");

  let offset = 8;
  let ihdr;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") ihdr = Buffer.from(data);
    if (type === "IDAT") idat.push(Buffer.from(data));
    if (type === "IEND") break;
  }

  if (!ihdr || !idat.length) throw new Error("PNG is missing IHDR or IDAT data.");

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const compression = ihdr[10];
  const filter = ihdr[11];
  const interlace = ihdr[12];

  if (bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0) {
    throw new Error("Unsupported PNG format for Apple icon generation.");
  }

  const channelsByType = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByType[colorType];
  if (!channels) throw new Error(`Unsupported PNG color type: ${colorType}`);

  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * channels);
  let srcOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[srcOffset++];
    const rowStart = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[srcOffset++];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y > 0 ? pixels[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[rowStart - stride + x - channels] : 0;

      let value;
      if (filterType === 0) value = raw;
      else if (filterType === 1) value = (raw + left) & 255;
      else if (filterType === 2) value = (raw + up) & 255;
      else if (filterType === 3) value = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filterType === 4) value = (raw + paeth(left, up, upLeft)) & 255;
      else throw new Error(`Unsupported PNG row filter: ${filterType}`);

      pixels[rowStart + x] = value;
    }
  }

  return { width, height, colorType, channels, pixels };
}

function compositeOnDarkBackground(parsed) {
  const { width, height, colorType, channels, pixels } = parsed;
  const rgba = Buffer.alloc(width * height * 4);
  const [bgR, bgG, bgB] = LIGHT_MODE_BACKGROUND;

  for (let i = 0, out = 0; i < pixels.length; i += channels, out += 4) {
    let r;
    let g;
    let b;
    let a = 255;

    if (colorType === 6) [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    else if (colorType === 4) {
      r = g = b = pixels[i];
      a = pixels[i + 1];
    } else if (colorType === 2) [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    else r = g = b = pixels[i];

    const alpha = a / 255;
    rgba[out] = Math.round(r * alpha + bgR * (1 - alpha));
    rgba[out + 1] = Math.round(g * alpha + bgG * (1 - alpha));
    rgba[out + 2] = Math.round(b * alpha + bgB * (1 - alpha));
    rgba[out + 3] = 255;
  }

  return rgba;
}

function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * (stride + 1);
    raw[rawOffset] = 0;
    rgba.copy(raw, rawOffset + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

const original = fs.readFileSync(sourcePath);
const parsed = parsePng(original);
const lightPixels = compositeOnDarkBackground(parsed);

fs.writeFileSync(darkPath, original);
fs.writeFileSync(lightPath, encodeRgbaPng(parsed.width, parsed.height, lightPixels));

console.log(`Generated Apple icons from ${parsed.width}x${parsed.height} source without resizing or changing proportions.`);
