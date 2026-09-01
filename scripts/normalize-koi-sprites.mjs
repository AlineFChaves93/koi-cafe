import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Raw artist sheets live outside the app repo (art-src); only the normalized
// atlases ship with the game.
const inputDirectory = path.join(projectRoot, "../art-src/packs/koi-raw/variants");
const outputDirectory = path.join(projectRoot, "public/assets/koi");

const atlases = [
  { filename: "platinum-ogon.png", sourceColumns: 12, expectedFrames: [8, 6, 12, 12, 12, 12] },
  { filename: "hi-utsuri-v2.png", sourceColumns: 10, expectedFrames: [8, 6, 10, 10, 10, 10] },
  // Recolor do platinum (tools/make-yamabuki.py); mesmas grade e contagens.
  { filename: "yamabuki-ogon.png", sourceColumns: 12, expectedFrames: [8, 6, 12, 12, 12, 12] },
  { filename: "sanke-v2.png", sourceColumns: 9, expectedFrames: [8, 5, 9, 9, 9, 9], pattern: "simple-sanke" },
  { filename: "kohaku.png", sourceColumns: 10, expectedFrames: [7, 5, 10, 10, 10, 10] },
  { filename: "tancho.png", sourceColumns: 12, expectedFrames: [8, 6, 12, 12, 12, 12] },
];

const rows = 6;
const columns = 12;
const cellSize = 512;
const outputFrameCounts = [8, 6, 12, 12, 12, 12];
const alphaThreshold = 64;
const edgeRadius = 3;

const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

function describeComponent(pixels, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (const pixel of pixels) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    area: pixels.length,
    pixels,
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function findComponents(data, width, height) {
  const seen = new Uint8Array(width * height);
  const components = [];
  const stack = [];

  for (let start = 0; start < width * height; start += 1) {
    if (seen[start] || data[start * 4 + 3] < alphaThreshold) continue;

    seen[start] = 1;
    stack.push(start);
    const pixels = [];

    while (stack.length) {
      const pixel = stack.pop();
      const x = pixel % width;
      pixels.push(pixel);

      const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= width * height || seen[neighbor]) continue;
        if (Math.abs((neighbor % width) - x) > 1) continue;
        if (data[neighbor * 4 + 3] < alphaThreshold) continue;
        seen[neighbor] = 1;
        stack.push(neighbor);
      }
    }

    const area = pixels.length;
    if (area < width * height * 0.001) continue;
    components.push(describeComponent(pixels, width, height));
  }

  return components;
}

function splitAtLargestRowGaps(components) {
  const byY = [...components].sort((a, b) => a.centerY - b.centerY);
  const gaps = byY.slice(1).map((component, index) => ({
    index: index + 1,
    size: component.centerY - byY[index].centerY,
  }));
  const splits = gaps
    .sort((a, b) => b.size - a.size)
    .slice(0, rows - 1)
    .map(({ index }) => index)
    .sort((a, b) => a - b);

  const grouped = [];
  let start = 0;
  for (const split of [...splits, byY.length]) {
    grouped.push(byY.slice(start, split).sort((a, b) => a.centerX - b.centerX));
    start = split;
  }

  if (grouped.length !== rows || grouped.some((row) => row.length === 0)) {
    throw new Error(`Expected ${rows} populated rows, found ${grouped.map((row) => row.length).join(", ")}`);
  }
  return grouped;
}

function groupIntoRows(components, width, expectedFrames, sourceColumns) {
  const typicalHeight = median(components.map((component) => component.height));
  const regularComponents = components.filter((component) => component.height <= typicalHeight * 1.5);
  const grouped = splitAtLargestRowGaps(regularComponents);
  const sourceCellWidth = width / sourceColumns;

  return grouped.map((row, rowIndex) => {
    const slots = new Array(expectedFrames[rowIndex]).fill(null);
    for (const component of row) {
      const slot = Math.max(0, Math.min(
        expectedFrames[rowIndex] - 1,
        Math.round(component.centerX / sourceCellWidth - 0.5),
      ));
      if (slots[slot]) throw new Error(`Two components mapped to row ${rowIndex}, frame ${slot}`);
      slots[slot] = component;
    }

    for (let slot = 0; slot < slots.length; slot += 1) {
      if (slots[slot]) continue;
      let nearest = null;
      let distance = Number.POSITIVE_INFINITY;
      for (let candidate = 0; candidate < slots.length; candidate += 1) {
        if (slots[candidate] && Math.abs(candidate - slot) < distance) {
          nearest = slots[candidate];
          distance = Math.abs(candidate - slot);
        }
      }
      if (!nearest) throw new Error(`Could not repair row ${rowIndex}, frame ${slot}`);
      slots[slot] = nearest;
    }
    return slots;
  });
}

