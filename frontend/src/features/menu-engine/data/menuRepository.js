import { supabase } from "../../../lib/supabaseClient";

function text(value) {
  return value == null ? "" : String(value);
}

function languageObject(row, base) {
  return {
    en: text(row?.[`${base}_en`] ?? row?.[base]),
    he: text(row?.[`${base}_he`] ?? row?.[base]),
    ar: text(row?.[`${base}_ar`] ?? row?.[base]),
  };
}

function normalizePriceOptions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(option => ({
      label: text(option?.label_en || option?.label_he || option?.label_ar || option?.label || option?.label_key),
      label_en: text(option?.label_en),
      label_he: text(option?.label_he),
      label_ar: text(option?.label_ar),
      price: text(option?.price),
    }))
    .filter(option => option.price || option.label || option.label_en || option.label_he || option.label_ar);
}

function normalizeLanguages(site) {
  const configured = Array.isArray(site?.languages) ? site.languages : [];
  const supported = configured.filter(code => ["en", "he", "ar"].includes(code));
  if (supported.length) return supported;
  const fallback = site?.default_language && ["en", "he", "ar"].includes(site.default_language)
    ? site.default_language
    : "he";
  return fallback === "he" ? ["he", "en"] : [fallback];
}

function valueOr(source, key, fallback) {
  const value = source?.[key];
  return value === undefined || value === null || value === "" ? fallback : value;
}

function adaptLegacyDesignSettings(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const alreadyV3 = raw.theme || raw.typography || raw.layout || raw.brand || raw.badges || raw.template || raw.styleVariant;
  if (alreadyV3) return raw;

  const layoutStyle = String(raw.layout_style || "classic").trim().split(/\s+/)[0];
  const template = layoutStyle === "visual" ? "visual" : "classic";
  const legacyClassic = template === "classic";

  return {
    template,
    styleVariant: legacyClassic ? "heritage" : "standard",
    theme: {
      background: valueOr(raw, "background", "#f6f4ef"),
      surface: valueOr(raw, "paper", valueOr(raw, "hero_background", "#fffdf8")),
      card: valueOr(raw, "card", "#ffffff"),
      text: valueOr(raw, "text", "#121212"),
      muted: valueOr(raw, "muted", "#7b756e"),
      accent: valueOr(raw, "accent", "#556b2f"),
      accentSecondary: valueOr(raw, "accent_secondary", "#d8c79b"),
      line: valueOr(raw, "line", "#e5ded2"),
      categoryBackground: valueOr(raw, "category_background", "#111111"),
      categoryText: valueOr(raw, "category_text", "#ffffff"),
    },
    typography: {
      headingFont: valueOr(raw, "heading_font", "Playfair Display"),
      bodyFont: valueOr(raw, "body_font", "Inter"),
      numberFont: valueOr(raw, "number_font", "Playfair Display"),
      headingWeight: Number(valueOr(raw, "heading_weight", legacyClassic ? 800 : 700)),
      bodyWeight: Number(valueOr(raw, "body_weight", 400)),
      itemWeight: Number(valueOr(raw, "item_weight", 700)),
      brandSize: Number(valueOr(raw, "brand_font_size", 19)),
      heroSize: Number(valueOr(raw, "hero_font_size", 46)),
      sectionSize: Number(valueOr(raw, "section_font_size", 38)),
      categorySize: Number(valueOr(raw, "category_font_size", 11)),
      itemNameSize: Number(valueOr(raw, "item_name_font_size", 16)),
      descriptionSize: Number(valueOr(raw, "description_font_size", 11)),
      priceSize: Number(valueOr(raw, "price_font_size", 16)),
    },
    layout: {
      density: "comfortable",
      navigationStyle: "pills",
      itemImagePosition: "top",
      itemImageRatio: "4:3",
      pricePosition: "inline",
      cardRadius: Number(valueOr(raw, "card_radius", legacyClassic ? 19 : 16)),
      sectionGap: Number(valueOr(raw, "section_gap", legacyClassic ? 20 : 32)),
      itemGap: Number(valueOr(raw, "item_gap", legacyClassic ? 9 : 16)),
      cardPadding: Number(valueOr(raw, "card_padding", legacyClassic ? 15 : 16)),
    },
    brand: {
      logoSize: Number(valueOr(raw, "logo_size", 50)),
      logoShape: valueOr(raw, "logo_shape", "free"),
      heroMediaMode: legacyClassic ? "watermark" : "none",
      heroImageUrl: "",
    },
    badges: {
      showSymbols: raw.show_badge_symbols !== false,
      iconStyle: "auto",
    },
  };
}

