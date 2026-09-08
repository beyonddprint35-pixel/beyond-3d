import { useEffect, useRef, useState } from "react";
import "./menuLanguageControl.css";
import "./menuExpandableDescriptions.css";

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

const DESCRIPTION_COPY = Object.freeze({
  en:{more:"More",less:"Less",expand:"Show full description",collapse:"Collapse description"},
  he:{more:"עוד",less:"פחות",expand:"הצג תיאור מלא",collapse:"סגור תיאור"},
  ar:{more:"المزيد",less:"أقل",expand:"عرض الوصف الكامل",collapse:"طي الوصف"},
});

const isRtl = (language) => language === "he" || language === "ar";
const languageLabel = (language) => LANGUAGE_LABELS[language] || String(language || "").toUpperCase();

function longDescription(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  const words = value.split(/\s+/u).filter(Boolean).length;
  return value.length > 86 || words > 15;
}

function installPhotoDescriptionRegulation(ownerDocument, language) {
  if (!ownerDocument?.documentElement) return () => {};
  const copy = DESCRIPTION_COPY[language] || DESCRIPTION_COPY.en;

  const regulate = () => {
    ownerDocument.querySelectorAll(".bme-visual-item .bme-item-copy > p").forEach((description) => {
      const text = String(description.textContent || "").trim();
      if (!longDescription(text)) {
        description.classList.remove("bme-item-description-interactive", "is-expanded");
        description.removeAttribute("role");
        description.removeAttribute("tabindex");
        description.removeAttribute("aria-expanded");
        description.removeAttribute("aria-label");
        description.removeAttribute("data-description-action");
        description.removeAttribute("data-description-more");
        description.removeAttribute("data-description-less");
        return;
      }

      description.classList.add("bme-item-description-interactive");
      description.setAttribute("role", "button");
      description.setAttribute("tabindex", "0");
      description.setAttribute("data-description-more", copy.more);
      description.setAttribute("data-description-less", copy.less);
      const expanded = description.classList.contains("is-expanded");
      description.setAttribute("aria-expanded", expanded ? "true" : "false");
      description.setAttribute("aria-label", expanded ? copy.collapse : copy.expand);
      description.setAttribute("data-description-action", expanded ? copy.less : copy.more);
    });
  };

  const toggle = (description) => {
    const expanded = description.classList.toggle("is-expanded");
    description.setAttribute("aria-expanded", expanded ? "true" : "false");
    description.setAttribute("aria-label", expanded ? copy.collapse : copy.expand);
    description.setAttribute("data-description-action", expanded ? copy.less : copy.more);
  };

  const onClick = (event) => {
    const description = event.target?.closest?.(".bme-item-description-interactive");
    if (!description || description.ownerDocument !== ownerDocument) return;
    event.stopPropagation();
    toggle(description);
  };

  const onKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const description = event.target?.closest?.(".bme-item-description-interactive");
    if (!description || description.ownerDocument !== ownerDocument) return;
    event.preventDefault();
    event.stopPropagation();
    toggle(description);
  };

  regulate();
  const Observer = ownerDocument.defaultView?.MutationObserver;
  const observer = Observer ? new Observer(regulate) : null;
  observer?.observe(ownerDocument.documentElement, { childList:true, subtree:true, characterData:true });
  ownerDocument.addEventListener("click", onClick);
  ownerDocument.addEventListener("keydown", onKeyDown);

  return () => {
    observer?.disconnect();
    ownerDocument.removeEventListener("click", onClick);
    ownerDocument.removeEventListener("keydown", onKeyDown);
  };
}

export default function MenuLanguageControl({ languages = [], language, onChange, variant = "standard" }) {
  const available = [...new Set((languages || []).filter(Boolean))];
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const ownerDocument = rootRef.current?.ownerDocument;
    if (!ownerDocument) return undefined;
    return installPhotoDescriptionRegulation(ownerDocument, language);
  }, [language, available.join("|")]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const ownerDocument = rootRef.current?.ownerDocument || document;
    ownerDocument.addEventListener("pointerdown", handlePointer);
    ownerDocument.addEventListener("keydown", handleKey);
    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointer);
      ownerDocument.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [language, available.join("|")]);

  if (available.length <= 1) return <span ref={rootRef} className="bme-language-control-anchor" aria-hidden="true" />;

  if (available.length === 2) {
    return (
      <div ref={rootRef} className={`bme-language-control bme-language-toggle bme-language-${variant}`} aria-label="Menu language">
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
