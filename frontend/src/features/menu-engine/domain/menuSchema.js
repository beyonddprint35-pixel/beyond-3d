export const MENU_SCHEMA_VERSION = 1;

export const SUPPORTED_MENU_LANGUAGES = Object.freeze(["en", "he", "ar"]);

export const MENU_LANGUAGE_META = Object.freeze({
  en: { label: "English", dir: "ltr" },
  he: { label: "עברית", dir: "rtl" },
  ar: { label: "العربية", dir: "rtl" },
});

export function createEmptyMenuDocument({
  siteId = null,
  restaurantName = "",
  defaultLanguage = "en",
  languages = [defaultLanguage],
} = {}) {
  const normalizedLanguages = [...new Set(languages)]
    .filter(language => SUPPORTED_MENU_LANGUAGES.includes(language));

  return {
    schemaVersion: MENU_SCHEMA_VERSION,
    siteId,
    restaurant: {
      name: restaurantName,
    },
    defaultLanguage: SUPPORTED_MENU_LANGUAGES.includes(defaultLanguage)
      ? defaultLanguage
      : "en",
    languages: normalizedLanguages.length ? normalizedLanguages : ["en"],
    groups: [],
    items: [],
  };
}

export function normalizeMenuDocument(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};

  const defaultLanguage = SUPPORTED_MENU_LANGUAGES.includes(source.defaultLanguage)
    ? source.defaultLanguage
    : "en";

  const languages = Array.isArray(source.languages)
    ? [...new Set(source.languages)].filter(language =>
        SUPPORTED_MENU_LANGUAGES.includes(language)
      )
    : [];

  return {
    schemaVersion: MENU_SCHEMA_VERSION,
    siteId: source.siteId || null,
    restaurant: {
      name: String(source.restaurant?.name || ""),
    },
    defaultLanguage,
    languages: languages.length ? languages : [defaultLanguage],
    groups: Array.isArray(source.groups) ? source.groups : [],
    items: Array.isArray(source.items) ? source.items : [],
  };
}

export function menuDirection(language) {
  return MENU_LANGUAGE_META[language]?.dir || "ltr";
}
