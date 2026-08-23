const NAV_SELECTOR = ".menu-home-nav";
const THREE_D_PATH = "/3DPRINTING";
const THREE_D_LABEL = "BEYOND 3D PRINTING";

function normalizePath(href) {
  try {
    return new URL(href, window.location.origin).pathname.toUpperCase();
  } catch {
    return "";
  }
}

function cleanHomepage3DLinks() {
  if (window.location.pathname !== "/") return;

  const nav = document.querySelector(NAV_SELECTOR);
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll("a"));
  const threeDLinks = links.filter((link) => normalizePath(link.getAttribute("href") || "") === THREE_D_PATH.toUpperCase());

  if (!threeDLinks.length) return;

  const primary = threeDLinks[0];
  primary.setAttribute("href", THREE_D_PATH);
  primary.textContent = THREE_D_LABEL;
  primary.setAttribute("aria-label", THREE_D_LABEL);

  threeDLinks.slice(1).forEach((link) => link.remove());
}

function scheduleCleanup() {
  window.requestAnimationFrame(cleanHomepage3DLinks);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleCleanup, { once: true });
} else {
  scheduleCleanup();
}

const observer = new MutationObserver(scheduleCleanup);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("popstate", scheduleCleanup);
