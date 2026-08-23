export const CUSTOMER_SHOWCASE_SETTINGS_KEY = "homepage_customer_showcase";

export const DEFAULT_CUSTOMER_SHOWCASE = {
  enabled: false,
  selected_site_ids: [],
};

export function normalizeCustomerShowcase(value) {
  const source = value && typeof value === "object" ? value : {};
  const selected = Array.isArray(source.selected_site_ids)
    ? source.selected_site_ids
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];

  return {
    enabled: Boolean(source.enabled),
    selected_site_ids: [...new Set(selected)],
  };
}

export function parseCustomerShowcase(value) {
  if (!value) return normalizeCustomerShowcase(DEFAULT_CUSTOMER_SHOWCASE);

  try {
    return normalizeCustomerShowcase(
      typeof value === "string" ? JSON.parse(value) : value
    );
  } catch (error) {
    console.error("Unable to parse customer showcase settings:", error);
    return normalizeCustomerShowcase(DEFAULT_CUSTOMER_SHOWCASE);
  }
}
