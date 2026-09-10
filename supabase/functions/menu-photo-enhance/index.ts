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
function clean(value, max = 500) { return String(value || "").trim().slice(0, max); }
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

function promptFor(mode, styleLocked, placeReferenceCount) {
  const common = `Edit the FIRST attached image, which is the REAL target restaurant dish photo, into a polished professional digital-menu photograph.\n\nDISH LOCK — STRICT\n- Preserve the exact food that exists in the FIRST/source image.\n- Do not add, remove, replace, reshape, recolor, or invent ingredients, toppings, garnish, sauce, sides, drinks, or decoration.\n- Preserve portion size, number of food pieces, their arrangement, plate/container, and recognizable food texture.\n- Preserve the camera viewpoint and perspective unless a tiny crop/composition correction is required.\n- The result must remain an honest representation of what the restaurant serves.\n- No text, logos, watermarks, hands, or people.\n- Keep realistic imperfections. Avoid glossy or synthetic AI-looking food.`;
  const styleMemory = styleLocked ? `\n\nSTYLE MEMORY — ACTIVE\nThe SECOND attached image is a restaurant menu photo the owner explicitly approved as the visual anchor. Match its lighting character, background treatment, color temperature, contrast, crop discipline, camera feel, depth of field, shadow softness, and overall restraint. Do NOT copy food, ingredients, plating objects, or dish contents from the approved style image into the first image. The first image remains the only source of truth for the target dish.` : "";
  const placeStyle = placeReferenceCount > 0 ? `\n\nMY PLACE — REAL VENUE REFERENCES\n${placeReferenceCount} additional attached image${placeReferenceCount === 1 ? " is" : "s are"} real photos of this restaurant's physical place. Use them as environmental style references only. Learn the restaurant's authentic lighting mood, color temperature, wall/table material character, background palette, ambience, and level of brightness. When rebuilding or cleaning the area around the dish, make it feel naturally compatible with this real venue. Do NOT copy people, text, signs, logos, food, plates, furniture arrangements, or identifiable objects from the venue references. Do NOT place the target dish inside an exact copied scene. The venue photos guide atmosphere, not content.` : "";
  if (mode === "background") return `${common}${styleMemory}${placeStyle}\n\nTASK\nClean only the presentation around the dish. Remove visual clutter and distracting background objects where safe, improve the table/background into a polished restaurant setting, and correct lighting naturally. If My Place references exist, make the cleaned presentation compatible with that restaurant's real ambience. Keep the plate and food unchanged.`;
  if (mode === "match") return `${common}${styleMemory}${placeStyle}\n\nTASK\nCreate a consistent premium restaurant-menu look. Prioritize an approved Style Memory when present, while using My Place references to keep the result grounded in the restaurant's real atmosphere. If there is no approved Style Memory but My Place references exist, use those real venue references as the primary environmental guide. Otherwise create a tasteful balanced restaurant candidate. Do not stylize or redesign the food. Do not treat this candidate as approved unless the user later accepts it.`;
  return `${common}${placeStyle}\n\nTASK\nEnhance the existing photograph only: correct exposure and white balance, improve natural contrast, clarity and sharpness, reduce distracting noise, and make the image look professionally photographed. When My Place references exist, gently align lighting and color mood with the real restaurant without replacing the scene unnecessarily.`;
}

async function listPlaceReferenceNames(adminClient, folder) {
  const { data: entries, error } = await adminClient.storage.from(BUCKET).list(folder, {
    limit: 30,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry?.name?.startsWith("place-") && entry?.metadata)
    .slice(0, MAX_PLACE_REFERENCES)
    .map((entry) => entry.name);
}

async function loadPlaceReferences(adminClient, folder) {
  const names = await listPlaceReferenceNames(adminClient, folder);
  const references = [];
  for (const name of names) {
    const path = `${folder}/${name}`;
    const { data: blob, error: downloadError } = await adminClient.storage.from(BUCKET).download(path);
    if (downloadError || !blob || !blob.size || blob.size > 12 * 1024 * 1024) continue;
    if (blob.type && !blob.type.startsWith("image/")) continue;
    references.push({ blob, path, name });
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
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
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
    if (projectError || !project || project.archived_at || project.owner_user_id !== user.id) return json({ error: "This menu project is not available to your account." }, 403);

    const safeProject = safeId(projectId, "project");
    const requiredPrefix = `${user.id}/${safeProject}/`;
    const styleMemoryPath = `${requiredPrefix}beyond-style-memory.png`;
    const placeFolder = `${requiredPrefix}my-place`;

    if (action === "status") {
      const [{ data: remembered }, placeReferenceNames] = await Promise.all([
        adminClient.storage.from(BUCKET).download(styleMemoryPath),
        listPlaceReferenceNames(adminClient, placeFolder),
      ]);
      return json({
        ok: true,
        styleMemoryExists: Boolean(remembered && remembered.size > 0),
        styleMemoryPath,
        placeReferenceCount: placeReferenceNames.length,
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
      if (approvedBlob.size > 12 * 1024 * 1024) return json({ error: "The approved photo is too large for Style Memory." }, 400);
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
    if (!itemId || !sourcePath) return json({ error: "This dish photo is missing required information." }, 400);
    if (!sourcePath.startsWith(requiredPrefix)) return json({ error: "This photo does not belong to this menu." }, 403);

    const { data: sourceBlob, error: downloadError } = await adminClient.storage.from(BUCKET).download(sourcePath);
    if (downloadError || !sourceBlob) return json({ error: "Could not load the original dish photo." }, 422);
    if (sourceBlob.size > 12 * 1024 * 1024) return json({ error: "This photo is too large for AI enhancement." }, 400);

    let styleBlob = null;
    if (mode === "match") {
      const { data: remembered } = await adminClient.storage.from(BUCKET).download(styleMemoryPath);
      if (remembered && remembered.size > 0 && remembered.size <= 12 * 1024 * 1024) styleBlob = remembered;
    }
    const placeReferences = await loadPlaceReferences(adminClient, placeFolder);

    const mimeType = sourceBlob.type && sourceBlob.type.startsWith("image/") ? sourceBlob.type : "image/jpeg";
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", promptFor(mode, Boolean(styleBlob), placeReferences.length));
    form.append("size", size);
    form.append("quality", "medium");

    const sourceName = `target.${imageExtension(sourceBlob)}`;
    const inputs = [{ blob: sourceBlob, name: sourceName }];
    if (styleBlob) inputs.push({ blob: styleBlob, name: `approved-style-anchor.${imageExtension(styleBlob)}` });
    placeReferences.forEach((reference, index) => {
      inputs.push({ blob: reference.blob, name: `place-reference-${index + 1}.${imageExtension(reference.blob)}` });
    });

    if (inputs.length > 1) {
      // OpenAI's Image API requires array syntax when more than one input image is supplied.
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
    if (!response.ok) return json({ error: data?.error?.message || "AI could not enhance this photo." }, response.status >= 500 ? 500 : 422);
    const imageBase64 = data?.data?.[0]?.b64_json;
    if (!imageBase64) return json({ error: "AI returned no photo." }, 500);

    return json({
      ok: true,
      imageBase64,
      mimeType: "image/png",
      mode,
      model: MODEL,
      size,
      styleLocked: Boolean(styleBlob || placeReferences.length),
      styleMemoryExists: Boolean(styleBlob),
      placeStyleUsed: placeReferences.length > 0,
      placeReferenceCount: placeReferences.length,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not enhance this photo." }, 500);
  }
});