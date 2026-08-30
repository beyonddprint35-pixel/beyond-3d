// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "gpt-5.6-luna";
const MAX_OUTPUT_TOKENS = 24000;
const RESPONSE_TIMEOUT_MS = 90000;
const SUPPORTED_LANGUAGES = ["en", "he", "ar"];
const LANGUAGE_LABELS = { en: "English", he: "Hebrew", ar: "Arabic" };

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

const MENU_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    restaurant_name: { type: "string" },
    requested_languages: { type: "array", items: { type: "string", enum: ["en", "he", "ar"] } },
    detected_language: { type: "string", enum: ["he", "en", "ar", "mixed", "unknown"] },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name_en: { type: "string" },
          name_he: { type: "string" },
          name_ar: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name_en: { type: "string" },
                name_he: { type: "string" },
                name_ar: { type: "string" },
                description_en: { type: "string" },
                description_he: { type: "string" },
                description_ar: { type: "string" },
                price: { type: "string" },
                price_options: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      label_en: { type: "string" },
                      label_he: { type: "string" },
                      label_ar: { type: "string" },
                      price: { type: "string" },
                    },
                    required: ["label_en", "label_he", "label_ar", "price"],
                  },
                },
                origin_en: { type: "string" },
                origin_he: { type: "string" },
                origin_ar: { type: "string" },
              },
              required: [
                "name_en", "name_he", "name_ar",
                "description_en", "description_he", "description_ar",
                "price", "price_options",
                "origin_en", "origin_he", "origin_ar"
              ],
            },
          },
        },
        required: ["name_en", "name_he", "name_ar", "items"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["restaurant_name", "requested_languages", "detected_language", "sections", "warnings"],
};

function normalizeLanguages(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim().toLowerCase()).filter((item) => SUPPORTED_LANGUAGES.includes(item)))];
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function anyLocalized(row, base) {
  return SUPPORTED_LANGUAGES.some((code) => text(row?.[`${base}_${code}`]));
}

function missingRequestedTranslations(menu, languages) {
  const missing = [];
  const sections = Array.isArray(menu?.sections) ? menu.sections : [];
  sections.forEach((section, sectionIndex) => {
    if (anyLocalized(section, "name")) {
      languages.forEach((code) => {
        if (!text(section?.[`name_${code}`])) missing.push(`section ${sectionIndex + 1} name_${code}`);
      });
    }
    const items = Array.isArray(section?.items) ? section.items : [];
    items.forEach((item, itemIndex) => {
      if (anyLocalized(item, "name")) {
        languages.forEach((code) => {
          if (!text(item?.[`name_${code}`])) missing.push(`section ${sectionIndex + 1} item ${itemIndex + 1} name_${code}`);
        });
      }
      for (const base of ["description", "origin"]) {
        if (!anyLocalized(item, base)) continue;
        languages.forEach((code) => {
          if (!text(item?.[`${base}_${code}`])) missing.push(`section ${sectionIndex + 1} item ${itemIndex + 1} ${base}_${code}`);
        });
      }
      const options = Array.isArray(item?.price_options) ? item.price_options : [];
      options.forEach((option, optionIndex) => {
        if (!anyLocalized(option, "label")) return;
        languages.forEach((code) => {
          if (!text(option?.[`label_${code}`])) missing.push(`section ${sectionIndex + 1} item ${itemIndex + 1} option ${optionIndex + 1} label_${code}`);
        });
      });
    });
  });
  return missing;
}

