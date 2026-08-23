const NAV_SELECTOR = ".menu-home-nav";

const NAV_ITEMS = [
  { label: "BEYOND Menu", type: "section", target: "#product" },
  { label: "BEYOND How it works", type: "section", target: "#how-it-works" },
  { label: "BEYOND QR &NFC Stands", type: "section", target: "#qr-nfc" },
  { label: "BEYOND Live Demo", type: "demo" },
  { label: "BEYOND Menu studio", type: "section", target: "#menu-studio" },
  { label: "BEYOND Pricing", type: "section", target: "#pricing" },
  { label: "BEYOND 3D Printing", type: "link", target: "/3DPRINTING" },
];

function ensureSectionIds() {
  const studioSection = document.querySelector(".menu-home-studio-section");
  if (studioSection instanceof HTMLElement && studioSection.id !== "menu-studio") {
    studioSection.id = "menu-studio";
  }

  const pricingPortal = document.querySelector(".menu-home-pricing-portal");
  if (pricingPortal instanceof HTMLElement && pricingPortal.id !== "pricing") {
    pricingPortal.id = "pricing";
  }
}

function closeNav() {
  const toggle = document.querySelector(".menu-home-hamburger-always");
  if (toggle instanceof HTMLElement && toggle.getAttribute("aria-expanded") === "true") {
    toggle.click();
    return true;
  }
  return false;
}

function scrollToTarget(selector, attempt = 0) {
  ensureSectionIds();

  const target = document.querySelector(selector);
  if (!(target instanceof HTMLElement)) {
    if (attempt < 8) {
      window.setTimeout(() => scrollToTarget(selector, attempt + 1), 80);
    }
    return;
  }

  const navbar = document.querySelector(".menu-home-navbar");
  const navbarHeight = navbar instanceof HTMLElement ? navbar.getBoundingClientRect().height : 0;
  const top = window.scrollY + target.getBoundingClientRect().top - navbarHeight - 18;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });

  try {
    window.history.replaceState(null, "", selector);
  } catch {}
}

function navigateToSection(selector) {
  const didClose = closeNav();

  window.setTimeout(() => {
    window.requestAnimationFrame(() => scrollToTarget(selector));
  }, didClose ? 90 : 0);
}

function currentStructureIsCorrect(nav) {
  const actionable = Array.from(nav.children).filter(
    (node) => node instanceof HTMLButtonElement || node instanceof HTMLAnchorElement
  );

  if (actionable.length !== NAV_ITEMS.length) return false;

  return NAV_ITEMS.every((item, index) => {
    const node = actionable[index];
    if (node.getAttribute("aria-label") !== item.label) return false;
    if (!node.querySelector(".menu-home-nav-brand-word")) return false;
    if (item.type === "link") {
      return node instanceof HTMLAnchorElement && node.getAttribute("href") === item.target;
    }
    return node instanceof HTMLButtonElement;
  });
}

function renderLabel(node, label) {
  node.replaceChildren();
  node.setAttribute("aria-label", label);

  if (label.startsWith("BEYOND ")) {
    const brand = document.createElement("span");
    brand.className = "menu-home-nav-brand-word";
    brand.textContent = "BEYOND";

    const rest = document.createElement("span");
    rest.className = "menu-home-nav-label-rest";
    rest.textContent = label.slice("BEYOND ".length);

    node.append(brand, rest);
    return;
  }

  node.textContent = label;
}

function makeButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  renderLabel(button, item.label);
  button.dataset.beyondNavManaged = "true";

  button.addEventListener("click", () => {
    if (item.type === "demo") {
      closeNav();
      window.setTimeout(() => {
        window.open("/menu/el-puerto", "_blank", "noopener,noreferrer");
      }, 60);
      return;
    }

    navigateToSection(item.target);
  });

  return button;
}

function makeLink(item) {
  const link = document.createElement("a");
  link.href = item.target;
  renderLabel(link, item.label);
  link.dataset.beyondNavManaged = "true";
  return link;
}

function buildHomepageNavigation() {
  if (window.location.pathname !== "/") return;

  ensureSectionIds();

  const nav = document.querySelector(NAV_SELECTOR);
  if (!(nav instanceof HTMLElement) || currentStructureIsCorrect(nav)) return;

  nav.querySelectorAll(":scope > button, :scope > a").forEach((node) => node.remove());

  NAV_ITEMS.forEach((item) => {
    nav.appendChild(item.type === "link" ? makeLink(item) : makeButton(item));
  });
}

let queued = false;
function queueBuild() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    buildHomepageNavigation();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", queueBuild, { once: true });
} else {
  queueBuild();
}

const observer = new MutationObserver(queueBuild);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", queueBuild);
