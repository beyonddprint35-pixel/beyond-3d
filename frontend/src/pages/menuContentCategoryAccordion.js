let installed = false;

export default function installMenuContentCategoryAccordion() {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const rowSelector = ".menu-content-v2 .menu-content-v2-category-row";
  const blockSelector = ".menu-content-v2-category-block";

  function setCollapsed(block, collapsed) {
    if (!block) return;
    block.classList.toggle("is-user-collapsed", collapsed);
    const items = block.querySelector(":scope > .menu-content-v2-items");
    if (items) {
      if (collapsed) items.style.setProperty("display", "none", "important");
      else items.style.removeProperty("display");
    }
    const row = block.querySelector(":scope > .menu-content-v2-category-row");
    if (row) row.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  document.addEventListener("click", (event) => {
    const row = event.target instanceof Element ? event.target.closest(rowSelector) : null;
    if (!row) return;

    const block = row.closest(blockSelector);
    const root = row.closest(".menu-content-v2");
    if (!block || !root) return;

    // Clicking an already user-collapsed selected category opens it again
    // without changing the current inspector selection.
    if (block.classList.contains("is-user-collapsed")) {
      event.preventDefault();
      event.stopPropagation();
      setCollapsed(block, false);
      return;
    }

    const isSelectedOpen = block.classList.contains("is-open") && row.classList.contains("active");

    // Clicking the same open category a second time collapses it.
    if (isSelectedOpen) {
      event.preventDefault();
      event.stopPropagation();
      setCollapsed(block, true);
      return;
    }

    // Opening another category closes any previously open/collapsed category.
    root.querySelectorAll(blockSelector).forEach((entry) => {
      if (entry !== block) setCollapsed(entry, true);
    });
    setCollapsed(block, false);
    // Allow the normal React click handler to select/open the new category.
  }, true);

  // React may re-render category contents. Re-apply the explicit collapsed
  // state after those updates so the second-click collapse remains visible.
  const observer = new MutationObserver(() => {
    document.querySelectorAll(`${blockSelector}.is-user-collapsed`).forEach((block) => {
      const items = block.querySelector(":scope > .menu-content-v2-items");
      if (items) items.style.setProperty("display", "none", "important");
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
