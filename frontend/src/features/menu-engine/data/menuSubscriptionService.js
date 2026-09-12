import { supabase } from "../../../lib/supabaseClient";

const SUBSCRIPTION_CACHE_TTL = 60_000;
const subscriptionCache = new Map();
const subscriptionRequests = new Map();
const PRO_AI_PLAN_IDS = new Set(["premium", "pro"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

function cacheEntry(projectId) {
  return projectId ? subscriptionCache.get(String(projectId)) || null : null;
}

function cacheSubscription(projectId, data) {
  if (!projectId || !data) return data;
  subscriptionCache.set(String(projectId), { data, updatedAt: Date.now() });
  return data;
}

function subscriptionRecord(data) {
  if (!data || typeof data !== "object") return {};
  return data.subscription
    || data.currentSubscription
    || data.data?.subscription
    || data.data?.currentSubscription
    || data;
}

export function menuSubscriptionAccess(data) {
  const record = subscriptionRecord(data);
  const status = String(record?.status || data?.status || "").trim().toLowerCase();
  const planId = String(
    record?.plan_id
      || record?.planId
      || record?.plan?.id
      || data?.plan_id
      || data?.planId
      || data?.plan?.id
      || data?.selectedPlan?.id
      || "",
  ).trim().toLowerCase();
  const periodEnd = record?.current_period_end || record?.currentPeriodEnd || data?.current_period_end || data?.currentPeriodEnd || null;
  const periodEndMs = periodEnd ? Date.parse(periodEnd) : Number.NaN;
  const periodActive = !Number.isFinite(periodEndMs) || periodEndMs > Date.now();
  const active = ACTIVE_SUBSCRIPTION_STATUSES.has(status) && periodActive;
  const isPro = active && PRO_AI_PLAN_IDS.has(planId);

  return {
    status,
    planId,
    active,
    isPro,
    canUseAi: isPro,
  };
}

export function peekMenuSubscription(projectId, { allowStale = false } = {}) {
  const entry = cacheEntry(projectId);
  if (!entry) return null;
  if (!allowStale && Date.now() - entry.updatedAt > SUBSCRIPTION_CACHE_TTL) return null;
  return entry.data;
}

async function callMenuSubscription(body) {
  const { data, error } = await supabase.functions.invoke("menu-subscription", { body });
  if (error) throw new Error(error.message || "Subscription request failed.");
  if (!data?.ok) throw new Error(data?.error || "Subscription request failed.");
  return data;
}

export async function loadMenuSubscription(projectId, { force = false } = {}) {
  if (!projectId) throw new Error("Missing menu project id.");
  const key = String(projectId);
  const cached = peekMenuSubscription(key);
  if (!force && cached) return cached;
  if (subscriptionRequests.has(key)) return subscriptionRequests.get(key);

  const request = callMenuSubscription({ action: "status", projectId })
    .then((data) => cacheSubscription(key, data))
    .finally(() => subscriptionRequests.delete(key));
  subscriptionRequests.set(key, request);
  return request;
}

export function prefetchMenuSubscription(projectId) {
  if (!projectId) return Promise.resolve(null);
  return loadMenuSubscription(projectId).catch(() => null);
}

export async function selectMenuSubscriptionPlan(projectId, planId, billingInterval = "monthly") {
  const result = await callMenuSubscription({ action: "select_plan", projectId, planId, billingInterval });
  const previous = peekMenuSubscription(projectId, { allowStale: true }) || {};
  cacheSubscription(projectId, { ...previous, ...result });
  return result;
}

export async function activateMenuSubscriptionAsAdmin(projectId) {
  const result = await callMenuSubscription({ action: "admin_activate", projectId });
  const previous = peekMenuSubscription(projectId, { allowStale: true }) || {};
  cacheSubscription(projectId, { ...previous, ...result });
  return result;
}
