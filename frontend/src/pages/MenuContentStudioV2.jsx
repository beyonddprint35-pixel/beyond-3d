import useStudioDraftSave from "../features/menu-engine/studio/useStudioDraftSave";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  GripVertical,
  List,
  Pencil,
  Plus,
  Smartphone,
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

const MENU_LANGUAGE_META = {
  en: {
    code: "EN",
    label: "English",
    dir: "ltr",
    itemNamePlaceholder: "Item name",
    descriptionPlaceholder: "Description",
    categoryPlaceholder: "Category name",
    subtitlePlaceholder: "Restaurant subtitle",
  },
  he: {
    code: "HE",
    label: "עברית",
    dir: "rtl",
    itemNamePlaceholder: "שם הפריט",
    descriptionPlaceholder: "תיאור",
    categoryPlaceholder: "שם הקטגוריה",
    subtitlePlaceholder: "כותרת משנה למסעדה",
  },
  ar: {
    code: "AR",
    label: "العربية",
    dir: "rtl",
    itemNamePlaceholder: "اسم الصنف",
    descriptionPlaceholder: "الوصف",
    categoryPlaceholder: "اسم الفئة",
    subtitlePlaceholder: "العنوان الفرعي للمطعم",
  },
};

function textValue(value, language = "en") {
  if (value && typeof value === "object") return value[language] || value.en || value.he || value.ar || "";
  return String(value || "");
}

function localizedFieldValue(value, language = "en") {
  if (value && typeof value === "object") return String(value[language] || "");
  return language === "en" ? String(value || "") : "";
}

function nextSortOrder(list) {
  if (!list.length) return 0;
  return Math.max(...list.map((entry) => Number(entry.sort_order || 0))) + 1;
}

function itemPriceOptions(item) {
  return Array.isArray(item?.price_options) ? item.price_options : [];
}

function optionLabel(option, language = "en") {
  return String(
    option?.[`label_${language}`]
      || option?.label
      || option?.label_en
      || option?.label_he
      || option?.label_ar
      || "",
  );
}

function priceSummary(item, currencySymbol = "₪", language = "en") {
  const options = itemPriceOptions(item)
    .map((option) => ({ label: optionLabel(option, language), price: String(option?.price || "").trim() }))
    .filter((option) => option.price);
  if (options.length) {
    return options
      .map((option) => `${option.label ? `${option.label} ` : ""}${currencySymbol}${option.price}`)
      .join(" · ");
  }
  const singlePrice = String(item?.price || "").trim();
  return singlePrice ? `${currencySymbol}${singlePrice}` : "";
}

function studioRoute(path) {
  flushStudioDraft();
  return `${path}${window.location.search || ""}`;
}

function isMobileStudio() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 850px)").matches;
}

