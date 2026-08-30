export const MENU_CREATE_START_OPTIONS = [
  {
    id: "upload",
    copy: {
      en: ["FASTEST", "Upload my current menu", "Upload a PDF, photos or screenshots. BEYOND will structure the content for you.", "Upload menu"],
      he: ["הכי מהיר", "העלאת התפריט הקיים שלי", "העלו PDF, תמונות או צילומי מסך. BEYOND יסדר את התוכן עבורכם.", "העלאת תפריט"],
      ar: ["الأسرع", "رفع قائمتي الحالية", "ارفعوا ملف PDF أو صوراً أو لقطات شاشة، وسيقوم BEYOND بترتيب المحتوى لكم.", "رفع القائمة"],
    },
  },
  {
    id: "website",
    copy: {
      en: ["IMPORT", "Import from my website", "Give us the URL of your current restaurant or menu page so we can reuse what already exists.", "Add website link"],
      he: ["ייבוא", "ייבוא מהאתר שלי", "תנו לנו את כתובת האתר או עמוד התפריט הקיים כדי להשתמש במה שכבר בניתם.", "הוספת קישור"],
      ar: ["استيراد", "الاستيراد من موقعي", "أعطونا رابط موقع المطعم أو صفحة القائمة الحالية لنستفيد مما هو موجود بالفعل.", "إضافة رابط الموقع"],
    },
  },
  {
    id: "manual",
    copy: {
      en: ["FULL CONTROL", "Build it myself", "Start with a clean menu, add categories and items yourself, and let BEYOND guide the design direction.", "Build manually"],
      he: ["שליטה מלאה", "אני אבנה בעצמי", "התחילו מתפריט נקי, הוסיפו קטגוריות ופריטים וקבלו מ-BEYOND הכוונה עיצובית.", "בניית תפריט"],
      ar: ["تحكم كامل", "سأبنيها بنفسي", "ابدؤوا بقائمة نظيفة، أضيفوا الفئات والأصناف ودعوا BEYOND يوجهكم نحو التصميم الأنسب.", "بناء القائمة"],
    },
  },
  {
    id: "concierge",
    copy: {
      en: ["DONE FOR YOU", "Build it for me", "Send BEYOND whatever you have. We will prepare the menu and return a polished draft for you to review.", "Request a build"],
      he: ["אנחנו נעשה בשבילכם", "בנו את זה בשבילי", "שלחו ל-BEYOND את מה שיש לכם. נכין את התפריט ונחזיר טיוטה מלוטשת לאישור.", "בקשת בנייה"],
      ar: ["نقوم بها عنكم", "ابنوها من أجلي", "أرسلوا إلى BEYOND كل ما لديكم، وسنجهز القائمة ونرجع لكم مسودة مصقولة للمراجعة.", "طلب بناء القائمة"],
    },
  },
];

