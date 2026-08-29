const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";
const MENU_BUCKET_PATH = "/storage/v1/object/public/menu-item-images/";

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers:{
      "Content-Type":"application/json",
      "Cache-Control":"no-store",
    },
    body:JSON.stringify(body),
  };
}

function bearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function clamp(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function safeImageUrl(value, supabaseUrl) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 2400 || !supabaseUrl) return "";
  try {
    const image = new URL(raw);
    const project = new URL(supabaseUrl);
    if (image.protocol !== "https:" || image.origin !== project.origin) return "";
    if (!image.pathname.startsWith(MENU_BUCKET_PATH)) return "";
    return image.toString();
  } catch {
    return "";
  }
}

async function verifyUser(event) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const token = bearerToken(event);

  if (!supabaseUrl || !serviceKey) return { ok:false, status:503, error:"Photo AI authentication is not configured." };
  if (!token) return { ok:false, status:401, error:"Sign in before using professional photo finishing." };

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers:{ apikey:serviceKey, Authorization:`Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.id) return { ok:false, status:401, error:"Your session is invalid or expired." };
  return { ok:true, user:data, supabaseUrl };
}

function recipeSchema() {
  return {
    type:"object",
    additionalProperties:false,
    properties:{
      exposure:{ type:"number", description:"Exposure correction in stops. Keep subtle." },
      contrast:{ type:"number", description:"Contrast multiplier." },
      saturation:{ type:"number", description:"Saturation multiplier." },
      warmth:{ type:"number", description:"Warm/cool correction. Positive is warmer." },
      tint:{ type:"number", description:"Green/magenta correction. Positive is magenta." },
      shadows:{ type:"number", description:"Shadow recovery amount." },
      highlights:{ type:"number", description:"Highlight recovery amount, normally zero or negative." },
      clarity:{ type:"number", description:"Micro-contrast amount." },
      confidence:{ type:"number", description:"Confidence from zero to one." },
    },
    required:["exposure","contrast","saturation","warmth","tint","shadows","highlights","clarity","confidence"],
  };
}

function extractOutputText(payload) {
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

function sanitizeRecipe(recipe) {
  return {
    exposure:clamp(recipe?.exposure, -0.22, 0.22),
    contrast:clamp(recipe?.contrast, 0.94, 1.14, 1),
    saturation:clamp(recipe?.saturation, 0.9, 1.12, 1),
    warmth:clamp(recipe?.warmth, -0.055, 0.055),
    tint:clamp(recipe?.tint, -0.04, 0.04),
    shadows:clamp(recipe?.shadows, 0, 0.16),
    highlights:clamp(recipe?.highlights, -0.16, 0),
    clarity:clamp(recipe?.clarity, 0, 0.12),
    confidence:clamp(recipe?.confidence, 0, 1),
  };
}

exports.handler = async event => {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error:"Method not allowed." });

  const auth = await verifyUser(event);
  if (!auth.ok) return jsonResponse(auth.status, { error:auth.error });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return jsonResponse(503, { error:"Professional AI photo finishing is not enabled yet." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error:"Invalid request." });
  }

  const imageUrl = safeImageUrl(body.imageUrl, auth.supabaseUrl);
  if (!imageUrl) return jsonResponse(400, { error:"A valid Beyond menu photo is required." });

  const profileLabel = String(body.profileLabel || "Natural premium menu photography").slice(0, 120);
  const profileDescription = String(body.profileDescription || "").slice(0, 260);
  const model = process.env.MENU_PHOTO_AI_MODEL || DEFAULT_MODEL;

  const instructions = [
    "You are Beyond's photographic finishing director for restaurant menu photos.",
    "Analyze the supplied REAL dish photo and return ONLY conservative photographic adjustment parameters.",
    "The dish has an integrity lock: never propose adding, removing, replacing, repainting, reshaping, relighting with generated content, or changing ingredients, plating, portions, tableware, logos, text, people, or background objects.",
    "Only assess exposure, contrast, saturation, white-balance warmth/tint, shadow recovery, highlight recovery and subtle clarity.",
    "Keep adjustments restrained and realistic. Preserve believable food color and natural whites.",
    `Target menu direction: ${profileLabel}. ${profileDescription}`,
    "If the photo already looks professionally balanced, stay close to neutral values.",
  ].join("\n");

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method:"POST",
      headers:{
        Authorization:`Bearer ${apiKey}`,
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        model,
        input:[{
          role:"user",
          content:[
            { type:"input_text", text:instructions },
            { type:"input_image", image_url:imageUrl, detail:"low" },
          ],
        }],
        text:{
          format:{
            type:"json_schema",
            name:"beyond_menu_photo_finish",
            strict:true,
            schema:recipeSchema(),
          },
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message || "AI photo analysis failed.";
      console.error("menu-photo-ai-finish", response.status, message);
      return jsonResponse(502, { error:"Professional AI photo analysis is temporarily unavailable." });
    }

    const text = extractOutputText(payload);
    const parsed = JSON.parse(text || "{}");
    return jsonResponse(200, {
      recipe:sanitizeRecipe(parsed),
      safety:"dish-integrity-locked",
      model,
    });
  } catch (error) {
    console.error("menu-photo-ai-finish", error);
    return jsonResponse(502, { error:"Professional AI photo analysis is temporarily unavailable." });
  }
};
