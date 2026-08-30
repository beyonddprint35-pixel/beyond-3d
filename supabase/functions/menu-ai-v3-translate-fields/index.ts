// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "gpt-5.6-luna";
const MAX_FIELDS = 600;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string" },
          text: { type: "string" },
        },
        required: ["key", "text"],
      },
    },
  },
  required: ["translations"],
};

function outputText(response: any) {
  const chunks: string[] = [];
  for (const output of response?.output || []) {
    if (output?.type !== "message") continue;
    for (const part of output?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openAiKey) return json({ error: "BEYOND AI configuration is incomplete." }, 500);
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in is required." }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Your BEYOND session could not be verified." }, 401);

    const body = await req.json();
    const projectId = String(body?.projectId || "").trim();
    const fields = Array.isArray(body?.fields) ? body.fields : [];
    if (!projectId) return json({ error: "Menu project is missing." }, 400);
    if (!fields.length) return json({ ok: true, translations: [] });
    if (fields.length > MAX_FIELDS) return json({ error: "Too many translation fields in one request." }, 400);

    const { data: project, error: projectError } = await adminClient
      .from("menu_projects")
      .select("id, owner_user_id")
      .eq("id", projectId)
      .single();
    if (projectError || !project || project.owner_user_id !== user.id) return json({ error: "This menu project is not available to this account." }, 403);

    const normalized = fields.map((field: any) => ({
      key: String(field?.key || "").slice(0, 160),
      source: String(field?.source || "").slice(0, 2500),
      targetLanguage: ["en", "he", "ar"].includes(field?.targetLanguage) ? field.targetLanguage : "en",
      kind: String(field?.kind || "menu text").slice(0, 80),
    })).filter((field: any) => field.key && field.source);

    const prompt = `You are BEYOND Menu AI repairing wrong-language fields in an existing restaurant menu.\n\n` +
      `Translate each supplied source faithfully into its target language.\n` +
      `Target language codes: en=English, he=Hebrew, ar=Arabic.\n` +
      `STRICT RULES:\n` +
      `- Return exactly one result for every input key, in the same order.\n` +
      `- Never change prices, quantities, dish facts, ingredients, or brand identity.\n` +
      `- Translate category names and normal dish names naturally.\n` +
      `- Brand/product names may remain recognizable, but surrounding words must be in the requested language.\n` +
      `- Arabic output must use Arabic script for normal words; Hebrew output Hebrew script; English output English.\n` +
      `- Do not add explanations.\n\nFIELDS:\n${JSON.stringify(normalized)}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 16000,
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
        text: { format: { type: "json_schema", name: "beyond_v3_translation_repair", strict: true, schema: RESPONSE_SCHEMA } },
      }),
    });
    const data = await response.json();
    if (!response.ok) return json({ error: data?.error?.message || "Could not repair menu translations." }, 500);
    const raw = outputText(data);
    if (!raw) return json({ error: "Translation repair returned no data." }, 500);
    const parsed = JSON.parse(raw);
    const translations = Array.isArray(parsed?.translations) ? parsed.translations : [];
    if (translations.length !== normalized.length) return json({ error: "Translation repair returned an incomplete result." }, 500);

    return json({ ok: true, translations });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not repair menu translations." }, 500);
  }
});
