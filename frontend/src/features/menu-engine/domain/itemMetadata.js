export const MENU_ALLERGENS = Object.freeze([
  "gluten","milk","eggs","peanuts","tree_nuts","soy","sesame","fish","shellfish","mustard","celery","sulfites"
]);

export const MENU_DIETARY_BADGES = Object.freeze([
  "vegan","vegetarian","gluten_free","lactose_free"
]);

export const MENU_MERCHANDISING_BADGES = Object.freeze([
  "chefs_choice","popular","signature","new","recommended","limited"
]);

export const MENU_SPICE_LEVELS = Object.freeze(["none","mild","medium","hot","very_hot"]);

export const BADGE_LABELS = Object.freeze({
  gluten: { en: "Gluten", he: "גלוטן", ar: "غلوتين" },
  milk: { en: "Milk", he: "חלב", ar: "حليب" },
  eggs: { en: "Eggs", he: "ביצים", ar: "بيض" },
  peanuts: { en: "Peanuts", he: "בוטנים", ar: "فول سوداني" },
  tree_nuts: { en: "Tree nuts", he: "אגוזים", ar: "مكسرات" },
  soy: { en: "Soy", he: "סויה", ar: "صويا" },
  sesame: { en: "Sesame", he: "שומשום", ar: "سمسم" },
  fish: { en: "Fish", he: "דגים", ar: "سمك" },
  shellfish: { en: "Shellfish", he: "פירות ים", ar: "محار" },
  mustard: { en: "Mustard", he: "חרדל", ar: "خردل" },
  celery: { en: "Celery", he: "סלרי", ar: "كرفس" },
  sulfites: { en: "Sulfites", he: "סולפיטים", ar: "كبريتيت" },
  vegan: { en: "Vegan", he: "טבעוני", ar: "نباتي صرف" },
  vegetarian: { en: "Vegetarian", he: "צמחוני", ar: "نباتي" },
  gluten_free: { en: "Gluten free", he: "ללא גלוטן", ar: "خالٍ من الغلوتين" },
  lactose_free: { en: "Lactose free", he: "ללא לקטוז", ar: "خالٍ من اللاكتوز" },
  chefs_choice: { en: "Chef’s Choice", he: "בחירת השף", ar: "اختيار الشيف" },
  popular: { en: "Popular", he: "פופולרי", ar: "الأكثر طلبًا" },
  signature: { en: "Signature", he: "מנת הדגל", ar: "طبق مميز" },
  new: { en: "New", he: "חדש", ar: "جديد" },
  recommended: { en: "Recommended", he: "מומלץ", ar: "موصى به" },
  limited: { en: "Limited", he: "לזמן מוגבל", ar: "لفترة محدودة" },
  mild: { en: "Mild", he: "מעט חריף", ar: "حار خفيف" },
  medium: { en: "Medium spicy", he: "חריף", ar: "حار متوسط" },
  hot: { en: "Hot", he: "חריף מאוד", ar: "حار" },
  very_hot: { en: "Very hot", he: "חריף במיוחד", ar: "حار جدًا" },
});

export function normalizeItemMetadata(value = {}) {
  const allergens = Array.isArray(value.allergens)
    ? value.allergens.filter(key => MENU_ALLERGENS.includes(key))
    : [];
  const dietary = Array.isArray(value.dietary)
    ? value.dietary.filter(key => MENU_DIETARY_BADGES.includes(key))
    : [];
  const merchandising = Array.isArray(value.merchandising)
    ? value.merchandising.filter(key => MENU_MERCHANDISING_BADGES.includes(key))
    : [];
  const spice = MENU_SPICE_LEVELS.includes(value.spice) ? value.spice : "none";

  return {
    allergens: [...new Set(allergens)],
    dietary: [...new Set(dietary)],
    merchandising: [...new Set(merchandising)],
    spice,
    aiSuggestions: Array.isArray(value.aiSuggestions) ? value.aiSuggestions : [],
    reviewedByOwner: Boolean(value.reviewedByOwner),
  };
}
