import { useEffect, useState } from "react";
import { MENU_FONT_FAMILIES, MENU_FONT_WEIGHTS } from "../domain/designSchema";
import "./MenuItemNameColorControl.css";

const COPY = {
  en: {
    title: "Text colors",
    hint: "Give each text style its own color without changing the rest of the menu.",
    reset: "Use theme color",
    black: "Black",
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
    noteTitle: "General notes",
    noteHint: "Control the typography used for category and subcategory notes.",
    noteFont: "Note font",
    noteWeight: "Note weight",
    noteSize: "Note size",
  },
  he: {
    title: "צבעי טקסט",
    hint: "בחרו צבע נפרד לכל סוג טקסט בלי לשנות את שאר התפריט.",
    reset: "השתמש בצבע העיצוב",
    black: "שחור",
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
    noteTitle: "הערות כלליות",
    noteHint: "שליטה בטיפוגרפיה של הערות קטגוריה ותת-קטגוריה.",
    noteFont: "פונט הערה",
    noteWeight: "עובי הערה",
    noteSize: "גודל הערה",
  },
  ar: {
    title: "ألوان النص",
    hint: "اختر لوناً مستقلاً لكل نوع نص من دون تغيير بقية القائمة.",
    reset: "استخدم لون التصميم",
    black: "أسود",
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
    noteTitle: "الملاحظات العامة",
    noteHint: "تحكم بخط ملاحظات الفئات والفئات الفرعية.",
    noteFont: "خط الملاحظة",
    noteWeight: "سماكة الملاحظة",
    noteSize: "حجم الملاحظة",
  },
};

const ROLE_DEFINITIONS = Object.freeze([
  { key: "brandTitleColor", slug: "brand-title", label: "brandTitle", standardVar: "--bme-brand-title-color", heritageVar: "--ep-brand-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "brandSubtitleColor", slug: "brand-subtitle", label: "brandSubtitle", standardVar: "--bme-brand-subtitle-color", heritageVar: "--ep-brand-subtitle-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "heroKickerColor", slug: "hero-kicker", label: "heroKicker", standardVar: "--bme-hero-kicker-color", heritageVar: "--ep-hero-kicker-color", fallback: design => design?.theme?.accent || "#556B2F" },
  { key: "heroTitleColor", slug: "hero-title", label: "heroTitle", standardVar: "--bme-hero-title-color", heritageVar: "--ep-hero-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "categoryNavColor", slug: "category-nav", label: "categoryNav", standardVar: "--bme-category-nav-color", heritageVar: "--ep-category-nav-color", fallback: design => design?.layout?.navigationStyle === "pills" ? (design?.theme?.text || "#121212") : (design?.theme?.muted || "#7B756E") },
  { key: "sectionTitleColor", slug: "section-title", label: "sectionTitle", standardVar: "--bme-section-title-color", heritageVar: "--ep-section-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "subcategoryTitleColor", slug: "subcategory-title", label: "subcategoryTitle", standardVar: "--bme-subcategory-title-color", heritageVar: "--ep-subcategory-title-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "itemNameColor", slug: "item-name", label: "itemName", standardVar: "--bme-item-name-color", heritageVar: "--ep-item-name-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "descriptionColor", slug: "description", label: "description", standardVar: "--bme-description-color", heritageVar: "--ep-description-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "priceColor", slug: "price", label: "price", standardVar: "--bme-price-color", heritageVar: "--ep-price-color", fallback: design => design?.theme?.text || "#121212" },
  { key: "priceTypeColor", slug: "price-type", label: "priceType", standardVar: "--bme-price-type-color", heritageVar: "--ep-price-type-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "noteColor", slug: "note", label: "note", standardVar: "--bme-note-color", heritageVar: "--ep-note-color", fallback: design => design?.theme?.muted || "#7B756E" },
  { key: "footerColor", slug: "footer", label: "footer", standardVar: "--bme-footer-color", heritageVar: "--ep-footer-color", fallback: design => design?.theme?.muted || "#7B756E" },
]);

function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
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

function TextColorField({ role, design, t, patchDesign }) {
  const custom = normalizeHex(design?.theme?.[role.key]);
  const fallback = normalizeHex(role.fallback(design)) || "#121212";
  const value = custom || fallback;
  const [hexDraft, setHexDraft] = useState(value);

  useEffect(() => {
    setHexDraft(value);
    syncStudioPreviewRole(role, value, Boolean(custom));
    const frame = window.requestAnimationFrame(() => syncStudioPreviewRole(role, value, Boolean(custom)));
    const timer = window.setTimeout(() => syncStudioPreviewRole(role, value, Boolean(custom)), 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [custom, value, role]);

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

  return (
    <div className="menu-text-color-field">
      <span className="menu-text-color-label">{t[role.label]}</span>
      <div className="menu-item-name-color-row">
        <label className="menu-item-name-color-picker" title={t[role.label]}>
          <input
            className="menu-item-name-color-native"
            type="color"
            value={value}
            onChange={(event) => setColor(event.target.value)}
            aria-label={t[role.label]}
          />
          <span className="menu-item-name-color-swatch" style={{ background: value }} aria-hidden="true" />
          <input
            className="menu-item-name-color-hex"
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
        <div className="menu-item-name-color-actions">
          <button type="button" onClick={() => setColor("#000000")}>{t.black}</button>
          <button type="button" onClick={resetColor} disabled={!custom}>{t.reset}</button>
        </div>
      </div>
    </div>
  );
}

export default function MenuItemNameColorControl({ design, language = "en", patchDesign }) {
  const t = COPY[language] || COPY.en;
  const noteFont = design?.typography?.bodyFont || "Inter";
  const noteWeight = Number(design?.typography?.bodyWeight || 400);
  const noteSize = Number(design?.typography?.descriptionSize || 11);

  function patchNoteTypography(key, nextValue) {
    patchDesign((current) => {
      const typographyKey = key === "font" ? "bodyFont" : key === "weight" ? "bodyWeight" : "descriptionSize";
      return { ...current, typography: { ...current.typography, [typographyKey]: nextValue } };
    });
  }

  return (
    <>
      <section className="menu-item-name-color-control menu-text-colors-control" aria-label={t.title}>
        <div className="menu-item-name-color-copy">
          <strong>{t.title}</strong>
          <small>{t.hint}</small>
        </div>
        <div className="menu-text-colors-list">
          {ROLE_DEFINITIONS.map((role) => (
            <TextColorField key={role.key} role={role} design={design} t={t} patchDesign={patchDesign} />
          ))}
        </div>
      </section>

      <section className="menu-note-type-control" aria-label={t.noteTitle}>
        <div className="menu-item-name-color-copy">
          <strong>{t.noteTitle}</strong>
          <small>{t.noteHint}</small>
        </div>

        <label className="menu-note-type-field">
          <span>{t.noteFont}</span>
          <select value={noteFont} onChange={(event) => patchNoteTypography("font", event.target.value)}>
            {MENU_FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
        </label>

        <label className="menu-note-type-field">
          <span>{t.noteWeight}</span>
          <select value={noteWeight} onChange={(event) => patchNoteTypography("weight", Number(event.target.value))}>
            {MENU_FONT_WEIGHTS.map((weight) => <option key={weight} value={weight}>{weight}</option>)}
          </select>
        </label>

        <label className="menu-note-type-range">
          <span><span>{t.noteSize}</span><b>{noteSize}px</b></span>
          <input type="range" min="11" max="20" value={noteSize} onChange={(event) => patchNoteTypography("size", Number(event.target.value))} />
        </label>
      </section>
    </>
  );
}