export default function MenuContentStudioV2() {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(() => storedDraft?.profile || readMenuCreateV2Profile(), [storedDraft]);
  const requestedDesignId = params.get("design") || "";
  const resolvedDesign = useMemo(
    () => resolveMenuStudioV2Design(storedDraft, requestedDesignId),
    [storedDraft, requestedDesignId],
  );

  const [contentLanguage, setContentLanguage] = useState(
    () => storedDraft?.contentLanguage || storedDraft?.menu?.default_language || readStudioLanguage("en"),
  );
  const [uiLanguage, setUiLanguage] = useState(() => {
    const requested = params.get("ui");
    const fallback = ["en", "he", "ar"].includes(requested) ? requested : readStudioLanguage("en");
    return storedDraft?.contentLanguage || storedDraft?.menu?.default_language || fallback;
  });
  const [menu, setMenu] = useState(() => storedDraft?.menu || createBlankMenuV2());
  const [selection, setSelection] = useState(() => ({ type: "restaurant", id: "restaurant" }));
  const [mobilePane, setMobilePane] = useState("structure");
  const [mobileCategoryId, setMobileCategoryId] = useState("");
  const [dragging, setDragging] = useState(null);

  const t = MENU_CONTENT_STUDIO_UI[uiLanguage] || MENU_CONTENT_STUDIO_UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const contentDir = studioLanguageDirection(contentLanguage);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const design = resolvedDesign.design;
  const selectedDesignEntry = resolvedDesign.entry;
  const currencySymbol = menu.currency_symbol || "₪";

  const topLevelGroups = useMemo(() => ordered((menu.groups || []).filter((group) => !group.parent_id)), [menu.groups]);
  const allGroups = useMemo(() => topLevelGroups.flatMap((group) => groupBranch(menu.groups, group.id)), [menu.groups, topLevelGroups]);
  const editingLanguages = useMemo(() => {
    const enabled = (Array.isArray(menu.languages) ? menu.languages : [])
      .filter((language) => MENU_LANGUAGE_META[language]);
    return enabled.length ? enabled : ["en", "he", "ar"];
  }, [menu.languages]);
  const mobileCategory = useMemo(
    () => topLevelGroups.find((group) => group.id === mobileCategoryId) || topLevelGroups[0] || null,
    [topLevelGroups, mobileCategoryId],
  );
  useEffect(() => {
    if (!topLevelGroups.length) {
      if (mobileCategoryId) setMobileCategoryId("");
      return;
    }
    if (!topLevelGroups.some((group) => group.id === mobileCategoryId)) {
      setMobileCategoryId(topLevelGroups[0].id);
    }
  }, [topLevelGroups, mobileCategoryId]);

  const saveState = useStudioDraftSave({ ...(storedDraft || {}), menu, design, designId: resolvedDesign.designId, profile, contentLanguage });

  const selectedCategory = selection.type === "category"
    ? menu.groups.find((group) => group.id === selection.id)
    : null;
  const selectedItem = selection.type === "item"
    ? menu.items.find((item) => item.id === selection.id)
    : null;

  const saveLabel = saveState === "saving" ? t.saving : saveState === "error" ? t.saveError : t.saved;

  function changeStudioLanguage(language) {
    setContentLanguage(language);
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function selectForEdit(nextSelection) {
    const groupId = nextSelection.type === "item"
      ? menu.items.find((item) => item.id === nextSelection.id)?.group_id
      : nextSelection.type === "category" ? nextSelection.id : null;
    if (groupId) setMobileCategoryId(rootGroupId(menu.groups, groupId));
    setSelection(nextSelection);
    setMobilePane("edit");
  }

  function chooseMobileCategory(groupId) {
    setMobileCategoryId(rootGroupId(menu.groups, groupId));
    setSelection({ type: "category", id: groupId });
    setMobilePane("structure");
  }

  function openCategory(groupId) {
    if (isMobileStudio()) {
      chooseMobileCategory(groupId);
      return;
    }
    selectForEdit({ type: "category", id: groupId });
  }

  function updateRestaurant(field, value) {
    setMenu((current) => ({ ...current, [field]: value }));
  }

  function updateLocalized(target, id, field, language, value) {
    setMenu((current) => ({
      ...current,
      [target]: current[target].map((entry) => entry.id === id
        ? { ...entry, [field]: { ...(entry[field] || {}), [language]: value } }
        : entry),
    }));
  }

  function updateEntry(target, id, patch) {
    setMenu((current) => ({
      ...current,
      [target]: current[target].map((entry) => entry.id === id ? { ...entry, ...patch } : entry),
    }));
  }

  function beginDrag(event, payload) {
    setDragging(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${payload.type}:${payload.id}`);
  }

  function dropCategory(event, targetId) {
    event.preventDefault();
    if (dragging?.type !== "category" || dragging.id === targetId) return;
    setMenu((current) => reorderMenuGroups(current, dragging.id, targetId));
    setDragging(null);
  }

  function dropItem(event, targetItem) {
    event.preventDefault();
    if (dragging?.type !== "item" || dragging.groupId !== targetItem.group_id || dragging.id === targetItem.id) return;
    setMenu((current) => reorderMenuItems(current, dragging.id, targetItem.id));
    setDragging(null);
  }

  function addCategory(parentId = null) {
    const id = `group-${crypto.randomUUID()}`;
    const group = {
      id,
      name: makeLocalizedText("", "", ""),
      parent_id: parentId,
      sort_order: nextSortOrder(menu.groups.filter((entry) => (entry.parent_id || null) === parentId)),
      visible: true,
    };
    setMenu((current) => ({ ...current, groups: [...current.groups, group] }));
    setMobileCategoryId(parentId || id);
    setSelection({ type: "category", id });
    setMobilePane("edit");
  }

  function addItem(groupId) {
    const groupItems = menu.items.filter((item) => item.group_id === groupId);
    const id = `item-${crypto.randomUUID()}`;
    const item = {
      id,
      group_id: groupId,
      name: makeLocalizedText("", "", ""),
      description: makeLocalizedText("", "", ""),
      price: "",
      price_options: [],
      image_url: "",
      image_path: "",
      visible: true,
      sort_order: nextSortOrder(groupItems),
    };
    setMenu((current) => ({ ...current, items: [...current.items, item] }));
    setMobileCategoryId(rootGroupId(menu.groups, groupId));
    setSelection({ type: "item", id });
    setMobilePane("edit");
  }

  function deleteCategory(groupId) {
    const group = menu.groups.find((entry) => entry.id === groupId);
    if (!group || (!group.parent_id && topLevelGroups.length <= 1)) return;
    const nextMenu = removeMenuGroup(menu, groupId);
    const nextId = group.parent_id
      ? rootGroupId(nextMenu.groups, group.parent_id)
      : ordered(nextMenu.groups.filter((entry) => !entry.parent_id))[0]?.id || "";
    setMenu((current) => removeMenuGroup(current, groupId));
    setMobileCategoryId(nextId);
    setSelection(isMobileStudio() ? { type: "category", id: nextId } : { type: "restaurant", id: "restaurant" });
    setMobilePane("structure");
  }

  function deleteItem(itemId) {
    const item = menu.items.find((entry) => entry.id === itemId);
    const groupId = item?.group_id || mobileCategoryId;
    setMenu((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== itemId) }));
    if (isMobileStudio() && groupId) {
      setMobileCategoryId(rootGroupId(menu.groups, groupId));
      setSelection({ type: "category", id: groupId });
      setMobilePane("structure");
    } else {
      setSelection({ type: "restaurant", id: "restaurant" });
      setMobilePane("structure");
    }
  }

  return (
    <main className="menu-content-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <MenuStudioHeader stage="content" language={uiLanguage} onLanguageChange={changeStudioLanguage} menuName={menu.restaurant_name} onBrand={() => selectForEdit({ type: "restaurant", id: "restaurant" })} saveState={saveState} saveLabel={saveLabel} />

      <nav className="menu-content-v2-mobile-mode-nav" aria-label={t.content}>
        <button type="button" className={mobilePane === "structure" ? "active" : ""} onClick={() => setMobilePane("structure")}>
          <List size={16} /><span>{t.mobileMenu}</span>
        </button>
        <button type="button" className={mobilePane === "edit" ? "active" : ""} onClick={() => setMobilePane("edit")}>
          <Pencil size={16} /><span>{t.mobileEdit}</span>
        </button>
        <button type="button" className={mobilePane === "preview" ? "active" : ""} onClick={() => setMobilePane("preview")}>
          <Eye size={16} /><span>{t.mobilePreview}</span>
        </button>
      </nav>

      <div className={`menu-content-v2-workspace mobile-pane-${mobilePane}`}>
        <aside className="menu-content-v2-tree">
          <div className="menu-content-v2-panel-head">
            <div><span>{t.contentEyebrow}</span><strong>{t.menuStructure}</strong></div>
            <button type="button" className="menu-content-v2-desktop-add-category" onClick={() => addCategory()} title={t.addCategory}><Plus size={16} /></button>
          </div>

          <button type="button" className={`menu-content-v2-restaurant-row ${selection.type === "restaurant" ? "active" : ""}`} onClick={() => selectForEdit({ type: "restaurant", id: "restaurant" })}>
            <span className="menu-content-v2-tree-icon">B</span>
            <span><strong>{menu.restaurant_name}</strong><small>{t.restaurantDetails}</small></span>
            <ChevronRight size={14} />
          </button>

          <div className="menu-content-v2-tree-label"><span>{t.categories}</span><small>{topLevelGroups.length}</small></div>

          <MenuContentMobileCategories
            menu={menu} categories={topLevelGroups} activeCategory={mobileCategory}
            contentLanguage={contentLanguage} contentDir={contentDir} rtl={rtl} t={t}
            textValue={textValue} priceSummary={priceSummary}
            onSelectCategory={chooseMobileCategory} onEdit={selectForEdit}
            onAddCategory={addCategory} onAddItem={addItem}
            onMoveGroup={(id, step) => setMenu((current) => moveMenuGroup(current, id, step))}
            onMoveItem={(id, step) => setMenu((current) => moveMenuItem(current, id, step))}
            onVisibility={(target, id, visible) => updateEntry(target, id, { visible })}
          />

          <div className="menu-content-v2-categories">
            {allGroups.map((group) => {
              const items = ordered(menu.items.filter((item) => item.group_id === group.id));
              const groupDragging = dragging?.type === "category" && dragging.id === group.id;
              return (
                <section key={group.id} className={`menu-content-v2-category-block ${groupDragging ? "dragging" : ""}`}>
                  <button
                    type="button"
                    draggable
                    className={`menu-content-v2-category-row ${selection.type === "category" && selection.id === group.id ? "active" : ""}`}
                    onClick={() => openCategory(group.id)}
                    onDragStart={(event) => beginDrag(event, { type: "category", id: group.id })}
                    onDragOver={(event) => dragging?.type === "category" && event.preventDefault()}
                    onDrop={(event) => dropCategory(event, group.id)}
                    onDragEnd={() => setDragging(null)}
                  >
                    <GripVertical size={13} />
                    <span><strong dir={contentDir}>{textValue(group.name, contentLanguage)}</strong><small>{t.items(items.length)}</small></span>
                    <ChevronRight size={13} />
                  </button>

                  <div className="menu-content-v2-items">
                    {items.map((item) => {
                      const summary = priceSummary(item, currencySymbol, contentLanguage);
                      const itemDragging = dragging?.type === "item" && dragging.id === item.id;
                      return (
                        <button
                          type="button"
                          draggable
                          key={item.id}
                          className={`${selection.type === "item" && selection.id === item.id ? "active" : ""} ${itemDragging ? "dragging" : ""}`.trim()}
                          onClick={() => selectForEdit({ type: "item", id: item.id })}
                          onDragStart={(event) => beginDrag(event, { type: "item", id: item.id, groupId: group.id })}
                          onDragOver={(event) => dragging?.type === "item" && dragging.groupId === group.id && event.preventDefault()}
                          onDrop={(event) => dropItem(event, item)}
                          onDragEnd={() => setDragging(null)}
                        >
                          <GripVertical size={11} />
                          <span><strong dir={contentDir}>{textValue(item.name, contentLanguage)}</strong><small>{summary || t.noPrice}</small></span>
                        </button>
                      );
                    })}
                    <button type="button" className="menu-content-v2-add-item" onClick={() => addItem(group.id)}><Plus size={12} /> {t.addItem}</button>
                  </div>
                </section>
              );
            })}
          </div>

          <button type="button" className="menu-content-v2-add-category" onClick={() => addCategory()}><Plus size={14} /> {t.addCategory}</button>
        </aside>

        <section className="menu-content-v2-preview">
          <div className="menu-content-v2-canvas-toolbar">
            <div><span className="live" /><strong>{t.livePreview}</strong><small>{t.previewHint}</small></div>
            <div className="menu-content-v2-design-chip"><Sparkles size={13} /><span>{selectedDesignEntry?.name || t.selectedDesign}</span></div>
            <div className="menu-content-v2-device"><Smartphone size={13} /> {t.mobile} <span>390 × 844</span></div>
          </div>

          <div className="menu-content-v2-canvas">
            <MenuStudioMobilePreview
              menu={menu}
              design={design}
              language={contentLanguage}
              minScale={0.34}
              maxScale={0.9}
            />
          </div>
        </section>

        <aside className="menu-content-v2-inspector">
          <div className="menu-content-v2-mobile-editor-bar">
            <button type="button" onClick={() => setMobilePane("structure")}><BackIcon size={17} /> {t.backToMenu}</button>
            <button type="button" onClick={() => setMobilePane("preview")}><Eye size={16} /> {t.mobilePreview}</button>
          </div>

          {selection.type === "restaurant" ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>{t.restaurantEyebrow}</span><h2>{t.menuDetails}</h2><p>{t.restaurantHelp}</p></div>
              <div className="menu-content-v2-field"><label>{t.restaurantName}</label><input value={menu.restaurant_name || ""} placeholder={t.restaurantName} onChange={(event) => updateRestaurant("restaurant_name", event.target.value)} /></div>
              <div className="menu-content-v2-language-fields">
                {editingLanguages.map((language) => {
                  const meta = MENU_LANGUAGE_META[language];
                  return (
                    <section className="menu-content-v2-language-card" key={`restaurant-subtitle-${language}`} dir={meta.dir}>
                      <header><strong>{meta.label}</strong><span>{meta.code}</span></header>
                      <div className="menu-content-v2-field">
                        <label>{t.subtitle}</label>
                        <input
                          dir={meta.dir}
                          value={localizedFieldValue(menu.restaurant_subtitle, language)}
                          placeholder={meta.subtitlePlaceholder}
                          onChange={(event) => updateRestaurant("restaurant_subtitle", { ...(menu.restaurant_subtitle || {}), [language]: event.target.value })}
                        />
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="menu-content-v2-info-card"><Sparkles size={16} /><div><strong>{t.designApplied}</strong><p>{t.designAppliedHint(selectedDesignEntry?.name)}</p></div></div>
            </>
          ) : null}

          {selectedCategory ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>{selectedCategory.parent_id ? t.subcategoryEyebrow : t.categoryEyebrow}</span><h2 dir={contentDir}>{textValue(selectedCategory.name, contentLanguage) || (selectedCategory.parent_id ? t.subcategoryName : t.categoryName)}</h2><p>{t.categoryHelp}</p></div>
              <div className="menu-content-v2-language-fields">
                {editingLanguages.map((language) => {
                  const meta = MENU_LANGUAGE_META[language];
                  return (
                    <section className="menu-content-v2-language-card" key={`category-${selectedCategory.id}-${language}`} dir={meta.dir}>
                      <header><strong>{meta.label}</strong><span>{meta.code}</span></header>
                      <div className="menu-content-v2-field">
                        <label>{selectedCategory.parent_id ? t.subcategoryName : t.categoryName}</label>
                        <input
                          dir={meta.dir}
                          value={localizedFieldValue(selectedCategory.name, language)}
                          placeholder={meta.categoryPlaceholder}
                          onChange={(event) => updateLocalized("groups", selectedCategory.id, "name", language, event.target.value)}
                        />
                      </div>
                    </section>
                  );
                })}
              </div>
              <label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedCategory.visible !== false} onChange={(event) => updateEntry("groups", selectedCategory.id, { visible: event.target.checked })} /><span /><div><strong>{t.visible}</strong><small>{t.visibleCategory}</small></div></label>
              <button type="button" className="menu-content-v2-inspector-add" onClick={() => addItem(selectedCategory.id)}><Plus size={14} /> {t.addItemCategory}</button>
              {!selectedCategory.parent_id ? <button type="button" className="menu-content-v2-inspector-add" onClick={() => addCategory(selectedCategory.id)}><Plus size={14} /> {t.addSubcategory}</button> : null}
              {selectedCategory.parent_id || topLevelGroups.length > 1 ? <button type="button" className="menu-content-v2-danger" onClick={() => deleteCategory(selectedCategory.id)}><Trash2 size={14} /> {selectedCategory.parent_id ? t.deleteSubcategory : t.deleteCategory}</button> : null}
            </>
          ) : null}

          {selectedItem ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>{t.itemEyebrow}</span><h2 dir={contentDir}>{textValue(selectedItem.name, contentLanguage) || t.itemName}</h2><p>{t.itemHelp}</p></div>
              <div className="menu-content-v2-field">
                <label htmlFor="studio-item-group">{t.itemCategory}</label>
                <select id="studio-item-group" value={selectedItem.group_id} onChange={(event) => {
                  const groupId = event.target.value;
                  setMenu((current) => moveItemToGroup(current, selectedItem.id, groupId));
                  setMobileCategoryId(rootGroupId(menu.groups, groupId));
                }}>
                  {allGroups.map((group) => {
                    const parent = menu.groups.find((entry) => entry.id === group.parent_id);
                    const name = textValue(group.name, contentLanguage) || (parent ? t.subcategoryName : t.categoryName);
                    return <option key={group.id} value={group.id}>{parent ? `${textValue(parent.name, contentLanguage) || t.categoryName} / ${name}` : name}</option>;
                  })}
                </select>
              </div>
              <div className="menu-content-v2-language-fields">
                {editingLanguages.map((language) => {
                  const meta = MENU_LANGUAGE_META[language];
                  return (
                    <section className="menu-content-v2-language-card" key={`item-${selectedItem.id}-${language}`} dir={meta.dir}>
                      <header><strong>{meta.label}</strong><span>{meta.code}</span></header>
                      <div className="menu-content-v2-field">
                        <label>{t.itemName}</label>
                        <input
                          dir={meta.dir}
                          value={localizedFieldValue(selectedItem.name, language)}
                          placeholder={meta.itemNamePlaceholder}
                          onChange={(event) => updateLocalized("items", selectedItem.id, "name", language, event.target.value)}
                        />
                      </div>
                      <div className="menu-content-v2-field">
                        <label>{t.description}</label>
                        <textarea
                          dir={meta.dir}
                          value={localizedFieldValue(selectedItem.description, language)}
                          placeholder={meta.descriptionPlaceholder}
                          onChange={(event) => updateLocalized("items", selectedItem.id, "description", language, event.target.value)}
                        />
                      </div>
                    </section>
                  );
                })}
              </div>

              <MenuContentPriceEditor
                item={selectedItem}
                currencySymbol={currencySymbol}
                contentLanguage={contentLanguage}
                contentDir={contentDir}
                t={t}
                onChange={(patch) => updateEntry("items", selectedItem.id, patch)}
              />

              <MenuContentImageEditor
                item={selectedItem}
                projectId={menu.source_project_id || profile?.importedProjectId || "draft"}
                t={t}
                onChange={(patch) => updateEntry("items", selectedItem.id, patch)}
              />

              <label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedItem.visible !== false} onChange={(event) => updateEntry("items", selectedItem.id, { visible: event.target.checked })} /><span /><div><strong>{t.visible}</strong><small>{t.visibleItem}</small></div></label>
              <button type="button" className="menu-content-v2-danger" onClick={() => deleteItem(selectedItem.id)}><Trash2 size={14} /> {t.deleteItem}</button>
            </>
          ) : null}

          <div className="menu-content-v2-inspector-next">
            <div><Check size={14} /><span><strong>{t.updatesLive}</strong><small>{t.draftKept}</small></span></div>
            <button type="button" onClick={() => navigate(studioRoute("/menu-studio/design"))}>{t.continueDesign} <ForwardIcon size={14} /></button>
          </div>
        </aside>
      </div>
    </main>
  );
}
