import { useEffect, useState } from "react";
import "./MenuItemNameColorControl.css";

const COPY = {
  en: {
    title: "Text styles",
    hint: "Set color, size and formatting for every text style.",
    reset: "Use theme color",
    styleReset: "Reset style",
    black: "Black",
    fontSize: "Font size",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    brandGroup: "Brand",
    heroGroup: "Hero & header",
    categoriesGroup: "Categories",
    itemsGroup: "Menu items",
    footerGroup: "Footer",
    brandTitle: "Restaurant name",
    brandSubtitle: "Restaurant subtitle",
    heroKicker: "Hero small label",
    heroTitle: "Hero title",
    categoryNav: "Category tabs",
    sectionTitle: "Category title",
    subcategoryTitle: "Subcategory title",
    itemName: "Item name",
    description: "Description",
    price: "Price",
    priceType: "Price type",
    note: "Category notes",
    footer: "Footer text",
  },
  he: {
    title: "סגנונות טקסט",
    hint: "בחרו צבע, גודל ועיצוב לכל סוג טקסט בנפרד.",
    reset: "השתמש בצבע העיצוב",
    styleReset: "איפוס סגנון",
    black: "שחור",
    fontSize: "גודל פונט",
    bold: "מודגש",
    italic: "נטוי",
    underline: "קו תחתון",
    brandGroup: "מותג",
    heroGroup: "Hero וכותרת",
    categoriesGroup: "קטגוריות",
    itemsGroup: "פריטי תפריט",
    footerGroup: "תחתית",
    brandTitle: "שם המסעדה",
    brandSubtitle: "כותרת משנה למסעדה",
    heroKicker: "תווית קטנה ב-Hero",
    heroTitle: "כותרת Hero",
    categoryNav: "לשוניות קטגוריה",
    sectionTitle: "כותרת קטגוריה",
    subcategoryTitle: "כותרת תת-קטגוריה",
    itemName: "שם הפריט",
    description: "תיאור",
    price: "מחיר",
    priceType: "סוג מחיר",
    note: "הערות קטגוריה",
    footer: "טקסט תחתון",
  },
  ar: {
    title: "أنماط النص",
    hint: "اختر اللون والحجم والتنسيق لكل نوع نص بشكل مستقل.",
    reset: "استخدم لون التصميم",
    styleReset: "إعادة ضبط النمط",
    black: "أسود",
    fontSize: "حجم الخط",
    bold: "عريض",
    italic: "مائل",
    underline: "تحته خط",
    brandGroup: "العلامة",
    heroGroup: "الواجهة والعنوان",
    categoriesGroup: "الفئات",
    itemsGroup: "عناصر القائمة",
    footerGroup: "التذييل",
    brandTitle: "اسم المطعم",
    brandSubtitle: "العنوان الفرعي للمطعم",
    heroKicker: "النص الصغير في الواجهة",
    heroTitle: "عنوان الواجهة",
    categoryNav: "تبويبات الفئات",
    sectionTitle: "عنوان الفئة",
    subcategoryTitle: "عنوان الفئة الفرعية",
    itemName: "اسم العنصر",
    description: "الوصف",
    price: "السعر",
    priceType: "نوع السعر",
    note: "ملاحظات الفئة",
    footer: "نص التذييل",
  },
};

