import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Camera,
  Check,
  ChevronDown,
  ImagePlus,
  Link2,
  LoaderCircle,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import {
  removeMenuItemImage,
  uploadMenuItemImage,
  validateMenuItemImage,
} from "../features/menu-engine/data/menuItemImageService";
import { enhanceMenuPhotoWithAi, getRestaurantScenePresets } from "../features/menu-engine/data/menuPhotoAiService";
import {
  readMenuStudioV2Draft,
  resolveMenuStudioV2Design,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import "./MenuContentImageEditor.css";
import "./MenuContentImageEditorStyleMemory.css";
import "./MenuContentImageStyleMatch.css";
import "./MenuContentPhotoStyle.css";

const PHOTO_COPY = {
  en: {
    title: "Photo",
    hint: "Upload a real photo and use it as-is. Beyond AI enhancement is optional.",
    take: "Take photo", takeHint: "Open camera", choose: "Choose from phone", chooseHint: "Photo library",
    replace: "Replace photo", ready: "Photo added", done: "AI enhanced",
    prepare: "Enhance with Beyond AI", prepareHint: "Clean, improve or match a saved restaurant scene — while preserving the real item.",
    studioTitle: "Beyond AI Photo Studio", studioHint: "Keep the real item, then place it naturally inside this restaurant's visual world.",
    enhance: "Enhance photo", enhanceHint: "Fix light, color and clarity",
    background: "Clean background", backgroundHint: "Remove surrounding distractions",
    match: "Match restaurant scene", matchHint: "Use Scene 1 or Scene 2 created from My Place",
    recommended: "Recommended", foodLock: "Item Lock ON",
    foodLockHint: "AI is instructed to preserve the exact dish or drink, its container, ingredients and portion.",
    sceneTitle: "Choose restaurant scene",
    sceneHint: "One selected scene = one generated photo. Each scene follows the My Place photos chosen by the restaurant.",
    autoScene: "Auto", autoSceneHint: "Use the first available saved scene",
    scene1: "Scene 1", scene1Hint: "Reusable restaurant setup 1",
    scene2: "Scene 2", scene2Hint: "Reusable restaurant setup 2",
    noScenes: "No reusable scenes yet. Create Scene 1 or Scene 2 in Design → My Place, or use Auto to fall back to your place photos.",
    loadingScenes: "Loading restaurant scenes…",
    generate: "Match this photo", preview: "Create AI preview", generating: "Matching your photo to this restaurant scene…",
    generatingHint: "Beyond is preserving the real item and the selected restaurant background.",
    before: "Original", after: "Styled photo", compare: "Compare",
    enhancedView: "Enhanced photo", regenerate: "Try again", createAnother: "Create another option", usePhoto: "Use this photo", saving: "Saving photo…", cancel: "Cancel",
    optionsTitle: "Created options", optionsHint: "Every AI result is kept. Choose the one you want to use.", optionLabel: "Option",
    advancedAi: "Create a new photo with AI instead", advancedAiHint: "Only use this when you do not have a real photo of the item.",
  },
  he: {
    title: "תמונה", hint: "העלו תמונה אמיתית והשתמשו בה כפי שהיא. השיפור עם Beyond AI הוא אופציונלי.",
    take: "צילום עכשיו", takeHint: "פתיחת המצלמה", choose: "בחירה מהטלפון", chooseHint: "ספריית התמונות",
    replace: "החלפת תמונה", ready: "התמונה נוספה", done: "שופרה עם AI",
    prepare: "שיפור עם Beyond AI", prepareHint: "ניקוי, שיפור או התאמה לסצנת מסעדה שמורה — תוך שמירה על הפריט האמיתי.",
    studioTitle: "סטודיו התמונות של Beyond AI", studioHint: "שומרים על הפריט האמיתי וממקמים אותו באופן טבעי בעולם החזותי של המסעדה.",
    enhance: "שיפור התמונה", enhanceHint: "תאורה, צבע וחדות",
    background: "ניקוי הרקע", backgroundHint: "הסרת הסחות מסביב לפריט",
    match: "התאמה לסצנת המסעדה", matchHint: "שימוש בסצנה 1 או סצנה 2 שנוצרו מהמקום שלי",
    recommended: "מומלץ", foodLock: "נעילת פריט פעילה",
    foodLockHint: "ה-AI מונחה לשמור על אותה מנה או משקה, הכלי, המרכיבים והכמות.",
    sceneTitle: "בחירת סצנת מסעדה",
    sceneHint: "סצנה אחת שנבחרה = תמונה אחת שנוצרת. כל סצנה עוקבת אחר תמונות המקום שבחרה המסעדה.",
    autoScene: "אוטומטי", autoSceneHint: "שימוש בסצנה השמורה הראשונה שזמינה",
    scene1: "סצנה 1", scene1Hint: "סט מסעדה לשימוש חוזר 1",
    scene2: "סצנה 2", scene2Hint: "סט מסעדה לשימוש חוזר 2",
    noScenes: "עדיין אין סצנות לשימוש חוזר. צרו סצנה 1 או סצנה 2 בעיצוב ← המקום שלי, או השתמשו באוטומטי כדי להסתמך על תמונות המקום.",
    loadingScenes: "טוען סצנות מסעדה…",
    generate: "התאמת התמונה", preview: "יצירת תצוגת AI", generating: "מתאימים את התמונה לסצנת המסעדה…",
    generatingHint: "Beyond שומר על הפריט האמיתי ועל רקע המסעדה שנבחר.",
    before: "מקור", after: "תמונה מעוצבת", compare: "השוואה",
    enhancedView: "תמונה משופרת", regenerate: "נסו שוב", createAnother: "יצירת אפשרות נוספת", usePhoto: "שימוש בתמונה", saving: "שומר את התמונה…", cancel: "ביטול",
    optionsTitle: "אפשרויות שנוצרו", optionsHint: "כל תוצאת AI נשמרת. בחרו את התמונה שבה תרצו להשתמש.", optionLabel: "אפשרות",
    advancedAi: "יצירת תמונה חדשה עם AI במקום", advancedAiHint: "רק כשאין תמונה אמיתית של הפריט.",
  },
  ar: {
    title: "صورة", hint: "ارفع صورة حقيقية واستخدمها كما هي. التحسين باستخدام Beyond AI اختياري.",
    take: "التقط صورة", takeHint: "فتح الكاميرا", choose: "اختر من الهاتف", chooseHint: "مكتبة الصور",
    replace: "استبدال الصورة", ready: "تمت إضافة الصورة", done: "محسّنة بالذكاء الاصطناعي",
    prepare: "تحسين باستخدام Beyond AI", prepareHint: "تنظيف أو تحسين أو مطابقة مشهد مطعم محفوظ مع الحفاظ على العنصر الحقيقي.",
    studioTitle: "استوديو صور Beyond AI", studioHint: "نحافظ على العنصر الحقيقي ونضعه بشكل طبيعي داخل العالم البصري للمطعم.",
    enhance: "تحسين الصورة", enhanceHint: "الإضاءة واللون والوضوح",
    background: "تنظيف الخلفية", backgroundHint: "إزالة المشتتات حول العنصر",
    match: "مطابقة مشهد المطعم", matchHint: "استخدم المشهد 1 أو المشهد 2 الذي تم إنشاؤه من مكاني",
    recommended: "موصى به", foodLock: "قفل العنصر مفعّل",
    foodLockHint: "الذكاء الاصطناعي موجه للحفاظ على نفس الطبق أو المشروب والوعاء والمكونات والكمية.",
    sceneTitle: "اختر مشهد المطعم",
    sceneHint: "مشهد واحد محدد = صورة واحدة. كل مشهد يتبع صور مكاني التي اختارها المطعم.",
    autoScene: "تلقائي", autoSceneHint: "استخدم أول مشهد محفوظ متاح",
    scene1: "المشهد 1", scene1Hint: "إعداد مطعم قابل لإعادة الاستخدام 1",
    scene2: "المشهد 2", scene2Hint: "إعداد مطعم قابل لإعادة الاستخدام 2",
    noScenes: "لا توجد مشاهد قابلة لإعادة الاستخدام بعد. أنشئ المشهد 1 أو المشهد 2 في التصميم ← مكاني، أو استخدم تلقائي للاعتماد على صور المكان.",
    loadingScenes: "جارٍ تحميل مشاهد المطعم…",
    generate: "مطابقة هذه الصورة", preview: "إنشاء معاينة AI", generating: "نطابق صورتك مع مشهد المطعم…",
    generatingHint: "يحافظ Beyond على العنصر الحقيقي وعلى خلفية المطعم المختارة.",
    before: "الأصل", after: "الصورة المنسقة", compare: "مقارنة",
    enhancedView: "الصورة المحسّنة", regenerate: "حاول مرة أخرى", createAnother: "إنشاء خيار آخر", usePhoto: "استخدم هذه الصورة", saving: "جارٍ حفظ الصورة…", cancel: "إلغاء",
    optionsTitle: "الخيارات التي تم إنشاؤها", optionsHint: "يتم الاحتفاظ بكل نتيجة من AI. اختر الصورة التي تريد استخدامها.", optionLabel: "خيار",
    advancedAi: "أنشئ صورة جديدة بالذكاء الاصطناعي", advancedAiHint: "استخدم هذا فقط عندما لا توجد صورة حقيقية للعنصر.",
  },
};

const PHOTO_STYLE_DEFAULT = { camera: "original", lighting: "restaurant", color: "restaurant", depth: "balanced" };
const PHOTO_STYLE_COPY = {
  en: {
    title: "Photo style", hint: "Choose the feeling. Beyond handles the photography details.", save: "Save as restaurant default", saved: "Restaurant default saved",
    advanced: "Advanced controls", advancedHint: "Camera, lighting, color and background depth", custom: "Custom settings",
    camera: "Camera", lighting: "Lighting", color: "Color", depth: "Background depth",
    cameraWarning: "Changing the camera angle on a real photo can require AI to reconstruct details that were not visible. Keep original is the safest choice.",
    presets: {
      restaurant: { label: "Match my restaurant", hint: "Follow the visual style of your restaurant", badge: "Recommended", icon: "✨" },
      bright: { label: "Bright & fresh", hint: "Clean daylight and natural color", icon: "☀️" },
      warm: { label: "Warm & cozy", hint: "Warm evening light and a softer background", icon: "🌅" },
      dark: { label: "Dark & premium", hint: "Moody contrast with a premium restaurant feel", icon: "🌙" },
      clean: { label: "Clean & minimal", hint: "Neutral light, natural color and crisp detail", icon: "🤍" },
    },
    options: {
      camera: { original: "Keep original", eye: "Eye level", threeQuarter: "45°", top: "Top-down" },
      lighting: { restaurant: "Match restaurant", warm: "Warm evening", natural: "Bright natural", neutral: "Neutral", dramatic: "Dramatic" },
      color: { restaurant: "Match restaurant", warm: "Warm", cool: "Cool", natural: "Natural", rich: "Rich" },
      depth: { balanced: "Balanced", sharp: "Sharp background", soft: "Soft background" },
    },
  },
  he: {
    title: "סגנון תמונה", hint: "בחרו את התחושה. Beyond מטפל בפרטי הצילום.", save: "שמירה כברירת מחדל למסעדה", saved: "ברירת המחדל נשמרה",
    advanced: "הגדרות מתקדמות", advancedHint: "זווית, תאורה, צבע ועומק רקע", custom: "הגדרות מותאמות",
    camera: "זווית צילום", lighting: "תאורה", color: "צבע", depth: "עומק רקע",
    cameraWarning: "שינוי זווית בתמונה אמיתית עלול לדרוש מה-AI להשלים פרטים שלא נראו. שמירת הזווית המקורית היא הבחירה הבטוחה ביותר.",
    presets: {
      restaurant: { label: "התאמה למסעדה שלי", hint: "שימוש בשפה החזותית של המסעדה", badge: "מומלץ", icon: "✨" },
      bright: { label: "בהיר ורענן", hint: "אור יום נקי וצבע טבעי", icon: "☀️" },
      warm: { label: "חם ונעים", hint: "תאורת ערב חמה ורקע רך יותר", icon: "🌅" },
      dark: { label: "כהה ויוקרתי", hint: "קונטרסט דרמטי ואווירת פרימיום", icon: "🌙" },
      clean: { label: "נקי ומינימלי", hint: "אור ניטרלי, צבע טבעי ופרטים חדים", icon: "🤍" },
    },
    options: {
      camera: { original: "מקורית", eye: "גובה העיניים", threeQuarter: "45°", top: "מלמעלה" },
      lighting: { restaurant: "התאמה למסעדה", warm: "ערב חם", natural: "אור טבעי", neutral: "ניטרלי", dramatic: "דרמטי" },
      color: { restaurant: "התאמה למסעדה", warm: "חם", cool: "קר", natural: "טבעי", rich: "עשיר" },
      depth: { balanced: "מאוזן", sharp: "רקע חד", soft: "רקע רך" },
    },
  },
  ar: {
    title: "أسلوب الصورة", hint: "اختر الإحساس، وBeyond يتولى تفاصيل التصوير.", save: "حفظ كإعداد افتراضي للمطعم", saved: "تم حفظ الإعداد الافتراضي",
    advanced: "إعدادات متقدمة", advancedHint: "الزاوية والإضاءة واللون وعمق الخلفية", custom: "إعدادات مخصصة",
    camera: "زاوية الكاميرا", lighting: "الإضاءة", color: "اللون", depth: "عمق الخلفية",
    cameraWarning: "تغيير زاوية صورة حقيقية قد يتطلب من الذكاء الاصطناعي إعادة بناء تفاصيل غير ظاهرة. الحفاظ على الزاوية الأصلية هو الخيار الأكثر أماناً.",
    presets: {
      restaurant: { label: "مطابقة مطعمي", hint: "اتباع الأسلوب البصري للمطعم", badge: "موصى به", icon: "✨" },
      bright: { label: "مشرق ومنعش", hint: "ضوء نهاري نظيف وألوان طبيعية", icon: "☀️" },
      warm: { label: "دافئ ومريح", hint: "إضاءة مسائية دافئة وخلفية أنعم", icon: "🌅" },
      dark: { label: "داكن وفاخر", hint: "تباين درامي بطابع مطعم فاخر", icon: "🌙" },
      clean: { label: "نظيف وبسيط", hint: "إضاءة محايدة وألوان طبيعية وتفاصيل واضحة", icon: "🤍" },
    },
    options: {
      camera: { original: "الأصلية", eye: "مستوى العين", threeQuarter: "45°", top: "من الأعلى" },
      lighting: { restaurant: "مطابقة المطعم", warm: "مساء دافئ", natural: "طبيعي ساطع", neutral: "محايد", dramatic: "درامي" },
      color: { restaurant: "مطابقة المطعم", warm: "دافئ", cool: "بارد", natural: "طبيعي", rich: "غني" },
      depth: { balanced: "متوازن", sharp: "خلفية واضحة", soft: "خلفية ناعمة" },
    },
  },
};

const PHOTO_STYLE_VALUES = {
  camera: ["original", "eye", "threeQuarter", "top"],
  lighting: ["restaurant", "warm", "natural", "neutral", "dramatic"],
  color: ["restaurant", "warm", "cool", "natural", "rich"],
  depth: ["balanced", "sharp", "soft"],
};

const PHOTO_STYLE_PRESETS = {
  restaurant: { camera: "original", lighting: "restaurant", color: "restaurant", depth: "balanced" },
  bright: { camera: "original", lighting: "natural", color: "natural", depth: "balanced" },
  warm: { camera: "original", lighting: "warm", color: "warm", depth: "soft" },
  dark: { camera: "original", lighting: "dramatic", color: "rich", depth: "soft" },
  clean: { camera: "original", lighting: "neutral", color: "natural", depth: "sharp" },
};

const MODES = [
  { key: "enhance", icon: WandSparkles },
  { key: "background", icon: ImagePlus },
  { key: "match", icon: Sparkles },
];

function normalizePhotoStyle(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(PHOTO_STYLE_DEFAULT).map(([key, fallback]) => [key, PHOTO_STYLE_VALUES[key].includes(source[key]) ? source[key] : fallback]));
}

