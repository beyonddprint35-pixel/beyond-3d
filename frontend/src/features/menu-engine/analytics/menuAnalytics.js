import { supabase } from "../../../lib/supabaseClient";

const SESSION_KEY = "beyond-menu-analytics-session-v1";
const ALLOWED_EVENTS = new Set(["menu_view", "category_view", "item_impression", "item_open"]);

function randomSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "00000000-0000-4000-8000-000000000000";
}

function analyticsSessionId() {
  if (typeof window === "undefined") return randomSessionId();
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = randomSessionId();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return randomSessionId();
  }
}

export async function recordMenuAnalyticsEvent({ slug, type, entityId = "", language = "" } = {}) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug || !ALLOWED_EVENTS.has(type)) return false;

  try {
    const { data, error } = await supabase.rpc("record_menu_analytics_event", {
      p_slug: normalizedSlug,
      p_event_type: type,
      p_entity_id: entityId ? String(entityId) : null,
      p_session_id: analyticsSessionId(),
      p_language: language || null,
      p_metadata: {},
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    // Analytics must never interrupt or slow down the customer menu experience.
    console.warn("Menu analytics event was not recorded.", error);
    return false;
  }
}

export async function loadMenuAnalyticsSummary(projectId, days = 30) {
  if (!projectId) return null;
  const safeDays = Math.max(1, Math.min(Number(days) || 30, 365));
  const { data, error } = await supabase.rpc("get_menu_analytics_summary", {
    p_project_id: projectId,
    p_days: safeDays,
  });
  if (error) throw error;
  return data || null;
}
