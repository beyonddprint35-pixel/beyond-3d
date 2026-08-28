import { normalizeMenuDesign } from "./designSchema";
import { PREMIUM_MENU_DESIGNS } from "./premiumMenuDesignLibrary";

export { PREMIUM_MENU_DESIGNS };

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
    // another design so phase-two layouts never leak into a different preset.
    layout: { ...currentDesign?.layout, presentation: "standard", ...preset.layout },
    brand: { ...currentDesign?.brand, ...preset.brand },
    badges: { ...currentDesign?.badges, ...preset.badges },
  });
}
