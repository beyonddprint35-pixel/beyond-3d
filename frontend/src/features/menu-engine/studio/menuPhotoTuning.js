export const BEYOND_PHOTO_PROFILE = "natural-auto-v2";
export const BEYOND_PRO_FINISH_PROFILE = "dish-safe-pro-v1";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4.75 * 1024 * 1024;
const ANALYSIS_SIZE = 180;
const DEFAULT_THEME_GRADE = Object.freeze({ brightness:1, contrast:1.04, saturation:1, sepia:0, hue:0, warmth:0, vignette:0.02 });
const NEUTRAL_RECIPE = Object.freeze({ exposure:0, contrast:1, saturation:1, warmth:0, tint:0, shadows:0, highlights:0, clarity:0, confidence:0 });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

async function loadDrawable(file) {
  if (!(file instanceof Blob) || !file.type.startsWith("image/")) {
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

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)))] || 0;
}

function analyzeDrawable(drawable) {
  const { context, width, height } = drawAnalysisCanvas(drawable);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luma = new Float32Array(width * height);
  let sum = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let shadows = 0;
  let highlights = 0;
  let index = 0;

  for (let p = 0; p < pixels.length; p += 4) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const value = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
    luma[index++] = value;
    sum += value;
    red += r;
    green += g;
    blue += b;
    if (value < 18) shadows += 1;
    if (value > 242) highlights += 1;
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

  const sortedLuma = Array.from(luma).sort((a, b) => a - b);
  const p05 = percentile(sortedLuma, 0.05);
  const p50 = percentile(sortedLuma, 0.5);
  const p95 = percentile(sortedLuma, 0.95);
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
      p05:Math.round(p05),
      p50:Math.round(p50),
      p95:Math.round(p95),
      dynamicRange:Math.round(p95 - p05),
      shadowClipPct:Number(((shadows / count) * 100).toFixed(1)),
      highlightClipPct:Number(((highlights / count) * 100).toFixed(1)),
      meanRed:Math.round(red / count),
      meanGreen:Math.round(green / count),
      meanBlue:Math.round(blue / count),
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

function localProfessionalRecipe(analysis) {
  const metrics = analysis.metrics;
  const targetMedian = 126;
  const safeMedian = Math.max(54, Math.min(205, metrics.p50 || metrics.brightness || targetMedian));
  const exposure = clamp(Math.log2(targetMedian / safeMedian) * 0.34, -0.18, 0.18);
  const dynamicRange = metrics.dynamicRange || 160;
  const contrast = dynamicRange < 120 ? 1.08 : dynamicRange < 155 ? 1.045 : dynamicRange > 220 ? 0.97 : 1.015;
  const saturation = metrics.contrast < 30 ? 1.035 : 1.015;

  const rbDelta = (metrics.meanRed || 128) - (metrics.meanBlue || 128);
  const greenDelta = (metrics.meanGreen || 128) - (((metrics.meanRed || 128) + (metrics.meanBlue || 128)) / 2);
  const warmth = clamp(-rbDelta / 1400, -0.018, 0.018);
  const tint = clamp(greenDelta / -1700, -0.012, 0.012);
  const shadowRecovery = metrics.p05 < 18 ? 0.12 : metrics.p05 < 34 ? 0.07 : metrics.shadowClipPct > 4 ? 0.05 : 0.02;
  const highlightRecovery = metrics.p95 > 244 ? -0.12 : metrics.p95 > 228 ? -0.065 : metrics.highlightClipPct > 3 ? -0.045 : -0.015;
  const clarity = metrics.edgeStrength < 6 ? 0.015 : metrics.edgeStrength < 12 ? 0.045 : 0.028;

  return {
    exposure,
    contrast,
    saturation,
    warmth,
    tint,
    shadows:shadowRecovery,
    highlights:highlightRecovery,
    clarity,
    confidence:0.72,
    source:"local-vision",
    safety:"dish-integrity-locked",
  };
}

function safeAiRecipe(recipe) {
  if (!recipe) return null;
  return {
    exposure:clamp(Number(recipe.exposure) || 0, -0.22, 0.22),
    contrast:clamp(Number(recipe.contrast) || 1, 0.94, 1.14),
    saturation:clamp(Number(recipe.saturation) || 1, 0.9, 1.12),
    warmth:clamp(Number(recipe.warmth) || 0, -0.055, 0.055),
    tint:clamp(Number(recipe.tint) || 0, -0.04, 0.04),
    shadows:clamp(Number(recipe.shadows) || 0, 0, 0.16),
    highlights:clamp(Number(recipe.highlights) || 0, -0.16, 0),
    clarity:clamp(Number(recipe.clarity) || 0, 0, 0.12),
    confidence:clamp(Number(recipe.confidence) || 0, 0, 1),
    source:recipe.source || "ai-vision",
    model:recipe.model || "",
    safety:"dish-integrity-locked",
  };
}

function mixNeutral(localValue, aiValue, neutral, weight) {
  return neutral + (((localValue - neutral) * (1 - weight)) + ((aiValue - neutral) * weight));
}

function resolveProfessionalRecipe(analysis, aiRecipe) {
  const local = localProfessionalRecipe(analysis);
  const ai = safeAiRecipe(aiRecipe);
  if (!ai) return local;
  const weight = clamp(0.35 + (ai.confidence * 0.4), 0.35, 0.75);
  return {
    exposure:(local.exposure * (1 - weight)) + (ai.exposure * weight),
    contrast:mixNeutral(local.contrast, ai.contrast, 1, weight),
    saturation:mixNeutral(local.saturation, ai.saturation, 1, weight),
    warmth:(local.warmth * (1 - weight)) + (ai.warmth * weight),
    tint:(local.tint * (1 - weight)) + (ai.tint * weight),
    shadows:(local.shadows * (1 - weight)) + (ai.shadows * weight),
    highlights:(local.highlights * (1 - weight)) + (ai.highlights * weight),
    clarity:(local.clarity * (1 - weight)) + (ai.clarity * weight),
    confidence:Math.max(local.confidence, ai.confidence),
    source:"ai-vision+local-guardrails",
    model:ai.model || "",
    safety:"dish-integrity-locked",
  };
}

function naturalCorrection(analysis, recipe) {
  const baseBrightness = analysis.metrics.brightness < 90 ? 1.08 : analysis.metrics.brightness > 190 ? 0.97 : 1.015;
  const baseContrast = analysis.metrics.contrast < 35 ? 1.09 : 1.035;
  return {
    brightness:clamp(baseBrightness * (2 ** recipe.exposure), 0.9, 1.16),
    contrast:clamp(baseContrast * recipe.contrast * (1 + recipe.clarity), 0.95, 1.24),
    saturation:clamp(1.025 * recipe.saturation, 0.88, 1.18),
  };
}

function safeGrade(profile) {
  const grade = profile?.grade || DEFAULT_THEME_GRADE;
  return {
    brightness:clamp(Number(grade.brightness) || 1, 0.9, 1.12),
    contrast:clamp(Number(grade.contrast) || 1, 0.9, 1.22),
    saturation:clamp(Number(grade.saturation) || 1, 0.82, 1.2),
    sepia:clamp(Number(grade.sepia) || 0, 0, 0.08),
    hue:clamp(Number(grade.hue) || 0, -6, 6),
    warmth:clamp(Number(grade.warmth) || 0, -0.08, 0.08),
    vignette:clamp(Number(grade.vignette) || 0, 0, 0.18),
  };
}

function applyToneRecovery(context, width, height, recipe) {
  if ((!recipe.shadows && !recipe.highlights) || width * height > 4_500_000) return;
  try {
    const image = context.getImageData(0, 0, width, height);
    const data = image.data;
    for (let p = 0; p < data.length; p += 4) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const luma = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);

      if (recipe.shadows > 0 && luma < 118) {
        const weight = recipe.shadows * (1 - (luma / 118));
        data[p] = clamp(r + ((255 - r) * weight * 0.13), 0, 255);
        data[p + 1] = clamp(g + ((255 - g) * weight * 0.13), 0, 255);
        data[p + 2] = clamp(b + ((255 - b) * weight * 0.13), 0, 255);
      }

      if (recipe.highlights < 0 && luma > 165) {
        const weight = (-recipe.highlights) * ((luma - 165) / 90);
        const factor = 1 - (weight * 0.16);
        data[p] = clamp(data[p] * factor, 0, 255);
        data[p + 1] = clamp(data[p + 1] * factor, 0, 255);
        data[p + 2] = clamp(data[p + 2] * factor, 0, 255);
      }
    }
    context.putImageData(image, 0, 0);
  } catch {
    // Canvas pixel access can fail for a browser-specific decode path. The safe filter grade still applies.
  }
}

