export const STUDIO_UI_LANGUAGE_KEY = "beyond-menu-studio-ui-language-v1";

export const STUDIO_LANGUAGES = Object.freeze([
  { code: "en", label: "English", nativeLabel: "English", short: "EN", dir: "ltr" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית", short: "HE", dir: "rtl" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", short: "AR", dir: "rtl" },
]);

export function isStudioLanguage(value) {
  return STUDIO_LANGUAGES.some((language) => language.code === value);
}

function syncDocumentStudioLanguage(language) {
  if (typeof document === "undefined" || !isStudioLanguage(language)) return;
  document.documentElement.lang = language;
}

export function readStudioLanguage(fallback = "en") {
  const safeFallback = isStudioLanguage(fallback) ? fallback : "en";
  if (typeof window === "undefined") return safeFallback;

  let language = safeFallback;
  try {
    const stored = window.localStorage.getItem(STUDIO_UI_LANGUAGE_KEY);
    language = isStudioLanguage(stored) ? stored : safeFallback;
  } catch {
    language = safeFallback;
  }

  syncDocumentStudioLanguage(language);
  return language;
}

export function writeStudioLanguage(language) {
  if (typeof window === "undefined" || !isStudioLanguage(language)) return;

  // Keep components that read the document locale in sync with the Studio
  // language immediately. This includes the Photo / Beyond AI workspace.
  syncDocumentStudioLanguage(language);

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
