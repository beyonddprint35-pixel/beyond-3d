import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileUp,
  Globe2,
  HeartHandshake,
  Link2,
  PencilLine,
  Sparkles,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import { PREMIUM_MENU_DESIGNS } from "../features/menu-engine/domain/menuDesignLibrary";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import {
  MENU_CREATE_V2_DESIGN_KEY,
  MENU_CREATE_V2_FLOW_KEY,
} from "../features/menu-engine/studio/menuStudioV2Session";
import "./MenuCreateV2.css";
import "./MenuCreateV2Multilingual.css";

const START_OPTIONS = [
  {
    id: "upload",
    icon: FileUp,
    copy: {
      en: { eyebrow: "FASTEST", title: "Upload my current menu", description: "Upload a PDF, photos or screenshots. BEYOND will structure the content for you.", action: "Upload menu" },
      he: { eyebrow: "הכי מהיר", title: "העלאת התפריט הקיים שלי", description: "העלו PDF, תמונות או צילומי מסך. BEYOND יסדר את התוכן עבורכם.", action: "העלאת תפריט" },
      ar: { eyebrow: "الأسرع", title: "رفع قائمتي الحالية", description: "ارفعوا ملف PDF أو صوراً أو لقطات شاشة، وسيقوم BEYOND بترتيب المحتوى لكم.", action: "رفع القائمة" },
    },
  },
  {
    id: "website",
    icon: Globe2,
    copy: {
      en: { eyebrow: "IMPORT", title: "Import from my website", description: "Give us the URL of your current restaurant or menu page so we can reuse what already exists.", action: "Add website link" },
      he: { eyebrow: "ייבוא", title: "ייבוא מהאתר שלי", description: "תנו לנו את כתובת האתר או עמוד התפריט הקיים כדי להשתמש במה שכבר בניתם.", action: "הוספת קישור" },
      ar: { eyebrow: "استيراد", title: "الاستيراد من موقعي", description: "أعطونا رابط موقع المطعم أو صفحة القائمة الحالية لنستفيد مما هو موجود بالفعل.", action: "إضافة رابط الموقع" },
    },
  },
  {
    id: "manual",
    icon: PencilLine,
    copy: {
      en: { eyebrow: "FULL CONTROL", title: "Build it myself", description: "Start with a clean menu, add categories and items yourself, and let BEYOND guide the design direction.", action: "Build manually" },
      he: { eyebrow: "שליטה מלאה", title: "אני אבנה בעצמי", description: "התחילו מתפריט נקי, הוסיפו קטגוריות ופריטים וקבלו מ-BEYOND הכוונה עיצובית.", action: "בניית תפריט" },
      ar: { eyebrow: "تحكم كامل", title: "سأبنيها بنفسي", description: "ابدؤوا بقائمة نظيفة، أضيفوا الفئات والأصناف ودعوا BEYOND يوجهكم نحو التصميم الأنسب.", action: "بناء القائمة" },
    },
  },
  {
    id: "concierge",
    icon: HeartHandshake,
    copy: {
      en: { eyebrow: "DONE FOR YOU", title: "Build it for me", description: "Send BEYOND whatever you have. We will prepare the menu and return a polished draft for you to review.", action: "Request a build" },
      he: { eyebrow: "אנחנו נעשה בשבילכם", title: "בנו את זה בשבילי", description: "שלחו ל-BEYOND את מה שיש לכם. נכין את התפריט ונחזיר טיוטה מלוטשת לאישור.", action: "בקשת בנייה" },
      ar: { eyebrow: "نقوم بها عنكم", title: "ابنوها من أجلي", description: "أرسلوا إلى BEYOND كل ما لديكم، وسنجهز القائمة ونرجع لكم مسودة مصقولة للمراجعة.", action: "طلب بناء القائمة" },
    },
  },
];

