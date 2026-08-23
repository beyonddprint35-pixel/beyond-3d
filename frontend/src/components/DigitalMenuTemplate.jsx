import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import MenuAccessibility from "./MenuAccessibility";

import "./DigitalMenuTemplate.css";
import "./DigitalMenuLayouts.css";

export const DEFAULT_MENU_BRANDING = {
  design_preset: "home",
  layout_style: "classic",
  fit_to_view: true,
  display_name: "",
  subtitle: "restaurant · bar · café",
  hero_title_en: "Our Menu",
  hero_title_he: "התפריט שלנו",
  hero_title_ar: "قائمتنا",
  background: "#f6f4ef",
  header_background: "#f6f4ef",
  hero_background: "#fffdf8",
  paper: "#fffdf8",
  card: "#ffffff",
  text: "#121212",
  muted: "#7b756e",
  accent: "#556b2f",
  accent_secondary: "#d8c79b",
  line: "#e5ded2",
  category_background: "#111111",
  category_text: "#ffffff",
  heading_font: "Playfair Display",
  body_font: "Inter",
  brand_font_size: 19,
  hero_font_size: 46,
  section_font_size: 38,
  category_font_size: 11,
  item_name_font_size: 16,
  description_font_size: 11,
  price_font_size: 16,
  secondary_font_size: 10,
  logo_url: null,
  logo_shape: "free",
};

const LANGUAGE_META = {
  en: { label: "English", dir: "ltr" },
  he: { label: "עברית", dir: "rtl" },
  ar: { label: "العربية", dir: "rtl" },
};

function normalizeLanguages(menu) {
  const requested = Array.isArray(menu?.requested_languages)
    ? menu.requested_languages.filter((code) => LANGUAGE_META[code])
    : [];

  if (requested.length) return [...new Set(requested)];

  const sections = Array.isArray(menu?.sections) ? menu.sections : [];
  const found = [];

  if (sections.some((section) => section.name_en || section.items?.some((item) => item.name_en))) {
    found.push("en");
  }
  if (sections.some((section) => section.name_he || section.items?.some((item) => item.name_he))) {
    found.push("he");
  }
  if (sections.some((section) => section.name_ar || section.items?.some((item) => item.name_ar))) {
    found.push("ar");
  }

  return found.length ? found : ["en"];
}

function chooseText(language, values) {
  const { en = "", he = "", ar = "" } = values || {};
  if (language === "he") return he || ar || en;
  if (language === "ar") return ar || he || en;
  return en || he || ar;
}

function isRtl(language) {
  return language === "he" || language === "ar";
}

