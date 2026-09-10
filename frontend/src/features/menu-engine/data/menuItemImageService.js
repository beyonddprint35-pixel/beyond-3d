import { supabase } from "../../../lib/supabaseClient";

const BUCKET = "menu-item-images";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_HEIC_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_HEIC_OUTPUT_EDGE = 2560;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const HEIC_EXTENSIONS = new Set(["heic", "heif"]);

// Keep HEIC support out of the normal application bundle. The decoder is only
// downloaded when somebody actually chooses an iPhone HEIC/HEIF photo. This
// gives Chrome/Safari a real HEVC/HEIF decoder instead of relying on the
// browser's native image codecs, which commonly reject HEIC files.
const HEIC_CONVERTER_SRC = "https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/iife/heic-to.js";
let heicConverterPromise = null;

function fileExtension(file) {
  const name = String(file?.name || "");
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function isHeicFile(file) {
  return HEIC_TYPES.has(String(file?.type || "").toLowerCase()) || HEIC_EXTENSIONS.has(fileExtension(file));
}

function isStandardImage(file) {
  return ALLOWED_TYPES.has(String(file?.type || "").toLowerCase()) || ALLOWED_EXTENSIONS.has(fileExtension(file));
}

function extensionFor(file) {
  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
}

function jpegName(file) {
  const current = String(file?.name || "photo");
  return `${current.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create a JPEG from this photo."));
    }, "image/jpeg", quality);
  });
}

async function decodeBrowserImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Some browsers can still decode through <img>, so fall through.
    }
  }

  if (typeof document === "undefined") throw new Error("Image conversion is only available in the browser.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    if (typeof image.decode === "function") await image.decode();
    else await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Could not decode this photo."));
    });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error("Could not decode this photo.");
    return { source: image, width, height, cleanup: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function loadHeicConverter() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("HEIC conversion requires a browser."));
  }
  if (typeof window.HeicTo === "function") return Promise.resolve(window.HeicTo);
  if (heicConverterPromise) return heicConverterPromise;

  heicConverterPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-beyond-heic-converter="true"]');
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (!error && typeof window.HeicTo === "function") resolve(window.HeicTo);
      else reject(error || new Error("HEIC decoder did not initialise."));
    };
    const timeout = window.setTimeout(() => finish(new Error("HEIC decoder took too long to load.")), 20000);

    if (existing) {
      if (typeof window.HeicTo === "function") return finish();
      existing.addEventListener("load", () => finish(), { once: true });
      existing.addEventListener("error", () => finish(new Error("HEIC decoder could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = HEIC_CONVERTER_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.beyondHeicConverter = "true";
    script.onload = () => finish();
    script.onerror = () => finish(new Error("HEIC decoder could not be loaded."));
    document.head.appendChild(script);
  }).catch((error) => {
    heicConverterPromise = null;
    throw error;
  });

  return heicConverterPromise;
}

async function renderDecodedToJpeg(decoded, originalFile) {
  const scale = Math.min(1, MAX_HEIC_OUTPUT_EDGE / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not prepare this photo.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(decoded.source, 0, 0, width, height);

  let blob = await canvasBlob(canvas, 0.9);
  if (blob.size > MAX_BYTES) blob = await canvasBlob(canvas, 0.8);
  if (blob.size > MAX_BYTES) blob = await canvasBlob(canvas, 0.7);
  if (blob.size > MAX_BYTES) blob = await canvasBlob(canvas, 0.58);
  if (blob.size > MAX_BYTES) throw new Error("The converted photo is still larger than 8 MB. Choose a smaller photo.");

  return new File([blob], jpegName(originalFile), {
    type: "image/jpeg",
    lastModified: Number(originalFile?.lastModified || Date.now()),
  });
}

async function normalizeConvertedHeicBlob(blob, originalFile) {
  let decoded;
  try {
    decoded = await decodeBrowserImage(blob);
    return await renderDecodedToJpeg(decoded, originalFile);
  } finally {
    decoded?.cleanup?.();
  }
}

async function convertHeicToJpeg(file) {
  // First use a native codec when the browser happens to provide one. This is
  // effectively free and avoids loading the HEIC decoder on capable devices.
  let nativeDecoded;
  try {
    nativeDecoded = await decodeBrowserImage(file);
    return await renderDecodedToJpeg(nativeDecoded, file);
  } catch {
    // Chrome and Safari commonly arrive here for real iPhone .HEIC files.
  } finally {
    nativeDecoded?.cleanup?.();
  }

  try {
    const HeicTo = await loadHeicConverter();
    let converted = await HeicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    if (Array.isArray(converted)) converted = converted[0];
    if (!(converted instanceof Blob) || !converted.size) throw new Error("HEIC decoder returned no image.");

    // heic-to performs the codec conversion; Beyond then applies its own size
    // regulation so Storage/public menus always receive an ordinary <=8 MB JPEG.
    return await normalizeConvertedHeicBlob(converted, file);
  } catch (error) {
    if (error?.message?.includes("8 MB")) throw error;
    console.warn("Beyond HEIC conversion failed.", error);
    throw new Error("Beyond could not convert this HEIC photo. Please check your connection and try the photo again.");
  }
}

export function validateMenuItemImage(file) {
  if (!file) return "Choose an image first.";
  const heic = isHeicFile(file);
  if (!heic && !isStandardImage(file)) return "Use a JPG, PNG, WEBP, HEIC or HEIF image.";
  const maxBytes = heic ? MAX_HEIC_SOURCE_BYTES : MAX_BYTES;
  if (Number(file.size || 0) > maxBytes) return heic ? "HEIC photos can be up to 25 MB." : "Images can be up to 8 MB.";
  return "";
}

export async function normalizeMenuItemImage(file) {
  const validation = validateMenuItemImage(file);
  if (validation) throw new Error(validation);
  if (!isHeicFile(file)) return file;
  return convertHeicToJpeg(file);
}

export async function uploadMenuItemImage({ file, itemId, projectId = "draft", previousPath = "" }) {
  const validation = validateMenuItemImage(file);
  if (validation) throw new Error(validation);

  // HEIC/HEIF is a capture format, not a public-menu delivery format. Beyond
  // always normalizes it to JPEG before Storage so Preview, AI and live menus
  // never need to understand HEIC themselves.
  const uploadFile = await normalizeMenuItemImage(file);
  const normalizedValidation = validateMenuItemImage(uploadFile);
  if (normalizedValidation) throw new Error(normalizedValidation);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData?.session;
  if (!session?.user?.id) throw new Error("Sign in to upload menu photos.");

  const safeItemId = String(itemId || "item").replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeProjectId = String(projectId || "draft").replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `${session.user.id}/${safeProjectId}/${safeItemId}-${Date.now()}.${extensionFor(uploadFile)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadFile, { cacheControl: "31536000", upsert: false, contentType: uploadFile.type });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = publicData?.publicUrl || "";
  if (!publicUrl) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw new Error("Could not create a public image URL.");
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(BUCKET).remove([previousPath]).catch(() => {});
  }

  return {
    image_url: publicUrl,
    image_path: path,
    image_source_format: isHeicFile(file) ? "heic" : String(file?.type || fileExtension(file) || "image"),
  };
}

export async function removeMenuItemImage(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