export function adaptSupabaseMenuToV3(site, rawGroups = [], rawItems = []) {
  const groups = rawGroups
    .map(group => ({
      id: group.id,
      parent_id: group.parent_id || null,
      group_key: text(group.group_key),
      name: languageObject(group, "name"),
      visible: group.visible !== false,
      sort_order: Number(group.sort_order || 0),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  const validGroupIds = new Set(groups.map(group => group.id));

  const items = rawItems
    .map(item => {
      if (!validGroupIds.has(item.group_id)) return null;
      const options = normalizePriceOptions(item.price_options);
      const score = item.image_quality_score == null ? null : Number(item.image_quality_score);
      return {
        id: item.id,
        group_id: item.group_id,
        name: languageObject(item, "name"),
        description: languageObject(item, "description"),
        price: options.length ? "" : text(item.price),
        price_options: options,
        image_url: text(item.image_url || item.image_theme_url || item.image_processed_url || item.image_original_url || item.image),
        image_path: text(item.image_path),
        image_original_url: text(item.image_original_url),
        image_original_path: text(item.image_original_path),
        image_processed_url: text(item.image_processed_url),
        image_processed_path: text(item.image_processed_path),
        image_theme_url: text(item.image_theme_url),
        image_theme_path: text(item.image_theme_path),
        image_theme_profile: text(item.image_theme_profile),
        image_theme_processed_at: text(item.image_theme_processed_at),
        image_variant: text(item.image_variant),
        image_status: text(item.image_status),
        image_quality_score: Number.isFinite(score) ? score : null,
        image_quality_level: text(item.image_quality_level),
        image_quality_notes: Array.isArray(item.image_quality_notes) ? item.image_quality_notes : [],
        image_processing_profile: text(item.image_processing_profile),
        image_processed_at: text(item.image_processed_at),
        image_width: item.image_width == null ? null : Number(item.image_width),
        image_height: item.image_height == null ? null : Number(item.image_height),
        visible: item.visible !== false,
        sort_order: Number(item.sort_order || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);

  const content = site?.content_settings && typeof site.content_settings === "object" ? site.content_settings : {};
  const localContent = code => content?.[code] && typeof content[code] === "object" ? content[code] : {};
  const rawDesignSettings = site?.design_settings && typeof site.design_settings === "object" ? site.design_settings : {};
  const legacyLogo = text(rawDesignSettings.logo_url);

  return {
    site,
    menu: {
      site_id: site.id,
      slug: site.slug,
      restaurant_name: text(site.name || site.display_name || "Restaurant"),
      logo_url: text(site.logo_url || legacyLogo),
      languages: normalizeLanguages(site),
      default_language: ["en", "he", "ar"].includes(site.default_language) ? site.default_language : "he",
      subtitle: {
        en: text(localContent("en").brand_subtitle || rawDesignSettings.subtitle),
        he: text(localContent("he").brand_subtitle || rawDesignSettings.subtitle),
        ar: text(localContent("ar").brand_subtitle),
      },
      hero_kicker: {
        en: text(localContent("en").hero_kicker || "Digital Menu"),
        he: text(localContent("he").hero_kicker || "תפריט דיגיטלי"),
        ar: text(localContent("ar").hero_kicker),
      },
      hero_title: {
        en: text(localContent("en").hero_title || rawDesignSettings.hero_title_en || "Our Menu"),
        he: text(localContent("he").hero_title || rawDesignSettings.hero_title_he || "התפריט שלנו"),
        ar: text(localContent("ar").hero_title || rawDesignSettings.hero_title_ar),
      },
      groups,
      items,
    },
    designSettings: adaptLegacyDesignSettings(rawDesignSettings),
  };
}

export async function loadPublishedMenuBySlug(slug) {
  if (!slug) throw new Error("A menu slug is required.");

  const { data: site, error: siteError } = await supabase
    .from("menu_sites")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (siteError) throw siteError;
  if (!site) throw new Error(`No published menu found for "${slug}".`);

  const [groupsResult, itemsResult] = await Promise.all([
    supabase.from("menu_groups").select("*").eq("site_id", site.id).order("sort_order").order("created_at"),
    supabase.from("menu_items").select("*").eq("site_id", site.id).order("sort_order").order("created_at"),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (itemsResult.error) throw itemsResult.error;

  return adaptSupabaseMenuToV3(site, groupsResult.data || [], itemsResult.data || []);
}
