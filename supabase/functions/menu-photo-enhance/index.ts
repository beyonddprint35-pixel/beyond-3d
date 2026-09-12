// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "gpt-image-2";
const BUCKET = "menu-item-images";
const MAX_PLACE_REFERENCES = 5;
const MAX_SCENE_REFERENCES = 3;
const SCENE_TYPES = ["scene1", "scene2"];
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function safeId(value, fallback = "item") {
  const next = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  return next.slice(0, 120) || fallback;
}

function imageExtension(blob) {
  const type = String(blob?.type || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function cleanStyleContext(context) {
  if (!context || typeof context !== "object") return { restaurantName: "", designId: "", theme: {} };
  const theme = {};
  if (context.theme && typeof context.theme === "object") {
    for (const [key, value] of Object.entries(context.theme).slice(0, 8)) {
      const safeKey = clean(key, 40).replace(/[^a-zA-Z0-9_-]/g, "");
      const safeValue = clean(value, 120).replace(/[^a-zA-Z0-9#(),.%\s_-]/g, "");
      if (safeKey && safeValue) theme[safeKey] = safeValue;
    }
  }
  return {
    restaurantName: clean(context.restaurantName, 120).replace(/[\r\n]/g, " "),
    designId: clean(context.designId, 100).replace(/[\r\n]/g, " "),
    theme,
  };
}

function styleContextText(styleContext, styleStrength = "balanced") {
  const themeEntries = Object.entries(styleContext?.theme || {});
  if (!themeEntries.length) return "";

  const photoEntries = themeEntries.filter(([key]) => key.startsWith("photo_"));
  const designEntries = themeEntries.filter(([key]) => !key.startsWith("photo_"));
  const photoText = photoEntries.map(([key, value]) => `${key}: ${value}`).join(", ");
  const designText = designEntries.map(([key, value]) => `${key}: ${value}`).join(", ");
  const strengthRule = styleStrength === "strong"
    ? "Apply these photographic directions clearly and visibly. The chosen lighting, color grade and depth should be immediately distinguishable, while the real served item and restaurant geometry remain truthful."
    : "Apply these photographic directions naturally and with restraint, keeping the result realistic and faithful to the served item and restaurant.";
  const photoContext = photoText
    ? `\n\nPHOTO STYLE REQUEST\n${photoText}. ${strengthRule} Never change the identity, ingredients, portion, container or recognizable geometry of the served item merely to achieve the style.`
    : "";
  const designContext = designText
    ? `\n\nMENU DESIGN CONTEXT\nThe active menu uses these visual theme tokens: ${designText}. Use them only as subtle palette and mood hints. Never render text, logos, UI elements or literal theme tokens into the photo.`
    : "";
  return `${photoContext}${designContext}`;
}

function itemPrompt({ mode, sceneType, scenePresetUsed, placeReferenceCount, styleContext, styleStrength, variantIndex }) {
  const identityLock = `Edit the FIRST attached image into a polished professional digital-menu photograph.\n\nABSOLUTE ITEM LOCK — HIGHEST PRIORITY\n- The FIRST image is the ONLY source of truth for the served item.\n- Preserve its semantic identity exactly. A beer must remain that same beer; a cocktail must remain that same cocktail; food must remain the same food.\n- Never replace a drink with food, food with a drink, or one dish/drink with another.\n- Preserve the visible glass, cup, plate or container, liquid color, fill level, foam/head, ice, garnish, ingredients, toppings, sauces, sides, portion size, number of pieces and recognizable geometry from the FIRST image.\n- Minor repositioning, crop and perspective cleanup are allowed only when needed to place the exact item naturally in the restaurant scene.\n- Do not import food, drinks, plates, glasses, utensils, text, logos, signs, hands or people from any reference image.\n- Keep realistic texture and believable imperfections. The result must remain an honest representation of the exact item in the FIRST image.`;

  const sceneInstruction = scenePresetUsed
    ? `\n\nSELECTED RESTAURANT SCENE — STRONG ENVIRONMENT ANCHOR\nThe SECOND attached image is the reusable ${sceneType === "scene2" ? "Scene 2" : "Scene 1"} preset created from this restaurant's selected My Place photo(s). Preserve this scene very closely. Match its foreground surface, camera position, background composition, furniture, shelves, wall features, visible décor, lights, reflections, color palette, depth of field and ambience.\nDo NOT simplify, erase, replace or redesign recognizable background elements from the scene. The goal is for menu items using this preset to look as though they were photographed in the same physical setup. Place only the exact item from the FIRST image naturally into the available foreground space.`
    : placeReferenceCount > 0
      ? `\n\nMY PLACE — VENUE STYLE FALLBACK\nAdditional attached images are real venue photos. Use them only to guide lighting, color temperature, material character, ambience and background palette. Preserve the target item from the FIRST image and keep the scene believable.`
      : `\n\nRESTAURANT STYLE FALLBACK\nUse a refined realistic premium restaurant-menu photography look with intentional lighting, natural contrast, clean composition and subtle depth of field. Do not invent or replace the served item.`;

  const designContext = styleContextText(styleContext, styleStrength);
  const variationInstruction = Number(variantIndex || 1) > 1
    ? `\n\nVARIATION ${variantIndex}\nCreate a genuinely new photographic take of the same locked item and same restaurant setup. Vary small photographic choices such as crop, highlight balance, shadow rolloff or depth treatment without changing the item's identity or redesigning the restaurant.`
    : "";

  if (mode === "background") {
    return `${identityLock}${sceneInstruction}${designContext}${variationInstruction}\n\nTASK — CLEAN BACKGROUND\nKeep the served item and its container unchanged. Remove only distracting clutter immediately around the item and correct lighting naturally. Do not redesign the restaurant environment.`;
  }

  if (mode === "match") {
    return `${identityLock}${sceneInstruction}${designContext}${variationInstruction}\n\nTASK — MATCH RESTAURANT SCENE\nIntegrate the exact real item into the selected restaurant scene so it looks as if it was photographed there. Preserve the scene's geometry and recognizable elements. The selected Photo Style may deliberately tune lighting, color grading and depth while keeping the same real restaurant setup. Preserve the scene itself rather than inventing a similar replacement.\n\nFINAL SELF-CHECK\nThe output must contain the same item from the FIRST image and the same recognizable restaurant scene family from the SECOND image. If either identity would be lost, reduce the transformation.`;
  }

  return `${identityLock}${sceneInstruction}${designContext}${variationInstruction}\n\nTASK — ENHANCE PHOTO\nEnhance the existing photograph only: correct exposure and white balance, improve natural contrast, clarity and sharpness, reduce distracting noise and minor clutter, and make the image look professionally photographed. Respect the selected Photo Style while preserving the real item and believable scene.`;
}

function scenePrompt(generationMode, referenceCount) {
  const primaryRule = `The FIRST attached My Place photo is the PRIMARY scene reference and must remain clearly recognizable in the result. Preserve its real background composition and identity: walls, bar or table surfaces, shelves, furniture, lighting fixtures, décor, windows, architectural features, reflections, material textures, background objects and their approximate positions. Do NOT strip the place down into a generic empty restaurant. Do NOT remove distinctive background items merely to make the scene cleaner.`;
  const supportRule = referenceCount > 1
    ? `\nThe remaining ${referenceCount - 1} reference photo${referenceCount - 1 === 1 ? " is" : "s are"} SUPPORTING references only. Use them to confirm the same venue's lighting, colors, materials and mood. Never let them overwrite the primary photo's composition.`
    : "";
  const foregroundRule = `\nCreate a reusable menu-photography scene by clearing only the minimum foreground space needed to place a future dish or drink. If the primary reference contains a served food/drink, plate, glass, cup, hand or person exactly where a future menu item must go, remove only that foreground subject and realistically reconstruct the surface behind it. Everything else in the restaurant should remain as faithful as possible. Do not add readable text, new logos, new brands or invented decorative objects.`;

  if (generationMode === "regenerate") {
    return `Create another professional variation of a reusable restaurant scene from the selected real My Place photo(s).\n\n${primaryRule}${supportRule}${foregroundRule}\n\nREGENERATE MODE\nKeep the same recognizable physical place and key background elements, but allow a modest photographic variation: slightly adjusted crop, depth of field, exposure balance or lens feel. This is a new take of the SAME real setup, not a redesigned scene. Preserve background identity over cleanliness. Produce a realistic landscape photograph.`;
  }

  return `Recreate a reusable restaurant scene from the selected real My Place photo(s) with very high fidelity.\n\n${primaryRule}${supportRule}${foregroundRule}\n\nRECREATE MODE — MAXIMUM FIDELITY\nStay as close as possible to the PRIMARY reference's camera angle, perspective, geometry, lighting placement, background objects and material details. Think of this as a faithful reconstruction of the same photographed place with only the foreground served item removed when necessary. Do not beautify by deleting real background content. Do not turn it into a generic studio set. Produce a realistic landscape photograph.`;
}

async function listPlaceReferencePaths(adminClient, placeFolder, projectFolder) {
  const candidates = [];
  const sources = [
    { folder: placeFolder, prefix: "place-" },
    { folder: projectFolder, prefix: "place-style-" },
  ];
  for (const source of sources) {
    const { data: entries, error } = await adminClient.storage.from(BUCKET).list(source.folder, {
      limit: 30,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error || !Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry?.name?.startsWith(source.prefix) || !entry?.metadata) continue;
      candidates.push({ path: `${source.folder}/${entry.name}`, createdAt: entry.created_at || entry.updated_at || "" });
    }
  }
  const seen = new Set();
  return candidates
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .filter((entry) => {
      if (!entry.path || seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    })
    .slice(0, MAX_PLACE_REFERENCES)
    .map((entry) => entry.path);
}

async function loadReferences(adminClient, paths) {
  const references = [];
  for (const path of paths) {
    const { data: blob, error } = await adminClient.storage.from(BUCKET).download(path);
    if (error || !blob || !blob.size || blob.size > 12 * 1024 * 1024) continue;
    if (blob.type && !blob.type.startsWith("image/")) continue;
    references.push({ blob, path });
  }
  return references;
}

async function loadPlaceReferences(adminClient, placeFolder, projectFolder) {
  return loadReferences(adminClient, await listPlaceReferencePaths(adminClient, placeFolder, projectFolder));
}

async function sceneStatus(adminClient, sceneFolder) {
  const { data: entries, error } = await adminClient.storage.from(BUCKET).list(sceneFolder, { limit: 10 });
  const names = !error && Array.isArray(entries) ? new Set(entries.filter((entry) => entry?.metadata).map((entry) => entry.name)) : new Set();
  const scenes = {};
  for (const type of SCENE_TYPES) {
    const filename = `${type}.png`;
    const path = `${sceneFolder}/${filename}`;
    const { data: publicData } = adminClient.storage.from(BUCKET).getPublicUrl(path);
    scenes[type] = {
      exists: names.has(filename),
      path,
      url: names.has(filename) ? (publicData?.publicUrl || "") : "",
    };
  }
  return scenes;
}

async function generateScene(adminClient, openAiKey, references, sceneFolder, sceneKey, generationMode) {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", scenePrompt(generationMode, references.length));
  form.append("size", "1536x1024");
  form.append("quality", "medium");
  references.forEach((reference, index) => {
    form.append("image[]", reference.blob, `${index === 0 ? "primary" : "support"}-venue-reference-${index + 1}.${imageExtension(reference.blob)}`);
  });

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Could not create ${sceneKey}.`);
  const imageBase64 = data?.data?.[0]?.b64_json;
  if (!imageBase64) throw new Error(`AI returned no image for ${sceneKey}.`);

  const path = `${sceneFolder}/${sceneKey}.png`;
  const blob = new Blob([decodeBase64(imageBase64)], { type: "image/png" });
  const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/png",
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) throw new Error(`Could not save ${sceneKey}.`);
}

async function loadScenePreset(adminClient, scenes, requestedSceneType) {
  let sceneType = requestedSceneType;
  if (!SCENE_TYPES.includes(sceneType)) {
    sceneType = scenes.scene1?.exists ? "scene1" : scenes.scene2?.exists ? "scene2" : "auto";
  }
  const scene = scenes[sceneType];
  if (!scene?.exists) return { sceneType: "auto", scene: null };
  const { data: blob, error } = await adminClient.storage.from(BUCKET).download(scene.path);
  if (error || !blob || !blob.size || blob.size > 12 * 1024 * 1024) return { sceneType: "auto", scene: null };
  return { sceneType, scene: { ...scene, blob } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "AI photo configuration is incomplete." }, 500);
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in to use Beyond AI." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Your BEYOND session could not be verified." }, 401);
  if (!user.email_confirmed_at) return json({ error: "Verify your email before using Beyond AI." }, 403);

  try {
    const body = await req.json();
    const action = ["enhance", "status", "generate_scene", "remember", "reset"].includes(body?.action) ? body.action : "enhance";
    const projectId = clean(body?.projectId, 100);
    if (!projectId) return json({ error: "This menu is missing required information." }, 400);

    const { data: project, error: projectError } = await adminClient
      .from("menu_projects")
      .select("id,owner_user_id,archived_at")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError || !project || project.archived_at || project.owner_user_id !== user.id) {
      return json({ error: "This menu project is not available to your account." }, 403);
    }

    const safeProject = safeId(projectId, "project");
    const projectFolder = `${user.id}/${safeProject}`;
    const requiredPrefix = `${projectFolder}/`;
    const placeFolder = `${projectFolder}/my-place`;
    const sceneFolder = `${projectFolder}/scene-presets`;
    const legacyStyleMemoryPath = `${requiredPrefix}beyond-style-memory.png`;

    if (action === "status") {
      const [placeReferencePaths, scenes] = await Promise.all([
        listPlaceReferencePaths(adminClient, placeFolder, projectFolder),
        sceneStatus(adminClient, sceneFolder),
      ]);
      return json({
        ok: true,
        styleMemoryExists: false,
        placeReferenceCount: placeReferencePaths.length,
        scenes,
        contentSafeMatching: true,
      });
    }

    if (action === "reset") {
      await adminClient.storage.from(BUCKET).remove([legacyStyleMemoryPath]);
      return json({ ok: true, styleMemoryExists: false });
    }

    if (action === "remember") {
      return json({ ok: true, styleMemoryExists: false, contentSafeMatching: true });
    }

    if (!openAiKey) return json({ error: "AI photo configuration is incomplete." }, 500);

    if (action === "generate_scene") {
      const sceneKey = SCENE_TYPES.includes(body?.sceneKey) ? body.sceneKey : "scene1";
      const generationMode = body?.generationMode === "regenerate" ? "regenerate" : "recreate";
      const allPlacePaths = await listPlaceReferencePaths(adminClient, placeFolder, projectFolder);
      const allowed = new Set(allPlacePaths);
      const sourcePaths = [...new Set((Array.isArray(body?.sourcePaths) ? body.sourcePaths : [])
        .map((value) => clean(value, 700))
        .filter((value) => allowed.has(value)))]
        .slice(0, MAX_SCENE_REFERENCES);
      if (!sourcePaths.length) return json({ error: "Choose at least one My Place photo for this scene." }, 422);
      const references = await loadReferences(adminClient, sourcePaths);
      if (!references.length) return json({ error: "The selected My Place photos could not be loaded." }, 422);
      await generateScene(adminClient, openAiKey, references, sceneFolder, sceneKey, generationMode);
      return json({
        ok: true,
        scenes: await sceneStatus(adminClient, sceneFolder),
        placeReferenceCount: allPlacePaths.length,
        sceneKey,
        generationMode,
      });
    }

    const itemId = clean(body?.itemId, 140);
    const sourcePath = clean(body?.sourcePath, 700);
    const mode = ["enhance", "background", "match"].includes(body?.mode) ? body.mode : "enhance";
    const size = ["1024x1024", "1536x1024", "1024x1536"].includes(body?.size) ? body.size : "1536x1024";
    const requestedSceneType = ["auto", "scene1", "scene2"].includes(body?.sceneType) ? body.sceneType : "auto";
    const styleStrength = body?.styleStrength === "strong" ? "strong" : "balanced";
    const requestedVariantIndex = Number.parseInt(body?.variantIndex, 10);
    const variantIndex = Number.isFinite(requestedVariantIndex) ? Math.min(20, Math.max(1, requestedVariantIndex)) : 1;
    const styleContext = cleanStyleContext(body?.styleContext);

    if (!itemId || !sourcePath) return json({ error: "This photo is missing required information." }, 400);
    if (!sourcePath.startsWith(requiredPrefix)) return json({ error: "This photo does not belong to this menu." }, 403);

    const { data: sourceBlob, error: downloadError } = await adminClient.storage.from(BUCKET).download(sourcePath);
    if (downloadError || !sourceBlob) return json({ error: "Could not load the original photo." }, 422);
    if (sourceBlob.size > 12 * 1024 * 1024) return json({ error: "This photo is too large for AI enhancement." }, 400);

    const scenes = await sceneStatus(adminClient, sceneFolder);
    const { sceneType, scene } = mode === "match"
      ? await loadScenePreset(adminClient, scenes, requestedSceneType)
      : { sceneType: "auto", scene: null };
    const placeReferences = scene ? [] : await loadPlaceReferences(adminClient, placeFolder, projectFolder);

    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", itemPrompt({
      mode,
      sceneType,
      scenePresetUsed: Boolean(scene),
      placeReferenceCount: placeReferences.length,
      styleContext,
      styleStrength,
      variantIndex,
    }));
    form.append("size", size);
    form.append("quality", "medium");

    const sourceName = `target.${imageExtension(sourceBlob)}`;
    const inputs = [{ blob: sourceBlob, name: sourceName }];
    if (scene) {
      inputs.push({ blob: scene.blob, name: `restaurant-${sceneType}.${imageExtension(scene.blob)}` });
    } else {
      placeReferences.slice(0, 3).forEach((reference, index) => {
        inputs.push({ blob: reference.blob, name: `venue-style-${index + 1}.${imageExtension(reference.blob)}` });
      });
    }

    if (inputs.length > 1) inputs.forEach((input) => form.append("image[]", input.blob, input.name));
    else form.append("image", sourceBlob, sourceName);

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: form,
    });
    const data = await response.json();
    if (!response.ok) {
      return json({ error: data?.error?.message || "AI could not enhance this photo." }, response.status >= 500 ? 500 : 422);
    }
    const imageBase64 = data?.data?.[0]?.b64_json;
    if (!imageBase64) return json({ error: "AI returned no photo." }, 500);

    return json({
      ok: true,
      imageBase64,
      mimeType: "image/png",
      mode,
      model: MODEL,
      size,
      styleStrength,
      variantIndex,
      styleLocked: Boolean(scene || placeReferences.length),
      styleMemoryExists: false,
      sceneType,
      scenePresetUsed: Boolean(scene),
      scenePresetPath: scene?.path || "",
      placeStyleUsed: placeReferences.length > 0,
      placeReferenceCount: placeReferences.length,
      contentSafeMatching: true,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not complete this AI photo request." }, 500);
  }
});
