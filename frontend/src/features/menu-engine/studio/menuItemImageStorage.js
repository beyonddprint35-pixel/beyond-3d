import { supabase } from "../../../lib/supabaseClient";
import { prepareBeyondMenuPhoto } from "./menuPhotoTuning";

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

export async function uploadMenuItemImage({ file, siteId, slug, itemId }) {
  const { data:{ user }, error:userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to Beyond before uploading item photos.");

  const prepared = await prepareBeyondMenuPhoto(file);
  const menuSegment = safeSegment(siteId || slug, "menu");
  const itemSegment = safeSegment(itemId, "item");
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  const base = `${user.id}/${menuSegment}/${itemSegment}/${Date.now()}-${random}`;
  const originalPath = `${base}/original.${prepared.original.extension}`;
  const processedPath = `${base}/enhanced.${prepared.processed.extension}`;

  let original = null;
  try {
    original = await uploadVariant(originalPath, prepared.original);
    const processed = await uploadVariant(processedPath, prepared.processed);
    return {
      original,
      processed,
      analysis:prepared.analysis,
      profile:prepared.profile,
      processedAt:prepared.processedAt,
    };
  } catch (error) {
    if (original?.path) {
      await supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).remove([original.path]).catch(() => null);
    }
    throw error;
  }
}
