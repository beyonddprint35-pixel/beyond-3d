import { useEffect, useState } from "react";
import { MENU_FONT_FAMILIES, MENU_FONT_WEIGHTS } from "../domain/designSchema";
import "./MenuItemNameColorControl.css";

const COPY = {
  en: {
    title: "Item name color",
    hint: "Set the color used only for menu item names.",
    reset: "Use main text color",
    black: "Black",
    noteTitle: "General notes",
    noteHint: "Control the typography used for category and subcategory notes.",
    noteFont: "Note font",
    noteWeight: "Note weight",
    noteSize: "Note size",
    noteColor: "Note color",
  },
  he: {
    title: "צבע שם הפריט",
    hint: "בחרו צבע רק לשמות הפריטים בתפריט.",
    reset: "השתמש בצבע הטקסט הראשי",
    black: "שחור",
    noteTitle: "הערות כלליות",
    noteHint: "שליטה בטיפוגרפיה של הערות קטגוריה ותת-קטגוריה.",
    noteFont: "פונט הערה",
    noteWeight: "עובי הערה",
    noteSize: "גודל הערה",
    noteColor: "צבע הערה",
  },
  ar: {
    title: "لون اسم العنصر",
    hint: "اختر لوناً لأسماء عناصر القائمة فقط.",
    reset: "استخدم لون النص الرئيسي",
    black: "أسود",
    noteTitle: "الملاحظات العامة",
    noteHint: "تحكم بخط ملاحظات الفئات والفئات الفرعية.",
    noteFont: "خط الملاحظة",
    noteWeight: "سماكة الملاحظة",
    noteSize: "حجم الملاحظة",
    noteColor: "لون الملاحظة",
  },
};

function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

function syncStudioPreviewItemNameColor(color) {
  if (typeof document === "undefined") return;
  const selectors = ".ep-item-name,.bme-item-copy h3,.bme-visual-copy h3";
  const applyToDocument = (targetDocument) => {
    if (!targetDocument) return;
    targetDocument.querySelectorAll(".bme-heritage-exact").forEach((root) => root.style.setProperty("--ep-item-name-color", color));
    targetDocument.querySelectorAll(".bme-menu").forEach((root) => root.style.setProperty("--bme-item-name-color", color));
    targetDocument.querySelectorAll(selectors).forEach((node) => {
      node.style.setProperty("color", color, "important");
      node.style.setProperty("-webkit-text-fill-color", color, "important");
      node.style.setProperty("opacity", "1", "important");
    });
  };

  applyToDocument(document);
  document.querySelectorAll("iframe.studio-v3-design-device-iframe").forEach((frame) => {
    try {
      applyToDocument(frame.contentDocument);
    } catch {
      // Studio preview iframes are same-origin, but ignore transient reload states.
    }
  });
}

export default function MenuItemNameColorControl({ design, language = "en", patchDesign }) {
  const t = COPY[language] || COPY.en;
  const mainText = design?.theme?.text || "#121212";
  const value = design?.theme?.itemNameColor || mainText;
  const isCustom = Boolean(design?.theme?.itemNameColor);
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());

  const noteFont = design?.typography?.bodyFont || "Inter";
  const noteWeight = Number(design?.typography?.bodyWeight || 400);
  const noteSize = Number(design?.typography?.descriptionSize || 11);
  const noteColor = design?.theme?.muted || "#7B756E";

  useEffect(() => {
    setHexDraft(value.toUpperCase());
    syncStudioPreviewItemNameColor(value);
    const frame = window.requestAnimationFrame(() => syncStudioPreviewItemNameColor(value));
    const timer = window.setTimeout(() => syncStudioPreviewItemNameColor(value), 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [value]);

  function setColor(color) {
    const normalized = normalizeHex(color);
    if (!normalized) return;
    syncStudioPreviewItemNameColor(normalized);
    patchDesign((current) => ({
      ...current,
      theme: { ...current.theme, itemNameColor: normalized },
    }));
  }

  function commitHex() {
    const normalized = normalizeHex(hexDraft);
    if (normalized) {
      setColor(normalized);
      setHexDraft(normalized);
    } else {
      setHexDraft(value.toUpperCase());
    }
  }

  function resetColor() {
    syncStudioPreviewItemNameColor(mainText);
    patchDesign((current) => {
      const theme = { ...current.theme };
      delete theme.itemNameColor;
      return { ...current, theme };
    });
  }

  function patchNoteTypography(key, nextValue) {
    patchDesign((current) => {
      if (key === "color") {
        return { ...current, theme: { ...current.theme, muted: nextValue } };
      }
      const typographyKey = key === "font" ? "bodyFont" : key === "weight" ? "bodyWeight" : "descriptionSize";
      return { ...current, typography: { ...current.typography, [typographyKey]: nextValue } };
    });
  }

  return (
    <>
      <section className="menu-item-name-color-control" aria-label={t.title}>
        <div className="menu-item-name-color-copy">
          <strong>{t.title}</strong>
          <small>{t.hint}</small>
        </div>
        <div className="menu-item-name-color-row">
          <label className="menu-item-name-color-picker" title={t.title}>
            <input
              className="menu-item-name-color-native"
              type="color"
              value={value}
              onChange={(event) => setColor(event.target.value)}
              aria-label={t.title}
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
              aria-label={`${t.title} hex`}
            />
          </label>
          <div className="menu-item-name-color-actions">
            <button type="button" onClick={() => setColor("#000000")}>{t.black}</button>
            <button type="button" onClick={resetColor} disabled={!isCustom}>{t.reset}</button>
          </div>
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

        <label className="menu-note-type-field">
          <span>{t.noteColor}</span>
          <span className="menu-note-color-row">
            <input type="color" value={noteColor} onChange={(event) => patchNoteTypography("color", event.target.value)} />
            <code>{noteColor.toUpperCase()}</code>
          </span>
        </label>
      </section>
    </>
  );
}