function photoStylePresetKey(value) {
  const style = normalizePhotoStyle(value);
  const match = Object.entries(PHOTO_STYLE_PRESETS).find(([, preset]) => Object.keys(PHOTO_STYLE_DEFAULT).every((key) => preset[key] === style[key]));
  return match?.[0] || "custom";
}

function normalizeAiOptions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((option) => option?.url && option?.path)
    .map((option, index) => ({
      id: String(option.id || option.path || `option-${index + 1}`),
      url: String(option.url || ""),
      path: String(option.path || ""),
      mode: ["enhance", "background", "match"].includes(option.mode) ? option.mode : "match",
      model: String(option.model || "gpt-image-2"),
      sceneType: ["auto", "scene1", "scene2"].includes(option.sceneType) ? option.sceneType : "auto",
      photoStyle: normalizePhotoStyle(option.photoStyle),
      createdAt: String(option.createdAt || ""),
    }));
}

function optionsFromItem(item) {
  const options = normalizeAiOptions(item?.image_ai_options);
  if (options.length) return options;
  if (item?.image_processed_url && item?.image_processed_path) {
    return [{
      id: `saved-${item.image_processed_path}`,
      url: item.image_processed_url,
      path: item.image_processed_path,
      mode: ["enhance", "background", "match"].includes(item.image_ai_mode) ? item.image_ai_mode : "match",
      model: item.image_ai_model || "gpt-image-2",
      sceneType: ["auto", "scene1", "scene2"].includes(item.image_ai_scene) ? item.image_ai_scene : "auto",
      photoStyle: normalizePhotoStyle(item.image_ai_style),
      createdAt: "",
    }];
  }
  return [];
}

