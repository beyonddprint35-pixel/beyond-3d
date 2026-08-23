export const DEFAULT_MENU_PRICING = {
  headline_en: "Simple, transparent pricing.",
  headline_he: "מחירים פשוטים ושקופים.",
  subheadline_en: "Choose the plan that fits your restaurant today and upgrade as your team grows.",
  subheadline_he: "בחרו את החבילה שמתאימה למסעדה שלכם היום ושדרגו כשהצוות גדל.",
  plans: [
    {
      id: "basic",
      name_en: "Basic",
      name_he: "בסיסי",
      description_en: "For independent restaurants that need one simple digital-menu workspace.",
      description_he: "למסעדות עצמאיות שצריכות סביבת עבודה פשוטה לתפריט דיגיטלי.",
      price: "₪129",
      period_en: "/ month",
      period_he: "/ חודש",
      setup_fee: "₪200",
      setup_note_en: "NFC stands not included",
      setup_note_he: "מעמדי NFC אינם כלולים",
      cta_en: "Choose Basic",
      cta_he: "בחירת בסיסי",
      recommended: false,
      features: [
        { en: "1 user", he: "משתמש אחד" },
        { en: "1 menu language", he: "שפה אחת בתפריט" },
        { en: "Menu Studio editing", he: "עריכה ב-Menu Studio" },
        { en: "Live customer preview", he: "תצוגה חיה ללקוח" },
        { en: "QR menu access", he: "פתיחת התפריט באמצעות QR" },
      ],
    },
    {
      id: "premium",
      name_en: "Premium",
      name_he: "פרימיום",
      description_en: "For growing teams that want collaboration, automation and deeper customer insights.",
      description_he: "לצוותים צומחים שרוצים שיתוף פעולה, אוטומציה ותובנות עמוקות יותר על הלקוחות.",
      price: "₪199",
      period_en: "/ month",
      period_he: "/ חודש",
      setup_fee: "₪500",
      setup_note_en: "Includes 10 NFC stands",
      setup_note_he: "כולל 10 מעמדי NFC",
      cta_en: "Choose Premium",
      cta_he: "בחירת פרימיום",
      recommended: true,
      features: [
        { en: "Everything in Basic", he: "כל מה שכלול בבסיסי" },
        { en: "Multiple users", he: "מספר משתמשים" },
        { en: "Multiple menu languages", he: "מספר שפות בתפריט" },
        { en: "AI Assistant", he: "עוזר AI" },
        { en: "Menu analytics", he: "אנליטיקות לתפריט" },
        { en: "QR + NFC support", he: "תמיכה ב-QR + NFC" },
      ],
    },
  ],
};

function text(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeFeature(feature) {
  if (typeof feature === "string") {
    return { en: feature, he: feature };
  }

  return {
    en: text(feature?.en),
    he: text(feature?.he, text(feature?.en)),
  };
}

export function normalizeMenuPricing(value) {
  const source = value && typeof value === "object" ? value : {};
  const sourcePlans = Array.isArray(source.plans) ? source.plans : [];

  const plans = DEFAULT_MENU_PRICING.plans.map((fallbackPlan, index) => {
    const candidate =
      sourcePlans.find((plan) => plan?.id === fallbackPlan.id) ||
      sourcePlans[index] ||
      {};

    const candidateFeatures = Array.isArray(candidate.features)
      ? candidate.features.map(normalizeFeature).filter((feature) => feature.en || feature.he)
      : fallbackPlan.features;

    return {
      ...fallbackPlan,
      ...candidate,
      id: fallbackPlan.id,
      name_en: text(candidate.name_en, fallbackPlan.name_en),
      name_he: text(candidate.name_he, fallbackPlan.name_he),
      description_en: text(candidate.description_en, fallbackPlan.description_en),
      description_he: text(candidate.description_he, fallbackPlan.description_he),
      price: text(candidate.price, fallbackPlan.price),
      period_en: text(candidate.period_en, fallbackPlan.period_en),
      period_he: text(candidate.period_he, fallbackPlan.period_he),
      setup_fee: text(candidate.setup_fee, fallbackPlan.setup_fee),
      setup_note_en: text(candidate.setup_note_en, fallbackPlan.setup_note_en),
      setup_note_he: text(candidate.setup_note_he, fallbackPlan.setup_note_he),
      cta_en: text(candidate.cta_en, fallbackPlan.cta_en),
      cta_he: text(candidate.cta_he, fallbackPlan.cta_he),
      recommended: Boolean(candidate.recommended),
      features: candidateFeatures.length ? candidateFeatures : fallbackPlan.features,
    };
  });

  return {
    headline_en: text(source.headline_en, DEFAULT_MENU_PRICING.headline_en),
    headline_he: text(source.headline_he, DEFAULT_MENU_PRICING.headline_he),
    subheadline_en: text(source.subheadline_en, DEFAULT_MENU_PRICING.subheadline_en),
    subheadline_he: text(source.subheadline_he, DEFAULT_MENU_PRICING.subheadline_he),
    plans,
  };
}

export function parseMenuPricing(value) {
  if (!value) return normalizeMenuPricing(null);

  try {
    return normalizeMenuPricing(typeof value === "string" ? JSON.parse(value) : value);
  } catch (error) {
    console.error("Unable to parse menu pricing settings:", error);
    return normalizeMenuPricing(null);
  }
}
