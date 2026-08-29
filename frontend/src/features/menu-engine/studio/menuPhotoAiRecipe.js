import { supabase } from "../../../lib/supabaseClient";

const AI_TIMEOUT_MS = 6500;
const AI_ENDPOINT = "/.netlify/functions/menu-photo-ai-finish";

function shouldTryAi() {
  if (import.meta.env.VITE_MENU_PHOTO_AI_ENABLED === "false") return false;
  if (import.meta.env.VITE_MENU_PHOTO_AI_ENABLED === "true") return true;
  return Boolean(import.meta.env.PROD);
}

function safeUrl(value) {
  const url = String(value || "").trim();
  return /^https:\/\//i.test(url) ? url : "";
}

export async function requestMenuPhotoAiRecipe({ sourceUrl }) {
  const imageUrl = safeUrl(sourceUrl);
  if (!imageUrl || !shouldTryAi()) return null;

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";
  if (!token) return null;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(AI_ENDPOINT, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`,
      },
      body:JSON.stringify({ imageUrl }),
      signal:controller.signal,
    });

    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload?.recipe || payload?.safety !== "dish-integrity-locked") return null;

    return {
      ...payload.recipe,
      source:"ai-vision",
      model:payload.model || "",
      safety:payload.safety,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
