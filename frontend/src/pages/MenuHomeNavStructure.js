const NAV_SELECTOR = ".menu-home-nav";

function scrollToTarget(selector) {
  const target = document.querySelector(selector);
  if (!(target instanceof HTMLElement)) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeNav(nav) {
  nav.classList.remove("open");
  const toggle = document.querySelector(".menu-home-hamburger-always");
  if (toggle instanceof HTMLElement) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.click();
  }
}

function makeButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.beyondNavManaged = "true";
  button.addEventListener("click", onClick);
  return button;
}

function makeLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  link.dataset.beyondNavManaged = "true";
  return link;
}

function buildHomepageNavigation() {
  if (window.location.pathname !== "/") return;

  const nav = document.querySelector(NAV_SELECTOR);
  if (!(nav instanceof HTMLElement)) return;

  const studioSection = document.querySelector(".menu-home-studio-section");
  if (studioSection instanceof HTMLElement && !studioSection.id) {
    studioSection.id = "menu-studio";
  }

  const pricingPortal = document.querySelector(".menu-home-pricing-portal");
  if (pricingPortal instanceof HTMLElement) {
    pricingPortal.id = "pricing";
  }

  nav.querySelectorAll(":scope > button, :scope > a").forEach((node) => node.remove());

  const items = [
    makeButton("BEYOND Menu", () => {
      scrollToTarget("#product");
      closeNav(nav);
    }),
    makeButton("How it works", () => {
      scrollToTarget("#how-it-works");
      closeNav(nav);
    }),
    makeButton("BEYOND QR &NFC Stands", () => {
      scrollToTarget("#qr-nfc");
      closeNav(nav);
    }),
    makeButton("Live demo", () => {
      window.open("/menu/el-puerto", "_blank", "noopener,noreferrer");
      closeNav(nav);
    }),
    makeButton("BEYOND Menu studio", () => {
      scrollToTarget("#menu-studio");
      closeNav(nav);
    }),
    makeButton("BEYOND Pricing", () => {
      scrollToTarget("#pricing");
      closeNav(nav);
    }),
    makeLink("BEYOND 3D Printing", "/3DPRINTING"),
  ];

  items.forEach((item) => nav.appendChild(item));
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
