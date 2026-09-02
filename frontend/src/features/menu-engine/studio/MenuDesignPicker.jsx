import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { PREMIUM_MENU_DESIGNS } from "../domain/menuDesignLibrary";
import { studioLanguageDirection } from "./studioLanguage";
import "./MenuDesignPicker.css";

const COPY = {
  en: { designs: "Menu designs", previous: "Previous designs", next: "More designs" },
  he: { designs: "עיצובי תפריט", previous: "עיצובים קודמים", next: "עיצובים נוספים" },
  ar: { designs: "تصاميم القائمة", previous: "التصاميم السابقة", next: "المزيد من التصاميم" },
};

export default function MenuDesignPicker({ designId, language = "en", onSelect, railRef, previewId }) {
  const buttons = useRef(new Map());
  const t = COPY[language] || COPY.en;
  const rtl = studioLanguageDirection(language) === "rtl";
  const PreviousIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  useEffect(() => {
    const rail = railRef.current;
    const selected = buttons.current.get(designId);
    if (!rail || !selected) return;
    const bounds = rail.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    // Reveal the selected design horizontally without scrolling the page away from the preview.
    const delta = item.left < bounds.left ? item.left - bounds.left : item.right > bounds.right ? item.right - bounds.right : 0;
    if (delta) rail.scrollBy({ left: delta, behavior: "auto" });
  }, [designId, language, railRef]);

  function scroll(direction) {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: direction * (rtl ? -1 : 1) * rail.clientWidth * .8, behavior: "smooth" });
  }

  function onKeyDown(event, index) {
    let next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = PREMIUM_MENU_DESIGNS.length - 1;
    else if (event.key === "ArrowRight") next = index + (rtl ? -1 : 1);
    else if (event.key === "ArrowLeft") next = index + (rtl ? 1 : -1);
    else return;
    event.preventDefault();
    next = (next + PREMIUM_MENU_DESIGNS.length) % PREMIUM_MENU_DESIGNS.length;
    const entry = PREMIUM_MENU_DESIGNS[next];
    buttons.current.get(entry.id)?.focus({ preventScroll: true });
    onSelect(entry.id);
  }

  return <div className="menu-design-picker" dir={rtl ? "rtl" : "ltr"}>
    <button type="button" className="menu-design-picker-scroll" onClick={() => scroll(-1)} aria-label={t.previous}><PreviousIcon size={18} /></button>
    <div className="menu-design-picker-rail" role="tablist" aria-label={t.designs} ref={railRef}>
      {PREMIUM_MENU_DESIGNS.map((entry, index) => <button
        type="button" role="tab" key={entry.id} id={`menu-design-tab-${entry.id}`}
        className="menu-design-picker-tab" aria-selected={entry.id === designId}
        aria-controls={previewId} tabIndex={entry.id === designId ? 0 : -1}
        ref={(node) => { if (node) buttons.current.set(entry.id, node); else buttons.current.delete(entry.id); }}
        onClick={() => onSelect(entry.id)} onKeyDown={(event) => onKeyDown(event, index)}
      >
        <span className="menu-design-picker-swatches" aria-hidden="true">{entry.swatches.slice(0, 3).map((color, i) => <i key={i} style={{ background: color }} />)}</span>
        <span>{entry.name}</span>
        {entry.id === designId ? <Check size={14} aria-hidden="true" /> : null}
      </button>)}
    </div>
    <button type="button" className="menu-design-picker-scroll" onClick={() => scroll(1)} aria-label={t.next}><NextIcon size={18} /></button>
  </div>;
}
