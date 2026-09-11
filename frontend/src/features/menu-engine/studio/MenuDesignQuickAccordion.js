import "./MenuDesignQuickAccordion.css";

const ROOT_SELECTOR = ".menu-design-v2 .studio-v3-design-quick-workspace";
const CARD_SELECTOR = ".studio-v3-quick-control-card";
const TITLE_SELECTOR = ".studio-v3-quick-control-title";
const OPEN_ATTRIBUTE = "data-beyond-accordion-open";

function isAccordionCard(card) {
  if (!(card instanceof Element) || !card.matches(CARD_SELECTOR)) return false;
  const dot = card.querySelector(`:scope > ${TITLE_SELECTOR} > .dot`);
  return Boolean(
    dot &&
      (dot.classList.contains("colors") ||
        dot.classList.contains("type") ||
        dot.classList.contains("hero-media-control"))
  );
}

function accordionCards() {
  return Array.from(document.querySelectorAll(`${ROOT_SELECTOR} ${CARD_SELECTOR}`)).filter(isAccordionCard);
}

function syncAccessibility() {
  accordionCards().forEach((card) => {
    const title = card.querySelector(`:scope > ${TITLE_SELECTOR}`);
    if (!title) return;
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("aria-expanded", card.hasAttribute(OPEN_ATTRIBUTE) ? "true" : "false");

    const oldActionButton = title.querySelector(":scope > button");
    if (oldActionButton) {
      oldActionButton.setAttribute("tabindex", "-1");
      oldActionButton.setAttribute("aria-hidden", "true");
    }
  });
}

function closeAll(except = null) {
  accordionCards().forEach((card) => {
    if (card !== except) card.removeAttribute(OPEN_ATTRIBUTE);
  });
}

function toggleCard(card) {
  if (!isAccordionCard(card)) return;
  const shouldOpen = !card.hasAttribute(OPEN_ATTRIBUTE);
  closeAll();
  if (shouldOpen) card.setAttribute(OPEN_ATTRIBUTE, "true");
  syncAccessibility();
}

function getAccordionTitle(target) {
  if (!(target instanceof Element)) return null;
  const title = target.closest(TITLE_SELECTOR);
  if (!title) return null;
  const root = title.closest(ROOT_SELECTOR);
  if (!root) return null;
  const card = title.parentElement;
  return isAccordionCard(card) ? title : null;
}

if (typeof window !== "undefined" && !window.__beyondMenuDesignQuickAccordionV2) {
  window.__beyondMenuDesignQuickAccordionV2 = true;

  document.addEventListener(
    "click",
    (event) => {
      const title = getAccordionTitle(event.target);
      if (!title) return;

      event.preventDefault();
      event.stopPropagation();
      toggleCard(title.parentElement);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const title = getAccordionTitle(event.target);
      if (!title || event.target !== title) return;

      event.preventDefault();
      event.stopPropagation();
      toggleCard(title.parentElement);
    },
    true
  );

  const observer = new MutationObserver(() => syncAccessibility());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  syncAccessibility();
}
