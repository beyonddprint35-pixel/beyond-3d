const SHORTCUT_CLASS = "account-admin-dashboard-shortcut";

function hasAdminSettings(nav) {
  return Array.from(nav.querySelectorAll("button")).some((button) =>
    String(button.textContent || "").trim().includes("Admin Settings")
  );
}

function findAdminSettingsButton(nav) {
  return Array.from(nav.querySelectorAll("button")).find((button) =>
    String(button.textContent || "").trim().includes("Admin Settings")
  );
}

function makeShortcut() {
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
    Admin Dashboard
  `;

  button.addEventListener("click", () => {
    window.location.href = `${window.location.origin}/admin`;
  });

  return button;
}

function syncAdminShortcut() {
  const nav = document.querySelector(".account-nav");
  if (!nav) return;

  let existing = nav.querySelector(`.${SHORTCUT_CLASS}`);
  const allowed = hasAdminSettings(nav);

  if (!allowed) {
    existing?.remove();
    return;
  }

  if (!existing) {
    existing = makeShortcut();
  }

  // Keep it with the normal navigation items, directly before Admin Settings.
  const adminSettings = findAdminSettingsButton(nav);
  if (adminSettings && existing.nextElementSibling !== adminSettings) {
    nav.insertBefore(existing, adminSettings);
  } else if (!existing.isConnected) {
    nav.appendChild(existing);
  }
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
