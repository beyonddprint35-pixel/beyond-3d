export const STUDIO_STAGES = ["content", "design", "preview", "analytics", "publish"];

export const STUDIO_NAV_COPY = {
  en: { content: "Content", design: "Design", preview: "Preview", analytics: "Analytics", publish: "Publish", menus: "Your menus", language: "Language", light: "Switch to light mode", dark: "Switch to dark mode", back: "Back", switching: "Saving your menu…", switchError: "Could not save this menu. Please try again before switching.", retry: "Try again" },
  he: { content: "תוכן", design: "עיצוב", preview: "תצוגה", analytics: "אנליטיקה", publish: "פרסום", menus: "התפריטים שלך", language: "שפה", light: "מעבר למצב בהיר", dark: "מעבר למצב כהה", back: "חזרה", switching: "שומר את התפריט…", switchError: "לא ניתן לשמור את התפריט. נסו שוב לפני המעבר.", retry: "ניסיון נוסף" },
  ar: { content: "المحتوى", design: "التصميم", preview: "المعاينة", analytics: "التحليلات", publish: "النشر", menus: "قوائمك", language: "اللغة", light: "التبديل للوضع الفاتح", dark: "التبديل للوضع الداكن", back: "رجوع", switching: "جارٍ حفظ القائمة…", switchError: "تعذر حفظ القائمة. حاول مرة أخرى قبل التبديل.", retry: "حاول مجددًا" },
};

export function chooseStudioProject(projects, { projectId = "", siteId = "", activeId = "" } = {}) {
  if (projectId) return projects.find((project) => project.id === projectId) || null;
  if (siteId) return projects.find((project) => project.activated_site_id === siteId || project.studio_state?.menu?.site_id === siteId) || null;
  return projects.find((project) => project.id === activeId) || projects[0] || null;
}

export function studioProjectUrl(pathname, search, projectId) {
  const params = new URLSearchParams(search);
  // Import-specific parameters belong to the old menu and must not follow a switch.
  for (const key of ["site", "mode", "websiteImported", "design", "slug"]) params.delete(key);
  params.set("project", projectId);
  return `${pathname}?${params}`;
}

export function flushStudioDraft() {
  const detail = { saved: true };
  window.dispatchEvent(new CustomEvent("beyond-menu-studio-flush-draft", { detail }));
  return detail.saved;
}
