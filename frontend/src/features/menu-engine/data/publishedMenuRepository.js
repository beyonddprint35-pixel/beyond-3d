import { normalizeMenuDesign } from "../domain/designSchema";
import { activeMenuPointerPath, validatePublishedMenuArtifact } from "../publishing/publishedMenuArtifact";

const MEMORY_CACHE = new Map();
const STORAGE_PREFIX = "beyond:published-menu:";

function cacheKey(slug) {
  return `${STORAGE_PREFIX}${String(slug || "").trim().toLowerCase()}`;
}

function remember(slug, payload) {
  MEMORY_CACHE.set(slug, payload);
  try { window.localStorage.setItem(cacheKey(slug), JSON.stringify(payload)); } catch { /* browser storage is optional */ }
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

async function fetchJson(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`Menu request failed (${response.status}).`);
  return response.json();
}

export async function loadResilientPublishedMenu(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug) throw new Error("A menu slug is required.");

  try {
    // The tiny pointer may be revalidated. The immutable artifact itself can be cached for a very long time by the edge.
    const pointer = await fetchJson(activeMenuPointerPath(normalizedSlug), { cache: "no-cache" });
    if (!pointer?.artifactPath) throw new Error("Published menu pointer is incomplete.");
    const artifact = await fetchJson(pointer.artifactPath, { cache: "force-cache" });
    const validation = validatePublishedMenuArtifact(artifact);
    if (!validation.ok) throw new Error(validation.errors.join(" · "));
    return remember(normalizedSlug, {
      menu: artifact.menu,
      designSettings: normalizeMenuDesign(artifact.design),
      versionId: artifact.versionId,
      source: "published-artifact",
    });
  } catch (error) {
    const fallback = remembered(normalizedSlug);
    if (fallback) return { ...fallback, source: "last-known-good", fallbackReason: error?.message || "Menu temporarily unavailable." };
    throw error;
  }
}
