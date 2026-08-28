import { normalizeMenuDesign } from "../domain/designSchema";
import { normalizeItemMetadata } from "../domain/itemMetadata";
import { clearDraftLocally, loadDraftLocally, saveDraftLocally } from "./draftStorage";

const copyText = value => ({
  en: String(value?.en || ""),
  he: String(value?.he || ""),
  ar: String(value?.ar || ""),
});

const cleanStoredPrice = value => String(value ?? "")
  .replace(/₪/g, "")
  .replace(/\b(?:ILS|NIS)\b/gi, "")
  .trim();

const copyPriceOptions = value => Array.isArray(value)
  ? value.map(option => ({
      label: String(option?.label || ""),
      label_en: String(option?.label_en || ""),
      label_he: String(option?.label_he || ""),
      label_ar: String(option?.label_ar || ""),
      price: cleanStoredPrice(option?.price),
    }))
  : [];

export function createMenuDraftSession(payload) {
  const menu = payload?.menu || {};
  const baselineDesign = normalizeMenuDesign(payload?.designSettings || {});

  return {
    source: {
      siteId: menu.site_id || payload?.site?.id || null,
      slug: menu.slug || payload?.site?.slug || "",
      loadedFromSupabase: Boolean(payload?.site),
    },
    dirty: false,
    localSavedAt: null,
    restoredFromLocal: false,
    baselineDesign,
    menu: {
      ...menu,
      currency: menu.currency || "ILS",
      currency_symbol: menu.currency_symbol || "₪",
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
            price: cleanStoredPrice(item.price),
            price_options: copyPriceOptions(item.price_options),
            metadata: normalizeItemMetadata(item.metadata),
          }))
        : [],
    },
    design: baselineDesign,
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

export function saveDraftSessionLocally(session) {
  const savedAt = saveDraftLocally(session);
  if (!savedAt) return session;
  return {
    ...session,
    dirty: false,
    localSavedAt: savedAt,
    restoredFromLocal: false,
  };
}

export function findSavedDraftSession(session) {
  if (!session?.source) return null;
  return loadDraftLocally(session.source);
}

export function restoreSavedDraftSession(baseSession, savedDraft) {
  if (!baseSession || !savedDraft) return baseSession;
  return {
    ...baseSession,
    menu: {
      ...savedDraft.menu,
      currency: savedDraft.menu?.currency || "ILS",
      currency_symbol: savedDraft.menu?.currency_symbol || "₪",
    },
    design: normalizeMenuDesign(savedDraft.design),
    baselineDesign: baseSession.baselineDesign,
    dirty: false,
    localSavedAt: savedDraft.savedAt || null,
    restoredFromLocal: true,
  };
}

export function discardSavedDraftSession(session) {
  if (session?.source) clearDraftLocally(session.source);
  return session;
}

export function resetDraftSession(payload) {
  return createMenuDraftSession(payload);
}
