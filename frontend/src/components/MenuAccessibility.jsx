import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./MenuAccessibility.css";


const DEFAULT_PREF_KEY =
  "beyondMenuA11yV2";


const DEFAULT_STATE = {
  font: 0,
  contrast: false,
  dark: false,
  grayscale: false,
  readable: false,
  reducedMotion: false,
  links: false,
};


function loadPreferences(
  preferenceKey
) {
  try {
    return {
      ...DEFAULT_STATE,

      ...JSON.parse(
        localStorage.getItem(
          preferenceKey
        ) || "{}"
      ),
    };
  } catch {
    return {
      ...DEFAULT_STATE,
    };
  }
}


export default function MenuAccessibility({
  displayName = "העסק",

  /*
    LIVE menus preserve El Puerto behavior
    and remember the customer's settings.

    Builder preview can disable persistence
    so old accessibility settings do not
    interfere with brand customization.
  */
  persistPreferences = true,

  preferenceKey =
    DEFAULT_PREF_KEY,
}) {
  const hostAnchorRef =
    useRef(null);

  const toggleRef =
    useRef(null);

  const closeRef =
    useRef(null);

  const statusRef =
    useRef(null);

  const dialogRef =
    useRef(null);

  const closeStatementRef =
    useRef(null);


  const [
    state,
    setState,
  ] =
    useState(
      () =>
        persistPreferences
          ? loadPreferences(
              preferenceKey
            )
          : {
              ...DEFAULT_STATE,
            }
    );


  const [
    panelOpen,
    setPanelOpen,
  ] =
    useState(false);


  function getHost() {
    return (
      hostAnchorRef
        .current
        ?.closest(
          ".digital-menu-template"
        ) ||
      null
    );
  }


  function announce(
    message
  ) {
    if (
      !statusRef.current
    ) {
      return;
    }

    statusRef.current
      .textContent = "";

    requestAnimationFrame(
      () => {
        if (
          statusRef.current
        ) {
          statusRef.current
            .textContent =
            message;
        }
      }
    );
  }


  function applyState(
    nextState
  ) {
    const host =
      getHost();

    if (!host) {
      return;
    }


    host.classList.toggle(
      "a11y-text-large",
      nextState.font === 1
    );

    host.classList.toggle(
      "a11y-text-larger",
      nextState.font === 2
    );

    host.classList.toggle(
      "a11y-text-xl",
      nextState.font === 3
    );

    host.classList.toggle(
      "a11y-text-xxl",
      nextState.font === 4
    );

    host.classList.toggle(
      "a11y-contrast",
      nextState.contrast
    );

    host.classList.toggle(
      "a11y-dark",
      nextState.dark
    );

    host.classList.toggle(
      "a11y-grayscale",
      nextState.grayscale
    );

    host.classList.toggle(
      "a11y-readable",
      nextState.readable
    );

    host.classList.toggle(
      "a11y-reduced-motion",
      nextState.reducedMotion
    );

    host.classList.toggle(
      "a11y-links",
      nextState.links
    );
  }


  useEffect(() => {
    applyState(
      state
    );

    if (
      !persistPreferences
    ) {
      return;
    }

    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify(
          state
        )
      );
    } catch {
      // Accessibility still works
      // without localStorage.
    }
  }, [
    state,
    persistPreferences,
    preferenceKey,
  ]);


  useEffect(() => {
    const host =
      getHost();

    if (!host) {
      return;
    }


    function enhance() {
      host
        .querySelectorAll(
          "img"
        )
        .forEach(
          image => {
            if (
              !image.hasAttribute(
                "alt"
              )
            ) {
              image.alt =
                "";
            }

            image.loading =
              "lazy";

            image.decoding =
              "async";
          }
        );


      host
        .querySelectorAll(
          ".item-row"
        )
        .forEach(
          row => {
            row.removeAttribute(
              "role"
            );

            row.removeAttribute(
              "tabindex"
            );
          }
        );


      const list =
        host.querySelector(
          "#menuList"
        );

      if (list) {
        list.setAttribute(
          "role",
          "region"
        );

        list.setAttribute(
          "aria-labelledby",
          "sectionTitle"
        );
      }


      applyState(
        state
      );
    }


    enhance();

    const timer =
      window.setTimeout(
        enhance,
        50
      );


    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    state,
  ]);


  useEffect(() => {
    const host =
      getHost();

    if (!host) {
      return;
    }


    const openButton =
      host.querySelector(
        "#openAccessibilityStatement"
      );


    function handleOpen() {
      openDialog();
    }


    openButton
      ?.addEventListener(
        "click",
        handleOpen
      );


    return () => {
      openButton
        ?.removeEventListener(
          "click",
          handleOpen
        );
    };
  });


  useEffect(() => {
    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
          "Escape" &&
        panelOpen
      ) {
        closePanel();
      }
    }


    document.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    panelOpen,
  ]);


  function openPanel() {
    setPanelOpen(
      true
    );

    requestAnimationFrame(
      () => {
        closeRef.current
          ?.focus();
      }
    );
  }


  function closePanel(
    returnFocus = true
  ) {
    setPanelOpen(
      false
    );

    if (
      returnFocus
    ) {
      requestAnimationFrame(
        () => {
          toggleRef.current
            ?.focus();
        }
      );
    }
  }


  function openDialog() {
    closePanel(
      false
    );

    const dialog =
      dialogRef.current;

    if (!dialog) {
      return;
    }


    if (
      typeof dialog.showModal ===
      "function"
    ) {
      if (
        !dialog.open
      ) {
        dialog.showModal();
      }
    } else {
      dialog.setAttribute(
        "open",
        ""
      );
    }


    requestAnimationFrame(
      () => {
        closeStatementRef
          .current
          ?.focus();
      }
    );
  }


  function closeDialog() {
    const dialog =
      dialogRef.current;

    if (!dialog) {
      return;
    }


    if (
      typeof dialog.close ===
        "function" &&
      dialog.open
    ) {
      dialog.close();
    } else {
      dialog.removeAttribute(
        "open"
      );
    }


    const host =
      getHost();

    host
      ?.querySelector(
        "#openAccessibilityStatement"
      )
      ?.focus();
  }


  function reset() {
    setState({
      ...DEFAULT_STATE,
    });


    if (
      persistPreferences
    ) {
      try {
        localStorage.removeItem(
          preferenceKey
        );
      } catch {
        // Ignore.
      }
    }


    announce(
      "הגדרות הנגישות אופסו"
    );
  }


  function runAction(
    action
  ) {
    if (
      action ===
      "reset"
    ) {
      reset();
      return;
    }


    setState(
      current => {
        const next = {
          ...current,
        };


        if (
          action ===
          "increaseText"
        ) {
          next.font =
            Math.min(
              4,
              current.font +
                1
            );

          announce(
            next.font === 4
              ? "טקסט מוגדל למקסימום"
              : `הטקסט הוגדל לדרגה ${
                  next.font +
                  1
                } מתוך 5`
          );
        }


        if (
          action ===
          "decreaseText"
        ) {
          next.font =
            Math.max(
              0,
              current.font -
                1
            );

          announce(
            next.font === 0
              ? "גודל הטקסט חזר לרגיל"
              : `הטקסט הוקטן לדרגה ${
                  next.font +
                  1
                } מתוך 5`
          );
        }


        if (
          action ===
          "highContrast"
        ) {
          next.contrast =
            !current.contrast;

          announce(
            `ניגודיות גבוהה ${
              next.contrast
                ? "הופעלה"
                : "כובתה"
            }`
          );
        }


        if (
          action ===
          "darkMode"
        ) {
          next.dark =
            !current.dark;

          announce(
            `מצב כהה ${
              next.dark
                ? "הופעל"
                : "כובה"
            }`
          );
        }


        if (
          action ===
          "grayscale"
        ) {
          next.grayscale =
            !current.grayscale;

          announce(
            `גווני אפור ${
              next.grayscale
                ? "הופעלו"
                : "כובו"
            }`
          );
        }


        if (
          action ===
          "readableFont"
        ) {
          next.readable =
            !current.readable;

          announce(
            `גופן קריא ${
              next.readable
                ? "הופעל"
                : "כובה"
            }`
          );
        }


        if (
          action ===
          "reduceMotion"
        ) {
          next.reducedMotion =
            !current.reducedMotion;

          announce(
            `הפחתת תנועה ${
              next.reducedMotion
                ? "הופעלה"
                : "כובתה"
            }`
          );
        }


        if (
          action ===
          "highlightLinks"
        ) {
          next.links =
            !current.links;

          announce(
            `הדגשת קישורים ${
              next.links
                ? "הופעלה"
                : "כובתה"
            }`
          );
        }


        return next;
      }
    );
  }


  return (
    <>
      <span
        ref={
          hostAnchorRef
        }
        className="a11y-host-anchor"
        aria-hidden="true"
      />


      <a
        className="skip-link"
        href="#mainContent"
      >
        דלג לתוכן הראשי / Skip to main content
      </a>


      <div
        ref={
          statusRef
        }
        id="a11yStatus"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />


      <button
        ref={
          toggleRef
        }
        id="accessibilityToggle"
        className="accessibility-toggle"
        type="button"
        aria-label="פתח תפריט נגישות / Open accessibility menu"
        aria-expanded={
          panelOpen
        }
        aria-controls="accessibilityPanel"
        aria-haspopup="dialog"
        onClick={() =>
          panelOpen
            ? closePanel()
            : openPanel()
        }
      >
        <svg
          viewBox="0 0 40 40"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="a11y-icon-ring"
            cx="20"
            cy="20"
            r="17"
          />

          <circle
            className="a11y-icon-head"
            cx="20"
            cy="11.5"
            r="2.8"
          />

          <path
            className="a11y-icon-person"
            d="M11.5 16.8c2.8 1.3 5.6 2 8.5 2s5.7-.7 8.5-2"
          />

          <path
            className="a11y-icon-person"
            d="M20 18.8v8.1"
          />

          <path
            className="a11y-icon-person"
            d="M20 26.7l-5.2 6"
          />

          <path
            className="a11y-icon-person"
            d="M20 26.7l5.2 6"
          />
        </svg>
      </button>


      <aside
        id="accessibilityPanel"
        className="accessibility-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="accessibilityPanelTitle"
        hidden={
          !panelOpen
        }
      >
        <div className="accessibility-panel-head">
          <strong id="accessibilityPanelTitle">
            נגישות / Accessibility
          </strong>

          <button
            ref={
              closeRef
            }
            id="accessibilityClose"
            type="button"
            onClick={() =>
              closePanel()
            }
          >
            ×
          </button>
        </div>


        <div className="accessibility-panel-body">
          <button
            type="button"
            onClick={() =>
              runAction(
                "increaseText"
              )
            }
          >
            A+ הגדלת טקסט
          </button>

          <button
            type="button"
            onClick={() =>
              runAction(
                "decreaseText"
              )
            }
          >
            A− הקטנת טקסט
          </button>

          <button
            type="button"
            aria-pressed={
              state.contrast
            }
            onClick={() =>
              runAction(
                "highContrast"
              )
            }
          >
            ניגודיות גבוהה
          </button>

          <button
            type="button"
            aria-pressed={
              state.dark
            }
            onClick={() =>
              runAction(
                "darkMode"
              )
            }
          >
            מצב כהה
          </button>

          <button
            type="button"
            aria-pressed={
              state.grayscale
            }
            onClick={() =>
              runAction(
                "grayscale"
              )
            }
          >
            גווני אפור
          </button>

          <button
            type="button"
            aria-pressed={
              state.readable
            }
            onClick={() =>
              runAction(
                "readableFont"
              )
            }
          >
            גופן קריא
          </button>

          <button
            type="button"
            aria-pressed={
              state.reducedMotion
            }
            onClick={() =>
              runAction(
                "reduceMotion"
              )
            }
          >
            הפחתת תנועה
          </button>

          <button
            type="button"
            aria-pressed={
              state.links
            }
            onClick={() =>
              runAction(
                "highlightLinks"
              )
            }
          >
            הדגשת קישורים/כפתורים
          </button>

          <button
            type="button"
            onClick={
              reset
            }
          >
            איפוס הגדרות
          </button>

          <button
            type="button"
            id="accessibilityStatementFromPanel"
            onClick={
              openDialog
            }
          >
            הצהרת נגישות
          </button>
        </div>


        <p className="accessibility-note">
          כלי עזר לנוחות שימוש. הנגישות העיקרית מיושמת גם במבנה האתר, בניווט מקלדת, בפוקוס ובתמיכה בטכנולוגיות מסייעות.
        </p>
      </aside>


      <dialog
        ref={
          dialogRef
        }
        id="accessibilityStatementDialog"
        aria-labelledby="accessibilityStatementTitle"
        lang="he"
        dir="rtl"
        onCancel={
          event => {
            event.preventDefault();
            closeDialog();
          }
        }
        onClick={
          event => {
            if (
              event.target ===
              dialogRef.current
            ) {
              closeDialog();
            }
          }
        }
      >
        <div className="a11y-statement-shell">
          <div className="a11y-statement-head">
            <h2 id="accessibilityStatementTitle">
              הצהרת נגישות
            </h2>

            <button
              ref={
                closeStatementRef
              }
              type="button"
              className="a11y-statement-close"
              onClick={
                closeDialog
              }
            >
              ×
            </button>
          </div>


          <div className="a11y-statement-body">
            <p>
              {displayName} רואה חשיבות במתן שירות שוויוני ונגיש לכלל הלקוחות, לרבות אנשים עם מוגבלות.
            </p>

            <h3>
              תקן ורמת נגישות
            </h3>

            <p>
              ההתאמות באתר בוצעו תוך התייחסות לתקנות שוויון זכויות לאנשים עם מוגבלות, לתקן הישראלי ת״י 5568 ולהנחיות WCAG ברמת AA.
            </p>

            <h3>
              התאמות שבוצעו באתר
            </h3>

            <ul>
              <li>
                אפשרות לדלג ישירות לתוכן הראשי.
              </li>

              <li>
                ניווט באמצעות מקלדת.
              </li>

              <li>
                סימון פוקוס ברור.
              </li>

              <li>
                תמיכה בעברית, אנגלית וערבית.
              </li>

              <li>
                הגדלת טקסט, ניגודיות גבוהה, מצב כהה, גווני אפור, גופן קריא, הפחתת תנועה והדגשת קישורים.
              </li>
            </ul>

            <h3>
              יצירת קשר בנושא נגישות
            </h3>

            <p className="a11y-contact-needed">
              לפניות בנושא נגישות ניתן לפנות לצוות {displayName} בבית העסק.
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
