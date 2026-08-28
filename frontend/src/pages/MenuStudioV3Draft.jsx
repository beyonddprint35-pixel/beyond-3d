import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import MenuDesignControls from "../features/menu-engine/studio/MenuDesignControls";
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
import {
  MENU_ALLERGENS,
  MENU_DIETARY_BADGES,
  MENU_MERCHANDISING_BADGES,
  MENU_SPICE_LEVELS,
  BADGE_LABELS,
} from "../features/menu-engine/domain/itemMetadata";
import "./MenuStudioV3Dev.css";
import "./MenuStudioV3Draft.css";
import "./MenuStudioV3Hierarchy.css";

const UI = {
  en: {
    content:"Content", design:"Design", preview:"Preview", analytics:"Analytics", settings:"Settings",
    categories:"Categories", category:"Category", subcategory:"Subcategory", items:"items", visible:"Visible", hidden:"Hidden",
    edit:"Edit", back:"Categories", noDescription:"No description", addCategory:"Add category", addSubcategory:"Add subcategory",
    addItem:"Add item", add:"Add", groupName:"Category / subcategory name", moveUp:"Move up", moveDown:"Move down", delete:"Delete",
    deleteItemConfirm:"Delete this item?", deleteGroupConfirm:"Delete this category/subcategory and everything inside it?", shown:"Shown", hiddenStatus:"Hidden",
    realDraft:"MENU CONTENT", designDraft:"DESIGN", makeItYours:"Make it yours", designHint:"Changes update the preview instantly and save automatically.",
    classic:"Classic", visual:"Visual", classicHint:"No photos required", visualHint:"Image-led cards", badges:"Badges", showBadgeSymbols:"Badge symbols",
    withSymbols:"Icon + text", textOnly:"Text only", badgeStyle:"Icon style", autoStyle:"Auto", minimalStyle:"Minimal", filledStyle:"Filled",
    playfulStyle:"Playful", autoStyleHint:"Automatically follows the selected menu template.", liveDraftPreview:"LIVE PREVIEW", restaurant:"Restaurant",
    menuUrl:"Menu URL", languages:"Menu languages", menuSettings:"Menu settings", safety:"Changes are saved automatically. They become visible to customers only when you publish.",
    itemDraft:"ITEM", editItem:"Edit item", name:"Name", description:"Description", price:"Price", prices:"Prices", currencyHint:"Currency is added automatically",
    optionLabel:"Price type", addPrice:"Add price type", addAnotherPrice:"Add another price", singlePrice:"Use single price", removePrice:"Remove",
    priceTypeHint:"Shot, Glass, Bottle, Small, Large…", dietary:"Dietary & allergen badges", merchandising:"Highlights & merchandising",
    ownerConfirmed:"Owner-confirmed only", spiceLevel:"Spice level", notSpicy:"Not spicy", aiSuggestions:"AI badge suggestions",
    aiNote:"AI may suggest likely badges from the name and description, but the restaurant must confirm them before they appear publicly.",
    cancel:"Cancel", applyDraft:"Done", saving:"Saving…", allSaved:"All changes saved", publish:"Publish", ownerLanguage:"Studio language",
    contentLanguage:"Menu content language", loading:"Loading your menu…", publishTitle:"Publish changes?", publishReady:"Ready to publish",
    publishBlocked:"Something needs attention", publishNote:"Your saved changes will become visible on your live menu. You can restore an earlier version anytime.",
    close:"Close", analyticsTitle:"Menu performance", analyticsEyebrow:"ANALYTICS · PRIVACY-FIRST",
    analyticsHint:"This dashboard is ready for real anonymous menu activity. No synthetic numbers are shown.", trackingNotConnected:"Analytics not active yet",
    trackingNote:"When analytics is enabled, this view will show real behavior from your published menu.", menuViews:"Menu views", categoryViews:"Category views",
    itemImpressions:"Item impressions", itemOpens:"Item opens", topCategories:"Top categories", topItems:"Top items", engagement:"Engagement",
    recommendations:"Smart recommendations", noData:"No analytics data yet", noDataHint:"This will start filling automatically when analytics is enabled.",
    recommendationHint:"Buddy will compare impressions, opens, position and category reach to suggest what to move, feature or mark as Popular / Chef’s Choice.",
    waitingEvents:"Waiting for real activity", expand:"Expand subcategories", collapse:"Collapse subcategories",
  },
  he: {
    content:"תוכן", design:"עיצוב", preview:"תצוגה מקדימה", analytics:"אנליטיקה", settings:"הגדרות",
    categories:"קטגוריות", category:"קטגוריה", subcategory:"תת-קטגוריה", items:"פריטים", visible:"גלוי", hidden:"מוסתר", edit:"עריכה",
    back:"קטגוריות", noDescription:"ללא תיאור", addCategory:"הוספת קטגוריה", addSubcategory:"הוספת תת-קטגוריה", addItem:"הוספת פריט", add:"הוסף",
    groupName:"שם קטגוריה / תת-קטגוריה", moveUp:"הזז למעלה", moveDown:"הזז למטה", delete:"מחיקה", deleteItemConfirm:"למחוק את הפריט?",
    deleteGroupConfirm:"למחוק את הקטגוריה/תת-הקטגוריה וכל מה שבתוכה?", shown:"מוצג", hiddenStatus:"מוסתר", realDraft:"תוכן התפריט", designDraft:"עיצוב",
    makeItYours:"עצבו את התפריט", designHint:"השינויים מתעדכנים מיד בתצוגה ונשמרים אוטומטית.", classic:"קלאסי", visual:"ויזואלי",
    classicHint:"לא דורש תמונות", visualHint:"כרטיסים מבוססי תמונה", badges:"תגיות", showBadgeSymbols:"סמלים בתגיות", withSymbols:"סמל + טקסט",
    textOnly:"טקסט בלבד", badgeStyle:"סגנון סמלים", autoStyle:"אוטומטי", minimalStyle:"מינימלי", filledStyle:"מלא", playfulStyle:"שובב",
    autoStyleHint:"הסגנון מותאם אוטומטית לתבנית התפריט שנבחרה.", liveDraftPreview:"תצוגה חיה", restaurant:"מסעדה", menuUrl:"כתובת התפריט",
    languages:"שפות התפריט", menuSettings:"הגדרות תפריט", safety:"השינויים נשמרים אוטומטית ויופיעו ללקוחות רק לאחר פרסום.", itemDraft:"פריט",
    editItem:"עריכת פריט", name:"שם", description:"תיאור", price:"מחיר", prices:"מחירים", currencyHint:"סמל המטבע מתווסף אוטומטית",
    optionLabel:"סוג מחיר", addPrice:"הוספת סוג מחיר", addAnotherPrice:"הוספת מחיר נוסף", singlePrice:"מחיר יחיד", removePrice:"הסר",
    priceTypeHint:"צ׳ייסר, כוס, בקבוק, קטן, גדול…", dietary:"תגי תזונה ואלרגנים", merchandising:"הבלטות ושיווק", ownerConfirmed:"באישור בעל העסק בלבד",
    spiceLevel:"רמת חריפות", notSpicy:"לא חריף", aiSuggestions:"הצעות תגיות AI",
    aiNote:"ה-AI יכול להציע תגיות לפי שם ותיאור הפריט, אך בעל העסק חייב לאשר אותן לפני שיופיעו לציבור.", cancel:"ביטול", applyDraft:"סיום",
    saving:"שומר…", allSaved:"כל השינויים נשמרו", publish:"פרסום", ownerLanguage:"שפת הסטודיו", contentLanguage:"שפת תוכן התפריט",
    loading:"טוען את התפריט שלכם…", publishTitle:"לפרסם את השינויים?", publishReady:"מוכן לפרסום", publishBlocked:"יש משהו שדורש תשומת לב",
    publishNote:"השינויים השמורים יהפכו לגלויים בתפריט החי. ניתן לשחזר גרסה קודמת בכל עת.", close:"סגור", analyticsTitle:"ביצועי התפריט",
    analyticsEyebrow:"אנליטיקה · פרטיות תחילה", analyticsHint:"הדשבורד מוכן לפעילות אמיתית ואנונימית מהתפריט. לא מוצגים נתונים מלאכותיים.",
    trackingNotConnected:"האנליטיקה עדיין לא פעילה", trackingNote:"לאחר הפעלת האנליטיקה, המסך יציג שימוש אמיתי בתפריט שפורסם.", menuViews:"צפיות בתפריט",
    categoryViews:"צפיות בקטגוריות", itemImpressions:"חשיפות לפריטים", itemOpens:"פתיחת פריטים", topCategories:"קטגוריות מובילות", topItems:"פריטים מובילים",
    engagement:"מעורבות", recommendations:"המלצות חכמות", noData:"אין עדיין נתוני אנליטיקה", noDataHint:"הנתונים יתחילו להתמלא אוטומטית לאחר הפעלת האנליטיקה.",
    recommendationHint:"Buddy ישווה חשיפות, פתיחות, מיקום והגעה לקטגוריה ויציע מה לקדם, להזיז או לסמן כפופולרי / בחירת השף.", waitingEvents:"ממתין לפעילות אמיתית",
    expand:"פתח תת-קטגוריות", collapse:"סגור תת-קטגוריות",
  },
  ar: {
    content:"المحتوى", design:"التصميم", preview:"المعاينة", analytics:"التحليلات", settings:"الإعدادات", categories:"الفئات", category:"الفئة",
    subcategory:"فئة فرعية", items:"عناصر", visible:"ظاهر", hidden:"مخفي", edit:"تعديل", back:"الفئات", noDescription:"لا يوجد وصف",
    addCategory:"إضافة فئة", addSubcategory:"إضافة فئة فرعية", addItem:"إضافة عنصر", add:"إضافة", groupName:"اسم الفئة / الفئة الفرعية",
    moveUp:"تحريك لأعلى", moveDown:"تحريك لأسفل", delete:"حذف", deleteItemConfirm:"حذف هذا العنصر?", deleteGroupConfirm:"حذف هذه الفئة/الفئة الفرعية وكل ما بداخلها?",
    shown:"ظاهر", hiddenStatus:"مخفي", realDraft:"محتوى القائمة", designDraft:"التصميم", makeItYours:"صمّم قائمتك",
    designHint:"تظهر التغييرات فورًا في المعاينة ويتم حفظها تلقائيًا.", classic:"كلاسيكي", visual:"مرئي", classicHint:"لا يحتاج صورًا",
    visualHint:"بطاقات تعتمد على الصور", badges:"الشارات", showBadgeSymbols:"رموز الشارات", withSymbols:"رمز + نص", textOnly:"نص فقط",
    badgeStyle:"نمط الرموز", autoStyle:"تلقائي", minimalStyle:"بسيط", filledStyle:"ممتلئ", playfulStyle:"مرح", autoStyleHint:"يتم اختيار النمط تلقائيًا ليتناسب مع قالب القائمة.",
    liveDraftPreview:"معاينة مباشرة", restaurant:"المطعم", menuUrl:"رابط القائمة", languages:"لغات القائمة", menuSettings:"إعدادات القائمة",
    safety:"يتم حفظ التغييرات تلقائيًا ولن تظهر للعملاء إلا بعد النشر.", itemDraft:"عنصر", editItem:"تعديل العنصر", name:"الاسم", description:"الوصف",
    price:"السعر", prices:"الأسعار", currencyHint:"تتم إضافة رمز العملة تلقائيًا", optionLabel:"نوع السعر", addPrice:"إضافة نوع سعر",
    addAnotherPrice:"إضافة سعر آخر", singlePrice:"سعر واحد", removePrice:"إزالة", priceTypeHint:"جرعة، كأس، زجاجة، صغير، كبير…",
    dietary:"شارات الحمية والحساسية", merchandising:"إبراز وتسويق العناصر", ownerConfirmed:"بتأكيد صاحب المطعم فقط", spiceLevel:"درجة الحدة",
    notSpicy:"غير حار", aiSuggestions:"اقتراحات شارات بالذكاء الاصطناعي", aiNote:"يمكن للذكاء الاصطناعي اقتراح شارات اعتمادًا على الاسم والوصف، لكن يجب على المطعم تأكيدها قبل ظهورها للعامة.",
    cancel:"إلغاء", applyDraft:"تم", saving:"جارٍ الحفظ…", allSaved:"تم حفظ جميع التغييرات", publish:"نشر", ownerLanguage:"لغة الاستوديو",
    contentLanguage:"لغة محتوى القائمة", loading:"جارٍ تحميل قائمتك…", publishTitle:"نشر التغييرات?", publishReady:"جاهز للنشر",
    publishBlocked:"هناك شيء يحتاج إلى الانتباه", publishNote:"ستصبح التغييرات المحفوظة ظاهرة في القائمة المباشرة. يمكنك استعادة إصدار سابق في أي وقت.",
    close:"إغلاق", analyticsTitle:"أداء القائمة", analyticsEyebrow:"التحليلات · الخصوصية أولًا", analyticsHint:"لوحة التحليلات جاهزة لنشاط حقيقي ومجهول الهوية. لا نعرض أرقامًا مصطنعة.",
    trackingNotConnected:"التحليلات غير مفعلة بعد", trackingNote:"بعد تفعيل التحليلات ستعرض هذه الصفحة الاستخدام الحقيقي للقائمة المنشورة.",
    menuViews:"مشاهدات القائمة", categoryViews:"مشاهدات الفئات", itemImpressions:"ظهور العناصر", itemOpens:"فتح العناصر", topCategories:"أفضل الفئات",
    topItems:"أفضل العناصر", engagement:"التفاعل", recommendations:"توصيات ذكية", noData:"لا توجد بيانات تحليلات بعد",
    noDataHint:"ستبدأ البيانات بالظهور تلقائيًا بعد تفعيل التحليلات.", recommendationHint:"سيحلل Buddy الظهور والفتح والموقع والوصول للفئات ليقترح ما يجب تقديمه أو نقله أو تمييزه كشائع / اختيار الشيف.",
    waitingEvents:"بانتظار نشاط حقيقي", expand:"فتح الفئات الفرعية", collapse:"إغلاق الفئات الفرعية",
  },
};

