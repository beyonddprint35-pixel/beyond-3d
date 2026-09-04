import { useEffect, useState } from "react";
import "./MenuItemNameColorControl.css";

const COPY = {
  en: { title: "Item name color", hint: "Set the color used only for menu item names.", reset: "Use main text color", black: "Black" },
  he: { title: "צבע שם הפריט", hint: "בחרו צבע רק לשמות הפריטים בתפריט.", reset: "השתמש בצבע הטקסט הראשי", black: "שחור" },
  ar: { title: "لون اسم العنصر", hint: "اختر لوناً لأسماء عناصر القائمة فقط.", reset: "استخدم لون النص الرئيسي", black: "أسود" },
};

function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

export default function MenuItemNameColorControl({ design, language = "en", patchDesign }) {
  const t = COPY[language] || COPY.en;
  const mainText = design?.theme?.text || "#121212";
  const value = design?.theme?.itemNameColor || mainText;
  const isCustom = Boolean(design?.theme?.itemNameColor);
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());

  useEffect(() => {
    setHexDraft(value.toUpperCase());
  }, [value]);

  function setColor(color) {
    const normalized = normalizeHex(color);
    if (!normalized) return;
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
    patchDesign((current) => {
      const theme = { ...current.theme };
      delete theme.itemNameColor;
      return { ...current, theme };
    });
  }

  return (
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
  );
}
