import { supabase } from "../../../lib/supabaseClient";

function base64ToFile(base64, mimeType, name) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: mimeType || "image/png" });
}

function imageSizeForUrl(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width || 1;
      const height = image.naturalHeight || image.height || 1;
      const ratio = width / height;
      if (ratio > 1.18) resolve("1536x1024");
      else if (ratio < 0.85) resolve("1024x1536");
      else resolve("1024x1024");
    };
    image.onerror = () => resolve("1536x1024");
    image.src = url;
  });
}

function resolveStorageContext(sourceUrl, sourcePath = "", projectId = "") {
  let path = String(sourcePath || "").trim();
  if (!path && sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const marker = "/storage/v1/object/public/menu-item-images/";
      const index = url.pathname.indexOf(marker);
      if (index >= 0) path = decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch {
      path = "";
    }
  }
  const parts = path.split("/").filter(Boolean);
  const explicitProject = projectId && projectId !== "draft" ? projectId : "";
  return {
    sourcePath: path,
    projectId: String(explicitProject || parts[1] || "").trim(),
  };
}

function cleanStyleContext(context) {
  if (!context || typeof context !== "object") return undefined;
  const theme = context.theme && typeof context.theme === "object"
    ? Object.fromEntries(Object.entries(context.theme).slice(0, 12).map(([key, value]) => [key, String(value || "").slice(0, 80)]))
    : undefined;
  return {
    restaurantName: String(context.restaurantName || "").slice(0, 160),
    designId: String(context.designId || "").slice(0, 120),
    theme,
  };
}

function normalizeSceneType(value) {
  return ["auto", "scene1", "scene2"].includes(value) ? value : "auto";
}

function normalizeScenes(data) {
  const raw = data?.scenes && typeof data.scenes === "object" ? data.scenes : {};
  return {
    scene1: raw.scene1?.exists ? { ...raw.scene1, type: "scene1" } : null,
    scene2: raw.scene2?.exists ? { ...raw.scene2, type: "scene2" } : null,
  };
}

async function sessionToken() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData?.session;
  if (!session?.access_token) throw new Error("Please sign in again before using Beyond AI.");
  return session.access_token;
}

async function parseFunctionError(error, fallback = "AI photo request failed.") {
  let message = error?.message || fallback;
  try {
    const response = error?.context;
    if (response && typeof response.clone === "function") {
      const raw = await response.clone().text();
      if (raw) {
        try {
          const body = JSON.parse(raw);
          message = body?.error || body?.message || message;
        } catch {
          message = raw;
        }
      }
    }
  } catch {
    // Keep the original function error.
  }
  return new Error(message);
}