const CURRENCY_SYMBOL = "₪";
const PRICE_TYPE_SUGGESTIONS = {
  en:["Shot","Glass","Bottle","Small","Large","250 ml","330 ml","500 ml","1 L"],
  he:["צ׳ייסר","כוס","בקבוק","קטן","גדול","250 מ״ל","330 מ״ל","500 מ״ל","1 ל׳"],
  ar:["جرعة","كأس","زجاجة","صغير","كبير","250 مل","330 مل","500 مل","1 لتر"],
};
const textFor = (value, language) => value?.[language] || value?.en || value?.he || value?.ar || "";
const cleanPrice = value => String(value ?? "").replace(/₪/g, "").replace(/\b(?:ILS|NIS)\b/gi, "").trim();
const displayPrice = (value, symbol = CURRENCY_SYMBOL) => { const clean = cleanPrice(value); return clean ? `${symbol}${clean}` : ""; };
const priceText = (item, symbol = CURRENCY_SYMBOL) => item.price_options?.length
  ? item.price_options.map(option => displayPrice(option.price, symbol)).filter(Boolean).join(" / ")
  : displayPrice(item.price, symbol);
const draftId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emptyLanguageText = (language, value = "") => ({ en:"", he:"", ar:"", [language]:value });

function groupChildren(groups, parentId) {
  return groups.filter(group => (group.parent_id || null) === (parentId || null)).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}
