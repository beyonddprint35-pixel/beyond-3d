import useStudioDraftSave from "../features/menu-engine/studio/useStudioDraftSave";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  GripVertical,
  Languages,
  List,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";

import MenuContentMobileCategories from "../components/MenuContentMobileCategories";
import { groupBranch, moveItemToGroup, moveMenuGroup, moveMenuItem, ordered, reorderMenuGroups, reorderMenuItems, removeMenuGroup, rootGroupId } from "../features/menu-engine/studio/menuStructure";
import MenuContentImageEditor from "../components/MenuContentImageEditor";
import MenuContentPriceEditor from "../components/MenuContentPriceEditor";
import MenuStudioHeader from "../components/MenuStudioHeader";
import { flushStudioDraft } from "../features/menu-engine/studio/studioNavigation";
import MenuStudioMobilePreview from "../features/menu-engine/studio/MenuStudioMobilePreview";
import {
  createBlankMenuV2,
  makeLocalizedText,
  readMenuCreateV2Profile,
  readMenuStudioV2Draft,
  resolveMenuStudioV2Design,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import { MENU_CONTENT_STUDIO_UI } from "./menuContentStudioV2Copy";
import "./MenuContentStudioV2.css";
import "./MenuContentStudioV2Multilingual.css";
import "./MenuContentStudioV2PriceOptions.css";
import "./MenuContentStudioV2ImageEditor.css";
import "./MenuContentStudioV2MobileCategories.css";
import "./MenuContentStudioV2Friendly.css";
import "./MenuContentStudioV2FriendlyBehavior.css";

const MENU_LANGUAGE_META = {
  en: { code: "EN", label: "English", dir: "ltr", itemNamePlaceholder: "Item name", descriptionPlaceholder: "Description", categoryPlaceholder: "Category name", notePlaceholder: "General note for this section", subtitlePlaceholder: "Restaurant subtitle" },
  he: { code: "HE", label: "עברית", dir: "rtl", itemNamePlaceholder: "שם הפריט", descriptionPlaceholder: "תיאור", categoryPlaceholder: "שם הקטגוריה", notePlaceholder: "הערה כללית לקטגוריה", subtitlePlaceholder: "כותרת משנה למסעדה" },
  ar: { code: "AR", label: "العربية", dir: "rtl", itemNamePlaceholder: "اسم الصنف", descriptionPlaceholder: "الوصف", categoryPlaceholder: "اسم الفئة", notePlaceholder: "ملاحظة عامة لهذا القسم", subtitlePlaceholder: "العنوان الفرعي للمطعم" },
};

const GROUP_NOTE_COPY = { en: "General note", he: "הערה כללית", ar: "ملاحظة عامة" };

const FRIENDLY_COPY = {
  en: { yourMenu: "Your menu", editMenuHint: "Choose something to edit", search: "Search menu", noResults: "No matching items", translations: "Translations", editTranslations: "Edit translations", hideTranslations: "Hide translations", moreOptions: "More options", hideOptions: "Hide options", primaryLanguage: "Main language", dragHint: "Drag to reorder. Drop an item on another category to move it.", addTo: (name) => `Add item to ${name || "category"}` },
  he: { yourMenu: "התפריט שלך", editMenuHint: "בחרו מה תרצו לערוך", search: "חיפוש בתפריט", noResults: "לא נמצאו פריטים", translations: "תרגומים", editTranslations: "עריכת תרגומים", hideTranslations: "הסתרת תרגומים", moreOptions: "אפשרויות נוספות", hideOptions: "הסתרת אפשרויות", primaryLanguage: "שפה ראשית", dragHint: "גררו כדי לשנות סדר. גררו פריט לקטגוריה אחרת כדי להעביר אותו.", addTo: (name) => `הוספת פריט ל${name || "קטגוריה"}` },
  ar: { yourMenu: "قائمتك", editMenuHint: "اختر ما تريد تعديله", search: "البحث في القائمة", noResults: "لا توجد عناصر مطابقة", translations: "الترجمات", editTranslations: "تعديل الترجمات", hideTranslations: "إخفاء الترجمات", moreOptions: "خيارات إضافية", hideOptions: "إخفاء الخيارات", primaryLanguage: "اللغة الرئيسية", dragHint: "اسحب لتغيير الترتيب. اسحب العنصر إلى فئة أخرى لنقله.", addTo: (name) => `إضافة عنصر إلى ${name || "الفئة"}` },
};

const DELETE_CONFIRM_COPY = {
  en: { itemTitle: "Delete item?", categoryTitle: "Delete category?", subcategoryTitle: "Delete subcategory?", itemMessage: (name) => `Are you sure you want to delete${name ? ` “${name}”` : " this item"}? This action cannot be undone.`, categoryMessage: (name) => `Are you sure you want to delete${name ? ` “${name}”` : " this category"}? Its subcategories and items will also be deleted. This action cannot be undone.`, subcategoryMessage: (name) => `Are you sure you want to delete${name ? ` “${name}”` : " this subcategory"}? Its items will also be deleted. This action cannot be undone.`, cancel: "Cancel", confirm: "Delete" },
  he: { itemTitle: "למחוק את הפריט?", categoryTitle: "למחוק את הקטגוריה?", subcategoryTitle: "למחוק את תת-הקטגוריה?", itemMessage: (name) => `האם למחוק${name ? ` את „${name}”` : " את הפריט הזה"}? לא ניתן לבטל את הפעולה.`, categoryMessage: (name) => `האם למחוק${name ? ` את „${name}”` : " את הקטגוריה הזאת"}? גם תתי-הקטגוריות והפריטים שבתוכה יימחקו. לא ניתן לבטל את הפעולה.`, subcategoryMessage: (name) => `האם למחוק${name ? ` את „${name}”` : " את תת-הקטגוריה הזאת"}? גם הפריטים שבתוכה יימחקו. לא ניתן לבטל את הפעולה.`, cancel: "ביטול", confirm: "מחיקה" },
  ar: { itemTitle: "حذف الصنف؟", categoryTitle: "حذف الفئة؟", subcategoryTitle: "حذف الفئة الفرعية؟", itemMessage: (name) => `هل أنت متأكد من حذف${name ? ` «${name}»` : " هذا الصنف"}؟ لا يمكن التراجع عن هذه العملية.`, categoryMessage: (name) => `هل أنت متأكد من حذف${name ? ` «${name}»` : " هذه الفئة"}؟ سيتم أيضًا حذف الفئات الفرعية والأصناف الموجودة داخلها. لا يمكن التراجع عن هذه العملية.`, subcategoryMessage: (name) => `هل أنت متأكد من حذف${name ? ` «${name}»` : " هذه الفئة الفرعية"}؟ سيتم أيضًا حذف الأصناف الموجودة داخلها. لا يمكن التراجع عن هذه العملية.`, cancel: "إلغاء", confirm: "حذف" },
};

function textValue(value, language = "en") { if (value && typeof value === "object") return value[language] || value.en || value.he || value.ar || ""; return String(value || ""); }
function localizedFieldValue(value, language = "en") { if (value && typeof value === "object") return String(value[language] || ""); return language === "en" ? String(value || "") : ""; }
function searchableText(value) { if (value && typeof value === "object") return Object.values(value).join(" ").toLocaleLowerCase(); return String(value || "").toLocaleLowerCase(); }
function nextSortOrder(list) { if (!list.length) return 0; return Math.max(...list.map((entry) => Number(entry.sort_order || 0))) + 1; }
function itemPriceOptions(item) { return Array.isArray(item?.price_options) ? item.price_options : []; }
function optionLabel(option, language = "en") { return String(option?.[`label_${language}`] || option?.label || option?.label_en || option?.label_he || option?.label_ar || ""); }
function priceSummary(item, currencySymbol = "₪", language = "en") { const options = itemPriceOptions(item).map((option) => ({ label: optionLabel(option, language), price: String(option?.price || "").trim() })).filter((option) => option.price); if (options.length) return options.map((option) => `${option.label ? `${option.label} ` : ""}${currencySymbol}${option.price}`).join(" · "); const singlePrice = String(item?.price || "").trim(); return singlePrice ? `${currencySymbol}${singlePrice}` : ""; }
function studioRoute(path) { flushStudioDraft(); return `${path}${window.location.search || ""}`; }
function isMobileStudio() { return typeof window !== "undefined" && window.matchMedia("(max-width: 850px)").matches; }
function hasLocalizedContent(entry, language, fields) { return fields.some((field) => localizedFieldValue(entry?.[field], language).trim()); }

export default function MenuContentStudioV2() {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(() => storedDraft?.profile || readMenuCreateV2Profile(), [storedDraft]);
  const requestedDesignId = params.get("design") || "";
  const resolvedDesign = useMemo(() => resolveMenuStudioV2Design(storedDraft, requestedDesignId), [storedDraft, requestedDesignId]);
  const [contentLanguage, setContentLanguage] = useState(() => storedDraft?.contentLanguage || storedDraft?.menu?.default_language || readStudioLanguage("en"));
  const [uiLanguage, setUiLanguage] = useState(() => { const requested = params.get("ui"); const fallback = ["en", "he", "ar"].includes(requested) ? requested : readStudioLanguage("en"); return storedDraft?.contentLanguage || storedDraft?.menu?.default_language || fallback; });
  const [menu, setMenu] = useState(() => storedDraft?.menu || createBlankMenuV2());
  const [selection, setSelection] = useState(() => ({ type: "restaurant", id: "restaurant" }));
  const [mobilePane, setMobilePane] = useState("structure");
  const [mobileCategoryId, setMobileCategoryId] = useState("");
  const [dragging, setDragging] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [translationsOpen, setTranslationsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const t = MENU_CONTENT_STUDIO_UI[uiLanguage] || MENU_CONTENT_STUDIO_UI.en;
  const friendly = FRIENDLY_COPY[uiLanguage] || FRIENDLY_COPY.en;
  const deleteCopy = DELETE_CONFIRM_COPY[uiLanguage] || DELETE_CONFIRM_COPY.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const contentDir = studioLanguageDirection(contentLanguage);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const design = resolvedDesign.design;
  const currencySymbol = menu.currency_symbol || "₪";
  const topLevelGroups = useMemo(() => ordered((menu.groups || []).filter((group) => !group.parent_id)), [menu.groups]);
  const allGroups = useMemo(() => topLevelGroups.flatMap((group) => groupBranch(menu.groups, group.id)), [menu.groups, topLevelGroups]);
  const editingLanguages = useMemo(() => { const enabled = (Array.isArray(menu.languages) ? menu.languages : []).filter((language) => MENU_LANGUAGE_META[language]); return enabled.length ? enabled : ["en", "he", "ar"]; }, [menu.languages]);
  const primaryLanguage = editingLanguages.includes(contentLanguage) ? contentLanguage : editingLanguages[0];
  const otherLanguages = editingLanguages.filter((language) => language !== primaryLanguage);
  const mobileCategory = useMemo(() => topLevelGroups.find((group) => group.id === mobileCategoryId) || topLevelGroups[0] || null, [topLevelGroups, mobileCategoryId]);
  const searchNeedle = searchQuery.trim().toLocaleLowerCase();
  const searchMatches = useMemo(() => { if (!searchNeedle) return null; const groupIds = new Set(); const itemIds = new Set(); (menu.groups || []).forEach((group) => { if (`${searchableText(group.name)} ${searchableText(group.note)}`.includes(searchNeedle)) groupIds.add(group.id); }); (menu.items || []).forEach((item) => { if (`${searchableText(item.name)} ${searchableText(item.description)}`.includes(searchNeedle)) { itemIds.add(item.id); groupIds.add(item.group_id); groupIds.add(rootGroupId(menu.groups, item.group_id)); } }); return { groupIds, itemIds }; }, [menu.groups, menu.items, searchNeedle]);

  useEffect(() => { if (!topLevelGroups.length) { if (mobileCategoryId) setMobileCategoryId(""); return; } if (!topLevelGroups.some((group) => group.id === mobileCategoryId)) setMobileCategoryId(topLevelGroups[0].id); }, [topLevelGroups, mobileCategoryId]);
  useEffect(() => { setTranslationsOpen(false); setAdvancedOpen(false); }, [selection.type, selection.id]);
  useEffect(() => { if (!deleteConfirmation) return undefined; const onKeyDown = (event) => { if (event.key === "Escape") setDeleteConfirmation(null); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [deleteConfirmation]);
  useEffect(() => {
    const applyTranslations = (event) => {
      const translatedMenu = event?.detail?.menu;
      if (!translatedMenu) return;
      setMenu(translatedMenu);
    };
    window.addEventListener("beyond-menu-translations-applied", applyTranslations);
    return () => window.removeEventListener("beyond-menu-translations-applied", applyTranslations);
  }, []);

  const saveState = useStudioDraftSave({ ...(storedDraft || {}), menu, design, designId: resolvedDesign.designId, profile, contentLanguage });
  const selectedCategory = selection.type === "category" ? menu.groups.find((group) => group.id === selection.id) : null;
  const selectedItem = selection.type === "item" ? menu.items.find((item) => item.id === selection.id) : null;
  const saveLabel = saveState === "saving" ? t.saving : saveState === "error" ? t.saveError : t.saved;

  function changeStudioLanguage(language) { setContentLanguage(language); setUiLanguage(language); writeStudioLanguage(language); }
  function selectForEdit(nextSelection) { const groupId = nextSelection.type === "item" ? menu.items.find((item) => item.id === nextSelection.id)?.group_id : nextSelection.type === "category" ? nextSelection.id : null; if (groupId) setMobileCategoryId(rootGroupId(menu.groups, groupId)); setSelection(nextSelection); setMobilePane("edit"); }
  function chooseMobileCategory(groupId) { setMobileCategoryId(rootGroupId(menu.groups, groupId)); setSelection({ type: "category", id: groupId }); setMobilePane("structure"); }
  function openCategory(groupId) { if (isMobileStudio()) return chooseMobileCategory(groupId); selectForEdit({ type: "category", id: groupId }); }
  function updateRestaurant(field, value) { setMenu((current) => ({ ...current, [field]: value })); }
  function updateLocalized(target, id, field, language, value) { setMenu((current) => ({ ...current, [target]: current[target].map((entry) => entry.id === id ? { ...entry, [field]: { ...(entry[field] || {}), [language]: value } } : entry) })); }
  function updateEntry(target, id, patch) { setMenu((current) => ({ ...current, [target]: current[target].map((entry) => entry.id === id ? { ...entry, ...patch } : entry) })); }
  function beginDrag(event, payload) { setDragging(payload); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", `${payload.type}:${payload.id}`); }
  function dropCategory(event, targetId) { event.preventDefault(); if (dragging?.type === "item") { setMenu((current) => moveItemToGroup(current, dragging.id, targetId)); setDragging(null); return; } if (dragging?.type !== "category" || dragging.id === targetId) return; setMenu((current) => reorderMenuGroups(current, dragging.id, targetId)); setDragging(null); }
  function dropItem(event, targetItem) { event.preventDefault(); if (dragging?.type !== "item" || dragging.id === targetItem.id) return; if (dragging.groupId !== targetItem.group_id) { setMenu((current) => moveItemToGroup(current, dragging.id, targetItem.group_id)); setDragging(null); return; } setMenu((current) => reorderMenuItems(current, dragging.id, targetItem.id)); setDragging(null); }
  function addCategory(parentId = null) { const id = `group-${crypto.randomUUID()}`; const group = { id, name: makeLocalizedText("", "", ""), note: makeLocalizedText("", "", ""), parent_id: parentId, sort_order: nextSortOrder(menu.groups.filter((entry) => (entry.parent_id || null) === parentId)), visible: true }; setMenu((current) => ({ ...current, groups: [...current.groups, group] })); setMobileCategoryId(parentId || id); setSelection({ type: "category", id }); setMobilePane("edit"); }
  function addItem(groupId) { const groupItems = menu.items.filter((item) => item.group_id === groupId); const id = `item-${crypto.randomUUID()}`; const item = { id, group_id: groupId, name: makeLocalizedText("", "", ""), description: makeLocalizedText("", "", ""), price: "", price_options: [], image_url: "", image_path: "", visible: true, sort_order: nextSortOrder(groupItems) }; setMenu((current) => ({ ...current, items: [...current.items, item] })); setMobileCategoryId(rootGroupId(menu.groups, groupId)); setSelection({ type: "item", id }); setMobilePane("edit"); }
  function deleteCategory(groupId) { const group = menu.groups.find((entry) => entry.id === groupId); if (!group || (!group.parent_id && topLevelGroups.length <= 1)) return; const nextMenu = removeMenuGroup(menu, groupId); const nextId = group.parent_id ? rootGroupId(nextMenu.groups, group.parent_id) : ordered(nextMenu.groups.filter((entry) => !entry.parent_id))[0]?.id || ""; setMenu((current) => removeMenuGroup(current, groupId)); setMobileCategoryId(nextId); setSelection(isMobileStudio() ? { type: "category", id: nextId } : { type: "restaurant", id: "restaurant" }); setMobilePane("structure"); }
  function deleteItem(itemId) { const item = menu.items.find((entry) => entry.id === itemId); const groupId = item?.group_id || mobileCategoryId; setMenu((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== itemId) })); if (isMobileStudio() && groupId) { setMobileCategoryId(rootGroupId(menu.groups, groupId)); setSelection({ type: "category", id: groupId }); setMobilePane("structure"); } else { setSelection({ type: "restaurant", id: "restaurant" }); setMobilePane("structure"); } }
  function requestDeleteCategory(groupId) { const group = menu.groups.find((entry) => entry.id === groupId); if (!group || (!group.parent_id && topLevelGroups.length <= 1)) return; setDeleteConfirmation({ kind: group.parent_id ? "subcategory" : "category", id: groupId, name: textValue(group.name, contentLanguage) }); }
  function requestDeleteItem(itemId) { const item = menu.items.find((entry) => entry.id === itemId); if (item) setDeleteConfirmation({ kind: "item", id: itemId, name: textValue(item.name, contentLanguage) }); }
  function confirmDelete() { if (!deleteConfirmation) return; const pending = deleteConfirmation; setDeleteConfirmation(null); if (pending.kind === "item") deleteItem(pending.id); else deleteCategory(pending.id); }
  const deleteDialogTitle = deleteConfirmation?.kind === "item" ? deleteCopy.itemTitle : deleteConfirmation?.kind === "subcategory" ? deleteCopy.subcategoryTitle : deleteCopy.categoryTitle;
  const deleteDialogMessage = deleteConfirmation?.kind === "item" ? deleteCopy.itemMessage(deleteConfirmation?.name) : deleteConfirmation?.kind === "subcategory" ? deleteCopy.subcategoryMessage(deleteConfirmation?.name) : deleteCopy.categoryMessage(deleteConfirmation?.name);

  function renderLanguageCard({ language, kind, entry, compact = false }) {
    const meta = MENU_LANGUAGE_META[language]; const key = `${kind}-${entry?.id || "restaurant"}-${language}`;
    if (kind === "restaurant") return <section className={`menu-content-v2-language-card ${compact ? "is-primary" : ""}`} key={key} dir={meta.dir}><header><strong>{meta.label}</strong><span>{meta.code}</span></header><div className="menu-content-v2-field"><label>{t.subtitle}</label><input dir={meta.dir} value={localizedFieldValue(menu.restaurant_subtitle, language)} placeholder={meta.subtitlePlaceholder} onChange={(event) => updateRestaurant("restaurant_subtitle", { ...(menu.restaurant_subtitle || {}), [language]: event.target.value })} /></div></section>;
    if (kind === "category") return <section className={`menu-content-v2-language-card ${compact ? "is-primary" : ""}`} key={key} dir={meta.dir}><header><strong>{meta.label}</strong><span>{meta.code}</span></header><div className="menu-content-v2-field"><label>{entry.parent_id ? t.subcategoryName : t.categoryName}</label><input dir={meta.dir} value={localizedFieldValue(entry.name, language)} placeholder={meta.categoryPlaceholder} onChange={(event) => updateLocalized("groups", entry.id, "name", language, event.target.value)} /></div><div className="menu-content-v2-field menu-content-v2-group-note-field"><label>{GROUP_NOTE_COPY[uiLanguage] || GROUP_NOTE_COPY.en}</label><textarea dir={meta.dir} value={localizedFieldValue(entry.note, language)} placeholder={meta.notePlaceholder} onChange={(event) => updateLocalized("groups", entry.id, "note", language, event.target.value)} /></div></section>;
    return <section className={`menu-content-v2-language-card ${compact ? "is-primary" : ""}`} key={key} dir={meta.dir}><header><strong>{meta.label}</strong><span>{meta.code}</span></header><div className="menu-content-v2-field"><label>{t.itemName}</label><input dir={meta.dir} value={localizedFieldValue(entry.name, language)} placeholder={meta.itemNamePlaceholder} onChange={(event) => updateLocalized("items", entry.id, "name", language, event.target.value)} /></div><div className="menu-content-v2-field"><label>{t.description}</label><textarea dir={meta.dir} value={localizedFieldValue(entry.description, language)} placeholder={meta.descriptionPlaceholder} onChange={(event) => updateLocalized("items", entry.id, "description", language, event.target.value)} /></div></section>;
  }

  function renderTranslationSection(kind, entry, fields) {
    if (!otherLanguages.length) return null;
    return <section className="menu-content-v2-friendly-section menu-content-v2-translations"><button type="button" className="menu-content-v2-friendly-section-title" onClick={() => setTranslationsOpen((value) => !value)}><span><Languages size={15} />{friendly.translations}</span><span className="menu-content-v2-friendly-section-side"><small>{translationsOpen ? friendly.hideTranslations : friendly.editTranslations}</small><ChevronDown size={15} className={translationsOpen ? "open" : ""} /></span></button><div className="menu-content-v2-friendly-language-status">{otherLanguages.map((language) => { const present = kind === "restaurant" ? localizedFieldValue(menu.restaurant_subtitle, language).trim() : hasLocalizedContent(entry, language, fields); return <span key={language} className={`menu-content-v2-friendly-language-chip ${present ? "" : "missing"}`}>{MENU_LANGUAGE_META[language].code} {present ? "✓" : "·"}</span>; })}</div>{translationsOpen ? <div className="menu-content-v2-language-fields menu-content-v2-friendly-translation-cards">{otherLanguages.map((language) => renderLanguageCard({ language, kind, entry }))}</div> : null}</section>;
  }

  return <main className="menu-content-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
    <MenuStudioHeader stage="content" language={uiLanguage} onLanguageChange={changeStudioLanguage} menuName={menu.restaurant_name} onBrand={() => selectForEdit({ type: "restaurant", id: "restaurant" })} saveState={saveState} saveLabel={saveLabel} />
    <nav className="menu-content-v2-mobile-mode-nav" aria-label={t.content}><button type="button" className={mobilePane === "structure" ? "active" : ""} onClick={() => setMobilePane("structure")}><List size={16} /><span>{t.mobileMenu}</span></button><button type="button" className={mobilePane === "edit" ? "active" : ""} onClick={() => setMobilePane("edit")}><Pencil size={16} /><span>{t.mobileEdit}</span></button><button type="button" className={mobilePane === "preview" ? "active" : ""} onClick={() => setMobilePane("preview")}><Eye size={16} /><span>{t.mobilePreview}</span></button></nav>
    <div className={`menu-content-v2-workspace mobile-pane-${mobilePane}`}>
      <aside className="menu-content-v2-tree">
        <div className="menu-content-v2-panel-head"><div><span>{friendly.yourMenu}</span><strong>{friendly.editMenuHint}</strong></div><button type="button" className="menu-content-v2-desktop-add-category" onClick={() => addCategory()} title={t.addCategory}><Plus size={16} /></button></div>
        <label className="menu-content-v2-friendly-search"><Search size={14} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={friendly.search} /></label><p className="menu-content-v2-friendly-drag-hint">{friendly.dragHint}</p>
        <button type="button" className={`menu-content-v2-restaurant-row ${selection.type === "restaurant" ? "active" : ""}`} onClick={() => selectForEdit({ type: "restaurant", id: "restaurant" })}><span className="menu-content-v2-tree-icon">B</span><span><strong>{menu.restaurant_name}</strong><small>{t.restaurantDetails}</small></span><ChevronRight size={14} /></button>
        <div className="menu-content-v2-tree-label"><span>{t.categories}</span><small>{topLevelGroups.length}</small></div>
        <MenuContentMobileCategories menu={menu} categories={topLevelGroups} activeCategory={mobileCategory} contentLanguage={contentLanguage} contentDir={contentDir} rtl={rtl} t={t} textValue={textValue} priceSummary={priceSummary} onSelectCategory={chooseMobileCategory} onEdit={selectForEdit} onAddCategory={addCategory} onAddItem={addItem} onMoveGroup={(id, step) => setMenu((current) => moveMenuGroup(current, id, step))} onMoveItem={(id, step) => setMenu((current) => moveMenuItem(current, id, step))} onVisibility={(target, id, visible) => updateEntry(target, id, { visible })} />
        <div className="menu-content-v2-categories">{allGroups.map((group) => { if (searchMatches && !searchMatches.groupIds.has(group.id) && !searchMatches.groupIds.has(rootGroupId(menu.groups, group.id))) return null; const allItems = ordered(menu.items.filter((item) => item.group_id === group.id)); const items = searchMatches ? allItems.filter((item) => searchMatches.itemIds.has(item.id) || searchableText(group.name).includes(searchNeedle)) : allItems; const selectedInGroup = selection.type === "item" && allItems.some((item) => item.id === selection.id); const isOpen = Boolean(searchNeedle) || (selection.type === "category" && selection.id === group.id) || selectedInGroup; const groupDragging = dragging?.type === "category" && dragging.id === group.id; return <section key={group.id} className={`menu-content-v2-category-block ${groupDragging ? "dragging" : ""} ${isOpen ? "is-open" : ""}`}><button type="button" draggable className={`menu-content-v2-category-row ${selection.type === "category" && selection.id === group.id ? "active" : ""}`} onClick={() => openCategory(group.id)} onDragStart={(event) => beginDrag(event, { type: "category", id: group.id })} onDragOver={(event) => dragging && event.preventDefault()} onDrop={(event) => dropCategory(event, group.id)} onDragEnd={() => setDragging(null)}><GripVertical size={13} /><span><strong dir={contentDir}>{textValue(group.name, contentLanguage) || (group.parent_id ? t.subcategoryName : t.categoryName)}</strong><small>{t.items(allItems.length)}</small></span><ChevronRight size={13} /></button>{isOpen ? <div className="menu-content-v2-items">{items.map((item) => { const summary = priceSummary(item, currencySymbol, contentLanguage); const itemDragging = dragging?.type === "item" && dragging.id === item.id; return <button type="button" draggable key={item.id} className={`${selection.type === "item" && selection.id === item.id ? "active" : ""} ${itemDragging ? "dragging" : ""}`.trim()} onClick={() => selectForEdit({ type: "item", id: item.id })} onDragStart={(event) => beginDrag(event, { type: "item", id: item.id, groupId: group.id })} onDragOver={(event) => dragging?.type === "item" && event.preventDefault()} onDrop={(event) => dropItem(event, item)} onDragEnd={() => setDragging(null)}><GripVertical size={11} /><span><strong dir={contentDir}>{textValue(item.name, contentLanguage) || t.itemName}</strong><small>{summary || t.noPrice}</small></span></button>; })}{!searchNeedle ? <button type="button" className="menu-content-v2-add-item" onClick={() => addItem(group.id)}><Plus size={12} /> {friendly.addTo(textValue(group.name, contentLanguage))}</button> : null}</div> : null}</section>; })}{searchMatches && searchMatches.groupIds.size === 0 ? <div className="menu-content-v2-friendly-empty">{friendly.noResults}</div> : null}</div>
        <button type="button" className="menu-content-v2-add-category" onClick={() => addCategory()}><Plus size={14} /> {t.addCategory}</button>
      </aside>
      <section className="menu-content-v2-preview"><div className="menu-content-v2-canvas-toolbar"><div><span className="live" /><strong>{t.livePreview}</strong></div></div><div className="menu-content-v2-canvas"><MenuStudioMobilePreview menu={menu} design={design} language={contentLanguage} minScale={0.34} maxScale={0.9} /></div></section>
      <aside className="menu-content-v2-inspector"><div className="menu-content-v2-mobile-editor-bar"><button type="button" onClick={() => setMobilePane("structure")}><BackIcon size={17} /> {t.backToMenu}</button><button type="button" onClick={() => setMobilePane("preview")}><Eye size={16} /> {t.mobilePreview}</button></div>
        {selection.type === "restaurant" ? <><div className="menu-content-v2-inspector-head"><span>{t.restaurantEyebrow}</span><h2>{t.menuDetails}</h2></div><div className="menu-content-v2-primary-editor"><div className="menu-content-v2-field"><label>{t.restaurantName}</label><input value={menu.restaurant_name || ""} placeholder={t.restaurantName} onChange={(event) => updateRestaurant("restaurant_name", event.target.value)} /></div>{renderLanguageCard({ language: primaryLanguage, kind: "restaurant", entry: menu, compact: true })}</div>{renderTranslationSection("restaurant", menu, ["restaurant_subtitle"])}</> : null}
        {selectedCategory ? <><div className="menu-content-v2-inspector-head"><span>{selectedCategory.parent_id ? t.subcategoryEyebrow : t.categoryEyebrow}</span><h2 dir={contentDir}>{textValue(selectedCategory.name, contentLanguage) || (selectedCategory.parent_id ? t.subcategoryName : t.categoryName)}</h2></div><div className="menu-content-v2-primary-editor">{renderLanguageCard({ language: primaryLanguage, kind: "category", entry: selectedCategory, compact: true })}</div>{renderTranslationSection("category", selectedCategory, ["name", "note"])}<button type="button" className="menu-content-v2-inspector-add menu-content-v2-primary-add" onClick={() => addItem(selectedCategory.id)}><Plus size={14} /> {friendly.addTo(textValue(selectedCategory.name, contentLanguage))}</button><section className="menu-content-v2-friendly-section"><button type="button" className="menu-content-v2-friendly-section-title" onClick={() => setAdvancedOpen((value) => !value)}><span><SlidersHorizontal size={15} />{friendly.moreOptions}</span><span className="menu-content-v2-friendly-section-side"><small>{advancedOpen ? friendly.hideOptions : ""}</small><ChevronDown size={15} className={advancedOpen ? "open" : ""} /></span></button>{advancedOpen ? <div className="menu-content-v2-friendly-advanced-body"><label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedCategory.visible !== false} onChange={(event) => updateEntry("groups", selectedCategory.id, { visible: event.target.checked })} /><span /><div><strong>{t.visible}</strong><small>{t.visibleCategory}</small></div></label>{!selectedCategory.parent_id ? <button type="button" className="menu-content-v2-inspector-add" onClick={() => addCategory(selectedCategory.id)}><Plus size={14} /> {t.addSubcategory}</button> : null}{selectedCategory.parent_id || topLevelGroups.length > 1 ? <button type="button" className="menu-content-v2-danger" onClick={() => requestDeleteCategory(selectedCategory.id)}><Trash2 size={14} /> {selectedCategory.parent_id ? t.deleteSubcategory : t.deleteCategory}</button> : null}</div> : null}</section></> : null}
        {selectedItem ? <><div className="menu-content-v2-inspector-head"><span>{t.itemEyebrow}</span><h2 dir={contentDir}>{textValue(selectedItem.name, contentLanguage) || t.itemName}</h2></div><div className="menu-content-v2-primary-editor">{renderLanguageCard({ language: primaryLanguage, kind: "item", entry: selectedItem, compact: true })}</div><MenuContentPriceEditor item={selectedItem} currencySymbol={currencySymbol} contentLanguage={contentLanguage} contentDir={contentDir} t={t} onChange={(patch) => updateEntry("items", selectedItem.id, patch)} /><MenuContentImageEditor item={selectedItem} projectId={menu.source_project_id || profile?.importedProjectId || "draft"} t={t} onChange={(patch) => updateEntry("items", selectedItem.id, patch)} />{renderTranslationSection("item", selectedItem, ["name", "description"])}<section className="menu-content-v2-friendly-section"><button type="button" className="menu-content-v2-friendly-section-title" onClick={() => setAdvancedOpen((value) => !value)}><span><SlidersHorizontal size={15} />{friendly.moreOptions}</span><span className="menu-content-v2-friendly-section-side"><small>{advancedOpen ? friendly.hideOptions : ""}</small><ChevronDown size={15} className={advancedOpen ? "open" : ""} /></span></button>{advancedOpen ? <div className="menu-content-v2-friendly-advanced-body"><div className="menu-content-v2-field"><label htmlFor="studio-item-group">{t.itemCategory}</label><select id="studio-item-group" value={selectedItem.group_id} onChange={(event) => { const groupId = event.target.value; setMenu((current) => moveItemToGroup(current, selectedItem.id, groupId)); setMobileCategoryId(rootGroupId(menu.groups, groupId)); }}>{allGroups.map((group) => { const parent = menu.groups.find((entry) => entry.id === group.parent_id); const name = textValue(group.name, contentLanguage) || (parent ? t.subcategoryName : t.categoryName); return <option key={group.id} value={group.id}>{parent ? `${textValue(parent.name, contentLanguage) || t.categoryName} / ${name}` : name}</option>; })}</select></div><label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedItem.visible !== false} onChange={(event) => updateEntry("items", selectedItem.id, { visible: event.target.checked })} /><span /><div><strong>{t.visible}</strong><small>{t.visibleItem}</small></div></label><button type="button" className="menu-content-v2-danger" onClick={() => requestDeleteItem(selectedItem.id)}><Trash2 size={14} /> {t.deleteItem}</button></div> : null}</section></> : null}
        <div className="menu-content-v2-inspector-next"><div><Check size={14} /><span><strong>{t.updatesLive}</strong><small>{t.draftKept}</small></span></div><button type="button" onClick={() => navigate(studioRoute("/menu-studio/design"))}>{t.continueDesign} <ForwardIcon size={14} /></button></div>
      </aside>
    </div>
    {deleteConfirmation ? <div className="menu-content-v2-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteConfirmation(null); }}><section className="menu-content-v2-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="menu-content-v2-confirm-title" aria-describedby="menu-content-v2-confirm-message"><span className="icon" aria-hidden="true"><Trash2 size={20} /></span><h2 id="menu-content-v2-confirm-title">{deleteDialogTitle}</h2><p id="menu-content-v2-confirm-message">{deleteDialogMessage}</p><div className="menu-content-v2-confirm-actions"><button type="button" className="cancel" onClick={() => setDeleteConfirmation(null)}>{deleteCopy.cancel}</button><button type="button" className="delete" onClick={confirmDelete} autoFocus>{deleteCopy.confirm}</button></div></section></div> : null}
  </main>;
}
