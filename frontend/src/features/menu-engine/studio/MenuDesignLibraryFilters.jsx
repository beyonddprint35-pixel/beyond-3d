import "./MenuDesignLibraryFilters.css";

const PRESENTATION_EXPERIENCES = new Set([
  "category-covers",
  "bottom-tabs",
  "magazine",
  "cocktail-cards",
  "photo-story",
  "minimal-grid",
  "launcher",
]);

const PHOTO_PRESENTATIONS = new Set(["magazine", "cocktail-cards", "photo-story"]);
const PHOTO_TEMPLATES = new Set(["visual", "gallery", "tiles", "split"]);
const MOBILE_PRESENTATIONS = new Set(["category-covers", "bottom-tabs", "launcher"]);

const copy = {
  en: {
    browse: "Browse",
    all: "All",
    photos: "Photos",
    text: "Text-first",
    mobile: "Mobile-first",
    minimal: "Minimal",
    type: "Restaurant type",
    layout: "Layout",
    tone: "Tone",
    allTypes: "All types",
    dining: "Dining",
    fineDining: "Fine dining",
    bar: "Bar & drinks",
    cafe: "Café & brunch",
    casual: "Casual",
    world: "World cuisine",
    allLayouts: "All layouts",
    classic: "Classic",
    editorial: "Editorial",
    ledger: "Ledger",
    split: "Split",
    gallery: "Gallery",
    tiles: "Tiles",
    experience: "Experience",
    allTones: "All tones",
    light: "Light",
    dark: "Dark",
    showing: "Showing",
    designs: "designs",
  },
  he: {
    browse: "סינון מהיר",
    all: "הכול",
    photos: "עם תמונות",
    text: "טקסטואלי",
    mobile: "מובייל",
    minimal: "מינימלי",
    type: "סוג מסעדה",
    layout: "פריסה",
    tone: "סגנון צבע",
    allTypes: "כל הסוגים",
    dining: "מסעדה",
    fineDining: "פיין דיינינג",
    bar: "בר ומשקאות",
    cafe: "קפה ובראנץ׳",
    casual: "קז׳ואל",
    world: "מטבח עולמי",
    allLayouts: "כל הפריסות",
    classic: "קלאסי",
    editorial: "אדיטוריאלי",
    ledger: "רשימתי",
    split: "מפוצל",
    gallery: "גלריה",
    tiles: "אריחים",
    experience: "חווייתי",
    allTones: "כל הצבעים",
    light: "בהיר",
    dark: "כהה",
    showing: "מציג",
    designs: "עיצובים",
  },
  ar: {
    browse: "تصفية سريعة",
    all: "الكل",
    photos: "صور",
    text: "نصي",
    mobile: "للموبايل",
    minimal: "بسيط",
    type: "نوع المطعم",
    layout: "التخطيط",
    tone: "النمط اللوني",
    allTypes: "كل الأنواع",
    dining: "مطعم",
    fineDining: "مطعم راقٍ",
    bar: "بار ومشروبات",
    cafe: "مقهى وفطور",
    casual: "كاجوال",
    world: "مطابخ عالمية",
    allLayouts: "كل التخطيطات",
    classic: "كلاسيكي",
    editorial: "تحريري",
    ledger: "قائمة",
    split: "منقسم",
    gallery: "معرض",
    tiles: "بلاطات",
    experience: "تجربة",
    allTones: "كل الألوان",
    light: "فاتح",
    dark: "داكن",
    showing: "يعرض",
    designs: "تصميماً",
  },
};

function searchable(entry) {
  return [entry.name, entry.category, entry.layout, entry.description, ...(entry.tags || [])]
    .join(" ")
    .toLowerCase();
}

function presentationOf(entry) {
  return entry.design?.layout?.presentation || "standard";
}

function hasPhotos(entry) {
  return PHOTO_TEMPLATES.has(entry.design?.template) || PHOTO_PRESENTATIONS.has(presentationOf(entry));
}

function isMobileFirst(entry) {
  return MOBILE_PRESENTATIONS.has(presentationOf(entry)) || searchable(entry).includes("mobile");
}

