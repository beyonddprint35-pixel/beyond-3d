import {
  Check,
  Languages,
} from "lucide-react";

import "./MenuLanguageSelector.css";


export const MENU_LANGUAGES = [
  {
    code: "en",
    label: "English",
    direction: "LTR",
  },

  {
    code: "he",
    label: "עברית",
    direction: "RTL",
  },

  {
    code: "ar",
    label: "العربية",
    direction: "RTL",
  },
];


export default function MenuLanguageSelector({
  value = [],
  onChange,
  disabled = false,
}) {
  function toggleLanguage(
    code
  ) {
    if (disabled) {
      return;
    }

    if (
      value.includes(
        code
      )
    ) {
      onChange?.(
        value.filter(
          item =>
            item !== code
        )
      );

      return;
    }

    onChange?.([
      ...value,
      code,
    ]);
  }


  return (
    <section className="menu-language-selector">
      <div className="menu-language-selector-heading">
        <div className="menu-language-icon">
          <Languages
            size={20}
          />
        </div>

        <div>
          <span>
            01 / LANGUAGES
          </span>

          <h2>
            Which languages do you want?
          </h2>

          <p>
            Choose one or more languages for the live customer menu.
          </p>
        </div>
      </div>


      <div className="menu-language-options">
        {MENU_LANGUAGES.map(
          language => {
            const selected =
              value.includes(
                language.code
              );

            return (
              <button
                key={
                  language.code
                }
                type="button"
                className={
                  selected
                    ? "selected"
                    : ""
                }
                aria-pressed={
                  selected
                }
                disabled={
                  disabled
                }
                onClick={() =>
                  toggleLanguage(
                    language.code
                  )
                }
              >
                <span className="menu-language-checkbox">
                  {selected && (
                    <Check
                      size={13}
                    />
                  )}
                </span>

                <strong
                  dir={
                    language.direction ===
                    "RTL"
                      ? "rtl"
                      : "ltr"
                  }
                >
                  {
                    language.label
                  }
                </strong>

                <small>
                  {
                    language.direction
                  }
                </small>
              </button>
            );
          }
        )}
      </div>


      {value.length === 0 && (
        <div className="menu-language-warning">
          Choose at least one language.
        </div>
      )}
    </section>
  );
}
