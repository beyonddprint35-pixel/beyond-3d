import { supabase } from "../../../lib/supabaseClient";

async function callMenuSubscription(body) {
  const { data, error } = await supabase.functions.invoke("menu-subscription", { body });
  if (error) throw new Error(error.message || "Subscription request failed.");
  if (!data?.ok) throw new Error(data?.error || "Subscription request failed.");
  return data;
}

export async function loadMenuSubscription(projectId) {
  return callMenuSubscription({ action: "status", projectId });
}

export async function selectMenuSubscriptionPlan(projectId, planId, billingInterval = "monthly") {
  return callMenuSubscription({ action: "select_plan", projectId, planId, billingInterval });
}

export async function activateMenuSubscriptionAsAdmin(projectId) {
  return callMenuSubscription({ action: "admin_activate", projectId });
}
