import { normalizeMenuDesign } from "../domain/designSchema";

const MEMORY_CACHE = new Map();
const STORAGE_PREFIX = "beyond:published-menu:";

function cacheKey(slug) {
  return `${STORAGE_PREFIX}${String(slug || "").trim().toLowerCase()}`;
}

function remember(slug, payload) {
  MEMORY_CACHE.set(slug, payload);
  try { window.localStorage.setItem(cacheKey(slug), JSON.stringify(payload)); } catch { /* storage is an optional extra fallback */ }
  return payload;
}

function remembered(slug) {
  if (MEMORY_CACHE.has(slug)) return MEMORY_CACHE.get(slug);
  try {
    const raw = window.localStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const value = JSON.parse(raw);
    MEMORY_CACHE.set(slug, value);
    return value;
  } catch { return null; }
}

function validPayload(payload) {
  return Boolean(
    payload?.versionId &&
    payload?.menu &&
    Array.isArray(payload.menu.groups) &&
    Array.isArray(payload.menu.items) &&
    payload?.design
  );
}

export async function loadResilientPublishedMenu(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug) throw new Error("A menu slug is required.");

  try {
    const response = await fetch(`/.netlify/functions/published-menu?slug=${encodeURIComponent(normalizedSlug)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Menu request failed (${response.status}).`);
    const payload = await response.json();
    if (!validPayload(payload)) throw new Error("Published menu is incomplete.");

    return remember(normalizedSlug, {
      menu: payload.menu,
      designSettings: normalizeMenuDesign(payload.design),
      versionId: payload.versionId,
      versionNumber: payload.versionNumber,
      publishedAt: payload.publishedAt,
      source: "published",
    });
  } catch (error) {
    const fallback = remembered(normalizedSlug);
    if (fallback) {
      return {
        ...fallback,
        source: "last-known-good",
        fallbackReason: error?.message || "Menu temporarily unavailable.",
      };
    }
    throw error;
  }
}
