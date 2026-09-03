import { readActiveMenuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";

const SHORTCUT_CLASS = "account-menu-studio-shortcut";

function openMenuStudioFast() {
  const projectId = readActiveMenuStudioProjectId();
  const target = projectId
    ? `/menu-studio/content?project=${encodeURIComponent(projectId)}`
    : "/menu-studio";

  if (`${window.location.pathname}${window.location.search}` === target) return;
  window.history.pushState({}, "", target);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
}

function syncMenuStudioShortcut() {
  const nav = document.querySelector(".account-nav");
  if (!nav) return;
  if (nav.querySelector(`.${SHORTCUT_CLASS}`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = SHORTCUT_CLASS;
  button.setAttribute("aria-label", "Open Menu Studio");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="3"></rect>
      <path d="M8 8h8"></path>
      <path d="M8 12h5"></path>
      <path d="M8 16h7"></path>
    </svg>
    <span>Menu Studio</span>
    <svg class="account-menu-studio-arrow" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14"></path>
      <path d="m13 6 6 6-6 6"></path>
    </svg>
  `;

  button.addEventListener("click", openMenuStudioFast);

  const profileButton = Array.from(nav.querySelectorAll("button")).find((item) =>
    String(item.textContent || "").trim() === "Profile"
  );
  if (profileButton) nav.insertBefore(button, profileButton);
  else nav.appendChild(button);
}

function startMenuStudioShortcutObserver() {
  syncMenuStudioShortcut();
  const observer = new MutationObserver(syncMenuStudioShortcut);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startMenuStudioShortcutObserver, { once: true });
} else {
  startMenuStudioShortcutObserver();
}
