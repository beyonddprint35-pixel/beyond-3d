let installed = false;

export default function installMenuContentCategoryAccordion() {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const selector = ".menu-content-v2 .menu-content-v2-category-row";

  document.addEventListener("click", (event) => {
    const row = event.target instanceof Element ? event.target.closest(selector) : null;
    if (!row) return;

    const block = row.closest(".menu-content-v2-category-block");
    const root = row.closest(".menu-content-v2");
    if (!block || !root) return;

    const isCurrentlyOpen = block.classList.contains("is-open") && !block.classList.contains("is-user-collapsed");

    root.querySelectorAll(".menu-content-v2-category-block.is-user-collapsed").forEach((entry) => {
      if (entry !== block) entry.classList.remove("is-user-collapsed");
    });

    if (isCurrentlyOpen && row.classList.contains("active")) {
      event.preventDefault();
      event.stopPropagation();
      block.classList.add("is-user-collapsed");
      row.setAttribute("aria-expanded", "false");
      return;
    }

    block.classList.remove("is-user-collapsed");
    row.setAttribute("aria-expanded", "true");
  }, true);
}
