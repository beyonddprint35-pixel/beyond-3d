import { supabase } from "../../../lib/supabaseClient";
import { findMissingRequestedMenuTranslations } from "./menuAiImportService";

async function parseFunctionError(functionError) {
  let message = functionError?.message || "Could not complete menu translations.";
  try {
    const response = functionError?.context;
    if (response && typeof response.clone === "function") {
      const raw = await response.clone().text();
      if (raw) {
        try {
          const details = JSON.parse(raw);
          message = details?.error || details?.message || message;
        } catch {
          message = raw || message;
        }
      }
    }
  } catch {
    // Preserve the original function error.
  }
  return new Error(message);
}

export async function repairImportedDraftTranslations({ session, projectId, menu, languages = [] }) {
  if (!session?.access_token || !projectId || !menu) return { menu, repaired: false, missingBefore: 0 };
  const missing = findMissingRequestedMenuTranslations(menu, languages);
  if (!missing.length) return { menu, repaired: false, missingBefore: 0 };

  const { data, error } = await supabase.functions.invoke("menu-ai-translation-complete", {
    body: { projectId, menu, languages },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw await parseFunctionError(error);
  if (!data?.ok || !data?.menu) throw new Error(data?.error || "Could not complete menu translations.");

  const remaining = findMissingRequestedMenuTranslations(data.menu, languages);
  if (remaining.length) throw new Error(`Could not complete ${remaining.length} requested menu translations.`);

  return {
    menu: data.menu,
    repaired: Boolean(data.repaired),
    missingBefore: missing.length,
    aiCost: data.aiCost || null,
  };
}
