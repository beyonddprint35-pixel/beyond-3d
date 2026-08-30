const SUPPORTED_LANGUAGES = ["en", "he", "ar"];

function text(value) {
  return value == null ? "" : String(value).trim();
}

function localizedValue(value, language) {
  if (value && typeof value === "object") return text(value[language]);
  return language === "en" ? text(value) : "";
}

function hasAnyLocalized(value) {
  if (value && typeof value === "object") return SUPPORTED_LANGUAGES.some((code) => text(value[code]));
  return Boolean(text(value));
}

function wrongScript(value, language) {
  const next = text(value);
  if (!next) return false;
  if (language === "ar") return /[\u0590-\u05ff]/.test(next) && !/[\u0600-\u06ff]/.test(next);
  if (language === "he") return /[\u0600-\u06ff]/.test(next) && !/[\u0590-\u05ff]/.test(next);
  if (language === "en") return /[\u0590-\u06ff]/.test(next) && !/[A-Za-z]/.test(next);
  return false;
}

function translated(value, language) {
  const next = localizedValue(value, language);
  return Boolean(next) && !wrongScript(next, language);
}

function priceOptionLabel(option, language) {
  return text(option?.[`label_${language}`]);
}

function optionHasAnyLabel(option) {
  return SUPPORTED_LANGUAGES.some((code) => priceOptionLabel(option, code)) || Boolean(text(option?.label));
}

export function buildMenuStudioReadiness({ menu = {}, design = null, languages } = {}) {
  const enabledLanguages = [...new Set((Array.isArray(languages) && languages.length ? languages : menu.languages || [menu.default_language || "en"])
    .filter((code) => SUPPORTED_LANGUAGES.includes(code)))];
  const defaultLanguage = enabledLanguages.includes(menu.default_language) ? menu.default_language : enabledLanguages[0] || "en";
  const visibleGroups = (menu.groups || []).filter((group) => group.visible !== false);
  const visibleGroupIds = new Set(visibleGroups.map((group) => group.id));
  const visibleItems = (menu.items || []).filter((item) => item.visible !== false && visibleGroupIds.has(item.group_id));
  const blockers = [];
  const warnings = [];
  const byLanguage = Object.fromEntries(enabledLanguages.map((code) => [code, { blockers: 0, warnings: 0 }]));

  function issue(level, issue) {
    const target = level === "blocker" ? blockers : warnings;
    target.push(issue);
    if (issue.language && byLanguage[issue.language]) byLanguage[issue.language][level === "blocker" ? "blockers" : "warnings"] += 1;
  }

  if (!text(menu.restaurant_name)) issue("blocker", { key: "restaurant-name", type: "content" });
  if (!visibleGroups.length) issue("blocker", { key: "visible-categories", type: "content" });
  if (!visibleItems.length) issue("blocker", { key: "visible-items", type: "content" });

  visibleGroups.forEach((group) => {
    const groupItems = visibleItems.filter((item) => item.group_id === group.id);
    if (!groupItems.length) issue("warning", { key: `empty-group:${group.id}`, type: "empty-category", groupId: group.id });
    enabledLanguages.forEach((language) => {
      if (!translated(group.name, language)) issue("blocker", { key: `group-name:${group.id}:${language}`, type: "translation", field: "category", groupId: group.id, language });
    });
  });

  visibleItems.forEach((item) => {
    enabledLanguages.forEach((language) => {
      if (!translated(item.name, language)) issue("blocker", { key: `item-name:${item.id}:${language}`, type: "translation", field: "item", itemId: item.id, language });
      if (hasAnyLocalized(item.description) && !translated(item.description, language)) issue("warning", { key: `item-description:${item.id}:${language}`, type: "translation", field: "description", itemId: item.id, language });
    });

    const options = Array.isArray(item.price_options) ? item.price_options : [];
    options.forEach((option, optionIndex) => {
      if (!optionHasAnyLabel(option)) return;
      enabledLanguages.forEach((language) => {
        const label = priceOptionLabel(option, language);
        if (!label || wrongScript(label, language)) issue("blocker", { key: `price-label:${item.id}:${optionIndex}:${language}`, type: "translation", field: "price-label", itemId: item.id, optionIndex, language });
      });
    });
  });

  const checks = {
    content: Boolean(text(menu.restaurant_name)) && visibleGroups.length > 0 && visibleItems.length > 0,
    design: Boolean(design),
    languages: enabledLanguages.length > 0 && enabledLanguages.includes(defaultLanguage),
    translations: !blockers.some((entry) => entry.type === "translation"),
  };

  return {
    ready: Object.values(checks).every(Boolean),
    checks,
    blockers,
    warnings,
    byLanguage,
    enabledLanguages,
    defaultLanguage,
    visibleGroups: visibleGroups.length,
    visibleItems: visibleItems.length,
    emptyGroups: warnings.filter((entry) => entry.type === "empty-category").length,
    translationBlockers: blockers.filter((entry) => entry.type === "translation").length,
    translationWarnings: warnings.filter((entry) => entry.type === "translation").length,
  };
}
