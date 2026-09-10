import { supabase } from "../../../lib/supabaseClient";

const BUCKET = "menu-item-images";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_HEIC_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_HEIC_OUTPUT_EDGE = 2560;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const HEIC_EXTENSIONS = new Set(["heic", "heif"]);

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
      else reject(new Error("Could not convert this HEIC photo."));
    }, "image/jpeg", quality);
  });
}

async function decodeBrowserImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Safari/WebKit can decode some local HEIC files through <img> even when
      // createImageBitmap does not expose the codec, so fall through.
    }
  }

  if (typeof document === "undefined") throw new Error("HEIC conversion is only available in the browser.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    if (typeof image.decode === "function") await image.decode();
    else await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Could not decode this HEIC photo."));
    });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error("Could not decode this HEIC photo.");
    return { source: image, width, height, cleanup: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function convertHeicToJpeg(file) {
  let decoded;
  try {
    decoded = await decodeBrowserImage(file);
    const scale = Math.min(1, MAX_HEIC_OUTPUT_EDGE / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Could not prepare this HEIC photo.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);

    let blob = await canvasBlob(canvas, 0.9);
    if (blob.size > MAX_BYTES) blob = await canvasBlob(canvas, 0.8);
    if (blob.size > MAX_BYTES) blob = await canvasBlob(canvas, 0.7);
    if (blob.size > MAX_BYTES) throw new Error("The converted photo is still larger than 8 MB. Choose a smaller photo.");

    return new File([blob], jpegName(file), {
      type: "image/jpeg",
      lastModified: Number(file?.lastModified || Date.now()),
    });
  } catch (error) {
    throw new Error(
      error?.message?.includes("8 MB")
        ? error.message
        : "Beyond could not convert this HEIC photo on this device. Try selecting it directly from the iPhone Photos library or save it as JPEG.",
    );
  } finally {
    decoded?.cleanup?.();
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

  // HEIC/HEIF is a great capture format on iPhone but not a safe public-menu
  // delivery format. Convert it locally before it ever reaches Storage, so the
  // rest of Beyond (preview, public menu and AI tools) receives a normal JPEG.
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
