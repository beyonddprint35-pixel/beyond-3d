const MIN_UI_FONT_PX = 12;
const TEXT_SELECTOR = "button,input,textarea,select,label,small,p,span,strong,a,div";
const EXCLUDED_SELECTOR = [
  ".studio-v3-preview-device-screen",
  ".menu-content-v2-canvas",
  ".bme-heritage-exact",
  ".ep-app",
  ".bme-menu-shell",
  ".bme-menu-renderer",
  "[data-menu-renderer]",
  "[data-beyond-menu-preview]",
  "svg",
].join(",");

function isExcluded(element) {
  return Boolean(element.closest(EXCLUDED_SELECTOR));
}

function hasReadableTextRole(element) {
  if (!element.matches(TEXT_SELECTOR)) return false;
  if (element.matches("div") && element.children.length > 0 && !element.childNodes.length) return false;
  const text = (element.textContent || element.value || element.getAttribute("placeholder") || "").trim();
  return Boolean(text) || element.matches("input,textarea,select");
}

function enforceElement(element) {
  if (!(element instanceof HTMLElement) || isExcluded(element) || !hasReadableTextRole(element)) return;
  const size = Number.parseFloat(window.getComputedStyle(element).fontSize || "0");
  if (Number.isFinite(size) && size > 0 && size < MIN_UI_FONT_PX) {
    element.classList.add("beyond-ui-readable-min");
  }
}

function scan(root) {
  if (!(root instanceof Element || root instanceof Document)) return;
  if (root instanceof Element) enforceElement(root);
  root.querySelectorAll(TEXT_SELECTOR).forEach(enforceElement);
}

export default function installUiTypographyGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const runInitialScan = () => window.requestAnimationFrame(() => scan(document));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInitialScan, { once: true });
  } else {
    runInitialScan();
  }

  const observer = new MutationObserver((mutations) => {
    window.requestAnimationFrame(() => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}
