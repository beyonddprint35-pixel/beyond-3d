import { supabase } from "../../../lib/supabaseClient";
import { prepareBeyondMenuPhoto, prepareBeyondThemePhoto } from "./menuPhotoTuning";

export const MENU_ITEM_IMAGE_BUCKET = "menu-item-images";

function safeSegment(value, fallback = "menu") {
  const safe = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return safe || fallback;
}

function publicUrlFor(path) {
  const { data } = supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("The photo uploaded, but Beyond could not create its public URL.");
  return data.publicUrl;
}

async function uploadVariant(path, prepared) {
  const { error } = await supabase.storage
    .from(MENU_ITEM_IMAGE_BUCKET)
    .upload(path, prepared.blob, {
      contentType:prepared.blob.type,
      cacheControl:"31536000",
      upsert:false,
    });
  if (error) throw error;
  return {
    url:publicUrlFor(path),
    path,
    width:prepared.width,
    height:prepared.height,
    bytes:prepared.blob.size,
  };
}

async function currentUser() {
  const { data:{ user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Sign in to Beyond before uploading item photos.");
  return user;
}

function uploadBase({ userId, siteId, slug, itemId }) {
  const menuSegment = safeSegment(siteId || slug, "menu");
  const itemSegment = safeSegment(itemId, "item");
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${userId}/${menuSegment}/${itemSegment}/${Date.now()}-${random}`;
}

export async function uploadMenuItemImage({ file, siteId, slug, itemId, themeProfile=null }) {
  const user = await currentUser();
  const prepared = await prepareBeyondMenuPhoto(file, { themeProfile });
  const base = uploadBase({ userId:user.id, siteId, slug, itemId });
  const originalPath = `${base}/original.${prepared.original.extension}`;
  const processedPath = `${base}/enhanced.${prepared.processed.extension}`;
  const themePath = prepared.theme ? `${base}/theme-${safeSegment(prepared.themeProfile, "match")}.${prepared.theme.extension}` : "";

  const uploadedPaths = [];
  try {
    const original = await uploadVariant(originalPath, prepared.original);
    uploadedPaths.push(original.path);
    const processed = await uploadVariant(processedPath, prepared.processed);
    uploadedPaths.push(processed.path);
    const theme = prepared.theme ? await uploadVariant(themePath, prepared.theme) : null;
    if (theme?.path) uploadedPaths.push(theme.path);

    return {
      original,
      processed,
      theme,
      analysis:prepared.analysis,
      profile:prepared.profile,
      themeProfile:prepared.themeProfile,
      processedAt:prepared.processedAt,
    };
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).remove(uploadedPaths).catch(() => null);
    }
    throw error;
  }
}

export async function retuneMenuItemImage({ sourceUrl, siteId, slug, itemId, themeProfile, previousThemePath="" }) {
  if (!sourceUrl) throw new Error("Upload an original photo before matching it to the menu theme.");
  const user = await currentUser();

  const response = await fetch(sourceUrl, { mode:"cors", cache:"no-store" });
  if (!response.ok) throw new Error("Beyond could not reopen the original photo for theme matching.");
  const sourceBlob = await response.blob();
  if (!sourceBlob.type.startsWith("image/")) throw new Error("The stored item photo is not a supported image.");

  const prepared = await prepareBeyondThemePhoto(sourceBlob, themeProfile);
  const base = uploadBase({ userId:user.id, siteId, slug, itemId });
  const themePath = `${base}/theme-${safeSegment(prepared.themeProfile, "match")}.${prepared.theme.extension}`;
  const theme = await uploadVariant(themePath, prepared.theme);

  if (previousThemePath && previousThemePath !== theme.path) {
    await supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).remove([previousThemePath]).catch(() => null);
  }

  return {
    theme,
    themeProfile:prepared.themeProfile,
    processedAt:prepared.processedAt,
  };
}
