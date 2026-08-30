import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
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

function textValue(value, language = "en") {
  if (value && typeof value === "object") return value[language] || value.en || value.he || value.ar || "";
  return String(value || "");
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

export default function MenuContentStudioV2() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(readMenuCreateV2Profile, []);
  const requestedDesignId = params.get("design") || "";
  const resolvedDesign = useMemo(
    () => resolveMenuStudioV2Design(storedDraft, requestedDesignId),
    [storedDraft, requestedDesignId],
  );

  const [uiLanguage, setUiLanguage] = useState(() => {
    const requested = params.get("ui");
    return ["en", "he", "ar"].includes(requested) ? requested : readStudioLanguage("en");
  });
  const [contentLanguage, setContentLanguage] = useState(
    () => storedDraft?.contentLanguage || storedDraft?.menu?.default_language || "en",
  );
  const [menu, setMenu] = useState(() => storedDraft?.menu || createBlankMenuV2());
  const [selection, setSelection] = useState(() => ({ type: "restaurant", id: "restaurant" }));
  const [saveState, setSaveState] = useState("saved");

  const t = MENU_CONTENT_STUDIO_UI[uiLanguage] || MENU_CONTENT_STUDIO_UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const contentDir = studioLanguageDirection(contentLanguage);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const design = resolvedDesign.design;
  const selectedDesignEntry = resolvedDesign.entry;
  const currencySymbol = menu.currency_symbol || "₪";

  const visibleGroups = useMemo(
    () => [...(menu.groups || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    [menu.groups],
  );

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
  const selectedPriceOptions = itemPriceOptions(selectedItem);

  const saveLabel = saveState === "saving" ? t.saving : saveState === "error" ? t.saveError : t.saved;

  function changeUiLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
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

  function updatePriceOption(itemId, optionIndex, patch) {
    setMenu((current) => ({
      ...current,
      items: current.items.map((entry) => {
        if (entry.id !== itemId) return entry;
        const options = itemPriceOptions(entry).map((option, index) => index === optionIndex
          ? { ...option, ...patch }
          : option);
        return { ...entry, price_options: options };
      }),
    }));
  }

  function updatePriceOptionLabel(itemId, optionIndex, language, value) {
    setMenu((current) => ({
      ...current,
      items: current.items.map((entry) => {
        if (entry.id !== itemId) return entry;
        const options = itemPriceOptions(entry).map((option, index) => {
          if (index !== optionIndex) return option;
          const localizedKey = `label_${language}`;
          const previousLocalized = String(option?.[localizedKey] || "");
          const shouldSyncFallback = !option?.label || option.label === previousLocalized;
          return {
            ...option,
            [localizedKey]: value,
            ...(shouldSyncFallback ? { label: value } : {}),
          };
        });
        return { ...entry, price_options: options };
      }),
    }));
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
    setSelection({ type: "category", id });
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
      visible: true,
      sort_order: nextSortOrder(groupItems),
    };
    setMenu((current) => ({ ...current, items: [...current.items, item] }));
    setSelection({ type: "item", id });
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
  }

  function deleteItem(itemId) {
    setMenu((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
    setSelection({ type: "restaurant", id: "restaurant" });
  }

  return (
    <main className="menu-content-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-content-v2-topbar">
        <div className="menu-content-v2-brand-wrap">
          <button type="button" className="menu-content-v2-back" onClick={() => window.location.assign("/dev/menu-create-v2")} title={t.backSetup}>
            <BackIcon size={16} />
          </button>
          <button type="button" className="menu-content-v2-brand" onClick={() => setSelection({ type: "restaurant", id: "restaurant" })}>
            <img src={beyondLogo} alt="" />
            <span><strong>Beyond Menu Studio</strong><small>{menu.restaurant_name}</small></span>
          </button>
        </div>

        <nav className="menu-content-v2-product-nav" aria-label={t.workspace}>
          <button type="button" className="active">{t.content}</button>
          <button type="button" onClick={() => window.location.assign("/dev/menu-design-v2")}>{t.design}</button>
          <button type="button" onClick={() => window.location.assign("/dev/menu-preview-v2")}>{t.preview}</button>
          <button type="button" onClick={() => window.location.assign("/dev/menu-publish-v2")}>{t.publish}</button>
        </nav>

        <div className="menu-content-v2-top-actions">
          <StudioLanguageMenu value={contentLanguage} onChange={setContentLanguage} label={t.contentLanguage} compact />
          <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} label={t.interfaceLanguage} compact />
          <div className="menu-content-v2-save"><span className={saveState === "saved" ? "ok" : ""} /><strong>{saveLabel}</strong></div>
        </div>
      </header>

      <div className="menu-content-v2-workspace">
        <aside className="menu-content-v2-tree">
          <div className="menu-content-v2-panel-head">
            <div><span>{t.contentEyebrow}</span><strong>{t.menuStructure}</strong></div>
            <button type="button" onClick={addCategory} title={t.addCategory}><Plus size={16} /></button>
          </div>

          <button type="button" className={`menu-content-v2-restaurant-row ${selection.type === "restaurant" ? "active" : ""}`} onClick={() => setSelection({ type: "restaurant", id: "restaurant" })}>
            <span className="menu-content-v2-tree-icon">B</span>
            <span><strong>{menu.restaurant_name}</strong><small>{t.restaurantDetails}</small></span>
            <ChevronRight size={14} />
          </button>

          <div className="menu-content-v2-tree-label"><span>{t.categories}</span><small>{visibleGroups.length}</small></div>

          <div className="menu-content-v2-categories">
            {visibleGroups.map((group) => {
              const items = menu.items
                .filter((item) => item.group_id === group.id)
                .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
              return (
                <section key={group.id} className="menu-content-v2-category-block">
                  <button type="button" className={`menu-content-v2-category-row ${selection.type === "category" && selection.id === group.id ? "active" : ""}`} onClick={() => setSelection({ type: "category", id: group.id })}>
                    <GripVertical size={13} />
                    <span><strong dir={contentDir}>{textValue(group.name, contentLanguage)}</strong><small>{t.items(items.length)}</small></span>
                    <ChevronRight size={13} />
                  </button>

                  <div className="menu-content-v2-items">
                    {items.map((item) => {
                      const summary = priceSummary(item, currencySymbol, contentLanguage);
                      return (
                        <button type="button" key={item.id} className={selection.type === "item" && selection.id === item.id ? "active" : ""} onClick={() => setSelection({ type: "item", id: item.id })}>
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
            <div className="menu-content-v2-device"><Smartphone size={13} /> {t.mobile} <span>390 × 780</span></div>
          </div>

          <div className="menu-content-v2-canvas">
            <div className="menu-content-v2-phone" dir={contentDir}>
              <MenuRenderer key={contentLanguage} menu={{ ...menu, default_language: contentLanguage }} design={design} initialLanguage={contentLanguage} />
            </div>
          </div>
        </section>

        <aside className="menu-content-v2-inspector">
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

              {selectedPriceOptions.length ? (
                <div className="menu-content-v2-price-options">
                  <header><strong>{t.priceOptions}</strong><small>{t.multiPriceHelp}</small></header>
                  {selectedPriceOptions.map((option, optionIndex) => (
                    <div className="menu-content-v2-price-option" key={`${selectedItem.id}-price-${optionIndex}`}>
                      <label>{t.optionLabel}<input dir={contentDir} value={optionLabel(option, contentLanguage)} onChange={(event) => updatePriceOptionLabel(selectedItem.id, optionIndex, contentLanguage, event.target.value)} /></label>
                      <label className="menu-content-v2-price-option-price">{t.optionPrice}<span>{currencySymbol}</span><input inputMode="decimal" dir="ltr" value={option.price || ""} onChange={(event) => updatePriceOption(selectedItem.id, optionIndex, { price: event.target.value })} /></label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="menu-content-v2-field"><label>{t.price}</label><div className="menu-content-v2-price"><span>{currencySymbol}</span><input inputMode="decimal" dir="ltr" value={selectedItem.price || ""} onChange={(event) => updateEntry("items", selectedItem.id, { price: event.target.value })} placeholder="0" /></div></div>
              )}

              <div className="menu-content-v2-field"><label>{t.imageUrl} <small>{t.tempDev}</small></label><div className="menu-content-v2-image-input"><ImagePlus size={15} /><input dir="ltr" value={selectedItem.image_url || ""} onChange={(event) => updateEntry("items", selectedItem.id, { image_url: event.target.value })} placeholder="https://..." /></div></div>
              <label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedItem.visible !== false} onChange={(event) => updateEntry("items", selectedItem.id, { visible: event.target.checked })} /><span /><div><strong>{t.visible}</strong><small>{t.visibleItem}</small></div></label>
              <button type="button" className="menu-content-v2-danger" onClick={() => deleteItem(selectedItem.id)}><Trash2 size={14} /> {t.deleteItem}</button>
            </>
          ) : null}

          <div className="menu-content-v2-inspector-next">
            <div><Check size={14} /><span><strong>{t.updatesLive}</strong><small>{t.draftKept}</small></span></div>
            <button type="button" onClick={() => window.location.assign("/dev/menu-design-v2")}>{t.continueDesign} <ForwardIcon size={14} /></button>
          </div>
        </aside>
      </div>
    </main>
  );
}
