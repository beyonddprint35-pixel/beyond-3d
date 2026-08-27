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
      return {
        id: item.id,
        group_id: item.group_id,
        name: languageObject(item, "name"),
        description: languageObject(item, "description"),
        price: options.length ? "" : text(item.price),
        price_options: options,
        image_url: text(item.image_url || item.image),
        visible: item.visible !== false,
        sort_order: Number(item.sort_order || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);

  const content = site?.content_settings && typeof site.content_settings === "object" ? site.content_settings : {};
  const localContent = code => content?.[code] && typeof content[code] === "object" ? content[code] : {};

  return {
    site,
    menu: {
      site_id: site.id,
      slug: site.slug,
      restaurant_name: text(site.name || site.display_name || "Restaurant"),
      logo_url: text(site.logo_url),
      languages: normalizeLanguages(site),
      default_language: ["en", "he", "ar"].includes(site.default_language) ? site.default_language : "he",
      subtitle: {
        en: text(localContent("en").brand_subtitle),
        he: text(localContent("he").brand_subtitle),
        ar: text(localContent("ar").brand_subtitle),
      },
      hero_kicker: {
        en: text(localContent("en").hero_kicker || "Digital Menu"),
        he: text(localContent("he").hero_kicker || "תפריט דיגיטלי"),
        ar: text(localContent("ar").hero_kicker),
      },
      hero_title: {
        en: text(localContent("en").hero_title || "Our Menu"),
        he: text(localContent("he").hero_title || "התפריט שלנו"),
        ar: text(localContent("ar").hero_title),
      },
      groups,
      items,
    },
    designSettings: site?.design_settings && typeof site.design_settings === "object" ? site.design_settings : {},
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
  if (!site) throw new Error(`No published menu found for \"${slug}\".`);

  const [groupsResult, itemsResult] = await Promise.all([
    supabase.from("menu_groups").select("*").eq("site_id", site.id).order("sort_order").order("created_at"),
    supabase.from("menu_items").select("*").eq("site_id", site.id).order("sort_order").order("created_at"),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (itemsResult.error) throw itemsResult.error;

  return adaptSupabaseMenuToV3(site, groupsResult.data || [], itemsResult.data || []);
}
