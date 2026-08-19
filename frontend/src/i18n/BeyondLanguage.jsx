import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";


const STORAGE_KEY =
  "beyond-language";

const EVENT_NAME =
  "beyond-language-change";


const BeyondLanguageContext =
  createContext(null);


function readLanguage() {
  try {
    return (
      window.localStorage.getItem(
        STORAGE_KEY
      ) === "he"
        ? "he"
        : "en"
    );
  } catch {
    return "en";
  }
}


function applyLanguage(
  language
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  /*
    IMPORTANT:
    We intentionally DO NOT set
    document.dir = "rtl".

    That would reverse grids, flex rows,
    Creator panels and other layouts.

    Hebrew direction is applied only
    to actual Hebrew text.
  */

  document.documentElement.lang =
    language === "he"
      ? "he"
      : "en";

  document.documentElement.setAttribute(
    "data-beyond-language",
    language
  );
}


export function BeyondLanguageProvider({
  children,
}) {
  const [
    language,
    setLanguageState,
  ] = useState(
    readLanguage
  );


  useEffect(() => {
    applyLanguage(
      language
    );

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        language
      );
    } catch {
      // Storage may be unavailable.
    }
  }, [
    language,
  ]);


  useEffect(() => {
    function handleStorage(
      event
    ) {
      if (
        event.key !==
        STORAGE_KEY
      ) {
        return;
      }

      const next =
        event.newValue === "he"
          ? "he"
          : "en";

      setLanguageState(
        next
      );
    }


    function handleLanguageEvent(
      event
    ) {
      const next =
        event.detail
          ?.language === "he"
          ? "he"
          : "en";

      setLanguageState(
        next
      );
    }


    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      EVENT_NAME,
      handleLanguageEvent
    );


    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        EVENT_NAME,
        handleLanguageEvent
      );
    };
  }, []);


  function setLanguage(
    nextLanguage
  ) {
    const next =
      nextLanguage === "he"
        ? "he"
        : "en";

    setLanguageState(
      next
    );

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        next
      );
    } catch {
      // Ignore.
    }

    window.dispatchEvent(
      new CustomEvent(
        EVENT_NAME,
        {
          detail: {
            language:
              next,
          },
        }
      )
    );
  }


  const value =
    useMemo(
      () => ({
        language,

        isHebrew:
          language === "he",

        setLanguage,

        toggleLanguage:
          () =>
            setLanguage(
              language === "he"
                ? "en"
                : "he"
            ),

        /*
          Simple translator.

          Example:
          t(
            "Start a project",
            "התחל פרויקט"
          )
        */
        t: (
          english,
          hebrew
        ) =>
          language === "he"
            ? hebrew
            : english,

        textDirection:
          language === "he"
            ? "rtl"
            : "ltr",
      }),
      [
        language,
      ]
    );


  return (
    <BeyondLanguageContext.Provider
      value={value}
    >
      {children}
    </BeyondLanguageContext.Provider>
  );
}


export function useBeyondLanguage() {
  const context =
    useContext(
      BeyondLanguageContext
    );

  if (!context) {
    throw new Error(
      "useBeyondLanguage must be used inside BeyondLanguageProvider."
    );
  }

  return context;
}
