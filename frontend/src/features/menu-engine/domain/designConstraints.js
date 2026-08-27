export const MENU_VIEWPORTS = Object.freeze({
  mobileSmall: 320,
  mobile: 375,
  mobileLarge: 430,
  tablet: 768,
  desktop: 1024,
});

export const MENU_DESIGN_CONSTRAINTS = Object.freeze({
  typography: {
    brandSize: { min: 14, max: 28 },
    heroSize: { min: 28, max: 64 },
    sectionSize: { min: 24, max: 48 },
    categorySize: { min: 11, max: 18 },
    itemNameSize: { min: 14, max: 26 },
    descriptionSize: { min: 11, max: 20 },
    priceSize: { min: 14, max: 26 },
  },
  spacing: {
    sectionGap: { min: 16, max: 64 },
    itemGap: { min: 8, max: 32 },
    cardPadding: { min: 10, max: 32 },
  },
  radius: {
    min: 0,
    max: 32,
  },
  imageRatios: ["1:1", "4:3", "3:2", "16:9"],
  itemImagePositions: ["top", "left", "right"],
  pricePositions: ["inline", "below", "bottom"],
});

export function clampDesignNumber(value, constraint, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(constraint.max, Math.max(constraint.min, number));
}

export function isAllowedDesignValue(value, allowedValues) {
  return allowedValues.includes(value);
}
