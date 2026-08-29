const PHOTO_PROFILES = Object.freeze({
  "clean-bright-v1": Object.freeze({
    id: "clean-bright-v1",
    label: { en: "Clean bright", he: "בהיר ונקי", ar: "مشرق ونظيف" },
    description: { en: "Airy natural light with clean whites.", he: "אור טבעי נקי ובהיר.", ar: "إضاءة طبيعية مشرقة ودرجات بيضاء نظيفة." },
    grade: { brightness: 1.055, contrast: 1.045, saturation: 0.99, sepia: 0, hue: 0, warmth: 0.018, vignette: 0.015 },
  }),
  "warm-classic-v1": Object.freeze({
    id: "warm-classic-v1",
    label: { en: "Warm classic", he: "קלאסי וחם", ar: "كلاسيكي ودافئ" },
    description: { en: "Warm hospitality tones with refined contrast.", he: "גוונים חמים של אירוח עם ניגודיות מעודנת.", ar: "درجات ضيافة دافئة مع تباين أنيق." },
    grade: { brightness: 1.015, contrast: 1.085, saturation: 1.045, sepia: 0.035, hue: -2, warmth: 0.045, vignette: 0.055 },
  }),
  "dark-cinematic-v1": Object.freeze({
    id: "dark-cinematic-v1",
    label: { en: "Dark cinematic", he: "קולנועי כהה", ar: "سينمائي داكن" },
    description: { en: "Deeper shadows and dramatic food contrast.", he: "צללים עמוקים וניגודיות דרמטית לאוכל.", ar: "ظلال أعمق وتباين درامي للطعام." },
    grade: { brightness: 0.955, contrast: 1.16, saturation: 0.97, sepia: 0.025, hue: -2, warmth: 0.035, vignette: 0.15 },
  }),
  "editorial-soft-v1": Object.freeze({
    id: "editorial-soft-v1",
    label: { en: "Editorial soft", he: "עריכתי רך", ar: "تحريري ناعم" },
    description: { en: "Soft premium highlights with magazine polish.", he: "אור רך ומלוטש בסגנון מגזין.", ar: "إضاءة ناعمة ولمسة تحريرية فاخرة." },
    grade: { brightness: 1.045, contrast: 1.045, saturation: 1.01, sepia: 0.018, hue: 0, warmth: 0.022, vignette: 0.035 },
  }),
  "luxury-muted-v1": Object.freeze({
    id: "luxury-muted-v1",
    label: { en: "Luxury muted", he: "יוקרתי ומעודן", ar: "فاخر وهادئ" },
    description: { en: "Controlled color with deep, elegant contrast.", he: "צבע מבוקר עם ניגודיות עמוקה ואלגנטית.", ar: "ألوان هادئة مع تباين عميق وأنيق." },
    grade: { brightness: 0.985, contrast: 1.105, saturation: 0.9, sepia: 0.018, hue: 0, warmth: 0.018, vignette: 0.09 },
  }),
  "fresh-vibrant-v1": Object.freeze({
    id: "fresh-vibrant-v1",
    label: { en: "Fresh vibrant", he: "רענן וחי", ar: "منعش وحيوي" },
    description: { en: "Fresh color and appetizing natural energy.", he: "צבע רענן וחיוניות טבעית ומעוררת תיאבון.", ar: "ألوان منعشة وحيوية طبيعية شهية." },
    grade: { brightness: 1.035, contrast: 1.065, saturation: 1.115, sepia: 0, hue: 0, warmth: 0.012, vignette: 0.025 },
  }),
});

const PRESENTATION_TO_PROFILE = Object.freeze({
  "heritage-classic": "warm-classic-v1",
  brasserie: "warm-classic-v1",
  "trattoria-ledger": "warm-classic-v1",
  "desert-arches": "warm-classic-v1",
  "levant-table": "warm-classic-v1",
  "wine-register": "warm-classic-v1",

  "nordic-paper": "clean-bright-v1",
  "white-gallery": "clean-bright-v1",
  omakase: "clean-bright-v1",
  "bakery-counter": "clean-bright-v1",
  "blue-launcher": "clean-bright-v1",
  "beyond-launcher": "clean-bright-v1",

  "noir-gallery": "dark-cinematic-v1",
  "seoul-night": "dark-cinematic-v1",
  "smokehouse-story": "dark-cinematic-v1",
  "luxury-steak": "dark-cinematic-v1",
  "neon-dock": "dark-cinematic-v1",

  atelier: "editorial-soft-v1",
  patisserie: "editorial-soft-v1",
  "dessert-magazine": "editorial-soft-v1",
  "tapas-collage": "editorial-soft-v1",
  "brunch-polaroids": "editorial-soft-v1",
  "cafe-cards": "editorial-soft-v1",

  "chef-editorial": "luxury-muted-v1",
  "tokyo-ink": "luxury-muted-v1",
  "butcher-ledger": "luxury-muted-v1",
  "monochrome-grid": "luxury-muted-v1",
  "tap-board": "luxury-muted-v1",

  riviera: "fresh-vibrant-v1",
  "coastal-story": "fresh-vibrant-v1",
  "coastal-gallery": "fresh-vibrant-v1",
  "garden-journal": "fresh-vibrant-v1",
  botanical: "fresh-vibrant-v1",
  "tropical-club": "fresh-vibrant-v1",
  "breakfast-board": "fresh-vibrant-v1",
  mosaic: "fresh-vibrant-v1",
  "family-pizzeria": "fresh-vibrant-v1",
  "street-poster": "fresh-vibrant-v1",
  "rose-lounge": "fresh-vibrant-v1",
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

  if (/smoke|steak|noir|night|neon|cinema/.test(presentation)) return "dark-cinematic-v1";
  if (/dessert|magazine|editorial|atelier|patisserie|photo|polaroid/.test(presentation)) return "editorial-soft-v1";
  if (/garden|coastal|tropical|riviera|breakfast|mosaic|pizza|street/.test(presentation)) return "fresh-vibrant-v1";
  if (/nordic|white|minimal|launcher|grid/.test(presentation)) return "clean-bright-v1";
  if (/wine|heritage|brasserie|ledger|levant|desert/.test(presentation)) return "warm-classic-v1";

  const luminance = hexLuminance(design?.theme?.background);
  if (luminance !== null && luminance < 0.12) return "luxury-muted-v1";
  return "clean-bright-v1";
}

export function resolveMenuPhotoProfile(design = {}) {
  const id = inferredProfileId(design);
  return PHOTO_PROFILES[id] || PHOTO_PROFILES["clean-bright-v1"];
}

export function getMenuPhotoProfile(profileId) {
  return PHOTO_PROFILES[profileId] || PHOTO_PROFILES["clean-bright-v1"];
}

export function menuPhotoProfileLabel(profile, language = "en") {
  return profile?.label?.[language] || profile?.label?.en || "Theme match";
}

export function menuPhotoProfileDescription(profile, language = "en") {
  return profile?.description?.[language] || profile?.description?.en || "Tuned to the current menu design.";
}

export { PHOTO_PROFILES };