function visibleGroupRows(groups, expandedIds) {
  const rows = []; const seen = new Set(); const expanded = new Set(expandedIds);
  const visit = (group, depth) => { if (!group || seen.has(group.id)) return; seen.add(group.id); rows.push({ group, depth }); if (expanded.has(group.id)) groupChildren(groups, group.id).forEach(child => visit(child, depth + 1)); };
  groupChildren(groups, null).forEach(group => visit(group, 0)); return rows;
}
function collectGroupBranch(groups, rootId) {
  const ids = new Set([rootId]); let changed = true;
  while (changed) { changed = false; groups.forEach(group => { if (group.parent_id && ids.has(group.parent_id) && !ids.has(group.id)) { ids.add(group.id); changed = true; } }); }
  return ids;
}
function branchItemCount(groups, items, groupId) { const ids = collectGroupBranch(groups, groupId); return items.filter(item => ids.has(item.group_id)).length; }
function groupDepth(groups, groupId) {
  const map = new Map(groups.map(group => [group.id, group])); let depth = 0; let current = map.get(groupId); const seen = new Set();
  while (current?.parent_id && map.has(current.parent_id) && !seen.has(current.id)) { seen.add(current.id); depth += 1; current = map.get(current.parent_id); }
  return depth;
}
function contentBlocksForGroup(groups, items, rootId) {
  const blocks = []; const seen = new Set();
  const visit = (group, depth) => { if (!group || seen.has(group.id)) return; seen.add(group.id); blocks.push({ group, depth, items:items.filter(item => item.group_id === group.id).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)) }); groupChildren(groups, group.id).forEach(child => visit(child, depth + 1)); };
  visit(groups.find(group => group.id === rootId), 0); return blocks;
}
function reorderSiblingGroups(groups, id, direction) {
  const target = groups.find(group => group.id === id); if (!target) return groups; const siblings = groupChildren(groups, target.parent_id || null);
  const index = siblings.findIndex(group => group.id === id); const next = index + direction; if (index < 0 || next < 0 || next >= siblings.length) return groups;
  const reordered = [...siblings]; [reordered[index], reordered[next]] = [reordered[next], reordered[index]]; const order = new Map(reordered.map((group,i) => [group.id, i + 1]));
  return groups.map(group => order.has(group.id) ? { ...group, sort_order:order.get(group.id) } : group);
}
function reorderItems(items, id, direction) {
  const target = items.find(item => item.id === id); if (!target) return items; const siblings = items.filter(item => item.group_id === target.group_id).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const index = siblings.findIndex(item => item.id === id); const next = index + direction; if (index < 0 || next < 0 || next >= siblings.length) return items;
  const reordered = [...siblings]; [reordered[index], reordered[next]] = [reordered[next], reordered[index]]; const order = new Map(reordered.map((item,i) => [item.id, i + 1]));
  return items.map(item => order.has(item.id) ? { ...item, sort_order:order.get(item.id) } : item);
}
function VisibilityToggle({ visible, onChange, t }) {
  const shown = visible !== false;
  return <button type="button" role="switch" aria-checked={shown} aria-label={shown ? t.shown : t.hiddenStatus} title={shown ? t.shown : t.hiddenStatus} className={`studio-v3-visibility-toggle ${shown ? "visible" : "hidden"}`} onClick={onChange}/>;
}
function EmptyMetric({ label, waitingLabel }) { return <article className="studio-v3-analytics-metric"><span>{label}</span><strong>—</strong><small>{waitingLabel}</small></article>; }

