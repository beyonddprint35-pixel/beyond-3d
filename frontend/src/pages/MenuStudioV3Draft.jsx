import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { loadPublishedMenuBySlug } from "../features/menu-engine/data/menuRepository";
import { createMenuDraftSession, updateDraftDesign, updateDraftMenu } from "../features/menu-engine/studio/draftSession";
import { MENU_ALLERGENS, MENU_DIETARY_BADGES, MENU_SPICE_LEVELS, BADGE_LABELS } from "../features/menu-engine/domain/itemMetadata";
import "./MenuStudioV3Dev.css";
import "./MenuStudioV3Draft.css";

const UI = {
  en: {
    content: "Content", design: "Design", preview: "Preview", settings: "Settings",
    categories: "Categories", category: "Category", items: "items", visible: "Visible", hidden: "Hidden",
    hide: "Hide", show: "Show", edit: "Edit", back: "Categories", noDescription: "No description",
    realDraft: "REAL CONTENT · LOCAL DRAFT", designDraft: "DESIGN · DRAFT ONLY", makeItYours: "Make it yours",
    designHint: "Changes update the preview instantly and stay local.", classic: "Classic", visual: "Visual",
    classicHint: "No photos required", visualHint: "Image-led cards", colors: "Colors", typography: "Typography", layout: "Layout",
    accent: "Accent", background: "Background", itemName: "Item name", cardRadius: "Card radius",
    liveDraftPreview: "LIVE DRAFT PREVIEW", restaurant: "Restaurant", menuUrl: "Menu URL", languages: "Menu languages",
    menuSettings: "Menu settings", safety: "Publishing is disabled in this milestone. Nothing on this screen writes to Supabase.",
    itemDraft: "ITEM · LOCAL DRAFT", editItem: "Edit item", name: "Name", description: "Description", price: "Price",
    dietary: "Dietary & allergen badges", ownerConfirmed: "Owner-confirmed only", spiceLevel: "Spice level", notSpicy: "Not spicy",
    aiSuggestions: "AI badge suggestions", aiNote: "AI may suggest likely badges from the name and description, but the restaurant must confirm them before they appear publicly.",
    cancel: "Cancel", applyDraft: "Apply to draft", liveLoaded: "LIVE DATA LOADED", unsaved: "UNSAVED DRAFT", noWrites: "NO WRITES",
    ownerLanguage: "Studio language", contentLanguage: "Menu content language", loading: "Loading real menu into a safe draft…",
  },
  he: {
    content: "תוכן", design: "עיצוב", preview: "תצוגה מקדימה", settings: "הגדרות",
    categories: "קטגוריות", category: "קטגוריה", items: "פריטים", visible: "גלוי", hidden: "מוסתר",
    hide: "הסתר", show: "הצג", edit: "עריכה", back: "קטגוריות", noDescription: "ללא תיאור",
    realDraft: "תוכן אמיתי · טיוטה מקומית", designDraft: "עיצוב · טיוטה בלבד", makeItYours: "עצבו את התפריט",
    designHint: "השינויים מתעדכנים מיד בתצוגה ונשארים מקומיים.", classic: "קלאסי", visual: "ויזואלי",
    classicHint: "לא דורש תמונות", visualHint: "כרטיסים מבוססי תמונה", colors: "צבעים", typography: "טיפוגרפיה", layout: "פריסה",
    accent: "צבע מוביל", background: "רקע", itemName: "שם פריט", cardRadius: "עיגול כרטיס",
    liveDraftPreview: "תצוגה חיה של הטיוטה", restaurant: "מסעדה", menuUrl: "כתובת התפריט", languages: "שפות התפריט",
    menuSettings: "הגדרות תפריט", safety: "הפרסום מושבת בשלב הזה. שום דבר במסך הזה לא נכתב ל-Supabase.",
    itemDraft: "פריט · טיוטה מקומית", editItem: "עריכת פריט", name: "שם", description: "תיאור", price: "מחיר",
    dietary: "תגי תזונה ואלרגנים", ownerConfirmed: "באישור בעל העסק בלבד", spiceLevel: "רמת חריפות", notSpicy: "לא חריף",
    aiSuggestions: "הצעות תגיות AI", aiNote: "ה-AI יכול להציע תגיות לפי שם ותיאור הפריט, אך בעל העסק חייב לאשר אותן לפני שיופיעו לציבור.",
    cancel: "ביטול", applyDraft: "החל על הטיוטה", liveLoaded: "נתונים חיים נטענו", unsaved: "טיוטה לא נשמרה", noWrites: "ללא כתיבה",
    ownerLanguage: "שפת הסטודיו", contentLanguage: "שפת תוכן התפריט", loading: "טוען את התפריט האמיתי לטיוטה בטוחה…",
  },
  ar: {
    content: "المحتوى", design: "التصميم", preview: "المعاينة", settings: "الإعدادات",
    categories: "الفئات", category: "الفئة", items: "عناصر", visible: "ظاهر", hidden: "مخفي",
    hide: "إخفاء", show: "إظهار", edit: "تعديل", back: "الفئات", noDescription: "لا يوجد وصف",
    realDraft: "محتوى حقيقي · مسودة محلية", designDraft: "التصميم · مسودة فقط", makeItYours: "صمّم قائمتك",
    designHint: "تظهر التغييرات فورًا في المعاينة وتبقى محلية.", classic: "كلاسيكي", visual: "مرئي",
    classicHint: "لا يحتاج صورًا", visualHint: "بطاقات تعتمد على الصور", colors: "الألوان", typography: "الخطوط", layout: "التخطيط",
    accent: "اللون الرئيسي", background: "الخلفية", itemName: "اسم العنصر", cardRadius: "استدارة البطاقة",
    liveDraftPreview: "معاينة مباشرة للمسودة", restaurant: "المطعم", menuUrl: "رابط القائمة", languages: "لغات القائمة",
    menuSettings: "إعدادات القائمة", safety: "النشر معطّل في هذه المرحلة. لا يتم حفظ أي شيء في Supabase من هذه الشاشة.",
    itemDraft: "عنصر · مسودة محلية", editItem: "تعديل العنصر", name: "الاسم", description: "الوصف", price: "السعر",
    dietary: "شارات الحمية والحساسية", ownerConfirmed: "بتأكيد صاحب المطعم فقط", spiceLevel: "درجة الحدة", notSpicy: "غير حار",
    aiSuggestions: "اقتراحات شارات بالذكاء الاصطناعي", aiNote: "يمكن للذكاء الاصطناعي اقتراح شارات اعتمادًا على الاسم والوصف، لكن يجب على المطعم تأكيدها قبل ظهورها للعامة.",
    cancel: "إلغاء", applyDraft: "تطبيق على المسودة", liveLoaded: "تم تحميل البيانات", unsaved: "مسودة غير محفوظة", noWrites: "بدون حفظ",
    ownerLanguage: "لغة الاستوديو", contentLanguage: "لغة محتوى القائمة", loading: "جارٍ تحميل القائمة الحقيقية إلى مسودة آمنة…",
  },
};