export const MENU_CREATE_QUESTIONS = [
  {
    id: "venue",
    copy: {
      en: ["01 / YOUR PLACE", "What kind of place are you creating this menu for?", "This helps us understand the browsing rhythm your customers need."],
      he: ["01 / העסק שלכם", "לאיזה סוג מקום אתם יוצרים את התפריט?", "כך נבין איך הלקוחות שלכם צריכים לעבור בין חלקי התפריט."],
      ar: ["01 / مكانكم", "لأي نوع من الأماكن تنشئون هذه القائمة؟", "يساعدنا ذلك على فهم طريقة التصفح التي يحتاجها زبائنكم."],
    },
    options: [
      ["restaurant", { en:["Restaurant","A broad food menu with a balanced customer journey."], he:["מסעדה","תפריט אוכל רחב עם חוויית גלישה מאוזנת."], ar:["مطعم","قائمة طعام واسعة مع رحلة تصفح متوازنة."] }],
      ["cafe", { en:["Café / Brunch","Coffee, breakfast, pastry and casual daytime browsing."], he:["בית קפה / בראנץ׳","קפה, ארוחות בוקר, מאפים וגלישה קלילה בשעות היום."], ar:["مقهى / برانش","قهوة وفطور ومعجنات وتصفح خفيف خلال النهار."] }],
      ["bar", { en:["Bar / Nightlife","Drinks, cocktails, wine or a late-night experience."], he:["בר / חיי לילה","משקאות, קוקטיילים, יין או חוויית לילה."], ar:["بار / حياة ليلية","مشروبات وكوكتيلات ونبيذ أو تجربة ليلية."] }],
      ["bakery", { en:["Bakery","Warm, friendly and product-led with visual browsing."], he:["מאפייה","חוויה חמה וידידותית שמובלת על ידי המוצרים והתמונות."], ar:["مخبز","تجربة دافئة وودية تقودها المنتجات والصور."] }],
      ["casual", { en:["Fast casual","Quick decisions, bold categories and easy ordering."], he:["פאסט קז׳ואל","בחירה מהירה, קטגוריות ברורות והזמנה קלה."], ar:["وجبات سريعة عصرية","قرارات سريعة وفئات واضحة وطلب سهل."] }],
      ["fine", { en:["Fine dining","Refined pacing, premium typography and more restraint."], he:["מסעדת שף / יוקרה","קצב מעודן, טיפוגרפיה פרימיום ועיצוב מאופק יותר."], ar:["مطعم فاخر","إيقاع راقٍ وخطوط فاخرة وتصميم أكثر هدوءاً."] }],
    ],
  },
  {
    id: "feeling",
    copy: {
      en: ["02 / FEELING", "How should the menu feel?", "Choose the impression you want before we talk about colors and fonts."],
      he: ["02 / תחושה", "איזו תחושה התפריט צריך להעביר?", "בחרו את הרושם הרצוי לפני שנדבר על צבעים ופונטים."],
      ar: ["02 / الإحساس", "ما الإحساس الذي يجب أن تنقله القائمة؟", "اختاروا الانطباع المطلوب قبل الحديث عن الألوان والخطوط."],
    },
    options: [
      ["premium", { en:["Premium & elegant","Quiet confidence, refined type and sophisticated spacing."], he:["פרימיום ואלגנטי","ביטחון שקט, טיפוגרפיה מעודנת ומרווחים מתוחכמים."], ar:["فاخر وأنيق","ثقة هادئة وخطوط راقية ومساحات مدروسة."] }],
      ["modern", { en:["Modern & clean","Simple hierarchy, crisp surfaces and contemporary rhythm."], he:["מודרני ונקי","היררכיה פשוטה, משטחים נקיים וקצב עכשווי."], ar:["حديث ونظيف","تسلسل بسيط وأسطح نظيفة وإيقاع معاصر."] }],
      ["bold", { en:["Bold & energetic","Strong type, punchy blocks and high visual energy."], he:["נועז ואנרגטי","טיפוגרפיה חזקה, בלוקים בולטים ואנרגיה חזותית גבוהה."], ar:["جريء وحيوي","خطوط قوية وكتل بارزة وطاقة بصرية عالية."] }],
      ["warm", { en:["Warm & traditional","Hospitality, familiar structure and tactile character."], he:["חם ומסורתי","אירוח, מבנה מוכר ואופי מוחשי וחם."], ar:["دافئ وتقليدي","ضيافة وبنية مألوفة وطابع دافئ وملموس."] }],
      ["playful", { en:["Friendly & playful","Soft shapes, approachable cards and visual personality."], he:["ידידותי ושובב","צורות רכות, כרטיסים נגישים ואופי חזותי."], ar:["ودود ومرح","أشكال ناعمة وبطاقات ودودة وشخصية بصرية واضحة."] }],
      ["minimal", { en:["Minimal & editorial","Less decoration, more typography and breathing room."], he:["מינימלי ומערכתי","פחות קישוט, יותר טיפוגרפיה ומרחב נשימה."], ar:["بسيط وتحريري","زخرفة أقل وخطوط أقوى ومساحة أكبر للتنفس."] }],
    ],
  },
  {
    id: "photos",
    copy: {
      en:["03 / PHOTOGRAPHY","How much should food photography lead the experience?","We will prioritize designs that naturally support the amount of imagery you want."],
      he:["03 / צילום","עד כמה התמונות צריכות להוביל את החוויה?","נעדיף עיצובים שמתאימים באופן טבעי לכמות התמונות שאתם רוצים."],
      ar:["03 / الصور","إلى أي درجة يجب أن تقود صور الطعام التجربة؟","سنفضل التصاميم التي تدعم بشكل طبيعي كمية الصور التي تريدونها."],
    },
    options: [
      ["photo-first", { en:["Photo-first","Images should be a major part of browsing and discovery."], he:["התמונות במרכז","התמונות הן חלק מרכזי מהגלישה והגילוי."], ar:["الصور أولاً","الصور جزء أساسي من التصفح والاكتشاف."] }],
      ["some", { en:["Some photos","Use images selectively while keeping the menu easy to scan."], he:["חלק מהפריטים עם תמונות","השתמשו בתמונות באופן סלקטיבי ושמרו על תפריט קל לסריקה."], ar:["بعض الصور","استخدموا الصور بشكل انتقائي مع الحفاظ على سهولة التصفح."] }],
      ["none", { en:["Mostly typography","Let names, descriptions and prices do most of the work."], he:["בעיקר טיפוגרפיה","השמות, התיאורים והמחירים יובילו את התפריט."], ar:["الخطوط أولاً","دعوا الأسماء والأوصاف والأسعار تقوم بمعظم العمل."] }],
    ],
  },
  {
    id: "menuSize",
    copy: {
      en:["04 / MENU SIZE","How large is the menu?","Dense menus need a different layout system than a short curated menu."],
      he:["04 / גודל התפריט","כמה גדול התפריט?","תפריט גדול דורש מערכת פריסה שונה מתפריט קצר ומדויק."],
      ar:["04 / حجم القائمة","ما حجم القائمة؟","القوائم الكبيرة تحتاج نظام تخطيط مختلفاً عن قائمة قصيرة ومنتقاة."],
    },
    options: [
      ["small", { en:["Small","Up to roughly 20 items. Curated and easy to explore."], he:["קטן","עד כ-20 פריטים. ממוקד וקל לגלישה."], ar:["صغيرة","حتى نحو 20 صنفاً، منتقاة وسهلة التصفح."] }],
      ["medium", { en:["Medium","Around 20–60 items across several categories."], he:["בינוני","כ-20–60 פריטים במספר קטגוריות."], ar:["متوسطة","نحو 20–60 صنفاً ضمن عدة فئات."] }],
      ["large", { en:["Large","A deep menu, drinks list or many categories and variants."], he:["גדול","תפריט עמוק, רשימת משקאות או הרבה קטגוריות ווריאציות."], ar:["كبيرة","قائمة عميقة أو مشروبات كثيرة أو فئات وخيارات متعددة."] }],
    ],
  },
  {
    id: "service",
    copy: {
      en:["05 / CUSTOMER BEHAVIOR","What should customers be able to do quickly?","We use this to choose the right navigation and content density."],
      he:["05 / התנהגות הלקוחות","מה הלקוחות צריכים להיות מסוגלים לעשות במהירות?","נשתמש בזה כדי לבחור ניווט וצפיפות תוכן מתאימים."],
      ar:["05 / سلوك الزبائن","ما الذي يجب أن يتمكن الزبائن من فعله بسرعة؟","نستخدم ذلك لاختيار التنقل وكثافة المحتوى الأنسب."],
    },
    options: [
      ["fast", { en:["Order quickly","Get to categories and prices with as little friction as possible."], he:["להזמין מהר","להגיע לקטגוריות ולמחירים עם מינימום חיכוך."], ar:["الطلب بسرعة","الوصول إلى الفئات والأسعار بأقل احتكاك ممكن."] }],
      ["browse", { en:["Browse & discover","Encourage customers to explore photos, dishes and sections."], he:["לגלות ולחקור","לעודד לקוחות לחקור תמונות, מנות וקטגוריות."], ar:["التصفح والاكتشاف","تشجيع الزبائن على استكشاف الصور والأطباق والأقسام."] }],
      ["premium", { en:["Enjoy the experience","Slow the pace and make the menu feel more considered."], he:["ליהנות מהחוויה","להאט את הקצב ולתת לתפריט תחושה מוקפדת יותר."], ar:["الاستمتاع بالتجربة","إبطاء الإيقاع وجعل القائمة أكثر عناية ورقياً."] }],
      ["drinks", { en:["Compare drinks & prices","Make long drink lists, pours and bottle prices easy to scan."], he:["להשוות משקאות ומחירים","להפוך רשימות משקאות, כוסות ובקבוקים לקלות להשוואה."], ar:["مقارنة المشروبات والأسعار","تسهيل قراءة قوائم المشروبات وأسعار الكؤوس والزجاجات."] }],
    ],
  },
  {
    id: "branding",
    copy: {
      en:["06 / BRAND","How much branding do you already have?","Nothing is required. This only tells Studio how much guidance to give you next."],
      he:["06 / מותג","כמה מהמיתוג כבר קיים אצלכם?","לא חייבים כלום. זה רק עוזר ל-Studio להבין כמה הכוונה לתת בהמשך."],
      ar:["06 / العلامة","كم من الهوية البصرية لديكم بالفعل؟","لا شيء إلزامي. هذا يساعد Studio فقط على معرفة مقدار التوجيه المطلوب لاحقاً."],
    },
    options: [
      ["full", { en:["Logo + brand colors","I already have a visual identity I want the menu to follow."], he:["לוגו + צבעי מותג","כבר יש לי זהות חזותית ואני רוצה שהתפריט ילך לפיה."], ar:["شعار + ألوان العلامة","لدي هوية بصرية وأريد أن تتبعها القائمة."] }],
      ["logo", { en:["Logo only","Keep my logo, but help me build the rest of the visual system."], he:["לוגו בלבד","שמרו על הלוגו ועזרו לי לבנות את שאר המערכת החזותית."], ar:["الشعار فقط","احتفظوا بالشعار وساعدوني في بناء بقية النظام البصري."] }],
      ["none", { en:["Starting from scratch","I want BEYOND to help establish the entire menu direction."], he:["מתחילים מאפס","אני רוצה ש-BEYOND יעזור לבנות את כל הכיוון של התפריט."], ar:["نبدأ من الصفر","أريد من BEYOND مساعدتي في بناء اتجاه القائمة بالكامل."] }],
    ],
  },
];

export const MENU_CREATE_UI = {
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
