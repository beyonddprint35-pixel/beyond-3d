import {
  useEffect,
  useState,
} from "react";


const STORAGE_KEY =
  "beyond-language";

const EVENT_NAME =
  "beyond-language-change";


export function getBeyondLanguage() {
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

  document.documentElement.lang =
    language === "he"
      ? "he"
      : "en";

  document.documentElement.setAttribute(
    "data-beyond-language",
    language
  );
}


export function setBeyondLanguage(
  language
) {
  const next =
    language === "he"
      ? "he"
      : "en";

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      next
    );
  } catch {
    // Ignore storage errors.
  }

  applyLanguage(next);

  window.dispatchEvent(
    new CustomEvent(
      EVENT_NAME,
      {
        detail: {
          language: next,
        },
      }
    )
  );
}


export function useBeyondLanguage() {
  const [
    language,
    setLanguage,
  ] = useState(
    getBeyondLanguage
  );


  useEffect(() => {
    applyLanguage(
      language
    );

    function handleChange(
      event
    ) {
      const next =
        event?.detail
          ?.language ||
        getBeyondLanguage();

      setLanguage(
        next === "he"
          ? "he"
          : "en"
      );
    }


    function handleStorage(
      event
    ) {
      if (
        event.key !==
        STORAGE_KEY
      ) {
        return;
      }

      setLanguage(
        event.newValue ===
          "he"
          ? "he"
          : "en"
      );
    }


    window.addEventListener(
      EVENT_NAME,
      handleChange
    );

    window.addEventListener(
      "storage",
      handleStorage
    );


    return () => {
      window.removeEventListener(
        EVENT_NAME,
        handleChange
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);


  function changeLanguage(
    next
  ) {
    const value =
      next === "he"
        ? "he"
        : "en";

    setLanguage(
      value
    );

    setBeyondLanguage(
      value
    );
  }


  return {
    language,

    isHebrew:
      language === "he",

    setLanguage:
      changeLanguage,

    toggleLanguage:
      () =>
        changeLanguage(
          language === "he"
            ? "en"
            : "he"
        ),
  };
}