function extractOutputText(response) {
  const parts = [];
  for (const output of response?.output || []) {
    if (output?.type !== "message") continue;
    for (const content of output?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("").trim();
}

function calculateAiCost(usage) {
  const inputTokens = Number(usage?.input_tokens || 0);
  const cachedInputTokens = Number(usage?.input_tokens_details?.cached_tokens || 0);
  const outputTokens = Number(usage?.output_tokens || 0);
  const uncachedInput = Math.max(0, inputTokens - cachedInputTokens);
  const estimatedCostUsd = (uncachedInput * 0.20 + cachedInputTokens * 0.02 + outputTokens * 1.20) / 1_000_000;
  return {
    model: MODEL,
    openai_request_count: 1,
    input_tokens: inputTokens,
    cached_input_tokens: cachedInputTokens,
    output_tokens: outputTokens,
    total_tokens: Number(usage?.total_tokens || inputTokens + outputTokens),
    estimated_cost_usd: Number(estimatedCostUsd.toFixed(6)),
  };
}

function completionPrompt(menu, languages) {
  const requested = languages.map((code) => `${LANGUAGE_LABELS[code]} (${code})`).join(", ");
  return `You are BEYOND Menu AI performing a translation-completeness repair on an already extracted restaurant menu.\n\n` +
    `Requested customer languages: ${requested}.\n\n` +
    `STRICT REPAIR RULES:\n` +
    `- Keep exactly the same number and order of sections, items, and price_options. Never add, remove, merge, split, or reorder content.\n` +
    `- Preserve restaurant_name, detected_language, all prices, and all source facts.\n` +
    `- For EVERY requested language, every section name and every item name must be non-empty when another language contains that text.\n` +
    `- If a description exists in any language, provide a faithful natural translation in EVERY requested language. If it is genuinely absent in all languages, keep it empty.\n` +
    `- If origin information exists in any language, provide it in EVERY requested language. Otherwise keep it empty.\n` +
    `- If a price-option label exists in any language, provide that label in EVERY requested language.\n` +
    `- Arabic must be natural Arabic text, not English/Hebrew copied into the Arabic field, except genuine brand/product names that are conventionally kept or transliterated.\n` +
    `- Hebrew must be natural Hebrew text and English must be natural English text.\n` +
    `- Do not embellish recipes or invent missing ingredients.\n` +
    `- Keep requested_languages exactly as supplied.\n\n` +
    `MENU JSON TO REPAIR:\n${JSON.stringify(menu)}`;
}

function restoreProtectedStructure(original, repaired, languages) {
  if (!Array.isArray(original?.sections) || !Array.isArray(repaired?.sections) || original.sections.length !== repaired.sections.length) {
    throw new Error("Translation repair changed the menu structure.");
  }

  repaired.restaurant_name = original.restaurant_name;
  repaired.detected_language = original.detected_language;
  repaired.requested_languages = languages;
  repaired.warnings = Array.isArray(original.warnings) ? original.warnings : [];

  original.sections.forEach((sourceSection, sectionIndex) => {
    const nextSection = repaired.sections[sectionIndex];
    const sourceItems = Array.isArray(sourceSection?.items) ? sourceSection.items : [];
    const nextItems = Array.isArray(nextSection?.items) ? nextSection.items : [];
    if (sourceItems.length !== nextItems.length) throw new Error("Translation repair changed the menu item count.");

    sourceItems.forEach((sourceItem, itemIndex) => {
      const nextItem = nextItems[itemIndex];
      nextItem.price = sourceItem.price;
      const sourceOptions = Array.isArray(sourceItem?.price_options) ? sourceItem.price_options : [];
      const nextOptions = Array.isArray(nextItem?.price_options) ? nextItem.price_options : [];
      if (sourceOptions.length !== nextOptions.length) throw new Error("Translation repair changed price options.");
      sourceOptions.forEach((sourceOption, optionIndex) => {
        nextOptions[optionIndex].price = sourceOption.price;
      });
    });
  });
  return repaired;
}

async function completeTranslations(openAiKey, menu, languages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        input: [{ role: "user", content: [{ type: "input_text", text: completionPrompt(menu, languages) }] }],
        text: { format: { type: "json_schema", name: "beyond_menu_translation_completion_v1", strict: true, schema: MENU_SCHEMA } },
      }),
    });
    const data = await response.json();
    const aiCost = calculateAiCost(data?.usage);
    if (!response.ok) throw new Error(data?.error?.message || "Could not complete menu translations.");
    const outputText = extractOutputText(data);
    if (!outputText) throw new Error("Translation completion returned no menu data.");
    return { menu: JSON.parse(outputText), aiCost };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Translation completion took too long.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openAiKey) return json({ error: "BEYOND AI configuration is incomplete." }, 500);
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Log in to complete menu translations." }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Your BEYOND session could not be verified." }, 401);

    const body = await req.json();
    const projectId = String(body?.projectId || "").trim();
    const menu = body?.menu;
    const languages = normalizeLanguages(body?.languages);
    if (!projectId || !menu || !languages.length) return json({ error: "Translation completion request is incomplete." }, 400);

    const { data: project, error: projectError } = await adminClient
      .from("menu_projects")
      .select("id, owner_user_id")
      .eq("id", projectId)
      .single();
    if (projectError || !project || project.owner_user_id !== user.id) return json({ error: "This menu project is not available to this account." }, 403);

    const before = missingRequestedTranslations(menu, languages);
    if (!before.length) return json({ ok: true, menu, repaired: false, missingBefore: 0, missingAfter: 0 });

    const result = await completeTranslations(openAiKey, menu, languages);
    const repairedMenu = restoreProtectedStructure(menu, result.menu, languages);
    const after = missingRequestedTranslations(repairedMenu, languages);
    if (after.length) throw new Error(`Translation completion still has ${after.length} missing fields.`);

    const { error: updateError } = await adminClient.from("menu_projects").update({ structured_menu: repairedMenu }).eq("id", projectId);
    if (updateError) throw new Error("Could not save the completed menu translations.");

    return json({ ok: true, menu: repairedMenu, repaired: true, missingBefore: before.length, missingAfter: 0, aiCost: result.aiCost });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not complete menu translations." }, 500);
  }
});