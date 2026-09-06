import { useState } from "react";
import {
  BADGE_LABELS,
  BADGE_SYMBOLS,
  MENU_ALLERGENS,
  MENU_DIETARY_BADGES,
  MENU_MERCHANDISING_BADGES,
  MENU_SPICE_LEVELS,
  normalizeItemMetadata,
} from "../features/menu-engine/domain/itemMetadata";
import "./MenuContentBadgeEditor.css";

const COPY = {
  en: { title:"Badges", selected:(n)=>`${n} selected`, features:"Diet & features", allergens:"Allergens", spice:"Spice", more:"More", less:"Less", none:"Not spicy", confirmed:"Confirmed" },
  he: { title:"תגיות", selected:(n)=>`${n} נבחרו`, features:"תזונה ומאפיינים", allergens:"אלרגנים", spice:"חריפות", more:"עוד", less:"פחות", none:"לא חריף", confirmed:"מאושר" },
  ar: { title:"الشارات", selected:(n)=>`${n} محددة`, features:"النظام والميزات", allergens:"مسببات الحساسية", spice:"الحدة", more:"المزيد", less:"أقل", none:"غير حار", confirmed:"مؤكد" },
};

const PRIMARY_ALLERGEN_COUNT = 4;

function selected(metadata, group, key) {
  return Array.isArray(metadata?.[group]) && metadata[group].includes(key);
}

export default function MenuContentBadgeEditor({ item, language = "en", onChange }) {
  const copy = COPY[language] || COPY.en;
  const metadata = normalizeItemMetadata(item?.metadata || {});
  const [allergensOpen, setAllergensOpen] = useState(false);

  const selectedCount = (metadata.merchandising?.length || 0)
    + (metadata.dietary?.length || 0)
    + (metadata.allergens?.length || 0)
    + (metadata.spice && metadata.spice !== "none" ? 1 : 0);

  function toggle(group, key) {
    const current = Array.isArray(metadata[group]) ? metadata[group] : [];
    const next = current.includes(key) ? current.filter((value) => value !== key) : [...current, key];
    onChange?.({ metadata: normalizeItemMetadata({ ...metadata, [group]: next, reviewedByOwner: true }) });
  }

  function setSpice(spice) {
    onChange?.({ metadata: normalizeItemMetadata({ ...metadata, spice, reviewedByOwner: true }) });
  }

  function badgeButton(group, key) {
    const active = selected(metadata, group, key);
    return (
      <button key={`${group}-${key}`} type="button" className={`menu-content-v2-badge-chip ${active ? "active" : ""}`} aria-pressed={active} onClick={() => toggle(group, key)}>
        <span className="symbol">{BADGE_SYMBOLS[key] || "•"}</span>
        <span>{BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en || key}</span>
        {active ? <span className="check" aria-hidden="true">✓</span> : null}
      </button>
    );
  }

  const primaryAllergens = MENU_ALLERGENS.slice(0, PRIMARY_ALLERGEN_COUNT);
  const extraAllergens = MENU_ALLERGENS.slice(PRIMARY_ALLERGEN_COUNT);
  const visibleAllergens = allergensOpen ? MENU_ALLERGENS : primaryAllergens;
  const hiddenSelectedCount = extraAllergens.filter((key) => selected(metadata, "allergens", key)).length;

  return (
    <section className="menu-content-v2-badge-editor">
      <header>
        <strong>{copy.title}</strong>
        <div className="menu-content-v2-badge-summary">
          {selectedCount ? <span>{copy.selected(selectedCount)}</span> : null}
          {metadata.reviewedByOwner ? <span className="confirmed">✓ {copy.confirmed}</span> : null}
        </div>
      </header>

      <div className="menu-content-v2-badge-compact-row">
        <span className="menu-content-v2-badge-label">{copy.features}</span>
        <div className="menu-content-v2-badge-chips">
          {MENU_MERCHANDISING_BADGES.map((key) => badgeButton("merchandising", key))}
          {MENU_DIETARY_BADGES.map((key) => badgeButton("dietary", key))}
        </div>
      </div>

      <div className="menu-content-v2-badge-compact-row">
        <span className="menu-content-v2-badge-label">{copy.allergens}</span>
        <div className="menu-content-v2-badge-chips">
          {visibleAllergens.map((key) => badgeButton("allergens", key))}
          {extraAllergens.length ? (
            <button type="button" className="menu-content-v2-badge-more" onClick={() => setAllergensOpen((value) => !value)}>
              {allergensOpen ? copy.less : `+ ${copy.more}${hiddenSelectedCount ? ` (${hiddenSelectedCount})` : ""}`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="menu-content-v2-badge-spice-row">
        <span className="menu-content-v2-badge-label">{copy.spice}</span>
        <select value={metadata.spice || "none"} onChange={(event) => setSpice(event.target.value)}>
          {MENU_SPICE_LEVELS.map((key) => <option key={key} value={key}>{key === "none" ? copy.none : `${BADGE_SYMBOLS[key] || ""} ${BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en || key}`}</option>)}
        </select>
      </div>
    </section>
  );
}
