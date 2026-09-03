import { useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { recordMenuAnalyticsEvent } from "./menuAnalytics";

const MENU_ROOT_SELECTOR = '[data-customer-template-menu="true"][data-menu-site-id][data-menu-slug]';
const ITEM_SELECTOR = ".ep-menu-list article.ep-item-row, .ep-menu-list article.ep-wine-row";

function isPublicMenuPath() {
  if (typeof window === "undefined") return false;
  return /^\/menu\/[^/]+\/?$/.test(window.location.pathname);
}

function languageFor(root) {
  const value = String(root?.getAttribute("lang") || "").trim().toLowerCase();
  return ["en", "he", "ar"].includes(value) ? value : "";
}

async function loadLegacyMenuIndex(siteId) {
  const [groupResult, itemResult] = await Promise.all([
    supabase
      .from("menu_groups")
      .select("id,parent_id,sort_order,created_at")
      .eq("site_id", siteId)
      .eq("visible", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("menu_items")
      .select("id,group_id,sort_order,created_at")
      .eq("site_id", siteId)
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

/**
 * Analytics compatibility layer for the approved legacy public-menu renderer.
 *
 * /menu/:slug is currently intercepted by BeyondMenuRoute before App's newer
 * MenuPublicV3Dev route can render. This component deliberately instruments
 * only that legacy customer-menu DOM, keeping its visual renderer untouched
 * while sending the same canonical analytics events as the V3 renderer.
 */
export default function LegacyPublicMenuAnalytics() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    let disposed = false;
    let currentRoot = null;
    let currentIndex = null;
    let attachToken = 0;
    let rootMutationObserver = null;
    let impressionObserver = null;
    let scheduledFrame = 0;
    let lastCategoryId = "";

    const cleanupRoot = () => {
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      scheduledFrame = 0;
      rootMutationObserver?.disconnect();
      impressionObserver?.disconnect();
      if (currentRoot) currentRoot.removeEventListener("click", handleRootClick);
      rootMutationObserver = null;
      impressionObserver = null;
      currentIndex = null;
      lastCategoryId = "";
      currentRoot = null;
    };

    const currentSlug = () => String(currentRoot?.dataset?.menuSlug || "").trim().toLowerCase();

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
        slug: currentSlug(),
        type: "category_view",
        entityId: categoryId,
        language: languageFor(currentRoot),
      });
    };

    const bindVisibleItems = () => {
      if (!currentRoot || !currentIndex) return;
      const categoryId = activeCategoryId();
      if (!categoryId) return;

      const sourceItems = currentIndex.itemsByTopGroup.get(categoryId) || [];
      const articleNodes = Array.from(currentRoot.querySelectorAll(ITEM_SELECTOR));

      articleNodes.forEach((node, index) => {
        const itemId = String(sourceItems[index]?.id || "");
        if (!itemId) {
          delete node.dataset.analyticsItemId;
          return;
        }

        node.dataset.analyticsItemId = itemId;
        if (!impressionObserver) return;

        if (node.dataset.analyticsObservedId !== itemId) {
          node.dataset.analyticsObservedId = itemId;
          impressionObserver.observe(node);
        }
      });
    };

    const syncLegacyMenu = () => {
      if (!currentRoot || !currentIndex) return;
      const categoryId = activeCategoryId();
      if (categoryId) recordCategory(categoryId);
      bindVisibleItems();
    };

    const scheduleSync = () => {
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = requestAnimationFrame(() => {
          scheduledFrame = 0;
          syncLegacyMenu();
        });
      });
    };

    function handleRootClick(event) {
      if (!currentRoot || !currentIndex) return;

      const categoryButton = event.target?.closest?.(".ep-tabs button");
      if (categoryButton && currentRoot.contains(categoryButton)) {
        const buttons = categoryButtons();
        const index = buttons.indexOf(categoryButton);
        const categoryId = String(currentIndex.topGroups[index]?.id || "");
        recordCategory(categoryId);
        scheduleSync();
        return;
      }

      const article = event.target?.closest?.("article[data-analytics-item-id]");
      if (!article || !currentRoot.contains(article)) return;
      const itemId = String(article.dataset.analyticsItemId || "");
      if (!itemId) return;

      void recordMenuAnalyticsEvent({
        slug: currentSlug(),
        type: "item_open",
        entityId: itemId,
        language: languageFor(currentRoot),
      });
    }

    async function attach(root) {
      if (disposed || !root || !isPublicMenuPath()) return;
      if (root === currentRoot && currentIndex) {
        scheduleSync();
        return;
      }

      cleanupRoot();
      currentRoot = root;
      const token = ++attachToken;
      const slug = currentSlug();
      const siteId = String(root.dataset.menuSiteId || "").trim();
      if (!slug || !siteId) return;

      void recordMenuAnalyticsEvent({
        slug,
        type: "menu_view",
        language: languageFor(root),
      });

      try {
        const index = await loadLegacyMenuIndex(siteId);
        if (disposed || token !== attachToken || currentRoot !== root) return;
        currentIndex = index;

        if ("IntersectionObserver" in window) {
          impressionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
              const itemId = String(entry.target?.dataset?.analyticsItemId || "");
              if (!itemId) return;
              impressionObserver?.unobserve(entry.target);
              void recordMenuAnalyticsEvent({
                slug: currentSlug(),
                type: "item_impression",
                entityId: itemId,
                language: languageFor(currentRoot),
              });
            });
          }, { threshold: 0.55 });
        }

        currentRoot.addEventListener("click", handleRootClick);
        rootMutationObserver = new MutationObserver(scheduleSync);
        rootMutationObserver.observe(currentRoot, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "lang"],
        });
        syncLegacyMenu();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Legacy public menu analytics could not initialize.", error);
        }
      }
    }

    const detectMenu = () => {
      if (disposed) return;
      const root = isPublicMenuPath() ? document.querySelector(MENU_ROOT_SELECTOR) : null;
      if (!root) {
        if (currentRoot) cleanupRoot();
        return;
      }
      void attach(root);
    };

    const documentObserver = new MutationObserver(detectMenu);
    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
    detectMenu();

    return () => {
      disposed = true;
      attachToken += 1;
      documentObserver.disconnect();
      cleanupRoot();
    };
  }, []);

  return null;
}
