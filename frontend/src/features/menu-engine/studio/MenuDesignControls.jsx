import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  MENU_COLOR_PRESETS,
  MENU_FONT_FAMILIES,
  applyMenuColorPreset,
} from "../domain/designSchema";
import LegacyMenuDesignControls from "./MenuDesignControlsLegacy";
import MenuItemNameColorControl from "./MenuItemNameColorControl";
import "./MenuDesignFullAccordion.css";

const COPY = {
  en: {
    theme: "Theme",
    text: "Text style & color",
    hero: "Top photo & header",
    palette: "Themes",
    customColors: "Custom colors",
    background: "Background",
    cards: "Cards",
    accent: "Accent",
    category: "Category",
    mainText: "Main text",
    secondaryText: "Secondary text",
    categoryText: "Category text",
    headingFont: "Heading font",
    bodyFont: "Body font",
    logo: "Logo",
    photo: "Photo",
    clean: "Clean",
    upload: "Upload hero image",
    replace: "Replace hero image",
    remove: "Remove hero image",
  },
  he: {
    theme: "ערכות נושא",
    text: "סגנון וצבע טקסט",
    hero: "תמונה עליונה וכותרת",
    palette: "ערכות נושא",
    customColors: "צבעים מותאמים",
    background: "רקע",
    cards: "כרטיסים",
    accent: "צבע מוביל",
    category: "קטגוריה",
    mainText: "טקסט ראשי",
    secondaryText: "טקסט משני",
    categoryText: "טקסט קטגוריה",
    headingFont: "פונט כותרות",
    bodyFont: "פונט טקסט",
    logo: "לוגו",
    photo: "תמונה",
    clean: "נקי",
    upload: "העלאת תמונת Hero",
    replace: "החלפת תמונת Hero",
    remove: "הסרת תמונת Hero",
  },
  ar: {
    theme: "السمات",
    text: "نمط ولون النص",
    hero: "الصورة العلوية والعنوان",
    palette: "السمات",
    customColors: "ألوان مخصصة",
    background: "الخلفية",
    cards: "البطاقات",
    accent: "اللون الرئيسي",
    category: "الفئة",
    mainText: "النص الرئيسي",
    secondaryText: "النص الثانوي",
    categoryText: "نص الفئة",
    headingFont: "خط العناوين",
    bodyFont: "خط النص",
    logo: "الشعار",
    photo: "صورة",
    clean: "نظيف",
    upload: "رفع صورة الواجهة",
    replace: "استبدال صورة الواجهة",
    remove: "إزالة صورة الواجهة",
  },
};

