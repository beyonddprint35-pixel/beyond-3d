const SUPPORTED_LANGUAGES = ["en", "he", "ar"];

const PRICE_TYPE_PRESETS = {
  draft: [
    { label_key: "one_third", label_en: "1/3", label_he: "1/3", label_ar: "1/3" },
    { label_key: "one_half", label_en: "1/2", label_he: "1/2", label_ar: "1/2" },
  ],
  smallLarge: [
    { label_key: "small", label_en: "Small", label_he: "קטן", label_ar: "صغير" },
    { label_key: "large", label_en: "Large", label_he: "גדול", label_ar: "كبير" },
  ],
  shotGlass: [
    { label_key: "shot", label_en: "Shot", label_he: "שוט", label_ar: "شوت" },
    { label_key: "glass", label_en: "Glass", label_he: "כוס", label_ar: "كأس" },
  ],
  glassBottle: [
    { label_key: "glass", label_en: "Glass", label_he: "כוס", label_ar: "كأس" },
    { label_key: "bottle", label_en: "Bottle", label_he: "בקבוק", label_ar: "زجاجة" },
  ],
  generic: [
    { label_key: "option_1", label_en: "Option 1", label_he: "אפשרות 1", label_ar: "الخيار 1" },
    { label_key: "option_2", label_en: "Option 2", label_he: "אפשרות 2", label_ar: "الخيار 2" },
  ],
};

function text(value) {
  return value == null ? "" : String(value).trim();
}

function localized(row, base) {
  return {
    en: text(row?.[`${base}_en`] ?? row?.[base]),
    he: text(row?.[`${base}_he`] ?? row?.[base]),
    ar: text(row?.[`${base}_ar`] ?? row?.[base]),
  };
}

function cleanPrice(value) {
  return text(value)
    .replace(/₪/g, "")
    .replace(/\b(?:ILS|NIS)\b/gi, "")
    .trim();
}

