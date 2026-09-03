import { supabase } from "../../../lib/supabaseClient";

export const MENU_IMPORT_MAX_FILES = 12;
export const MENU_IMPORT_MAX_TOTAL_MB = 25;
export const MENU_IMPORT_MAX_TOTAL_BYTES = MENU_IMPORT_MAX_TOTAL_MB * 1024 * 1024;
export const MENU_IMPORT_SUPPORTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MENU_TRANSLATION_LANGUAGES = ["en", "he", "ar"];

export function totalImportBytes(files = []) {
  return files.reduce((sum, file) => sum + Number(file?.size || 0), 0);
}

export function validateImportFiles(files = []) {
  if (files.length > MENU_IMPORT_MAX_FILES) return `You can upload up to ${MENU_IMPORT_MAX_FILES} files.`;
  if (files.some((file) => !MENU_IMPORT_SUPPORTED_TYPES.has(file?.type))) return "Only PDF, JPG, PNG or WEBP files are supported.";
  if (totalImportBytes(files) > MENU_IMPORT_MAX_TOTAL_BYTES) return `The combined upload can be up to ${MENU_IMPORT_MAX_TOTAL_MB} MB.`;
  return "";
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      resolve({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64: comma >= 0 ? value.slice(comma + 1) : value,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function parseFunctionError(functionError) {
  let message = functionError?.message || "Could not build this menu.";
  let details = null;
  try {
    const response = functionError?.context;
    if (response && typeof response.clone === "function") {
      const raw = await response.clone().text();
      if (raw) {
        try {
          details = JSON.parse(raw);
          message = details?.error || details?.message || message;
        } catch {
          message = raw || message;
        }
      }
    }
  } catch {
    // Preserve the original function error.
  }
  const error = new Error(message);
  error.details = details;
  return error;
}

function fieldText(value) {
  return value == null ? "" : String(value).trim();
}

function hasAnyLocalizedField(row, base) {
  return MENU_TRANSLATION_LANGUAGES.some((code) => fieldText(row?.[`${base}_${code}`]));
}

function hasAlphabeticText(value) {
  return /[A-Za-z\u0590-\u05ff\u0600-\u06ff]/.test(fieldText(value));
}

function requestedTranslationMissing(row, base, code) {
  const value = fieldText(row?.[`${base}_${code}`]);
  if (!value) return true;
  if (!hasAlphabeticText(value)) return false;
  if (code === "ar") return !/[\u0600-\u06ff]/.test(value);
  if (code === "he") return !/[\u0590-\u05ff]/.test(value);
  if (code === "en") return !/[A-Za-z]/.test(value);
  return false;
}

export function findMissingRequestedMenuTranslations(menu, languages = []) {
  const requested = [...new Set(languages.filter((code) => MENU_TRANSLATION_LANGUAGES.includes(code)))];
  if (!requested.length) return [];

  const missing = [];
  const sections = Array.isArray(menu?.sections) ? menu.sections : [];
  sections.forEach((section, sectionIndex) => {
    if (hasAnyLocalizedField(section, "name")) {
      requested.forEach((code) => {
        if (requestedTranslationMissing(section, "name", code)) missing.push(`section:${sectionIndex}:name_${code}`);
      });
    }

    const items = Array.isArray(section?.items) ? section.items : [];
    items.forEach((item, itemIndex) => {
      if (hasAnyLocalizedField(item, "name")) {
        requested.forEach((code) => {
          if (requestedTranslationMissing(item, "name", code)) missing.push(`item:${sectionIndex}:${itemIndex}:name_${code}`);
        });
      }

      for (const base of ["description", "origin"]) {
        if (!hasAnyLocalizedField(item, base)) continue;
        requested.forEach((code) => {
          if (requestedTranslationMissing(item, base, code)) missing.push(`item:${sectionIndex}:${itemIndex}:${base}_${code}`);
        });
      }

      const options = Array.isArray(item?.price_options) ? item.price_options : [];
      options.forEach((option, optionIndex) => {
        if (!hasAnyLocalizedField(option, "label")) return;
        requested.forEach((code) => {
          if (requestedTranslationMissing(option, "label", code)) missing.push(`option:${sectionIndex}:${itemIndex}:${optionIndex}:label_${code}`);
        });
      });
    });
  });
  return missing;
}

async function completeMissingMenuTranslations({ session, projectId, menu, languages }) {
  const missing = findMissingRequestedMenuTranslations(menu, languages);
  if (!missing.length) return { menu, repaired: false, missingBefore: 0, aiCost: null };

  const { data, error } = await supabase.functions.invoke("menu-ai-translation-complete", {
    body: { projectId, menu, languages },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw await parseFunctionError(error);
  if (!data?.ok || !data?.menu) throw new Error(data?.error || "Could not complete all requested menu translations.");

  const remaining = findMissingRequestedMenuTranslations(data.menu, languages);
  if (remaining.length) throw new Error(`Could not complete ${remaining.length} requested menu translations.`);
  return { menu: data.menu, repaired: Boolean(data.repaired), missingBefore: missing.length, aiCost: data.aiCost || null };
}

export async function getMenuAiAllowance() {
  const { data, error } = await supabase.rpc("get_menu_generation_allowance");
  if (error) throw error;
  return data;
}

export async function getMenuImportSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

export async function importMenuWithAi({ session, files = [], text = "", languages = [] }) {
  if (!session?.user?.id || !session?.access_token) throw new Error("Sign in is required to use AI menu import.");
  if (!languages.length) throw new Error("Choose at least one menu language.");
  if (!String(text || "").trim() && !files.length) throw new Error("Upload your menu or paste its content first.");
  const fileError = validateImportFiles(files);
  if (fileError) throw new Error(fileError);

  const allowance = await getMenuAiAllowance();
  if (allowance && !allowance.unlimited && Number(allowance.remaining_attempts) <= 0) {
    throw new Error("You have used all available AI menu builds.");
  }

  const sourceType = String(text || "").trim() && files.length
    ? "mixed"
    : String(text || "").trim()
      ? "text"
      : files.some((file) => file.type === "application/pdf")
        ? "pdf"
        : "image";

  const { data: project, error: createError } = await supabase
    .from("menu_projects")
    .insert({
      owner_user_id: session.user.id,
      created_by: session.user.id,
      name: `Menu Import ${new Date().toLocaleDateString("en-CA")}`,
      source_type: sourceType,
    })
    .select()
    .single();

  if (createError) throw createError;

  const payloadFiles = await Promise.all(files.map(fileToPayload));
  const imageOnly = files.length > 0
    && files.every((file) => file.type?.startsWith("image/"))
    && !String(text || "").trim();
  const functionName = imageOnly ? "menu-ai-extract-batch-test" : "menu-ai-extract";

  const { data, error: functionError } = await supabase.functions.invoke(functionName, {
    body: {
      projectId: project.id,
      text: String(text || "").trim(),
      files: payloadFiles,
      languages,
      expectedItemCount: 0,
      recoveryProjectId: null,
      smartRetry: false,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (functionError) throw await parseFunctionError(functionError);
  if (!data?.ok || !data?.menu) throw new Error(data?.error || "Could not build this menu.");

  const translation = await completeMissingMenuTranslations({
    session,
    projectId: project.id,
    menu: data.menu,
    languages,
  });
  const completedMenu = translation.menu;

  return {
    project: { ...project, name: completedMenu?.restaurant_name || project.name, structured_menu: completedMenu, status: "ready" },
    menu: completedMenu,
    allowance: data.unlimited ? allowance : { ...allowance, remaining_attempts: data.remainingAttempts },
    aiCost: data.aiCost || null,
    diagnostics: data.diagnostics || null,
    reviewItems: Array.isArray(data.reviewItems) ? data.reviewItems : [],
    translationRepair: translation.repaired ? {
      repaired: true,
      missingBefore: translation.missingBefore,
      aiCost: translation.aiCost,
    } : null,
  };
}
