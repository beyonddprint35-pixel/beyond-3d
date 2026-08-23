const BRAND_SELECTOR = ".menu-home-brand > span";
const WORDMARK_CLASS = "menu-home-brand-wordmark";

function buildWordmark(node) {
  if (!(node instanceof HTMLElement)) return;
  if (node.classList.contains(WORDMARK_CLASS)) return;

  node.classList.add(WORDMARK_CLASS);
  node.setAttribute("aria-label", "BEYOND");
  node.innerHTML = `
    <span class="menu-home-brand-letter" aria-hidden="true">B</span>
    <span class="menu-home-brand-e" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
    <span class="menu-home-brand-letter" aria-hidden="true">Y</span>
    <span class="menu-home-brand-letter" aria-hidden="true">O</span>
    <span class="menu-home-brand-letter" aria-hidden="true">N</span>
    <span class="menu-home-brand-letter" aria-hidden="true">D</span>
  `;
}

function syncWordmark() {
  document.querySelectorAll(BRAND_SELECTOR).forEach(buildWordmark);
}

function startWordmarkObserver() {
  syncWordmark();

  const observer = new MutationObserver(() => {
    syncWordmark();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startWordmarkObserver, {
    once: true,
  });
} else {
  startWordmarkObserver();
}
