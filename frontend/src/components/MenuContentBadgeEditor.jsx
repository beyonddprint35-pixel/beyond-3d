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
  en: {
    title: "Badges",
    hint: "Add helpful labels customers can see on this item.",
    highlights: "Highlights",
    dietary: "Dietary",
    allergens: "Allergens",
    spice: "Spice level",
    none: "Not spicy",
    confirmed: "Restaurant confirmed",
  },
  he: {
    title: "תגיות",
    hint: "הוסיפו תגיות שימושיות שהלקוחות יראו על הפריט.",
    highlights: "הבלטות",
    dietary: "תזונה",
    allergens: "אלרגנים",
    spice: "רמת חריפות",
    none: "לא חריף",
    confirmed: "באישור המסעדה",
  },
  ar: {
    title: "الشارات",
    hint: "أضفوا شارات مفيدة يراها الزبائن على هذا الصنف.",
    highlights: "إبراز",
    dietary: "نظام غذائي",
    allergens: "مسببات الحساسية",
    spice: "مستوى الحدة",
    none: "غير حار",
    confirmed: "مؤكد من المطعم",
  },
};

function selected(metadata, group, key) {
  return Array.isArray(metadata?.[group]) && metadata[group].includes(key);
}

export default function MenuContentBadgeEditor({ item, language = "en", onChange }) {
  const copy = COPY[language] || COPY.en;
  const metadata = normalizeItemMetadata(item?.metadata || {});

  function toggle(group, key) {
    const current = Array.isArray(metadata[group]) ? metadata[group] : [];
    const next = current.includes(key)
      ? current.filter((value) => value !== key)
      : [...current, key];
    onChange?.({
      metadata: normalizeItemMetadata({
        ...metadata,
        [group]: next,
        reviewedByOwner: true,
      }),
    });
  }

  function setSpice(spice) {
    onChange?.({
      metadata: normalizeItemMetadata({
        ...metadata,
        spice,
        reviewedByOwner: true,
      }),
    });
  }

  function badgeButton(group, key) {
    const active = selected(metadata, group, key);
    return (
      <button
        key={`${group}-${key}`}
        type="button"
        className={active ? "active" : ""}
        aria-pressed={active}
        onClick={() => toggle(group, key)}
      >
        <span>{BADGE_SYMBOLS[key] || "•"}</span>
        {BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en || key}
      </button>
    );
  }

  return (
    <section className="menu-content-v2-badge-editor">
      <header>
        <div><strong>{copy.title}</strong><small>{copy.hint}</small></div>
        {metadata.reviewedByOwner ? <span className="confirmed">✓ {copy.confirmed}</span> : null}
      </header>

      <div className="menu-content-v2-badge-group">
        <strong>{copy.highlights}</strong>
        <div>{MENU_MERCHANDISING_BADGES.map((key) => badgeButton("merchandising", key))}</div>
      </div>

      <div className="menu-content-v2-badge-group">
        <strong>{copy.dietary}</strong>
        <div>{MENU_DIETARY_BADGES.map((key) => badgeButton("dietary", key))}</div>
      </div>

      <div className="menu-content-v2-badge-group">
        <strong>{copy.allergens}</strong>
        <div>{MENU_ALLERGENS.map((key) => badgeButton("allergens", key))}</div>
      </div>

      <label className="menu-content-v2-badge-spice">
        <strong>{copy.spice}</strong>
        <select value={metadata.spice || "none"} onChange={(event) => setSpice(event.target.value)}>
          {MENU_SPICE_LEVELS.map((key) => (
            <option key={key} value={key}>
              {key === "none" ? copy.none : `${BADGE_SYMBOLS[key] || ""} ${BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en || key}`}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
