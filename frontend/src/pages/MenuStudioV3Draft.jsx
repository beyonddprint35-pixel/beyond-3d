import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { loadPublishedMenuBySlug } from "../features/menu-engine/data/menuRepository";
import {
  createMenuDraftSession,
  findSavedDraftSession,
  restoreSavedDraftSession,
  saveDraftSessionLocally,
  updateDraftDesign,
  updateDraftMenu,
} from "../features/menu-engine/studio/draftSession";
import { buildPublishContract, validatePublishContract } from "../features/menu-engine/studio/publishContract";
import { MENU_ALLERGENS, MENU_DIETARY_BADGES, MENU_MERCHANDISING_BADGES, MENU_SPICE_LEVELS, BADGE_LABELS } from "../features/menu-engine/domain/itemMetadata";
import "./MenuStudioV3Dev.css";
import "./MenuStudioV3Draft.css";

const UI = {
  en: {
    content: "Content", design: "Design", preview: "Preview", analytics: "Analytics", settings: "Settings",
    categories: "Categories", category: "Category", items: "items", visible: "Visible", hidden: "Hidden",
    hide: "Hide", show: "Show", edit: "Edit", back: "Categories", noDescription: "No description",
    realDraft: "MENU CONTENT", designDraft: "DESIGN", makeItYours: "Make it yours",
    designHint: "Changes update the preview instantly and save automatically.", classic: "Classic", visual: "Visual",
    classicHint: "No photos required", visualHint: "Image-led cards", colors: "Colors", typography: "Typography", layout: "Layout", badges: "Badges",
    accent: "Accent", background: "Background", itemName: "Item name", cardRadius: "Card radius",
    showBadgeSymbols: "Badge symbols", withSymbols: "Icon + text", textOnly: "Text only", badgeStyle: "Icon style",
    autoStyle: "Auto", minimalStyle: "Minimal", filledStyle: "Filled", playfulStyle: "Playful",
    autoStyleHint: "Automatically follows the selected menu template.",
    liveDraftPreview: "LIVE PREVIEW", restaurant: "Restaurant", menuUrl: "Menu URL", languages: "Menu languages",
    menuSettings: "Menu settings", safety: "Changes are saved automatically. They become visible to customers only when you publish.",
    itemDraft: "ITEM", editItem: "Edit item", name: "Name", description: "Description", price: "Price",
    dietary: "Dietary & allergen badges", merchandising: "Highlights & merchandising", ownerConfirmed: "Owner-confirmed only", spiceLevel: "Spice level", notSpicy: "Not spicy",
    aiSuggestions: "AI badge suggestions", aiNote: "AI may suggest likely badges from the name and description, but the restaurant must confirm them before they appear publicly.",
    cancel: "Cancel", applyDraft: "Apply", saving: "Saving…", allSaved: "All changes saved", publish: "Publish",
    ownerLanguage: "Studio language", contentLanguage: "Menu content language", loading: "Loading your menu…",
    publishTitle: "Publish changes?", publishReady: "Ready to publish", publishBlocked: "Something needs attention",
    publishNote: "Your saved changes will become visible on your live menu. You can restore an earlier version anytime.", close: "Close",
    analyticsTitle: "Menu performance", analyticsEyebrow: "ANALYTICS · PRIVACY-FIRST", analyticsHint: "This dashboard is ready for real anonymous menu activity. No synthetic numbers are shown.",
    trackingNotConnected: "Analytics not active yet", trackingNote: "When analytics is enabled, this view will show real behavior from your published menu.",
    menuViews: "Menu views", categoryViews: "Category views", itemImpressions: "Item impressions", itemOpens: "Item opens",
    topCategories: "Top categories", topItems: "Top items", engagement: "Engagement", recommendations: "Smart recommendations",
    noData: "No analytics data yet", noDataHint: "This will start filling automatically when analytics is enabled.",
    recommendationHint: "Buddy will compare impressions, opens, position and category reach to suggest what to move, feature or mark as Popular / Chef’s Choice.",
    waitingEvents: "Waiting for real activity",
  },
  he: {
    content: "תוכן", design: "עיצוב", preview: "תצוגה מקדימה", analytics: "אנליטיקה", settings: "הגדרות",
    categories: "קטגוריות", category: "קטגוריה", items: "פריטים", visible: "גלוי", hidden: "מוסתר",
    hide: "הסתר", show: "הצג", edit: "עריכה", back: "קטגוריות", noDescription: "ללא תיאור",
    realDraft: "תוכן התפריט", designDraft: "עיצוב", makeItYours: "עצבו את התפריט",
    designHint: "השינויים מתעדכנים מיד בתצוגה ונשמרים אוטומטית.", classic: "קלאסי", visual: "ויזואלי",
    classicHint: "לא דורש תמונות", visualHint: "כרטיסים מבוססי תמונה", colors: "צבעים", typography: "טיפוגרפיה", layout: "פריסה", badges: "תגיות",
    accent: "צבע מוביל", background: "רקע", itemName: "שם פריט", cardRadius: "עיגול כרטיס",
    showBadgeSymbols: "סמלים בתגיות", withSymbols: "סמל + טקסט", textOnly: "טקסט בלבד", badgeStyle: "סגנון סמלים",
    autoStyle: "אוטומטי", minimalStyle: "מינימלי", filledStyle: "מלא", playfulStyle: "שובב",
    autoStyleHint: "הסגנון מותאם אוטומטית לתבנית התפריט שנבחרה.",
    liveDraftPreview: "תצוגה חיה", restaurant: "מסעדה", menuUrl: "כתובת התפריט", languages: "שפות התפריט",
    menuSettings: "הגדרות תפריט", safety: "השינויים נשמרים אוטומטית ויופיעו ללקוחות רק לאחר פרסום.",
    itemDraft: "פריט", editItem: "עריכת פריט", name: "שם", description: "תיאור", price: "מחיר",
    dietary: "תגי תזונה ואלרגנים", merchandising: "הבלטות ושיווק", ownerConfirmed: "באישור בעל העסק בלבד", spiceLevel: "רמת חריפות", notSpicy: "לא חריף",
    aiSuggestions: "הצעות תגיות AI", aiNote: "ה-AI יכול להציע תגיות לפי שם ותיאור הפריט, אך בעל העסק חייב לאשר אותן לפני שיופיעו לציבור.",
    cancel: "ביטול", applyDraft: "החל", saving: "שומר…", allSaved: "כל השינויים נשמרו", publish: "פרסום",
    ownerLanguage: "שפת הסטודיו", contentLanguage: "שפת תוכן התפריט", loading: "טוען את התפריט שלכם…",
    publishTitle: "לפרסם את השינויים?", publishReady: "מוכן לפרסום", publishBlocked: "יש משהו שדורש תשומת לב",
    publishNote: "השינויים השמורים יהפכו לגלויים בתפריט החי. ניתן לשחזר גרסה קודמת בכל עת.", close: "סגור",
    analyticsTitle: "ביצועי התפריט", analyticsEyebrow: "אנליטיקה · פרטיות תחילה", analyticsHint: "הדשבורד מוכן לפעילות אמיתית ואנונימית מהתפריט. לא מוצגים נתונים מלאכותיים.",
    trackingNotConnected: "האנליטיקה עדיין לא פעילה", trackingNote: "לאחר הפעלת האנליטיקה, המסך יציג שימוש אמיתי בתפריט שפורסם.",
    menuViews: "צפיות בתפריט", categoryViews: "צפיות בקטגוריות", itemImpressions: "חשיפות לפריטים", itemOpens: "פתיחת פריטים",
    topCategories: "קטגוריות מובילות", topItems: "פריטים מובילים", engagement: "מעורבות", recommendations: "המלצות חכמות",
    noData: "אין עדיין נתוני אנליטיקה", noDataHint: "הנתונים יתחילו להתמלא אוטומטית לאחר הפעלת האנליטיקה.",
    recommendationHint: "Buddy ישווה חשיפות, פתיחות, מיקום והגעה לקטגוריה ויציע מה לקדם, להזיז או לסמן כפופולרי / בחירת השף.",
    waitingEvents: "ממתין לפעילות אמיתית",
  },
  ar: {
    content: "المحتوى", design: "التصميم", preview: "المعاينة", analytics: "التحليلات", settings: "الإعدادات",
    categories: "الفئات", category: "الفئة", items: "عناصر", visible: "ظاهر", hidden: "مخفي",
    hide: "إخفاء", show: "إظهار", edit: "تعديل", back: "الفئات", noDescription: "لا يوجد وصف",
    realDraft: "محتوى القائمة", designDraft: "التصميم", makeItYours: "صمّم قائمتك",
    designHint: "تظهر التغييرات فورًا في المعاينة ويتم حفظها تلقائيًا.", classic: "كلاسيكي", visual: "مرئي",
    classicHint: "لا يحتاج صورًا", visualHint: "بطاقات تعتمد على الصور", colors: "الألوان", typography: "الخطوط", layout: "التخطيط", badges: "الشارات",
    accent: "اللون الرئيسي", background: "الخلفية", itemName: "اسم العنصر", cardRadius: "استدارة البطاقة",
    showBadgeSymbols: "رموز الشارات", withSymbols: "رمز + نص", textOnly: "نص فقط", badgeStyle: "نمط الرموز",
    autoStyle: "تلقائي", minimalStyle: "بسيط", filledStyle: "ممتلئ", playfulStyle: "مرح",
    autoStyleHint: "يتم اختيار النمط تلقائيًا ليتناسب مع قالب القائمة.",
    liveDraftPreview: "معاينة مباشرة", restaurant: "المطعم", menuUrl: "رابط القائمة", languages: "لغات القائمة",
    menuSettings: "إعدادات القائمة", safety: "يتم حفظ التغييرات تلقائيًا ولن تظهر للعملاء إلا بعد النشر.",
    itemDraft: "عنصر", editItem: "تعديل العنصر", name: "الاسم", description: "الوصف", price: "السعر",
    dietary: "شارات الحمية والحساسية", merchandising: "إبراز وتسويق العناصر", ownerConfirmed: "بتأكيد صاحب المطعم فقط", spiceLevel: "درجة الحدة", notSpicy: "غير حار",
    aiSuggestions: "اقتراحات شارات بالذكاء الاصطناعي", aiNote: "يمكن للذكاء الاصطناعي اقتراح شارات اعتمادًا على الاسم والوصف، لكن يجب على المطعم تأكيدها قبل ظهورها للعامة.",
    cancel: "إلغاء", applyDraft: "تطبيق", saving: "جارٍ الحفظ…", allSaved: "تم حفظ جميع التغييرات", publish: "نشر",
    ownerLanguage: "لغة الاستوديو", contentLanguage: "لغة محتوى القائمة", loading: "جارٍ تحميل قائمتك…",
    publishTitle: "نشر التغييرات؟", publishReady: "جاهز للنشر", publishBlocked: "هناك شيء يحتاج إلى الانتباه",
    publishNote: "ستصبح التغييرات المحفوظة ظاهرة في القائمة المباشرة. يمكنك استعادة إصدار سابق في أي وقت.", close: "إغلاق",
    analyticsTitle: "أداء القائمة", analyticsEyebrow: "التحليلات · الخصوصية أولًا", analyticsHint: "لوحة التحليلات جاهزة لنشاط حقيقي ومجهول الهوية. لا نعرض أرقامًا مصطنعة.",
    trackingNotConnected: "التحليلات غير مفعلة بعد", trackingNote: "بعد تفعيل التحليلات ستعرض هذه الصفحة الاستخدام الحقيقي للقائمة المنشورة.",
    menuViews: "مشاهدات القائمة", categoryViews: "مشاهدات الفئات", itemImpressions: "ظهور العناصر", itemOpens: "فتح العناصر",
    topCategories: "أفضل الفئات", topItems: "أفضل العناصر", engagement: "التفاعل", recommendations: "توصيات ذكية",
    noData: "لا توجد بيانات تحليلات بعد", noDataHint: "ستبدأ البيانات بالظهور تلقائيًا بعد تفعيل التحليلات.",
    recommendationHint: "سيحلل Buddy الظهور والفتح والموقع والوصول للفئات ليقترح ما يجب تقديمه أو نقله أو تمييزه كشائع / اختيار الشيف.",
    waitingEvents: "بانتظار نشاط حقيقي",
  },
};

