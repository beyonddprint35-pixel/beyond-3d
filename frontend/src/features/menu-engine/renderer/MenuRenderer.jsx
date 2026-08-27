import { useMemo, useState } from "react";
import RestaurantAccessibility from "../../../components/RestaurantAccessibility";
import { normalizeMenuDesign } from "../domain/designSchema";
import { BADGE_LABELS, BADGE_SYMBOLS, normalizeItemMetadata } from "../domain/itemMetadata";
import "./menuRenderer.css";

function chooseText(language, values = {}) {
  const en = values.en || "";
  const he = values.he || "";
  const ar = values.ar || "";
  if (language === "he") return he || ar || en;
  if (language === "ar") return ar || he || en;
  return en || he || ar;
}

function isRtl(language) {
  return language === "he" || language === "ar";
}

function resolvedBadgeStyle(design) {
  if (design.badges.iconStyle !== "auto") return design.badges.iconStyle;
  return design.template === "visual" ? "filled" : "minimal";
}

function designVariables(design) {
  return {
    "--bme-bg": design.theme.background,
    "--bme-surface": design.theme.surface,
    "--bme-card": design.theme.card,
    "--bme-text": design.theme.text,
    "--bme-muted": design.theme.muted,
    "--bme-accent": design.theme.accent,
    "--bme-accent-secondary": design.theme.accentSecondary,
    "--bme-line": design.theme.line,
    "--bme-heading-font": `"${design.typography.headingFont}", "Noto Sans Hebrew", "Noto Sans Arabic", Georgia, serif`,
    "--bme-body-font": `"${design.typography.bodyFont}", "Noto Sans Hebrew", "Noto Sans Arabic", Arial, sans-serif`,
    "--bme-number-font": `"${design.typography.numberFont}", "Noto Sans Hebrew", "Noto Sans Arabic", Georgia, serif`,
    "--bme-brand-size": `${design.typography.brandSize}px`,
    "--bme-hero-size": `${design.typography.heroSize}px`,
    "--bme-section-size": `${design.typography.sectionSize}px`,
    "--bme-category-size": `${design.typography.categorySize}px`,
    "--bme-item-size": `${design.typography.itemNameSize}px`,
    "--bme-description-size": `${design.typography.descriptionSize}px`,
    "--bme-price-size": `${design.typography.priceSize}px`,
    "--bme-radius": `${design.layout.cardRadius}px`,
    "--bme-section-gap": `${design.layout.sectionGap}px`,
    "--bme-item-gap": `${design.layout.itemGap}px`,
    "--bme-card-padding": `${design.layout.cardPadding}px`,
  };
}

function Price({ item }) {
  const options = Array.isArray(item.price_options) ? item.price_options : [];
  if (options.length) {
    return (
      <div className="bme-price-options">
        {options.map((option, index) => (
          <span key={`${option.price}-${index}`} className="bme-price-option">
            {option.label ? <small>{option.label}</small> : null}
            <strong>{option.price}</strong>
          </span>
        ))}
      </div>
    );
  }
  return item.price ? <strong className="bme-price">{item.price}</strong> : null;
}

function ItemBadges({ item, language, design }) {
  const metadata = normalizeItemMetadata(item.metadata);
  const keys = [...metadata.merchandising, ...metadata.dietary, ...metadata.allergens];
  if (metadata.spice !== "none") keys.push(metadata.spice);
  if (!keys.length) return null;

  return (
    <div className="bme-item-badges" aria-label="Item information">
      {keys.map(key => (
        <span key={key} className={`bme-item-badge bme-badge-${key}`}>
          {design.badges.showSymbols ? (
            <span className="bme-item-badge-symbol" aria-hidden="true">{BADGE_SYMBOLS[key] || "•"}</span>
          ) : null}
          <span>{BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en || key}</span>
        </span>
      ))}
    </div>
  );
}

function ClassicItem({ item, language, design }) {
  const name = chooseText(language, item.name);
  const description = chooseText(language, item.description);
  return (
    <article className="bme-classic-item">
      <div className="bme-item-copy">
        <h3>{name}</h3>
        {description ? <p>{description}</p> : null}
        <ItemBadges item={item} language={language} design={design} />
      </div>
      <Price item={item} />
    </article>
  );
}

