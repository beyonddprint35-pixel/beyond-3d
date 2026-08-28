import {
  MENU_DESIGN_CONSTRAINTS,
  clampDesignNumber,
  isAllowedDesignValue,
} from "./designConstraints";

export const MENU_DESIGN_SCHEMA_VERSION = 4;

export const MENU_TEMPLATE_FAMILIES = Object.freeze([
  "classic",
  "visual",
  "editorial",
  "ledger",
  "split",
  "gallery",
  "tiles",
]);
export const MENU_STYLE_VARIANTS = Object.freeze(["standard", "heritage"]);
export const MENU_BADGE_ICON_STYLES = Object.freeze(["auto", "minimal", "filled", "playful"]);
export const MENU_DENSITIES = Object.freeze(["compact", "comfortable", "spacious"]);
export const MENU_NAVIGATION_STYLES = Object.freeze(["pills", "underline", "minimal"]);
export const MENU_FONT_WEIGHTS = Object.freeze([400, 500, 600, 700, 800]);
export const MENU_FONT_FAMILIES = Object.freeze([
  "Inter",
  "Playfair Display",
  "DM Sans",
  "Montserrat",
  "Poppins",
  "Lora",
  "Merriweather",
  "Rubik",
  "Assistant",
  "Heebo",
  "Noto Sans Hebrew",
  "Noto Sans Arabic",
]);

export const DEFAULT_MENU_DESIGN = Object.freeze({
  schemaVersion: MENU_DESIGN_SCHEMA_VERSION,
  template: "classic",
  styleVariant: "standard",
  theme: {
    background: "#f6f4ef",
    surface: "#fffdf8",
    card: "#ffffff",
    text: "#121212",
    muted: "#7b756e",
    accent: "#556b2f",
    accentSecondary: "#d8c79b",
    line: "#e5ded2",
    categoryBackground: "#111111",
    categoryText: "#ffffff",
  },
  typography: {
    headingFont: "Playfair Display",
    bodyFont: "Inter",
    numberFont: "Playfair Display",
    headingWeight: 700,
    bodyWeight: 400,
    itemWeight: 700,
    brandSize: 19,
    heroSize: 46,
    sectionSize: 38,
    categorySize: 11,
    itemNameSize: 16,
    descriptionSize: 11,
    priceSize: 16,
  },
  layout: {
    density: "comfortable",
    navigationStyle: "pills",
    itemImagePosition: "top",
    itemImageRatio: "4:3",
    pricePosition: "inline",
    cardRadius: 16,
    sectionGap: 32,
    itemGap: 16,
    cardPadding: 16,
  },
  brand: {
    logoSize: 44,
    logoShape: "free",
    heroMediaMode: "watermark",
    heroImageUrl: "",
  },
  badges: {
    showSymbols: true,
    iconStyle: "auto",
  },
});

export const MENU_COLOR_PRESETS = Object.freeze({
  olive: { label: "Olive", theme: { background: "#f6f4ef", surface: "#fffdf8", card: "#ffffff", text: "#121212", muted: "#7b756e", accent: "#556b2f", accentSecondary: "#d8c79b", line: "#e5ded2", categoryBackground: "#111111", categoryText: "#ffffff" } },
  bistro: { label: "Bistro", theme: { background: "#f7f1e8", surface: "#fffaf2", card: "#fffdf8", text: "#241d18", muted: "#7d7066", accent: "#8a3f2d", accentSecondary: "#d7b08b", line: "#eadfd4", categoryBackground: "#8a3f2d", categoryText: "#ffffff" } },
  midnight: { label: "Midnight", theme: { background: "#121722", surface: "#171e2b", card: "#1d2635", text: "#f6f7fb", muted: "#aab3c2", accent: "#d5ad65", accentSecondary: "#485872", line: "#2b3545", categoryBackground: "#d5ad65", categoryText: "#121722" } },
  mediterranean: { label: "Mediterranean", theme: { background: "#f7f4ec", surface: "#fffdf8", card: "#ffffff", text: "#183447", muted: "#71808a", accent: "#2e6d75", accentSecondary: "#d9b77d", line: "#dfe4df", categoryBackground: "#2e6d75", categoryText: "#ffffff" } },
  minimal: { label: "Minimal", theme: { background: "#ffffff", surface: "#ffffff", card: "#ffffff", text: "#111111", muted: "#747474", accent: "#111111", accentSecondary: "#ececec", line: "#e8e8e8", categoryBackground: "#111111", categoryText: "#ffffff" } },
  cafe: { label: "Café", theme: { background: "#f4eee7", surface: "#fffaf5", card: "#fffdf9", text: "#332820", muted: "#84746a", accent: "#795548", accentSecondary: "#c8a985", line: "#e5d8cc", categoryBackground: "#795548", categoryText: "#ffffff" } },
});

