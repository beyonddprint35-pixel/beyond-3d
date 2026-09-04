import { normalizeMenuDesign } from "./designSchema";
import { PREMIUM_MENU_DESIGNS as CORE_MENU_DESIGNS } from "./premiumMenuDesignLibrary";
import { PHASE3_MENU_DESIGNS } from "./premiumMenuDesignLibraryPhase3";
import { PHASE4_MENU_DESIGNS } from "./premiumMenuDesignLibraryPhase4";
import { CLINIC_MENU_DESIGNS } from "./premiumMenuDesignLibraryClinics";
import { applyMenuDesignPresentationProfiles } from "./menuDesignPresentationProfiles";

const MENU_DESIGN_LIBRARY = [
  ...CORE_MENU_DESIGNS,
  ...PHASE3_MENU_DESIGNS,
  ...PHASE4_MENU_DESIGNS,
  ...CLINIC_MENU_DESIGNS,
];

export const PREMIUM_MENU_DESIGNS = Object.freeze(
  applyMenuDesignPresentationProfiles(MENU_DESIGN_LIBRARY).map((entry) => ({
    ...entry,
    industry: entry.industry || "restaurant",
  })),
);

export function findMatchingMenuDesign(design) {
  return PREMIUM_MENU_DESIGNS.find(({ design: preset }) => {
    if (!design || (preset.template && design.template !== preset.template)) return false;
    if (preset.styleVariant && design.styleVariant !== preset.styleVariant) return false;
    return ["theme", "typography", "layout", "brand", "badges"].every((section) =>
      Object.entries(preset[section] || {}).every(([key, value]) => design[section]?.[key] === value),
    );
  });
}

export function applyPremiumMenuDesign(currentDesign, libraryId) {
  const entry = PREMIUM_MENU_DESIGNS.find((item) => item.id === libraryId);
  if (!entry) return normalizeMenuDesign(currentDesign);

  const preset = entry.design;
  return normalizeMenuDesign({
    ...currentDesign,
    ...preset,
    theme: { ...currentDesign?.theme, ...preset.theme },
    typography: { ...currentDesign?.typography, ...preset.typography },
    // Presentation is a structural library choice. Reset it before applying
    // another design so one experience family never leaks into another preset.
    layout: { ...currentDesign?.layout, presentation: "standard", ...preset.layout },
    brand: { ...currentDesign?.brand, ...preset.brand },
    badges: { ...currentDesign?.badges, ...preset.badges },
  });
}