function applyColorBalance(context, width, height, warmth, tint) {
  if (Math.abs(warmth) > 0.001) {
    context.save();
    context.globalCompositeOperation = "soft-light";
    context.fillStyle = warmth > 0
      ? `rgba(255, 174, 92, ${Math.abs(warmth)})`
      : `rgba(105, 168, 255, ${Math.abs(warmth)})`;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  if (Math.abs(tint) > 0.001) {
    context.save();
    context.globalCompositeOperation = "soft-light";
    context.fillStyle = tint > 0
      ? `rgba(235, 118, 210, ${Math.abs(tint)})`
      : `rgba(92, 205, 142, ${Math.abs(tint)})`;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
}

function applyFinishing(context, width, height, grade, recipe) {
  applyToneRecovery(context, width, height, recipe);
  applyColorBalance(context, width, height, grade.warmth + recipe.warmth, recipe.tint);

  if (grade.vignette > 0) {
    const radius = Math.max(width, height) * 0.72;
    const gradient = context.createRadialGradient(width / 2, height / 2, radius * 0.28, width / 2, height / 2, radius);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.68, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
}

async function renderVariant(drawable, analysis, { maxDimension, quality, mode="original", profile=null, aiRecipe=null }) {
  const { width, height } = dimensionsFor(drawable, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha:false });
  if (!context) throw new Error("Your browser could not prepare this photo.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const recipe = mode === "original" ? NEUTRAL_RECIPE : resolveProfessionalRecipe(analysis, mode === "theme" ? aiRecipe : null);

  if (mode !== "original" && "filter" in context) {
    const correction = naturalCorrection(analysis, recipe);
    if (mode === "theme") {
      const grade = safeGrade(profile);
      context.filter = `brightness(${clamp(correction.brightness * grade.brightness, 0.9, 1.16)}) contrast(${clamp(correction.contrast * grade.contrast, 0.95, 1.28)}) saturate(${clamp(correction.saturation * grade.saturation, 0.82, 1.24)}) sepia(${grade.sepia}) hue-rotate(${grade.hue}deg)`;
    } else {
      context.filter = `brightness(${correction.brightness}) contrast(${correction.contrast}) saturate(${correction.saturation})`;
    }
  }

  context.drawImage(drawable.source, 0, 0, width, height);
  context.filter = "none";

  if (mode === "theme") applyFinishing(context, width, height, safeGrade(profile), recipe);
  else if (mode === "enhanced") applyFinishing(context, width, height, { ...DEFAULT_THEME_GRADE, warmth:0, vignette:0 }, recipe);

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  let extension = "webp";
  if (!blob) {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    extension = "jpg";
  }
  if (!blob) throw new Error("Your browser could not compress this photo.");
  return { blob, extension, width, height, finishRecipe:recipe };
}

async function renderBoundedVariant(drawable, analysis, mode, profile=null, aiRecipe=null) {
  const attempts = mode === "original"
    ? [[2200, 0.88], [1800, 0.82], [1400, 0.74]]
    : [[1800, 0.84], [1500, 0.78], [1200, 0.70]];

  let result = null;
  for (const [maxDimension, quality] of attempts) {
    result = await renderVariant(drawable, analysis, { maxDimension, quality, mode, profile, aiRecipe });
    if (result.blob.size <= MAX_UPLOAD_BYTES) return result;
  }
  throw new Error("This photo is still too large after optimization. Try a smaller image.");
}

function finishMetadata(result) {
  const recipe = result?.finishRecipe || NEUTRAL_RECIPE;
  return {
    profile:BEYOND_PRO_FINISH_PROFILE,
    source:recipe.source || "local-vision",
    safety:"dish-integrity-locked",
    confidence:Number(recipe.confidence || 0),
    model:recipe.model || "",
    recipe:{
      exposure:Number(recipe.exposure || 0),
      contrast:Number(recipe.contrast || 1),
      saturation:Number(recipe.saturation || 1),
      warmth:Number(recipe.warmth || 0),
      tint:Number(recipe.tint || 0),
      shadows:Number(recipe.shadows || 0),
      highlights:Number(recipe.highlights || 0),
      clarity:Number(recipe.clarity || 0),
    },
  };
}

export async function prepareBeyondMenuPhoto(file, { themeProfile=null, aiRecipe=null } = {}) {
  const drawable = await loadDrawable(file);
  try {
    const analysis = analyzeDrawable(drawable);
    const [original, processed, theme] = await Promise.all([
      renderBoundedVariant(drawable, analysis, "original"),
      renderBoundedVariant(drawable, analysis, "enhanced"),
      themeProfile ? renderBoundedVariant(drawable, analysis, "theme", themeProfile, aiRecipe) : Promise.resolve(null),
    ]);

    return {
      original,
      processed,
      theme,
      analysis,
      finish:finishMetadata(theme || processed),
      profile:BEYOND_PHOTO_PROFILE,
      themeProfile:themeProfile?.id || "",
      processedAt:new Date().toISOString(),
    };
  } finally {
    drawable.cleanup?.();
  }
}

export async function prepareBeyondThemePhoto(file, themeProfile, { aiRecipe=null } = {}) {
  const drawable = await loadDrawable(file);
  try {
    const analysis = analyzeDrawable(drawable);
    const theme = await renderBoundedVariant(drawable, analysis, "theme", themeProfile, aiRecipe);
    return {
      theme,
      analysis,
      finish:finishMetadata(theme),
      themeProfile:themeProfile?.id || "",
      processedAt:new Date().toISOString(),
    };
  } finally {
    drawable.cleanup?.();
  }
}
