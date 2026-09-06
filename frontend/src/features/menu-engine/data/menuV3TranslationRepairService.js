import { supabase } from "../../../lib/supabaseClient";

const LANGUAGES = ["en", "he", "ar"];

function text(value) {
  return value == null ? "" : String(value).trim();
}

function containsHebrew(value) {
  return /[\u0590-\u05ff]/.test(text(value));
}

function containsArabic(value) {
  return /[\u0600-\u06ff]/.test(text(value));
}

function isPlaceholderTranslation(value) {
  const next = text(value);
  if (!next) return true;
  if (!/[\p{L}\p{N}]/u.test(next)) return true;
  const normalized = next
    .replace(/[\s\u200e\u200f]/g, "")
    .replace(/[.!?…,:;\-–—_'"`()\[\]{}]/g, "");
  return normalized.length === 0;
}

function hasSuspiciousPlaceholderFragment(value, source = "") {
  const next = text(value);
  const original = text(source);
  if (!next) return false;

  // A model sometimes translates only part of a sentence and substitutes a word
  // or phrase with "..."/"…". This used to pass because the rest of the sentence
  // contained valid letters. Treat it as unresolved unless the source itself used
  // an ellipsis in that place/context.
  const targetHasEllipsis = /(?:\.{3,}|…{1,})/.test(next);
  const sourceHasEllipsis = /(?:\.{3,}|…{1,})/.test(original);
  if (targetHasEllipsis && !sourceHasEllipsis) return true;

  // Also reject obvious replacement-marker runs emitted by failed translation.
  if (/(?:\?{3,}|-{3,}|_{3,})/.test(next) && !/(?:\?{3,}|-{3,}|_{3,})/.test(original)) return true;
  return false;
}

function wrongScript(value, targetLanguage) {
  const next = text(value);
  if (!next || isPlaceholderTranslation(next)) return true;
  if (targetLanguage === "ar") return containsHebrew(next);
  if (targetLanguage === "he") return containsArabic(next);
  if (targetLanguage === "en") return containsHebrew(next) || containsArabic(next);
  return false;
}

export function translationLooksValid(value, targetLanguage, source = "") {
  const next = text(value);
  if (!next || isPlaceholderTranslation(next)) return false;
  if (hasSuspiciousPlaceholderFragment(next, source)) return false;
  return !wrongScript(next, targetLanguage);
}

export function translationQualityIssue(value, targetLanguage, source = "") {
  const next = text(value);
  if (!next) return "missing";
  if (isPlaceholderTranslation(next)) return "placeholder";
  if (hasSuspiciousPlaceholderFragment(next, source)) return "partial-placeholder";
  if (wrongScript(next, targetLanguage)) return "wrong-script";
  return "";
}

function sourceFor(localized, targetLanguage) {
  const value = localized && typeof localized === "object" ? localized : {};
  for (const code of ["en", "he", "ar"]) {
    if (code === targetLanguage) continue;
    const candidate = text(value[code]);
    if (candidate && !isPlaceholderTranslation(candidate)) return candidate;
  }
  return "";
}

function needsRepair(localized, targetLanguage) {
  const value = localized && typeof localized === "object" ? localized : {};
  const current = text(value[targetLanguage]);
  const source = sourceFor(value, targetLanguage);
  if (!source) return false;
  return !translationLooksValid(current, targetLanguage, source);
}

function collectLocalizedField(fields, path, localized, kind, languages) {
  languages.forEach((language) => {
    if (!needsRepair(localized, language)) return;
    const source = sourceFor(localized, language);
    if (!source) return;
    fields.push({
      key: `${path}.${language}`,
      source,
      targetLanguage: language,
      kind,
      issue: translationQualityIssue(localized?.[language], language, source),
    });
  });
}

export function collectV3TranslationRepairFields(menu = {}) {
  const configured = Array.isArray(menu?.languages)
    ? menu.languages.filter((code) => LANGUAGES.includes(code))
    : [];
  // Content Studio supports EN/HE/AR. Validate all three whenever multilingual
  // localized fields exist, even if an older menu saved an incomplete languages array.
  const languages = [...new Set(configured.length ? [...configured, ...LANGUAGES] : LANGUAGES)];

  const fields = [];
  (menu.groups || []).forEach((group, groupIndex) => {
    collectLocalizedField(fields, `groups.${groupIndex}.name`, group?.name, "category name", languages);
    collectLocalizedField(fields, `groups.${groupIndex}.note`, group?.note, "category note", languages);
  });

  (menu.items || []).forEach((item, itemIndex) => {
    collectLocalizedField(fields, `items.${itemIndex}.name`, item?.name, "menu item name", languages);
    collectLocalizedField(fields, `items.${itemIndex}.description`, item?.description, "menu item description", languages);

    const options = Array.isArray(item?.price_options) ? item.price_options : [];
    options.forEach((option, optionIndex) => {
      const localized = {
        en: text(option?.label_en),
        he: text(option?.label_he),
        ar: text(option?.label_ar),
      };
      collectLocalizedField(fields, `items.${itemIndex}.price_options.${optionIndex}.label`, localized, "price option label", languages);
    });
  });

  return fields;
}

function setLocalizedPath(menu, key, value) {
  const parts = String(key || "").split(".");
  if (parts[0] === "groups") {
    const groupIndex = Number(parts[1]);
    const field = parts[2];
    const language = parts[3];
    if (!Number.isInteger(groupIndex) || !language || !menu.groups?.[groupIndex]) return;
    if (field !== "name" && field !== "note") return;
    const group = menu.groups[groupIndex];
    group[field] = { ...(group[field] || {}), [language]: value };
    return;
  }

  if (parts[0] !== "items") return;
  const itemIndex = Number(parts[1]);
  if (!Number.isInteger(itemIndex) || !menu.items?.[itemIndex]) return;
  const item = menu.items[itemIndex];

  if (parts[2] === "name" || parts[2] === "description") {
    const field = parts[2];
    const language = parts[3];
    if (!language) return;
    item[field] = { ...(item[field] || {}), [language]: value };
    return;
  }

  if (parts[2] === "price_options") {
    const optionIndex = Number(parts[3]);
    const language = parts[5];
    const option = item.price_options?.[optionIndex];
    if (!option || !language) return;
    option[`label_${language}`] = value;
    if (!option.label) option.label = option.label_en || option.label_he || option.label_ar || "";
  }
}

function parseFunctionError(error) {
  return error?.message || "Could not repair menu translations.";
}

export async function repairV3MenuTranslations({ session, projectId, menu }) {
  if (!session?.access_token || !projectId || !menu) return { menu, repaired: false, repairedCount: 0, issues: [] };
  const fields = collectV3TranslationRepairFields(menu);
  if (!fields.length) return { menu, repaired: false, repairedCount: 0, issues: [] };

  const { data, error } = await supabase.functions.invoke("menu-ai-v3-translate-fields", {
    body: { projectId, fields },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(parseFunctionError(error));
  if (!data?.ok || !Array.isArray(data?.translations)) throw new Error(data?.error || "Could not repair menu translations.");

  const next = typeof structuredClone === "function" ? structuredClone(menu) : JSON.parse(JSON.stringify(menu));

  data.translations.forEach((entry) => {
    const translated = text(entry?.text);
    const field = fields.find((candidate) => candidate.key === entry?.key);
    if (!field || !translationLooksValid(translated, field.targetLanguage, field.source)) return;
    setLocalizedPath(next, entry?.key, translated);
  });

  const remaining = collectV3TranslationRepairFields(next);
  return {
    menu: next,
    repaired: data.translations.length > 0 && remaining.length < fields.length,
    repairedCount: fields.length - remaining.length,
    issues: remaining,
  };
}
