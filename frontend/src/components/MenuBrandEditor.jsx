import {
  useState,
} from "react";

import {
  Crop,
  RotateCcw,
  Trash2,
  Type,
} from "lucide-react";

import {
  DEFAULT_MENU_BRANDING,
} from "./DigitalMenuTemplate";

import LogoCropper from "./LogoCropper";

import "./MenuBrandEditor.css";


const DESIGN_PRESETS = [
  {
    id: "home",
    name: "Home",
    accent: "#556b2f",

    values: {
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
    },
  },

  {
    id: "midnight",
    name: "Midnight",
    accent: "#4ba5e5",

    values: {
      background: "#07121c",
      header_background: "#07121c",
      hero_background: "#0d1822",
      paper: "#0d1822",
      card: "#12212d",
      text: "#f5f7f8",
      muted: "#9eafbb",
      accent: "#4ba5e5",
      accent_secondary: "#174a6d",
      line: "#263947",
      category_background: "#f5f7f8",
      category_text: "#07121c",
      heading_font: "Space Grotesk",
      body_font: "Inter",
    },
  },

  {
    id: "mediterranean",
    name: "Mediterranean",
    accent: "#1e6b5c",

    values: {
      background: "#f2eadf",
      header_background: "#f2eadf",
      hero_background: "#fffaf0",
      paper: "#fffaf0",
      card: "#fffdf8",
      text: "#18352d",
      muted: "#708078",
      accent: "#1e6b5c",
      accent_secondary: "#d8a43e",
      line: "#ded2bd",
      category_background: "#1e6b5c",
      category_text: "#fffaf0",
      heading_font: "Cormorant Garamond",
      body_font: "Inter",
    },
  },

  {
    id: "minimal",
    name: "Minimal",
    accent: "#333333",

    values: {
      background: "#f4f4f4",
      header_background: "#ffffff",
      hero_background: "#ffffff",
      paper: "#ffffff",
      card: "#ffffff",
      text: "#141414",
      muted: "#777777",
      accent: "#333333",
      accent_secondary: "#dddddd",
      line: "#e2e2e2",
      category_background: "#141414",
      category_text: "#ffffff",
      heading_font: "Inter",
      body_font: "Inter",
    },
  },

  {
    id: "terracotta",
    name: "Terracotta",
    accent: "#b75d3e",

    values: {
      background: "#f5ece4",
      header_background: "#f5ece4",
      hero_background: "#fff8f2",
      paper: "#fff8f2",
      card: "#fffaf7",
      text: "#35231d",
      muted: "#8b7065",
      accent: "#b75d3e",
      accent_secondary: "#e1aa87",
      line: "#e4d2c7",
      category_background: "#7e3828",
      category_text: "#ffffff",
      heading_font: "DM Serif Display",
      body_font: "Lora",
    },
  },

  {
    id: "forest",
    name: "Forest",
    accent: "#31583a",

    values: {
      background: "#eaf0e8",
      header_background: "#eaf0e8",
      hero_background: "#f5f8f2",
      paper: "#f5f8f2",
      card: "#fbfcf9",
      text: "#17231a",
      muted: "#69776b",
      accent: "#31583a",
      accent_secondary: "#9bb28f",
      line: "#cfd9cc",
      category_background: "#24442c",
      category_text: "#ffffff",
      heading_font: "Libre Baskerville",
      body_font: "Inter",
    },
  },

  {
    id: "ocean",
    name: "Ocean",
    accent: "#147b93",

    values: {
      background: "#edf5f7",
      header_background: "#edf5f7",
      hero_background: "#f8fcfd",
      paper: "#f8fcfd",
      card: "#ffffff",
      text: "#12323c",
      muted: "#66838b",
      accent: "#147b93",
      accent_secondary: "#91c8d2",
      line: "#d0e2e6",
      category_background: "#12677a",
      category_text: "#ffffff",
      heading_font: "Fraunces",
      body_font: "Manrope",
    },
  },

  {
    id: "burgundy",
    name: "Burgundy",
    accent: "#7e1f3b",

    values: {
      background: "#f4ecee",
      header_background: "#f4ecee",
      hero_background: "#fff8f9",
      paper: "#fff8f9",
      card: "#fffafb",
      text: "#2d151c",
      muted: "#856c73",
      accent: "#7e1f3b",
      accent_secondary: "#c7a0aa",
      line: "#dfccd1",
      category_background: "#65182f",
      category_text: "#ffffff",
      heading_font: "Bodoni Moda",
      body_font: "Inter",
    },
  },

  {
    id: "espresso",
    name: "Espresso",
    accent: "#6b4029",

    values: {
      background: "#ece4db",
      header_background: "#ece4db",
      hero_background: "#f8f1e9",
      paper: "#f8f1e9",
      card: "#fffaf5",
      text: "#291d17",
      muted: "#806c60",
      accent: "#6b4029",
      accent_secondary: "#c49a78",
      line: "#d9c8ba",
      category_background: "#3b281e",
      category_text: "#ffffff",
      heading_font: "Merriweather",
      body_font: "Inter",
    },
  },

  {
    id: "gold",
    name: "Gold & Black",
    accent: "#d5b15d",

    values: {
      background: "#090909",
      header_background: "#090909",
      hero_background: "#111111",
      paper: "#111111",
      card: "#171717",
      text: "#f8f5eb",
      muted: "#aaa38f",
      accent: "#d5b15d",
      accent_secondary: "#7d6837",
      line: "#34302a",
      category_background: "#d5b15d",
      category_text: "#090909",
      heading_font: "Cinzel",
      body_font: "Manrope",
    },
  },

  {
    id: "nordic",
    name: "Nordic",
    accent: "#667b72",

    values: {
      background: "#f2f3f1",
      header_background: "#f2f3f1",
      hero_background: "#fafbf9",
      paper: "#fafbf9",
      card: "#ffffff",
      text: "#252b29",
      muted: "#7b8380",
      accent: "#667b72",
      accent_secondary: "#c4cec8",
      line: "#dce1de",
      category_background: "#34423d",
      category_text: "#ffffff",
      heading_font: "Raleway",
      body_font: "Manrope",
    },
  },

  {
    id: "rose",
    name: "Rose",
    accent: "#ae5d78",

    values: {
      background: "#f8eef1",
      header_background: "#f8eef1",
      hero_background: "#fff8fa",
      paper: "#fff8fa",
      card: "#ffffff",
      text: "#3c232b",
      muted: "#92747f",
      accent: "#ae5d78",
      accent_secondary: "#e4b6c5",
      line: "#ead6dc",
      category_background: "#8b425b",
      category_text: "#ffffff",
      heading_font: "Prata",
      body_font: "Inter",
    },
  },
];


