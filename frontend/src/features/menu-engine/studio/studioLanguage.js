export const STUDIO_UI_LANGUAGE_KEY = "beyond-menu-studio-ui-language-v1";

export const STUDIO_LANGUAGES = Object.freeze([
  { code: "en", label: "English", nativeLabel: "English", short: "EN", dir: "ltr" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית", short: "HE", dir: "rtl" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", short: "AR", dir: "rtl" },
]);

export function isStudioLanguage(value) {
  return STUDIO_LANGUAGES.some((language) => language.code === value);
}

export function readStudioLanguage(fallback = "en") {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(STUDIO_UI_LANGUAGE_KEY);
    return isStudioLanguage(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeStudioLanguage(language) {
  if (typeof window === "undefined" || !isStudioLanguage(language)) return;
  try {
    window.localStorage.setItem(STUDIO_UI_LANGUAGE_KEY, language);
    window.dispatchEvent(new CustomEvent("beyond-studio-language-change", {
      detail: { language },
    }));
  } catch {
    // Language persistence is a convenience, never a blocker.
  }
}

export function studioLanguageDirection(language) {
  return language === "he" || language === "ar" ? "rtl" : "ltr";
}

export function studioLanguageMeta(language) {
  return STUDIO_LANGUAGES.find((entry) => entry.code === language) || STUDIO_LANGUAGES[0];
}
