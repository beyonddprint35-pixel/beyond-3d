import { supabase } from "../../../lib/supabaseClient";
import { buildPublishContract, validatePublishContract } from "../studio/publishContract";

function assertReady(session) {
  const contract = buildPublishContract(session);
  const result = validatePublishContract(contract);
  if (!result.ok) {
    const error = new Error(result.errors?.join(" · ") || "Menu is not ready to publish.");
    error.code = "publish_validation_failed";
    throw error;
  }
  return contract;
}

export async function publishMenuSession(session) {
  const contract = assertReady(session);
  const siteId = session?.source?.siteId;
  if (!siteId) throw new Error("Menu site is missing.");

  const { data, error } = await supabase.rpc("publish_menu_v3", {
    p_site_id: siteId,
    p_schema_version: Number(contract.schemaVersion || 1),
    p_menu_document: contract.menu,
    p_design_document: contract.design,
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

export async function loadMenuVersionHistory(siteId, limit = 20) {
  if (!siteId) return [];
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const { data, error } = await supabase
    .from("menu_v3_versions")
    .select("id,site_id,version_number,schema_version,published_at,published_by")
    .eq("site_id", siteId)
    .order("version_number", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data || [];
}

export async function activateMenuVersion(siteId, versionId) {
  if (!siteId || !versionId) throw new Error("Menu version is missing.");
  const { data, error } = await supabase.rpc("activate_menu_v3_version", {
    p_site_id: siteId,
    p_version_id: versionId,
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}
