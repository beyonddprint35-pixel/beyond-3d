import "./MenuDesignQuickAccordion.css";

const ROOT_SELECTOR = ".menu-design-v2 .studio-v3-design-quick-workspace";
const CARD_SELECTOR = ".studio-v3-quick-control-card";
const OPEN_CLASS = "beyond-quick-accordion-open";
const ITEM_CLASS = "beyond-quick-accordion-item";

function isAccordionCard(card) {
  const dot = card.querySelector(":scope > .studio-v3-quick-control-title > .dot");
  return Boolean(
    dot &&
      (dot.classList.contains("colors") ||
        dot.classList.contains("type") ||
        dot.classList.contains("hero-media-control"))
  );
}

function syncCardAccessibility(card) {
  const title = card.querySelector(":scope > .studio-v3-quick-control-title");
  if (!title) return;

  title.setAttribute("role", "button");
  title.setAttribute("tabindex", "0");
  title.setAttribute("aria-expanded", card.classList.contains(OPEN_CLASS) ? "true" : "false");

  const oldActionButton = title.querySelector(":scope > button");
  if (oldActionButton) {
    oldActionButton.setAttribute("tabindex", "-1");
    oldActionButton.setAttribute("aria-hidden", "true");
  }
}

function decorateAccordionCards() {
  document.querySelectorAll(`${ROOT_SELECTOR} ${CARD_SELECTOR}`).forEach((card) => {
    if (!isAccordionCard(card)) return;
    card.classList.add(ITEM_CLASS);
    syncCardAccessibility(card);
  });
}

function closeAllAccordionCards() {
  document.querySelectorAll(`${ROOT_SELECTOR} .${ITEM_CLASS}`).forEach((card) => {
    card.classList.remove(OPEN_CLASS);
    syncCardAccessibility(card);
  });
}

function toggleAccordionCard(card) {
  const shouldOpen = !card.classList.contains(OPEN_CLASS);
  closeAllAccordionCards();
  if (shouldOpen) card.classList.add(OPEN_CLASS);
  syncCardAccessibility(card);
}

function titleFromEventTarget(target) {
  if (!(target instanceof Element)) return null;
  const title = target.closest(`.${ITEM_CLASS} > .studio-v3-quick-control-title`);
  if (!title || !title.closest(ROOT_SELECTOR)) return null;
  return title;
}

if (typeof window !== "undefined" && !window.__beyondMenuDesignQuickAccordion) {
  window.__beyondMenuDesignQuickAccordion = true;

  document.addEventListener(
    "click",
    (event) => {
      const title = titleFromEventTarget(event.target);
      if (!title) return;

      event.preventDefault();
      event.stopPropagation();
      toggleAccordionCard(title.parentElement);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const title = titleFromEventTarget(event.target);
      if (!title || event.target !== title) return;

      event.preventDefault();
      event.stopPropagation();
      toggleAccordionCard(title.parentElement);
    },
    true
  );

  const observer = new MutationObserver(() => decorateAccordionCards());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  decorateAccordionCards();
}
