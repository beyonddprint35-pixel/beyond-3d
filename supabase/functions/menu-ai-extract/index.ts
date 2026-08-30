// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "gpt-5.6-luna";
const PIPELINE_VERSION = "v10-openai-file-id";
const PRICE_INPUT = 0.20;
const PRICE_CACHED_INPUT = 0.02;
const PRICE_OUTPUT = 1.20;
const MAX_OUTPUT_TOKENS = 24000;
const RESPONSE_TIMEOUT_MS = 110000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
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

const SUPPORTED_LANGUAGES = ["en", "he", "ar"];
const LANGUAGE_LABELS = { en: "English", he: "Hebrew", ar: "Arabic" };
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function normalizeLanguages(value) {
  if (!Array.isArray(value)) return ["en", "he"];
  return Array.from(new Set(value.map((item) => String(item || "").trim().toLowerCase()).filter((item) => SUPPORTED_LANGUAGES.includes(item))));
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

function determineSourceType(files, text) {
  if (text && files.length) return "mixed";
  if (text) return "text";
  const hasPdf = files.some((file) => file.mimeType === "application/pdf");
  const hasImage = files.some((file) => file.mimeType !== "application/pdf");
  if (hasPdf && hasImage) return "mixed";
  if (hasPdf) return "pdf";
  return "image";
}

function countItems(menu) {
  return Array.isArray(menu?.sections)
    ? menu.sections.reduce((total, section) => total + (Array.isArray(section?.items) ? section.items.length : 0), 0)
    : 0;
}

function decodeBase64(base64) {
  const value = String(base64 || "");
  const clean = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uploadOpenAiFile(openAiKey, file) {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", new Blob([decodeBase64(file.base64)], { type: file.mimeType }), file.fileName);
  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok || !data?.id) throw new Error(data?.error?.message || `Could not prepare ${file.fileName} for menu reading.`);
  return data.id;
}

async function deleteOpenAiFile(openAiKey, fileId) {
  if (!fileId) return;
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${openAiKey}` },
    });
  } catch {}
}

function promptForMenu(requestedLanguages) {
  const requested = requestedLanguages.map((code) => `${LANGUAGE_LABELS[code]} (${code})`).join(", ");
  const fieldRules = SUPPORTED_LANGUAGES.map((code) => requestedLanguages.includes(code)
    ? `Populate every ${code} field faithfully in ${LANGUAGE_LABELS[code]}.`
    : `Every ${code} field must be an empty string because ${LANGUAGE_LABELS[code]} was not requested.`).join(" ");
  return `You are BEYOND Menu AI. Read the attached restaurant menu source carefully and return a complete structured digital menu.\n\n` +
    `Requested customer languages: ${requested}. ${fieldRules}\n\n` +
    `SOURCE ACCURACY RULES:\n` +
    `- Extract every clearly visible menu section and menu item; scan all pages from top to bottom.\n` +
    `- Never invent dishes, ingredients, prices, sizes, origins, or missing words.\n` +
    `- Preserve prices exactly as printed. Do not confuse item numbers/codes with prices.\n` +
    `- If an item has one normal price, put it in price and return an empty price_options array.\n` +
    `- Use price_options only for genuine labeled variants, sizes, or multiple prices.\n` +
    `- Translate names/descriptions naturally but faithfully. Do not embellish recipes.\n` +
    `- Keep descriptions empty when the source has no description.\n` +
    `- origin fields are only for real printed country/region/origin information.\n` +
    `- Set requested_languages exactly to the requested codes.\n` +
    `- Use warnings only for meaningful uncertainty or unreadable source content.\n` +
    `- The output must be usable as a restaurant menu without extraction notes inside customer-facing fields.`;
}

function calculateAiCost(usage) {
  const inputTokens = Number(usage?.input_tokens || 0);
  const cachedInputTokens = Number(usage?.input_tokens_details?.cached_tokens || 0);
  const outputTokens = Number(usage?.output_tokens || 0);
  const uncachedInput = Math.max(0, inputTokens - cachedInputTokens);
  const estimatedCostUsd = (uncachedInput * PRICE_INPUT + cachedInputTokens * PRICE_CACHED_INPUT + outputTokens * PRICE_OUTPUT) / 1_000_000;
  return {
    model: MODEL,
    openai_request_count: 1,
    input_tokens: inputTokens,
    cached_input_tokens: cachedInputTokens,
    cache_write_tokens: 0,
    output_tokens: outputTokens,
    total_tokens: Number(usage?.total_tokens || inputTokens + outputTokens),
    estimated_cost_usd: Number(estimatedCostUsd.toFixed(6)),
    cache_hit: false,
  };
}

async function extractMenu(openAiKey, content, requestedLanguages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        input: [{ role: "user", content: [{ type: "input_text", text: promptForMenu(requestedLanguages) }, ...content] }],
        text: { format: { type: "json_schema", name: "beyond_menu_pdf_import_v10", strict: true, schema: MENU_SCHEMA } },
      }),
    });
    const data = await response.json();
    const aiCost = calculateAiCost(data?.usage);
    if (!response.ok) {
      const error = new Error(data?.error?.message || "BEYOND AI could not read this menu source.");
      error.aiCost = aiCost;
      error.openAiCode = data?.error?.code || "";
      throw error;
    }
    const outputText = extractOutputText(data);
    if (!outputText) {
      const error = new Error("BEYOND AI returned no menu data from this source.");
      error.aiCost = aiCost;
      throw error;
    }
    try {
      return { menu: JSON.parse(outputText), aiCost };
    } catch {
      const error = new Error("BEYOND AI returned menu data that could not be parsed.");
      error.aiCost = aiCost;
      throw error;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const timeoutError = new Error("BEYOND AI took too long to read this menu. This build was not counted.");
      timeoutError.aiCost = { model: MODEL, openai_request_count: 1, input_tokens: 0, cached_input_tokens: 0, cache_write_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: 0, cache_hit: false };
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function persistAttemptUsage(adminClient, attemptId, aiCost) {
  if (!attemptId || !aiCost) return;
  try {
    await adminClient.from("menu_generation_attempts").update({
      openai_model: aiCost.model || MODEL,
      openai_request_count: Number(aiCost.openai_request_count || 0),
      input_tokens: Number(aiCost.input_tokens || 0),
      cached_input_tokens: Number(aiCost.cached_input_tokens || 0),
      cache_write_tokens: Number(aiCost.cache_write_tokens || 0),
      output_tokens: Number(aiCost.output_tokens || 0),
      total_tokens: Number(aiCost.total_tokens || 0),
      estimated_cost_usd: Number(aiCost.estimated_cost_usd || 0),
      cache_hit: Boolean(aiCost.cache_hit),
      ai_usage: aiCost,
    }).eq("id", attemptId);
  } catch {}
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
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Log in to build a menu." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Your BEYOND session could not be verified." }, 401);
  if (!user.email_confirmed_at) return json({ error: "Verify your email before building a menu." }, 403);

  let attemptId = "";
  let projectId = "";
  let sourceType = "text";
  let aiCost = null;
  const uploadedOpenAiFileIds = [];

  try {
    const body = await req.json();
    projectId = String(body?.projectId || "").trim();
    const menuText = String(body?.text || "").trim();
    const files = Array.isArray(body?.files) ? body.files : [];
    const requestedLanguages = normalizeLanguages(body?.languages);

    if (!projectId) return json({ error: "Menu project is missing." }, 400);
    if (!requestedLanguages.length) return json({ error: "Choose at least one menu language before generating." }, 400);
    if (!menuText && !files.length) return json({ error: "Upload a PDF or menu photo, or paste/write your menu." }, 400);
    if (menuText && menuText.length < 10) return json({ error: "Please provide a little more menu text before generating." }, 400);
    if (menuText.length > 50000) return json({ error: "Menu text is too long." }, 400);
    if (files.length > 12) return json({ error: "Upload up to 12 menu files at a time." }, 400);

    let totalFileSize = 0;
    for (const file of files) {
      if (!file?.fileName || !file?.mimeType || !file?.base64) return json({ error: "One uploaded menu file is incomplete." }, 400);
      if (!ALLOWED_TYPES.has(file.mimeType)) return json({ error: "Please upload PDF, JPG, PNG or WEBP menu files." }, 400);
      const fileSize = Number(file.fileSize || 0);
      if (fileSize > 10 * 1024 * 1024) return json({ error: `${file.fileName} is over the 10 MB per-file limit.` }, 400);
      totalFileSize += fileSize;
    }
    if (totalFileSize > 25 * 1024 * 1024) return json({ error: "The combined upload must be under 25 MB." }, 400);

    sourceType = determineSourceType(files, menuText);
    const { data: reservation, error: reservationError } = await userClient.rpc("reserve_menu_generation_attempt", { p_project_id: projectId, p_source_type: sourceType });
    if (reservationError) throw new Error(reservationError.message || "Could not reserve a menu generation attempt.");
    attemptId = reservation?.attempt_id || "";
    if (!attemptId) throw new Error("Could not reserve a menu generation attempt.");

    await adminClient.from("menu_projects").update({ status: "processing", source_type: sourceType, last_error: null }).eq("id", projectId);

    const content = [];
    if (menuText) content.push({ type: "input_text", text: `MENU TEXT PROVIDED BY USER:\n\n${menuText}` });
    for (const file of files) {
      if (file.mimeType === "application/pdf") {
        const fileId = await uploadOpenAiFile(openAiKey, file);
        uploadedOpenAiFileIds.push(fileId);
        content.push({ type: "input_file", file_id: fileId });
      } else {
        content.push({ type: "input_image", image_url: `data:${file.mimeType};base64,${file.base64}`, detail: "high" });
      }
    }

    const result = await extractMenu(openAiKey, content, requestedLanguages);
    aiCost = result.aiCost;
    const menu = result.menu;
    menu.requested_languages = requestedLanguages;
    const itemCount = countItems(menu);
    if (!itemCount) throw new Error("BEYOND AI could not reliably read individual menu items from this source. This build was not counted.");

    const projectName = String(menu?.restaurant_name || "").trim() || "My Menu";
    const { error: updateError } = await adminClient.from("menu_projects").update({
      name: projectName,
      source_type: sourceType,
      status: "ready",
      structured_menu: menu,
      source_metadata: {
        pipeline_version: PIPELINE_VERSION,
        model: MODEL,
        requested_languages: requestedLanguages,
        text_length: menuText.length,
        file_count: files.length,
        extracted_section_count: Array.isArray(menu.sections) ? menu.sections.length : 0,
        extracted_item_count: itemCount,
        ai_cost: aiCost,
        files: files.map((file) => ({ name: file.fileName, type: file.mimeType, size: Number(file.fileSize || 0) })),
      },
      last_error: null,
    }).eq("id", projectId);
    if (updateError) throw new Error("Could not save the generated menu draft.");

    const { data: finish, error: finishError } = await userClient.rpc("finish_menu_generation_attempt", { p_attempt_id: attemptId, p_success: true, p_error_message: null });
    if (finishError) throw new Error(finishError.message || "Could not finalize the generation attempt.");
    await persistAttemptUsage(adminClient, attemptId, aiCost);

    return json({
      ok: true,
      projectId,
      menu,
      aiCost,
      diagnostics: { pipelineVersion: PIPELINE_VERSION, model: MODEL, itemCount, temporaryPdfFiles: uploadedOpenAiFileIds.length },
      unlimited: Boolean(reservation?.unlimited),
      remainingAttempts: finish?.remaining_attempts ?? reservation?.remaining_attempts ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build this menu.";
    if (error?.aiCost) aiCost = error.aiCost;

    if (projectId) {
      try {
        await adminClient.from("menu_projects").update({
          status: "draft",
          source_type: sourceType,
          last_error: message,
          source_metadata: { pipeline_version: PIPELINE_VERSION, model: MODEL, ai_cost: aiCost },
        }).eq("id", projectId);
      } catch {}
    }
    if (attemptId) {
      try {
        await userClient.rpc("finish_menu_generation_attempt", { p_attempt_id: attemptId, p_success: false, p_error_message: message });
      } catch {}
      await persistAttemptUsage(adminClient, attemptId, aiCost || {
        model: MODEL, openai_request_count: 0, input_tokens: 0, cached_input_tokens: 0,
        cache_write_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: 0, cache_hit: false,
      });
    }
    return json({ error: message, aiCost, diagnostics: { pipelineVersion: PIPELINE_VERSION, model: MODEL, code: error?.openAiCode || null } }, 500);
  } finally {
    await Promise.allSettled(uploadedOpenAiFileIds.map((fileId) => deleteOpenAiFile(openAiKey, fileId)));
  }
});