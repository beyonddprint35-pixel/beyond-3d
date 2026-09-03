import "./MenuHeroHeadlineControl.css";

const COPY = {
  en: {
    title: "Hero headline",
    hint: "Free text — write exactly what you want guests to see.",
    restaurantPlaceholder: "Our Menu",
    clinicPlaceholder: "Our Treatments",
    clinicExamples: "Examples: Our Treatments · Advanced Skin Care · Feel Better. Move Better.",
    restaurantExamples: "Examples: Our Menu · Drinks & Food · Made for sharing.",
  },
  he: {
    title: "כותרת ראשית",
    hint: "טקסט חופשי — כתבו בדיוק מה תרצו שהלקוחות יראו.",
    restaurantPlaceholder: "התפריט שלנו",
    clinicPlaceholder: "הטיפולים שלנו",
    clinicExamples: "לדוגמה: הטיפולים שלנו · רפואת עור מתקדמת · להרגיש טוב יותר.",
    restaurantExamples: "לדוגמה: התפריט שלנו · אוכל ומשקאות · נוצר כדי לחלוק.",
  },
  ar: {
    title: "العنوان الرئيسي",
    hint: "نص حر — اكتب بالضبط ما تريد أن يراه الزوار.",
    restaurantPlaceholder: "قائمتنا",
    clinicPlaceholder: "علاجاتنا",
    clinicExamples: "أمثلة: علاجاتنا · عناية متقدمة بالبشرة · اشعر بتحسن.",
    restaurantExamples: "أمثلة: قائمتنا · الطعام والمشروبات · صُممت للمشاركة.",
  },
};

function localizedValue(value, language) {
  if (value && typeof value === "object") return String(value[language] || "");
  return language === "en" ? String(value || "") : "";
}

export default function MenuHeroHeadlineControl({ value, language = "en", industry = "restaurant", onChange }) {
  const copy = COPY[language] || COPY.en;
  const clinic = industry === "clinic";
  const rtl = language === "he" || language === "ar";
  const current = localizedValue(value, language);

  return (
    <section className="menu-hero-headline-control" dir={rtl ? "rtl" : "ltr"}>
      <div className="menu-hero-headline-control-head">
        <div>
          <strong>{copy.title}</strong>
          <small>{copy.hint}</small>
        </div>
        <span>{clinic ? "CLINIC" : "RESTAURANT"} · {language.toUpperCase()}</span>
      </div>
      <textarea
        rows={2}
        maxLength={90}
        value={current}
        placeholder={clinic ? copy.clinicPlaceholder : copy.restaurantPlaceholder}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label={copy.title}
      />
      <div className="menu-hero-headline-control-foot">
        <small>{clinic ? copy.clinicExamples : copy.restaurantExamples}</small>
        <span>{current.length}/90</span>
      </div>
    </section>
  );
}