const QUESTIONS = [
  {
    id: "venue",
    copy: {
      en: { eyebrow: "01 / YOUR PLACE", title: "What kind of place are you creating this menu for?", hint: "This helps us understand the browsing rhythm your customers need." },
      he: { eyebrow: "01 / העסק שלכם", title: "לאיזה סוג מקום אתם יוצרים את התפריט?", hint: "כך נבין איך הלקוחות שלכם צריכים לעבור בין חלקי התפריט." },
      ar: { eyebrow: "01 / مكانكم", title: "لأي نوع من الأماكن تنشئون هذه القائمة؟", hint: "يساعدنا ذلك على فهم طريقة التصفح التي يحتاجها زبائنكم." },
    },
    options: [
      { value: "restaurant", copy: { en:["Restaurant","A broad food menu with a balanced customer journey."], he:["מסעדה","תפריט אוכל רחב עם חוויית גלישה מאוזנת."], ar:["مطعم","قائمة طعام واسعة مع رحلة تصفح متوازنة."] } },
      { value: "cafe", copy: { en:["Café / Brunch","Coffee, breakfast, pastry and casual daytime browsing."], he:["בית קפה / בראנץ׳","קפה, ארוחות בוקר, מאפים וגלישה קלילה בשעות היום."], ar:["مقهى / برانش","قهوة وفطور ومعجنات وتصفح خفيف خلال النهار."] } },
      { value: "bar", copy: { en:["Bar / Nightlife","Drinks, cocktails, wine or a late-night experience."], he:["בר / חיי לילה","משקאות, קוקטיילים, יין או חוויית לילה."], ar:["بار / حياة ليلية","مشروبات وكوكتيلات ونبيذ أو تجربة ليلية."] } },
      { value: "bakery", copy: { en:["Bakery","Warm, friendly and product-led with visual browsing."], he:["מאפייה","חוויה חמה וידידותית שמובלת על ידי המוצרים והתמונות."], ar:["مخبز","تجربة دافئة وودية تقودها المنتجات والصور."] } },
      { value: "casual", copy: { en:["Fast casual","Quick decisions, bold categories and easy ordering."], he:["פאסט קז׳ואל","בחירה מהירה, קטגוריות ברורות והזמנה קלה."], ar:["وجبات سريعة عصرية","قرارات سريعة وفئات واضحة وطلب سهل."] } },
      { value: "fine", copy: { en:["Fine dining","Refined pacing, premium typography and more restraint."], he:["מסעדת שף / יוקרה","קצב מעודן, טיפוגרפיה פרימיום ועיצוב מאופק יותר."], ar:["مطعم فاخر","إيقاع راقٍ وخطوط فاخرة وتصميم أكثر هدوءاً."] } },
    ],
  },
  {
    id: "feeling",
    copy: {
      en: { eyebrow: "02 / FEELING", title: "How should the menu feel?", hint: "Choose the impression you want before we talk about colors and fonts." },
      he: { eyebrow: "02 / תחושה", title: "איזו תחושה התפריט צריך להעביר?", hint: "בחרו את הרושם הרצוי לפני שנדבר על צבעים ופונטים." },
      ar: { eyebrow: "02 / الإحساس", title: "ما الإحساس الذي يجب أن تنقله القائمة؟", hint: "اختاروا الانطباع المطلوب قبل الحديث عن الألوان والخطوط." },
    },
    options: [
      { value:"premium", copy:{ en:["Premium & elegant","Quiet confidence, refined type and sophisticated spacing."], he:["פרימיום ואלגנטי","ביטחון שקט, טיפוגרפיה מעודנת ומרווחים מתוחכמים."], ar:["فاخر وأنيق","ثقة هادئة وخطوط راقية ومساحات مدروسة."] } },
      { value:"modern", copy:{ en:["Modern & clean","Simple hierarchy, crisp surfaces and contemporary rhythm."], he:["מודרני ונקי","היררכיה פשוטה, משטחים נקיים וקצב עכשווי."], ar:["حديث ونظيف","تسلسل بسيط وأسطح نظيفة وإيقاع معاصر."] } },
      { value:"bold", copy:{ en:["Bold & energetic","Strong type, punchy blocks and high visual energy."], he:["נועז ואנרגטי","טיפוגרפיה חזקה, בלוקים בולטים ואנרגיה חזותית גבוהה."], ar:["جريء وحيوي","خطوط قوية وكتل بارزة وطاقة بصرية عالية."] } },
      { value:"warm", copy:{ en:["Warm & traditional","Hospitality, familiar structure and tactile character."], he:["חם ומסורתי","אירוח, מבנה מוכר ואופי מוחשי וחם."], ar:["دافئ وتقليدي","ضيافة وبنية مألوفة وطابع دافئ وملموس."] } },
      { value:"playful", copy:{ en:["Friendly & playful","Soft shapes, approachable cards and visual personality."], he:["ידידותי ושובב","צורות רכות, כרטיסים נגישים ואופי חזותי."], ar:["ودود ومرح","أشكال ناعمة وبطاقات ودودة وشخصية بصرية واضحة."] } },
      { value:"minimal", copy:{ en:["Minimal & editorial","Less decoration, more typography and breathing room."], he:["מינימלי ומערכתי","פחות קישוט, יותר טיפוגרפיה ומרחב נשימה."], ar:["بسيط وتحريري","زخرفة أقل وخطوط أقوى ومساحة أكبر للتنفس."] } },
    ],
  },
  {
    id: "photos",
    copy: {
      en:{ eyebrow:"03 / PHOTOGRAPHY", title:"How much should food photography lead the experience?", hint:"We will prioritize designs that naturally support the amount of imagery you want." },
      he:{ eyebrow:"03 / צילום", title:"עד כמה התמונות צריכות להוביל את החוויה?", hint:"נעדיף עיצובים שמתאימים באופן טבעי לכמות התמונות שאתם רוצים." },
      ar:{ eyebrow:"03 / الصور", title:"إلى أي درجة يجب أن تقود صور الطعام التجربة؟", hint:"سنفضل التصاميم التي تدعم بشكل طبيعي كمية الصور التي تريدونها." },
    },
    options: [
      { value:"photo-first", copy:{ en:["Photo-first","Images should be a major part of browsing and discovery."], he:["התמונות במרכז","התמונות הן חלק מרכזי מהגלישה והגילוי."], ar:["الصور أولاً","الصور جزء أساسي من التصفح والاكتشاف."] } },
      { value:"some", copy:{ en:["Some photos","Use images selectively while keeping the menu easy to scan."], he:["חלק מהפריטים עם תמונות","השתמשו בתמונות באופן סלקטיבי ושמרו על תפריט קל לסריקה."], ar:["بعض الصور","استخدموا الصور بشكل انتقائي مع الحفاظ على سهولة التصفح."] } },
      { value:"none", copy:{ en:["Mostly typography","Let names, descriptions and prices do most of the work."], he:["בעיקר טיפוגרפיה","השמות, התיאורים והמחירים יובילו את התפריט."], ar:["الخطوط أولاً","دعوا الأسماء والأوصاف والأسعار تقوم بمعظم العمل."] } },
    ],
  },
  {
    id: "menuSize",
    copy: {
      en:{ eyebrow:"04 / MENU SIZE", title:"How large is the menu?", hint:"Dense menus need a different layout system than a short curated menu." },
      he:{ eyebrow:"04 / גודל התפריט", title:"כמה גדול התפריט?", hint:"תפריט גדול דורש מערכת פריסה שונה מתפריט קצר ומדויק." },
      ar:{ eyebrow:"04 / حجم القائمة", title:"ما حجم القائمة؟", hint:"القوائم الكبيرة تحتاج نظام تخطيط مختلفاً عن قائمة قصيرة ومنتقاة." },
    },
    options: [
      { value:"small", copy:{ en:["Small","Up to roughly 20 items. Curated and easy to explore."], he:["קטן","עד כ-20 פריטים. ממוקד וקל לגלישה."], ar:["صغيرة","حتى نحو 20 صنفاً، منتقاة وسهلة التصفح."] } },
      { value:"medium", copy:{ en:["Medium","Around 20–60 items across several categories."], he:["בינוני","כ-20–60 פריטים במספר קטגוריות."], ar:["متوسطة","نحو 20–60 صنفاً ضمن عدة فئات."] } },
      { value:"large", copy:{ en:["Large","A deep menu, drinks list or many categories and variants."], he:["גדול","תפריט עמוק, רשימת משקאות או הרבה קטגוריות ווריאציות."], ar:["كبيرة","قائمة عميقة أو مشروبات كثيرة أو فئات وخيارات متعددة."] } },
    ],
  },
  {
    id: "service",
    copy: {
      en:{ eyebrow:"05 / CUSTOMER BEHAVIOR", title:"What should customers be able to do quickly?", hint:"We use this to choose the right navigation and content density." },
      he:{ eyebrow:"05 / התנהגות הלקוחות", title:"מה הלקוחות צריכים להיות מסוגלים לעשות במהירות?", hint:"נשתמש בזה כדי לבחור ניווט וצפיפות תוכן מתאימים." },
      ar:{ eyebrow:"05 / سلوك الزبائن", title:"ما الذي يجب أن يتمكن الزبائن من فعله بسرعة؟", hint:"نستخدم ذلك لاختيار التنقل وكثافة المحتوى الأنسب.") },
    },
    options: [
      { value:"fast", copy:{ en:["Order quickly","Get to categories and prices with as little friction as possible."], he:["להזמין מהר","להגיע לקטגוריות ולמחירים עם מינימום חיכוך."], ar:["الطلب بسرعة","الوصول إلى الفئات والأسعار بأقل احتكاك ممكن."] } },
      { value:"browse", copy:{ en:["Browse & discover","Encourage customers to explore photos, dishes and sections."], he:["לגלות ולחקור","לעודד לקוחות לחקור תמונות, מנות וקטגוריות."], ar:["التصفح والاكتشاف","تشجيع الزبائن على استكشاف الصور والأطباق والأقسام."] } },
      { value:"premium", copy:{ en:["Enjoy the experience","Slow the pace and make the menu feel more considered."], he:["ליהנות מהחוויה","להאט את הקצב ולתת לתפריט תחושה מוקפדת יותר."], ar:["الاستمتاع بالتجربة","إبطاء الإيقاع وجعل القائمة أكثر عناية ورقياً."] } },
      { value:"drinks", copy:{ en:["Compare drinks & prices","Make long drink lists, pours and bottle prices easy to scan."], he:["להשוות משקאות ומחירים","להפוך רשימות משקאות, כוסות ובקבוקים לקלות להשוואה."], ar:["مقارنة المشروبات والأسعار","تسهيل قراءة قوائم المشروبات وأسعار الكؤوس والزجاجات."] } },
    ],
  },
  {
    id: "branding",
    copy: {
      en:{ eyebrow:"06 / BRAND", title:"How much branding do you already have?", hint:"Nothing is required. This only tells Studio how much guidance to give you next." },
      he:{ eyebrow:"06 / מותג", title:"כמה מהמיתוג כבר קיים אצלכם?", hint:"לא חייבים כלום. זה רק עוזר ל-Studio להבין כמה הכוונה לתת בהמשך." },
      ar:{ eyebrow:"06 / العلامة", title:"كم من الهوية البصرية لديكم بالفعل؟", hint:"لا شيء إلزامي. هذا يساعد Studio فقط على معرفة مقدار التوجيه المطلوب لاحقاً." },
    },
    options: [
      { value:"full", copy:{ en:["Logo + brand colors","I already have a visual identity I want the menu to follow."], he:["לוגו + צבעי מותג","כבר יש לי זהות חזותית ואני רוצה שהתפריט ילך לפיה."], ar:["شعار + ألوان العلامة","لدي هوية بصرية وأريد أن تتبعها القائمة."] } },
      { value:"logo", copy:{ en:["Logo only","Keep my logo, but help me build the rest of the visual system."], he:["לוגו בלבד","שמרו על הלוגו ועזרו לי לבנות את שאר המערכת החזותית."], ar:["الشعار فقط","احتفظوا بالشعار وساعدوني في بناء بقية النظام البصري."] } },
      { value:"none", copy:{ en:["Starting from scratch","I want BEYOND to help establish the entire menu direction."], he:["מתחילים מאפס","אני רוצה ש-BEYOND יעזור לבנות את כל הכיוון של התפריט."], ar:["نبدأ من الصفر","أريد من BEYOND مساعدتي في بناء اتجاه القائمة بالكامل."] } },
    ],
  },
];