const FONT_OPTIONS = [
  "Inter",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "DM Serif Display",
  "Lora",
  "Merriweather",
  "Cinzel",
  "Bodoni Moda",
  "Fraunces",
  "Prata",
  "Montserrat",
  "Poppins",
  "Manrope",
  "Space Grotesk",
  "Raleway",
  "Oswald",
  "Bebas Neue",
  "Rubik",
  "Assistant",
  "Heebo",
  "Noto Sans Hebrew",
  "Noto Sans Arabic",
  "Cairo",
  "Tajawal",
  "Arial",
  "Georgia",
];


const SIZE_CONTROLS = [
  {
    key:
      "brand_font_size",
    label:
      "Restaurant name",
    min: 14,
    max: 34,
  },

  {
    key:
      "hero_font_size",
    label:
      "Main headline",
    min: 26,
    max: 72,
  },

  {
    key:
      "section_font_size",
    label:
      "Section headline",
    min: 22,
    max: 54,
  },

  {
    key:
      "category_font_size",
    label:
      "Categories",
    min: 9,
    max: 22,
  },

  {
    key:
      "item_name_font_size",
    label:
      "Item names",
    min: 12,
    max: 30,
  },

  {
    key:
      "description_font_size",
    label:
      "Descriptions",
    min: 9,
    max: 22,
  },

  {
    key:
      "price_font_size",
    label:
      "Prices",
    min: 11,
    max: 30,
  },

  {
    key:
      "secondary_font_size",
    label:
      "Secondary text",
    min: 8,
    max: 20,
  },
];


