import { DEFAULT_MENU_DESIGN } from "../domain/designSchema";
import { PREMIUM_MENU_DESIGNS, applyPremiumMenuDesign } from "../domain/menuDesignLibrary";
import { normalizeV3MenuPriceOptions } from "../data/aiMenuImportAdapter";
import { queueMenuStudioProjectSave } from "./menuStudioV2Persistence";
import { readStudioLanguage } from "./studioLanguage";

export const MENU_STUDIO_V2_DRAFT_KEY = "beyond-menu-content-studio-v2";
export const MENU_CREATE_V2_FLOW_KEY = "beyond-menu-create-profile-v2";
export const MENU_CREATE_V2_DESIGN_KEY = "beyond-menu-recommended-design-v2";

let lastWrittenSignature = "";
let lastWrittenJSON = "";

export function makeLocalizedText(en = "", he = "", ar = "") {
  return { en, he, ar };
}

export function createBlankMenuV2() {
  return {
    restaurant_name: "My Restaurant",
    restaurant_subtitle: makeLocalizedText("Restaurant menu", "תפריט מסעדה", "قائمة المطعم"),
    hero_eyebrow: makeLocalizedText("Welcome", "ברוכים הבאים", "أهلاً وسهلاً"),
    hero_title: makeLocalizedText("Made for your table", "נוצר עבור השולחן שלכם", "صُممت لطاولتكم"),
    languages: ["en", "he", "ar"],
    default_language: "en",
    currency_symbol: "₪",
    groups: [
      {
        id: "group-main",
        name: makeLocalizedText("Main menu", "תפריט ראשי", "القائمة الرئيسية"),
        sort_order: 0,
        visible: true,
      },
    ],
    items: [
      {
        id: "item-example",
        group_id: "group-main",
        name: makeLocalizedText("Your first item", "הפריט הראשון שלכם", "أول صنف لديكم"),
        description: makeLocalizedText(
          "Click this item in Content Studio to edit it.",
          "לחצו על הפריט כדי לערוך אותו.",
          "اضغطوا على هذا الصنف في استوديو المحتوى لتعديله.",
        ),
        price: "42",
        price_options: [],
        visible: true,
        sort_order: 0,
        image_url: "",
      },
    ],
  };
}

export function readMenuStudioV2Draft() {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(MENU_STUDIO_V2_DRAFT_KEY) || "null");
    if (stored?.menu?.groups && stored?.menu?.items) {
      const uiLanguage = readStudioLanguage(
        stored.contentLanguage || stored.menu.default_language || "en",
      );
      return {
        ...stored,
        // Stage components historically use contentLanguage as their initial UI
        // language. Resolve it from the immediate Studio preference so changing
        // EN / HE / AR cannot snap back while moving between stages before a
        // debounced draft save finishes.
        contentLanguage: uiLanguage,
        menu: normalizeV3MenuPriceOptions(stored.menu),
      };
    }
  } catch {
    // Ignore malformed development drafts.
  }
  return null;
}

export function writeMenuStudioV2Draft(draft, { queueSave = true } = {}) {
  if (typeof window === "undefined") return false;
  try {
    const normalizedDraft = draft?.menu
      ? { ...draft, menu: normalizeV3MenuPriceOptions(draft.menu) }
      : draft;
    // Navigation flushes should not create a cloud write when nothing changed.
    const withoutTimestamp = ({ savedAt: _savedAt, ...value } = {}) => {
      if (value.publication) {
        const { savedAt: _publicationSavedAt, ...publication } = value.publication;
        return { ...value, publication };
      }
      return value;
    };
    const signature = JSON.stringify(withoutTimestamp(normalizedDraft));
    // Only deduplicate writes handled in this page session; a browser copy
    // restored after a reload may still need its first cloud save.
    if (signature === lastWrittenSignature && window.sessionStorage.getItem(MENU_STUDIO_V2_DRAFT_KEY) === lastWrittenJSON) return true;
    const savedDraft = { ...normalizedDraft, savedAt: new Date().toISOString() };
    const savedJSON = JSON.stringify(savedDraft);
    window.sessionStorage.setItem(MENU_STUDIO_V2_DRAFT_KEY, savedJSON);
    if (queueSave) queueMenuStudioProjectSave(savedDraft);
    lastWrittenSignature = signature;
    lastWrittenJSON = savedJSON;
    return true;
  } catch {
    return false;
  }
}

export function readMenuCreateV2Profile() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(MENU_CREATE_V2_FLOW_KEY) || "null");
  } catch {
    return null;
  }
}

export function resolveMenuStudioV2Design(draft, requestedDesignId = "") {
  const designId = requestedDesignId || draft?.designId || (() => {
    if (typeof window === "undefined") return "";
    try { return window.sessionStorage.getItem(MENU_CREATE_V2_DESIGN_KEY) || ""; } catch { return ""; }
  })();
  const entry = PREMIUM_MENU_DESIGNS.find((item) => item.id === designId)
    || PREMIUM_MENU_DESIGNS.find((item) => item.id === "heritage-original")
    || PREMIUM_MENU_DESIGNS[0];
  return {
    designId: entry?.id || designId,
    entry,
    design: draft?.design || applyPremiumMenuDesign(DEFAULT_MENU_DESIGN, entry?.id),
    baselineDesign: applyPremiumMenuDesign(DEFAULT_MENU_DESIGN, entry?.id),
  };
}