const PROFILE_TAGS = {
  venue: {
    restaurant: ["restaurant", "bistro", "classic", "modern"], cafe: ["cafe", "coffee", "brunch", "friendly"],
    bar: ["bar", "cocktail", "cocktails", "wine", "spirits", "night", "drinks"], bakery: ["bakery", "cafe", "pastry", "friendly", "warm"],
    casual: ["fast casual", "street food", "burger", "pizza", "bold", "tiles"], fine: ["fine dining", "luxury", "editorial", "minimal", "premium"],
  },
  feeling: {
    premium: ["luxury", "fine dining", "premium", "editorial", "elegant"], modern: ["modern", "minimal", "white", "app", "mobile"],
    bold: ["bold", "street food", "fast casual", "colorful", "tiles"], warm: ["warm", "classic", "heritage", "bistro", "trattoria"],
    playful: ["playful", "friendly", "tiles", "cafe", "brunch"], minimal: ["minimal", "editorial", "quiet", "black white", "fine dining"],
  },
  photos: { "photo-first": ["photos", "visual", "gallery", "split", "photo story", "tiles"], some: ["visual", "tiles", "split", "gallery"], none: ["editorial", "ledger", "minimal", "classic", "price list"] },
  menuSize: { small: ["editorial", "minimal", "gallery", "fine dining"], medium: ["classic", "tiles", "split", "restaurant"], large: ["ledger", "dense", "price list", "wine", "spirits", "classic"] },
  service: { fast: ["fast casual", "tiles", "mobile", "launcher", "street food"], browse: ["gallery", "visual", "split", "photos", "photo story"], premium: ["fine dining", "luxury", "editorial", "minimal", "premium"], drinks: ["bar", "wine", "spirits", "cocktail", "cocktails", "ledger", "drinks"] },
};

