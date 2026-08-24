const ADMIN_THEME_KEY = "beyond-theme";
const ADMIN_ACTIVE_CLASS = "beyond-admin-active";
const THEME_BUTTON_CLASS = "admin-theme-toggle";
const HOME_BUTTON_CLASS = "admin-home-button";

function currentTheme() {
  try {
    return window.localStorage.getItem(ADMIN_THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function themeIcon(theme) {
  return theme === "dark"
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 15.1A8.5 8.5 0 0 1 8.9 3.7 8.5 8.5 0 1 0 20.3 15.1Z"></path></svg>`;
}

function homeIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V21h13V9.5"></path><path d="M9.5 21v-6h5v6"></path></svg>`;
}

function updateButtons(theme) {
  document
    .querySelectorAll(`.${THEME_BUTTON_CLASS}:not(.${HOME_BUTTON_CLASS})`)
    .forEach((button) => {
      if (button.dataset.theme !== theme) {
        button.innerHTML = themeIcon(theme);
        button.dataset.theme = theme;
      }
      button.setAttribute(
        "aria-label",
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      );
      button.setAttribute(
        "title",
        theme === "light" ? "Dark mode" : "Light mode"
      );
    });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-beyond-theme", theme);
  document.documentElement.style.colorScheme = theme;
  try {
    window.localStorage.setItem(ADMIN_THEME_KEY, theme);
  } catch {}
  updateButtons(theme);
}

function makeToggle(extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${THEME_BUTTON_CLASS} ${extraClass}`.trim();
  button.addEventListener("click", () => {
    const next = currentTheme() === "light" ? "dark" : "light";
    applyTheme(next);
  });
  return button;
}

function makeHomeButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${THEME_BUTTON_CLASS} ${HOME_BUTTON_CLASS}`;
  button.innerHTML = homeIcon();
  button.style.marginLeft = "auto";
  button.setAttribute("aria-label", "Home");
  button.setAttribute("title", "Home");
  button.addEventListener("click", () => {
    window.location.assign("/");
  });
  return button;
}

function ensureHomeButton(container) {
  if (!container || container.querySelector(`.${HOME_BUTTON_CLASS}`)) return;
  const button = makeHomeButton();
  const logout = container.querySelector(".admin-logout-button");
  if (logout) container.insertBefore(button, logout);
  else container.appendChild(button);
}

function ensureToggle(container, extraClass = "") {
  if (
    !container ||
    container.querySelector(`.${THEME_BUTTON_CLASS}:not(.${HOME_BUTTON_CLASS})`)
  ) {
    return;
  }

  const button = makeToggle(extraClass);
  const home = container.querySelector(`.${HOME_BUTTON_CLASS}`);
  const logout = container.querySelector(".admin-logout-button, .order-back-button");

  if (home) {
    button.style.marginLeft = "8px";
  }

  if (logout) container.insertBefore(button, logout);
  else container.appendChild(button);
}

function syncAdminTheme() {
  const adminPage = document.querySelector(
    ".admin-page, .admin-login-page, .order-details-page"
  );
  const isAdminRoute = window.location.pathname.startsWith("/admin");

  if (!adminPage && !isAdminRoute) {
    document.body.classList.remove(ADMIN_ACTIVE_CLASS);
    return;
  }

  document.body.classList.add(ADMIN_ACTIVE_CLASS);
  const theme = currentTheme();
  applyTheme(theme);

  const adminTopbar = document.querySelector(".admin-topbar");
  ensureHomeButton(adminTopbar);
  ensureToggle(adminTopbar);
  ensureToggle(document.querySelector(".order-details-topbar"));

  const loginCard = document.querySelector(".admin-login-card");
  if (
    loginCard &&
    !loginCard.querySelector(`.${THEME_BUTTON_CLASS}:not(.${HOME_BUTTON_CLASS})`)
  ) {
    loginCard.appendChild(makeToggle("admin-login-theme-toggle"));
  }

  updateButtons(theme);
}

function startAdminTheme() {
  syncAdminTheme();
  const observer = new MutationObserver(syncAdminTheme);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", syncAdminTheme);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAdminTheme, { once: true });
} else {
  startAdminTheme();
}