function isolateComponent(source, sourceWidth, sourceHeight, component) {
  const left = Math.max(0, component.minX - edgeRadius);
  const top = Math.max(0, component.minY - edgeRadius);
  const right = Math.min(sourceWidth - 1, component.maxX + edgeRadius);
  const bottom = Math.min(sourceHeight - 1, component.maxY + edgeRadius);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const keep = new Uint8Array(width * height);

  for (const pixel of component.pixels) {
    const sourceX = pixel % sourceWidth;
    const sourceY = Math.floor(pixel / sourceWidth);
    for (let offsetY = -edgeRadius; offsetY <= edgeRadius; offsetY += 1) {
      for (let offsetX = -edgeRadius; offsetX <= edgeRadius; offsetX += 1) {
        const x = sourceX - left + offsetX;
        const y = sourceY - top + offsetY;
        if (x >= 0 && x < width && y >= 0 && y < height) keep[y * width + x] = 1;
      }
    }
  }

  const output = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!keep[y * width + x]) continue;
      const sourceOffset = ((top + y) * sourceWidth + left + x) * 4;
      const outputOffset = (y * width + x) * 4;
      output[outputOffset] = source[sourceOffset];
      output[outputOffset + 1] = source[sourceOffset + 1];
      output[outputOffset + 2] = source[sourceOffset + 2];
      output[outputOffset + 3] = source[sourceOffset + 3];
    }
  }

  return { data: output, width, height };
}

