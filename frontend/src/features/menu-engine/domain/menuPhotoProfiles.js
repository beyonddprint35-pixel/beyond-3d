const PHOTO_PROFILES = Object.freeze({
  "clean-bright-v2": Object.freeze({
    id: "clean-bright-v2",
    label: { en: "Clean bright", he: "בהיר ונקי", ar: "مشرق ونظيف" },
    description: { en: "Airy natural light with clean whites and protected highlights.", he: "אור טבעי נקי ובהיר עם שמירה על אזורים בהירים.", ar: "إضاءة طبيعية مشرقة ودرجات بيضاء نظيفة مع حماية الإضاءات العالية." },
    grade: { brightness: 1.055, contrast: 1.045, saturation: 0.99, sepia: 0, hue: 0, warmth: 0.018, vignette: 0.015 },
  }),
  "warm-classic-v2": Object.freeze({
    id: "warm-classic-v2",
    label: { en: "Warm classic", he: "קלאסי וחם", ar: "كلاسيكي ودافئ" },
    description: { en: "Warm hospitality tones with refined contrast and natural food color.", he: "גווני אירוח חמים עם ניגודיות מעודנת וצבע מזון טבעי.", ar: "درجات ضيافة دافئة مع تباين أنيق وألوان طعام طبيعية." },
    grade: { brightness: 1.015, contrast: 1.085, saturation: 1.045, sepia: 0.035, hue: -2, warmth: 0.045, vignette: 0.055 },
  }),
  "dark-cinematic-v2": Object.freeze({
    id: "dark-cinematic-v2",
    label: { en: "Dark cinematic", he: "קולנועי כהה", ar: "سينمائي داكن" },
    description: { en: "Deep cinematic contrast with controlled shadows and preserved food detail.", he: "ניגודיות קולנועית עמוקה עם צללים מבוקרים ושמירה על פרטי המנה.", ar: "تباين سينمائي عميق مع ظلال مضبوطة والحفاظ على تفاصيل الطعام." },
    grade: { brightness: 0.955, contrast: 1.16, saturation: 0.97, sepia: 0.025, hue: -2, warmth: 0.035, vignette: 0.15 },
  }),
  "editorial-soft-v2": Object.freeze({
    id: "editorial-soft-v2",
    label: { en: "Editorial soft", he: "עריכתי רך", ar: "تحريري ناعم" },
    description: { en: "Soft premium highlights with balanced magazine polish.", he: "אור רך ומלוטש עם איזון בסגנון מגזין.", ar: "إضاءة ناعمة ولمسة تحريرية فاخرة ومتوازنة." },
    grade: { brightness: 1.045, contrast: 1.045, saturation: 1.01, sepia: 0.018, hue: 0, warmth: 0.022, vignette: 0.035 },
  }),
  "luxury-muted-v2": Object.freeze({
    id: "luxury-muted-v2",
    label: { en: "Luxury muted", he: "יוקרתי ומעודן", ar: "فاخر وهادئ" },
    description: { en: "Controlled color with deep elegant contrast and clean neutral balance.", he: "צבע מבוקר עם ניגודיות עמוקה ואלגנטית ואיזון נקי.", ar: "ألوان هادئة مع تباين عميق وأنيق وتوازن لوني نظيف." },
    grade: { brightness: 0.985, contrast: 1.105, saturation: 0.9, sepia: 0.018, hue: 0, warmth: 0.018, vignette: 0.09 },
  }),
  "fresh-vibrant-v2": Object.freeze({
    id: "fresh-vibrant-v2",
    label: { en: "Fresh vibrant", he: "רענן וחי", ar: "منعش وحيوي" },
    description: { en: "Fresh appetizing color with protected highlights and natural energy.", he: "צבע רענן ומעורר תיאבון עם שמירה על האור וחיוניות טבעית.", ar: "ألوان منعشة وشهية مع حماية الإضاءات وحيوية طبيعية." },
    grade: { brightness: 1.035, contrast: 1.065, saturation: 1.115, sepia: 0, hue: 0, warmth: 0.012, vignette: 0.025 },
  }),
});

