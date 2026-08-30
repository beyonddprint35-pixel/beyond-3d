const SUPPORTED_LANGUAGES = ["en", "he", "ar"];

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

function normalizePriceOptions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => ({
      label: text(option?.label_en || option?.label_he || option?.label_ar || option?.label || option?.label_key),
      label_en: text(option?.label_en),
      label_he: text(option?.label_he),
      label_ar: text(option?.label_ar),
      price: cleanPrice(option?.price),
    }))
    .filter((option) => option.price || option.label || option.label_en || option.label_he || option.label_ar);
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
    groups.push({
      id: groupId,
      parent_id: null,
      group_key: "",
      name: fallbackName(localized(section, "name"), sectionIndex, "Category"),
      visible: true,
      sort_order: sectionIndex,
    });

    const sectionItems = Array.isArray(section?.items) ? section.items : [];
    sectionItems.forEach((item, itemIndex) => {
      const options = normalizePriceOptions(item?.price_options);
      items.push({
        id: `ai-item-${sectionIndex + 1}-${itemIndex + 1}`,
        group_id: groupId,
        name: fallbackName(localized(item, "name"), itemIndex, "Item"),
        description: localized(item, "description"),
        price: options.length ? "" : cleanPrice(item?.price),
        price_options: options,
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

  return {
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
  };
}
