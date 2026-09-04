import "./MenuItemNameColorControl.css";

const COPY = {
  en: { title: "Item name color", hint: "Set the color used only for menu item names.", reset: "Use main text color" },
  he: { title: "צבע שם הפריט", hint: "בחרו צבע רק לשמות הפריטים בתפריט.", reset: "השתמש בצבע הטקסט הראשי" },
  ar: { title: "لون اسم العنصر", hint: "اختر لوناً لأسماء عناصر القائمة فقط.", reset: "استخدم لون النص الرئيسي" },
};

export default function MenuItemNameColorControl({ design, language = "en", patchDesign }) {
  const t = COPY[language] || COPY.en;
  const mainText = design?.theme?.text || "#121212";
  const value = design?.theme?.itemNameColor || mainText;
  const isCustom = Boolean(design?.theme?.itemNameColor);

  function setColor(color) {
    patchDesign((current) => ({
      ...current,
      theme: { ...current.theme, itemNameColor: color },
    }));
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
        <label className="menu-item-name-color-picker">
          <input type="color" value={value} onChange={(event) => setColor(event.target.value)} />
          <span className="menu-item-name-color-swatch" style={{ background: value }} aria-hidden="true" />
          <code>{value.toUpperCase()}</code>
        </label>
        <button type="button" onClick={resetColor} disabled={!isCustom}>{t.reset}</button>
      </div>
    </section>
  );
}
