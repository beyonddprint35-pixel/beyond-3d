import { useEffect, useMemo, useRef, useState } from "react";
import MenuRenderer from "../renderer/MenuRenderer";
import "./MenuStudioMobilePreview.css";

const MOBILE_DEVICE = Object.freeze({ screenWidth: 390, screenHeight: 844, outerWidth: 422, outerHeight: 876 });
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isRtl = (language) => language === "he" || language === "ar";
const localized = (value, language) => value && typeof value === "object" ? String(value[language] || value.en || value.he || value.ar || "") : String(value || "");
const normalizedLabel = (value) => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();

function rootGroup(menu, groupId) {
  const groups = menu?.groups || [];
  const byId = new Map(groups.map((group) => [group.id, group]));
  let group = byId.get(groupId) || null;
  const visited = new Set();
  while (group?.parent_id && !visited.has(group.id)) {
    visited.add(group.id);
    group = byId.get(group.parent_id) || group;
    if (!group?.parent_id) break;
  }
  return group;
}

export default function MenuStudioMobilePreview({ menu, design, language = "en", minScale = 0.3, maxScale = 1, onSelectItem, onSelectCategory }) {
  const stageRef = useRef(null);
  const scrollRef = useRef(null);
  const focusCleanupRef = useRef(null);
  const previewNavigationRef = useRef(false);
  const [scale, setScale] = useState(0.72);

  useEffect(() => {
    const stage = stageRef.current; if (!stage) return undefined;
    const measure = () => { const rect = stage.getBoundingClientRect(); const next = clamp(Math.min(Math.max(180, rect.width - 44) / MOBILE_DEVICE.outerWidth, Math.max(300, rect.height - 44) / MOBILE_DEVICE.outerHeight, maxScale), minScale, maxScale); setScale(Number.isFinite(next) ? next : 0.72); };
    measure();
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }
    const observer = new ResizeObserver(measure); observer.observe(stage); return () => observer.disconnect();
  }, [maxScale, minScale]);

  useEffect(() => () => {
    if (focusCleanupRef.current) window.clearTimeout(focusCleanupRef.current);
  }, []);

  const holderStyle = useMemo(() => ({ width: `${Math.round(MOBILE_DEVICE.outerWidth * scale)}px`, height: `${Math.round(MOBILE_DEVICE.outerHeight * scale)}px` }), [scale]);
  const previewBackground = design?.theme?.background || "#fff";
  const deviceStyle = useMemo(() => ({ width: `${MOBILE_DEVICE.outerWidth}px`, height: `${MOBILE_DEVICE.outerHeight}px`, transform: `scale(${scale})`, "--studio-mobile-screen-width": `${MOBILE_DEVICE.screenWidth}px`, "--studio-mobile-screen-height": `${MOBILE_DEVICE.screenHeight}px`, "--studio-preview-menu-bg": previewBackground }), [scale, previewBackground]);

  const broadcast = (detail) => window.dispatchEvent(new CustomEvent("beyond-content-preview-select", { detail }));
  const handlePreviewEvent = (event) => {
    if (event?.type !== "item_open" || !event.entityId) return;
    const item = (menu?.items || []).find((entry) => entry.id === event.entityId);
    const group = item ? (menu?.groups || []).find((entry) => entry.id === item.group_id) : null;
    onSelectItem?.(event.entityId);
    broadcast({ ...event, label: localized(item?.name, language), groupLabel: localized(group?.name, language), language });
  };

  function previewCategoryButton(group) {
    if (!group || !scrollRef.current) return null;
    const wanted = normalizedLabel(localized(group.name, language));
    return [...scrollRef.current.querySelectorAll(".bme-category-nav button, .ep-tabs button")]
      .find((button) => normalizedLabel(button.textContent) === wanted) || null;
  }

  function scrollNodeIntoPreview(node) {
    if (!node || !scrollRef.current) return;
    const outer = scrollRef.current;
    const heritageList = node.closest?.(".ep-menu-list");
    const scroller = heritageList && heritageList.scrollHeight > heritageList.clientHeight + 4 ? heritageList : outer;
    const scrollerRect = scroller.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const top = scroller.scrollTop + nodeRect.top - scrollerRect.top - Math.max(16, scroller.clientHeight * 0.2);
    scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

    const previous = outer.querySelector(".menu-studio-preview-focus");
    previous?.classList.remove("menu-studio-preview-focus");
    node.classList.add("menu-studio-preview-focus");
    if (focusCleanupRef.current) window.clearTimeout(focusCleanupRef.current);
    focusCleanupRef.current = window.setTimeout(() => node.classList.remove("menu-studio-preview-focus"), 1150);
  }

  function findRenderedItem(item) {
    if (!item || !scrollRef.current) return null;
    const wanted = normalizedLabel(localized(item.name, language));
    const articles = [...scrollRef.current.querySelectorAll(".bme-classic-item, .bme-visual-item, .ep-item-row")];
    return articles.find((article) => {
      const nameNode = article.querySelector("h3, .ep-item-name");
      return normalizedLabel(nameNode?.textContent) === wanted;
    }) || null;
  }

  function findRenderedSubcategory(group) {
    if (!group || !scrollRef.current) return null;
    const wanted = normalizedLabel(localized(group.name, language));
    const sections = [...scrollRef.current.querySelectorAll(".bme-subcategory-section, .ep-item-category-wrap")];
    return sections.find((section) => {
      const nameNode = section.querySelector(".bme-subcategory-heading h3, .ep-item-category");
      return normalizedLabel(nameNode?.textContent) === wanted;
    }) || null;
  }

  function focusEditorSelection(target) {
    if (!target || !scrollRef.current) return;
    const group = target.type === "item"
      ? (menu?.groups || []).find((entry) => entry.id === target.item?.group_id)
      : target.group;
    const root = rootGroup(menu, group?.id);
    if (!root) return;

    const categoryButton = previewCategoryButton(root);
    if (categoryButton && categoryButton.getAttribute("aria-current") !== "true") {
      // This click is an internal navigation command, not a user selection from
      // the preview. Suppress the reverse preview->editor selection broadcast so
      // an item click on the left remains selected while its category is opened.
      previewNavigationRef.current = true;
      categoryButton.click();
      previewNavigationRef.current = false;
    }

    // Changing the active category is a React state update. Two animation frames
    // let the common renderer paint the requested category before we locate the
    // exact subcategory/item and move it into the simulated phone viewport.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (target.type === "item") {
        scrollNodeIntoPreview(findRenderedItem(target.item));
        return;
      }
      if (group?.parent_id) {
        scrollNodeIntoPreview(findRenderedSubcategory(group));
        return;
      }
      const heading = scrollRef.current?.querySelector(".bme-section-heading, .ep-section-head");
      if (heading) scrollNodeIntoPreview(heading);
      else scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }));
  }

  // Content Studio selection and the live preview are one workspace. Selecting
  // a category, subcategory or item in the structure tree should immediately
  // navigate the simulated guest menu to the same object. Keep this regulation
  // here so every menu design gets identical behavior without design-specific code.
  useEffect(() => {
    function handleEditorClick(event) {
      const itemButton = event.target.closest?.(".menu-content-v2-items > button:not(.menu-content-v2-add-item)");
      if (itemButton) {
        const itemName = normalizedLabel(itemButton.querySelector("strong")?.textContent);
        const categoryBlock = itemButton.closest(".menu-content-v2-category-block");
        const groupName = normalizedLabel(categoryBlock?.querySelector(":scope > .menu-content-v2-category-row strong")?.textContent);
        const matchingGroups = (menu?.groups || []).filter((entry) => normalizedLabel(localized(entry.name, language)) === groupName);
        let item = null;
        for (const candidateGroup of matchingGroups) {
          item = (menu?.items || []).find((entry) => entry.group_id === candidateGroup.id && normalizedLabel(localized(entry.name, language)) === itemName);
          if (item) break;
        }
        if (!item) item = (menu?.items || []).find((entry) => normalizedLabel(localized(entry.name, language)) === itemName);
        if (item) focusEditorSelection({ type: "item", item });
        return;
      }

      const categoryButton = event.target.closest?.(".menu-content-v2-category-row");
      if (categoryButton) {
        const groupName = normalizedLabel(categoryButton.querySelector("strong")?.textContent);
        const visibleRows = [...document.querySelectorAll(".menu-content-v2-category-row")];
        const clickedIndex = visibleRows.indexOf(categoryButton);
        const visibleGroups = (menu?.groups || []).filter((entry) => entry.visible !== false);
        const sameName = visibleGroups.filter((entry) => normalizedLabel(localized(entry.name, language)) === groupName);
        let group = sameName[0] || null;
        if (sameName.length > 1 && clickedIndex >= 0) {
          const rowNamesBefore = visibleRows.slice(0, clickedIndex + 1).filter((row) => normalizedLabel(row.querySelector("strong")?.textContent) === groupName).length - 1;
          group = sameName[rowNamesBefore] || group;
        }
        if (group) focusEditorSelection({ type: "category", group });
      }
    }

    document.addEventListener("click", handleEditorClick, true);
    return () => document.removeEventListener("click", handleEditorClick, true);
  }, [menu, language]);

  const handlePreviewClick = (event) => {
    const button = event.target.closest?.(".bme-category-nav button, .ep-tabs button"); if (!button) return;
    const label = String(button.textContent || "").trim(); if (!label) return;
    if (!previewNavigationRef.current) {
      onSelectCategory?.(label);
      broadcast({ type: "category_click", label, language });
    }

    // Category strips can be much wider than the simulated phone (Wine Book in
    // particular). CSS snapping alone does not guarantee that a clicked button
    // becomes fully visible. Recenter only the horizontal category scroller;
    // never use scrollIntoView here because it can also move the phone vertically.
    window.requestAnimationFrame(() => {
      const nav = button.closest?.(".bme-category-nav, .ep-tabs");
      if (!nav) return;
      const navRect = nav.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const safeInset = 18;
      if (buttonRect.left < navRect.left + safeInset || buttonRect.right > navRect.right - safeInset) {
        const delta = ((buttonRect.left + buttonRect.right) / 2) - ((navRect.left + navRect.right) / 2);
        nav.scrollBy({ left: delta, behavior: "smooth" });
      }
    });
  };

  return <div className="menu-studio-mobile-preview-fit" ref={stageRef}><div className="menu-studio-mobile-preview-holder" style={holderStyle}><div className="menu-studio-mobile-preview-device" style={deviceStyle}><div className="menu-studio-mobile-preview-hardware"><span className="menu-studio-mobile-preview-island" aria-hidden="true" /><div className="menu-studio-mobile-preview-screen" dir={isRtl(language) ? "rtl" : "ltr"} lang={language} onClickCapture={handlePreviewClick}><div ref={scrollRef} className="menu-studio-mobile-preview-scroll"><MenuRenderer menu={{ ...menu, default_language: language }} design={design} initialLanguage={language} onAnalyticsEvent={handlePreviewEvent} /></div></div><span className="menu-studio-mobile-preview-home" aria-hidden="true" /></div></div></div></div>;
}
