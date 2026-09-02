const THEME_STORAGE_KEY = "beyond-theme";

export function setBeyondTheme(value) {
  const theme = value === "light" ? "light" : "dark";
  try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Theme still works for this session. */ }
  document.documentElement.setAttribute("data-beyond-theme", theme);
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new CustomEvent("beyond-theme-change", { detail: { theme } }));
  return theme;
}

export function applyStoredBeyondTheme() {
  if (typeof document === "undefined") return "dark";

  let theme = "dark";
  try {
    theme = window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    theme = "dark";
  }

  document.documentElement.setAttribute("data-beyond-theme", theme);
  document.documentElement.style.colorScheme = theme;
  return theme;
}

applyStoredBeyondTheme();
