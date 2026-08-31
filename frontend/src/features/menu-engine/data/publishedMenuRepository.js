import { supabase } from "../../../lib/supabaseClient";
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

function forget(slug) {
  MEMORY_CACHE.delete(slug);
  try { window.localStorage.removeItem(cacheKey(slug)); } catch { /* cache cleanup is best effort */ }
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
  const hasIdentity = Boolean(payload?.versionId || (payload?.legacy && payload?.siteId));
  return Boolean(
    hasIdentity &&
    payload?.menu &&
    Array.isArray(payload.menu.groups) &&
    Array.isArray(payload.menu.items) &&
    payload?.design
  );
}

function notFoundError(message = "Menu not found.") {
  const error = new Error(message);
  error.code = "MENU_NOT_FOUND";
  return error;
}

async function rpc(name, slug) {
  const { data, error } = await supabase.rpc(name, { p_slug: slug });
  if (error) throw error;
  return data || null;
}

async function readFromSupabase(slug) {
  // New immutable publication versions always win. Legacy live menus are read
  // only when no V3 published snapshot owns the slug, preserving existing QR URLs.
  const current = await rpc("get_published_menu_v3_by_slug", slug);
  if (current) return current;

  const legacy = await rpc("get_legacy_published_menu_v3_by_slug", slug);
  if (legacy) return legacy;

  throw notFoundError();
}

async function readFromNetlify(slug) {
  const response = await fetch(`/.netlify/functions/published-menu?slug=${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) throw notFoundError();
  if (!response.ok) throw new Error(`Menu request failed (${response.status}).`);
  return response.json();
}

function normalizedPublishedPayload(payload) {
  if (!validPayload(payload)) throw new Error("Published menu is incomplete.");
  const legacy = Boolean(payload.legacy);
  return {
    menu: payload.menu,
    designSettings: normalizeMenuDesign(payload.design),
    versionId: payload.versionId || (legacy ? `legacy:${payload.siteId}` : ""),
    versionNumber: payload.versionNumber || null,
    publishedAt: payload.publishedAt || null,
    publication: payload.publication || null,
    slug: payload.slug || "",
    source: legacy ? "legacy-published" : "published",
    legacy,
  };
}

export async function loadResilientPublishedMenu(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug) throw new Error("A menu slug is required.");

  try {
    // Vite/Codespaces does not run Netlify Functions. Read the same public RPCs
    // directly while developing so both immutable and legacy live menus are testable.
    const payload = import.meta.env.DEV
      ? await readFromSupabase(normalizedSlug)
      : await readFromNetlify(normalizedSlug).catch((netlifyError) => {
          if (netlifyError?.code === "MENU_NOT_FOUND") throw netlifyError;
          return readFromSupabase(normalizedSlug);
        });
    return remember(normalizedSlug, normalizedPublishedPayload(payload));
  } catch (error) {
    if (error?.code === "MENU_NOT_FOUND") {
      forget(normalizedSlug);
      throw error;
    }
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
