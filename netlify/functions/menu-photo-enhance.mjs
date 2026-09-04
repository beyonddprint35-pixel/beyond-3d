function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function env(name) {
  try {
    const value = globalThis.Netlify?.env?.get?.(name);
    if (value) return value;
  } catch {}
  return process.env[name] || "";
}

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function verifyUser(token, supabaseUrl, anonKey) {
  if (!token) throw new Error("AUTH_REQUIRED");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.id) throw new Error("AUTH_REQUIRED");
  return data;
}

const MODE_PROMPTS = {
  enhance: `Professionally enhance this real restaurant food photograph while preserving the dish exactly as photographed. Improve exposure, white balance, highlight/shadow balance, natural local contrast, clarity and appetizing but realistic color. Clean only minor visual distractions that do not touch or alter the dish. Keep the same food, ingredients, portions, arrangement, plate/container, camera angle and perspective. Do not add, remove, replace, resize or invent any ingredient, garnish, sauce, topping, utensil or food element. Do not make the food look synthetic. The result should look like the same real photo taken by a skilled restaurant photographer.`,
  background: `Turn this real restaurant food photograph into a clean professional menu photo. Preserve the actual dish, every visible ingredient, portion, arrangement, plate/container, camera angle and perspective exactly. Clean or replace only the surrounding background with a subtle premium restaurant tabletop/background and realistic contact shadows. Do not alter food or anything on the plate. Do not add garnish, props, ingredients, sauces, steam or decorative food. Keep the result natural, believable and photographic, not generated-looking.`,
  match: `Make this real dish photo look like part of one consistent premium restaurant menu photo collection. Preserve the actual dish exactly: every ingredient, portion, arrangement, plate/container, camera angle and geometry must remain faithful to the source. Use natural warm-neutral restaurant lighting, balanced color, soft realistic shadows, clean understated tabletop/background, polished but believable contrast and consistent professional framing. Do not add/remove/change food, garnish, sauce, toppings, props or portion size. Prioritize dish identity and truthfulness over beautification.`,
};

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const openAiKey = env("OPENAI_API_KEY");
  const supabaseUrl = (env("SUPABASE_URL") || env("VITE_SUPABASE_URL")).replace(/\/$/, "");
  const anonKey = env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY");
  if (!openAiKey) return json({ error: "AI photo service is not configured. Add OPENAI_API_KEY." }, 503);
  if (!supabaseUrl || !anonKey) return json({ error: "Supabase server configuration is missing." }, 503);

  try {
    await verifyUser(bearer(request), supabaseUrl, anonKey);
    const body = await request.json();
    const sourceUrl = String(body?.sourceUrl || "");
    const mode = MODE_PROMPTS[body?.mode] ? body.mode : "enhance";
    const size = ["1024x1024", "1536x1024", "1024x1536"].includes(body?.size) ? body.size : "1536x1024";

    let source;
    try { source = new URL(sourceUrl); } catch { return json({ error: "Invalid source image URL." }, 400); }
    const allowedOrigin = new URL(supabaseUrl).origin;
    const allowedPath = "/storage/v1/object/public/menu-item-images/";
    if (source.origin !== allowedOrigin || !source.pathname.includes(allowedPath)) {
      return json({ error: "This photo is not from the Beyond menu image library." }, 400);
    }

    const sourceResponse = await fetch(source.toString(), { cache: "no-store" });
    if (!sourceResponse.ok) return json({ error: "Could not load the original photo." }, 400);
    const sourceBlob = await sourceResponse.blob();
    if (!sourceBlob.type.startsWith("image/")) return json({ error: "Source file is not an image." }, 400);
    if (sourceBlob.size > 9 * 1024 * 1024) return json({ error: "Photo is too large for AI processing." }, 400);

    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("image", sourceBlob, `menu-source.${sourceBlob.type.includes("png") ? "png" : sourceBlob.type.includes("webp") ? "webp" : "jpg"}`);
    form.append("prompt", MODE_PROMPTS[mode]);
    form.append("size", size);
    form.append("quality", "low");
    form.append("output_format", "jpeg");
    form.append("output_compression", "88");

    const aiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: form,
    });
    const result = await aiResponse.json().catch(() => null);
    if (!aiResponse.ok) {
      console.error("Menu photo AI error", aiResponse.status, result?.error?.message || result);
      return json({ error: result?.error?.message || "AI could not process this photo." }, 502);
    }

    const image = result?.data?.[0];
    if (!image?.b64_json) return json({ error: "AI returned no processed image." }, 502);
    return json({
      imageBase64: image.b64_json,
      mimeType: "image/jpeg",
      mode,
      size,
      model: "gpt-image-2",
    });
  } catch (error) {
    if (error?.message === "AUTH_REQUIRED") return json({ error: "Please sign in again before enhancing photos." }, 401);
    console.error("menu-photo-enhance failed", error);
    return json({ error: error?.message || "Could not enhance this photo." }, 500);
  }
};
