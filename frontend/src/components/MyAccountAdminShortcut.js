const SHORTCUT_CLASS = "account-admin-dashboard-shortcut";

function hasAdminSettings(nav) {
  return Array.from(nav.querySelectorAll("button")).some((button) =>
    String(button.textContent || "").trim().includes("Admin Settings")
  );
}

function syncAdminShortcut() {
  const nav = document.querySelector(".account-nav");

  if (!nav) return;

  const existing = nav.querySelector(`.${SHORTCUT_CLASS}`);
  const allowed = hasAdminSettings(nav);

  if (!allowed) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = SHORTCUT_CLASS;
  button.setAttribute("aria-label", "Open Admin Dashboard");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
      <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
      <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
      <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
    </svg>
    <span>Admin Dashboard</span>
    <svg class="account-admin-dashboard-arrow" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14"></path>
      <path d="m13 6 6 6-6 6"></path>
    </svg>
  `;

  button.addEventListener("click", () => {
    window.location.assign("/admin");
  });

  nav.appendChild(button);
}

function startAdminShortcutObserver() {
  syncAdminShortcut();

  const observer = new MutationObserver(() => {
    syncAdminShortcut();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAdminShortcutObserver, {
    once: true,
  });
} else {
  startAdminShortcutObserver();
}