export const MENU_DESIGN_PRESETS = Object.freeze({
  heritage_classic: {
    template: "classic",
    styleVariant: "heritage",
    theme: {
      background: "#f6f4ef",
      surface: "#fffdf8",
      card: "#ffffff",
      text: "#121212",
      muted: "#7b756e",
      accent: "#556b2f",
      accentSecondary: "#d8c79b",
      line: "#e5ded2",
      categoryBackground: "#111111",
      categoryText: "#ffffff",
    },
    typography: { headingFont: "Playfair Display", bodyFont: "Inter", numberFont: "Playfair Display", headingWeight: 800, bodyWeight: 400, itemWeight: 700, brandSize: 19, heroSize: 46, sectionSize: 38, categorySize: 11, itemNameSize: 16, descriptionSize: 11, priceSize: 16 },
    layout: { density: "comfortable", navigationStyle: "pills", pricePosition: "inline", cardRadius: 19, sectionGap: 20, itemGap: 9, cardPadding: 15 },
    brand: { heroMediaMode: "watermark" },
  },
  editorial: {
    template: "editorial",
    styleVariant: "standard",
    typography: { headingFont: "Playfair Display", bodyFont: "Inter", numberFont: "Playfair Display", headingWeight: 700, bodyWeight: 400, itemWeight: 700, heroSize: 58, sectionSize: 42, itemNameSize: 17 },
    layout: { density: "spacious", navigationStyle: "underline", pricePosition: "inline", cardRadius: 0, sectionGap: 40, itemGap: 18, cardPadding: 16 },
  },
  modern: {
    template: "visual",
    styleVariant: "standard",
    typography: { headingFont: "Inter", bodyFont: "Inter", numberFont: "Inter", headingWeight: 800, bodyWeight: 400, itemWeight: 700, heroSize: 42, sectionSize: 32, itemNameSize: 16 },
    layout: { density: "comfortable", navigationStyle: "pills", itemImagePosition: "top", itemImageRatio: "4:3", pricePosition: "bottom", cardRadius: 18, sectionGap: 28, itemGap: 16, cardPadding: 16 },
  },
  ledger: {
    template: "ledger",
    styleVariant: "standard",
    typography: { headingFont: "Merriweather", bodyFont: "DM Sans", numberFont: "Merriweather", headingWeight: 700, bodyWeight: 400, itemWeight: 700, heroSize: 44, sectionSize: 34, itemNameSize: 16 },
    layout: { density: "comfortable", navigationStyle: "minimal", pricePosition: "inline", cardRadius: 0, sectionGap: 28, itemGap: 12, cardPadding: 12 },
  },
  split: {
    template: "split",
    styleVariant: "standard",
    typography: { headingFont: "Lora", bodyFont: "DM Sans", numberFont: "DM Sans", headingWeight: 700, bodyWeight: 400, itemWeight: 700, heroSize: 52, sectionSize: 38, itemNameSize: 18 },
    layout: { density: "comfortable", navigationStyle: "pills", itemImagePosition: "left", itemImageRatio: "4:3", pricePosition: "below", cardRadius: 22, sectionGap: 34, itemGap: 22, cardPadding: 20 },
  },
  gallery: {
    template: "gallery",
    styleVariant: "standard",
    typography: { headingFont: "Playfair Display", bodyFont: "Inter", numberFont: "Inter", headingWeight: 700, bodyWeight: 400, itemWeight: 700, heroSize: 56, sectionSize: 38, itemNameSize: 18 },
    layout: { density: "spacious", navigationStyle: "underline", itemImagePosition: "top", itemImageRatio: "1:1", pricePosition: "below", cardRadius: 24, sectionGap: 42, itemGap: 22, cardPadding: 18 },
  },
  tiles: {
    template: "tiles",
    styleVariant: "standard",
    typography: { headingFont: "DM Sans", bodyFont: "DM Sans", numberFont: "DM Sans", headingWeight: 800, bodyWeight: 400, itemWeight: 700, heroSize: 44, sectionSize: 32, itemNameSize: 16 },
    layout: { density: "comfortable", navigationStyle: "pills", itemImagePosition: "top", itemImageRatio: "1:1", pricePosition: "inline", cardRadius: 24, sectionGap: 28, itemGap: 14, cardPadding: 15 },
  },
});