const UI = {
  en: {
    studio:"Menu Studio", language:"Interface language", exit:"Exit", back:"Back", start:"Start", fit:"Fit", designs:"Designs", progress:"Menu creation progress",
    createEyebrow:"CREATE A MENU", createTitle:"How would you like to start?", createHint:"Bring what you already have, start from scratch, or let BEYOND do the setup for you. You can refine everything later in the same Studio.",
    oneWorkspace:"One workspace.", continuity:"Your content, design, preview and publishing stay together from the first step.",
    websiteEyebrow:"IMPORT FROM WEBSITE", websiteTitle:"Where does your current menu live?", websiteHint:"Paste the restaurant website or direct menu page. We’ll keep this source with your creation brief and use it when the website importer is connected to Content Studio.", websiteLabel:"Website or menu URL", websiteError:"Enter a full website address, for example https://restaurant.com/menu", devNote:"Development note", devWebsite:"The UI path is ready. The scraper/import backend is the next connection; this version does not pretend a URL has already been imported.", continueFit:"Continue to menu fit",
    chooseOne:"Choose one answer to continue", matchesEyebrow:"YOUR BEST MATCHES", matchesTitle:"We found three designs that fit your menu.", matchesHint:"These are real designs from the same library used inside Design Studio. Pick a strong starting point—you can still change every design later.", fitWord:"fit", bestMatch:"Best match", direction:"Design direction", startDesign:"Start with this design", skip:"Skip recommendations and start clean",
    conciergeEyebrow:"BEYOND CONCIERGE", conciergeTitle:"Give us what you have. We’ll take it from here.", conciergeHint:"Prepare a menu-build request with your restaurant details, current website and any notes. During development we save this request draft locally; the submission workflow will be connected before release.", restaurantName:"Restaurant name", websiteLink:"Website / Instagram / menu link", know:"What should we know?", notesPlaceholder:"Languages, menu size, style, launch date, special requirements...", doneForYou:"Done-for-you path", queueNote:"We’ll connect this to the real request queue before production.", prepare:"Prepare request", requestReady:"Request draft prepared.", requestReadyHint:"It is saved for this development session. The production submission step is intentionally not faked.",
    reasons:{ premium:"matches your premium direction", warm:"keeps the experience warm and familiar", bold:"supports a faster, more energetic menu", photo:"gives photography a strong role", typography:"stays strong without relying on photography", large:"handles a larger menu efficiently", drinks:"makes drinks and prices easier to compare", cafe:"fits a casual daytime customer journey", fallback:"is a strong starting point for the direction you described" },
  },
  he: {
    studio:"סטודיו לתפריטים", language:"שפת הממשק", exit:"יציאה", back:"חזרה", start:"התחלה", fit:"התאמה", designs:"עיצובים", progress:"התקדמות יצירת התפריט",
    createEyebrow:"יצירת תפריט", createTitle:"איך תרצו להתחיל?", createHint:"הביאו את מה שכבר יש לכם, התחילו מאפס או תנו ל-BEYOND להכין את הבסיס. אחר כך תוכלו לדייק הכל באותו Studio.",
    oneWorkspace:"סביבת עבודה אחת.", continuity:"התוכן, העיצוב, התצוגה המקדימה והפרסום נשארים יחד מהשלב הראשון.",
    websiteEyebrow:"ייבוא מהאתר", websiteTitle:"איפה התפריט הנוכחי שלכם נמצא?", websiteHint:"הדביקו את אתר המסעדה או עמוד התפריט. נשמור את המקור עם תהליך היצירה ונשתמש בו כשמחבר הייבוא יחובר ל-Content Studio.", websiteLabel:"אתר או כתובת תפריט", websiteError:"הזינו כתובת מלאה, לדוגמה https://restaurant.com/menu", devNote:"הערת פיתוח", devWebsite:"מסלול הממשק מוכן. חיבור הסריקה והייבוא הוא השלב הבא; הגרסה הזו לא מעמידה פנים שהאתר כבר יובא.", continueFit:"המשך להתאמת התפריט",
    chooseOne:"בחרו תשובה אחת כדי להמשיך", matchesEyebrow:"ההתאמות הטובות ביותר", matchesTitle:"מצאנו שלושה עיצובים שמתאימים לתפריט שלכם.", matchesHint:"אלה עיצובים אמיתיים מאותה ספרייה של Design Studio. בחרו נקודת התחלה חזקה—תוכלו לשנות כל פרט בהמשך.", fitWord:"התאמה", bestMatch:"ההתאמה הטובה ביותר", direction:"כיוון עיצובי", startDesign:"התחילו עם העיצוב הזה", skip:"דלגו על ההמלצות והתחילו נקי",
    conciergeEyebrow:"BEYOND CONCIERGE", conciergeTitle:"תנו לנו את מה שיש לכם. אנחנו נמשיך מכאן.", conciergeHint:"הכינו בקשה לבניית התפריט עם פרטי העסק, האתר והערות. בזמן הפיתוח נשמור את הטיוטה מקומית; תהליך השליחה האמיתי יחובר לפני השקה.", restaurantName:"שם המסעדה", websiteLink:"אתר / אינסטגרם / קישור לתפריט", know:"מה חשוב שנדע?", notesPlaceholder:"שפות, גודל התפריט, סגנון, תאריך השקה, דרישות מיוחדות...", doneForYou:"מסלול שנעשה בשבילכם", queueNote:"נחבר את המסלול לתור הבקשות האמיתי לפני השקה.", prepare:"הכנת בקשה", requestReady:"טיוטת הבקשה מוכנה.", requestReadyHint:"היא נשמרה לסשן הפיתוח הזה. שלב השליחה לפרודקשן בכוונה עדיין לא מדומה.",
    reasons:{ premium:"מתאים לכיוון הפרימיום שבחרתם", warm:"שומר על חוויה חמה ומוכרת", bold:"תומך בתפריט מהיר ואנרגטי יותר", photo:"נותן לתמונות תפקיד מרכזי", typography:"נשאר חזק גם בלי להסתמך על תמונות", large:"מתמודד היטב עם תפריט גדול", drinks:"מקל על השוואת משקאות ומחירים", cafe:"מתאים לחוויית יום קלילה של בית קפה", fallback:"הוא נקודת התחלה חזקה לכיוון שתיארתם" },
  },
  ar: {
    studio:"استوديو القوائم", language:"لغة الواجهة", exit:"خروج", back:"رجوع", start:"البداية", fit:"الملاءمة", designs:"التصاميم", progress:"تقدم إنشاء القائمة",
    createEyebrow:"إنشاء قائمة", createTitle:"كيف تودون البدء؟", createHint:"استخدموا ما لديكم، ابدؤوا من الصفر أو دعوا BEYOND يجهز الأساس. يمكنكم تحسين كل شيء لاحقاً داخل نفس Studio.",
    oneWorkspace:"مساحة عمل واحدة.", continuity:"يبقى المحتوى والتصميم والمعاينة والنشر معاً منذ الخطوة الأولى.",
    websiteEyebrow:"الاستيراد من الموقع", websiteTitle:"أين توجد قائمتكم الحالية؟", websiteHint:"الصقوا موقع المطعم أو صفحة القائمة. سنحتفظ بالمصدر مع ملخص الإنشاء ونستخدمه عند توصيل مستورد المواقع بـ Content Studio.", websiteLabel:"الموقع أو رابط القائمة", websiteError:"أدخلوا رابطاً كاملاً، مثلاً https://restaurant.com/menu", devNote:"ملاحظة تطوير", devWebsite:"مسار الواجهة جاهز. ربط أداة المسح والاستيراد هو الخطوة التالية؛ هذه النسخة لا تدّعي أن الموقع تم استيراده بالفعل.", continueFit:"متابعة ملاءمة القائمة",
    chooseOne:"اختاروا إجابة واحدة للمتابعة", matchesEyebrow:"أفضل التطابقات", matchesTitle:"وجدنا ثلاثة تصاميم تناسب قائمتكم.", matchesHint:"هذه تصاميم حقيقية من نفس مكتبة Design Studio. اختاروا نقطة بداية قوية، ويمكنكم تغيير كل التفاصيل لاحقاً.", fitWord:"ملاءمة", bestMatch:"أفضل تطابق", direction:"اتجاه التصميم", startDesign:"ابدؤوا بهذا التصميم", skip:"تخطي الاقتراحات والبدء بتصميم نظيف",
    conciergeEyebrow:"BEYOND CONCIERGE", conciergeTitle:"أعطونا ما لديكم، وسنكمل من هنا.", conciergeHint:"جهزوا طلب بناء القائمة مع تفاصيل المطعم والموقع وأي ملاحظات. أثناء التطوير نحفظ المسودة محلياً، وسيتم ربط الإرسال الحقيقي قبل الإطلاق.", restaurantName:"اسم المطعم", websiteLink:"الموقع / إنستغرام / رابط القائمة", know:"ما الذي يجب أن نعرفه؟", notesPlaceholder:"اللغات، حجم القائمة، الأسلوب، موعد الإطلاق، متطلبات خاصة...", doneForYou:"مسار ننفذه عنكم", queueNote:"سنربطه بطابور الطلبات الحقيقي قبل الإطلاق.", prepare:"تجهيز الطلب", requestReady:"مسودة الطلب جاهزة.", requestReadyHint:"تم حفظها لجلسة التطوير الحالية. خطوة الإرسال للإنتاج غير مقلدة عمداً حتى الآن.",
    reasons:{ premium:"يناسب الاتجاه الفاخر الذي اخترتموه", warm:"يحافظ على تجربة دافئة ومألوفة", bold:"يدعم قائمة أسرع وأكثر حيوية", photo:"يعطي الصور دوراً أساسياً", typography:"يبقى قوياً دون الاعتماد على الصور", large:"يتعامل بكفاءة مع قائمة كبيرة", drinks:"يسهّل مقارنة المشروبات والأسعار", cafe:"يناسب تجربة نهارية خفيفة للمقهى", fallback:"يشكل نقطة بداية قوية للاتجاه الذي وصفتموه" },
  },
};

