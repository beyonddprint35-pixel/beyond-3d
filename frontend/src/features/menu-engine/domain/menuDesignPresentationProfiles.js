const PRESENTATION_PROFILES = Object.freeze({
  "heritage-original": {
    layout: "Heritage Classic",
    presentation: "heritage-classic",
    styleVariant: "standard",
    tags: ["heritage classic", "fully customizable", "warm hospitality"],
  },
  "atelier-editorial": {
    layout: "Atelier Editorial",
    presentation: "atelier",
    tags: ["atelier", "fashion editorial", "fine dining"],
  },
  "noir-gallery": {
    layout: "Noir Cinema Gallery",
    presentation: "noir-gallery",
    heroMediaMode: "image",
    tags: ["cinematic", "noir gallery", "nightlife"],
  },
  "riviera-split": {
    layout: "Riviera Story",
    presentation: "riviera",
    heroMediaMode: "image",
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
    heroMediaMode: "image",
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
    heroMediaMode: "image",
    tags: ["coastal story", "beach", "image panels"],
  },
  "monochrome-editorial": {
    layout: "Monochrome Grid",
    presentation: "monochrome-grid",
    tags: ["monochrome grid", "brutalist", "architectural"],
  },
  "trattoria-ledger": {
    layout: "Trattoria Chalk Ledger",
    presentation: "trattoria-ledger",
    tags: ["trattoria", "chalk ledger", "italian menu board"],
  },
  "tokyo-ink": {
    layout: "Tokyo Ink Columns",
    presentation: "tokyo-ink",
    tags: ["tokyo ink", "japanese columns", "red stamp"],
  },
  "garden-split": {
    layout: "Garden Journal",
    presentation: "garden-journal",
    heroMediaMode: "image",
    tags: ["garden journal", "seasonal story", "farm to table"],
  },
  "bakery-tiles": {
    layout: "Bakery Counter",
    presentation: "bakery-counter",
    heroMediaMode: "image",
    tags: ["bakery counter", "pastry shelf", "cafe display"],
  },
  "neon-bottom-tabs": {
    layout: "Neon Dock",
    presentation: "neon-dock",
    tags: ["neon dock", "nightlife app", "mobile tabs"],
  },
  "desert-covers": {
    layout: "Desert Arch Covers",
    presentation: "desert-arches",
    tags: ["desert arches", "levant covers", "terracotta"],
  },
  "tapas-magazine": {
    layout: "Tapas Collage",
    presentation: "tapas-collage",
    heroMediaMode: "image",
    tags: ["tapas collage", "spanish editorial", "shared plates"],
  },
  "steakhouse-ledger": {
    layout: "Butcher Ledger",
    presentation: "butcher-ledger",
    tags: ["butcher ledger", "steakhouse", "cuts list"],
  },
  "brunch-photo-story": {
    layout: "Brunch Polaroids",
    presentation: "brunch-polaroids",
    heroMediaMode: "image",
    tags: ["brunch polaroids", "breakfast story", "sunny photos"],
  },
  "rose-cocktail-cards": {
    layout: "Rose Lounge Cards",
    presentation: "rose-lounge",
    heroMediaMode: "image",
    tags: ["rose lounge", "cocktail cards", "rooftop"],
  },
  "blue-category-launcher": {
    layout: "Beyond App Launcher",
    presentation: "beyond-launcher",
    tags: ["beyond launcher", "app grid", "blue navigation"],
  },
  "levant-table": {
    layout: "Levant Shared Table",
    presentation: "levant-table",
    tags: ["shared table", "levant", "communal plates"],
  },
  "mezze-mosaic": {
    layout: "Mosaic",
    presentation: "mosaic",
    heroMediaMode: "image",
    tags: ["mosaic", "asymmetric", "shared plates"],
  },
  "nordic-paper": {
    layout: "Nordic Paper Columns",
    presentation: "nordic-paper",
    tags: ["scandinavian", "paper columns", "quiet minimal"],
  },
  "seoul-night": {
    layout: "Seoul Neon Posters",
    presentation: "seoul-night",
    tags: ["seoul neon", "night posters", "korean bar"],
  },
  "paris-patisserie": {
    layout: "Patisserie Showcase",
    presentation: "patisserie",
    heroMediaMode: "image",
    tags: ["patisserie", "showcase", "pastry boutique"],
  },
  "smokehouse-story": {
    layout: "Smokehouse Cinema",
    presentation: "smokehouse-story",
    heroMediaMode: "image",
    tags: ["smokehouse cinema", "low and slow", "bbq story"],
  },
  "tropical-club": {
    layout: "Tropical Mobile Club",
    presentation: "tropical-club",
    heroMediaMode: "image",
    tags: ["tropical app", "floating dock", "beach club"],
  },
  "vegan-garden": {
    layout: "Botanical Split",
    presentation: "botanical",
    heroMediaMode: "image",
    tags: ["botanical", "seasonal", "garden"],
  },
  "seafood-gallery": {
    layout: "Coastal Gallery",
    presentation: "coastal-gallery",
    heroMediaMode: "image",
    tags: ["coastal gallery", "staggered", "raw bar"],
  },
  "breakfast-club": {
    layout: "Breakfast Board",
    presentation: "breakfast-board",
    heroMediaMode: "image",
    tags: ["breakfast board", "brunch board", "morning"],
  },
  "taproom-board": {
    layout: "Tap Board",
    presentation: "tap-board",
    tags: ["tap board", "beer board", "price list"],
  },
  "dessert-magazine": {
    layout: "Dessert Editorial Spread",
    presentation: "dessert-magazine",
    heroMediaMode: "image",
    tags: ["dessert editorial", "asymmetric spread", "sweet gallery"],
  },
  "luxury-steak-story": {
    layout: "Prime Cut Cinema",
    presentation: "luxury-steak",
    heroMediaMode: "image",
    tags: ["prime cut", "steak cinema", "luxury grill"],
  },
  "blue-launcher": {
    layout: "Beyond Modular Launcher",
    presentation: "blue-launcher",
    tags: ["beyond modular", "category app", "blue launcher"],
  },
  "chef-black-editorial": {
    layout: "Chef Editorial",
    presentation: "chef-editorial",
    tags: ["chef editorial", "tasting menu", "course menu"],
  },
  "family-pizzeria": {
    layout: "Pizza Plate Launcher",
    presentation: "family-pizzeria",
    tags: ["pizza plates", "family menu", "circular categories"],
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
      styleVariant: profile.styleVariant || entry.design?.styleVariant,
      layout: {
        ...entry.design?.layout,
        presentation: profile.presentation,
      },
      brand: {
        ...entry.design?.brand,
        ...(profile.heroMediaMode ? { heroMediaMode: profile.heroMediaMode } : {}),
      },
    },
  };
}

export function applyMenuDesignPresentationProfiles(entries) {
  return entries.map(applyMenuDesignPresentationProfile);
}