function objectOrEmpty(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function normalizeWeight(value, fallback) { const parsed = Number(value); return MENU_FONT_WEIGHTS.includes(parsed) ? parsed : fallback; }
function normalizeFont(value, fallback) { const name = String(value || "").trim(); return MENU_FONT_FAMILIES.includes(name) ? name : (name || fallback); }

export function normalizeMenuDesign(value = {}) {
  const source = objectOrEmpty(value);
  const sourceTheme = objectOrEmpty(source.theme);
  const sourceTypography = objectOrEmpty(source.typography);
  const sourceLayout = objectOrEmpty(source.layout);
  const sourceBrand = objectOrEmpty(source.brand);
  const sourceBadges = objectOrEmpty(source.badges);
  const template = MENU_TEMPLATE_FAMILIES.includes(source.template) ? source.template : DEFAULT_MENU_DESIGN.template;
  const styleVariant = MENU_STYLE_VARIANTS.includes(source.styleVariant) ? source.styleVariant : DEFAULT_MENU_DESIGN.styleVariant;

  return {
    schemaVersion: MENU_DESIGN_SCHEMA_VERSION,
    template,
    styleVariant,
    theme: { ...DEFAULT_MENU_DESIGN.theme, ...sourceTheme },
    typography: {
      ...DEFAULT_MENU_DESIGN.typography,
      ...sourceTypography,
      headingFont: normalizeFont(sourceTypography.headingFont, DEFAULT_MENU_DESIGN.typography.headingFont),
      bodyFont: normalizeFont(sourceTypography.bodyFont, DEFAULT_MENU_DESIGN.typography.bodyFont),
      numberFont: normalizeFont(sourceTypography.numberFont, DEFAULT_MENU_DESIGN.typography.numberFont),
      headingWeight: normalizeWeight(sourceTypography.headingWeight, DEFAULT_MENU_DESIGN.typography.headingWeight),
      bodyWeight: normalizeWeight(sourceTypography.bodyWeight, DEFAULT_MENU_DESIGN.typography.bodyWeight),
      itemWeight: normalizeWeight(sourceTypography.itemWeight, DEFAULT_MENU_DESIGN.typography.itemWeight),
      brandSize: clampDesignNumber(sourceTypography.brandSize, MENU_DESIGN_CONSTRAINTS.typography.brandSize, DEFAULT_MENU_DESIGN.typography.brandSize),
      heroSize: clampDesignNumber(sourceTypography.heroSize, MENU_DESIGN_CONSTRAINTS.typography.heroSize, DEFAULT_MENU_DESIGN.typography.heroSize),
      sectionSize: clampDesignNumber(sourceTypography.sectionSize, MENU_DESIGN_CONSTRAINTS.typography.sectionSize, DEFAULT_MENU_DESIGN.typography.sectionSize),
      categorySize: clampDesignNumber(sourceTypography.categorySize, MENU_DESIGN_CONSTRAINTS.typography.categorySize, DEFAULT_MENU_DESIGN.typography.categorySize),
      itemNameSize: clampDesignNumber(sourceTypography.itemNameSize, MENU_DESIGN_CONSTRAINTS.typography.itemNameSize, DEFAULT_MENU_DESIGN.typography.itemNameSize),
      descriptionSize: clampDesignNumber(sourceTypography.descriptionSize, MENU_DESIGN_CONSTRAINTS.typography.descriptionSize, DEFAULT_MENU_DESIGN.typography.descriptionSize),
      priceSize: clampDesignNumber(sourceTypography.priceSize, MENU_DESIGN_CONSTRAINTS.typography.priceSize, DEFAULT_MENU_DESIGN.typography.priceSize),
    },
    layout: {
      ...DEFAULT_MENU_DESIGN.layout,
      ...sourceLayout,
      density: MENU_DENSITIES.includes(sourceLayout.density) ? sourceLayout.density : DEFAULT_MENU_DESIGN.layout.density,
      navigationStyle: MENU_NAVIGATION_STYLES.includes(sourceLayout.navigationStyle) ? sourceLayout.navigationStyle : DEFAULT_MENU_DESIGN.layout.navigationStyle,
      itemImagePosition: isAllowedDesignValue(sourceLayout.itemImagePosition, MENU_DESIGN_CONSTRAINTS.itemImagePositions) ? sourceLayout.itemImagePosition : DEFAULT_MENU_DESIGN.layout.itemImagePosition,
      itemImageRatio: isAllowedDesignValue(sourceLayout.itemImageRatio, MENU_DESIGN_CONSTRAINTS.imageRatios) ? sourceLayout.itemImageRatio : DEFAULT_MENU_DESIGN.layout.itemImageRatio,
      pricePosition: isAllowedDesignValue(sourceLayout.pricePosition, MENU_DESIGN_CONSTRAINTS.pricePositions) ? sourceLayout.pricePosition : DEFAULT_MENU_DESIGN.layout.pricePosition,
      cardRadius: clampDesignNumber(sourceLayout.cardRadius, MENU_DESIGN_CONSTRAINTS.radius, DEFAULT_MENU_DESIGN.layout.cardRadius),
      sectionGap: clampDesignNumber(sourceLayout.sectionGap, MENU_DESIGN_CONSTRAINTS.spacing.sectionGap, DEFAULT_MENU_DESIGN.layout.sectionGap),
      itemGap: clampDesignNumber(sourceLayout.itemGap, MENU_DESIGN_CONSTRAINTS.spacing.itemGap, DEFAULT_MENU_DESIGN.layout.itemGap),
      cardPadding: clampDesignNumber(sourceLayout.cardPadding, MENU_DESIGN_CONSTRAINTS.spacing.cardPadding, DEFAULT_MENU_DESIGN.layout.cardPadding),
    },
    brand: {
      ...DEFAULT_MENU_DESIGN.brand,
      ...sourceBrand,
      logoSize: Math.max(24, Math.min(120, Number(sourceBrand.logoSize) || DEFAULT_MENU_DESIGN.brand.logoSize)),
      logoShape: ["free", "circle", "square", "rounded"].includes(sourceBrand.logoShape) ? sourceBrand.logoShape : DEFAULT_MENU_DESIGN.brand.logoShape,
      heroMediaMode: ["watermark", "image", "none"].includes(sourceBrand.heroMediaMode) ? sourceBrand.heroMediaMode : DEFAULT_MENU_DESIGN.brand.heroMediaMode,
      heroImageUrl: String(sourceBrand.heroImageUrl || ""),
    },
    badges: {
      showSymbols: sourceBadges.showSymbols !== false,
      iconStyle: MENU_BADGE_ICON_STYLES.includes(sourceBadges.iconStyle) ? sourceBadges.iconStyle : DEFAULT_MENU_DESIGN.badges.iconStyle,
    },
  };
}

export function applyMenuDesignPreset(currentDesign, presetKey) {
  const preset = MENU_DESIGN_PRESETS[presetKey];
  if (!preset) return normalizeMenuDesign(currentDesign);
  return normalizeMenuDesign({
    ...currentDesign,
    ...preset,
    theme: { ...currentDesign?.theme, ...preset.theme },
    typography: { ...currentDesign?.typography, ...preset.typography },
    layout: { ...currentDesign?.layout, ...preset.layout },
    brand: { ...currentDesign?.brand, ...preset.brand },
    badges: { ...currentDesign?.badges, ...preset.badges },
  });
}

export function applyMenuColorPreset(currentDesign, presetKey) {
  const preset = MENU_COLOR_PRESETS[presetKey];
  if (!preset) return normalizeMenuDesign(currentDesign);
  return normalizeMenuDesign({ ...currentDesign, theme: { ...currentDesign?.theme, ...preset.theme } });
}
