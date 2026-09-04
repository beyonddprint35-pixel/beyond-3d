import { supabase } from "../../../lib/supabaseClient";

async function parseFunctionError(error, fallback) {
  let message = error?.message || fallback;
  try {
    const response = error?.context;
    if (response && typeof response.clone === "function") {
      const raw = await response.clone().text();
      if (raw) {
        try {
          const body = JSON.parse(raw);
          message = body?.error || body?.message || message;
        } catch {
          message = raw;
        }
      }
    }
  } catch {
    // Keep the original function error.
  }
  return new Error(message);
}

async function invokeOwnershipAdmin(body, fallback) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sign in to your Beyond admin account to manage menu ownership.");

  const { data, error } = await supabase.functions.invoke("admin-menu-ownership", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw await parseFunctionError(error, fallback);
  if (!data?.ok) throw new Error(data?.error || fallback);
  return data;
}

export async function loadAdminMenuOwnership() {
  return invokeOwnershipAdmin({ action: "overview" }, "Could not load menus and users.");
}

export async function transferAdminMenuOwnership(projectId, newOwnerId) {
  return invokeOwnershipAdmin(
    { action: "transfer", projectId, newOwnerId },
    "Could not reassign this menu.",
  );
}