const ROLE_DEFINITIONS = Object.freeze([
  { key: "brandTitleColor", slug: "brand-title", group: "brandGroup", label: "brandTitle", standardVar: "--bme-brand-title-color", heritageVar: "--ep-brand-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "brandSubtitleColor", slug: "brand-subtitle", group: "brandGroup", label: "brandSubtitle", standardVar: "--bme-brand-subtitle-color", heritageVar: "--ep-brand-subtitle-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "heroKickerColor", slug: "hero-kicker", group: "heroGroup", label: "heroKicker", standardVar: "--bme-hero-kicker-color", heritageVar: "--ep-hero-kicker-color", fallback: design => design?.theme?.accent || "#556B2F" },
  { key: "heroTitleColor", slug: "hero-title", group: "heroGroup", label: "heroTitle", standardVar: "--bme-hero-title-color", heritageVar: "--ep-hero-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "categoryNavColor", slug: "category-nav", group: "categoriesGroup", label: "categoryNav", standardVar: "--bme-category-nav-color", heritageVar: "--ep-category-nav-color", fallback: design => design?.layout?.navigationStyle === "pills" ? (design?.theme?.text || "#121212") : (design?.theme?.muted || "#7B756E") },
  { key: "sectionTitleColor", slug: "section-title", group: "categoriesGroup", label: "sectionTitle", standardVar: "--bme-section-title-color", heritageVar: "--ep-section-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "subcategoryTitleColor", slug: "subcategory-title", group: "categoriesGroup", label: "subcategoryTitle", standardVar: "--bme-subcategory-title-color", heritageVar: "--ep-subcategory-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "noteColor", slug: "note", group: "categoriesGroup", label: "note", standardVar: "--bme-note-color", heritageVar: "--ep-note-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "itemNameColor", slug: "item-name", group: "itemsGroup", label: "itemName", standardVar: "--bme-item-name-color", heritageVar: "--ep-item-name-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "descriptionColor", slug: "description", group: "itemsGroup", label: "description", standardVar: "--bme-description-color", heritageVar: "--ep-description-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "priceColor", slug: "price", group: "itemsGroup", label: "price", standardVar: "--bme-price-color", heritageVar: "--ep-price-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "priceTypeColor", slug: "price-type", group: "itemsGroup", label: "priceType", standardVar: "--bme-price-type-color", heritageVar: "--ep-price-type-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "footerColor", slug: "footer", group: "footerGroup", label: "footer", standardVar: "--bme-footer-color", heritageVar: "--ep-footer-color", fallback: design => design?.theme?.muted || "#7B756E" },
]);

const ROLE_GROUPS = Object.freeze(["brandGroup", "heroGroup", "categoriesGroup", "itemsGroup", "footerGroup"]);
const WORD_FONT_SIZES = Object.freeze([8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 46, 48, 54, 60, 64, 72]);

function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

function clampTextSize(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(72, Math.max(8, Math.round(parsed))) : 16;
}

function roleSizeFallback(role, design) {
  const type = design?.typography || {};
  const values = {
    "brand-title": type.brandSize || 19,
    "brand-subtitle": type.categorySize || 11,
    "hero-kicker": type.categorySize || 11,
    "hero-title": type.heroSize || 46,
    "category-nav": type.categorySize || 11,
    "section-title": type.sectionSize || 38,
    "subcategory-title": type.itemNameSize || 16,
    "note": type.descriptionSize || 11,
    "item-name": type.itemNameSize || 16,
    description: type.descriptionSize || 11,
    price: type.priceSize || 16,
    "price-type": type.descriptionSize || 11,
    footer: type.categorySize || 11,
  };
  return clampTextSize(values[role.slug]);
}

function roleBoldFallback(role, design) {
  const type = design?.typography || {};
  if (["brand-title", "hero-title", "section-title", "subcategory-title"].includes(role.slug)) return Number(type.headingWeight || 700) >= 600;
  if (["item-name", "price"].includes(role.slug)) return Number(type.itemWeight || 700) >= 600;
  return false;
}

function storedRoleStyle(role, design) {
  const value = design?.typography?.roles?.[role.slug];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolvedRoleStyle(role, design) {
  const stored = storedRoleStyle(role, design);
  return {
    size: Object.prototype.hasOwnProperty.call(stored, "size") ? clampTextSize(stored.size) : roleSizeFallback(role, design),
    bold: typeof stored.bold === "boolean" ? stored.bold : roleBoldFallback(role, design),
    italic: typeof stored.italic === "boolean" ? stored.italic : false,
    underline: typeof stored.underline === "boolean" ? stored.underline : false,
  };
}

function previewDocuments() {
  if (typeof document === "undefined") return [];
  const documents = [document];
  document.querySelectorAll("iframe.studio-v3-design-device-iframe").forEach((frame) => {
    try {
      if (frame.contentDocument) documents.push(frame.contentDocument);
    } catch {
      // Studio preview iframes are same-origin; ignore a transient reload.
    }
  });
  return documents;
}

function syncStudioPreviewRole(role, color, enabled = true) {
  previewDocuments().forEach((targetDocument) => {
    targetDocument.querySelectorAll(".bme-menu,.bme-heritage-exact").forEach((root) => {
      const heritage = root.classList.contains("bme-heritage-exact");
      const variable = heritage ? role.heritageVar : role.standardVar;
      const className = `bme-custom-color-${role.slug}`;
      if (enabled) {
        root.classList.add(className);
        root.style.setProperty(variable, color);
      } else {
        root.classList.remove(className);
        root.style.removeProperty(variable);
      }
    });
  });
}

function syncStudioPreviewTypographyRole(role, stored = {}) {
  const keys = ["size", "bold", "italic", "underline"];
  const enabled = keys.some((key) => Object.prototype.hasOwnProperty.call(stored, key));
  previewDocuments().forEach((targetDocument) => {
    targetDocument.querySelectorAll(".bme-menu,.bme-heritage-exact").forEach((root) => {
      const prefix = root.classList.contains("bme-heritage-exact") ? "ep" : "bme";
      const className = `bme-custom-type-${role.slug}`;
      const variables = {
        size: `--${prefix}-${role.slug}-size`,
        bold: `--${prefix}-${role.slug}-weight`,
        italic: `--${prefix}-${role.slug}-style`,
        underline: `--${prefix}-${role.slug}-decoration`,
      };
      if (!enabled) {
        root.classList.remove(className);
        Object.values(variables).forEach((variable) => root.style.removeProperty(variable));
        return;
      }
      root.classList.add(className);
      if (Object.prototype.hasOwnProperty.call(stored, "size")) root.style.setProperty(variables.size, `${clampTextSize(stored.size)}px`); else root.style.removeProperty(variables.size);
      if (Object.prototype.hasOwnProperty.call(stored, "bold")) root.style.setProperty(variables.bold, stored.bold ? "700" : "400"); else root.style.removeProperty(variables.bold);
      if (Object.prototype.hasOwnProperty.call(stored, "italic")) root.style.setProperty(variables.italic, stored.italic ? "italic" : "normal"); else root.style.removeProperty(variables.italic);
      if (Object.prototype.hasOwnProperty.call(stored, "underline")) root.style.setProperty(variables.underline, stored.underline ? "underline" : "none"); else root.style.removeProperty(variables.underline);
    });
  });
}

function TextStyleField({ role, design, t, patchDesign }) {
  const custom = normalizeHex(design?.theme?.[role.key]);
  const fallback = normalizeHex(role.fallback(design)) || "#121212";
  const value = custom || fallback;
  const storedStyle = storedRoleStyle(role, design);
  const style = resolvedRoleStyle(role, design);
  const hasCustomStyle = ["size", "bold", "italic", "underline"].some((key) => Object.prototype.hasOwnProperty.call(storedStyle, key));
  const [hexDraft, setHexDraft] = useState(value);
  const fontSizes = [...new Set([...WORD_FONT_SIZES, style.size])].sort((a, b) => a - b);

  useEffect(() => {
    setHexDraft(value);
    syncStudioPreviewRole(role, value, Boolean(custom));
    syncStudioPreviewTypographyRole(role, storedStyle);
    const frame = window.requestAnimationFrame(() => {
      syncStudioPreviewRole(role, value, Boolean(custom));
      syncStudioPreviewTypographyRole(role, storedStyle);
    });
    const timer = window.setTimeout(() => {
      syncStudioPreviewRole(role, value, Boolean(custom));
      syncStudioPreviewTypographyRole(role, storedStyle);
    }, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [custom, value, role, storedStyle.size, storedStyle.bold, storedStyle.italic, storedStyle.underline]);

  function setColor(nextColor) {
    const normalized = normalizeHex(nextColor);
    if (!normalized) return;
    syncStudioPreviewRole(role, normalized, true);
    patchDesign((current) => ({
      ...current,
      theme: { ...current.theme, [role.key]: normalized },
    }));
  }

  function commitHex() {
    const normalized = normalizeHex(hexDraft);
    if (normalized) {
      setColor(normalized);
      setHexDraft(normalized);
    } else {
      setHexDraft(value);
    }
  }

  function resetColor() {
    syncStudioPreviewRole(role, fallback, false);
    patchDesign((current) => {
      const theme = { ...current.theme };
      delete theme[role.key];
      return { ...current, theme };
    });
  }

  function patchTypographyStyle(nextPatch) {
    const nextStored = { ...storedRoleStyle(role, design), ...nextPatch };
    syncStudioPreviewTypographyRole(role, nextStored);
    patchDesign((current) => {
      const typography = { ...current.typography };
      const roles = { ...(typography.roles || {}) };
      roles[role.slug] = { ...(roles[role.slug] || {}), ...nextPatch };
      typography.roles = roles;
      return { ...current, typography };
    });
  }

  function resetTypographyStyle() {
    syncStudioPreviewTypographyRole(role, {});
    patchDesign((current) => {
      const typography = { ...current.typography };
      const roles = { ...(typography.roles || {}) };
      delete roles[role.slug];
      typography.roles = roles;
      return { ...current, typography };
    });
  }

  return (
    <div className="menu-text-style-field">
      <span className="menu-text-style-label">{t[role.label]}</span>
      <div className="menu-text-style-toolbar">
        <label className="menu-text-color-picker" title={t[role.label]}>
          <input className="menu-text-color-native" type="color" value={value} onChange={(event) => setColor(event.target.value)} aria-label={t[role.label]} />
          <span className="menu-text-color-swatch" style={{ background: value }} aria-hidden="true" />
          <input
            className="menu-text-color-hex"
            type="text"
            value={hexDraft}
            inputMode="text"
            spellCheck="false"
            maxLength={7}
            onChange={(event) => setHexDraft(event.target.value.toUpperCase())}
            onBlur={commitHex}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitHex();
                event.currentTarget.blur();
              }
            }}
            aria-label={`${t[role.label]} hex`}
          />
        </label>

        <label className="menu-text-size-control" title={t.fontSize}>
          <select value={style.size} onChange={(event) => patchTypographyStyle({ size: Number(event.target.value) })} aria-label={`${t[role.label]} ${t.fontSize}`}>
            {fontSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>

        <div className="menu-text-format-buttons" role="group" aria-label={t[role.label]}>
          <button type="button" className={style.bold ? "active" : ""} aria-pressed={style.bold} title={t.bold} aria-label={t.bold} onClick={() => patchTypographyStyle({ bold: !style.bold })}><strong>B</strong></button>
          <button type="button" className={style.italic ? "active" : ""} aria-pressed={style.italic} title={t.italic} aria-label={t.italic} onClick={() => patchTypographyStyle({ italic: !style.italic })}><em>I</em></button>
          <button type="button" className={style.underline ? "active" : ""} aria-pressed={style.underline} title={t.underline} aria-label={t.underline} onClick={() => patchTypographyStyle({ underline: !style.underline })}><u>U</u></button>
        </div>
      </div>

      <div className="menu-text-style-actions">
        <button type="button" onClick={() => setColor("#000000")}>{t.black}</button>
        <button type="button" onClick={resetColor} disabled={!custom}>{t.reset}</button>
        <button type="button" onClick={resetTypographyStyle} disabled={!hasCustomStyle}>{t.styleReset}</button>
      </div>
    </div>
  );
}

export default function MenuItemNameColorControl({ design, language = "en", patchDesign }) {
  const t = COPY[language] || COPY.en;
  return (
    <section className="menu-item-name-color-control menu-text-styles-control" aria-label={t.title}>
      <div className="menu-item-name-color-copy">
        <strong>{t.title}</strong>
        <small>{t.hint}</small>
      </div>
      <div className="menu-text-style-groups">
        {ROLE_GROUPS.map((group) => (
          <section className="menu-text-style-group" key={group}>
            <div className="menu-text-style-group-title">{t[group]}</div>
            <div className="menu-text-styles-list">
              {ROLE_DEFINITIONS.filter((role) => role.group === group).map((role) => (
                <TextStyleField key={role.key} role={role} design={design} t={t} patchDesign={patchDesign} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
