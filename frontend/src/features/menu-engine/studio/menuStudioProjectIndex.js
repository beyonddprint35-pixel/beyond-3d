import { supabase } from "../../../lib/supabaseClient";

// The Studio menu switcher only needs identity and display metadata. Never load
// structured_menu or studio_state for every menu just to paint the menu tabs;
// those JSON payloads can be very large and made the whole switcher wait.
const PROJECT_INDEX_COLUMNS = "id,name,status,source_type,activated_site_id,studio_schema_version,created_at,updated_at,last_opened_at,archived_at";

export async function listMenuStudioProjectSummaries() {
  const { data, error } = await supabase
    .from("menu_projects")
    .select(PROJECT_INDEX_COLUMNS)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
