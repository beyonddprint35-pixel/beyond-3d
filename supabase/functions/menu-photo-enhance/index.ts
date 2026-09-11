// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "gpt-image-2";
const BUCKET = "menu-item-images";
const MAX_PLACE_REFERENCES = 3;
const MAX_MENU_STYLE_REFERENCES = 2;
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
  if (!context || typeof context !== "object") {
    return { restaurantName: "", designId: "", referencePaths: [], theme: {} };
  }

  const referencePaths = Array.isArray(context.referencePaths)
    ? context.referencePaths
        .map((value) => clean(value, 700))
        .filter(Boolean)
        .slice(0, MAX_MENU_STYLE_REFERENCES)
    : [];

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
    referencePaths,
    theme,
  };
}

function styleContextText(styleContext) {
  const themeEntries = Object.entries(styleContext?.theme || {});
  if (!themeEntries.length) return "";
  const themeText = themeEntries.map(([key, value]) => `${key}: ${value}`).join(", ");
  return `\n\nMENU DESIGN CONTEXT\nThe active menu design uses these visual theme tokens: ${themeText}. Treat these only as weak palette/context hints. Never render text, logos, UI, or literal theme tokens into the photo.`;
}

function variantDirection(variantIndex, styleStrength) {
  if (styleStrength === "strong") {
    if (variantIndex % 2 === 0) {
      return `\n\nOPTION DIRECTION\nCreate the more cinematic version of the same approved restaurant style: stronger depth separation, richer ambient contrast and a polished premium evening-restaurant feel. Stay faithful to the approved style references rather than inventing a different art direction.`;
    }
    return `\n\nOPTION DIRECTION\nCreate the closest possible commercial-menu match to the approved restaurant style: disciplined framing, intentional light, elegant background falloff and premium food-photography restraint.`;
  }

  if (variantIndex % 2 === 0) {
    return `\n\nOPTION DIRECTION\nCreate a second restrained variation within the SAME restaurant style family. Keep the same visual language, but use a slightly different background balance or depth-of-field treatment so the owner has a meaningful choice.`;
  }

  return `\n\nOPTION DIRECTION\nCreate the most natural, conservative version within the approved restaurant style family, prioritizing realism and a close match to the style references.`;
}

function promptFor({
  mode,
  styleMemoryExists,
  menuReferenceCount,
  placeReferenceCount,
  styleStrength,
  variantIndex,
  styleContext,
}) {
  const common = `Edit the FIRST attached image, which is the REAL target restaurant dish photo, into a polished professional digital-menu photograph.

DISH LOCK — STRICT
- The FIRST/source image is the only source of truth for the food.
- Preserve the exact food, ingredients, toppings, garnish, sauce, sides and drinks that actually exist in the FIRST image.
- Do not add, remove, replace, reshape, recolor, enlarge, shrink, multiply or invent any food element.
- Preserve portion size, number of food pieces, arrangement, plate/container, recognizable food texture and plating geometry.
- Preserve the camera viewpoint and perspective. You may make a small crop/reframe only if needed for menu composition.
- The result must remain an honest representation of what the restaurant serves.
- Never import food, plates, props, utensils, text, logos, signs, hands or people from any reference image.
- Keep natural food texture and believable imperfections. Avoid glossy, synthetic or obviously AI-generated food.`;

  const styleMemory = styleMemoryExists
    ? `

APPROVED STYLE ANCHOR — HIGHEST PRIORITY
The SECOND attached image, named approved-style-anchor, is a restaurant menu photo the owner already approved. Match its VISUAL LANGUAGE closely: lighting direction and softness, background treatment, color temperature, contrast, crop discipline, lens/camera feel, depth of field, shadow character, ambience and level of polish.
Do NOT copy its dish, ingredients, plate, props or scene objects. Copy style only. The target dish in the FIRST image remains locked.`
    : "";

  const menuReferences = menuReferenceCount > 0
    ? `

MENU PHOTO REFERENCES — ACTIVE
${menuReferenceCount} additional attached image${menuReferenceCount === 1 ? " is" : "s are"} approved/existing menu-photo references named menu-style-reference-*. Use them to learn the restaurant's established photography language and make the result feel like the same collection. Average the STYLE across them; never copy their food, plating, props, text or literal scene content.`
    : "";

  const placeStyle = placeReferenceCount > 0
    ? `

MY PLACE — REAL VENUE REFERENCES
${placeReferenceCount} additional attached image${placeReferenceCount === 1 ? " is" : "s are"} real photos of this restaurant's physical place, named place-reference-*. Use them only to ground the result in the restaurant's authentic lighting mood, color temperature, wall/table material character, background palette, ambience and brightness.
Do NOT copy people, text, signs, logos, food, plates, furniture arrangements or identifiable objects from the venue references. Do NOT recreate an exact venue scene. These images guide atmosphere, not content.`
    : "";

  const designContext = styleContextText(styleContext);
  const optionDirection = variantDirection(variantIndex, styleStrength);

  if (mode === "background") {
    return `${common}${styleMemory}${menuReferences}${placeStyle}${designContext}

TASK — CLEAN BACKGROUND
Keep the dish and plate unchanged. Remove visual clutter and distracting objects around it, rebuild only the surrounding tabletop/background where necessary, and correct lighting naturally. Make the cleaned environment compatible with the restaurant references when available. The finished image must still look like a real photograph, not a generated scene.${optionDirection}`;
  }

  if (mode === "match") {
    const strengthInstruction = styleStrength === "strong"
      ? `

STYLE STRENGTH — STRONG
Make a clearly visible transformation of the PRESENTATION while keeping the dish locked. You MAY substantially rebuild everything outside the dish/plate: tabletop, background, ambient light, scene clutter, background color/material feel, realistic shadows, depth of field and overall photographic mood. The original room/background does NOT need to be preserved.
The final result should look convincingly as though this exact real dish was photographed during the same professional menu shoot as the approved style references. Prioritize the approved Style Anchor first, then existing menu-photo references, then My Place ambience. Do not cross the dish boundary or alter food identity.`
      : `

STYLE STRENGTH — BALANCED
Give the photo a meaningful but natural restaurant-menu transformation. Improve/rebuild the surrounding scene where useful, match the reference lighting and background language, and preserve more of the source environment when it already fits. The dish itself remains strictly locked.`;

    return `${common}${styleMemory}${menuReferences}${placeStyle}${designContext}${strengthInstruction}

TASK — MATCH MENU STYLE
Create one coherent premium menu photograph that belongs beside the restaurant's AI-created/approved photos. Match the reference collection's lighting, background simplicity, depth, color mood, contrast and composition much more strongly than a basic enhancement. The viewer should perceive the SAME PHOTO FAMILY, while the food remains the real dish from the FIRST image.${optionDirection}`;
  }

  return `${common}${placeStyle}${designContext}

TASK — QUICK CLEAN
Enhance the existing photograph only: correct exposure and white balance, improve natural contrast, clarity and sharpness, reduce distracting noise and minor clutter, and make the image look professionally photographed. Do not substantially replace the scene. When My Place references exist, gently align lighting and color mood with the real restaurant.${optionDirection}`;
}