function applySimpleSankePattern(frame) {
  const output = Buffer.from(frame.data);
  const centers = new Float32Array(frame.height);
  const radii = new Float32Array(frame.height);
  let minY = frame.height;
  let maxY = 0;

  for (let y = 0; y < frame.height; y += 1) {
    let minX = frame.width;
    let maxX = -1;
    for (let x = 0; x < frame.width; x += 1) {
      if (frame.data[(y * frame.width + x) * 4 + 3] < alphaThreshold) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (maxX < minX) continue;
    centers[y] = (minX + maxX) / 2;
    radii[y] = Math.max(1, (maxX - minX) / 2);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const palette = {
    white: [242, 245, 248],
    orange: [226, 61, 28],
    black: [27, 29, 32],
  };
  const organicEllipse = (t, cross, centerT, centerX, radiusT, radiusX, phase) => {
    const longitudinal = (t - centerT) / radiusT;
    const lateral = (cross - centerX) / radiusX;
    const edge = 0.09 * Math.sin(longitudinal * 3 + lateral * 5 + phase)
      + 0.04 * Math.sin(longitudinal * 7 - lateral * 2 + phase * 0.7);
    return longitudinal ** 2 + lateral ** 2 <= 1 + edge;
  };

  for (let y = minY; y <= maxY; y += 1) {
    if (radii[y] === 0) continue;
    const t = (y - minY) / Math.max(1, maxY - minY);
    for (let x = 0; x < frame.width; x += 1) {
      const offset = (y * frame.width + x) * 4;
      if (frame.data[offset + 3] === 0) continue;
      const cross = (x - centers[y]) / radii[y];
      const sourceLuminance = (0.2126 * frame.data[offset]
        + 0.7152 * frame.data[offset + 1]
        + 0.0722 * frame.data[offset + 2]) / 255;
      if (t < 0.10 && sourceLuminance < 0.18) continue;
      const isOrange = organicEllipse(t, cross, 0.085, -0.06, 0.085, 0.36, 0.2)
        || organicEllipse(t, cross, 0.40, -0.22, 0.10, 0.30, 1.1)
        || organicEllipse(t, cross, 0.66, 0.18, 0.08, 0.25, 2.3);
      const isBlack = organicEllipse(t, cross, 0.25, 0.22, 0.06, 0.18, 0.8)
        || organicEllipse(t, cross, 0.54, -0.18, 0.055, 0.17, 1.6);
      const color = isBlack ? palette.black : isOrange ? palette.orange : palette.white;
      const edgeLight = 0.72 + 0.28 * (1 - Math.min(1, Math.abs(cross)) ** 1.6);
      const dorsalLight = 0.055 * Math.exp(-(((cross + 0.2) / 0.28) ** 2));
      const lengthLight = 0.94 + 0.06 * Math.sin(Math.PI * t);
      const texture = 0.985 + 0.015 * Math.sin(48 * t + 9 * cross) * Math.sin(31 * t - 12 * cross);
      const lighting = Math.min(1.02, (edgeLight + dorsalLight) * lengthLight * texture + (isBlack ? 0.06 : 0));
      output[offset] = Math.round(color[0] * lighting);
      output[offset + 1] = Math.round(color[1] * lighting);
      output[offset + 2] = Math.round(color[2] * lighting);
    }
  }

  return { ...frame, data: output };
}

async function normalizeAtlas({ filename, expectedFrames, sourceColumns, pattern }) {
  const inputPath = path.join(inputDirectory, filename);
  const outputPath = path.join(outputDirectory, filename.replace(/\.png$/, ".webp"));
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const grouped = groupIntoRows(findComponents(data, info.width, info.height), info.width, expectedFrames, sourceColumns);
  const actualFrames = grouped.map((row) => row.length);
  if (actualFrames.some((count, index) => count !== expectedFrames[index])) {
    throw new Error(`${filename}: expected ${expectedFrames.join("/")} frames, found ${actualFrames.join("/")}`);
  }
  const composites = [];

  for (let rowIndex = 0; rowIndex < grouped.length; rowIndex += 1) {
    const row = grouped[rowIndex];
    const rowMedianHeight = median(row.map((component) => component.height));
    const rowMaxWidth = Math.max(...row.map((component) => component.width));
    const rowMaxHeight = Math.max(...row.map((component) => component.height));
    const scale = Math.min(
      (cellSize * 0.78) / rowMedianHeight,
      (cellSize * 0.88) / rowMaxWidth,
      (cellSize * 0.88) / rowMaxHeight,
    );
    const normalizedFrames = [];

    for (const component of row) {
      const isolated = isolateComponent(data, info.width, info.height, component);
      const prepared = pattern === "simple-sanke" ? applySimpleSankePattern(isolated) : isolated;
      const width = Math.max(1, Math.round(prepared.width * scale));
      const height = Math.max(1, Math.round(prepared.height * scale));
      const frame = await sharp(prepared.data, {
        raw: { width: prepared.width, height: prepared.height, channels: 4 },
      }).resize(width, height, { kernel: sharp.kernel.lanczos3 }).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
      normalizedFrames.push({ frame, width, height });
    }

    const outputCount = outputFrameCounts[rowIndex];
    for (let frameIndex = 0; frameIndex < outputCount; frameIndex += 1) {
      const sourceIndex = outputCount === normalizedFrames.length
        ? frameIndex
        : Math.round((frameIndex * (normalizedFrames.length - 1)) / (outputCount - 1));
      const sourceFrame = normalizedFrames[sourceIndex];
      composites.push({
        input: sourceFrame.frame,
        left: frameIndex * cellSize + Math.round((cellSize - sourceFrame.width) / 2),
        top: rowIndex * cellSize + Math.round((cellSize - sourceFrame.height) / 2),
      });
    }
  }

  await sharp({
    create: {
      width: columns * cellSize,
      height: rows * cellSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites).webp({ quality: 88, alphaQuality: 90 }).toFile(outputPath);

  return `${filename}: ${grouped.map((row) => row.length).join("/")} source frames`;
}

await fs.mkdir(outputDirectory, { recursive: true });
// Argumentos opcionais filtram por nome de arquivo (ex.: `npm run sprites:normalize -- yamabuki-ogon`).
const only = process.argv.slice(2);
const selected = only.length ? atlases.filter((atlas) => only.some((name) => atlas.filename.includes(name))) : atlases;
if (selected.length === 0) throw new Error(`No atlas matches: ${only.join(", ")}`);
for (const atlas of selected) console.log(await normalizeAtlas(atlas));