function VisualItem({ item, language, design }) {
  const name = chooseText(language, item.name);
  const description = chooseText(language, item.description);
  const hasImage = Boolean(item.image_url);
  return (
    <article className={`bme-visual-item bme-image-${design.layout.itemImagePosition}`} data-image-ratio={design.layout.itemImageRatio}>
      {hasImage ? (
        <div className="bme-item-media"><img src={item.image_url} alt={name} /></div>
      ) : (
        <div className="bme-item-media bme-item-media-placeholder" aria-hidden="true"><span>BEYOND</span></div>
      )}
      <div className="bme-visual-copy">
        <div className="bme-item-copy">
          <h3>{name}</h3>
          {description ? <p>{description}</p> : null}
          <ItemBadges item={item} language={language} design={design} />
        </div>
        <Price item={item} />
      </div>
    </article>
  );
}

export default function MenuRenderer({ menu, design: incomingDesign, accessibility = true }) {
  const design = useMemo(() => normalizeMenuDesign(incomingDesign), [incomingDesign]);
  const languages = Array.isArray(menu?.languages) && menu.languages.length ? menu.languages : ["en"];
  const [language, setLanguage] = useState(menu?.default_language || languages[0] || "en");
  const [activeGroupId, setActiveGroupId] = useState(menu?.groups?.[0]?.id || "");

  const groups = Array.isArray(menu?.groups) ? menu.groups : [];
  const items = Array.isArray(menu?.items) ? menu.items : [];
  const activeGroup = groups.find(group => group.id === activeGroupId) || groups[0] || null;
  const visibleItems = activeGroup ? items.filter(item => item.group_id === activeGroup.id && item.visible !== false) : [];
  const rtl = isRtl(language);
  const isVisual = design.template === "visual";
  const restaurantName = menu?.restaurant_name || "Restaurant";
  const badgeStyle = resolvedBadgeStyle(design);

  return (
    <div className={`bme-menu bme-template-${design.template} bme-badge-style-${badgeStyle}`} style={designVariables(design)} dir={rtl ? "rtl" : "ltr"} lang={language}>
      {accessibility ? <RestaurantAccessibility restaurantName={restaurantName} /> : null}
      <header className="bme-header">
        <div className="bme-brand">
          {menu?.logo_url ? <img src={menu.logo_url} alt="" /> : null}
          <div>
            <strong>{restaurantName}</strong>
            {menu?.subtitle ? <span>{chooseText(language, menu.subtitle)}</span> : null}
          </div>
        </div>
        {languages.length > 1 ? (
          <div className="bme-languages" aria-label="Menu language">
            {languages.map(code => (
              <button key={code} type="button" className={language === code ? "active" : ""} onClick={() => setLanguage(code)}>{code.toUpperCase()}</button>
            ))}
          </div>
        ) : null}
      </header>

      <section className="bme-hero">
        <span>{chooseText(language, menu?.hero_kicker)}</span>
        <h1>{chooseText(language, menu?.hero_title) || restaurantName || "Our Menu"}</h1>
      </section>

      <nav className="bme-category-nav" aria-label="Menu categories">
        {groups.filter(group => group.visible !== false).map(group => (
          <button key={group.id} type="button" className={activeGroup?.id === group.id ? "active" : ""} onClick={() => setActiveGroupId(group.id)}>
            {chooseText(language, group.name)}
          </button>
        ))}
      </nav>

      <main id="restaurant-main-content" className="bme-content" tabIndex="-1">
        {activeGroup ? (
          <section className="bme-section">
            <div className="bme-section-heading">
              <h2>{chooseText(language, activeGroup.name)}</h2>
              <span>{visibleItems.length} items</span>
            </div>
            <div className={isVisual ? "bme-visual-grid" : "bme-classic-list"}>
              {visibleItems.map(item => isVisual ? (
                <VisualItem key={item.id} item={item} language={language} design={design} />
              ) : (
                <ClassicItem key={item.id} item={item} language={language} design={design} />
              ))}
            </div>
          </section>
        ) : <div className="bme-empty">No menu categories yet.</div>}
      </main>
    </div>
  );
}
