// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "gpt-image-2";
const BUCKET = "menu-item-images";
const MAX_PLACE_REFERENCES = 3;
const SCENE_TYPES = ["bar", "table"];
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
      const safeValue = clean(value, 40).replace(/[^a-zA-Z0-9#(),.%\s_-]/g, "");
      if (safeKey && safeValue) theme[safeKey] = safeValue;
    }
  }
  return {
    restaurantName: clean(context.restaurantName, 120).replace(/[\r\n]/g, " "),
    designId: clean(context.designId, 100).replace(/[\r\n]/g, " "),
    theme,
  };
}

function styleContextText(styleContext) {
  const themeEntries = Object.entries(styleContext?.theme || {});
  if (!themeEntries.length) return "";
  const themeText = themeEntries.map(([key, value]) => `${key}: ${value}`).join(", ");
  return `\n\nMENU DESIGN CONTEXT\nThe active menu uses these visual theme tokens: ${themeText}. Use them only as subtle palette and mood hints. Never render text, logos, UI elements or literal theme tokens into the photo.`;
}

function itemPrompt({ mode, sceneType, scenePresetUsed, placeReferenceCount, styleContext }) {
  const identityLock = `Edit the FIRST attached image into a polished professional digital-menu photograph.\n\nABSOLUTE ITEM LOCK — HIGHEST PRIORITY\n- The FIRST image is the ONLY source of truth for the served item.\n- Preserve its semantic identity exactly. A beer must remain that same beer; a cocktail must remain that same cocktail; food must remain the same food.\n- Never replace a drink with food, food with a drink, or one dish/drink with another.\n- Preserve the visible glass, cup, plate or container, liquid color, fill level, foam/head, ice, garnish, ingredients, toppings, sauces, sides, portion size, number of pieces and recognizable geometry from the FIRST image.\n- Minor repositioning, crop and perspective cleanup are allowed only when needed to place the exact item naturally in the restaurant scene.\n- Do not import food, drinks, plates, glasses, utensils, props, text, logos, signs, hands or people from any reference image.\n- Keep realistic texture and believable imperfections. The result must remain an honest representation of the exact item in the FIRST image.`;

  const sceneInstruction = scenePresetUsed
    ? `\n\nSELECTED RESTAURANT SCENE — STRONG ENVIRONMENT ANCHOR\nThe SECOND attached image is the reusable ${sceneType} scene preset created from this restaurant's own My Place photos. Reconstruct a closely matching environment: use its foreground surface type, camera height, background composition, lighting direction, warmth, color palette, depth of field and ambience. Treat this scene as the dominant background/layout reference.\nThe scene image contains no menu item to copy. Place the exact item from the FIRST image naturally into this scene family. Do not add prominent branded bottles, readable labels, text, logos, people or unrelated food/drink.`
    : placeReferenceCount > 0
      ? `\n\nMY PLACE — VENUE STYLE FALLBACK\nAdditional attached images are real venue photos. Use them only for lighting warmth and direction, color temperature, material character, ambience, brightness, depth of field and background palette. Do not copy food, drinks, people, signs, logos, furniture arrangements or identifiable objects. Because no reusable scene preset is available, keep the composition conservative and believable.`
      : `\n\nRESTAURANT STYLE FALLBACK\nUse a refined realistic premium restaurant-menu photography look with intentional lighting, natural contrast, clean composition and subtle depth of field. Do not invent or replace the served item.`;

  const designContext = styleContextText(styleContext);

  if (mode === "background") {
    return `${identityLock}${sceneInstruction}${designContext}\n\nTASK — CLEAN BACKGROUND\nKeep the served item and its container unchanged. Remove visual clutter around it, rebuild only the surrounding tabletop/background where useful, and correct lighting naturally. The result must still look like a real photograph of the exact original item.`;
  }

  if (mode === "match") {
    return `${identityLock}${sceneInstruction}${designContext}\n\nTASK — MATCH RESTAURANT SCENE\nTransform the PRESENTATION, not the served item. Integrate the exact real item into the selected restaurant scene so it looks as if it was photographed there during the same professional menu shoot. Match background composition, surface, lighting, warmth, ambience and camera feel strongly. You may substantially replace the original background, but do not change the item identity or its recognizable container/contents.\n\nFINAL SELF-CHECK\nCompare the output to the FIRST image. The same item must still be unmistakable. If preserving the item conflicts with scene matching, preserve the item and reduce the scene transformation.`;
  }

  return `${identityLock}${sceneInstruction}${designContext}\n\nTASK — ENHANCE PHOTO\nEnhance the existing photograph only: correct exposure and white balance, improve natural contrast, clarity and sharpness, reduce distracting noise and minor clutter, and make the image look professionally photographed. Do not substantially replace the scene or served item.`;
}