function ColorField({ label, value, onChange }) {
  return (
    <label className="beyond-full-color-field">
      <span>{label}</span>
      <span className="beyond-full-color-input">
        <code>{value}</code>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function FontField({ label, value, onChange }) {
  return (
    <label className="beyond-full-font-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {MENU_FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}
      </select>
    </label>
  );
}

function AccordionSection({ id, title, icon, open, onToggle, children }) {
  return (
    <section className={`beyond-full-accordion-section ${open ? "open" : ""}`}>
      <button type="button" className="beyond-full-accordion-title" aria-expanded={open} onClick={() => onToggle(id)}>
        <span className={`beyond-full-accordion-icon ${id}`}>{icon}</span>
        <strong>{title}</strong>
        <span className="beyond-full-accordion-chevron" aria-hidden="true">›</span>
      </button>
      {open ? <div className="beyond-full-accordion-body">{children}</div> : null}
    </section>
  );
}

function FullAccordion({ design, language, patchDesign, heroHeadlineControl }) {
  const t = COPY[language] || COPY.en;
  const [openSection, setOpenSection] = useState(null);

  const patchTheme = (key, value) => patchDesign((current) => ({ ...current, theme: { ...current.theme, [key]: value } }));
  const patchType = (key, value) => patchDesign((current) => ({ ...current, typography: { ...current.typography, [key]: value } }));
  const patchBrand = (key, value) => patchDesign((current) => ({ ...current, brand: { ...current.brand, [key]: value } }));
  const heroMode = design.brand?.heroMediaMode || "watermark";
  const heroImage = design.brand?.heroImageUrl || "";

  function toggleSection(id) {
    setOpenSection((current) => current === id ? null : id);
  }

  function uploadHero(file) {
    if (!file || !file.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => patchBrand("heroImageUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <div className="beyond-full-accordion">
      <AccordionSection id="theme" title={t.theme} icon="●" open={openSection === "theme"} onToggle={toggleSection}>
        <div className="beyond-full-block">
          <div className="beyond-full-block-title">{t.palette}</div>
          <div className="beyond-full-theme-grid">
            {Object.entries(MENU_COLOR_PRESETS).map(([key, preset]) => (
              <button type="button" key={key} className="beyond-full-theme-choice" onClick={() => patchDesign((current) => applyMenuColorPreset(current, key))}>
                <span className="beyond-full-theme-swatches">
                  {[preset.theme.background, preset.theme.card, preset.theme.accent, preset.theme.text, preset.theme.categoryBackground].map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}
                </span>
                <strong>{preset.label}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="beyond-full-block">
          <div className="beyond-full-block-title">{t.customColors}</div>
          <div className="beyond-full-color-grid">
            <ColorField label={t.background} value={design.theme.background} onChange={(value) => patchTheme("background", value)} />
            <ColorField label={t.cards} value={design.theme.card} onChange={(value) => patchTheme("card", value)} />
            <ColorField label={t.accent} value={design.theme.accent} onChange={(value) => patchTheme("accent", value)} />
            <ColorField label={t.category} value={design.theme.categoryBackground} onChange={(value) => patchTheme("categoryBackground", value)} />
            <ColorField label={t.mainText} value={design.theme.text} onChange={(value) => patchTheme("text", value)} />
            <ColorField label={t.secondaryText} value={design.theme.muted} onChange={(value) => patchTheme("muted", value)} />
            <ColorField label={t.categoryText} value={design.theme.categoryText} onChange={(value) => patchTheme("categoryText", value)} />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection id="text" title={t.text} icon="Aa" open={openSection === "text"} onToggle={toggleSection}>
        <div className="beyond-full-block">
          <div className="beyond-full-font-grid">
            <FontField label={t.headingFont} value={design.typography.headingFont} onChange={(value) => patchType("headingFont", value)} />
            <FontField label={t.bodyFont} value={design.typography.bodyFont} onChange={(value) => patchType("bodyFont", value)} />
          </div>
        </div>
        <MenuItemNameColorControl design={design} language={language} patchDesign={patchDesign} />
      </AccordionSection>

      <AccordionSection id="hero" title={t.hero} icon="▣" open={openSection === "hero"} onToggle={toggleSection}>
        {heroHeadlineControl}
        <div className="beyond-full-hero-grid">
          <button type="button" className={heroMode === "watermark" ? "active" : ""} onClick={() => patchBrand("heroMediaMode", "watermark")}>◎<span>{t.logo}</span></button>
          <button type="button" className={heroMode === "image" ? "active" : ""} onClick={() => patchBrand("heroMediaMode", "image")}>▧<span>{t.photo}</span></button>
          <button type="button" className={heroMode === "none" ? "active" : ""} onClick={() => patchBrand("heroMediaMode", "none")}>—<span>{t.clean}</span></button>
        </div>
        {heroMode === "image" ? (
          <div className="beyond-full-hero-upload">
            {heroImage ? <img src={heroImage} alt="" /> : null}
            <label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadHero(event.target.files?.[0])} />
              <span>{heroImage ? t.replace : t.upload}</span>
            </label>
            {heroImage ? <button type="button" onClick={() => patchBrand("heroImageUrl", "")}>{t.remove}</button> : null}
          </div>
        ) : null}
      </AccordionSection>
    </div>
  );
}

export default function MenuDesignControls(props) {
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    let disposed = false;
    let observer = null;

    const findMount = () => {
      if (disposed) return;
      const root = document.querySelector(".menu-design-v2 .studio-v3-design-quick-workspace");
      const firstLegacyCard = root?.querySelector(".studio-v3-quick-control-card");
      if (!root || !firstLegacyCard) {
        setMountNode(null);
        return;
      }

      const section = firstLegacyCard.closest(".studio-v3-design-v2-section");
      if (!section) return;
      let mount = section.querySelector(":scope > .beyond-full-accordion-mount");
      if (!mount) {
        mount = document.createElement("div");
        mount.className = "beyond-full-accordion-mount";
        section.insertBefore(mount, firstLegacyCard);
      }
      setMountNode(mount);
    };

    findMount();
    observer = new MutationObserver(findMount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      observer?.disconnect();
      setMountNode(null);
    };
  }, []);

  const accordion = useMemo(() => (
    <FullAccordion
      design={props.design}
      language={props.language || "en"}
      patchDesign={props.patchDesign}
      heroHeadlineControl={props.heroHeadlineControl}
    />
  ), [props.design, props.language, props.patchDesign, props.heroHeadlineControl]);

  return (
    <>
      <LegacyMenuDesignControls {...props} />
      {mountNode ? createPortal(accordion, mountNode) : null}
    </>
  );
}
