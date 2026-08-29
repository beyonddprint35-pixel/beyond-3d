import { supabase } from "../../../lib/supabaseClient";
import { prepareBeyondMenuPhoto, prepareBeyondThemePhoto } from "./menuPhotoTuning";
import { detectMenuPhotoFocus } from "./menuPhotoFocus";
import { requestMenuPhotoAiRecipe } from "./menuPhotoAiRecipe";
import {
  MENU_PHOTO_ASSET_ANALYSIS_PROFILE,
  createMenuPhotoAsset,
  findMenuPhotoAsset,
  findMenuPhotoVariant,
  getMenuPhotoAsset,
  hashMenuPhotoBlob,
  invalidateMenuPhotoVariants,
  saveMenuPhotoVariant,
  updateMenuPhotoAsset,
} from "./menuPhotoAssetCache";

export const MENU_ITEM_IMAGE_BUCKET = "menu-item-images";
export const MENU_PHOTO_AUTH_REQUIRED = "BEYOND_MENU_PHOTO_AUTH_REQUIRED";
export const MENU_PHOTO_AI_ROUTING_PROFILE = "smart-ai-routing-v1";

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

function authRequiredError() {
  const error = new Error("Sign in to Beyond before uploading item photos.");
  error.code = MENU_PHOTO_AUTH_REQUIRED;
  return error;
}

async function currentUser() {
  const { data:{ user }, error } = await supabase.auth.getUser();
  const authMissing = !user || error?.name === "AuthSessionMissingError" || /auth session missing|refresh token/i.test(String(error?.message || ""));
  if (authMissing) throw authRequiredError();
  if (error) throw error;
  return user;
}