function photoStyleTheme(style) {
  const next = normalizePhotoStyle(style);
  const camera = { original: "preserve original camera angle", eye: "eye-level camera angle", threeQuarter: "45 degree three-quarter camera angle", top: "top-down overhead camera angle" }[next.camera];
  const lighting = { restaurant: "match restaurant scene lighting", warm: "warm evening restaurant lighting", natural: "bright natural daylight", neutral: "neutral balanced studio lighting", dramatic: "dark cinematic low-key restaurant lighting with controlled highlights" }[next.lighting];
  const color = { restaurant: "match restaurant scene color palette", warm: "warm amber color grading", cool: "cool clean color grading", natural: "natural true-to-life color", rich: "rich premium color grading with deep blacks and restrained saturation" }[next.color];
  const depth = { balanced: "balanced depth of field", sharp: "sharp detailed background", soft: "soft blurred background bokeh" }[next.depth];
  return { photo_camera: camera, photo_lighting: lighting, photo_color: color, photo_depth: depth };
}

function currentMenuStyleContext(photoStyle) {
  const draft = readMenuStudioV2Draft();
  const menu = draft?.menu || {};
  let resolved = {};
  try { resolved = resolveMenuStudioV2Design(draft) || {}; } catch { resolved = {}; }
  const design = resolved.design || draft?.design || {};
  return {
    restaurantName: String(menu.restaurant_name || ""),
    designId: String(resolved.designId || ""),
    theme: { ...photoStyleTheme(photoStyle), ...(design?.theme || {}) },
  };
}

