import {
  useBeyondLanguage,
} from "./BeyondLanguage";

import "./BeyondLanguageToggle.css";


export default function BeyondLanguageToggle({
  className = "",
}) {
  const {
    language,
    toggleLanguage,
  } = useBeyondLanguage();


  return (
    <button
      type="button"
      className={`beyond-language-toggle ${className}`}
      onClick={
        toggleLanguage
      }
      aria-label={
        language === "he"
          ? "Switch to English"
          : "עבור לעברית"
      }
    >
      <span
        className={
          language === "en"
            ? "active"
            : ""
        }
      >
        EN
      </span>

      <i />

      <span
        className={
          language === "he"
            ? "active"
            : ""
        }
      >
        עב
      </span>
    </button>
  );
}