function searchableDesignText(entry) {
  return [entry.name, entry.category, entry.layout, entry.description, ...(entry.tags || [])].join(" ").toLowerCase();
}

function scoreDesign(entry, answers) {
  const haystack = searchableDesignText(entry);
  let score = 50;
  let matches = 0;
  Object.entries(PROFILE_TAGS).forEach(([question, optionMap]) => {
    const selected = answers[question];
    if (!selected) return;
    (optionMap[selected] || []).forEach((tag) => {
      if (haystack.includes(tag.toLowerCase())) {
        score += question === "venue" || question === "feeling" ? 8 : 5;
        matches += 1;
      }
    });
  });
  if (answers.branding === "none" && /friendly|modern|minimal|classic/.test(haystack)) score += 2;
  if (answers.branding === "full" && /minimal|editorial|gallery|split/.test(haystack)) score += 2;
  return { score: Math.min(98, Math.max(62, score)), matches };
}

function recommendationReason(entry, answers, t) {
  const reasons = [];
  const text = searchableDesignText(entry);
  if (answers.feeling === "premium" && /luxury|editorial|fine dining|premium/.test(text)) reasons.push(t.reasons.premium);
  if (answers.feeling === "warm" && /warm|heritage|classic|bistro/.test(text)) reasons.push(t.reasons.warm);
  if (answers.feeling === "bold" && /bold|street|tiles/.test(text)) reasons.push(t.reasons.bold);
  if (answers.photos === "photo-first" && /photo|gallery|visual|split|tiles/.test(text)) reasons.push(t.reasons.photo);
  if (answers.photos === "none" && /editorial|ledger|minimal|classic/.test(text)) reasons.push(t.reasons.typography);
  if (answers.menuSize === "large" && /ledger|dense|wine|classic/.test(text)) reasons.push(t.reasons.large);
  if (answers.service === "drinks" && /bar|wine|cocktail|ledger|drinks/.test(text)) reasons.push(t.reasons.drinks);
  if (answers.venue === "cafe" && /cafe|brunch|bakery|friendly/.test(text)) reasons.push(t.reasons.cafe);
  return reasons.slice(0, 2).join(" · ") || t.reasons.fallback;
}