function currentRestaurantPhotoStyle() {
  return normalizePhotoStyle(readMenuStudioV2Draft()?.menu?.photo_style);
}

function itemDisplayName(item) {
  return String(item?.name || item?.name_en || item?.title || item?.name_he || item?.name_ar || "").trim();
}

export default function MenuContentImageEditor({ item, projectId = "draft", t = {}, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [mode, setMode] = useState("match");
  const [results, setResults] = useState(() => optionsFromItem(item));
  const [result, setResult] = useState(null);
  const [compareSide, setCompareSide] = useState("after");
  const [savedCompareSide, setSavedCompareSide] = useState("after");
  const [sceneType, setSceneType] = useState(["scene1", "scene2"].includes(item.image_ai_scene) ? item.image_ai_scene : "auto");
  const [photoStyle, setPhotoStyle] = useState(() => normalizePhotoStyle(item.image_ai_style || currentRestaurantPhotoStyle()));
  const [styleSaved, setStyleSaved] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [scenes, setScenes] = useState({ scene1: null, scene2: null });
  const [scenesLoading, setScenesLoading] = useState(false);
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  const language = ["en", "he", "ar"].includes(document.documentElement.lang) ? document.documentElement.lang : "en";
  const copy = PHOTO_COPY[language] || PHOTO_COPY.en;
  const styleCopy = PHOTO_STYLE_COPY[language] || PHOTO_STYLE_COPY.en;
  const sourceUrl = item.image_original_url || item.image_url || "";
  const sourcePath = item.image_original_path || item.image_path || "";
  const isAiReady = Boolean(item.image_ai_model || item.image_variant?.startsWith?.("ai-"));
  const hasSavedComparison = Boolean(isAiReady && item.image_original_url && item.image_url && item.image_original_url !== item.image_url);
  const visibleSavedUrl = savedCompareSide === "before" && hasSavedComparison ? item.image_original_url : item.image_url;
  const styleContext = currentMenuStyleContext(photoStyle);
  const selectedStylePreset = photoStylePresetKey(photoStyle);

  useEffect(() => {
    const nextOptions = optionsFromItem(item);
    setResults(nextOptions);
    setResult((current) => {
      if (current) {
        const same = nextOptions.find((option) => option.id === current.id || option.path === current.path);
        if (same) return same;
      }
      return nextOptions.find((option) => option.path === item.image_processed_path) || null;
    });
  }, [item.id]);

  useEffect(() => {
    let cancelled = false;
    if (!projectId || projectId === "draft") {
      setScenes({ scene1: null, scene2: null });
      return () => { cancelled = true; };
    }
    setScenesLoading(true);
    getRestaurantScenePresets({ projectId, sourcePath })
      .then((status) => {
        if (cancelled) return;
        setScenes(status.scenes || { scene1: null, scene2: null });
      })
      .catch(() => { if (!cancelled) setScenes({ scene1: null, scene2: null }); })
      .finally(() => { if (!cancelled) setScenesLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, sourcePath, studioOpen]);

  function clearResult() {
    setResult(null);
    setCompareSide("after");
  }

  function changePhotoStyle(key, value) {
    if (uploading || processing || saving) return;
    setPhotoStyle((current) => ({ ...current, [key]: value }));
    setStyleSaved(false);
  }

  function applyPhotoStylePreset(key) {
    if (uploading || processing || saving || !PHOTO_STYLE_PRESETS[key]) return;
    setPhotoStyle({ ...PHOTO_STYLE_PRESETS[key] });
    setStyleSaved(false);
  }

  function saveRestaurantPhotoStyle() {
    if (uploading || processing || saving) return;
    const flushDetail = { saved: true };
    window.dispatchEvent(new CustomEvent("beyond-menu-studio-flush-draft", { detail: flushDetail }));
    const draft = readMenuStudioV2Draft();
    if (!draft?.menu) return;
    const nextMenu = { ...draft.menu, photo_style: normalizePhotoStyle(photoStyle) };
    const nextDraft = { ...draft, menu: nextMenu };
    if (!writeMenuStudioV2Draft(nextDraft)) return;
    window.dispatchEvent(new CustomEvent("beyond-menu-translations-applied", { detail: { menu: nextMenu, profile: nextDraft.profile || {} } }));
    setStyleSaved(true);
  }

  async function uploadFile(file) {
    if (!file || uploading || processing || saving) return;
    const validation = validateMenuItemImage(file);
    if (validation) return setError(validation);
    setUploading(true);
    setError("");
    try {
      const previousPaths = [...new Set([
        item.image_path,
        item.image_original_path,
        item.image_processed_path,
        ...optionsFromItem(item).map((option) => option.path),
      ].filter(Boolean))];
      const uploaded = await uploadMenuItemImage({ file, itemId: item.id, projectId, previousPath: "" });
      for (const path of previousPaths) {
        if (path !== uploaded.image_path) await removeMenuItemImage(path).catch(() => {});
      }
      onChange?.({
        ...uploaded,
        image_original_url: uploaded.image_url,
        image_original_path: uploaded.image_path,
        image_processed_url: "",
        image_processed_path: "",
        image_variant: "",
        image_ai_model: "",
        image_ai_mode: "",
        image_ai_scene: "",
        image_ai_style: null,
        image_ai_options: [],
      });
      setResults([]);
      clearResult();
      setSavedCompareSide("after");
      setMode("match");
      setSceneType("auto");
      setPhotoStyle(currentRestaurantPhotoStyle());
      setStyleSaved(false);
      setAdvancedOpen(false);
      setStudioOpen(false);
    } catch (uploadError) {
      setError(uploadError?.message || t.imageUploadError || "Could not upload this photo.");
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (libraryInputRef.current) libraryInputRef.current.value = "";
    }
  }

  async function generatePreview() {
    if (!sourceUrl || processing) return;
    setProcessing(true);
    setError("");
    try {
      const ai = await enhanceMenuPhotoWithAi({
        sourceUrl,
        sourcePath,
        projectId,
        mode,
        itemId: item.id,
        itemName: itemDisplayName(item),
        styleContext,
        sceneType: mode === "match" ? sceneType : "auto",
        styleStrength: "balanced",
        variantIndex: results.length + 1,
      });
      const uploaded = await uploadMenuItemImage({
        file: ai.file,
        itemId: `${item.id}-ai-option`,
        projectId,
        previousPath: "",
      });
      const next = {
        id: uploaded.image_path || `${mode}-${Date.now()}`,
        url: uploaded.image_url,
        path: uploaded.image_path,
        mode: ai.mode || mode,
        model: ai.model || "gpt-image-2",
        sceneType: ai.sceneType || (mode === "match" ? sceneType : "auto"),
        photoStyle: normalizePhotoStyle(photoStyle),
        createdAt: new Date().toISOString(),
      };
      const nextResults = [...results, next];
      setResults(nextResults);
      setResult(next);
      setCompareSide("after");
      onChange?.({ image_ai_options: normalizeAiOptions(nextResults) });
    } catch (aiError) {
      setError(aiError?.message || "AI could not enhance this photo.");
    } finally {
      setProcessing(false);
    }
  }

  async function saveAiPhoto() {
    if (!result?.url || !result?.path || saving) return;
    setSaving(true);
    setError("");
    try {
      const selectedStyle = normalizePhotoStyle(result.photoStyle || photoStyle);
      onChange?.({
        image_url: result.url,
        image_path: result.path,
        image_original_url: sourceUrl,
        image_original_path: sourcePath,
        image_processed_url: result.url,
        image_processed_path: result.path,
        image_variant: result.mode === "match" ? "ai-scene-match" : `ai-${result.mode}`,
        image_ai_mode: result.mode,
        image_ai_model: result.model,
        image_ai_scene: result.sceneType || sceneType || "auto",
        image_ai_style: selectedStyle,
        image_ai_options: normalizeAiOptions(results),
      });
      setSavedCompareSide("after");
      setStudioOpen(false);
    } catch (saveError) {
      setError(saveError?.message || "Could not save the AI photo.");
    } finally {
      setSaving(false);
    }
  }

  async function removeImage() {
    setUploading(true);
    setError("");
    try {
      const paths = [...new Set([
        item.image_path,
        item.image_original_path,
        item.image_processed_path,
        ...optionsFromItem(item).map((option) => option.path),
      ].filter(Boolean))];
      for (const path of paths) await removeMenuItemImage(path).catch(() => {});
      onChange?.({ image_url: "", image_path: "", image_original_url: "", image_original_path: "", image_processed_url: "", image_processed_path: "", image_variant: "", image_ai_mode: "", image_ai_model: "", image_ai_scene: "", image_ai_style: null, image_ai_options: [] });
      setResults([]);
      clearResult();
      setSavedCompareSide("after");
      setStudioOpen(false);
    } catch (removeError) {
      setError(removeError?.message || t.imageRemoveError || "Could not remove this photo.");
    } finally {
      setUploading(false);
    }
  }

  function openAiPhotos() {
    const params = new URLSearchParams(window.location.search || "");
    params.set("item", item.id);
    window.location.assign(`/menu-studio/ai-images?${params.toString()}`);
  }

  function chooseResult(option) {
    if (!option || busy) return;
    setResult(option);
    setCompareSide("after");
    setMode(option.mode || "match");
    setSceneType(["auto", "scene1", "scene2"].includes(option.sceneType) ? option.sceneType : "auto");
    setPhotoStyle(normalizePhotoStyle(option.photoStyle || photoStyle));
    setStyleSaved(false);
  }

  function openStudio() {
    const options = optionsFromItem(item);
    const selected = options.find((option) => option.path === item.image_processed_path) || options[options.length - 1] || null;
    setResults(options);
    setResult(selected);
    setCompareSide("after");
    setMode(selected?.mode || (item.image_ai_mode === "strong" ? "match" : item.image_ai_mode || "match"));
    setSceneType(["auto", "scene1", "scene2"].includes(selected?.sceneType || item.image_ai_scene) ? (selected?.sceneType || item.image_ai_scene) : "auto");
    setPhotoStyle(normalizePhotoStyle(selected?.photoStyle || item.image_ai_style || currentRestaurantPhotoStyle()));
    setStyleSaved(false);
    setAdvancedOpen(false);
    setStudioOpen(true);
  }

  function selectScene(nextScene) {
    if (busy) return;
    setSceneType(nextScene);
  }

  const busy = uploading || processing || saving;
  const selectedPreviewUrl = result?.url || sourceUrl;
  const hasScenePresets = Boolean(scenes.scene1 || scenes.scene2);

  return (
    <div className="menu-content-v2-image-editor menu-content-v2-image-editor-friendly">
      <div className="menu-content-v2-image-editor-head">
        <div><strong>{copy.title}</strong><small>{copy.hint}</small></div>
        {item.image_url ? <button type="button" onClick={removeImage} disabled={busy}><Trash2 size={13} /> {t.removePhoto || "Remove"}</button> : null}
      </div>

      {item.image_url && !studioOpen ? (
        <div className="menu-content-v2-image-preview menu-content-v2-image-preview-friendly">
          <img src={visibleSavedUrl} alt="" />
          <div className={`menu-content-v2-photo-ready-badge ${isAiReady ? "is-finished" : ""}`}>
            {isAiReady ? <><Check size={10} /> {copy.done}</> : <>✓ {copy.ready}</>}
          </div>
          {hasSavedComparison ? (
            <div className="menu-content-v2-photo-saved-compare">
              <button type="button" className={savedCompareSide === "before" ? "active" : ""} onClick={() => setSavedCompareSide("before")}>{copy.before}</button>
              <button type="button" className={savedCompareSide === "after" ? "active" : ""} onClick={() => setSavedCompareSide("after")}><Sparkles size={10} /> {copy.enhancedView}</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {item.image_url && !studioOpen ? (
        <button type="button" className="menu-content-v2-photo-prepare" onClick={openStudio} disabled={busy}>
          <span className="menu-content-v2-photo-prepare-icon"><WandSparkles size={18} /></span>
          <span><strong>{copy.prepare}</strong><small>{copy.prepareHint}</small></span>
          <span className="menu-content-v2-photo-prepare-arrow">›</span>
        </button>
      ) : null}

      {studioOpen && sourceUrl ? (
        <div className="menu-content-v2-photo-studio menu-content-v2-photo-ai-studio">
          <div className="menu-content-v2-photo-studio-head">
            <div><strong>{copy.studioTitle}</strong><small>{copy.studioHint}</small></div>
            <button type="button" onClick={() => setStudioOpen(false)} disabled={busy} aria-label={copy.cancel}><X size={16} /></button>
          </div>

          <div className="menu-content-v2-photo-food-lock">
            <span><Check size={12} /></span>
            <div><strong>{copy.foodLock}</strong><small>{copy.foodLockHint}</small></div>
          </div>

          <div className="menu-content-v2-photo-mode-grid">
            {MODES.map(({ key, icon: Icon }) => (
              <button key={key} type="button" className={mode === key ? "active" : ""} onClick={() => setMode(key)} disabled={busy}>
                <span className="mode-icon"><Icon size={17} /></span>
                <span><strong>{copy[key]}</strong><small>{copy[`${key}Hint`]}</small>{key === "match" ? <em>{copy.recommended}</em> : null}</span>
              </button>
            ))}
          </div>

          {mode === "match" ? (
            <div className="menu-content-v2-scene-selector">
              <div className="menu-content-v2-scene-selector-head">
                <div><strong>{copy.sceneTitle}</strong><small>{copy.sceneHint}</small></div>
                {scenesLoading ? <span><LoaderCircle className="spin" size={12} /> {copy.loadingScenes}</span> : null}
              </div>
              <div className="menu-content-v2-scene-options">
                <button type="button" className={`menu-content-v2-scene-option auto ${sceneType === "auto" ? "active" : ""}`} onClick={() => selectScene("auto")} disabled={busy}>
                  <span className="scene-auto-icon"><Sparkles size={20} /></span>
                  <span><strong>{copy.autoScene}</strong><small>{copy.autoSceneHint}</small></span>
                  {sceneType === "auto" ? <i><Check size={11} /></i> : null}
                </button>
                {scenes.scene1 ? <button type="button" className={`menu-content-v2-scene-option ${sceneType === "scene1" ? "active" : ""}`} onClick={() => selectScene("scene1")} disabled={busy}>
                  <img src={`${scenes.scene1.url}?v=${encodeURIComponent(scenes.scene1.path || "scene1")}`} alt="" />
                  <span><strong>{copy.scene1}</strong><small>{copy.scene1Hint}</small></span>
                  {sceneType === "scene1" ? <i><Check size={11} /></i> : null}
                </button> : null}
                {scenes.scene2 ? <button type="button" className={`menu-content-v2-scene-option ${sceneType === "scene2" ? "active" : ""}`} onClick={() => selectScene("scene2")} disabled={busy}>
                  <img src={`${scenes.scene2.url}?v=${encodeURIComponent(scenes.scene2.path || "scene2")}`} alt="" />
                  <span><strong>{copy.scene2}</strong><small>{copy.scene2Hint}</small></span>
                  {sceneType === "scene2" ? <i><Check size={11} /></i> : null}
                </button> : null}
              </div>
              {!scenesLoading && !hasScenePresets ? <p className="menu-content-v2-scene-empty">{copy.noScenes}</p> : null}
            </div>
          ) : null}

          <div className="menu-content-v2-photo-style">
            <div className="menu-content-v2-photo-style-head"><strong>{styleCopy.title}</strong><small>{styleCopy.hint}</small></div>
            <div className="menu-content-v2-photo-style-presets">
              {Object.entries(PHOTO_STYLE_PRESETS).map(([key]) => {
                const preset = styleCopy.presets[key];
                return <button type="button" key={key} className={`menu-content-v2-photo-style-preset ${selectedStylePreset === key ? "active" : ""}`} onClick={() => applyPhotoStylePreset(key)} disabled={busy}>
                  <span className="menu-content-v2-photo-style-preset-icon" aria-hidden="true">{preset.icon}</span>
                  <span><strong>{preset.label}</strong><small>{preset.hint}</small></span>
                  {preset.badge ? <em>{preset.badge}</em> : null}
                </button>;
              })}
            </div>

            <div className="menu-content-v2-photo-style-save">
              <button type="button" onClick={saveRestaurantPhotoStyle} disabled={busy}><Check size={13} /> {styleCopy.save}</button>
              {styleSaved ? <small>✓ {styleCopy.saved}</small> : null}
            </div>

            <button type="button" className={`menu-content-v2-photo-style-advanced-toggle ${advancedOpen ? "open" : ""}`} onClick={() => setAdvancedOpen((value) => !value)} disabled={busy} aria-expanded={advancedOpen}>
              <span><strong>{styleCopy.advanced}</strong><small>{selectedStylePreset === "custom" ? styleCopy.custom : styleCopy.advancedHint}</small></span>
              <ChevronDown size={15} />
            </button>

            {advancedOpen ? <div className="menu-content-v2-photo-style-advanced-panel">
              {Object.keys(PHOTO_STYLE_VALUES).map((key) => (
                <div className="menu-content-v2-photo-style-group" key={key}>
                  <span>{styleCopy[key]}</span>
                  <div className="menu-content-v2-photo-style-options">
                    {PHOTO_STYLE_VALUES[key].map((value) => <button type="button" key={value} className={photoStyle[key] === value ? "active" : ""} onClick={() => changePhotoStyle(key, value)} disabled={busy}>{styleCopy.options[key][value]}</button>)}
                  </div>
                </div>
              ))}
              {photoStyle.camera !== "original" ? <p className="menu-content-v2-photo-style-warning">{styleCopy.cameraWarning}</p> : null}
            </div> : null}
          </div>

          {results.length ? (
            <>
              <div className="menu-content-v2-photo-variant-title">
                <strong>{copy.optionsTitle}</strong>
                <small>{copy.optionsHint}</small>
              </div>
              <div className="menu-content-v2-photo-variant-grid">
                {results.map((option, index) => (
                  <button type="button" key={option.id} className={`menu-content-v2-photo-variant-card ${result?.id === option.id ? "active" : ""}`} onClick={() => chooseResult(option)} disabled={busy}>
                    <img src={option.url} alt="" />
                    <span><span>{copy.optionLabel} {index + 1}</span>{result?.id === option.id ? <i className="selected-mark"><Check size={11} /></i> : null}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {!result ? (
            <>
              <div className="menu-content-v2-photo-studio-preview ai-source-preview">
                <img src={sourceUrl} alt="" />
                {processing ? <div className="menu-content-v2-photo-processing"><LoaderCircle size={26} className="spin" /><strong>{copy.generating}</strong><small>{copy.generatingHint}</small></div> : null}
              </div>
              <button type="button" className="menu-content-v2-photo-ai-generate" onClick={generatePreview} disabled={busy}>
                {processing ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
                {mode === "match" ? copy.generate : copy.preview}
              </button>
            </>
          ) : (
            <>
              <div className="menu-content-v2-photo-compare-tabs">
                <button type="button" className={compareSide === "before" ? "active" : ""} onClick={() => setCompareSide("before")}><span>{copy.before}</span></button>
                <button type="button" className={compareSide === "after" ? "active" : ""} onClick={() => setCompareSide("after")}><Sparkles size={11} /><span>{copy.after}</span></button>
              </div>
              <div className="menu-content-v2-photo-studio-preview ai-result-preview">
                <img src={compareSide === "before" ? sourceUrl : selectedPreviewUrl} alt="" />
                <span><ArrowLeftRight size={12} /> {copy.compare}</span>
                {processing ? <div className="menu-content-v2-photo-processing"><LoaderCircle size={26} className="spin" /><strong>{copy.generating}</strong><small>{copy.generatingHint}</small></div> : null}
              </div>
              <div className="menu-content-v2-photo-ai-result-actions">
                <button type="button" className="secondary" onClick={generatePreview} disabled={busy}>{processing ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={14} />}{processing ? copy.generating : copy.createAnother}</button>
                <button type="button" className="primary" onClick={saveAiPhoto} disabled={busy}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}{saving ? copy.saving : copy.usePhoto}</button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!studioOpen ? (
        <div className="menu-content-v2-photo-actions">
          <button type="button" className="menu-content-v2-photo-action menu-content-v2-photo-action-camera" disabled={busy} onClick={() => cameraInputRef.current?.click()}>
            {uploading ? <LoaderCircle size={19} className="spin" /> : <Camera size={19} />}
            <span><strong>{uploading ? (t.uploadingPhoto || "Uploading…") : copy.take}</strong><small>{copy.takeHint}</small></span>
          </button>
          <button type="button" className="menu-content-v2-photo-action" disabled={busy} onClick={() => libraryInputRef.current?.click()}>
            {uploading ? <LoaderCircle size={19} className="spin" /> : <ImagePlus size={19} />}
            <span><strong>{item.image_url ? copy.replace : copy.choose}</strong><small>{copy.chooseHint}</small></span>
          </button>
        </div>
      ) : null}

      <input ref={cameraInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/*,.heic,.heif" capture="environment" onChange={(event) => uploadFile(event.target.files?.[0])} disabled={busy} />
      <input ref={libraryInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => uploadFile(event.target.files?.[0])} disabled={busy} />

      {!studioOpen ? <button type="button" className="menu-content-v2-image-ai menu-content-v2-image-ai-secondary" onClick={openAiPhotos}><Sparkles size={15} /><span><strong>{copy.advancedAi}</strong><small>{copy.advancedAiHint}</small></span></button> : null}
      {!studioOpen ? <button type="button" className="menu-content-v2-image-url-toggle" onClick={() => setShowUrl((value) => !value)}><Link2 size={13} /> {showUrl ? (t.hideImageUrl || "Hide image URL") : (t.useImageUrl || "Use image URL")}</button> : null}
      {showUrl && !studioOpen ? <div className="menu-content-v2-image-input"><Link2 size={15} /><input dir="ltr" value={item.image_url || ""} onChange={(event) => onChange?.({ image_url: event.target.value, image_path: "" })} placeholder="https://..." /></div> : null}
      {error ? <div className="menu-content-v2-image-error">{error}</div> : null}
    </div>
  );
}
