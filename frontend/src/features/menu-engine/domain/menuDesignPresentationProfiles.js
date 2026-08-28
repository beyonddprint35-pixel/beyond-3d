const PRESENTATION_PROFILES = Object.freeze({
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