function PriceEditor({ item, setItem, t, currencySymbol, language }) {
  const options = Array.isArray(item.price_options) ? item.price_options : [];
  const suggestions = PRICE_TYPE_SUGGESTIONS[language] || PRICE_TYPE_SUGGESTIONS.en;
  const labelKey = `label_${language}`;
  function addPriceType() {
    setItem(current => {
      const currentOptions = Array.isArray(current.price_options) ? current.price_options : [];
      if (currentOptions.length) return { ...current, price_options:[...currentOptions, { label:"", label_en:"", label_he:"", label_ar:"", price:"" }] };
      return { ...current, price:"", price_options:[
        { label:"", label_en:"", label_he:"", label_ar:"", price:cleanPrice(current.price) },
        { label:"", label_en:"", label_he:"", label_ar:"", price:"" },
      ] };
    });
  }
  function removePrice(index) { setItem(current => ({ ...current, price_options:(current.price_options || []).filter((_,i) => i !== index) })); }
  function useSinglePrice() { setItem(current => ({ ...current, price:cleanPrice(current.price_options?.[0]?.price || ""), price_options:[] })); }
  if (!options.length) return <div className="studio-v3-price-options-editor">
    <label className="studio-v3-field studio-v3-price-field"><span className="studio-v3-field-label-row"><span>{t.price}</span><small>{t.currencyHint}</small></span><span className="studio-v3-money-input"><span aria-hidden="true">{currencySymbol}</span><input inputMode="decimal" value={cleanPrice(item.price)} onChange={e => setItem(current => ({ ...current, price:cleanPrice(e.target.value) }))}/></span></label>
    <div className="studio-v3-price-mode-actions"><button type="button" onClick={addPriceType}>+ {t.addPrice}</button></div>
  </div>;
  return <div className="studio-v3-price-options-editor"><div className="studio-v3-field-label-row"><strong>{t.prices}</strong><small>{t.currencyHint}</small></div>{options.map((option,index) => {
    const listId = `price-types-${language}-${index}`; const localized = option[labelKey] || option.label || "";
    return <div className="studio-v3-price-option-edit" key={`price-${index}`}><label className="studio-v3-field compact studio-v3-price-type-input"><span>{t.optionLabel}</span><input list={listId} placeholder={t.priceTypeHint} value={localized} onChange={e => setItem(current => ({ ...current, price_options:current.price_options.map((row,i) => i === index ? { ...row, [labelKey]:e.target.value, label:row.label || e.target.value } : row) }))}/><datalist id={listId}>{suggestions.map(value => <option value={value} key={value}/>)}</datalist></label><label className="studio-v3-field compact"><span>{t.price}</span><span className="studio-v3-money-input"><span aria-hidden="true">{currencySymbol}</span><input inputMode="decimal" value={cleanPrice(option.price)} onChange={e => setItem(current => ({ ...current, price_options:current.price_options.map((row,i) => i === index ? { ...row, price:cleanPrice(e.target.value) } : row) }))}/></span></label><button className="studio-v3-price-remove" type="button" onClick={() => removePrice(index)}>{t.removePrice}</button></div>;
  })}<div className="studio-v3-price-mode-actions"><button type="button" onClick={addPriceType}>+ {t.addAnotherPrice}</button><button type="button" onClick={useSinglePrice}>{t.singlePrice}</button></div></div>;
}

