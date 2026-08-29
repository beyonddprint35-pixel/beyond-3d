const ANALYSIS_MAX = 180;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value) {
  return Math.round(value * 10) / 10;
}

async function sourceBlob(source) {
  if (source instanceof Blob) return source;
  const response = await fetch(String(source || ""), { mode:"cors", cache:"no-store" });
  if (!response.ok) throw new Error("Beyond could not inspect this photo for smart framing.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("The selected file is not an image.");
  return blob;
}

async function loadDrawable(blob) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation:"from-image" });
      return { source:bitmap, width:bitmap.width, height:bitmap.height, cleanup:() => bitmap.close?.() };
    } catch {
      // Safari and a few image formats fall through to Image below.
    }
  }

  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Beyond could not read this photo for smart framing."));
    image.src = url;
  });
  return {
    source:image,
    width:image.naturalWidth,
    height:image.naturalHeight,
    cleanup:() => URL.revokeObjectURL(url),
  };
}

function analyzeFocus(drawable) {
  const scale = Math.min(1, ANALYSIS_MAX / Math.max(drawable.width, drawable.height, 1));
  const width = Math.max(12, Math.round(drawable.width * scale));
  const height = Math.max(12, Math.round(drawable.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha:false, willReadFrequently:true });
  if (!context) return { x:50, y:50, confidence:0, method:"center-fallback" };

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(drawable.source, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luma = new Float32Array(width * height);
  const saturation = new Float32Array(width * height);

  for (let i = 0, p = 0; i < luma.length; i += 1, p += 4) {
    const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
    luma[i] = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
    saturation[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }

  const scores = [];
  let total = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width) + x;
      const gx = Math.abs(luma[i + 1] - luma[i - 1]);
      const gy = Math.abs(luma[i + width] - luma[i - width]);
      const diagonal = Math.abs(luma[i + width + 1] - luma[i - width - 1]);
      const localEdge = gx + gy + (diagonal * 0.35);
      const midtone = 1 - Math.min(1, Math.abs(luma[i] - 128) / 128);
      const nx = (x / (width - 1)) - 0.5;
      const ny = (y / (height - 1)) - 0.5;
      const centerDistance = Math.min(1, Math.sqrt((nx * nx) + (ny * ny)) / 0.7071);
      const centerPrior = 0.72 + ((1 - centerDistance) * 0.28);
      const score = ((localEdge * 1.18) + (saturation[i] * 0.28) + (midtone * 8)) * centerPrior;
      scores.push({ x, y, score });
      total += score;
    }
  }

  if (!scores.length || total <= 0) return { x:50, y:50, confidence:0, method:"center-fallback" };

  const sorted = scores.map(point => point.score).sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 0.86)] || 0;
  const mean = total / scores.length;
  let weightedX = 0;
  let weightedY = 0;
  let weightTotal = 0;
  let salientTotal = 0;
  let salientCount = 0;

  for (const point of scores) {
    if (point.score < threshold) continue;
    const weight = Math.max(0.1, point.score - threshold + 1);
    weightedX += point.x * weight;
    weightedY += point.y * weight;
    weightTotal += weight;
    salientTotal += point.score;
    salientCount += 1;
  }

  if (!weightTotal || !salientCount) return { x:50, y:50, confidence:0, method:"center-fallback" };

  const rawX = (weightedX / weightTotal) / (width - 1) * 100;
  const rawY = (weightedY / weightTotal) / (height - 1) * 100;
  const salientMean = salientTotal / salientCount;
  const separation = salientMean / Math.max(1, mean);
  const confidence = Math.round(clamp(38 + ((separation - 1) * 24), 35, 94));

  return {
    x:rounded(clamp(rawX, 8, 92)),
    y:rounded(clamp(rawY, 8, 92)),
    confidence,
    method:"visual-saliency-v1",
  };
}

export async function detectMenuPhotoFocus(source) {
  try {
    const blob = await sourceBlob(source);
    const drawable = await loadDrawable(blob);
    try {
      return analyzeFocus(drawable);
    } finally {
      drawable.cleanup?.();
    }
  } catch {
    return { x:50, y:50, confidence:0, method:"center-fallback" };
  }
}
