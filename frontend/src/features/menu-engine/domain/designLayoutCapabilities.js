const VISUAL_TEMPLATES = new Set(["visual", "gallery", "tiles", "split"]);

// These presentations intentionally own the item/price composition. Exposing a
// free price-position control for them would be misleading because the price is
// part of the signature layout (overlay, ledger column, dock, etc.).
const FIXED_PRICE_PRESENTATIONS = new Set([
  "heritage-classic",
  "photo-story",
  "butcher-ledger",
  "garden-journal",
  "bakery-counter",
  "brunch-polaroids",
  "rose-lounge",
  "luxury-steak",
  "smokehouse-story",
  "dessert-magazine",
  "tapas-collage",
  "street-poster",
]);

export function getMenuLayoutCapabilities(design = {}) {
  const presentation = design?.layout?.presentation || "standard";
  const visualTemplate = VISUAL_TEMPLATES.has(design?.template);
  const standard = presentation === "standard";
  const heritage = presentation === "heritage-classic";

  // Standard layouts are intentionally flexible. Their controls are backed by
  // shared renderer variables/classes and should always produce a visible
  // result. Card/image controls only make sense for visual card templates.
  if (standard) {
    return {
      presentation,
      structural: false,
      density: true,
      navigation: true,
      price: true,
      imagePosition: visualTemplate,
      imageRatio: visualTemplate,
      cardRadius: visualTemplate,
      sectionGap: true,
      itemGap: visualTemplate,
      cardPadding: visualTemplate,
    };
  }

  // Heritage is an exact legacy shell. Its geometry is part of the approved
  // composition, so generic layout sliders must not pretend to change it.
  if (heritage) {
    return {
      presentation,
      structural: true,
      density: false,
      navigation: false,
      price: false,
      imagePosition: false,
      imageRatio: false,
      cardRadius: false,
      sectionGap: false,
      itemGap: false,
      cardPadding: false,
    };
  }

  // Signature presentations own their density, navigation, image geometry and
  // spacing. Price position remains flexible unless the presentation places it
  // as a structural part of the composition.
  return {
    presentation,
    structural: true,
    density: false,
    navigation: false,
    price: !FIXED_PRICE_PRESENTATIONS.has(presentation),
    imagePosition: false,
    imageRatio: false,
    cardRadius: false,
    sectionGap: false,
    itemGap: false,
    cardPadding: false,
  };
}

export function hasAnyMenuLayoutCapability(capabilities = {}) {
  return [
    "density",
    "navigation",
    "price",
    "imagePosition",
    "imageRatio",
    "cardRadius",
    "sectionGap",
    "itemGap",
    "cardPadding",
  ].some((key) => Boolean(capabilities[key]));
}
