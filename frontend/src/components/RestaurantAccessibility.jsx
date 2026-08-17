import {
  useEffect,
  useState,
} from "react";

import "./RestaurantAccessibility.css";

const STORAGE_KEY =
  "beyondRestaurantAccessibilityV1";

const DEFAULT_STATE = {
  font: 0,
  contrast: false,
  dark: false,
  grayscale: false,
  readable: false,
  reducedMotion: false,
  links: false,
};

export default function RestaurantAccessibility({
  restaurantName = "Restaurant",
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    statementOpen,
    setStatementOpen,
  ] = useState(false);

  const [
    settings,
    setSettings,
  ] = useState(DEFAULT_STATE);

  const [
    status,
    setStatus,
  ] = useState("");

  useEffect(() => {
    try {
      const saved =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          ) || "null"
        );

      if (saved) {
        setSettings({
          ...DEFAULT_STATE,
          ...saved,
        });
      }
    } catch {
      // Ignore invalid saved preferences.
    }
  }, []);

  useEffect(() => {
    const root =
      document.documentElement;

    const body =
      document.body;

    body.classList.toggle(
      "restaurant-a11y-text-1",
      settings.font === 1
    );

    body.classList.toggle(
      "restaurant-a11y-text-2",
      settings.font === 2
    );

    body.classList.toggle(
      "restaurant-a11y-text-3",
      settings.font === 3
    );

    body.classList.toggle(
      "restaurant-a11y-text-4",
      settings.font === 4
    );

    root.classList.toggle(
      "restaurant-a11y-contrast",
      settings.contrast
    );

    root.classList.toggle(
      "restaurant-a11y-dark",
      settings.dark
    );

    root.classList.toggle(
      "restaurant-a11y-grayscale",
      settings.grayscale
    );

    root.classList.toggle(
      "restaurant-a11y-readable",
      settings.readable
    );

    root.classList.toggle(
      "restaurant-a11y-motion",
      settings.reducedMotion
    );

    root.classList.toggle(
      "restaurant-a11y-links",
      settings.links
    );

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );
    } catch {
      // Storage may be unavailable.
    }

    return () => {};
  }, [settings]);

  // BEYOND_ACCESSIBILITY_STATEMENT_EVENT_V1
  useEffect(() => {
    function openStatementFromFooter() {
      setOpen(false);
      setStatementOpen(true);
    }

    window.addEventListener(
      "beyond-open-accessibility-statement",
      openStatementFromFooter
    );

    return () =>
      window.removeEventListener(
        "beyond-open-accessibility-statement",
        openStatementFromFooter
      );
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
        setStatementOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      document.removeEventListener(
        "keydown",
        onKeyDown
      );
  }, []);

  function announce(message) {
    setStatus("");

    requestAnimationFrame(() => {
      setStatus(message);
    });
  }

  function updateSetting(
    key,
    label
  ) {
    setSettings(current => {
      const nextValue =
        !current[key];

      announce(
        `${label} ${
          nextValue
            ? "enabled"
            : "disabled"
        }`
      );

      return {
        ...current,
        [key]: nextValue,
      };
    });
  }

  function increaseText() {
    setSettings(current => {
      const next =
        Math.min(
          4,
          current.font + 1
        );

      announce(
        next === 4
          ? "Text size is at maximum"
          : "Text size increased"
      );

      return {
        ...current,
        font: next,
      };
    });
  }

  function decreaseText() {
    setSettings(current => {
      const next =
        Math.max(
          0,
          current.font - 1
        );

      announce(
        next === 0
          ? "Text size returned to normal"
          : "Text size decreased"
      );

      return {
        ...current,
        font: next,
      };
    });
  }

  function reset() {
    setSettings(
      DEFAULT_STATE
    );

    try {
      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch {
      // Ignore.
    }

    announce(
      "Accessibility settings reset"
    );
  }

  return (
    <>
      <a
        className="restaurant-skip-link"
        href="#restaurant-main-content"
      >
        דלג לתוכן הראשי / Skip to main content
      </a>

      <div
        className="restaurant-a11y-status"
        aria-live="polite"
        aria-atomic="true"
      >
        {status}
      </div>

      <button
        type="button"
        className="restaurant-a11y-toggle"
        aria-label="פתח תפריט נגישות / Open accessibility menu"
        aria-expanded={open}
        onClick={() =>
          setOpen(current => !current)
        }
      >
        <svg
          viewBox="0 0 40 40"
          aria-hidden="true"
        >
          <circle
            cx="20"
            cy="20"
            r="17"
          />

          <circle
            className="restaurant-a11y-head"
            cx="20"
            cy="11.5"
            r="2.8"
          />

          <path d="M11.5 16.8c2.8 1.3 5.6 2 8.5 2s5.7-.7 8.5-2" />
          <path d="M20 18.8v8.1" />
          <path d="M20 26.7l-5.2 6" />
          <path d="M20 26.7l5.2 6" />
        </svg>
      </button>

      {open && (
        <aside
          className="restaurant-a11y-panel"
          role="dialog"
          aria-label="נגישות / Accessibility"
        >
          <div className="restaurant-a11y-panel-head">
            <strong>
              נגישות / Accessibility
            </strong>

            <button
              type="button"
              aria-label="Close accessibility menu"
              onClick={() =>
                setOpen(false)
              }
            >
              ×
            </button>
          </div>

          <div className="restaurant-a11y-actions">
            <button
              type="button"
              onClick={increaseText}
            >
              A+ הגדלת טקסט
            </button>

            <button
              type="button"
              onClick={decreaseText}
            >
              A− הקטנת טקסט
            </button>

            <button
              type="button"
              aria-pressed={
                settings.contrast
              }
              onClick={() =>
                updateSetting(
                  "contrast",
                  "High contrast"
                )
              }
            >
              ניגודיות גבוהה
            </button>

            <button
              type="button"
              aria-pressed={
                settings.dark
              }
              onClick={() =>
                updateSetting(
                  "dark",
                  "Dark mode"
                )
              }
            >
              מצב כהה
            </button>

            <button
              type="button"
              aria-pressed={
                settings.grayscale
              }
              onClick={() =>
                updateSetting(
                  "grayscale",
                  "Grayscale"
                )
              }
            >
              גווני אפור
            </button>

            <button
              type="button"
              aria-pressed={
                settings.readable
              }
              onClick={() =>
                updateSetting(
                  "readable",
                  "Readable font"
                )
              }
            >
              גופן קריא
            </button>

            <button
              type="button"
              aria-pressed={
                settings.reducedMotion
              }
              onClick={() =>
                updateSetting(
                  "reducedMotion",
                  "Reduced motion"
                )
              }
            >
              הפחתת תנועה
            </button>

            <button
              type="button"
              aria-pressed={
                settings.links
              }
              onClick={() =>
                updateSetting(
                  "links",
                  "Highlighted links"
                )
              }
            >
              הדגשת קישורים
            </button>

            <button
              type="button"
              onClick={reset}
            >
              איפוס הגדרות
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setStatementOpen(true);
              }}
            >
              הצהרת נגישות
            </button>
          </div>

          <p className="restaurant-a11y-note">
            כלי עזר לנוחות שימוש.
            האתר כולל גם תמיכה
            בניווט מקלדת, פוקוס ברור
            וטכנולוגיות מסייעות.
          </p>
        </aside>
      )}

      {statementOpen && (
        <div
          className="restaurant-a11y-statement-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setStatementOpen(
                false
              );
            }
          }}
        >
          <section
            className="restaurant-a11y-statement"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurantAccessibilityStatementTitle"
          >
            <header>
              <div>
                <span>
                  ACCESSIBILITY
                </span>

                <h2
                  id="restaurantAccessibilityStatementTitle"
                >
                  הצהרת נגישות
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close accessibility statement"
                onClick={() =>
                  setStatementOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </header>

            <div className="restaurant-a11y-statement-body">
              <p>
                אנו שואפים לאפשר
                שימוש נוח ונגיש באתר
                התפריט הדיגיטלי של{" "}
                <strong>
                  {restaurantName}
                </strong>
                .
              </p>

              <h3>
                התאמות באתר
              </h3>

              <ul>
                <li>
                  ניווט באמצעות מקלדת
                  ופוקוס ברור.
                </li>

                <li>
                  הגדלה והקטנה של
                  טקסט.
                </li>

                <li>
                  מצב ניגודיות גבוהה
                  ומצב כהה.
                </li>

                <li>
                  גופן קריא וגווני
                  אפור.
                </li>

                <li>
                  אפשרות להפחתת
                  תנועה.
                </li>

                <li>
                  הדגשת קישורים
                  וכפתורים.
                </li>
              </ul>

              <h3>
                תוכן מתעדכן
              </h3>

              <p>
                התפריט עשוי להתעדכן
                מעת לעת. אם נתקלתם
                בפריט או רכיב שאינו
                נגיש, ניתן לפנות לבית
                העסק ולדווח על כך.
              </p>

              <p className="restaurant-a11y-statement-note">
                אנו ממשיכים לפעול
                לשיפור חוויית השימוש
                והנגישות באתר.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