function EditableText({
  value,
  onCommit,
  tag: Tag = "span",
  className = "",
  singleLine = true,
  dir,
}) {
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  function commit(target) {
    const nextValue = (target.innerText || "").trim();
    setDraft(nextValue);
    if (nextValue !== value) onCommit?.(nextValue);
  }

  return (
    <Tag
      className={`dmt-inline-edit ${className}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      dir={dir}
      title="Click to edit"
      onInput={(event) => setDraft(event.currentTarget.innerText)}
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={(event) => {
        if (singleLine && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.innerText = value || "";
          event.currentTarget.blur();
        }
      }}
    >
      {draft}
    </Tag>
  );
}

export default function DigitalMenuTemplate({
  menu,
  branding: incomingBranding,
  logoUrl = "",
  embedded = true,
  fitViewport = false,
  onMenuChange,
  onBrandingChange,
}) {
  const branding = {
    ...DEFAULT_MENU_BRANDING,
    ...(incomingBranding || {}),
  };

  const editable =
    embedded &&
    typeof onMenuChange === "function" &&
    typeof onBrandingChange === "function";

  const sections = Array.isArray(menu?.sections) ? menu.sections : [];
  const languages = useMemo(() => normalizeLanguages(menu), [menu]);

  function getInitialLanguage() {
    if (languages.includes(menu?.detected_language)) return menu.detected_language;
    return languages[0] || "en";
  }

  const [language, setLanguage] = useState(getInitialLanguage);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuListRef = useRef(null);

  useEffect(() => {
    setLanguage(getInitialLanguage());
    setActiveIndex(0);
  }, [menu?.restaurant_name, menu?.requested_languages, menu?.detected_language]);

  useEffect(() => {
    if (activeIndex >= sections.length) setActiveIndex(0);
  }, [activeIndex, sections.length]);

  const activeSection = sections[activeIndex] || sections[0] || null;
  const rtl = isRtl(language);
  const displayName = branding.display_name?.trim() || menu?.restaurant_name || "Your Restaurant";
  const displayLogo = logoUrl || branding.logo_url || "";
  const logoShape = branding.logo_shape || "free";
  const rawLayoutStyle = String(branding.layout_style || "classic").trim();
  const layoutStyle = rawLayoutStyle.split(/\s+/)[0] || "classic";
  const fitToView =
    typeof branding.fit_to_view === "boolean"
      ? branding.fit_to_view
      : !rawLayoutStyle.includes("dmt-natural-view");

  const style = {
    "--dmt-bg": branding.background,
    "--dmt-header-bg": branding.header_background,
    "--dmt-hero-bg": branding.hero_background,
    "--dmt-paper": branding.paper,
    "--dmt-card": branding.card,
    "--dmt-text": branding.text,
    "--dmt-muted": branding.muted,
    "--dmt-accent": branding.accent,
    "--dmt-accent-secondary": branding.accent_secondary,
    "--dmt-line": branding.line,
    "--dmt-category-bg": branding.category_background,
    "--dmt-category-text": branding.category_text,
    "--dmt-heading-font": `"${branding.heading_font}", "Noto Sans Hebrew", "Noto Sans Arabic", Georgia, serif`,
    "--dmt-body-font": `"${branding.body_font}", "Noto Sans Hebrew", "Noto Sans Arabic", Arial, sans-serif`,
    "--dmt-brand-size": `${branding.brand_font_size}px`,
    "--dmt-hero-size": `${branding.hero_font_size}px`,
    "--dmt-section-size": `${branding.section_font_size}px`,
    "--dmt-category-size": `${branding.category_font_size}px`,
    "--dmt-item-size": `${branding.item_name_font_size}px`,
    "--dmt-description-size": `${branding.description_font_size}px`,
    "--dmt-price-size": `${branding.price_font_size}px`,
    "--dmt-secondary-size": `${branding.secondary_font_size}px`,
  };

  const languageField = (suffix) => `${suffix}_${language}`;
  const itemCount = activeSection?.items?.length || 0;

  useLayoutEffect(() => {
    const list = menuListRef.current;
    if (!list) return undefined;

    let frame = 0;

    const clearFit = () => {
      list.classList.remove("dmt-fit-rows");
      list.style.removeProperty("--dmt-fit-row-height");
    };

    const shouldFit =
      fitViewport &&
      fitToView &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 560px)").matches;

    if (!shouldFit) {
      clearFit();
      return undefined;
    }

    const updateFit = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const items = Array.from(list.children).filter((node) =>
          node.classList?.contains("dmt-item-row")
        );

        if (!items.length || list.clientHeight <= 0) {
          clearFit();
          return;
        }

        const computed = window.getComputedStyle(list);
        const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
        const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
        const rowGap = Number.parseFloat(computed.rowGap || computed.gap) || 0;
        const usableHeight = Math.max(
          0,
          list.clientHeight - paddingTop - paddingBottom
        );

        const rowTops = [];
        items.forEach((item) => {
          const top = Math.round(item.offsetTop);
          if (!rowTops.some((value) => Math.abs(value - top) <= 2)) {
            rowTops.push(top);
          }
        });

        const rowCount = Math.max(1, rowTops.length);
        const targetHeight = Math.floor(
          (usableHeight - rowGap * Math.max(0, rowCount - 1)) / rowCount
        );

        if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
          clearFit();
          return;
        }

        list.style.setProperty("--dmt-fit-row-height", `${targetHeight}px`);
        list.classList.add("dmt-fit-rows");
      });
    };

    updateFit();

    const resizeObserver = new ResizeObserver(updateFit);
    resizeObserver.observe(list);
    window.addEventListener("resize", updateFit);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFit);
      clearFit();
    };
  }, [fitViewport, fitToView, activeIndex, itemCount, layoutStyle, language]);

  function patchBranding(updates) {
    onBrandingChange?.({ ...branding, ...updates });
  }

  function updateSection(sectionIndex, field, value) {
    const nextMenu = structuredClone(menu);
    if (!nextMenu.sections?.[sectionIndex]) return;
    nextMenu.sections[sectionIndex][field] = value;
    onMenuChange?.(nextMenu);
  }

  function updateItem(sectionIndex, itemIndex, field, value) {
    const nextMenu = structuredClone(menu);
    const item = nextMenu.sections?.[sectionIndex]?.items?.[itemIndex];
    if (!item) return;
    item[field] = value;
    onMenuChange?.(nextMenu);
  }

  function updatePriceOption(sectionIndex, itemIndex, optionIndex, field, value) {
    const nextMenu = structuredClone(menu);
    const option = nextMenu.sections?.[sectionIndex]?.items?.[itemIndex]?.price_options?.[optionIndex];
    if (!option) return;
    option[field] = value;
    onMenuChange?.(nextMenu);
  }

  function sectionTitle(section) {
    return chooseText(language, {
      en: section?.name_en,
      he: section?.name_he,
      ar: section?.name_ar,
    });
  }

  function heroTitle() {
    return branding[languageField("hero_title")] || "";
  }

  function kicker() {
    if (language === "he") return "התפריט הדיגיטלי שלנו";
    if (language === "ar") return "قائمتنا الرقمية";
    return "OUR DIGITAL MENU";
  }

  return (
    <div
      className={[
        "digital-menu-template",
        `dmt-layout-${layoutStyle}`,
        embedded ? "dmt-embedded" : "dmt-live",
        editable ? "dmt-editable" : "",
        fitViewport && fitToView ? "dmt-fit-to-view" : "",
      ].join(" ")}
      style={style}
      dir={rtl ? "rtl" : "ltr"}
      lang={language}
      data-language={language}
      data-layout={layoutStyle}
      data-fit-to-view={fitToView ? "true" : "false"}
    >
      <MenuAccessibility
        displayName={displayName}
        persistPreferences={!embedded}
      />

      <div id="mainContent" className="dmt-app app" tabIndex={-1}>
        <header className="dmt-header">
          <div className="dmt-brand">
            {displayLogo ? (
              <img
                className={`dmt-logo dmt-logo-${logoShape}`}
                src={displayLogo}
                alt={`${displayName} logo`}
              />
            ) : (
              <div className="dmt-logo-placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="dmt-brand-copy">
              {editable ? (
                <EditableText
                  tag="strong"
                  value={displayName}
                  onCommit={(value) => patchBranding({ display_name: value })}
                />
              ) : (
                <strong>{displayName}</strong>
              )}

              {editable ? (
                <EditableText
                  value={branding.subtitle}
                  onCommit={(value) => patchBranding({ subtitle: value })}
                />
              ) : (
                <span>{branding.subtitle}</span>
              )}
            </div>
          </div>

          <div className="dmt-language" role="group" aria-label="Menu language">
            {languages.map((code) => (
              <button
                key={code}
                type="button"
                className={language === code ? "active" : ""}
                lang={code}
                dir={LANGUAGE_META[code].dir}
                onClick={() => setLanguage(code)}
              >
                {LANGUAGE_META[code].label}
              </button>
            ))}
          </div>
        </header>

        <section className="dmt-hero">
          <div className="dmt-hero-copy">
            <span className="dmt-kicker">{kicker()}</span>

            {editable ? (
              <EditableText
                tag="h1"
                value={heroTitle()}
                dir={rtl ? "rtl" : "ltr"}
                onCommit={(value) => patchBranding({ [languageField("hero_title")]: value })}
              />
            ) : (
              <h1>{heroTitle()}</h1>
            )}

            <p>{displayName}</p>
          </div>

          {displayLogo && (
            <div className={`dmt-hero-logo dmt-hero-logo-${logoShape}`}>
              <img src={displayLogo} alt="" />
            </div>
          )}
        </section>

        <nav className="dmt-tabs-wrap">
          <div className="dmt-tabs" role="tablist">
            {sections.map((section, index) => (
              <button
                key={`${section.name_en || section.name_he || section.name_ar}-${index}`}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                className={activeIndex === index ? "dmt-tab active" : "dmt-tab"}
                onClick={() => setActiveIndex(index)}
              >
                {sectionTitle(section)}
              </button>
            ))}
          </div>
        </nav>

        {activeSection && (
          <>
            <section className="dmt-section-head">
              {editable ? (
                <EditableText
                  tag="h2"
                  value={sectionTitle(activeSection)}
                  dir={rtl ? "rtl" : "ltr"}
                  onCommit={(value) =>
                    updateSection(activeIndex, languageField("name"), value)
                  }
                />
              ) : (
                <h2>{sectionTitle(activeSection)}</h2>
              )}

              <span>
                {language === "he"
                  ? `${itemCount} פריטים`
                  : language === "ar"
                    ? `${itemCount} عناصر`
                    : `${itemCount} items`}
              </span>
            </section>

            <section
              id="menuList"
              ref={menuListRef}
              className="dmt-menu-list"
              aria-live="polite"
            >
              {(activeSection.items || []).map((item, itemIndex) => {
                const name = chooseText(language, {
                  en: item.name_en,
                  he: item.name_he,
                  ar: item.name_ar,
                });
                const description = chooseText(language, {
                  en: item.description_en,
                  he: item.description_he,
                  ar: item.description_ar,
                });
                const origin = chooseText(language, {
                  en: item.origin_en,
                  he: item.origin_he,
                  ar: item.origin_ar,
                });
                const options = Array.isArray(item.price_options) ? item.price_options : [];

                return (
                  <article key={`${name}-${itemIndex}`} className="dmt-item-row item-row">
                    <div className="dmt-item-info">
                      {editable ? (
                        <EditableText
                          tag="strong"
                          value={name}
                          dir={rtl ? "rtl" : "ltr"}
                          onCommit={(value) =>
                            updateItem(activeIndex, itemIndex, languageField("name"), value)
                          }
                        />
                      ) : (
                        <strong>{name}</strong>
                      )}

                      {editable ? (
                        <EditableText
                          tag="p"
                          value={description}
                          singleLine={false}
                          dir={rtl ? "rtl" : "ltr"}
                          onCommit={(value) =>
                            updateItem(activeIndex, itemIndex, languageField("description"), value)
                          }
                        />
                      ) : (
                        description && <p>{description}</p>
                      )}

                      {editable ? (
                        <EditableText
                          tag="small"
                          value={origin}
                          dir={rtl ? "rtl" : "ltr"}
                          onCommit={(value) =>
                            updateItem(activeIndex, itemIndex, languageField("origin"), value)
                          }
                        />
                      ) : (
                        origin && <small>{origin}</small>
                      )}
                    </div>

                    <div className="dmt-price-area">
                      {item.price && (
                        editable ? (
                          <EditableText
                            tag="b"
                            value={item.price}
                            onCommit={(value) => updateItem(activeIndex, itemIndex, "price", value)}
                          />
                        ) : (
                          <b>{item.price}</b>
                        )
                      )}

                      {options.map((option, optionIndex) => {
                        const label = chooseText(language, {
                          en: option.label_en,
                          he: option.label_he,
                          ar: option.label_ar,
                        });

                        return (
                          <div className="dmt-price-option" key={`${option.price}-${optionIndex}`}>
                            {editable ? (
                              <EditableText
                                value={label}
                                onCommit={(value) =>
                                  updatePriceOption(
                                    activeIndex,
                                    itemIndex,
                                    optionIndex,
                                    languageField("label"),
                                    value
                                  )
                                }
                              />
                            ) : (
                              <span>{label}</span>
                            )}

                            {editable ? (
                              <EditableText
                                tag="strong"
                                value={option.price}
                                onCommit={(value) =>
                                  updatePriceOption(activeIndex, itemIndex, optionIndex, "price", value)
                                }
                              />
                            ) : (
                              <strong>{option.price}</strong>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        <footer className="dmt-footer site-footer">
          <div className="footer-responsible">Enjoy responsibly</div>
          <div className="footer-actions">
            <button
              type="button"
              className="footer-link-button"
              id="openAccessibilityStatement"
            >
              הצהרת נגישות / Accessibility Statement
            </button>
          </div>
          <div className="powered-by-beyond">
            Powered by <strong>Beyond</strong>
          </div>
        </footer>
      </div>
    </div>
  );
}