async function invokePhotoAi(body, fallback) {
  const token = await sessionToken();
  const { data, error } = await supabase.functions.invoke("menu-photo-enhance", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw await parseFunctionError(error, fallback);
  if (!data?.ok) throw new Error(data?.error || fallback);
  return data;
}

export async function getRestaurantScenePresets({ projectId = "", sourcePath = "" } = {}) {
  const context = resolveStorageContext("", sourcePath, projectId);
  if (!context.projectId) return { scenes: { scene1: null, scene2: null }, placeReferenceCount: 0 };
  const data = await invokePhotoAi(
    { action: "status", projectId: context.projectId },
    "Could not read restaurant scenes.",
  );
  return {
    projectId: context.projectId,
    scenes: normalizeScenes(data),
    placeReferenceCount: Number(data.placeReferenceCount || 0),
  };
}

export async function generateRestaurantScenePreset({
  projectId = "",
  sourcePath = "",
  sceneKey = "scene1",
  sourcePaths = [],
  generationMode = "recreate",
} = {}) {
  const context = resolveStorageContext("", sourcePath || sourcePaths?.[0], projectId);
  if (!context.projectId) throw new Error("Open a saved menu before creating restaurant scenes.");
  const safeSceneKey = ["scene1", "scene2"].includes(sceneKey) ? sceneKey : "scene1";
  const safePaths = [...new Set((sourcePaths || []).map((value) => String(value || "").trim()).filter(Boolean))].slice(0, 3);
  if (!safePaths.length) throw new Error("Choose at least one My Place photo for this scene.");
  const data = await invokePhotoAi(
    {
      action: "generate_scene",
      projectId: context.projectId,
      sceneKey: safeSceneKey,
      sourcePaths: safePaths,
      generationMode: generationMode === "regenerate" ? "regenerate" : "recreate",
    },
    "Beyond could not create this restaurant scene.",
  );
  return {
    projectId: context.projectId,
    scenes: normalizeScenes(data),
    placeReferenceCount: Number(data.placeReferenceCount || 0),
  };
}

// Compatibility wrapper for older callers. Each scene must now have selected
// My Place source photos, so new UI should use generateRestaurantScenePreset.
export async function generateRestaurantScenePresets({ projectId = "", sourcePath = "", sceneTypes = [], sourcePaths = [] } = {}) {
  let latest = await getRestaurantScenePresets({ projectId, sourcePath });
  for (const sceneType of sceneTypes || []) {
    const sceneKey = sceneType === "table" || sceneType === "scene2" ? "scene2" : "scene1";
    latest = await generateRestaurantScenePreset({ projectId, sourcePath, sceneKey, sourcePaths, generationMode: "recreate" });
  }
  return latest;
}

export async function getMenuPhotoStyleMemory({ projectId = "", sourcePath = "" }) {
  const status = await getRestaurantScenePresets({ projectId, sourcePath });
  return { exists: false, path: "", projectId: status.projectId };
}

export async function rememberMenuPhotoStyle({ projectId = "", sourcePath = "" }) {
  const context = resolveStorageContext("", sourcePath, projectId);
  return { exists: false, path: "", projectId: context.projectId };
}

export async function resetMenuPhotoStyleMemory({ projectId = "", sourcePath = "" }) {
  const context = resolveStorageContext("", sourcePath, projectId);
  if (context.projectId) {
    await invokePhotoAi({ action: "reset", projectId: context.projectId }, "Could not clear legacy Style Memory.");
  }
  return { exists: false, projectId: context.projectId };
}

export async function enhanceMenuPhotoWithAi({
  sourceUrl,
  sourcePath = "",
  projectId = "",
  mode = "enhance",
  itemId = "dish",
  itemName = "",
  styleContext,
  sceneType = "auto",
  styleStrength = "balanced",
  variantIndex = 1,
}) {
  const context = resolveStorageContext(sourceUrl, sourcePath, projectId);
  if (!context.projectId || !context.sourcePath) {
    throw new Error("The original uploaded item photo could not be found. Try uploading it again.");
  }

  const size = await imageSizeForUrl(sourceUrl);
  const safeSceneType = normalizeSceneType(sceneType);
  const safeStyleStrength = styleStrength === "strong" ? "strong" : "balanced";
  const parsedVariantIndex = Number.parseInt(variantIndex, 10);
  const safeVariantIndex = Number.isFinite(parsedVariantIndex) ? Math.min(20, Math.max(1, parsedVariantIndex)) : 1;
  const data = await invokePhotoAi({
    action: "enhance",
    projectId: context.projectId,
    itemId,
    itemName: String(itemName || "").slice(0, 160),
    sourcePath: context.sourcePath,
    mode,
    size,
    sceneType: safeSceneType,
    styleStrength: safeStyleStrength,
    variantIndex: safeVariantIndex,
    styleContext: cleanStyleContext(styleContext),
  }, "AI could not enhance this photo.");

  if (!data?.imageBase64) throw new Error("AI returned no photo.");
  const usedScene = normalizeSceneType(data.sceneType || safeSceneType);
  return {
    file: base64ToFile(data.imageBase64, data.mimeType, `${itemId}-${mode}-${usedScene}-ai.png`),
    mode: data.mode || mode,
    requestedStyleStrength: data.styleStrength === "strong" ? "strong" : safeStyleStrength,
    variantIndex: Number(data.variantIndex || safeVariantIndex),
    model: data.model || "gpt-image-2",
    size: data.size || size,
    styleLocked: Boolean(data.styleLocked),
    styleMemoryExists: false,
    projectId: context.projectId,
    sceneType: usedScene,
    scenePresetUsed: Boolean(data.scenePresetUsed),
    scenePresetPath: data.scenePresetPath || "",
  };
}
