import { useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { recordMenuAnalyticsEvent } from "./menuAnalytics";

const MENU_ROOT_SELECTOR = '[data-customer-template-menu="true"]';
const ITEM_SELECTOR = ".ep-menu-list article.ep-item-row, .ep-menu-list article.ep-wine-row";

function publicMenuSlug() {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(/^\/menu\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]).trim().toLowerCase() : "";
}

function isStudioPreviewFrame() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function languageFor(root) {
  const value = String(root?.getAttribute("lang") || "").trim().toLowerCase();
  return ["en", "he", "ar"].includes(value) ? value : "";
}

async function loadLegacyMenuIndex(slug) {
  const { data: site, error: siteError } = await supabase
    .from("menu_sites")
    .select("id")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (siteError) throw siteError;
  if (!site?.id) return null;

  const [groupResult, itemResult] = await Promise.all([
    supabase
      .from("menu_groups")
      .select("id,parent_id,sort_order,created_at")
      .eq("site_id", site.id)
      .eq("visible", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("menu_items")
      .select("id,group_id,sort_order,created_at")
      .eq("site_id", site.id)
      .eq("visible", true)
      .order("sort_order")
      .order("created_at"),
  ]);

  if (groupResult.error) throw groupResult.error;
  if (itemResult.error) throw itemResult.error;

  const groups = groupResult.data || [];
  const items = itemResult.data || [];
  const groupMap = new Map(groups.map((group) => [String(group.id), group]));
  const topGroups = groups.filter((group) => !group.parent_id);
  const itemsByTopGroup = new Map(topGroups.map((group) => [String(group.id), []]));

  function topGroupId(groupId) {
    let current = groupMap.get(String(groupId || ""));
    const visited = new Set();

    while (current) {
      const currentId = String(current.id);
      if (visited.has(currentId)) return "";
      visited.add(currentId);
      if (!current.parent_id) return currentId;
      current = groupMap.get(String(current.parent_id));
    }

    return "";
  }

  items.forEach((item) => {
    const rootId = topGroupId(item.group_id);
    if (!rootId || !itemsByTopGroup.has(rootId)) return;
    itemsByTopGroup.get(rootId).push(item);
  });

  return { topGroups, itemsByTopGroup };
}

export default function LegacyPublicMenuAnalytics() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const slug = publicMenuSlug();
    if (!slug || isStudioPreviewFrame()) return undefined;

    let disposed = false;
    let currentRoot = null;
    let currentIndex = null;
    let impressionObserver = null;
    let rootObserver = null;
    let documentObserver = null;
    let scheduledFrame = 0;
    let lastCategoryId = "";

    // Record the visit immediately from the public URL. This intentionally does
    // not wait for BeyondPublicMenu to finish rendering, so a menu view cannot
    // be lost because of renderer timing or legacy DOM differences.
    void recordMenuAnalyticsEvent({
      slug,
      type: "menu_view",
      language: "",
    });

    const cleanupRoot = () => {
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      scheduledFrame = 0;
      rootObserver?.disconnect();
      impressionObserver?.disconnect();
      if (currentRoot) currentRoot.removeEventListener("click", handleRootClick);
      rootObserver = null;
      impressionObserver = null;
      currentRoot = null;
      lastCategoryId = "";
    };

    const categoryButtons = () => Array.from(currentRoot?.querySelectorAll(".ep-tabs button") || []);

    const activeCategoryId = () => {
      if (!currentRoot || !currentIndex) return "";
      const buttons = categoryButtons();
      const activeIndex = buttons.findIndex((button) => button.classList.contains("active"));
      if (activeIndex < 0) return "";
      return String(currentIndex.topGroups[activeIndex]?.id || "");
    };

    const recordCategory = (categoryId) => {
      if (!categoryId || categoryId === lastCategoryId) return;
      lastCategoryId = categoryId;
      void recordMenuAnalyticsEvent({
        slug,
        type: "category_view",
        entityId: categoryId,
        language: languageFor(currentRoot),
      });
    };

    const bindItems = () => {
      if (!currentRoot || !currentIndex) return;
      const categoryId = activeCategoryId();
      if (!categoryId) return;

      const sourceItems = currentIndex.itemsByTopGroup.get(categoryId) || [];
      const articleNodes = Array.from(currentRoot.querySelectorAll(ITEM_SELECTOR));

      articleNodes.forEach((node, index) => {
        const itemId = String(sourceItems[index]?.id || "");
        if (!itemId) return;
        node.dataset.analyticsItemId = itemId;

        if (impressionObserver && node.dataset.analyticsObservedId !== itemId) {
          node.dataset.analyticsObservedId = itemId;
          impressionObserver.observe(node);
        }
      });
    };

    const sync = () => {
      if (!currentRoot || !currentIndex) return;
      recordCategory(activeCategoryId());
      bindItems();
    };

    const scheduleSync = () => {
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = 0;
        sync();
      });
    };

    function handleRootClick(event) {
      if (!currentRoot || !currentIndex) return;

      const categoryButton = event.target?.closest?.(".ep-tabs button");
      if (categoryButton && currentRoot.contains(categoryButton)) {
        const buttons = categoryButtons();
        const index = buttons.indexOf(categoryButton);
        recordCategory(String(currentIndex.topGroups[index]?.id || ""));
        scheduleSync();
        return;
      }

      const article = event.target?.closest?.("article[data-analytics-item-id]");
      if (!article || !currentRoot.contains(article)) return;
      const itemId = String(article.dataset.analyticsItemId || "");
      if (!itemId) return;

      void recordMenuAnalyticsEvent({
        slug,
        type: "item_open",
        entityId: itemId,
        language: languageFor(currentRoot),
      });
    }

    async function attach(root) {
      if (disposed || !root || root === currentRoot) return;
      cleanupRoot();
      currentRoot = root;

      try {
        currentIndex = await loadLegacyMenuIndex(slug);
        if (disposed || !currentIndex || currentRoot !== root) return;

        if ("IntersectionObserver" in window) {
          impressionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
              const itemId = String(entry.target?.dataset?.analyticsItemId || "");
              if (!itemId) return;
              impressionObserver?.unobserve(entry.target);
              void recordMenuAnalyticsEvent({
                slug,
                type: "item_impression",
                entityId: itemId,
                language: languageFor(currentRoot),
              });
            });
          }, { threshold: 0.55 });
        }

        currentRoot.addEventListener("click", handleRootClick);
        rootObserver = new MutationObserver(scheduleSync);
        rootObserver.observe(currentRoot, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "lang"],
        });
        sync();
      } catch (error) {
        if (import.meta.env.DEV) console.warn("Legacy public menu analytics could not initialize.", error);
      }
    }

    const detectRoot = () => {
      if (disposed) return;
      const root = document.querySelector(MENU_ROOT_SELECTOR);
      if (root) void attach(root);
    };

    documentObserver = new MutationObserver(detectRoot);
    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
    detectRoot();

    return () => {
      disposed = true;
      documentObserver?.disconnect();
      cleanupRoot();
    };
  }, []);

  return null;
}
