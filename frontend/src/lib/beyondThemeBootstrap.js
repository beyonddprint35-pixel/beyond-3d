const THEME_STORAGE_KEY = "beyond-theme";

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