const PRESENTATION_TO_PROFILE = Object.freeze({
  "heritage-classic": "warm-classic-v2",
  brasserie: "warm-classic-v2",
  "trattoria-ledger": "warm-classic-v2",
  "desert-arches": "warm-classic-v2",
  "levant-table": "warm-classic-v2",
  "wine-register": "warm-classic-v2",

  "nordic-paper": "clean-bright-v2",
  "white-gallery": "clean-bright-v2",
  omakase: "clean-bright-v2",
  "bakery-counter": "clean-bright-v2",
  "blue-launcher": "clean-bright-v2",
  "beyond-launcher": "clean-bright-v2",

  "noir-gallery": "dark-cinematic-v2",
  "seoul-night": "dark-cinematic-v2",
  "smokehouse-story": "dark-cinematic-v2",
  "luxury-steak": "dark-cinematic-v2",
  "neon-dock": "dark-cinematic-v2",

  atelier: "editorial-soft-v2",
  patisserie: "editorial-soft-v2",
  "dessert-magazine": "editorial-soft-v2",
  "tapas-collage": "editorial-soft-v2",
  "brunch-polaroids": "editorial-soft-v2",
  "cafe-cards": "editorial-soft-v2",

  "chef-editorial": "luxury-muted-v2",
  "tokyo-ink": "luxury-muted-v2",
  "butcher-ledger": "luxury-muted-v2",
  "monochrome-grid": "luxury-muted-v2",
  "tap-board": "luxury-muted-v2",

  riviera: "fresh-vibrant-v2",
  "coastal-story": "fresh-vibrant-v2",
  "coastal-gallery": "fresh-vibrant-v2",
  "garden-journal": "fresh-vibrant-v2",
  botanical: "fresh-vibrant-v2",
  "tropical-club": "fresh-vibrant-v2",
  "breakfast-board": "fresh-vibrant-v2",
  mosaic: "fresh-vibrant-v2",
  "family-pizzeria": "fresh-vibrant-v2",
  "street-poster": "fresh-vibrant-v2",
  "rose-lounge": "fresh-vibrant-v2",
});

function hexLuminance(value) {
  const hex = String(value || "").replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function inferredProfileId(design = {}) {
  const presentation = String(design?.layout?.presentation || "").toLowerCase();
  if (PRESENTATION_TO_PROFILE[presentation]) return PRESENTATION_TO_PROFILE[presentation];

  if (/smoke|steak|noir|night|neon|cinema/.test(presentation)) return "dark-cinematic-v2";
  if (/dessert|magazine|editorial|atelier|patisserie|photo|polaroid/.test(presentation)) return "editorial-soft-v2";
  if (/garden|coastal|tropical|riviera|breakfast|mosaic|pizza|street/.test(presentation)) return "fresh-vibrant-v2";
  if (/nordic|white|minimal|launcher|grid/.test(presentation)) return "clean-bright-v2";
  if (/wine|heritage|brasserie|ledger|levant|desert/.test(presentation)) return "warm-classic-v2";

  const luminance = hexLuminance(design?.theme?.background);
  if (luminance !== null && luminance < 0.12) return "luxury-muted-v2";
  return "clean-bright-v2";
}

export function resolveMenuPhotoProfile(design = {}) {
  const id = inferredProfileId(design);
  return PHOTO_PROFILES[id] || PHOTO_PROFILES["clean-bright-v2"];
}

export function getMenuPhotoProfile(profileId) {
  return PHOTO_PROFILES[profileId] || PHOTO_PROFILES["clean-bright-v2"];
}

export function menuPhotoProfileLabel(profile, language = "en") {
  return profile?.label?.[language] || profile?.label?.en || "Theme match";
}

export function menuPhotoProfileDescription(profile, language = "en") {
  return profile?.description?.[language] || profile?.description?.en || "Tuned to the current menu design.";
}

export { PHOTO_PROFILES };
