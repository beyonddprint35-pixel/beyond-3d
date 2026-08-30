import { useEffect, useRef, useState } from "react";
import "./menuLanguageControl.css";

const LANGUAGE_LABELS = Object.freeze({
  en: "English",
  he: "עברית",
  ar: "العربية",
});

const LANGUAGE_SHORT = Object.freeze({
  en: "EN",
  he: "HE",
  ar: "AR",
});

const isRtl = (language) => language === "he" || language === "ar";
const languageLabel = (language) => LANGUAGE_LABELS[language] || String(language || "").toUpperCase();

export default function MenuLanguageControl({ languages = [], language, onChange, variant = "standard" }) {
  const available = [...new Set((languages || []).filter(Boolean))];
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [language, available.join("|")]);

  if (available.length <= 1) return null;

  if (available.length === 2) {
    return (
      <div className={`bme-language-control bme-language-toggle bme-language-${variant}`} aria-label="Menu language">
        {available.map((code) => (
          <button
            type="button"
            key={code}
            lang={code}
            dir={isRtl(code) ? "rtl" : "ltr"}
            aria-pressed={language === code}
            className={language === code ? "active" : ""}
            onClick={() => onChange(code)}
          >
            {languageLabel(code)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`bme-language-control bme-language-dropdown bme-language-${variant} ${open ? "open" : ""}`}>
      <button
        type="button"
        className="bme-language-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="bme-language-current" lang={language} dir={isRtl(language) ? "rtl" : "ltr"}>{languageLabel(language)}</span>
        <span className="bme-language-code" aria-hidden="true">{LANGUAGE_SHORT[language] || String(language || "").toUpperCase()}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.4 4.4 6 8l3.6-3.6" /></svg>
      </button>
      {open ? (
        <div className="bme-language-dropdown-list" role="listbox" aria-label="Menu language">
          {available.map((code) => (
            <button
              type="button"
              role="option"
              aria-selected={language === code}
              key={code}
              lang={code}
              dir={isRtl(code) ? "rtl" : "ltr"}
              className={language === code ? "active" : ""}
              onClick={() => { onChange(code); setOpen(false); }}
            >
              <span>{languageLabel(code)}</span>
              <small>{LANGUAGE_SHORT[code] || code.toUpperCase()}</small>
              {language === code ? <span className="bme-language-check" aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
