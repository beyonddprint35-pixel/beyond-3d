// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "gpt-image-2";
const BUCKET = "menu-item-images";
const MAX_PLACE_REFERENCES = 3;
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

function promptFor({ mode, placeReferenceCount, styleContext }) {
  const identityLock = `Edit the FIRST attached image into a polished professional digital-menu photograph.\n\nABSOLUTE SUBJECT LOCK — HIGHEST PRIORITY\n- The FIRST image is the ONLY source of truth for the served item.\n- Preserve the semantic identity of the source exactly. If the source is a beer, cocktail, wine, coffee or other drink, the output MUST remain that same drink. If the source is food, the output MUST remain that same food.\n- Never replace a drink with food or food with a drink. Never replace one dish with another dish.\n- Preserve the exact glass, cup, plate or container from the FIRST image unless a tiny crop correction is necessary.\n- Preserve the visible liquid color, fill level, foam/head, ice, garnish, ingredients, toppings, sauces, sides, portion size, number of pieces and plating geometry that actually exist in the FIRST image.\n- Do not add, remove, replace, reshape, recolor, enlarge, shrink, multiply or invent any served item.\n- Do not import food, drinks, plates, glasses, utensils, props, text, logos, signs, hands or people from any reference image.\n- The finished photo must remain an honest representation of the exact item in the FIRST image.\n- Keep realistic texture and believable imperfections. Avoid glossy, synthetic or obviously AI-generated food/drink.`;

  const placeStyle = placeReferenceCount > 0
    ? `\n\nMY PLACE — VENUE STYLE ONLY\n${placeReferenceCount} additional image${placeReferenceCount === 1 ? " is" : "s are"} real photos of the restaurant venue. They are NOT menu-item references and must NEVER contribute food or drink content. Use them only for environmental style: lighting warmth and direction, color temperature, table/background material character, ambience, brightness, depth of field and background palette. Do not copy people, signs, logos, bottles, food, drinks, furniture arrangements or identifiable scene objects from them.`
    : `\n\nRESTAURANT STYLE\nUse a refined, realistic premium restaurant-menu photography look: intentional lighting, natural contrast, clean composition, subtle depth of field and believable ambience. Do not invent or replace the served item.`;

  const designContext = styleContextText(styleContext);

  if (mode === "background") {
    return `${identityLock}${placeStyle}${designContext}\n\nTASK — CLEAN BACKGROUND\nKeep the served item and its plate/glass/container unchanged. Remove visual clutter around it, rebuild only the surrounding tabletop/background where useful, and correct lighting naturally. The result must still look like a real photograph of the exact original item.`;
  }

  if (mode === "match") {
    return `${identityLock}${placeStyle}${designContext}\n\nTASK — MATCH THIS RESTAURANT\nTransform the PRESENTATION, not the served item. Improve or rebuild the environment around the subject so the exact real item looks professionally photographed for this restaurant's digital menu. Match My Place lighting, ambience, material character, warmth, background simplicity, depth and premium camera feel. You may substantially change the background and surrounding scene, but you must not cross the subject/container boundary or change the identity of the food or drink.\n\nFINAL SELF-CHECK BEFORE OUTPUT\nCompare the output to the FIRST image. The same served item must still be clearly recognizable. If the FIRST image is a beverage in a glass, the output must be that beverage in that glass — never a plate of food. If preserving the exact item conflicts with style matching, preserve the item and reduce the style change.`;
  }

  return `${identityLock}${placeStyle}${designContext}\n\nTASK — ENHANCE PHOTO\nEnhance the existing photograph only: correct exposure and white balance, improve natural contrast, clarity and sharpness, reduce distracting noise and minor clutter, and make the image look professionally photographed. Do not substantially replace the scene or the served item.`;
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
      candidates.push({
        path: `${source.folder}/${entry.name}`,
        createdAt: entry.created_at || entry.updated_at || "",
      });
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

async function loadPlaceReferences(adminClient, placeFolder, projectFolder) {
  const paths = await listPlaceReferencePaths(adminClient, placeFolder, projectFolder);
  const references = [];
  for (const path of paths) {
    const { data: blob, error } = await adminClient.storage.from(BUCKET).download(path);
    if (error || !blob || !blob.size || blob.size > 12 * 1024 * 1024) continue;
    if (blob.type && !blob.type.startsWith("image/")) continue;
    references.push({ blob, path });
  }
  return references;
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
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in to enhance menu photos." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Your BEYOND session could not be verified." }, 401);
  if (!user.email_confirmed_at) return json({ error: "Verify your email before enhancing photos." }, 403);

  try {
    const body = await req.json();
    const action = ["enhance", "status", "remember", "reset"].includes(body?.action) ? body.action : "enhance";
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
    const legacyStyleMemoryPath = `${requiredPrefix}beyond-style-memory.png`;
    const placeFolder = `${projectFolder}/my-place`;

    if (action === "status") {
      const placeReferencePaths = await listPlaceReferencePaths(adminClient, placeFolder, projectFolder);
      return json({
        ok: true,
        styleMemoryExists: false,
        styleMemoryPath: legacyStyleMemoryPath,
        placeReferenceCount: placeReferencePaths.length,
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

    const itemId = clean(body?.itemId, 140);
    const sourcePath = clean(body?.sourcePath, 700);
    const mode = ["enhance", "background", "match"].includes(body?.mode) ? body.mode : "enhance";
    const size = ["1024x1024", "1536x1024", "1024x1536"].includes(body?.size) ? body.size : "1536x1024";
    const styleContext = cleanStyleContext(body?.styleContext);

    if (!itemId || !sourcePath) return json({ error: "This photo is missing required information." }, 400);
    if (!sourcePath.startsWith(requiredPrefix)) return json({ error: "This photo does not belong to this menu." }, 403);

    const { data: sourceBlob, error: downloadError } = await adminClient.storage.from(BUCKET).download(sourcePath);
    if (downloadError || !sourceBlob) return json({ error: "Could not load the original photo." }, 422);
    if (sourceBlob.size > 12 * 1024 * 1024) return json({ error: "This photo is too large for AI enhancement." }, 400);

    const placeReferences = await loadPlaceReferences(adminClient, placeFolder, projectFolder);

    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", promptFor({ mode, placeReferenceCount: placeReferences.length, styleContext }));
    form.append("size", size);
    form.append("quality", "medium");

    const sourceName = `target.${imageExtension(sourceBlob)}`;
    const inputs = [{ blob: sourceBlob, name: sourceName }];
    placeReferences.forEach((reference, index) => {
      inputs.push({ blob: reference.blob, name: `venue-style-${index + 1}.${imageExtension(reference.blob)}` });
    });

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
      styleLocked: placeReferences.length > 0,
      styleMemoryExists: false,
      menuStyleUsed: false,
      menuStyleReferenceCount: 0,
      placeStyleUsed: placeReferences.length > 0,
      placeReferenceCount: placeReferences.length,
      contentSafeMatching: true,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not enhance this photo." }, 500);
  }
});