function scenePrompt(sceneType) {
  if (sceneType === "bar") {
    return `Using the attached real restaurant photos only as venue references, create a reusable EMPTY BAR SCENE for future menu photography.\n\nThe scene must clearly belong to the same real restaurant: preserve its lighting warmth, color palette, bar/table materials, architectural character and ambience. Create a clean bar-counter foreground with generous empty space where a future drink or dish can be placed. Use a professional restaurant-photography camera angle around bar height, realistic depth of field and premium but natural lighting.\n\nIMPORTANT: this is a BACKGROUND PRESET, not a food photo. Do not place any food, drink, glass, cup, plate, cutlery, hands or people in the foreground. Do not add readable text, logos or brands. Distant bar shelving may appear only as soft non-branded bokeh/background structure. Keep the usable foreground surface clean and unobstructed. Produce a realistic landscape photograph, not an illustration.`;
  }
  return `Using the attached real restaurant photos only as venue references, create a reusable EMPTY TABLE SCENE for future menu photography.\n\nThe scene must clearly belong to the same real restaurant: preserve its lighting warmth, color palette, table materials, wall/background character and ambience. Create a clean dining-table foreground with generous empty space where a future drink or dish can be placed. Use a professional restaurant-photography camera angle slightly above table height, realistic depth of field and premium but natural lighting.\n\nIMPORTANT: this is a BACKGROUND PRESET, not a food photo. Do not place any food, drink, glass, cup, plate, cutlery, hands or people in the foreground. Do not add readable text, logos or brands. Keep the usable foreground surface clean and unobstructed. Produce a realistic landscape photograph, not an illustration.`;
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

async function generateScene(adminClient, openAiKey, placeReferences, sceneFolder, sceneType) {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", scenePrompt(sceneType));
  form.append("size", "1536x1024");
  form.append("quality", "medium");
  placeReferences.forEach((reference, index) => {
    form.append("image[]", reference.blob, `venue-reference-${index + 1}.${imageExtension(reference.blob)}`);
  });

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Could not create the ${sceneType} scene.`);
  const imageBase64 = data?.data?.[0]?.b64_json;
  if (!imageBase64) throw new Error(`AI returned no ${sceneType} scene.`);

  const path = `${sceneFolder}/${sceneType}.png`;
  const blob = new Blob([decodeBase64(imageBase64)], { type: "image/png" });
  const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploadError) throw new Error(`Could not save the ${sceneType} scene.`);
}

async function loadScenePreset(adminClient, scenes, requestedSceneType, itemName = "") {
  let sceneType = requestedSceneType;
  if (!SCENE_TYPES.includes(sceneType)) {
    const name = String(itemName || "").toLowerCase();
    const drinkHint = /(beer|lager|ale|wine|whisky|whiskey|cocktail|vodka|gin|rum|tequila|coffee|tea|juice|soda|מים|בירה|יין|ויסקי|קוקטייל|قهوة|بيرة|نبيذ|كوكتيل)/i.test(name);
    sceneType = drinkHint && scenes.bar?.exists ? "bar" : scenes.table?.exists ? "table" : scenes.bar?.exists ? "bar" : "auto";
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
    const action = ["enhance", "status", "generate_scenes", "remember", "reset"].includes(body?.action) ? body.action : "enhance";
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

    if (action === "generate_scenes") {
      const requested = Array.isArray(body?.sceneTypes)
        ? [...new Set(body.sceneTypes.filter((value) => SCENE_TYPES.includes(value)))]
        : SCENE_TYPES;
      if (!requested.length) return json({ error: "Choose at least one scene to create." }, 400);
      const placeReferences = await loadPlaceReferences(adminClient, placeFolder, projectFolder);
      if (!placeReferences.length) return json({ error: "Add at least one My Place photo before creating restaurant scenes." }, 422);
      for (const sceneType of requested) {
        await generateScene(adminClient, openAiKey, placeReferences, sceneFolder, sceneType);
      }
      return json({
        ok: true,
        scenes: await sceneStatus(adminClient, sceneFolder),
        placeReferenceCount: placeReferences.length,
      });
    }

    const itemId = clean(body?.itemId, 140);
    const itemName = clean(body?.itemName, 160);
    const sourcePath = clean(body?.sourcePath, 700);
    const mode = ["enhance", "background", "match"].includes(body?.mode) ? body.mode : "enhance";
    const size = ["1024x1024", "1536x1024", "1024x1536"].includes(body?.size) ? body.size : "1536x1024";
    const requestedSceneType = ["auto", "bar", "table"].includes(body?.sceneType) ? body.sceneType : "auto";
    const styleContext = cleanStyleContext(body?.styleContext);

    if (!itemId || !sourcePath) return json({ error: "This photo is missing required information." }, 400);
    if (!sourcePath.startsWith(requiredPrefix)) return json({ error: "This photo does not belong to this menu." }, 403);

    const { data: sourceBlob, error: downloadError } = await adminClient.storage.from(BUCKET).download(sourcePath);
    if (downloadError || !sourceBlob) return json({ error: "Could not load the original photo." }, 422);
    if (sourceBlob.size > 12 * 1024 * 1024) return json({ error: "This photo is too large for AI enhancement." }, 400);

    const scenes = await sceneStatus(adminClient, sceneFolder);
    const { sceneType, scene } = mode === "match"
      ? await loadScenePreset(adminClient, scenes, requestedSceneType, itemName)
      : { sceneType: "auto", scene: null };
    const placeReferences = scene
      ? []
      : await loadPlaceReferences(adminClient, placeFolder, projectFolder);

    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", itemPrompt({
      mode,
      sceneType,
      scenePresetUsed: Boolean(scene),
      placeReferenceCount: placeReferences.length,
      styleContext,
    }));
    form.append("size", size);
    form.append("quality", "medium");

    const sourceName = `target.${imageExtension(sourceBlob)}`;
    const inputs = [{ blob: sourceBlob, name: sourceName }];
    if (scene) {
      inputs.push({ blob: scene.blob, name: `restaurant-${sceneType}-scene.${imageExtension(scene.blob)}` });
    } else {
      placeReferences.forEach((reference, index) => {
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
      styleStrength: "balanced",
      variantIndex: 1,
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
