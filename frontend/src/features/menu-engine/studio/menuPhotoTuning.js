export const BEYOND_PHOTO_PROFILE = "natural-auto-v1";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4.75 * 1024 * 1024;
const ANALYSIS_SIZE = 180;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

async function loadDrawable(file) {
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("The original photo is too large. Choose an image under 20 MB.");
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation:"from-image" });
      return {
        source:bitmap,
        width:bitmap.width,
        height:bitmap.height,
        cleanup:() => bitmap.close?.(),
      };
    } catch {
      // Fall through for Safari and formats createImageBitmap cannot decode.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("This image could not be opened. Try JPEG, PNG or WebP."));
    image.src = objectUrl;
  });
  return {
    source:image,
    width:image.naturalWidth,
    height:image.naturalHeight,
    cleanup:() => URL.revokeObjectURL(objectUrl),
  };
}

function drawAnalysisCanvas(drawable) {
  const scale = Math.min(1, ANALYSIS_SIZE / Math.max(drawable.width, drawable.height, 1));
  const width = Math.max(1, Math.round(drawable.width * scale));
  const height = Math.max(1, Math.round(drawable.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha:false, willReadFrequently:true });
  if (!context) throw new Error("Your browser could not inspect this photo.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(drawable.source, 0, 0, width, height);
  return { canvas, context, width, height };
}

function analyzeDrawable(drawable) {
  const { context, width, height } = drawAnalysisCanvas(drawable);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luma = new Float32Array(width * height);
  let sum = 0;
  let index = 0;

  for (let p = 0; p < pixels.length; p += 4) {
    const value = (pixels[p] * 0.2126) + (pixels[p + 1] * 0.7152) + (pixels[p + 2] * 0.0722);
    luma[index++] = value;
    sum += value;
  }

  const count = Math.max(1, luma.length);
  const brightness = sum / count;
  let variance = 0;
  let edgeTotal = 0;
  let edgeCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width) + x;
      const value = luma[i];
      variance += (value - brightness) ** 2;
      if (x + 1 < width) {
        edgeTotal += Math.abs(value - luma[i + 1]);
        edgeCount += 1;
      }
      if (y + 1 < height) {
        edgeTotal += Math.abs(value - luma[i + width]);
        edgeCount += 1;
      }
    }
  }

  const contrast = Math.sqrt(variance / count);
  const edgeStrength = edgeTotal / Math.max(1, edgeCount);
  const longest = Math.max(drawable.width, drawable.height);
  const notes = [];
  let score = 100;

  if (longest < 900) { notes.push("low_resolution"); score -= 28; }
  else if (longest < 1200) { notes.push("medium_resolution"); score -= 10; }

  if (brightness < 55) { notes.push("too_dark"); score -= 22; }
  else if (brightness < 78) { notes.push("slightly_dark"); score -= 9; }
  else if (brightness > 220) { notes.push("too_bright"); score -= 22; }
  else if (brightness > 202) { notes.push("slightly_bright"); score -= 9; }

  if (contrast < 27) { notes.push("low_contrast"); score -= 18; }
  else if (contrast < 38) { notes.push("soft_contrast"); score -= 7; }

  if (edgeStrength < 5.5) { notes.push("soft_focus"); score -= 18; }
  else if (edgeStrength < 8.5) { notes.push("slightly_soft"); score -= 7; }

  score = clamp(Math.round(score), 0, 100);
  const level = score >= 88 ? "excellent" : score >= 72 ? "good" : score >= 52 ? "needs_improvement" : "low_quality";

  return {
    score,
    level,
    notes,
    metrics:{
      brightness:Math.round(brightness),
      contrast:Math.round(contrast),
      edgeStrength:Number(edgeStrength.toFixed(1)),
      sourceWidth:drawable.width,
      sourceHeight:drawable.height,
    },
  };
}

function dimensionsFor(drawable, maxDimension) {
  const longest = Math.max(drawable.width, drawable.height, 1);
  const scale = Math.min(1, maxDimension / longest);
  return {
    width:Math.max(1, Math.round(drawable.width * scale)),
    height:Math.max(1, Math.round(drawable.height * scale)),
  };
}

async function renderVariant(drawable, analysis, { maxDimension, quality, enhanced }) {
  const { width, height } = dimensionsFor(drawable, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha:false });
  if (!context) throw new Error("Your browser could not prepare this photo.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (enhanced && "filter" in context) {
    const brightness = analysis.metrics.brightness < 90 ? 1.10 : analysis.metrics.brightness > 190 ? 0.96 : 1.02;
    const contrast = analysis.metrics.contrast < 35 ? 1.12 : 1.06;
    const saturation = 1.06;
    context.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
  }

  context.drawImage(drawable.source, 0, 0, width, height);
  context.filter = "none";

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  let extension = "webp";
  if (!blob) {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    extension = "jpg";
  }
  if (!blob) throw new Error("Your browser could not compress this photo.");
  return { blob, extension, width, height };
}

async function renderBoundedVariant(drawable, analysis, enhanced) {
  const attempts = enhanced
    ? [[1800, 0.84], [1500, 0.78], [1200, 0.70]]
    : [[2200, 0.88], [1800, 0.82], [1400, 0.74]];

  let result = null;
  for (const [maxDimension, quality] of attempts) {
    result = await renderVariant(drawable, analysis, { maxDimension, quality, enhanced });
    if (result.blob.size <= MAX_UPLOAD_BYTES) return result;
  }
  throw new Error("This photo is still too large after optimization. Try a smaller image.");
}

export async function prepareBeyondMenuPhoto(file) {
  const drawable = await loadDrawable(file);
  try {
    const analysis = analyzeDrawable(drawable);
    const [original, processed] = await Promise.all([
      renderBoundedVariant(drawable, analysis, false),
      renderBoundedVariant(drawable, analysis, true),
    ]);

    return {
      original,
      processed,
      analysis,
      profile:BEYOND_PHOTO_PROFILE,
      processedAt:new Date().toISOString(),
    };
  } finally {
    drawable.cleanup?.();
  }
}
