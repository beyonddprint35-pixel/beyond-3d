import { supabase } from "../../../lib/supabaseClient";

export const MENU_PHOTO_ASSET_ANALYSIS_PROFILE = "dish-safe-asset-v1";

function normalizeAsset(row) {
  if (!row) return null;
  return {
    ...row,
    quality_notes:Array.isArray(row.quality_notes) ? row.quality_notes : [],
    analysis:row.analysis && typeof row.analysis === "object" ? row.analysis : {},
    finish_recipe:row.finish_recipe && typeof row.finish_recipe === "object" ? row.finish_recipe : null,
    focus_x:Number.isFinite(Number(row.focus_x)) ? Number(row.focus_x) : 50,
    focus_y:Number.isFinite(Number(row.focus_y)) ? Number(row.focus_y) : 50,
    finish_confidence:Number.isFinite(Number(row.finish_confidence)) ? Number(row.finish_confidence) : null,
  };
}

export async function hashMenuPhotoBlob(blob) {
  if (!(blob instanceof Blob)) throw new Error("Beyond could not fingerprint this photo.");
  if (!globalThis.crypto?.subtle) throw new Error("This browser cannot securely fingerprint photos.");
  const buffer = await blob.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

export async function findMenuPhotoAsset({ siteId, imageHash, analysisProfile=MENU_PHOTO_ASSET_ANALYSIS_PROFILE }) {
  if (!siteId || !imageHash) return null;
  const { data, error } = await supabase
    .from("menu_photo_assets")
    .select("*")
    .eq("site_id", siteId)
    .eq("image_hash", imageHash)
    .eq("analysis_profile", analysisProfile)
    .maybeSingle();
  if (error) throw error;
  return normalizeAsset(data);
}

export async function getMenuPhotoAsset(assetId) {
  if (!assetId) return null;
  const { data, error } = await supabase
    .from("menu_photo_assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();
  if (error) throw error;
  return normalizeAsset(data);
}

export async function createMenuPhotoAsset(payload) {
  const row = {
    ...payload,
    analysis_profile:payload.analysis_profile || MENU_PHOTO_ASSET_ANALYSIS_PROFILE,
    updated_at:new Date().toISOString(),
  };
  const { data, error } = await supabase.from("menu_photo_assets").insert(row).select("*").single();
  if (!error) return normalizeAsset(data);
  if (error.code === "23505") {
    const existing = await findMenuPhotoAsset({
      siteId:row.site_id,
      imageHash:row.image_hash,
      analysisProfile:row.analysis_profile,
    });
    if (existing) return existing;
  }
  throw error;
}

export async function updateMenuPhotoAsset(assetId, patch) {
  if (!assetId) return null;
  const { data, error } = await supabase
    .from("menu_photo_assets")
    .update({ ...patch, updated_at:new Date().toISOString() })
    .eq("id", assetId)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeAsset(data);
}

export async function findMenuPhotoVariant(assetId, themeProfile) {
  if (!assetId || !themeProfile) return null;
  const { data, error } = await supabase
    .from("menu_photo_asset_variants")
    .select("*")
    .eq("asset_id", assetId)
    .eq("theme_profile", themeProfile)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function saveMenuPhotoVariant({ assetId, themeProfile, imageUrl, imagePath, width, height, processedAt }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("menu_photo_asset_variants")
    .upsert({
      asset_id:assetId,
      theme_profile:themeProfile,
      image_url:imageUrl,
      image_path:imagePath,
      width:Number.isFinite(Number(width)) ? Number(width) : null,
      height:Number.isFinite(Number(height)) ? Number(height) : null,
      processed_at:processedAt || now,
      updated_at:now,
    }, { onConflict:"asset_id,theme_profile" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function invalidateMenuPhotoVariants(assetId) {
  if (!assetId) return [];
  const { error } = await supabase
    .from("menu_photo_asset_variants")
    .delete()
    .eq("asset_id", assetId);
  if (error) throw error;

  // Do not remove old storage objects here. A published menu or another item may still reference
  // the previous immutable URL. Fresh variants will get new paths and old files can be garbage-collected later.
  return [];
}
