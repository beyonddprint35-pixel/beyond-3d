import { supabase } from "../../../lib/supabaseClient";

export const MENU_ITEM_IMAGE_BUCKET = "menu-item-images";
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4.75 * 1024 * 1024;
const MAX_DIMENSION = 1800;
const DEFAULT_QUALITY = 0.84;

function safeSegment(value, fallback = "menu") {
  const safe = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return safe || fallback;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadDrawable(file) {
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
      // Safari and a few image formats still need the HTMLImageElement fallback.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("This image format could not be opened. Try JPEG, PNG or WebP."));
    image.src = objectUrl;
  });
  return {
    source:image,
    width:image.naturalWidth,
    height:image.naturalHeight,
    cleanup:() => URL.revokeObjectURL(objectUrl),
  };
}

async function renderImage(file, maxDimension = MAX_DIMENSION, quality = DEFAULT_QUALITY) {
  const drawable = await loadDrawable(file);
  try {
    const longest = Math.max(drawable.width, drawable.height) || 1;
    const scale = Math.min(1, maxDimension / longest);
    const width = Math.max(1, Math.round(drawable.width * scale));
    const height = Math.max(1, Math.round(drawable.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha:false });
    if (!context) throw new Error("Your browser could not prepare this photo.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(drawable.source, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", quality);
    let extension = "webp";
    if (!blob) {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      extension = "jpg";
    }
    if (!blob) throw new Error("Your browser could not compress this photo.");
    return { blob, extension, width, height };
  } finally {
    drawable.cleanup?.();
  }
}

export async function prepareMenuItemImage(file) {
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("The original photo is too large. Choose an image under 20 MB.");
  }

  let prepared = await renderImage(file);
  if (prepared.blob.size > MAX_UPLOAD_BYTES) prepared = await renderImage(file, 1400, 0.76);
  if (prepared.blob.size > MAX_UPLOAD_BYTES) prepared = await renderImage(file, 1100, 0.68);
  if (prepared.blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("This photo is still too large after optimization. Try a smaller image.");
  }
  return prepared;
}

export async function uploadMenuItemImage({ file, siteId, slug, itemId }) {
  const { data:{ user }, error:userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to Beyond before uploading item photos.");

  const prepared = await prepareMenuItemImage(file);
  const menuSegment = safeSegment(siteId || slug, "menu");
  const itemSegment = safeSegment(itemId, "item");
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  const path = `${user.id}/${menuSegment}/${itemSegment}/${Date.now()}-${random}.${prepared.extension}`;

  const { error:uploadError } = await supabase.storage
    .from(MENU_ITEM_IMAGE_BUCKET)
    .upload(path, prepared.blob, {
      contentType:prepared.blob.type,
      cacheControl:"31536000",
      upsert:false,
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("The photo uploaded, but Beyond could not create its public URL.");

  return {
    url:data.publicUrl,
    path,
    width:prepared.width,
    height:prepared.height,
    bytes:prepared.blob.size,
  };
}