/*
  ============================================================
  BEYOND MENU CORE v1.2

  Approved original typography proportions.

  "Reset font sizes" restores ONLY these values.
  Fonts, colors, logo, preset and menu content are untouched.
  ============================================================
*/
const BEYOND_MENU_CORE_FONT_SIZES = {
  brand_font_size: 19,
  hero_font_size: 46,
  section_font_size: 38,
  category_font_size: 11,
  item_name_font_size: 16,
  description_font_size: 11,
  price_font_size: 16,
  secondary_font_size: 10,
};


function validHex(
  value
) {
  return /^#[0-9A-Fa-f]{6}$/.test(
    value
  );
}


function ColorControl({
  label,
  value,
  onChange,
}) {
  const [
    draft,
    setDraft,
  ] =
    useState(
      value ||
      "#ffffff"
    );


  function sync(
    nextValue
  ) {
    setDraft(
      nextValue
    );

    if (
      validHex(
        nextValue
      )
    ) {
      onChange(
        nextValue
      );
    }
  }


  return (
    <label className="menu-brand-color">
      <span>
        {label}
      </span>

      <div>
        <input
          type="color"
          value={
            validHex(
              value
            )
              ? value
              : "#ffffff"
          }
          onChange={
            event =>
              sync(
                event
                  .target
                  .value
              )
          }
        />

        <input
          type="text"
          value={
            draft
          }
          maxLength={7}
          onChange={
            event =>
              sync(
                event
                  .target
                  .value
              )
          }
          onBlur={() => {
            if (
              !validHex(
                draft
              )
            ) {
              setDraft(
                value
              );
            }
          }}
        />
      </div>
    </label>
  );
}


