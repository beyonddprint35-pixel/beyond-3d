const HEADLINE_SELECTOR = [
  ".bme-menu .bme-hero h1",
  ".bme-menu .bme-section-heading h2",
  ".bme-menu .bme-subcategory-heading h3",
  ".bme-menu .bme-item-copy h3",
  ".bme-heritage-exact .ep-hero-title",
  ".bme-heritage-exact .ep-section-head h2",
  ".bme-heritage-exact .ep-item-name",
].join(",");

const MENU_SELECTOR = ".bme-menu,.bme-heritage-exact";
const MIN_FONT_SIZE = Object.freeze({ hero: 18, section: 16, item: 11 });
let canvasContext = null;
let animationFrame = 0;
let mutationObserver = null;
let resizeObserver = null;

function getCanvasContext() {
  if (canvasContext || typeof document === "undefined") return canvasContext;
  const canvas = document.createElement("canvas");
  canvasContext = canvas.getContext("2d");
  return canvasContext;
}

function headlineKind(element) {
  if (element.matches(".bme-hero h1,.ep-hero-title")) return "hero";
  if (element.matches(".bme-section-heading h2,.bme-subcategory-heading h3,.ep-section-head h2")) return "section";
  return "item";
}

function longestWordWidth(element, style, fontSize) {
  const context = getCanvasContext();
  const words = String(element.textContent || "").trim().split(/\s+/u).filter(Boolean);
  if (!context || !words.length) return 0;

  context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
  return words.reduce((largest, word) => {
    const width = context.measureText(word).width + Math.max(0, word.length - 1) * letterSpacing;
    return Math.max(largest, width);
  }, 0);
}

function fitHeadline(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) return;

  element.style.removeProperty("font-size");
  const style = window.getComputedStyle(element);
  const baseSize = Number.parseFloat(style.fontSize);
  const availableWidth = element.getBoundingClientRect().width;
  if (!Number.isFinite(baseSize) || baseSize <= 0 || availableWidth <= 0) return;

  const wordWidth = longestWordWidth(element, style, baseSize);
  if (!wordWidth || wordWidth <= availableWidth - 1) return;

  const minimum = MIN_FONT_SIZE[headlineKind(element)] || MIN_FONT_SIZE.item;
  const fittedSize = Math.max(minimum, Math.floor(baseSize * ((availableWidth - 2) / wordWidth) * 100) / 100);
  if (fittedSize < baseSize) element.style.setProperty("font-size", `${fittedSize}px`, "important");
}

function fitAllHeadlines(root = document) {
  if (typeof document === "undefined") return;
  root.querySelectorAll?.(HEADLINE_SELECTOR).forEach(fitHeadline);
}

function scheduleFit() {
  if (typeof window === "undefined") return;
  window.cancelAnimationFrame(animationFrame);
  animationFrame = window.requestAnimationFrame(() => fitAllHeadlines(document));
}

function observeMenus() {
  if (!resizeObserver) return;
  document.querySelectorAll(MENU_SELECTOR).forEach((menu) => resizeObserver.observe(menu));
}

export function installMenuTypographyGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  if (window.__beyondMenuTypographyGuardInstalled) return () => {};
  window.__beyondMenuTypographyGuardInstalled = true;

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(scheduleFit);
    observeMenus();
  }

  mutationObserver = new MutationObserver((mutations) => {
    let relevant = false;
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        relevant = true;
        break;
      }
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(MENU_SELECTOR) || node.querySelector?.(MENU_SELECTOR) || node.matches?.(HEADLINE_SELECTOR) || node.querySelector?.(HEADLINE_SELECTOR)) {
          relevant = true;
          break;
        }
      }
      if (relevant) break;
    }
    if (relevant) {
      observeMenus();
      scheduleFit();
    }
  });

  mutationObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("resize", scheduleFit, { passive: true });
  document.fonts?.ready?.then(scheduleFit).catch(() => {});
  scheduleFit();

  return () => {
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener("resize", scheduleFit);
    window.cancelAnimationFrame(animationFrame);
    window.__beyondMenuTypographyGuardInstalled = false;
  };
}

export default installMenuTypographyGuard;
