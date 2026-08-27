const DRAFT_STORAGE_VERSION = 1;
const DRAFT_PREFIX = "beyond-menu-v3-draft:";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function storageKey(siteId, slug) {
  return `${DRAFT_PREFIX}${siteId || slug || "unknown"}`;
}

export function saveDraftLocally(session) {
  if (!canUseStorage() || !session) return null;
  const key = storageKey(session.source?.siteId, session.source?.slug);
  const savedAt = new Date().toISOString();
  const payload = {
    version: DRAFT_STORAGE_VERSION,
    savedAt,
    source: session.source,
    menu: session.menu,
    design: session.design,
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
  return savedAt;
}

export function loadDraftLocally({ siteId, slug } = {}) {
  if (!canUseStorage()) return null;
  const key = storageKey(siteId, slug);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== DRAFT_STORAGE_VERSION) return null;
    if (!parsed?.menu || !parsed?.design) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraftLocally({ siteId, slug } = {}) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(storageKey(siteId, slug));
}

export function hasDraftLocally(source = {}) {
  return Boolean(loadDraftLocally(source));
}

export function draftStorageKey(source = {}) {
  return storageKey(source.siteId, source.slug);
}