export default function MenuStudioV3Draft() {
  const [params] = useSearchParams();
  const slug = params.get("slug") || "el-puerto";
  const [status,setStatus] = useState("loading");
  const [error,setError] = useState("");
  const [session,setSession] = useState(null);
  const [tab,setTab] = useState("content");
  const [selectedGroupId,setSelectedGroupId] = useState("");
  const [expandedGroupIds,setExpandedGroupIds] = useState([]);
  const [editingItemId,setEditingItemId] = useState(null);
  const [draftItem,setDraftItem] = useState(null);
  const [mobileDetail,setMobileDetail] = useState(false);
  const [viewport,setViewport] = useState("390");
  const [designPanel,setDesignPanel] = useState("brand");
  const [studioLanguage,setStudioLanguage] = useState("en");
  const [contentLanguage,setContentLanguage] = useState("he");
  const [publishCheck,setPublishCheck] = useState(null);
  const [groupCreator,setGroupCreator] = useState(null);
  const t = UI[studioLanguage];
  const studioRtl = studioLanguage === "he" || studioLanguage === "ar";

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadPublishedMenuBySlug(slug).then(payload => {
      if (!active) return;
      const base = createMenuDraftSession(payload);
      const saved = findSavedDraftSession(base);
      const next = saved ? restoreSavedDraftSession(base, saved) : base;
      const first = next.menu.groups.find(group => !group.parent_id) || next.menu.groups[0];
      setSession(next); setSelectedGroupId(first?.id || ""); setExpandedGroupIds([]);
      setContentLanguage(next.menu.default_language || next.menu.languages?.[0] || "en"); setStatus("ready");
    }).catch(err => { if (!active) return; setError(err?.message || "Could not load menu."); setStatus("error"); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!session?.dirty) return undefined;
    const timer = window.setTimeout(() => setSession(current => current?.dirty ? saveDraftSessionLocally(current) : current), 650);
    return () => window.clearTimeout(timer);
  }, [session?.dirty, session?.menu, session?.design]);

  const menu = session?.menu;
  const currencySymbol = menu?.currency_symbol || CURRENCY_SYMBOL;
  const groupRows = useMemo(() => visibleGroupRows(menu?.groups || [], expandedGroupIds), [menu?.groups, expandedGroupIds]);
  const selectedGroup = menu?.groups?.find(group => group.id === selectedGroupId) || menu?.groups?.find(group => !group.parent_id) || null;
  const selectedDepth = selectedGroup ? groupDepth(menu?.groups || [], selectedGroup.id) : 0;
  const selectedBlocks = useMemo(() => selectedGroup ? contentBlocksForGroup(menu?.groups || [], menu?.items || [], selectedGroup.id) : [], [menu?.groups, menu?.items, selectedGroup?.id]);
  const frameWidth = viewport === "desktop" ? "min(1080px,100%)" : `${viewport}px`;
  const previewMenu = useMemo(() => menu ? { ...menu, currency:menu.currency || "ILS", currency_symbol:menu.currency_symbol || CURRENCY_SYMBOL, default_language:contentLanguage, groups:menu.groups, items:menu.items.filter(item => item.visible !== false) } : null, [menu, contentLanguage]);

  function patchMenu(updater) { setSession(current => updateDraftMenu(current, updater)); }
  function patchDesign(updater) { setSession(current => updateDraftDesign(current, updater)); }
  function openItem(item) { setEditingItemId(item.id); setDraftItem({ ...JSON.parse(JSON.stringify(item)), __contentLanguage:contentLanguage }); }
  function saveItemLocally() { if (!draftItem) return; const { __contentLanguage, ...cleanItem } = draftItem; patchMenu(current => ({ ...current, items:current.items.map(item => item.id === editingItemId ? cleanItem : item) })); setEditingItemId(null); setDraftItem(null); }
  function publishMenu() { try { const contract = buildPublishContract(session); const result = validatePublishContract(contract); setPublishCheck({ ...result, contract }); } catch (err) { setPublishCheck({ ok:false, errors:[err?.message || "Publish check failed"] }); } }
  function toggleBadge(kind,key) { const current = draftItem.metadata?.[kind] || []; const exists = current.includes(key); setDraftItem(item => ({ ...item, metadata:{ ...item.metadata, [kind]:exists ? current.filter(value => value !== key) : [...current,key], reviewedByOwner:true } })); }
  function toggleVisibility(id,type) { patchMenu(current => ({ ...current, [type]:current[type].map(row => row.id === id ? { ...row, visible:row.visible === false } : row) })); }
  function toggleExpanded(id) { setExpandedGroupIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current,id]); }
  function selectGroup(group) { setSelectedGroupId(group.id); if (groupChildren(menu.groups, group.id).length) toggleExpanded(group.id); setMobileDetail(true); }
  function moveGroup(id,direction) { patchMenu(current => ({ ...current, groups:reorderSiblingGroups(current.groups,id,direction) })); }
  function moveItem(id,direction) { patchMenu(current => ({ ...current, items:reorderItems(current.items,id,direction) })); }
  function deleteItem(id) { if (!window.confirm(t.deleteItemConfirm)) return; patchMenu(current => ({ ...current, items:current.items.filter(item => item.id !== id) })); if (editingItemId === id) { setEditingItemId(null); setDraftItem(null); } }
  function deleteGroup(id) { if (!window.confirm(t.deleteGroupConfirm)) return; const removed = collectGroupBranch(menu.groups,id); patchMenu(current => ({ ...current, groups:current.groups.filter(group => !removed.has(group.id)), items:current.items.filter(item => !removed.has(item.group_id)) })); setExpandedGroupIds(current => current.filter(value => !removed.has(value))); const fallback = menu.groups.find(group => !removed.has(group.id) && !group.parent_id) || menu.groups.find(group => !removed.has(group.id)); setSelectedGroupId(fallback?.id || ""); setMobileDetail(false); }
  function createGroup() { const value = String(groupCreator?.value || "").trim(); if (!value) return; const parentId = groupCreator?.parentId || null; const id = draftId("group"); patchMenu(current => { const siblings = groupChildren(current.groups,parentId); const max = siblings.reduce((m,g) => Math.max(m,Number(g.sort_order || 0)),0); return { ...current, groups:[...current.groups,{ id, parent_id:parentId, group_key:"", name:emptyLanguageText(contentLanguage,value), visible:true, sort_order:max + 1 }] }; }); if (parentId) setExpandedGroupIds(current => current.includes(parentId) ? current : [...current,parentId]); setSelectedGroupId(id); setGroupCreator(null); setMobileDetail(true); }
  function addItem() { if (!selectedGroup) return; const id = draftId("item"); const directItems = menu.items.filter(item => item.group_id === selectedGroup.id); const item = { id, group_id:selectedGroup.id, name:emptyLanguageText(contentLanguage,""), description:emptyLanguageText(contentLanguage,""), price:"", price_options:[], image_url:"", visible:true, sort_order:directItems.length + 1, metadata:{ allergens:[], dietary:[], merchandising:[], spice:"none", aiSuggestions:[], reviewedByOwner:false } }; patchMenu(current => ({ ...current, items:[...current.items,item] })); setEditingItemId(id); setDraftItem({ ...item, __contentLanguage:contentLanguage }); }
  function renameSelectedGroup(value) { if (!selectedGroup) return; patchMenu(current => ({ ...current, groups:current.groups.map(group => group.id === selectedGroup.id ? { ...group, name:{ ...group.name, [contentLanguage]:value } } : group) })); }

  if (status === "loading") return <div className="studio-v3-draft-state">{t.loading}</div>;
  if (status === "error") return <div className="studio-v3-draft-state error">{error}</div>;
  if (!session || !menu) return null;
  const menuLanguages = menu.languages?.length ? menu.languages : [menu.default_language || "en"];

  const renderItem = (item, blockItems) => {
    const index = blockItems.findIndex(row => row.id === item.id);
    return <article className={`studio-v3-item-card ${item.visible === false ? "is-hidden" : ""}`} key={item.id}><div className="studio-v3-item-copy"><div className="studio-v3-item-title-row"><strong>{textFor(item.name,contentLanguage) || "—"}</strong><span>{priceText(item,currencySymbol)}</span></div><p>{textFor(item.description,contentLanguage) || t.noDescription}</p></div><div className="studio-v3-item-actions"><button onClick={() => openItem(item)}>{t.edit}</button><div className="studio-v3-entity-controls"><div className="studio-v3-order-buttons"><button className="studio-v3-order-button" disabled={index <= 0} title={t.moveUp} onClick={() => moveItem(item.id,-1)}>↑</button><button className="studio-v3-order-button" disabled={index < 0 || index >= blockItems.length - 1} title={t.moveDown} onClick={() => moveItem(item.id,1)}>↓</button></div><VisibilityToggle visible={item.visible} onChange={() => toggleVisibility(item.id,"items")} t={t}/><button className="studio-v3-delete-button" title={t.delete} onClick={() => deleteItem(item.id)}>×</button></div></div></article>;
  };

  return <div className="studio-v3-shell" dir={studioRtl ? "rtl" : "ltr"} lang={studioLanguage}>
    <header className="studio-v3-topbar"><div className="studio-v3-brand"><span className="studio-v3-mark">B</span><div><strong>Beyond Menu Studio</strong><span>{menu.restaurant_name}</span></div></div><div className="studio-v3-top-actions"><div className="studio-v3-language-switch" aria-label={t.ownerLanguage}>{["en","he","ar"].map(code => <button key={code} className={studioLanguage === code ? "active" : ""} onClick={() => setStudioLanguage(code)}>{code.toUpperCase()}</button>)}</div><div className={`studio-v3-autosave-status ${session.dirty ? "saving" : "saved"}`} aria-live="polite"><span className="studio-v3-autosave-dot"/>{session.dirty ? t.saving : t.allSaved}</div><button className="studio-v3-publish-review-button" onClick={publishMenu} title={t.publishNote}>{t.publish}</button></div></header>
    <nav className="studio-v3-tabs studio-v3-tabs-five">{["content","design","preview","analytics","settings"].map(key => <button key={key} className={tab === key ? "active" : ""} onClick={() => { setTab(key); setMobileDetail(false); }}>{t[key]}</button>)}</nav>

    <main className="studio-v3-main">
      {tab === "content" && <div className={`studio-v3-content-layout ${mobileDetail ? "mobile-detail" : ""}`}>
        <section className="studio-v3-panel studio-v3-categories"><div className="studio-v3-panel-heading"><div><span className="studio-v3-eyebrow">{t.realDraft}</span><h1>{t.categories}</h1></div></div><div className="studio-v3-content-language-row"><span>{t.contentLanguage}</span><div className="studio-v3-language-switch">{menuLanguages.map(code => <button key={code} className={contentLanguage === code ? "active" : ""} onClick={() => setContentLanguage(code)}>{code.toUpperCase()}</button>)}</div></div><div className="studio-v3-category-toolbar"><button className="primary" onClick={() => setGroupCreator({ parentId:null, value:"" })}>+ {t.addCategory}</button><button disabled={!selectedGroup} onClick={() => setGroupCreator({ parentId:selectedGroup?.id || null, value:"" })}>+ {t.addSubcategory}</button></div>{groupCreator && <div className="studio-v3-group-create-row"><input autoFocus value={groupCreator.value} placeholder={groupCreator.parentId ? t.addSubcategory : t.addCategory} onChange={e => setGroupCreator(current => ({ ...current, value:e.target.value }))} onKeyDown={e => { if (e.key === "Enter") createGroup(); if (e.key === "Escape") setGroupCreator(null); }}/><button onClick={createGroup}>{t.add}</button><button className="secondary" onClick={() => setGroupCreator(null)}>{t.cancel}</button></div>}<div className="studio-v3-category-list">{groupRows.map(({ group, depth }) => { const children = groupChildren(menu.groups,group.id); const expanded = expandedGroupIds.includes(group.id); const count = branchItemCount(menu.groups,menu.items,group.id); const siblings = groupChildren(menu.groups,group.parent_id || null); const siblingIndex = siblings.findIndex(row => row.id === group.id); return <div className={`studio-v3-category-card ${depth > 0 ? "is-subcategory" : ""} ${selectedGroup?.id === group.id ? "selected" : ""}`} key={group.id}><button className="studio-v3-category-open" onClick={() => selectGroup(group)}><span className="studio-v3-category-copy"><span className="studio-v3-group-type-line"><strong>{textFor(group.name,contentLanguage) || "—"}</strong>{depth > 0 ? <span className="studio-v3-subcategory-tag">{t.subcategory}</span> : null}</span><small>{count} {t.items} · {group.visible === false ? t.hidden : t.visible}</small></span>{children.length ? <span className={`studio-v3-expand-chevron ${expanded ? "expanded" : ""}`} title={expanded ? t.collapse : t.expand}>⌄</span> : <span className="studio-v3-chevron">›</span>}</button><div className="studio-v3-entity-controls"><div className="studio-v3-order-buttons"><button className="studio-v3-order-button" disabled={siblingIndex <= 0} title={t.moveUp} onClick={() => moveGroup(group.id,-1)}>↑</button><button className="studio-v3-order-button" disabled={siblingIndex < 0 || siblingIndex >= siblings.length - 1} title={t.moveDown} onClick={() => moveGroup(group.id,1)}>↓</button></div><VisibilityToggle visible={group.visible} onChange={() => toggleVisibility(group.id,"groups")} t={t}/><button className="studio-v3-delete-button" title={t.delete} onClick={() => deleteGroup(group.id)}>×</button></div></div>; })}</div></section>
        <section className="studio-v3-panel studio-v3-items"><button className="studio-v3-mobile-back" onClick={() => setMobileDetail(false)}>← {t.back}</button><div className="studio-v3-panel-heading"><div><span className="studio-v3-eyebrow">{selectedDepth > 0 ? t.subcategory : t.category}</span><h2>{textFor(selectedGroup?.name,contentLanguage)}</h2></div><button className="studio-v3-save-button" onClick={addItem}>+ {t.addItem}</button></div>{selectedGroup ? <label className="studio-v3-field studio-v3-group-name-field"><span>{t.groupName}</span><input value={selectedGroup.name?.[contentLanguage] || ""} onChange={e => renameSelectedGroup(e.target.value)}/></label> : null}<div className="studio-v3-parent-content">{selectedBlocks.map((block,index) => { const nested = index > 0 || block.depth > 0; return <section className={`studio-v3-content-block ${nested ? "nested" : ""}`} key={block.group.id}>{nested ? <div className="studio-v3-content-block-heading"><div><span>{t.subcategory}</span><strong>{textFor(block.group.name,contentLanguage) || "—"}</strong></div><button onClick={() => { setSelectedGroupId(block.group.id); setMobileDetail(true); }}>{t.edit}</button></div> : null}<div className="studio-v3-item-list">{block.items.map(item => renderItem(item,block.items))}{!block.items.length && nested ? <div className="studio-v3-empty-subcategory">0 {t.items}</div> : null}</div></section>; })}</div></section>
      </div>}

      {tab === "design" && <div className="studio-v3-design-layout"><section className="studio-v3-panel studio-v3-design-controls"><span className="studio-v3-eyebrow">{t.designDraft}</span><h1>{t.makeItYours}</h1><p>{t.designHint}</p><div className="studio-v3-template-grid">{["classic","visual"].map(template => <button key={template} className={session.design.template === template ? "active" : ""} onClick={() => patchDesign(current => ({ ...current, template }))}><strong>{template === "classic" ? t.classic : t.visual}</strong><span>{template === "classic" ? t.classicHint : t.visualHint}</span></button>)}</div><MenuDesignControls design={session.design} menu={menu} language={studioLanguage} panel={designPanel} setPanel={setDesignPanel} patchDesign={patchDesign}/><div className="studio-v3-badge-design-controls"><div className="studio-v3-control-label">{t.showBadgeSymbols}</div><div className="studio-v3-choice-row"><button className={session.design.badges.showSymbols ? "active" : ""} onClick={() => patchDesign(current => ({ ...current, badges:{ ...current.badges, showSymbols:true } }))}>{t.withSymbols}</button><button className={!session.design.badges.showSymbols ? "active" : ""} onClick={() => patchDesign(current => ({ ...current, badges:{ ...current.badges, showSymbols:false } }))}>{t.textOnly}</button></div><div className="studio-v3-control-label">{t.badgeStyle}</div><div className="studio-v3-choice-grid">{[["auto",t.autoStyle],["minimal",t.minimalStyle],["filled",t.filledStyle],["playful",t.playfulStyle]].map(([value,label]) => <button key={value} className={session.design.badges.iconStyle === value ? "active" : ""} disabled={!session.design.badges.showSymbols} onClick={() => patchDesign(current => ({ ...current, badges:{ ...current.badges, iconStyle:value } }))}>{label}</button>)}</div><p className="studio-v3-control-help">{t.autoStyleHint}</p></div></section><section className="studio-v3-preview-panel"><div className="studio-v3-preview-label">{t.liveDraftPreview} · 390PX</div><div className="studio-v3-phone-canvas"><MenuRenderer menu={previewMenu} design={session.design}/></div></section></div>}

      {tab === "preview" && <section className="studio-v3-preview-full"><div className="studio-v3-preview-switcher">{["320","375","390","430","desktop"].map(size => <button key={size} className={viewport === size ? "active" : ""} onClick={() => setViewport(size)}>{size === "desktop" ? "Desktop" : size}</button>)}</div><div className="studio-v3-draft-preview-frame" style={{ width:frameWidth }}><MenuRenderer menu={previewMenu} design={session.design}/></div></section>}

      {tab === "analytics" && <section className="studio-v3-analytics"><div className="studio-v3-analytics-head studio-v3-panel"><div><span className="studio-v3-eyebrow">{t.analyticsEyebrow}</span><h1>{t.analyticsTitle}</h1><p>{t.analyticsHint}</p></div><div className="studio-v3-analytics-connection"><span className="dot"/><div><strong>{t.trackingNotConnected}</strong><small>{t.trackingNote}</small></div></div></div><div className="studio-v3-analytics-metrics"><EmptyMetric label={t.menuViews} waitingLabel={t.waitingEvents}/><EmptyMetric label={t.categoryViews} waitingLabel={t.waitingEvents}/><EmptyMetric label={t.itemImpressions} waitingLabel={t.waitingEvents}/><EmptyMetric label={t.itemOpens} waitingLabel={t.waitingEvents}/></div><div className="studio-v3-analytics-grid">{[t.topCategories,t.topItems,t.engagement].map(title => <section className="studio-v3-panel studio-v3-analytics-card" key={title}><span className="studio-v3-eyebrow">{title}</span><div className="studio-v3-analytics-empty"><strong>{t.noData}</strong><span>{t.noDataHint}</span></div></section>)}<section className="studio-v3-panel studio-v3-analytics-card recommendation"><span className="studio-v3-eyebrow">{t.recommendations}</span><div className="studio-v3-analytics-empty"><strong>Buddy</strong><span>{t.recommendationHint}</span></div></section></div></section>}

      {tab === "settings" && <section className="studio-v3-panel studio-v3-settings-panel"><span className="studio-v3-eyebrow">{t.settings}</span><h1>{t.menuSettings}</h1><div className="studio-v3-setting-row"><span>{t.restaurant}</span><span>{menu.restaurant_name}</span></div><div className="studio-v3-setting-row"><span>{t.menuUrl}</span><span>/menu/{menu.slug}</span></div><div className="studio-v3-setting-row"><span>{t.languages}</span><span>{menuLanguages.join(" + ").toUpperCase()}</span></div><div className="studio-v3-safety-note">{t.safety}</div></section>}
    </main>

    {draftItem && <div className="studio-v3-modal-backdrop" onMouseDown={() => { setDraftItem(null); setEditingItemId(null); }}><section className="studio-v3-editor-sheet" onMouseDown={e => e.stopPropagation()}><div className="studio-v3-sheet-handle"/><div className="studio-v3-sheet-heading"><div><span className="studio-v3-eyebrow">{t.itemDraft}</span><h2>{t.editItem}</h2></div><button className="studio-v3-icon-button" onClick={() => setDraftItem(null)}>×</button></div><div className="studio-v3-content-language-row modal"><span>{t.contentLanguage}</span><div className="studio-v3-language-switch">{menuLanguages.map(code => <button key={code} className={contentLanguage === code ? "active" : ""} onClick={() => { setContentLanguage(code); setDraftItem(item => ({ ...item, __contentLanguage:code })); }}>{code.toUpperCase()}</button>)}</div></div><label className="studio-v3-field">{t.name}<input value={draftItem.name?.[contentLanguage] || ""} onChange={e => setDraftItem(item => ({ ...item, name:{ ...item.name, [contentLanguage]:e.target.value } }))}/></label><label className="studio-v3-field">{t.description}<textarea rows="3" value={draftItem.description?.[contentLanguage] || ""} onChange={e => setDraftItem(item => ({ ...item, description:{ ...item.description, [contentLanguage]:e.target.value } }))}/></label><PriceEditor item={draftItem} setItem={setDraftItem} t={t} currencySymbol={currencySymbol} language={contentLanguage}/><div className="studio-v3-badge-editor"><div className="studio-v3-badge-head"><strong>{t.merchandising}</strong><span>{t.ownerConfirmed}</span></div><div className="studio-v3-badge-grid studio-v3-merch-grid">{MENU_MERCHANDISING_BADGES.map(key => <button key={key} className={draftItem.metadata?.merchandising?.includes(key) ? "active" : ""} onClick={() => toggleBadge("merchandising",key)}>{BADGE_LABELS[key]?.[studioLanguage] || BADGE_LABELS[key]?.en}</button>)}</div><div className="studio-v3-badge-head"><strong>{t.dietary}</strong><span>{t.ownerConfirmed}</span></div><div className="studio-v3-badge-grid">{MENU_DIETARY_BADGES.map(key => <button key={key} className={draftItem.metadata?.dietary?.includes(key) ? "active" : ""} onClick={() => toggleBadge("dietary",key)}>{BADGE_LABELS[key]?.[studioLanguage] || BADGE_LABELS[key]?.en}</button>)}{MENU_ALLERGENS.map(key => <button key={key} className={draftItem.metadata?.allergens?.includes(key) ? "active" : ""} onClick={() => toggleBadge("allergens",key)}>{BADGE_LABELS[key]?.[studioLanguage] || BADGE_LABELS[key]?.en}</button>)}</div><label className="studio-v3-field">{t.spiceLevel}<select value={draftItem.metadata?.spice || "none"} onChange={e => setDraftItem(item => ({ ...item, metadata:{ ...item.metadata, spice:e.target.value, reviewedByOwner:true } }))}>{MENU_SPICE_LEVELS.map(key => <option key={key} value={key}>{key === "none" ? t.notSpicy : (BADGE_LABELS[key]?.[studioLanguage] || BADGE_LABELS[key]?.en)}</option>)}</select></label><div className="studio-v3-ai-suggestion-note"><strong>{t.aiSuggestions}</strong><span>{t.aiNote}</span></div></div><div className="studio-v3-sheet-footer"><button className="studio-v3-secondary" onClick={() => setDraftItem(null)}>{t.cancel}</button><button className="studio-v3-primary" onClick={saveItemLocally}>{t.applyDraft}</button></div></section></div>}

    {publishCheck ? <div className="studio-v3-modal-backdrop" onMouseDown={() => setPublishCheck(null)}><section className="studio-v3-publish-review" onMouseDown={e => e.stopPropagation()}><span className={`studio-v3-publish-check ${publishCheck.ok ? "ok" : "error"}`}>{publishCheck.ok ? "✓" : "!"}</span><h2>{t.publishTitle}</h2><strong>{publishCheck.ok ? t.publishReady : t.publishBlocked}</strong>{publishCheck.ok ? <p>{t.publishNote}</p> : <p>{publishCheck.errors?.join(" · ")}</p>}<button onClick={() => setPublishCheck(null)}>{t.close}</button></section></div> : null}
  </div>;
}