function textFor(value, language) {
  return value?.[language] || value?.en || value?.he || value?.ar || "";
}

function priceText(item) {
  if (item.price_options?.length) return item.price_options.map(option => option.price).filter(Boolean).join(" / ");
  return item.price || "";
}

function EmptyMetric({ label, waitingLabel }) {
  return <article className="studio-v3-analytics-metric"><span>{label}</span><strong>—</strong><small>{waitingLabel}</small></article>;
}

export default function MenuStudioV3Draft() {
  const [params] = useSearchParams();
  const slug = params.get("slug") || "el-puerto";
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("content");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [draftItem, setDraftItem] = useState(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [viewport, setViewport] = useState("390");
  const [designPanel, setDesignPanel] = useState("colors");
  const [studioLanguage, setStudioLanguage] = useState("en");
  const [contentLanguage, setContentLanguage] = useState("he");
  const [publishCheck, setPublishCheck] = useState(null);

  const t = UI[studioLanguage];
  const studioRtl = studioLanguage === "he" || studioLanguage === "ar";

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadPublishedMenuBySlug(slug)
      .then(payload => {
        if (!active) return;
        const base = createMenuDraftSession(payload);
        const saved = findSavedDraftSession(base);
        const next = saved ? restoreSavedDraftSession(base, saved) : base;
        setSession(next);
        setSelectedGroupId(next.menu.groups[0]?.id || "");
        setContentLanguage(next.menu.default_language || next.menu.languages?.[0] || "en");
        setStatus("ready");
      })
      .catch(err => {
        if (!active) return;
        setError(err?.message || "Could not load menu.");
        setStatus("error");
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!session?.dirty) return undefined;
    const timer = window.setTimeout(() => {
      setSession(current => current?.dirty ? saveDraftSessionLocally(current) : current);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [session?.dirty, session?.menu, session?.design]);

  const menu = session?.menu;
  const selectedGroup = menu?.groups?.find(group => group.id === selectedGroupId) || menu?.groups?.[0] || null;
  const selectedItems = selectedGroup ? menu.items.filter(item => item.group_id === selectedGroup.id) : [];
  const frameWidth = viewport === "desktop" ? "min(1080px,100%)" : `${viewport}px`;

  const previewMenu = useMemo(() => {
    if (!menu) return null;
    return {
      ...menu,
      default_language: contentLanguage,
      groups: menu.groups.filter(group => group.visible !== false),
      items: menu.items.filter(item => item.visible !== false),
    };
  }, [menu, contentLanguage]);

  function patchMenu(updater) { setSession(current => updateDraftMenu(current, updater)); }
  function patchDesign(updater) { setSession(current => updateDraftDesign(current, updater)); }
  function openItem(item) { setEditingItemId(item.id); setDraftItem(JSON.parse(JSON.stringify(item))); }

  function saveItemLocally() {
    if (!draftItem) return;
    patchMenu(current => ({ ...current, items: current.items.map(item => item.id === editingItemId ? draftItem : item) }));
    setEditingItemId(null);
    setDraftItem(null);
  }

  function publishMenu() {
    try {
      const contract = buildPublishContract(session);
      const result = validatePublishContract(contract);
      setPublishCheck({ ...result, contract });
    } catch (err) {
      setPublishCheck({ ok: false, errors: [err?.message || "Publish check failed"] });
    }
  }

  function toggleBadge(kind, key) {
    const current = draftItem.metadata?.[kind] || [];
    const exists = current.includes(key);
    setDraftItem(item => ({
      ...item,
      metadata: { ...item.metadata, [kind]: exists ? current.filter(value => value !== key) : [...current, key], reviewedByOwner: true },
    }));
  }

  function toggleVisibility(id, type) {
    patchMenu(current => ({ ...current, [type]: current[type].map(row => row.id === id ? { ...row, visible: row.visible === false } : row) }));
  }

  if (status === "loading") return <div className="studio-v3-draft-state">{t.loading}</div>;
  if (status === "error") return <div className="studio-v3-draft-state error">{error}</div>;
  if (!session || !menu) return null;

  const menuLanguages = menu.languages?.length ? menu.languages : [menu.default_language || "en"];

  return (
    <div className="studio-v3-shell" dir={studioRtl ? "rtl" : "ltr"} lang={studioLanguage}>
      <header className="studio-v3-topbar">
        <div className="studio-v3-brand">
          <span className="studio-v3-mark">B</span>
          <div><strong>Beyond Menu Studio</strong><span>{menu.restaurant_name}</span></div>
        </div>
        <div className="studio-v3-top-actions">
          <div className="studio-v3-language-switch" aria-label={t.ownerLanguage}>
            {["en","he","ar"].map(code => <button key={code} className={studioLanguage===code?"active":""} onClick={()=>setStudioLanguage(code)}>{code.toUpperCase()}</button>)}
          </div>
          <div className={`studio-v3-autosave-status ${session.dirty ? "saving" : "saved"}`}>{session.dirty ? t.saving : t.allSaved}</div>
          <button className="studio-v3-publish-review-button" onClick={publishMenu} title={t.publishNote}>{t.publish}</button>
        </div>
      </header>

      <nav className="studio-v3-tabs studio-v3-tabs-five">
        {["content","design","preview","analytics","settings"].map(key => (
          <button key={key} className={tab===key?"active":""} onClick={()=>{setTab(key);setMobileDetail(false);}}>{t[key]}</button>
        ))}
      </nav>

      <main className="studio-v3-main">
        {tab === "content" && (
          <div className={`studio-v3-content-layout ${mobileDetail ? "mobile-detail" : ""}`}>
            <section className="studio-v3-panel studio-v3-categories">
              <div className="studio-v3-panel-heading"><div><span className="studio-v3-eyebrow">{t.realDraft}</span><h1>{t.categories}</h1></div></div>
              <div className="studio-v3-content-language-row">
                <span>{t.contentLanguage}</span>
                <div className="studio-v3-language-switch">{menuLanguages.map(code => <button key={code} className={contentLanguage===code?"active":""} onClick={()=>setContentLanguage(code)}>{code.toUpperCase()}</button>)}</div>
              </div>
              <div className="studio-v3-category-list">
                {menu.groups.map(group => {
                  const count = menu.items.filter(item => item.group_id === group.id).length;
                  return (
                    <div className={`studio-v3-category-card ${selectedGroup?.id===group.id?"selected":""}`} key={group.id}>
                      <button className="studio-v3-category-open" onClick={()=>{setSelectedGroupId(group.id);setMobileDetail(true);}}>
                        <span className="studio-v3-category-copy"><strong>{textFor(group.name,contentLanguage)}</strong><small>{count} {t.items} · {group.visible===false?t.hidden:t.visible}</small></span>
                        <span className="studio-v3-chevron">›</span>
                      </button>
                      <button className="studio-v3-draft-hide" onClick={()=>toggleVisibility(group.id,"groups")}>{group.visible===false?t.show:t.hide}</button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="studio-v3-panel studio-v3-items">
              <button className="studio-v3-mobile-back" onClick={()=>setMobileDetail(false)}>← {t.back}</button>
              <div className="studio-v3-panel-heading"><div><span className="studio-v3-eyebrow">{t.category}</span><h2>{textFor(selectedGroup?.name,contentLanguage)}</h2></div></div>
              <div className="studio-v3-item-list">
                {selectedItems.map(item => (
                  <article className={`studio-v3-item-card ${item.visible===false?"is-hidden":""}`} key={item.id}>
                    <div className="studio-v3-item-copy"><div className="studio-v3-item-title-row"><strong>{textFor(item.name,contentLanguage)}</strong><span>{priceText(item)}</span></div><p>{textFor(item.description,contentLanguage)||t.noDescription}</p></div>
                    <div className="studio-v3-item-actions"><button onClick={()=>openItem(item)}>{t.edit}</button><button onClick={()=>toggleVisibility(item.id,"items")}>{item.visible===false?t.show:t.hide}</button></div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "design" && (
          <div className="studio-v3-design-layout">
            <section className="studio-v3-panel studio-v3-design-controls">
              <span className="studio-v3-eyebrow">{t.designDraft}</span><h1>{t.makeItYours}</h1><p>{t.designHint}</p>
              <div className="studio-v3-template-grid">{["classic","visual"].map(template => <button key={template} className={session.design.template===template?"active":""} onClick={()=>patchDesign(current=>({...current,template}))}><strong>{template==="classic"?t.classic:t.visual}</strong><span>{template==="classic"?t.classicHint:t.visualHint}</span></button>)}</div>
              <div className="studio-v3-design-tabs">{["colors","type","layout","badges"].map(key => <button key={key} className={designPanel===key?"active":""} onClick={()=>setDesignPanel(key)}>{key==="colors"?t.colors:key==="type"?t.typography:key==="layout"?t.layout:t.badges}</button>)}</div>
              {designPanel === "colors" && <><label className="studio-v3-color-field"><span>{t.accent}</span><input type="color" value={session.design.theme.accent} onChange={e=>patchDesign(current=>({...current,theme:{...current.theme,accent:e.target.value}}))}/></label><label className="studio-v3-color-field"><span>{t.background}</span><input type="color" value={session.design.theme.background} onChange={e=>patchDesign(current=>({...current,theme:{...current.theme,background:e.target.value}}))}/></label></>}
              {designPanel === "type" && <label className="studio-v3-range-field"><span>{t.itemName} <b>{session.design.typography.itemNameSize}px</b></span><input type="range" min="13" max="22" value={session.design.typography.itemNameSize} onChange={e=>patchDesign(current=>({...current,typography:{...current.typography,itemNameSize:Number(e.target.value)}}))}/></label>}
              {designPanel === "layout" && <label className="studio-v3-range-field"><span>{t.cardRadius} <b>{session.design.layout.cardRadius}px</b></span><input type="range" min="0" max="28" value={session.design.layout.cardRadius} onChange={e=>patchDesign(current=>({...current,layout:{...current.layout,cardRadius:Number(e.target.value)}}))}/></label>}
              {designPanel === "badges" && <div className="studio-v3-badge-design-controls"><div className="studio-v3-control-label">{t.showBadgeSymbols}</div><div className="studio-v3-choice-row"><button className={session.design.badges.showSymbols?"active":""} onClick={()=>patchDesign(current=>({...current,badges:{...current.badges,showSymbols:true}}))}>{t.withSymbols}</button><button className={!session.design.badges.showSymbols?"active":""} onClick={()=>patchDesign(current=>({...current,badges:{...current.badges,showSymbols:false}}))}>{t.textOnly}</button></div><div className="studio-v3-control-label">{t.badgeStyle}</div><div className="studio-v3-choice-grid">{[["auto",t.autoStyle],["minimal",t.minimalStyle],["filled",t.filledStyle],["playful",t.playfulStyle]].map(([value,label])=><button key={value} className={session.design.badges.iconStyle===value?"active":""} disabled={!session.design.badges.showSymbols} onClick={()=>patchDesign(current=>({...current,badges:{...current.badges,iconStyle:value}}))}>{label}</button>)}</div><p className="studio-v3-control-help">{t.autoStyleHint}</p></div>}
            </section>
            <section className="studio-v3-preview-panel"><div className="studio-v3-preview-label">{t.liveDraftPreview} · 390PX</div><div className="studio-v3-phone-canvas"><MenuRenderer menu={previewMenu} design={session.design}/></div></section>
          </div>
        )}

        {tab === "preview" && <section className="studio-v3-preview-full"><div className="studio-v3-preview-switcher">{["320","375","390","430","desktop"].map(size=><button key={size} className={viewport===size?"active":""} onClick={()=>setViewport(size)}>{size==="desktop"?"Desktop":size}</button>)}</div><div className="studio-v3-draft-preview-frame" style={{width:frameWidth}}><MenuRenderer menu={previewMenu} design={session.design}/></div></section>}

        {tab === "analytics" && <section className="studio-v3-analytics"><div className="studio-v3-analytics-head studio-v3-panel"><div><span className="studio-v3-eyebrow">{t.analyticsEyebrow}</span><h1>{t.analyticsTitle}</h1><p>{t.analyticsHint}</p></div><div className="studio-v3-analytics-connection"><span className="dot"/><div><strong>{t.trackingNotConnected}</strong><small>{t.trackingNote}</small></div></div></div><div className="studio-v3-analytics-metrics"><EmptyMetric label={t.menuViews} waitingLabel={t.waitingEvents}/><EmptyMetric label={t.categoryViews} waitingLabel={t.waitingEvents}/><EmptyMetric label={t.itemImpressions} waitingLabel={t.waitingEvents}/><EmptyMetric label={t.itemOpens} waitingLabel={t.waitingEvents}/></div><div className="studio-v3-analytics-grid">{[t.topCategories,t.topItems,t.engagement].map(title => <section className="studio-v3-panel studio-v3-analytics-card" key={title}><span className="studio-v3-eyebrow">{title}</span><div className="studio-v3-analytics-empty"><strong>{t.noData}</strong><span>{t.noDataHint}</span></div></section>)}<section className="studio-v3-panel studio-v3-analytics-card recommendation"><span className="studio-v3-eyebrow">{t.recommendations}</span><div className="studio-v3-analytics-empty"><strong>Buddy</strong><span>{t.recommendationHint}</span></div></section></div></section>}

        {tab === "settings" && <section className="studio-v3-panel studio-v3-settings-panel"><span className="studio-v3-eyebrow">{t.settings}</span><h1>{t.menuSettings}</h1><div className="studio-v3-setting-row"><span>{t.restaurant}</span><span>{menu.restaurant_name}</span></div><div className="studio-v3-setting-row"><span>{t.menuUrl}</span><span>/menu/{menu.slug}</span></div><div className="studio-v3-setting-row"><span>{t.languages}</span><span>{menuLanguages.join(" + ").toUpperCase()}</span></div><div className="studio-v3-safety-note">{t.safety}</div></section>}
      </main>

      {draftItem && <div className="studio-v3-modal-backdrop" onMouseDown={()=>{setDraftItem(null);setEditingItemId(null);}}><section className="studio-v3-editor-sheet" onMouseDown={e=>e.stopPropagation()}><div className="studio-v3-sheet-handle"/><div className="studio-v3-sheet-heading"><div><span className="studio-v3-eyebrow">{t.itemDraft}</span><h2>{t.editItem}</h2></div><button className="studio-v3-icon-button" onClick={()=>setDraftItem(null)}>×</button></div><div className="studio-v3-content-language-row modal"><span>{t.contentLanguage}</span><div className="studio-v3-language-switch">{menuLanguages.map(code=><button key={code} className={contentLanguage===code?"active":""} onClick={()=>setContentLanguage(code)}>{code.toUpperCase()}</button>)}</div></div><label className="studio-v3-field">{t.name}<input value={draftItem.name?.[contentLanguage]||""} onChange={e=>setDraftItem(item=>({...item,name:{...item.name,[contentLanguage]:e.target.value}}))}/></label><label className="studio-v3-field">{t.description}<textarea rows="3" value={draftItem.description?.[contentLanguage]||""} onChange={e=>setDraftItem(item=>({...item,description:{...item.description,[contentLanguage]:e.target.value}}))}/></label>{!draftItem.price_options?.length ? <label className="studio-v3-field">{t.price}<input value={draftItem.price||""} onChange={e=>setDraftItem(item=>({...item,price:e.target.value}))}/></label> : null}<div className="studio-v3-badge-editor"><div className="studio-v3-badge-head"><strong>{t.merchandising}</strong><span>{t.ownerConfirmed}</span></div><div className="studio-v3-badge-grid studio-v3-merch-grid">{MENU_MERCHANDISING_BADGES.map(key=><button key={key} className={draftItem.metadata?.merchandising?.includes(key)?"active":""} onClick={()=>toggleBadge("merchandising",key)}>{BADGE_LABELS[key]?.[studioLanguage]||BADGE_LABELS[key]?.en}</button>)}</div><div className="studio-v3-badge-head"><strong>{t.dietary}</strong><span>{t.ownerConfirmed}</span></div><div className="studio-v3-badge-grid">{MENU_DIETARY_BADGES.map(key=><button key={key} className={draftItem.metadata?.dietary?.includes(key)?"active":""} onClick={()=>toggleBadge("dietary",key)}>{BADGE_LABELS[key]?.[studioLanguage]||BADGE_LABELS[key]?.en}</button>)}{MENU_ALLERGENS.map(key=><button key={key} className={draftItem.metadata?.allergens?.includes(key)?"active":""} onClick={()=>toggleBadge("allergens",key)}>{BADGE_LABELS[key]?.[studioLanguage]||BADGE_LABELS[key]?.en}</button>)}</div><label className="studio-v3-field">{t.spiceLevel}<select value={draftItem.metadata?.spice||"none"} onChange={e=>setDraftItem(item=>({...item,metadata:{...item.metadata,spice:e.target.value,reviewedByOwner:true}}))}>{MENU_SPICE_LEVELS.map(key=><option key={key} value={key}>{key==="none"?t.notSpicy:(BADGE_LABELS[key]?.[studioLanguage]||BADGE_LABELS[key]?.en)}</option>)}</select></label><div className="studio-v3-ai-suggestion-note"><strong>{t.aiSuggestions}</strong><span>{t.aiNote}</span></div></div><div className="studio-v3-sheet-footer"><button className="studio-v3-secondary" onClick={()=>setDraftItem(null)}>{t.cancel}</button><button className="studio-v3-primary" onClick={saveItemLocally}>{t.applyDraft}</button></div></section></div>}

      {publishCheck ? <div className="studio-v3-modal-backdrop" onMouseDown={()=>setPublishCheck(null)}><section className="studio-v3-publish-review" onMouseDown={e=>e.stopPropagation()}><span className={`studio-v3-publish-check ${publishCheck.ok ? "ok" : "error"}`}>{publishCheck.ok ? "✓" : "!"}</span><h2>{t.publishTitle}</h2><strong>{publishCheck.ok ? t.publishReady : t.publishBlocked}</strong>{publishCheck.ok ? <p>{t.publishNote}</p> : <p>{publishCheck.errors?.join(" · ")}</p>}<button onClick={()=>setPublishCheck(null)}>{t.close}</button></section></div> : null}
    </div>
  );
}
