export const DEFAULT_MENU_PRICING = {
  headline_en: "Simple, transparent pricing.",
  headline_he: "מחירים פשוטים ושקופים.",
  subheadline_en: "Start simple and upgrade when your restaurant needs more.",
  subheadline_he: "מתחילים פשוט ומשדרגים כשהעסק צריך יותר.",
  plans: [
    {
      id: "basic",
      name_en: "Basic",
      name_he: "בסיסי",
      description_en: "Everything you need to launch your first digital menu.",
      description_he: "כל מה שצריך כדי להעלות את התפריט הדיגיטלי הראשון שלכם.",
      price: "₪0",
      period_en: "/ forever",
      period_he: "/ לתמיד",
      cta_en: "Create My Menu Free",
      cta_he: "יצירת תפריט בחינם",
      recommended: false,
      features: [
        { en: "1 active digital menu", he: "תפריט דיגיטלי פעיל אחד" },
        { en: "Menu Studio editing", he: "עריכה ב-Menu Studio" },
        { en: "Live customer preview", he: "תצוגה חיה ללקוח" },
        { en: "QR menu access", he: "פתיחת התפריט באמצעות QR" },
      ],
    },
    {
      id: "premium",
      name_en: "Premium",
      name_he: "פרימיום",
      description_en: "For restaurants that want more flexibility and a premium table experience.",
      description_he: "למסעדות שרוצות יותר גמישות וחוויית שולחן מתקדמת.",
      price: "₪49",
      period_en: "/ month",
      period_he: "/ חודש",
      cta_en: "Choose Premium",
      cta_he: "בחירת פרימיום",
      recommended: true,
      features: [
        { en: "Everything in Basic", he: "כל מה שכלול בבסיסי" },
        { en: "QR + NFC stand support", he: "תמיכה במעמדי QR + NFC" },
        { en: "Multiple languages", he: "מספר שפות" },
        { en: "Custom menu branding", he: "מיתוג מותאם לתפריט" },
        { en: "Priority support", he: "תמיכה בעדיפות" },
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