function MiniMenuPreview({ entry }) {
  const [paper = "#f7f5f2", accent = "#4974e5", ink = "#17191d"] = entry.swatches || [];
  const visual = /gallery|tiles|split|visual|photo/i.test(`${entry.layout} ${entry.tags?.join(" ")}`);
  return (
    <div className="menu-create-v2-mini" style={{ "--mini-paper": paper, "--mini-accent": accent, "--mini-ink": ink }}>
      <div className="menu-create-v2-mini-top"><span /><b>MENU</b><i /></div>
      <div className="menu-create-v2-mini-hero"><small>{entry.category}</small><strong>{entry.name.split(" ")[0]}</strong></div>
      <div className="menu-create-v2-mini-tabs"><span /><span /><span /></div>
      <div className={`menu-create-v2-mini-items ${visual ? "visual" : "textual"}`}>
        {[0,1,2].map((index) => <article key={index}><i /><div><b /><span /></div><em /></article>)}
      </div>
    </div>
  );
}

function Progress({ screen, questionIndex, t }) {
  const fitActive = screen === "questions" || screen === "recommendations";
  const designsActive = screen === "recommendations";
  const fitLabel = screen === "questions" ? `${questionIndex + 1} / ${QUESTIONS.length}` : t.fit;
  return (
    <div className="menu-create-v2-progress" aria-label={t.progress}>
      <span className="done"><Check size={12} /> {t.start}</span><i />
      <span className={fitActive ? "active" : ""}>{fitLabel}</span><i />
      <span className={designsActive ? "active" : ""}>{t.designs}</span>
    </div>
  );
}

