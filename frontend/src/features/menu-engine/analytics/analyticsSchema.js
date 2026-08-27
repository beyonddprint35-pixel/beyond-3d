export const MENU_ANALYTICS_SCHEMA_VERSION = 1;

export const MENU_ANALYTICS_EVENTS = Object.freeze({
  MENU_VIEW: "menu_view",
  CATEGORY_VIEW: "category_view",
  ITEM_IMPRESSION: "item_impression",
  ITEM_OPEN: "item_open",
  LANGUAGE_CHANGE: "language_change",
  BADGE_FILTER: "badge_filter",
  CTA_CLICK: "cta_click",
});

export const MENU_ANALYTICS_RETENTION_DAYS = 90;

export function createAnonymousMenuEvent({
  type,
  siteId,
  menuVersionId = null,
  groupId = null,
  itemId = null,
  language = null,
  sessionId = null,
  occurredAt = new Date().toISOString(),
  metadata = {},
}) {
  if (!Object.values(MENU_ANALYTICS_EVENTS).includes(type)) {
    throw new Error(`Unsupported menu analytics event: ${type}`);
  }

  return {
    schema_version: MENU_ANALYTICS_SCHEMA_VERSION,
    event_type: type,
    site_id: siteId,
    menu_version_id: menuVersionId,
    group_id: groupId,
    item_id: itemId,
    language,
    anonymous_session_id: sessionId,
    occurred_at: occurredAt,
    metadata,
  };
}

export const MENU_ANALYTICS_METRICS = Object.freeze({
  menuViews: "menu_views",
  categoryViews: "category_views",
  itemImpressions: "item_impressions",
  itemOpens: "item_opens",
  itemOpenRate: "item_open_rate",
  languageShare: "language_share",
});

export function buildMenuInsights({ topItems = [], lowVisibilityItems = [] } = {}) {
  const insights = [];

  if (topItems[0]) {
    insights.push({
      type: "promote_top_item",
      itemId: topItems[0].itemId,
      title: "Top viewed item",
      message: "Consider marking this item as Popular or Chef’s Choice, or placing it higher in the category.",
      requiresOwnerAction: true,
    });
  }

  if (lowVisibilityItems[0]) {
    insights.push({
      type: "improve_low_visibility_item",
      itemId: lowVisibilityItems[0].itemId,
      title: "Low visibility item",
      message: "Consider improving its photo, description, placement, or promotion badge.",
      requiresOwnerAction: true,
    });
  }

  return insights;
}