function textFor(value, language) {
  return value?.[language] || value?.en || value?.he || value?.ar || "";
}

function priceText(item) {
  if (item.price_options?.length) return item.price_options.map(option => option.price).filter(Boolean).join(" / ");
  return item.price || "";
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

  const t = UI[studioLanguage];
  const studioRtl = studioLanguage === "he" || studioLanguage === "ar";

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadPublishedMenuBySlug(slug)
      .then(payload => {
        if (!active) return;
        const next = createMenuDraftSession(payload);
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
          <div><strong>Menu Studio V3</strong><span>{menu.restaurant_name} · real data draft</span></div>
        </div>
        <div className="studio-v3-top-actions">
          <div className="studio-v3-language-switch" aria-label={t.ownerLanguage}>
            {["en","he","ar"].map(code => <button key={code} className={studioLanguage===code?"active":""} onClick={()=>setStudioLanguage(code)}>{code.toUpperCase()}</button>)}
          </div>
          <div className="studio-v3-draft-status">
            <span className={session.dirty ? "dirty" : "clean"}>{session.dirty ? t.unsaved : t.liveLoaded}</span>
            <span className="studio-v3-live">{t.noWrites}</span>
          </div>
        </div>
      </header>

      <nav className="studio-v3-tabs">
        {["content","design","preview","settings"].map(key => (
          <button key={key} className={tab===key?"active":""} onClick={()=>{setTab(key);setMobileDetail(false);}}>{t[key]}</button>
        ))}
      </nav>

      <main className="studio-v3-main">
        {tab === "content" && (
          <div className={`studio-v3-content-layout ${mobileDetail ? "mobile-detail" : ""}`}>
            <section className="studio-v3-panel studio-v3-categories">
              <div className="studio-v3-panel-heading">
                <div><span className="studio-v3-eyebrow">{t.realDraft}</span><h1>{t.categories}</h1></div>
              </div>
              <div className="studio-v3-content-language-row">
                <span>{t.contentLanguage}</span>
                <div className="studio-v3-language-switch">
                  {menuLanguages.map(code => <button key={code} className={contentLanguage===code?"active":""} onClick={()=>setContentLanguage(code)}>{code.toUpperCase()}</button>)}
                </div>
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
              <div className="studio-v3-template-grid">
                {["classic","visual"].map(template => <button key={template} className={session.design.template===template?"active":""} onClick={()=>patchDesign(current=>({...current,template}))}><strong>{template==="classic"?t.classic:t.visual}</strong><span>{template==="classic"?t.classicHint:t.visualHint}</span></button>)}
              </div>
              <div className="studio-v3-design-tabs">
                {["colors","type","layout"].map(key => <button key={key} className={designPanel===key?"active":""} onClick={()=>setDesignPanel(key)}>{key==="colors"?t.colors:key==="type"?t.typography:t.layout}</button>)}
              </div>
              {designPanel === "colors" && <><label className="studio-v3-color-field"><span>{t.accent}</span><input type="color" value={session.design.theme.accent} onChange={e=>patchDesign(current=>({...current,theme:{...current.theme,accent:e.target.value}}))}/></label><label className="studio-v3-color-field"><span>{t.background}</span><input type="color" value={session.design.theme.background} onChange={e=>patchDesign(current=>({...current,theme:{...current.theme,background:e.target.value}}))}/></label></>}
              {designPanel === "type" && <label className="studio-v3-range-field"><span>{t.itemName} <b>{session.design.typography.itemNameSize}px</b></span><input type="range" min="13" max="22" value={session.design.typography.itemNameSize} onChange={e=>patchDesign(current=>({...current,typography:{...current.typography,itemNameSize:Number(e.target.value)}}))}/></label>}
              {designPanel === "layout" && <label className="studio-v3-range-field"><span>{t.cardRadius} <b>{session.design.layout.cardRadius}px</b></span><input type="range" min="0" max="28" value={session.design.layout.cardRadius} onChange={e=>patchDesign(current=>({...current,layout:{...current.layout,cardRadius:Number(e.target.value)}}))}/></label>}
            </section>
            <section className="studio-v3-preview-panel"><div className="studio-v3-preview-label">{t.liveDraftPreview} · 390PX</div><div className="studio-v3-phone-canvas"><MenuRenderer menu={previewMenu} design={session.design}/></div></section>
          </div>
        )}

        {tab === "preview" && <section className="studio-v3-preview-full"><div className="studio-v3-preview-switcher">{["320","375","390","430","desktop"].map(size=><button key={size} className={viewport===size?"active":""} onClick={()=>setViewport(size)}>{size==="desktop"?"Desktop":size}</button>)}</div><div className="studio-v3-draft-preview-frame" style={{width:frameWidth}}><MenuRenderer menu={previewMenu} design={session.design}/></div></section>}

        {tab === "settings" && <section className="studio-v3-panel studio-v3-settings-panel"><span className="studio-v3-eyebrow">{t.settings}</span><h1>{t.menuSettings}</h1><div className="studio-v3-setting-row"><span>{t.restaurant}</span><span>{menu.restaurant_name}</span></div><div className="studio-v3-setting-row"><span>{t.menuUrl}</span><span>/menu/{menu.slug}</span></div><div className="studio-v3-setting-row"><span>{t.languages}</span><span>{menuLanguages.join(" + ").toUpperCase()}</span></div><div className="studio-v3-safety-note">{t.safety}</div></section>}
      </main>

      {draftItem && (
        <div className="studio-v3-modal-backdrop" onMouseDown={()=>{setDraftItem(null);setEditingItemId(null);}}>
          <section className="studio-v3-editor-sheet" onMouseDown={e=>e.stopPropagation()}>
            <div className="studio-v3-sheet-handle"/><div className="studio-v3-sheet-heading"><div><span className="studio-v3-eyebrow">{t.itemDraft}</span><h2>{t.editItem}</h2></div><button className="studio-v3-icon-button" onClick={()=>setDraftItem(null)}>×</button></div>
            <div className="studio-v3-content-language-row modal"><span>{t.contentLanguage}</span><div className="studio-v3-language-switch">{menuLanguages.map(code=><button key={code} className={contentLanguage===code?"active":""} onClick={()=>setContentLanguage(code)}>{code.toUpperCase()}</button>)}</div></div>
            <label className="studio-v3-field">{t.name}<input value={draftItem.name?.[contentLanguage]||""} onChange={e=>setDraftItem(item=>({...item,name:{...item.name,[contentLanguage]:e.target.value}}))}/></label>
            <label className="studio-v3-field">{t.description}<textarea rows="3" value={draftItem.description?.[contentLanguage]||""} onChange={e=>setDraftItem(item=>({...item,description:{...item.description,[contentLanguage]:e.target.value}}))}/></label>
            {!draftItem.price_options?.length ? <label className="studio-v3-field">{t.price}<input value={draftItem.price||""} onChange={e=>setDraftItem(item=>({...item,price:e.target.value}))}/></label> : null}
            <div className="studio-v3-badge-editor"><div className="studio-v3-badge-head"><strong>{t.dietary}</strong><span>{t.ownerConfirmed}</span></div><div className="studio-v3-badge-grid">{MENU_DIETARY_BADGES.map(key=><button key={key} className={draftItem.metadata?.dietary?.includes(key)?"active":""} onClick={()=>toggleBadge("dietary",key)}>{BADGE_LABELS[key]?.[studioLanguage]||BADGE_LABELS[key]?.en}</button>)}{MENU_ALLERGENS.map(key=><button key={key} className={draftItem.metadata?.allergens?.includes(key)?"active":""} onClick={()=>toggleBadge("allergens",key)}>{BADGE_LABELS[key]?.[studioLanguage]||BADGE_LABELS[key]?.en}</button>)}</div><label className="studio-v3-field">{t.spiceLevel}<select value={draftItem.metadata?.spice||"none"} onChange={e=>setDraftItem(item=>({...item,metadata:{...item.metadata,spice:e.target.value,reviewedByOwner:true}}))}>{MENU_SPICE_LEVELS.map(key=><option key={key} value={key}>{key==="none"?t.notSpicy:(BADGE_LABELS[key]?.[studioLanguage]||BADGE_LABELS[key]?.en)}</option>)}</select></label><div className="studio-v3-ai-suggestion-note"><strong>{t.aiSuggestions}</strong><span>{t.aiNote}</span></div></div>
            <div className="studio-v3-sheet-footer"><button className="studio-v3-secondary" onClick={()=>setDraftItem(null)}>{t.cancel}</button><button className="studio-v3-primary" onClick={saveItemLocally}>{t.applyDraft}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
