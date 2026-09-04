import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Image, Type } from "lucide-react";
import { PREMIUM_MENU_DESIGNS } from "../domain/menuDesignLibrary";
import { studioLanguageDirection } from "./studioLanguage";
import "./MenuDesignPicker.css";

const COPY = {
  en: {
    designs: "Menu designs",
    previous: "Previous designs",
    next: "More designs",
    withPhotos: "With photos",
    withoutPhotos: "Without photos",
    categories: "Design category",
  },
  he: {
    designs: "עיצובי תפריט",
    previous: "עיצובים קודמים",
    next: "עיצובים נוספים",
    withPhotos: "עם תמונות",
    withoutPhotos: "ללא תמונות",
    categories: "קטגוריית עיצוב",
  },
  ar: {
    designs: "تصاميم القائمة",
    previous: "التصاميم السابقة",
    next: "المزيد من التصاميم",
    withPhotos: "مع صور",
    withoutPhotos: "بدون صور",
    categories: "فئة التصميم",
  },
};

function isPhotoDesign(entry) {
  return entry?.design?.brand?.heroMediaMode === "image";
}

function categoryForDesign(designId) {
  const entry = PREMIUM_MENU_DESIGNS.find((item) => item.id === designId);
  return entry && isPhotoDesign(entry) ? "photos" : "text";
}

export default function MenuDesignPicker({ designId, language = "en", onSelect, railRef, previewId }) {
  const buttons = useRef(new Map());
  const t = COPY[language] || COPY.en;
  const rtl = studioLanguageDirection(language) === "rtl";
  const PreviousIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const [category, setCategory] = useState(() => categoryForDesign(designId));

  const restaurantDesigns = useMemo(
    () => PREMIUM_MENU_DESIGNS.filter((entry) => (entry.industry || "restaurant") === "restaurant"),
    [],
  );

  const visibleDesigns = useMemo(
    () => restaurantDesigns.filter((entry) => (category === "photos" ? isPhotoDesign(entry) : !isPhotoDesign(entry))),
    [restaurantDesigns, category],
  );

  const selectedVisible = visibleDesigns.some((entry) => entry.id === designId);

  useEffect(() => {
    const selectedEntry = PREMIUM_MENU_DESIGNS.find((entry) => entry.id === designId);
    if (!selectedEntry || (selectedEntry.industry || "restaurant") !== "restaurant") return;
    const nextCategory = isPhotoDesign(selectedEntry) ? "photos" : "text";
    if (nextCategory !== category) setCategory(nextCategory);
  }, [designId, category]);

  useEffect(() => {
    const rail = railRef.current;
    const selected = buttons.current.get(designId);
    if (!rail || !selected) return;
    const bounds = rail.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    const delta = item.left < bounds.left ? item.left - bounds.left : item.right > bounds.right ? item.right - bounds.right : 0;
    if (delta) rail.scrollBy({ left: delta, behavior: "auto" });
  }, [designId, language, railRef, category]);

  function chooseCategory(value) {
    setCategory(value);
    const rail = railRef.current;
    if (rail) rail.scrollTo({ left: 0, behavior: "smooth" });
  }

  function scroll(direction) {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: direction * (rtl ? -1 : 1) * rail.clientWidth * .8, behavior: "smooth" });
  }

  function onKeyDown(event, index) {
    let next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visibleDesigns.length - 1;
    else if (event.key === "ArrowRight") next = index + (rtl ? -1 : 1);
    else if (event.key === "ArrowLeft") next = index + (rtl ? 1 : -1);
    else return;
    if (!visibleDesigns.length) return;
    event.preventDefault();
    next = (next + visibleDesigns.length) % visibleDesigns.length;
    const entry = visibleDesigns[next];
    buttons.current.get(entry.id)?.focus({ preventScroll: true });
    onSelect(entry.id);
  }

  const categoryLabel = category === "photos" ? t.withPhotos : t.withoutPhotos;

  return <div className="menu-design-picker-shell" dir={rtl ? "rtl" : "ltr"}>
    <div className="menu-design-picker-industries" role="tablist" aria-label={t.categories}>
      <button
        type="button"
        role="tab"
        aria-selected={category === "photos"}
        className={category === "photos" ? "active" : ""}
        onClick={() => chooseCategory("photos")}
      >
        <Image size={15} aria-hidden="true" />
        {t.withPhotos}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={category === "text"}
        className={category === "text" ? "active" : ""}
        onClick={() => chooseCategory("text")}
      >
        <Type size={15} aria-hidden="true" />
        {t.withoutPhotos}
      </button>
    </div>
    <div className="menu-design-picker">
      <button type="button" className="menu-design-picker-scroll" onClick={() => scroll(-1)} aria-label={t.previous}><PreviousIcon size={18} /></button>
      <div className="menu-design-picker-rail" role="tablist" aria-label={`${t.designs} · ${categoryLabel}`} ref={railRef}>
        {visibleDesigns.map((entry, index) => <button
          type="button" role="tab" key={entry.id} id={`menu-design-tab-${entry.id}`}
          className="menu-design-picker-tab" aria-selected={entry.id === designId}
          aria-controls={previewId} tabIndex={entry.id === designId || (!selectedVisible && index === 0) ? 0 : -1}
          ref={(node) => { if (node) buttons.current.set(entry.id, node); else buttons.current.delete(entry.id); }}
          onClick={() => onSelect(entry.id)} onKeyDown={(event) => onKeyDown(event, index)}
        >
          <span className="menu-design-picker-swatches" aria-hidden="true">{entry.swatches.slice(0, 3).map((color, i) => <i key={i} style={{ background: color }} />)}</span>
          <span>{entry.name}</span>
          {entry.id === designId ? <Check size={14} aria-hidden="true" /> : null}
        </button>)}
      </div>
      <button type="button" className="menu-design-picker-scroll" onClick={() => scroll(1)} aria-label={t.next}><NextIcon size={18} /></button>
    </div>
  </div>;
}
