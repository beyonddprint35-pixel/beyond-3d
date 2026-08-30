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

function containsLatin(value) {
  return /[A-Za-z]/.test(text(value));
}

function wrongScript(value, targetLanguage) {
  const next = text(value);
  if (!next) return true;
  if (targetLanguage === "ar") return containsHebrew(next);
  if (targetLanguage === "he") return containsArabic(next);
  if (targetLanguage === "en") return containsHebrew(next) || containsArabic(next);
  return false;
}

function sourceFor(localized, targetLanguage) {
  const value = localized && typeof localized === "object" ? localized : {};
  const preferences = targetLanguage === "en" ? ["en", "he", "ar"] : ["en", "he", "ar"];
  for (const code of preferences) {
    if (code === targetLanguage) continue;
    const candidate = text(value[code]);
    if (candidate) return candidate;
  }
  return "";
}

function needsRepair(localized, targetLanguage) {
  const value = localized && typeof localized === "object" ? localized : {};
  const current = text(value[targetLanguage]);
  const source = sourceFor(value, targetLanguage);
  if (!source) return false;
  return wrongScript(current, targetLanguage);
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
    });
  });
}

export function collectV3TranslationRepairFields(menu = {}) {
  const languages = Array.isArray(menu?.languages)
    ? [...new Set(menu.languages.filter((code) => LANGUAGES.includes(code)))]
    : [];
  if (!languages.length) return [];

  const fields = [];
  (menu.groups || []).forEach((group, groupIndex) => {
    collectLocalizedField(fields, `groups.${groupIndex}.name`, group?.name, "category name", languages);
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
    const language = parts[3];
    if (!Number.isInteger(groupIndex) || !language || !menu.groups?.[groupIndex]) return;
    const group = menu.groups[groupIndex];
    group.name = { ...(group.name || {}), [language]: value };
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
  if (!session?.access_token || !projectId || !menu) return { menu, repaired: false, repairedCount: 0 };
  const fields = collectV3TranslationRepairFields(menu);
  if (!fields.length) return { menu, repaired: false, repairedCount: 0 };

  const { data, error } = await supabase.functions.invoke("menu-ai-v3-translate-fields", {
    body: { projectId, fields },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(parseFunctionError(error));
  if (!data?.ok || !Array.isArray(data?.translations)) throw new Error(data?.error || "Could not repair menu translations.");

  const next = typeof structuredClone === "function"
    ? structuredClone(menu)
    : JSON.parse(JSON.stringify(menu));
  data.translations.forEach((entry) => {
    const translated = text(entry?.text);
    if (translated) setLocalizedPath(next, entry?.key, translated);
  });

  const remaining = collectV3TranslationRepairFields(next);
  if (remaining.length) throw new Error(`Could not repair ${remaining.length} menu language fields.`);

  return { menu: next, repaired: true, repairedCount: data.translations.length };
}
