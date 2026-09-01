import { useEffect, useMemo, useState } from "react";
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

import beyondLogo from "../assets/beyond-logo-transparent.png";
import MenuContentImageEditor from "../components/MenuContentImageEditor";
import MenuContentPriceEditor from "../components/MenuContentPriceEditor";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import MenuStudioMobilePreview from "../features/menu-engine/studio/MenuStudioMobilePreview";
import {
  createBlankMenuV2,
  makeLocalizedText,
  readMenuCreateV2Profile,
  readMenuStudioV2Draft,
  resolveMenuStudioV2Design,
  writeMenuStudioV2Draft,
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

function textValue(value, language = "en") {
  if (value && typeof value === "object") return value[language] || value.en || value.he || value.ar || "";
  return String(value || "");
}

function nextSortOrder(list) {
  if (!list.length) return 0;
  return Math.max(...list.map((entry) => Number(entry.sort_order || 0))) + 1;
}

function ordered(list) {
  return [...list].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function reorderById(list, sourceId, targetId) {
  const next = ordered(list);
  const sourceIndex = next.findIndex((entry) => entry.id === sourceId);
  const targetIndex = next.findIndex((entry) => entry.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return next;
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((entry, index) => ({ ...entry, sort_order: index }));
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
  return `${path}${window.location.search || ""}`;
}

export default function MenuContentStudioV2() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(readMenuCreateV2Profile, []);
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
  const [saveState, setSaveState] = useState("saved");
  const [dragging, setDragging] = useState(null);

  const t = MENU_CONTENT_STUDIO_UI[uiLanguage] || MENU_CONTENT_STUDIO_UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const contentDir = studioLanguageDirection(contentLanguage);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const design = resolvedDesign.design;
  const selectedDesignEntry = resolvedDesign.entry;
  const currencySymbol = menu.currency_symbol || "₪";

  const visibleGroups = useMemo(() => ordered(menu.groups || []), [menu.groups]);

  useEffect(() => {
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const ok = writeMenuStudioV2Draft({
        ...(storedDraft || {}),
        menu,
        design,
        designId: resolvedDesign.designId,
        profile,
        contentLanguage,
      });
      setSaveState(ok ? "saved" : "error");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [menu, design, resolvedDesign.designId, profile, contentLanguage, storedDraft]);

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
    setSelection(nextSelection);
    setMobilePane("edit");
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
    setMenu((current) => ({ ...current, groups: reorderById(current.groups || [], dragging.id, targetId) }));
    setDragging(null);
  }

  function dropItem(event, targetItem) {
    event.preventDefault();
    if (dragging?.type !== "item" || dragging.groupId !== targetItem.group_id || dragging.id === targetItem.id) return;
    setMenu((current) => {
      const sameGroup = current.items.filter((item) => item.group_id === targetItem.group_id);
      const reordered = reorderById(sameGroup, dragging.id, targetItem.id);
      const reorderedMap = new Map(reordered.map((item) => [item.id, item]));
      return {
        ...current,
        items: current.items.map((item) => item.group_id === targetItem.group_id ? reorderedMap.get(item.id) || item : item),
      };
    });
    setDragging(null);
  }

  function addCategory() {
    const id = `group-${Date.now()}`;
    const group = {
      id,
      name: makeLocalizedText("New category", "קטגוריה חדשה", "فئة جديدة"),
      sort_order: nextSortOrder(menu.groups || []),
      visible: true,
    };
    setMenu((current) => ({ ...current, groups: [...current.groups, group] }));
    selectForEdit({ type: "category", id });
  }

  function addItem(groupId) {
    const groupItems = menu.items.filter((item) => item.group_id === groupId);
    const id = `item-${Date.now()}`;
    const item = {
      id,
      group_id: groupId,
      name: makeLocalizedText("New item", "פריט חדש", "صنف جديد"),
      description: makeLocalizedText("Add a short description", "הוסיפו תיאור קצר", "أضيفوا وصفاً قصيراً"),
      price: "",
      price_options: [],
      image_url: "",
      image_path: "",
      visible: true,
      sort_order: nextSortOrder(groupItems),
    };
    setMenu((current) => ({ ...current, items: [...current.items, item] }));
    selectForEdit({ type: "item", id });
  }

  function deleteCategory(groupId) {
    const remainingGroups = menu.groups.filter((group) => group.id !== groupId);
    if (!remainingGroups.length) return;
    setMenu((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
      items: current.items.filter((item) => item.group_id !== groupId),
    }));
    setSelection({ type: "restaurant", id: "restaurant" });
    setMobilePane("structure");
  }

  function deleteItem(itemId) {
    setMenu((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
    setSelection({ type: "restaurant", id: "restaurant" });
    setMobilePane("structure");
  }

  return (
    <main className="menu-content-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-content-v2-topbar">
        <div className="menu-content-v2-brand-wrap">
          <button type="button" className="menu-content-v2-back" onClick={() => window.location.assign("/my-menus")} title={t.backSetup}>
            <BackIcon size={16} />
          </button>
          <button type="button" className="menu-content-v2-brand" onClick={() => selectForEdit({ type: "restaurant", id: "restaurant" })}>
            <img src={beyondLogo} alt="" />
            <span><strong>Beyond Menu Studio</strong><small>{menu.restaurant_name}</small></span>
          </button>
        </div>

        <nav className="menu-content-v2-product-nav" aria-label={t.workspace}>
          <button type="button" className="active">{t.content}</button>
          <button type="button" onClick={() => window.location.assign(studioRoute("/menu-studio/design"))}>{t.design}</button>
          <button type="button" onClick={() => window.location.assign(studioRoute("/menu-studio/preview"))}>{t.preview}</button>
          <button type="button" onClick={() => window.location.assign(studioRoute("/menu-studio/publish"))}>{t.publish}</button>
        </nav>

        <div className="menu-content-v2-top-actions">
          <StudioLanguageMenu value={contentLanguage} onChange={changeStudioLanguage} label={t.contentLanguage} compact />
          <div className="menu-content-v2-save"><span className={saveState === "saved" ? "ok" : ""} /><strong>{saveLabel}</strong></div>
        </div>
      </header>

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
            <button type="button" onClick={addCategory} title={t.addCategory}><Plus size={16} /></button>
          </div>

          <button type="button" className={`menu-content-v2-restaurant-row ${selection.type === "restaurant" ? "active" : ""}`} onClick={() => selectForEdit({ type: "restaurant", id: "restaurant" })}>
            <span className="menu-content-v2-tree-icon">B</span>
            <span><strong>{menu.restaurant_name}</strong><small>{t.restaurantDetails}</small></span>
            <ChevronRight size={14} />
          </button>

          <div className="menu-content-v2-tree-label"><span>{t.categories}</span><small>{visibleGroups.length}</small></div>

          <div className="menu-content-v2-categories">
            {visibleGroups.map((group) => {
              const items = ordered(menu.items.filter((item) => item.group_id === group.id));
              const groupDragging = dragging?.type === "category" && dragging.id === group.id;
              return (
                <section key={group.id} className={`menu-content-v2-category-block ${groupDragging ? "dragging" : ""}`}>
                  <button
                    type="button"
                    draggable
                    className={`menu-content-v2-category-row ${selection.type === "category" && selection.id === group.id ? "active" : ""}`}
                    onClick={() => selectForEdit({ type: "category", id: group.id })}
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

          <button type="button" className="menu-content-v2-add-category" onClick={addCategory}><Plus size={14} /> {t.addCategory}</button>
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
              <div className="menu-content-v2-field"><label>{t.restaurantName}</label><input value={menu.restaurant_name || ""} onChange={(event) => updateRestaurant("restaurant_name", event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>{t.subtitle}</label><input dir={contentDir} value={textValue(menu.restaurant_subtitle, contentLanguage)} onChange={(event) => updateRestaurant("restaurant_subtitle", { ...(menu.restaurant_subtitle || {}), [contentLanguage]: event.target.value })} /></div>
              <div className="menu-content-v2-info-card"><Sparkles size={16} /><div><strong>{t.designApplied}</strong><p>{t.designAppliedHint(selectedDesignEntry?.name)}</p></div></div>
            </>
          ) : null}

          {selectedCategory ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>{t.categoryEyebrow}</span><h2 dir={contentDir}>{textValue(selectedCategory.name, contentLanguage)}</h2><p>{t.categoryHelp}</p></div>
              <div className="menu-content-v2-field"><label>{t.categoryName}</label><input dir={contentDir} value={textValue(selectedCategory.name, contentLanguage)} onChange={(event) => updateLocalized("groups", selectedCategory.id, "name", contentLanguage, event.target.value)} /></div>
              <label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedCategory.visible !== false} onChange={(event) => updateEntry("groups", selectedCategory.id, { visible: event.target.checked })} /><span /><div><strong>{t.visible}</strong><small>{t.visibleCategory}</small></div></label>
              <button type="button" className="menu-content-v2-inspector-add" onClick={() => addItem(selectedCategory.id)}><Plus size={14} /> {t.addItemCategory}</button>
              {menu.groups.length > 1 ? <button type="button" className="menu-content-v2-danger" onClick={() => deleteCategory(selectedCategory.id)}><Trash2 size={14} /> {t.deleteCategory}</button> : null}
            </>
          ) : null}

          {selectedItem ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>{t.itemEyebrow}</span><h2 dir={contentDir}>{textValue(selectedItem.name, contentLanguage)}</h2><p>{t.itemHelp}</p></div>
              <div className="menu-content-v2-field"><label>{t.itemName}</label><input dir={contentDir} value={textValue(selectedItem.name, contentLanguage)} onChange={(event) => updateLocalized("items", selectedItem.id, "name", contentLanguage, event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>{t.description}</label><textarea dir={contentDir} value={textValue(selectedItem.description, contentLanguage)} onChange={(event) => updateLocalized("items", selectedItem.id, "description", contentLanguage, event.target.value)} /></div>

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
            <button type="button" onClick={() => window.location.assign(studioRoute("/menu-studio/design"))}>{t.continueDesign} <ForwardIcon size={14} /></button>
          </div>
        </aside>
      </div>
    </main>
  );
}