const PRESENTATION_PROFILES = Object.freeze({
  "atelier-editorial": {
    layout: "Atelier Editorial",
    presentation: "atelier",
    tags: ["atelier", "fashion editorial", "fine dining"],
  },
  "noir-gallery": {
    layout: "Noir Cinema Gallery",
    presentation: "noir-gallery",
    tags: ["cinematic", "noir gallery", "nightlife"],
  },
  "riviera-split": {
    layout: "Riviera Story",
    presentation: "riviera",
    tags: ["riviera", "mediterranean story", "alternating panels"],
  },
  "omakase-minimal": {
    layout: "Omakase Courses",
    presentation: "omakase",
    tags: ["omakase", "courses", "japanese minimal"],
  },
  "brasserie-ledger": {
    layout: "Brasserie Sheet",
    presentation: "brasserie",
    tags: ["brasserie", "menu sheet", "french bistro"],
  },
  "gallery-white": {
    layout: "White Gallery",
    presentation: "white-gallery",
    tags: ["white gallery", "photography", "clean showcase"],
  },
  "studio-cafe-tiles": {
    layout: "Café Cards",
    presentation: "cafe-cards",
    tags: ["cafe cards", "coffee shop", "friendly cards"],
  },
  "street-bold": {
    layout: "Street Poster",
    presentation: "street-poster",
    tags: ["street poster", "fast casual", "bold cards"],
  },
  "wine-book": {
    layout: "Wine Register",
    presentation: "wine-register",
    tags: ["wine register", "vintages", "sommelier list"],
  },
  "coastal-split": {
    layout: "Coastal Story",
    presentation: "coastal-story",
    tags: ["coastal story", "beach", "image panels"],
  },
  "monochrome-editorial": {
    layout: "Monochrome Grid",
    presentation: "monochrome-grid",
    tags: ["monochrome grid", "brutalist", "architectural"],
  },
  "mezze-mosaic": {
    layout: "Mosaic",
    presentation: "mosaic",
    tags: ["mosaic", "asymmetric", "shared plates"],
  },
  "paris-patisserie": {
    layout: "Patisserie Showcase",
    presentation: "patisserie",
    tags: ["patisserie", "showcase", "pastry boutique"],
  },
  "vegan-garden": {
    layout: "Botanical Split",
    presentation: "botanical",
    tags: ["botanical", "seasonal", "garden"],
  },
  "seafood-gallery": {
    layout: "Coastal Gallery",
    presentation: "coastal-gallery",
    tags: ["coastal gallery", "staggered", "raw bar"],
  },
  "breakfast-club": {
    layout: "Breakfast Board",
    presentation: "breakfast-board",
    tags: ["breakfast board", "brunch board", "morning"],
  },
  "taproom-board": {
    layout: "Tap Board",
    presentation: "tap-board",
    tags: ["tap board", "beer board", "price list"],
  },
  "chef-black-editorial": {
    layout: "Chef Editorial",
    presentation: "chef-editorial",
    tags: ["chef editorial", "tasting menu", "course menu"],
  },
});

export function applyMenuDesignPresentationProfile(entry) {
  const profile = PRESENTATION_PROFILES[entry?.id];
  if (!profile) return entry;

  return {
    ...entry,
    layout: profile.layout || entry.layout,
    tags: [...new Set([...(entry.tags || []), ...(profile.tags || [])])],
    design: {
      ...entry.design,
      layout: {
        ...entry.design?.layout,
        presentation: profile.presentation,
      },
    },
  };
}

export function applyMenuDesignPresentationProfiles(entries) {
  return entries.map(applyMenuDesignPresentationProfile);
}
