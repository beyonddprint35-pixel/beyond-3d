import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";

import { STUDIO_LANGUAGES, studioLanguageMeta } from "../features/menu-engine/studio/studioLanguage";
import "./StudioLanguageMenu.css";

export default function StudioLanguageMenu({
  value,
  onChange,
  label = "Language",
  compact = false,
  className = "",
  allowedLanguages = null,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const options = useMemo(() => {
    // Compact selectors live in the Studio app chrome. They are interface
    // controls and must always expose EN / HE / AR regardless of which
    // customer languages are currently enabled for the published menu.
    if (compact) return STUDIO_LANGUAGES;
    if (!Array.isArray(allowedLanguages) || !allowedLanguages.length) return STUDIO_LANGUAGES;
    const allowed = new Set(allowedLanguages);
    const filtered = STUDIO_LANGUAGES.filter((language) => allowed.has(language.code));
    return filtered.length ? filtered : STUDIO_LANGUAGES;
  }, [allowedLanguages, compact]);
  const active = options.find((language) => language.code === value) || studioLanguageMeta(value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`studio-language-menu ${compact ? "is-compact" : ""} ${open ? "is-open" : ""} ${className}`.trim()}>
      <button
        type="button"
        className="studio-language-menu-trigger"
        aria-label={`${label}: ${active.nativeLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Languages size={15} aria-hidden="true" />
        <span className="studio-language-menu-trigger-copy">
          {!compact ? <small>{label}</small> : null}
          <strong>{active.nativeLabel}</strong>
        </span>
        <span className="studio-language-menu-code">{active.short}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div className="studio-language-menu-list" role="listbox" aria-label={label}>
          {options.map((language) => {
            const selected = language.code === value;
            return (
              <button
                key={language.code}
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? "active" : ""}
                onClick={() => {
                  onChange?.(language.code);
                  setOpen(false);
                }}
              >
                <span className="studio-language-menu-check">{selected ? <Check size={13} /> : null}</span>
                <span className="studio-language-menu-option-copy">
                  <strong>{language.nativeLabel}</strong>
                  <small>{language.label}</small>
                </span>
                <span>{language.short}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