async function listPlaceReferencePaths(adminClient, placeFolder, projectFolder) {
  const candidates = [];
  const sources = [
    { folder: placeFolder, prefix: "place-" },
    // My Place originally used the generic menu-image uploader, which stores
    // files in the project root as place-style-*. Keep those existing photos
    // valid so users do not need to delete/re-upload their restaurant memory.
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
    const { data: blob, error: downloadError } = await adminClient.storage.from(BUCKET).download(path);
    if (downloadError || !blob || !blob.size || blob.size > 12 * 1024 * 1024) continue;
    if (blob.type && !blob.type.startsWith("image/")) continue;
    references.push({ blob, path, name: path.split("/").pop() || "place-reference" });
  }
  return references;
}

async function loadMenuStyleReferences(adminClient, paths, requiredPrefix, excludedPaths = []) {
  const excluded = new Set(excludedPaths.filter(Boolean));
  const uniquePaths = [];
  for (const rawPath of paths || []) {
    const path = clean(rawPath, 700);
    if (!path || !path.startsWith(requiredPrefix) || excluded.has(path) || uniquePaths.includes(path)) continue;
    uniquePaths.push(path);
    if (uniquePaths.length >= MAX_MENU_STYLE_REFERENCES) break;
  }

  const references = [];
  for (const path of uniquePaths) {
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
    const styleMemoryPath = `${requiredPrefix}beyond-style-memory.png`;
    const placeFolder = `${projectFolder}/my-place`;

    if (action === "status") {
      const [{ data: remembered }, placeReferencePaths] = await Promise.all([
        adminClient.storage.from(BUCKET).download(styleMemoryPath),
        listPlaceReferencePaths(adminClient, placeFolder, projectFolder),
      ]);
      return json({
        ok: true,
        styleMemoryExists: Boolean(remembered && remembered.size > 0),
        styleMemoryPath,
        placeReferenceCount: placeReferencePaths.length,
      });
    }

    if (action === "reset") {
      await adminClient.storage.from(BUCKET).remove([styleMemoryPath]);
      return json({ ok: true, styleMemoryExists: false });
    }

    if (action === "remember") {
      const approvedPath = clean(body?.approvedPath, 700);
      if (!approvedPath || !approvedPath.startsWith(requiredPrefix) || approvedPath === styleMemoryPath) {
        return json({ error: "The approved photo does not belong to this menu." }, 403);
      }

      const { data: approvedBlob, error: approvedError } = await adminClient.storage.from(BUCKET).download(approvedPath);
      if (approvedError || !approvedBlob) return json({ error: "Could not load the approved menu photo." }, 422);
      if (approvedBlob.size > 12 * 1024 * 1024) {
        return json({ error: "The approved photo is too large for Style Memory." }, 400);
      }

      const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(styleMemoryPath, approvedBlob, {
        contentType: approvedBlob.type?.startsWith("image/") ? approvedBlob.type : "image/png",
        cacheControl: "31536000",
        upsert: true,
      });
      if (uploadError) return json({ error: "Could not save Style Memory." }, 500);
      return json({ ok: true, styleMemoryExists: true, styleMemoryPath });
    }

    if (!openAiKey) return json({ error: "AI photo configuration is incomplete." }, 500);

    const itemId = clean(body?.itemId, 140);
    const sourcePath = clean(body?.sourcePath, 700);
    const mode = ["enhance", "background", "match"].includes(body?.mode) ? body.mode : "enhance";
    const size = ["1024x1024", "1536x1024", "1024x1536"].includes(body?.size) ? body.size : "1536x1024";
    const styleStrength = body?.styleStrength === "strong" ? "strong" : "balanced";
    const rawVariantIndex = Number(body?.variantIndex || 1);
    const variantIndex = Number.isFinite(rawVariantIndex)
      ? Math.max(1, Math.min(9, Math.trunc(rawVariantIndex)))
      : 1;
    const styleContext = cleanStyleContext(body?.styleContext);

    if (!itemId || !sourcePath) {
      return json({ error: "This dish photo is missing required information." }, 400);
    }
    if (!sourcePath.startsWith(requiredPrefix)) {
      return json({ error: "This photo does not belong to this menu." }, 403);
    }

    const { data: sourceBlob, error: downloadError } = await adminClient.storage.from(BUCKET).download(sourcePath);
    if (downloadError || !sourceBlob) return json({ error: "Could not load the original dish photo." }, 422);
    if (sourceBlob.size > 12 * 1024 * 1024) {
      return json({ error: "This photo is too large for AI enhancement." }, 400);
    }

    let styleBlob = null;
    if (mode === "match") {
      const { data: remembered } = await adminClient.storage.from(BUCKET).download(styleMemoryPath);
      if (remembered && remembered.size > 0 && remembered.size <= 12 * 1024 * 1024) {
        styleBlob = remembered;
      }
    }

    const [menuStyleReferences, placeReferences] = await Promise.all([
      mode === "match"
        ? loadMenuStyleReferences(
            adminClient,
            styleContext.referencePaths,
            requiredPrefix,
            [sourcePath, styleMemoryPath],
          )
        : Promise.resolve([]),
      loadPlaceReferences(adminClient, placeFolder, projectFolder),
    ]);

    const mimeType = sourceBlob.type && sourceBlob.type.startsWith("image/") ? sourceBlob.type : "image/jpeg";
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", promptFor({
      mode,
      styleMemoryExists: Boolean(styleBlob),
      menuReferenceCount: menuStyleReferences.length,
      placeReferenceCount: placeReferences.length,
      styleStrength,
      variantIndex,
      styleContext,
    }));
    form.append("size", size);
    form.append("quality", "medium");

    const sourceName = `target.${imageExtension(sourceBlob)}`;
    const inputs = [{ blob: sourceBlob, name: sourceName }];

    if (styleBlob) {
      inputs.push({
        blob: styleBlob,
        name: `approved-style-anchor.${imageExtension(styleBlob)}`,
      });
    }

    menuStyleReferences.forEach((reference, index) => {
      inputs.push({
        blob: reference.blob,
        name: `menu-style-reference-${index + 1}.${imageExtension(reference.blob)}`,
      });
    });

    placeReferences.forEach((reference, index) => {
      inputs.push({
        blob: reference.blob,
        name: `place-reference-${index + 1}.${imageExtension(reference.blob)}`,
      });
    });

    if (inputs.length > 1) {
      inputs.forEach((input) => form.append("image[]", input.blob, input.name));
    } else {
      form.append("image", sourceBlob, sourceName);
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      return json(
        { error: data?.error?.message || "AI could not enhance this photo." },
        response.status >= 500 ? 500 : 422,
      );
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
      styleLocked: Boolean(styleBlob || menuStyleReferences.length || placeReferences.length),
      styleMemoryExists: Boolean(styleBlob),
      menuStyleUsed: menuStyleReferences.length > 0,
      menuStyleReferenceCount: menuStyleReferences.length,
      placeStyleUsed: placeReferences.length > 0,
      placeReferenceCount: placeReferences.length,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not enhance this photo." }, 500);
  }
});