import { normalizeMenuDesign } from "../domain/designSchema";

const copyText = value => ({
  en: String(value?.en || ""),
  he: String(value?.he || ""),
  ar: String(value?.ar || ""),
});

const copyPriceOptions = value => Array.isArray(value)
  ? value.map(option => ({
      label: String(option?.label || ""),
      label_en: String(option?.label_en || ""),
      label_he: String(option?.label_he || ""),
      label_ar: String(option?.label_ar || ""),
      price: String(option?.price || ""),
    }))
  : [];

export function createMenuDraftSession(payload) {
  const menu = payload?.menu || {};

  return {
    source: {
      siteId: menu.site_id || payload?.site?.id || null,
      slug: menu.slug || payload?.site?.slug || "",
      loadedFromSupabase: Boolean(payload?.site),
    },
    dirty: false,
    menu: {
      ...menu,
      subtitle: copyText(menu.subtitle),
      hero_kicker: copyText(menu.hero_kicker),
      hero_title: copyText(menu.hero_title),
      groups: Array.isArray(menu.groups)
        ? menu.groups.map(group => ({
            ...group,
            name: copyText(group.name),
          }))
        : [],
      items: Array.isArray(menu.items)
        ? menu.items.map(item => ({
            ...item,
            name: copyText(item.name),
            description: copyText(item.description),
            price_options: copyPriceOptions(item.price_options),
          }))
        : [],
    },
    design: normalizeMenuDesign(payload?.designSettings || {}),
  };
}

export function updateDraftMenu(session, updater) {
  const currentMenu = session?.menu || {};
  const nextMenu = typeof updater === "function" ? updater(currentMenu) : updater;
  return {
    ...session,
    dirty: true,
    menu: nextMenu,
  };
}

export function updateDraftDesign(session, updater) {
  const currentDesign = session?.design || {};
  const nextDesign = typeof updater === "function" ? updater(currentDesign) : updater;
  return {
    ...session,
    dirty: true,
    design: normalizeMenuDesign(nextDesign),
  };
}

export function resetDraftSession(payload) {
  return createMenuDraftSession(payload);
}