function uploadBase({ userId, siteId, slug, itemId, imageHash="" }) {
  const menuSegment = safeSegment(siteId || slug, "menu");
  const itemSegment = safeSegment(itemId, "item");
  const hashSegment = safeSegment(String(imageHash).slice(0, 16), "photo");
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${userId}/${menuSegment}/${itemSegment}/${hashSegment}-${Date.now()}-${random}`;
}

function storedVariant(row) {
  if (!row) return null;
  return {
    url:row.image_url,
    path:row.image_path,
    width:row.width,
    height:row.height,
    bytes:null,
  };
}

function assetOriginal(asset) {
  return asset ? {
    url:asset.original_url,
    path:asset.original_path,
    width:asset.width,
    height:asset.height,
    bytes:null,
  } : null;
}

function assetProcessed(asset) {
  return asset ? {
    url:asset.processed_url || asset.original_url,
    path:asset.processed_path || asset.original_path,
    width:asset.width,
    height:asset.height,
    bytes:null,
  } : null;
}

function finishFromAsset(asset) {
  if (!asset) return null;
  return {
    profile:asset.finish_profile || "dish-safe-pro-v1",
    source:asset.finish_source || "local-vision",
    safety:asset.finish_safety || "dish-integrity-locked",
    confidence:Number.isFinite(Number(asset.finish_confidence)) ? Number(asset.finish_confidence) : 0,
    model:asset.finish_model || "",
    recipe:asset.finish_recipe || null,
  };
}

function aiRecipeFromAsset(asset) {
  const recipe = asset?.analysis?.aiRecipe;
  return recipe && typeof recipe === "object" ? recipe : null;
}

function shouldRequestAiForAnalysis(analysis) {
  const score = Number(analysis?.score);
  const notes = new Set(Array.isArray(analysis?.notes) ? analysis.notes : []);
  if (!Number.isFinite(score)) return true;
  if (score < 72) return true;
  if (["too_dark", "too_bright", "low_contrast", "soft_focus"].some(code => notes.has(code))) return true;
  if (score < 82 && ["slightly_dark", "slightly_bright", "soft_contrast", "slightly_soft"].some(code => notes.has(code))) return true;
  return false;
}

async function smartAiRecipe({ sourceUrl, analysis }) {
  const eligible = shouldRequestAiForAnalysis(analysis);
  if (!eligible) return { recipe:null, eligible:false };
  const recipe = await requestMenuPhotoAiRecipe({ sourceUrl }).catch(() => null);
  return { recipe, eligible:true };
}

function analysisDocument({ prepared, focus, aiRecipe, aiEligible, forcedAi=false }) {
  return {
    ...prepared.analysis,
    processingProfile:prepared.profile,
    focusConfidence:Number(focus?.confidence || 0),
    focusMethod:focus?.method || "",
    aiStrategy:MENU_PHOTO_AI_ROUTING_PROFILE,
    aiEligible:Boolean(aiEligible),
    aiForced:Boolean(forcedAi),
    aiRecipe:aiRecipe || null,
  };
}

function assetResult({ asset, variant=null, themeProfile=null, finish=null, cacheHit=false }) {
  const original = assetOriginal(asset);
  const processed = assetProcessed(asset);
  const theme = storedVariant(variant);
  return {
    original,
    processed,
    theme,
    focus:{ x:asset?.focus_x ?? 50, y:asset?.focus_y ?? 50, confidence:asset?.analysis?.focusConfidence ?? 0, method:asset?.analysis?.focusMethod || "cached" },
    analysis:asset?.analysis || {},
    finish:finish || finishFromAsset(asset),
    profile:asset?.analysis?.processingProfile || "natural-auto-v2",
    themeProfile:themeProfile?.id || variant?.theme_profile || "",
    processedAt:variant?.processed_at || asset?.analyzed_at || asset?.updated_at || new Date().toISOString(),
    asset,
    imageHash:asset?.image_hash || "",
    analysisProfile:asset?.analysis_profile || MENU_PHOTO_ASSET_ANALYSIS_PROFILE,
    cacheHit,
  };
}

async function sourceBlob(sourceUrl) {
  const response = await fetch(sourceUrl, { mode:"cors", cache:"no-store" });
  if (!response.ok) throw new Error("Beyond could not reopen the original photo.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("The stored item photo is not a supported image.");
  return blob;
}

async function renderAndCacheTheme({ asset, source, user, siteId, slug, itemId, themeProfile }) {
  if (!themeProfile?.id) return { variant:null, finish:finishFromAsset(asset) };
  const existing = await findMenuPhotoVariant(asset.id, themeProfile.id);
  if (existing) return { variant:existing, finish:finishFromAsset(asset), cacheHit:true };

  const blob = source instanceof Blob ? source : await sourceBlob(asset.original_url);
  const prepared = await prepareBeyondThemePhoto(blob, themeProfile, { aiRecipe:aiRecipeFromAsset(asset) });
  const base = uploadBase({ userId:user.id, siteId, slug, itemId, imageHash:asset.image_hash });
  const path = `${base}/theme-${safeSegment(prepared.themeProfile, "match")}.${prepared.theme.extension}`;
  const uploaded = await uploadVariant(path, prepared.theme);
  const variant = await saveMenuPhotoVariant({
    assetId:asset.id,
    themeProfile:prepared.themeProfile,
    imageUrl:uploaded.url,
    imagePath:uploaded.path,
    width:uploaded.width,
    height:uploaded.height,
    processedAt:prepared.processedAt,
  });
  return { variant, finish:prepared.finish, cacheHit:false };
}

export async function uploadMenuItemImage({ file, siteId, slug, itemId, themeProfile=null }) {
  const user = await currentUser();
  const [prepared, focus] = await Promise.all([
    prepareBeyondMenuPhoto(file),
    detectMenuPhotoFocus(file),
  ]);
  const imageHash = await hashMenuPhotoBlob(prepared.original.blob);
  const cached = await findMenuPhotoAsset({ siteId, imageHash });

  if (cached) {
    const themed = await renderAndCacheTheme({ asset:cached, source:file, user, siteId, slug, itemId, themeProfile });
    return assetResult({ asset:cached, variant:themed.variant, themeProfile, finish:themed.finish, cacheHit:true });
  }

  const base = uploadBase({ userId:user.id, siteId, slug, itemId, imageHash });
  const originalPath = `${base}/original.${prepared.original.extension}`;
  const processedPath = `${base}/enhanced.${prepared.processed.extension}`;
  const uploadedPaths = [];

  try {
    const original = await uploadVariant(originalPath, prepared.original);
    uploadedPaths.push(original.path);
    const processed = await uploadVariant(processedPath, prepared.processed);
    uploadedPaths.push(processed.path);

    // Cost guard: easy/high-quality photos stay local-only. Difficult photos can use one neutral AI analysis,
    // and that result is cached forever for this unique photo until the owner explicitly requests Reanalyze.
    const ai = await smartAiRecipe({ sourceUrl:original.url, analysis:prepared.analysis });
    const aiRecipe = ai.recipe;
    const themePrepared = themeProfile
      ? await prepareBeyondThemePhoto(file, themeProfile, { aiRecipe })
      : null;
    const finish = themePrepared?.finish || prepared.finish;
    const now = themePrepared?.processedAt || prepared.processedAt || new Date().toISOString();

    const asset = await createMenuPhotoAsset({
      site_id:siteId,
      owner_id:user.id,
      image_hash:imageHash,
      analysis_profile:MENU_PHOTO_ASSET_ANALYSIS_PROFILE,
      original_url:original.url,
      original_path:original.path,
      processed_url:processed.url,
      processed_path:processed.path,
      width:original.width,
      height:original.height,
      quality_score:prepared.analysis.score,
      quality_level:prepared.analysis.level,
      quality_notes:prepared.analysis.notes,
      analysis:analysisDocument({ prepared, focus, aiRecipe, aiEligible:ai.eligible }),
      focus_x:Number(focus?.x ?? 50),
      focus_y:Number(focus?.y ?? 50),
      finish_profile:finish?.profile || "dish-safe-pro-v1",
      finish_source:finish?.source || (aiRecipe ? "ai-vision+local-guardrails" : "local-vision"),
      finish_safety:finish?.safety || "dish-integrity-locked",
      finish_confidence:Number.isFinite(Number(finish?.confidence)) ? Number(finish.confidence) : null,
      finish_model:finish?.model || aiRecipe?.model || "",
      finish_recipe:finish?.recipe || null,
      analyzed_at:now,
    });

    // If another tab won the unique-hash race, reuse its canonical asset and remove duplicate uploads.
    if (asset.original_path !== original.path) {
      await supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).remove(uploadedPaths).catch(() => null);
      const themed = await renderAndCacheTheme({ asset, source:file, user, siteId, slug, itemId, themeProfile });
      return assetResult({ asset, variant:themed.variant, themeProfile, finish:themed.finish, cacheHit:true });
    }

    let variant = null;
    if (themePrepared) {
      const themePath = `${base}/theme-${safeSegment(themePrepared.themeProfile, "match")}.${themePrepared.theme.extension}`;
      const theme = await uploadVariant(themePath, themePrepared.theme);
      uploadedPaths.push(theme.path);
      variant = await saveMenuPhotoVariant({
        assetId:asset.id,
        themeProfile:themePrepared.themeProfile,
        imageUrl:theme.url,
        imagePath:theme.path,
        width:theme.width,
        height:theme.height,
        processedAt:themePrepared.processedAt,
      });
    }

    return assetResult({ asset, variant, themeProfile, finish, cacheHit:false });
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).remove(uploadedPaths).catch(() => null);
    }
    throw error;
  }
}

async function adoptLegacyPhoto({ user, sourceUrl, sourcePath="", siteId, slug, itemId, themeProfile }) {
  const blob = await sourceBlob(sourceUrl);
  const [prepared, focus] = await Promise.all([
    prepareBeyondMenuPhoto(blob),
    detectMenuPhotoFocus(blob),
  ]);
  const imageHash = await hashMenuPhotoBlob(prepared.original.blob);
  const existing = await findMenuPhotoAsset({ siteId, imageHash });
  if (existing) return { asset:existing, blob };

  const ai = await smartAiRecipe({ sourceUrl, analysis:prepared.analysis });
  const aiRecipe = ai.recipe;
  const themed = themeProfile ? await prepareBeyondThemePhoto(blob, themeProfile, { aiRecipe }) : null;
  const finish = themed?.finish || prepared.finish;
  const asset = await createMenuPhotoAsset({
    site_id:siteId,
    owner_id:user.id,
    image_hash:imageHash,
    analysis_profile:MENU_PHOTO_ASSET_ANALYSIS_PROFILE,
    original_url:sourceUrl,
    original_path:sourcePath,
    processed_url:sourceUrl,
    processed_path:sourcePath,
    width:prepared.original.width,
    height:prepared.original.height,
    quality_score:prepared.analysis.score,
    quality_level:prepared.analysis.level,
    quality_notes:prepared.analysis.notes,
    analysis:analysisDocument({ prepared, focus, aiRecipe, aiEligible:ai.eligible }),
    focus_x:Number(focus?.x ?? 50),
    focus_y:Number(focus?.y ?? 50),
    finish_profile:finish?.profile || "dish-safe-pro-v1",
    finish_source:finish?.source || (aiRecipe ? "ai-vision+local-guardrails" : "local-vision"),
    finish_safety:finish?.safety || "dish-integrity-locked",
    finish_confidence:Number.isFinite(Number(finish?.confidence)) ? Number(finish.confidence) : null,
    finish_model:finish?.model || aiRecipe?.model || "",
    finish_recipe:finish?.recipe || null,
    analyzed_at:themed?.processedAt || prepared.processedAt || new Date().toISOString(),
  });
  return { asset, blob };
}

export async function retuneMenuItemImage({ sourceUrl, sourcePath="", siteId, slug, itemId, themeProfile, photoAssetId="" }) {
  if (!sourceUrl && !photoAssetId) throw new Error("Upload an original photo before matching it to the menu theme.");
  const user = await currentUser();

  let asset = photoAssetId ? await getMenuPhotoAsset(photoAssetId) : null;
  let blob = null;
  if (!asset) {
    const adopted = await adoptLegacyPhoto({ user, sourceUrl, sourcePath, siteId, slug, itemId, themeProfile });
    asset = adopted.asset;
    blob = adopted.blob;
  }

  const themed = await renderAndCacheTheme({ asset, source:blob, user, siteId, slug, itemId, themeProfile });
  return {
    ...assetResult({ asset, variant:themed.variant, themeProfile, finish:themed.finish, cacheHit:Boolean(themed.cacheHit) }),
    theme:storedVariant(themed.variant),
  };
}

export async function reanalyzeMenuItemImage({ sourceUrl, sourcePath="", siteId, slug, itemId, themeProfile, photoAssetId="" }) {
  const user = await currentUser();
  let asset = photoAssetId ? await getMenuPhotoAsset(photoAssetId) : null;
  const canonicalUrl = asset?.original_url || sourceUrl;
  if (!canonicalUrl) throw new Error("Upload a photo before reanalyzing it.");

  const blob = await sourceBlob(canonicalUrl);
  const [prepared, focus] = await Promise.all([
    prepareBeyondMenuPhoto(blob),
    detectMenuPhotoFocus(blob),
  ]);
  const imageHash = await hashMenuPhotoBlob(prepared.original.blob);
  if (!asset) asset = await findMenuPhotoAsset({ siteId, imageHash });

  // Explicit owner action is the only path allowed to ask AI to analyze the same unique photo again.
  const aiRecipe = await requestMenuPhotoAiRecipe({ sourceUrl:canonicalUrl }).catch(() => null);
  const themePrepared = themeProfile ? await prepareBeyondThemePhoto(blob, themeProfile, { aiRecipe }) : null;
  const finish = themePrepared?.finish || prepared.finish;
  const now = themePrepared?.processedAt || prepared.processedAt || new Date().toISOString();
  const analysis = analysisDocument({ prepared, focus, aiRecipe, aiEligible:true, forcedAi:true });

  if (!asset) {
    asset = await createMenuPhotoAsset({
      site_id:siteId,
      owner_id:user.id,
      image_hash:imageHash,
      analysis_profile:MENU_PHOTO_ASSET_ANALYSIS_PROFILE,
      original_url:canonicalUrl,
      original_path:sourcePath,
      processed_url:canonicalUrl,
      processed_path:sourcePath,
      width:prepared.original.width,
      height:prepared.original.height,
      quality_score:prepared.analysis.score,
      quality_level:prepared.analysis.level,
      quality_notes:prepared.analysis.notes,
      analysis,
      focus_x:Number(focus?.x ?? 50),
      focus_y:Number(focus?.y ?? 50),
      finish_profile:finish?.profile || "dish-safe-pro-v1",
      finish_source:finish?.source || (aiRecipe ? "ai-vision+local-guardrails" : "local-vision"),
      finish_safety:finish?.safety || "dish-integrity-locked",
      finish_confidence:Number.isFinite(Number(finish?.confidence)) ? Number(finish.confidence) : null,
      finish_model:finish?.model || aiRecipe?.model || "",
      finish_recipe:finish?.recipe || null,
      analyzed_at:now,
    });
  } else {
    const stalePaths = await invalidateMenuPhotoVariants(asset.id);
    if (stalePaths.length) await supabase.storage.from(MENU_ITEM_IMAGE_BUCKET).remove(stalePaths).catch(() => null);
    asset = await updateMenuPhotoAsset(asset.id, {
      image_hash:imageHash,
      quality_score:prepared.analysis.score,
      quality_level:prepared.analysis.level,
      quality_notes:prepared.analysis.notes,
      analysis,
      focus_x:Number(focus?.x ?? asset.focus_x ?? 50),
      focus_y:Number(focus?.y ?? asset.focus_y ?? 50),
      finish_profile:finish?.profile || "dish-safe-pro-v1",
      finish_source:finish?.source || (aiRecipe ? "ai-vision+local-guardrails" : "local-vision"),
      finish_safety:finish?.safety || "dish-integrity-locked",
      finish_confidence:Number.isFinite(Number(finish?.confidence)) ? Number(finish.confidence) : null,
      finish_model:finish?.model || aiRecipe?.model || "",
      finish_recipe:finish?.recipe || null,
      analyzed_at:now,
    });
  }

  let variant = null;
  if (themePrepared) {
    const base = uploadBase({ userId:user.id, siteId, slug, itemId, imageHash });
    const path = `${base}/theme-${safeSegment(themePrepared.themeProfile, "match")}.${themePrepared.theme.extension}`;
    const uploaded = await uploadVariant(path, themePrepared.theme);
    variant = await saveMenuPhotoVariant({ assetId:asset.id, themeProfile:themePrepared.themeProfile, imageUrl:uploaded.url, imagePath:uploaded.path, width:uploaded.width, height:uploaded.height, processedAt:themePrepared.processedAt });
  }

  return assetResult({ asset, variant, themeProfile, finish, cacheHit:false });
}