function isMinimal(entry) {
  const text = searchable(entry);
  return presentationOf(entry) === "minimal-grid" || entry.design?.template === "editorial" || text.includes("minimal") || text.includes("clean");
}

function hexBrightness(hex) {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return 255;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function toneOf(entry) {
  return hexBrightness(entry.design?.theme?.background || entry.swatches?.[0]) < 120 ? "dark" : "light";
}

function typeMatches(entry, type) {
  if (type === "all") return true;
  const text = searchable(entry);
  const has = (...terms) => terms.some((term) => text.includes(term));
  if (type === "fine") return has("fine dining", "luxury", "chef", "omakase", "tasting");
  if (type === "bar") return has("bar", "cocktail", "wine", "beer", "taproom", "spirits", "night");
  if (type === "cafe") return has("cafe", "café", "brunch", "breakfast", "bakery", "pastry", "dessert");
  if (type === "casual") return has("casual", "street", "pizza", "burger", "family", "fast");
  if (type === "world") return has("japanese", "korean", "italian", "levant", "mediterranean", "middle eastern", "tapas", "coastal");
  if (type === "dining") return !typeMatches(entry, "bar") && !typeMatches(entry, "cafe");
  return true;
}

function layoutMatches(entry, layout) {
  if (layout === "all") return true;
  const presentation = presentationOf(entry);
  if (layout === "experience") return PRESENTATION_EXPERIENCES.has(presentation);
  return entry.design?.template === layout;
}

export function filterMenuDesigns(designs, filters) {
  const query = String(filters.query || "").trim().toLowerCase();
  return designs.filter((entry) => {
    if (query && !searchable(entry).includes(query)) return false;
    if (filters.browse === "photos" && !hasPhotos(entry)) return false;
    if (filters.browse === "text" && hasPhotos(entry)) return false;
    if (filters.browse === "mobile" && !isMobileFirst(entry)) return false;
    if (filters.browse === "minimal" && !isMinimal(entry)) return false;
    if (!typeMatches(entry, filters.type)) return false;
    if (!layoutMatches(entry, filters.layout)) return false;
    if (filters.tone !== "all" && toneOf(entry) !== filters.tone) return false;
    return true;
  });
}

export default function MenuDesignLibraryFilters({ language = "en", filters, setFilters, resultCount, totalCount }) {
  const l = copy[language] || copy.en;
  const patch = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const browse = [
    ["all", l.all],
    ["photos", l.photos],
    ["text", l.text],
    ["mobile", l.mobile],
    ["minimal", l.minimal],
  ];

  return <div className="studio-v3-library-filters">
    <div className="studio-v3-library-filter-head">
      <strong>{l.browse}</strong>
      <span>{l.showing} <b>{resultCount}</b> / {totalCount} {l.designs}</span>
    </div>
    <div className="studio-v3-library-filter-chips">
      {browse.map(([value, label]) => <button type="button" key={value} className={filters.browse === value ? "active" : ""} onClick={() => patch("browse", value)}>{label}</button>)}
    </div>
    <div className="studio-v3-library-filter-selects">
      <label><span>{l.type}</span><select value={filters.type} onChange={(e) => patch("type", e.target.value)}><option value="all">{l.allTypes}</option><option value="dining">{l.dining}</option><option value="fine">{l.fineDining}</option><option value="bar">{l.bar}</option><option value="cafe">{l.cafe}</option><option value="casual">{l.casual}</option><option value="world">{l.world}</option></select></label>
      <label><span>{l.layout}</span><select value={filters.layout} onChange={(e) => patch("layout", e.target.value)}><option value="all">{l.allLayouts}</option><option value="classic">{l.classic}</option><option value="editorial">{l.editorial}</option><option value="ledger">{l.ledger}</option><option value="split">{l.split}</option><option value="gallery">{l.gallery}</option><option value="tiles">{l.tiles}</option><option value="experience">{l.experience}</option></select></label>
      <label><span>{l.tone}</span><select value={filters.tone} onChange={(e) => patch("tone", e.target.value)}><option value="all">{l.allTones}</option><option value="light">{l.light}</option><option value="dark">{l.dark}</option></select></label>
    </div>
  </div>;
}