export default function MenuCreateV2() {
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage("en"));
  const [screen, setScreen] = useState("start");
  const [mode, setMode] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [concierge, setConcierge] = useState({ restaurant: "", website: "", notes: "" });
  const [requestPrepared, setRequestPrepared] = useState(false);
  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const BackIcon = rtl ? ArrowRight : ArrowLeft;

  const recommendations = useMemo(() => PREMIUM_MENU_DESIGNS
    .map((entry) => ({ ...entry, ...scoreDesign(entry, answers) }))
    .sort((a, b) => b.score - a.score || b.matches - a.matches)
    .slice(0, 3), [answers]);
  const currentQuestion = QUESTIONS[questionIndex];
  const questionCopy = currentQuestion?.copy?.[uiLanguage] || currentQuestion?.copy?.en;

  function changeUiLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function persistFlow(nextMode = mode, extra = {}) {
    const payload = { mode: nextMode, answers, websiteUrl, uiLanguage, createdAt: new Date().toISOString(), ...extra };
    try { window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify(payload)); } catch { /* non-blocking */ }
  }

  function chooseStart(nextMode) {
    setMode(nextMode);
    if (nextMode === "upload") {
      persistFlow(nextMode);
      window.location.assign(`/menu-builder?guided=1&source=upload&ui=${uiLanguage}`);
      return;
    }
    if (nextMode === "website") { setScreen("website"); return; }
    if (nextMode === "concierge") { setScreen("concierge"); return; }
    setQuestionIndex(0);
    setScreen("questions");
  }

  function validateWebsiteAndContinue() {
    try {
      const parsed = new URL(websiteUrl.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("invalid");
      setWebsiteError("");
      persistFlow("website", { websiteUrl: parsed.toString() });
      setQuestionIndex(0);
      setScreen("questions");
    } catch { setWebsiteError(t.websiteError); }
  }

  function chooseAnswer(value) {
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    if (questionIndex < QUESTIONS.length - 1) { setQuestionIndex((current) => current + 1); return; }
    try { window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify({ mode, answers: nextAnswers, websiteUrl, uiLanguage, createdAt: new Date().toISOString() })); } catch { /* non-blocking */ }
    setScreen("recommendations");
  }

  function goBack() {
    if (screen === "start") { window.location.assign("/"); return; }
    if (screen === "questions" && questionIndex > 0) { setQuestionIndex((current) => current - 1); return; }
    if (screen === "recommendations") { setQuestionIndex(QUESTIONS.length - 1); setScreen("questions"); return; }
    setScreen("start");
  }

  function selectDesign(entry) {
    persistFlow(mode, { recommendedDesignId: entry.id, recommendedDesignName: entry.name });
    try { window.sessionStorage.setItem(MENU_CREATE_V2_DESIGN_KEY, entry.id); } catch { /* non-blocking */ }
    const params = new URLSearchParams({ guided:"1", mode:mode || "manual", design:entry.id, ui:uiLanguage });
    if (websiteUrl.trim()) params.set("website", websiteUrl.trim());
    window.location.assign(`/dev/menu-content-v2?${params.toString()}`);
  }

  function prepareConciergeRequest(event) {
    event.preventDefault();
    const draft = { ...concierge, mode:"concierge", uiLanguage, createdAt:new Date().toISOString() };
    try { window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify(draft)); } catch { /* non-blocking */ }
    setRequestPrepared(true);
  }

  return (
    <main className="menu-create-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-create-v2-topbar">
        <button type="button" className="menu-create-v2-brand" onClick={() => window.location.assign("/")}>
          <img src={beyondLogo} alt="" />
          <span><strong>Beyond</strong><small>{t.studio}</small></span>
        </button>
        <Progress screen={screen} questionIndex={questionIndex} t={t} />
        <div className="menu-create-v2-top-actions">
          <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} label={t.language} compact />
          <button type="button" className="menu-create-v2-exit" onClick={() => window.location.assign("/")}>{t.exit}</button>
        </div>
      </header>

      <div className="menu-create-v2-shell">
        {screen !== "start" ? <button type="button" className="menu-create-v2-back" onClick={goBack}><BackIcon size={16} /> {t.back}</button> : null}

        {screen === "start" ? (
          <section className="menu-create-v2-start">
            <div className="menu-create-v2-heading"><span>{t.createEyebrow}</span><h1>{t.createTitle}</h1><p>{t.createHint}</p></div>
            <div className="menu-create-v2-start-grid">
              {START_OPTIONS.map((option) => {
                const Icon = option.icon;
                const copy = option.copy[uiLanguage] || option.copy.en;
                return (
                  <button type="button" key={option.id} className={`menu-create-v2-start-card mode-${option.id}`} onClick={() => chooseStart(option.id)}>
                    <div className="menu-create-v2-start-icon"><Icon size={22} /></div><span>{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.description}</p><strong>{copy.action}<ForwardIcon size={15} /></strong>
                  </button>
                );
              })}
            </div>
            <div className="menu-create-v2-continuity"><Sparkles size={15} /><span><strong>{t.oneWorkspace}</strong> {t.continuity}</span></div>
          </section>
        ) : null}

        {screen === "website" ? (
          <section className="menu-create-v2-narrow">
            <div className="menu-create-v2-step-icon"><Link2 size={22} /></div><span className="menu-create-v2-kicker">{t.websiteEyebrow}</span><h1>{t.websiteTitle}</h1><p>{t.websiteHint}</p>
            <label className="menu-create-v2-url-field"><span>{t.websiteLabel}</span><div><Globe2 size={18} /><input dir="ltr" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourrestaurant.com/menu" autoFocus /></div></label>
            {websiteError ? <div className="menu-create-v2-field-error">{websiteError}</div> : null}
            <div className="menu-create-v2-dev-note"><strong>{t.devNote}</strong><span>{t.devWebsite}</span></div>
            <button type="button" className="menu-create-v2-primary" onClick={validateWebsiteAndContinue} disabled={!websiteUrl.trim()}>{t.continueFit} <ForwardIcon size={16} /></button>
          </section>
        ) : null}

        {screen === "questions" ? (
          <section className="menu-create-v2-question">
            <div className="menu-create-v2-question-heading"><span>{questionCopy.eyebrow}</span><h1>{questionCopy.title}</h1><p>{questionCopy.hint}</p></div>
            <div className={`menu-create-v2-answer-grid count-${currentQuestion.options.length}`}>
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.id] === option.value;
                const [title, text] = option.copy[uiLanguage] || option.copy.en;
                return <button type="button" key={option.value} className={selected ? "selected" : ""} onClick={() => chooseAnswer(option.value)}><span className="menu-create-v2-answer-check">{selected ? <Check size={14} /> : null}</span><strong>{title}</strong><p>{text}</p></button>;
              })}
            </div>
            <div className="menu-create-v2-question-foot"><div className="menu-create-v2-dots">{QUESTIONS.map((question, index) => <span key={question.id} className={index === questionIndex ? "active" : index < questionIndex ? "done" : ""} />)}</div><span>{t.chooseOne}</span></div>
          </section>
        ) : null}

        {screen === "recommendations" ? (
          <section className="menu-create-v2-recommendations">
            <div className="menu-create-v2-heading compact"><span><Sparkles size={14} /> {t.matchesEyebrow}</span><h1>{t.matchesTitle}</h1><p>{t.matchesHint}</p></div>
            <div className="menu-create-v2-design-grid">
              {recommendations.map((entry, index) => (
                <article key={entry.id} className={index === 0 ? "best" : ""}>
                  <div className="menu-create-v2-design-preview"><MiniMenuPreview entry={entry} /><span className="menu-create-v2-fit"><strong>{entry.score}%</strong> {t.fitWord}</span>{index === 0 ? <span className="menu-create-v2-best-badge">{t.bestMatch}</span> : null}</div>
                  <div className="menu-create-v2-design-copy"><span>{t.direction} · {entry.layout}</span><h2>{entry.name}</h2><p>{recommendationReason(entry, answers, t)}</p><div className="menu-create-v2-swatches">{(entry.swatches || []).map((color) => <i key={color} style={{ background:color }} />)}</div><button type="button" onClick={() => selectDesign(entry)}>{t.startDesign} <ForwardIcon size={15} /></button></div>
                </article>
              ))}
            </div>
            <button type="button" className="menu-create-v2-secondary-link" onClick={() => window.location.assign(`/dev/menu-content-v2?guided=1&mode=manual&ui=${uiLanguage}`)}>{t.skip}</button>
          </section>
        ) : null}

        {screen === "concierge" ? (
          <section className="menu-create-v2-concierge">
            <div className="menu-create-v2-heading compact"><span>{t.conciergeEyebrow}</span><h1>{t.conciergeTitle}</h1><p>{t.conciergeHint}</p></div>
            <form onSubmit={prepareConciergeRequest}>
              <label><span>{t.restaurantName}</span><input required value={concierge.restaurant} onChange={(event) => setConcierge((current) => ({ ...current, restaurant:event.target.value }))} placeholder={t.restaurantName} /></label>
              <label><span>{t.websiteLink}</span><input dir="ltr" value={concierge.website} onChange={(event) => setConcierge((current) => ({ ...current, website:event.target.value }))} placeholder="https://..." /></label>
              <label className="wide"><span>{t.know}</span><textarea value={concierge.notes} onChange={(event) => setConcierge((current) => ({ ...current, notes:event.target.value }))} placeholder={t.notesPlaceholder} /></label>
              <div className="menu-create-v2-concierge-actions"><div><HeartHandshake size={18} /><span><strong>{t.doneForYou}</strong><small>{t.queueNote}</small></span></div><button type="submit" className="menu-create-v2-primary">{t.prepare} <ForwardIcon size={16} /></button></div>
            </form>
            {requestPrepared ? <div className="menu-create-v2-request-ready"><Check size={17} /><span><strong>{t.requestReady}</strong> {t.requestReadyHint}</span></div> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
