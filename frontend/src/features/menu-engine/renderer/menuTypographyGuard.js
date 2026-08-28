const HEADLINE_SELECTOR = [
  ".bme-menu .bme-brand strong",
  ".bme-menu .bme-hero h1",
  ".bme-menu .bme-category-nav button",
  ".bme-menu .bme-section-heading h2",
  ".bme-menu .bme-subcategory-heading h3",
  ".bme-menu .bme-item-copy h3",
  ".bme-heritage-exact .ep-brand-title",
  ".bme-heritage-exact .ep-hero-title",
  ".bme-heritage-exact .ep-tabs button",
  ".bme-heritage-exact .ep-section-head h2",
  ".bme-heritage-exact .ep-item-name",
].join(",");

const MENU_SELECTOR = ".bme-menu,.bme-heritage-exact";
const MIN_FONT_SIZE = Object.freeze({ hero: 18, section: 16, item: 11, compact: 9 });
const installedDocuments = new WeakMap();

function headlineKind(element) {
  if (element.matches(".bme-hero h1,.ep-hero-title")) return "hero";
  if (element.matches(".bme-section-heading h2,.bme-subcategory-heading h3,.ep-section-head h2")) return "section";
  if (element.matches(".bme-brand strong,.bme-category-nav button,.ep-brand-title,.ep-tabs button")) return "compact";
  return "item";
}

export function installMenuTypographyGuard(rootDocument = typeof document !== "undefined" ? document : null) {
  if (!rootDocument?.documentElement) return () => {};
  if (installedDocuments.has(rootDocument)) return installedDocuments.get(rootDocument);

  const rootWindow = rootDocument.defaultView;
  if (!rootWindow) return () => {};

  let canvasContext = null;
  let animationFrame = 0;
  let mutationObserver = null;
  let resizeObserver = null;

  function getCanvasContext() {
    if (canvasContext) return canvasContext;
    const canvas = rootDocument.createElement("canvas");
    canvasContext = canvas.getContext("2d");
    return canvasContext;
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
    const HTMLElementCtor = rootWindow.HTMLElement;
    if (!HTMLElementCtor || !(element instanceof HTMLElementCtor) || !element.isConnected) return;

    element.style.removeProperty("font-size");
    const style = rootWindow.getComputedStyle(element);
    const baseSize = Number.parseFloat(style.fontSize);
    const boxWidth = element.getBoundingClientRect().width;
    const paddingInline = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const availableWidth = Math.max(0, boxWidth - paddingInline);
    if (!Number.isFinite(baseSize) || baseSize <= 0 || availableWidth <= 0) return;

    const wordWidth = longestWordWidth(element, style, baseSize);
    if (!wordWidth || wordWidth <= availableWidth - 1) return;

    const minimum = MIN_FONT_SIZE[headlineKind(element)] || MIN_FONT_SIZE.item;
    const fittedSize = Math.max(minimum, Math.floor(baseSize * ((availableWidth - 2) / wordWidth) * 100) / 100);
    if (fittedSize < baseSize) element.style.setProperty("font-size", `${fittedSize}px`, "important");
  }

  function fitAllHeadlines() {
    rootDocument.querySelectorAll(HEADLINE_SELECTOR).forEach(fitHeadline);
  }

  function scheduleFit() {
    rootWindow.cancelAnimationFrame(animationFrame);
    animationFrame = rootWindow.requestAnimationFrame(fitAllHeadlines);
  }

  function observeMenus() {
    if (!resizeObserver) return;
    rootDocument.querySelectorAll(MENU_SELECTOR).forEach((menu) => resizeObserver.observe(menu));
  }

  const ResizeObserverCtor = rootWindow.ResizeObserver;
  if (ResizeObserverCtor) {
    resizeObserver = new ResizeObserverCtor(scheduleFit);
    observeMenus();
  }

  const MutationObserverCtor = rootWindow.MutationObserver;
  if (MutationObserverCtor) {
    mutationObserver = new MutationObserverCtor((mutations) => {
      let relevant = false;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          relevant = true;
          break;
        }
        for (const node of mutation.addedNodes) {
          if (!(node instanceof rootWindow.Element)) continue;
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
    mutationObserver.observe(rootDocument.documentElement, { childList: true, subtree: true, characterData: true });
  }

  rootWindow.addEventListener("resize", scheduleFit, { passive: true });
  rootDocument.fonts?.ready?.then(scheduleFit).catch(() => {});
  scheduleFit();

  const cleanup = () => {
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    rootWindow.removeEventListener("resize", scheduleFit);
    rootWindow.cancelAnimationFrame(animationFrame);
    installedDocuments.delete(rootDocument);
  };

  installedDocuments.set(rootDocument, cleanup);
  return cleanup;
}

export default installMenuTypographyGuard;
