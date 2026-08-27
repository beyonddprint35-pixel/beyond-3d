import {
  MENU_DESIGN_CONSTRAINTS,
  clampDesignNumber,
  isAllowedDesignValue,
} from "./designConstraints";

export const MENU_DESIGN_SCHEMA_VERSION = 1;

export const MENU_TEMPLATE_FAMILIES = Object.freeze([
  "classic",
  "visual",
]);

export const MENU_BADGE_ICON_STYLES = Object.freeze([
  "auto",
  "minimal",
  "filled",
  "playful",
]);

export const DEFAULT_MENU_DESIGN = Object.freeze({
  schemaVersion: MENU_DESIGN_SCHEMA_VERSION,
  template: "classic",
  theme: {
    background: "#f6f4ef",
    surface: "#fffdf8",
    card: "#ffffff",
    text: "#121212",
    muted: "#7b756e",
    accent: "#556b2f",
    accentSecondary: "#d8c79b",
    line: "#e5ded2",
  },
  typography: {
    headingFont: "Playfair Display",
    bodyFont: "Inter",
    numberFont: "Playfair Display",
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
  badges: {
    showSymbols: true,
    iconStyle: "auto",
  },
});

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function normalizeMenuDesign(value = {}) {
  const source = objectOrEmpty(value);
  const sourceTheme = objectOrEmpty(source.theme);
  const sourceTypography = objectOrEmpty(source.typography);
  const sourceLayout = objectOrEmpty(source.layout);
  const sourceBadges = objectOrEmpty(source.badges);

  const template = MENU_TEMPLATE_FAMILIES.includes(source.template)
    ? source.template
    : DEFAULT_MENU_DESIGN.template;

  return {
    schemaVersion: MENU_DESIGN_SCHEMA_VERSION,
    template,
    theme: {
      ...DEFAULT_MENU_DESIGN.theme,
      ...sourceTheme,
    },
    typography: {
      ...DEFAULT_MENU_DESIGN.typography,
      ...sourceTypography,
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
      itemImagePosition: isAllowedDesignValue(sourceLayout.itemImagePosition, MENU_DESIGN_CONSTRAINTS.itemImagePositions) ? sourceLayout.itemImagePosition : DEFAULT_MENU_DESIGN.layout.itemImagePosition,
      itemImageRatio: isAllowedDesignValue(sourceLayout.itemImageRatio, MENU_DESIGN_CONSTRAINTS.imageRatios) ? sourceLayout.itemImageRatio : DEFAULT_MENU_DESIGN.layout.itemImageRatio,
      pricePosition: isAllowedDesignValue(sourceLayout.pricePosition, MENU_DESIGN_CONSTRAINTS.pricePositions) ? sourceLayout.pricePosition : DEFAULT_MENU_DESIGN.layout.pricePosition,
      cardRadius: clampDesignNumber(sourceLayout.cardRadius, MENU_DESIGN_CONSTRAINTS.radius, DEFAULT_MENU_DESIGN.layout.cardRadius),
      sectionGap: clampDesignNumber(sourceLayout.sectionGap, MENU_DESIGN_CONSTRAINTS.spacing.sectionGap, DEFAULT_MENU_DESIGN.layout.sectionGap),
      itemGap: clampDesignNumber(sourceLayout.itemGap, MENU_DESIGN_CONSTRAINTS.spacing.itemGap, DEFAULT_MENU_DESIGN.layout.itemGap),
      cardPadding: clampDesignNumber(sourceLayout.cardPadding, MENU_DESIGN_CONSTRAINTS.spacing.cardPadding, DEFAULT_MENU_DESIGN.layout.cardPadding),
    },
    badges: {
      showSymbols: sourceBadges.showSymbols !== false,
      iconStyle: MENU_BADGE_ICON_STYLES.includes(sourceBadges.iconStyle)
        ? sourceBadges.iconStyle
        : DEFAULT_MENU_DESIGN.badges.iconStyle,
    },
  };
}