export default function MenuBrandEditor({
  branding,
  onChange,
  logoUrl,
  onLogoChange,
  onReset,
}) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      "design"
    );

  const [
    pendingLogo,
    setPendingLogo,
  ] =
    useState("");

  const [
    logoError,
    setLogoError,
  ] =
    useState("");


  function patch(
    updates
  ) {
    onChange?.({
      ...branding,
      ...updates,
    });
  }


  /*
    Restore ONLY the approved BEYOND Menu Core
    typography sizes.

    This intentionally does not reset:
    - font families
    - design preset
    - colors
    - logo
    - restaurant/menu text
    - languages
  */
  function resetFontSizes() {
    patch({
      ...BEYOND_MENU_CORE_FONT_SIZES,
    });
  }


  function applyPreset(
    preset
  ) {
    patch({
      ...preset.values,

      design_preset:
        preset.id,
    });
  }


  function handleLogoFile(
    event
  ) {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    setLogoError("");

    if (!file) {
      return;
    }


    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml",
      ].includes(
        file.type
      )
    ) {
      setLogoError(
        "Use PNG, JPG, WEBP or SVG."
      );

      return;
    }


    if (
      file.size >
      3 * 1024 * 1024
    ) {
      setLogoError(
        "Logo must be under 3 MB."
      );

      return;
    }


    const reader =
      new FileReader();

    reader.onload =
      () =>
        setPendingLogo(
          String(
            reader.result ||
              ""
          )
        );

    reader.readAsDataURL(
      file
    );
  }


  function handleCropApply(
    dataUrl,
    shape
  ) {
    onLogoChange?.(
      dataUrl
    );

    patch({
      logo_shape:
        shape,
    });

    setPendingLogo(
      ""
    );
  }


  return (
    <>
      <aside className="menu-brand-editor">
        <header className="menu-brand-editor-head">
          <div>
            <span>
              03 / STYLE
            </span>

            <h3>
              Menu Studio
            </h3>
          </div>

          <button
            type="button"
            className="menu-brand-reset-mini"
            title="Reset design"
            onClick={() => {
              onReset?.(
                DEFAULT_MENU_BRANDING
              );

              onLogoChange?.(
                ""
              );
            }}
          >
            <RotateCcw
              size={14}
            />
          </button>
        </header>


        <nav className="menu-brand-tabs">
          <button
            type="button"
            className={
              activeTab ===
              "design"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "design"
              )
            }
          >
            Design
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "brand"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "brand"
              )
            }
          >
            Brand
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "colors"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "colors"
              )
            }
          >
            Colors
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "type"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "type"
              )
            }
          >
            Type
          </button>
        </nav>


        <div className="menu-brand-editor-body">
          {activeTab ===
            "design" && (
            <section className="menu-brand-design-grid">
              {DESIGN_PRESETS.map(
                preset => (
                  <button
                    key={
                      preset.id
                    }
                    type="button"
                    className={
                      branding
                        .design_preset ===
                      preset.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      applyPreset(
                        preset
                      )
                    }
                  >
                    <span className="design-preview">
                      <i
                        style={{
                          background:
                            preset
                              .values
                              .background,
                        }}
                      />

                      <i
                        style={{
                          background:
                            preset
                              .values
                              .card,
                        }}
                      />

                      <i
                        style={{
                          background:
                            preset
                              .accent,
                        }}
                      />
                    </span>

                    <strong>
                      {
                        preset.name
                      }
                    </strong>
                  </button>
                )
              )}
            </section>
          )}


          {activeTab ===
            "brand" && (
            <section className="menu-brand-compact-section">
              <label className="menu-brand-field">
                <span>
                  RESTAURANT NAME
                </span>

                <input
                  value={
                    branding
                      .display_name ||
                    ""
                  }
                  onChange={
                    event =>
                      patch({
                        display_name:
                          event
                            .target
                            .value,
                      })
                  }
                />
              </label>


              <label className="menu-brand-field">
                <span>
                  SUBTITLE
                </span>

                <input
                  value={
                    branding.subtitle ||
                    ""
                  }
                  onChange={
                    event =>
                      patch({
                        subtitle:
                          event
                            .target
                            .value,
                      })
                  }
                />
              </label>


              {logoUrl && (
                <div className="menu-brand-logo-preview">
                  <img
                    src={
                      logoUrl
                    }
                    alt=""
                  />

                  <span>
                    Current logo
                  </span>
                </div>
              )}


              <label className="menu-brand-logo-button">
                <Crop
                  size={15}
                />

                {logoUrl
                  ? "Upload & Crop Again"
                  : "Upload & Crop Logo"}

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={
                    handleLogoFile
                  }
                />
              </label>


              {logoUrl && (
                <button
                  type="button"
                  className="menu-brand-remove-logo"
                  onClick={() =>
                    onLogoChange?.(
                      ""
                    )
                  }
                >
                  <Trash2
                    size={14}
                  />

                  Remove logo
                </button>
              )}


              {logoError && (
                <small className="menu-brand-error">
                  {
                    logoError
                  }
                </small>
              )}
            </section>
          )}


          {activeTab ===
            "colors" && (
            <section className="menu-brand-color-grid">
              <ColorControl
                label="PAGE"
                value={
                  branding.background
                }
                onChange={
                  value =>
                    patch({
                      background:
                        value,
                    })
                }
              />

              <ColorControl
                label="HEADER"
                value={
                  branding
                    .header_background
                }
                onChange={
                  value =>
                    patch({
                      header_background:
                        value,
                    })
                }
              />

              <ColorControl
                label="HERO"
                value={
                  branding
                    .hero_background
                }
                onChange={
                  value =>
                    patch({
                      hero_background:
                        value,
                    })
                }
              />

              <ColorControl
                label="CARDS"
                value={
                  branding.card
                }
                onChange={
                  value =>
                    patch({
                      card:
                        value,

                      paper:
                        value,
                    })
                }
              />

              <ColorControl
                label="TEXT"
                value={
                  branding.text
                }
                onChange={
                  value =>
                    patch({
                      text:
                        value,
                    })
                }
              />

              <ColorControl
                label="SECONDARY"
                value={
                  branding.muted
                }
                onChange={
                  value =>
                    patch({
                      muted:
                        value,
                    })
                }
              />

              <ColorControl
                label="ACCENT"
                value={
                  branding.accent
                }
                onChange={
                  value =>
                    patch({
                      accent:
                        value,
                    })
                }
              />

              <ColorControl
                label="BORDERS"
                value={
                  branding.line
                }
                onChange={
                  value =>
                    patch({
                      line:
                        value,
                    })
                }
              />

              <ColorControl
                label="CATEGORY"
                value={
                  branding
                    .category_background
                }
                onChange={
                  value =>
                    patch({
                      category_background:
                        value,
                    })
                }
              />

              <ColorControl
                label="CATEGORY TEXT"
                value={
                  branding
                    .category_text
                }
                onChange={
                  value =>
                    patch({
                      category_text:
                        value,
                    })
                }
              />
            </section>
          )}


          {activeTab ===
            "type" && (
            <section className="menu-brand-compact-section">
              <div className="menu-brand-type-title">
                <Type
                  size={16}
                />

                Font family
              </div>


              <label className="menu-brand-field">
                <span>
                  HEADINGS
                </span>

                <select
                  value={
                    branding
                      .heading_font
                  }
                  onChange={
                    event =>
                      patch({
                        heading_font:
                          event
                            .target
                            .value,
                      })
                  }
                >
                  {FONT_OPTIONS.map(
                    font => (
                      <option
                        key={
                          font
                        }
                        value={
                          font
                        }
                      >
                        {font}
                      </option>
                    )
                  )}
                </select>
              </label>


              <label className="menu-brand-field">
                <span>
                  BODY
                </span>

                <select
                  value={
                    branding
                      .body_font
                  }
                  onChange={
                    event =>
                      patch({
                        body_font:
                          event
                            .target
                            .value,
                      })
                  }
                >
                  {FONT_OPTIONS.map(
                    font => (
                      <option
                        key={
                          font
                        }
                        value={
                          font
                        }
                      >
                        {font}
                      </option>
                    )
                  )}
                </select>
              </label>


              <div className="menu-brand-type-divider" />

              <div className="menu-brand-type-title">
                Font sizes
              </div>


              <div className="menu-brand-size-controls">
                {SIZE_CONTROLS.map(
                  control => (
                    <label
                      key={
                        control.key
                      }
                      className="menu-brand-size-row"
                    >
                      <div>
                        <span>
                          {
                            control.label
                          }
                        </span>

                        <strong>
                          {
                            branding[
                              control.key
                            ]
                          }
                          px
                        </strong>
                      </div>

                      <input
                        type="range"
                        min={
                          control.min
                        }
                        max={
                          control.max
                        }
                        step="1"
                        value={
                          branding[
                            control.key
                          ]
                        }
                        onChange={
                          event =>
                            patch({
                              [
                                control.key
                              ]:
                                Number(
                                  event
                                    .target
                                    .value
                                ),
                            })
                        }
                      />
                    </label>
                  )
                )}
              </div>


              <button
                type="button"
                className="menu-brand-reset-font-sizes"
                onClick={
                  resetFontSizes
                }
              >
                <span aria-hidden="true">
                  ↺
                </span>

                Reset font sizes
              </button>
            </section>
          )}
        </div>
      </aside>


      {pendingLogo && (
        <LogoCropper
          imageSource={
            pendingLogo
          }
          onCancel={() =>
            setPendingLogo(
              ""
            )
          }
          onApply={
            handleCropApply
          }
        />
      )}
    </>
  );
}
