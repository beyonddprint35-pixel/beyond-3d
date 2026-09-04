import { supabase } from "../../../lib/supabaseClient";

async function callAdminDataDashboard(body) {
  const { data, error } = await supabase.functions.invoke("admin-data-dashboard", {
    body,
  });

  if (error) {
    throw new Error(error.message || "Admin data request failed.");
  }

  if (!data?.ok) {
    throw new Error(data?.error || "Admin data request failed.");
  }

  return data;
}

export async function loadAdminDataTables() {
  return callAdminDataDashboard({ action: "tables" });
}

export async function loadAdminDataRows(table, { limit = 50, offset = 0 } = {}) {
  return callAdminDataDashboard({ action: "list", table, limit, offset });
}

export async function insertAdminDataRow(table, payload) {
  return callAdminDataDashboard({ action: "insert", table, payload });
}

export async function updateAdminDataRow(table, key, payload) {
  return callAdminDataDashboard({ action: "update", table, key, payload });
}

export async function deleteAdminDataRow(table, key) {
  return callAdminDataDashboard({ action: "delete", table, key });
}
