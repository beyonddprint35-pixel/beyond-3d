function openAdvancedSections() {
  if (typeof document === "undefined") return;

  document
    .querySelectorAll(".menu-content-v2-friendly-section:not(.menu-content-v2-translations) > .menu-content-v2-friendly-section-title")
    .forEach((button) => {
      const section = button.closest(".menu-content-v2-friendly-section");
      if (!section?.querySelector(".menu-content-v2-friendly-advanced-body")) button.click();
    });
}

export default function installMenuContentAdvancedAlwaysOpen() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(openAdvancedSections);
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
