function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function matchingButton(selector, label) {
  const target = clean(label);
  if (!target) return null;
  return [...document.querySelectorAll(selector)].find((button) => clean(button.querySelector("strong")?.textContent || button.textContent) === target) || null;
}

function revealAndClickItem(label, groupLabel) {
  const clickItem = () => {
    const item = matchingButton(".menu-content-v2-items > button:not(.menu-content-v2-add-item)", label);
    if (!item) return false;
    item.click();
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
  };
  if (clickItem()) return;
  const group = matchingButton(".menu-content-v2-category-row", groupLabel);
  if (group) group.click();
  requestAnimationFrame(() => requestAnimationFrame(clickItem));
}

export default function installMenuContentPreviewSelection() {
  if (typeof window === "undefined" || window.__beyondContentPreviewSelectionInstalled) return;
  window.__beyondContentPreviewSelectionInstalled = true;
  window.addEventListener("beyond-content-preview-select", (event) => {
    if (!window.location.pathname.startsWith("/menu-studio/content")) return;
    const detail = event.detail || {};
    if (detail.type === "item_open") {
      revealAndClickItem(detail.label, detail.groupLabel);
      return;
    }
    if (detail.type === "category_click") {
      const group = matchingButton(".menu-content-v2-category-row", detail.label);
      if (group) {
        group.click();
        group.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  });
}