function numericPrice(value) {
  const normalized = cleanPrice(value).replace(/,/g, ".");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function splitCombinedPrice(value) {
  const clean = cleanPrice(value);
  const match = clean.match(/^([0-9]+(?:[.,][0-9]+)?)\s*\/\s*([0-9]+(?:[.,][0-9]+)?)$/);
  return match ? [match[1], match[2]] : [];
}

function groupSearchText(group) {
  const name = group?.name && typeof group.name === "object" ? group.name : {};
  return [name.en, name.he, name.ar, group?.group_key]
    .map((value) => text(value).toLowerCase())
    .filter(Boolean)
    .join(" | ");
}

function inferPairPreset(group) {
  const value = groupSearchText(group);
  if (/draft beer|draught beer|beer on tap|בירה מהחבית|بيرة.*برميل|بيرة.*صنبور/.test(value)) return PRICE_TYPE_PRESETS.draft;
  if (/hot drinks|coffee|משקאות חמים|קפה|مشروبات ساخنة|قهوة/.test(value)) return PRICE_TYPE_PRESETS.smallLarge;
  if (/wine|יין|نبيذ/.test(value)) return PRICE_TYPE_PRESETS.glassBottle;
  if (/whisk|וויסקי|ويسكي|gin|ג['׳]?ין|جين|vodka|וודקה|فودكا|liquor|liqueur|ליקר|ليكير|cognac|קוניאק|كونياك|rum|רום|روم|aperitif|אפריטיף|أبيريتيف|arak|ערק|عرق|anise|אניס|يانسون|tequila|טקילה|تيكيلا|brandy|ברנדי|برانדי|drinks to mix|משקאות לערבוב|مشروبات للخلط/.test(value)) return PRICE_TYPE_PRESETS.shotGlass;
  return PRICE_TYPE_PRESETS.generic;
}

function isQuantityPreset(preset) {
  return preset !== PRICE_TYPE_PRESETS.generic;
}

function presetWithPrice(preset, price) {
  return {
    ...preset,
    label: preset.label_en,
    price: cleanPrice(price),
  };
}

function hasOptionLabel(option) {
  return Boolean(text(option?.label) || text(option?.label_en) || text(option?.label_he) || text(option?.label_ar));
}

function normalizeOption(option) {
  return {
    label: text(option?.label_en || option?.label_he || option?.label_ar || option?.label || option?.label_key),
    label_key: text(option?.label_key),
    label_en: text(option?.label_en),
    label_he: text(option?.label_he),
    label_ar: text(option?.label_ar),
    price: cleanPrice(option?.price),
  };
}

function comparableLabel(value) {
  return text(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/⅓/g, "1/3")
    .replace(/½/g, "1/2");
}

function optionMatchesPreset(option, presetEntry) {
  const optionLabels = [option?.label_key, option?.label, option?.label_en, option?.label_he, option?.label_ar]
    .map(comparableLabel)
    .filter(Boolean);
  const presetLabels = [presetEntry?.label_key, presetEntry?.label_en, presetEntry?.label_he, presetEntry?.label_ar]
    .map(comparableLabel)
    .filter(Boolean);
  return optionLabels.some((optionLabel) => presetLabels.some((presetLabel) => optionLabel === presetLabel || optionLabel.includes(presetLabel)));
}

function enforceLogicalPairPrices(options, preset) {
  if (options.length !== 2 || !isQuantityPreset(preset)) return options;

  const prices = options.map((option) => numericPrice(option.price));
  if (prices.some((value) => !Number.isFinite(value)) || prices[0] === prices[1]) return options;

  let smallIndex = 0;
  let largeIndex = 1;
  const firstSmall = optionMatchesPreset(options[0], preset[0]);
  const firstLarge = optionMatchesPreset(options[0], preset[1]);
  const secondSmall = optionMatchesPreset(options[1], preset[0]);
  const secondLarge = optionMatchesPreset(options[1], preset[1]);

  if (firstLarge && secondSmall) {
    smallIndex = 1;
    largeIndex = 0;
  } else if (!(firstSmall && secondLarge)) {
    // When labels were inferred from the group, adapter order is the semantic
    // order: smaller serving first, larger serving second.
    smallIndex = 0;
    largeIndex = 1;
  }

  if (numericPrice(options[smallIndex].price) <= numericPrice(options[largeIndex].price)) return options;

  const next = options.map((option) => ({ ...option }));
  const smallerServingPrice = next[smallIndex].price;
  next[smallIndex].price = next[largeIndex].price;
  next[largeIndex].price = smallerServingPrice;
  return next;
}

function orderedPairPrices(prices, preset) {
  if (!isQuantityPreset(preset) || prices.length !== 2) return prices;
  const numeric = prices.map(numericPrice);
  if (numeric.some((value) => !Number.isFinite(value))) return prices;
  return numeric[0] <= numeric[1] ? prices : [prices[1], prices[0]];
}

function normalizeItemPricing(item, group) {
  let options = Array.isArray(item?.price_options)
    ? item.price_options.map(normalizeOption).filter((option) => option.price || hasOptionLabel(option))
    : [];

  if (options.length === 1) {
    const combined = splitCombinedPrice(options[0].price);
    if (combined.length === 2) {
      const preset = inferPairPreset(group);
      options = orderedPairPrices(combined, preset).map((price, index) => presetWithPrice(preset[index], price));
    }
  }

  if (!options.length) {
    const combined = splitCombinedPrice(item?.price);
    if (combined.length === 2) {
      const preset = inferPairPreset(group);
      options = orderedPairPrices(combined, preset).map((price, index) => presetWithPrice(preset[index], price));
    }
  }

  if (options.length === 2) {
    const preset = inferPairPreset(group);
    options = options.map((option, index) => {
      if (hasOptionLabel(option)) return option;
      return { ...option, ...presetWithPrice(preset[index], option.price) };
    });
    options = enforceLogicalPairPrices(options, preset);
  }

  return {
    price: options.length ? "" : cleanPrice(item?.price),
    price_options: options,
  };
}

function resolveLanguages(raw) {
  const configured = Array.isArray(raw?.requested_languages)
    ? raw.requested_languages.filter((code) => SUPPORTED_LANGUAGES.includes(code))
    : [];
  if (configured.length) return [...new Set(configured)];
  const detected = SUPPORTED_LANGUAGES.includes(raw?.detected_language) ? raw.detected_language : "en";
  return detected === "en" ? ["en", "he", "ar"] : [detected, "en", ...SUPPORTED_LANGUAGES.filter((code) => code !== detected && code !== "en")];
}

function fallbackName(value, index, prefix) {
  const next = { ...value };
  if (!next.en && !next.he && !next.ar) next.en = `${prefix} ${index + 1}`;
  return next;
}

export function normalizeV3MenuPriceOptions(menu = {}) {
  const groups = Array.isArray(menu?.groups) ? menu.groups : [];
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const items = Array.isArray(menu?.items) ? menu.items : [];
  return {
    ...menu,
    items: items.map((item) => ({
      ...item,
      ...normalizeItemPricing(item, groupMap.get(item.group_id)),
    })),
  };
}

export function adaptAiStructuredMenuToV3(rawMenu = {}, { projectId = "" } = {}) {
  const sections = Array.isArray(rawMenu?.sections) ? rawMenu.sections : [];
  const languages = resolveLanguages(rawMenu);
  const defaultLanguage = languages.includes(rawMenu?.detected_language)
    ? rawMenu.detected_language
    : languages[0] || "en";

  const groups = [];
  const items = [];

  sections.forEach((section, sectionIndex) => {
    const groupId = `ai-group-${sectionIndex + 1}`;
    const group = {
      id: groupId,
      parent_id: null,
      group_key: "",
      name: fallbackName(localized(section, "name"), sectionIndex, "Category"),
      visible: true,
      sort_order: sectionIndex,
    };
    groups.push(group);

    const sectionItems = Array.isArray(section?.items) ? section.items : [];
    sectionItems.forEach((item, itemIndex) => {
      const pricing = normalizeItemPricing(item, group);
      items.push({
        id: `ai-item-${sectionIndex + 1}-${itemIndex + 1}`,
        group_id: groupId,
        name: fallbackName(localized(item, "name"), itemIndex, "Item"),
        description: localized(item, "description"),
        ...pricing,
        image_url: "",
        image_path: "",
        visible: true,
        sort_order: itemIndex,
        metadata: {
          allergens: [],
          dietary: [],
          merchandising: [],
          spice: "none",
          aiSuggestions: [],
          reviewedByOwner: false,
        },
      });
    });
  });

  if (!groups.length) {
    groups.push({
      id: "ai-group-1",
      parent_id: null,
      group_key: "",
      name: { en: "Main menu", he: "תפריט ראשי", ar: "القائمة الرئيسية" },
      visible: true,
      sort_order: 0,
    });
  }

  const branding = rawMenu?.branding && typeof rawMenu.branding === "object" ? rawMenu.branding : {};
  const restaurantName = text(rawMenu?.restaurant_name || branding?.display_name) || "My Restaurant";

  return normalizeV3MenuPriceOptions({
    source_project_id: projectId || "",
    restaurant_name: restaurantName,
    logo_url: text(branding?.logo_url),
    restaurant_subtitle: {
      en: text(branding?.subtitle),
      he: text(branding?.subtitle),
      ar: text(branding?.subtitle),
    },
    hero_eyebrow: { en: "Welcome", he: "ברוכים הבאים", ar: "أهلاً وسهلاً" },
    hero_title: {
      en: text(branding?.hero_title_en) || "Our Menu",
      he: text(branding?.hero_title_he) || "התפריט שלנו",
      ar: text(branding?.hero_title_ar) || "قائمتنا",
    },
    languages,
    default_language: defaultLanguage,
    currency_symbol: "₪",
    groups,
    items,
    import_meta: {
      source: "menu-ai",
      projectId: projectId || "",
      warnings: Array.isArray(rawMenu?.warnings) ? rawMenu.warnings : [],
    },
  });
}