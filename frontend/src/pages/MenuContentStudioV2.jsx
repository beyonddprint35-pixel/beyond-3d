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
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { DEFAULT_MENU_DESIGN } from "../features/menu-engine/domain/designSchema";
import { PREMIUM_MENU_DESIGNS, applyPremiumMenuDesign } from "../features/menu-engine/domain/menuDesignLibrary";
import "./MenuContentStudioV2.css";

const DRAFT_KEY = "beyond-menu-content-studio-v2";
const FLOW_KEY = "beyond-menu-create-profile-v2";
const DESIGN_KEY = "beyond-menu-recommended-design-v2";

function textValue(value, language = "en") {
  if (value && typeof value === "object") return value[language] || value.en || value.he || value.ar || "";
  return String(value || "");
}

function makeText(en = "", he = "") {
  return { en, he, ar: "" };
}

function createBlankMenu() {
  return {
    restaurant_name: "My Restaurant",
    restaurant_subtitle: makeText("Restaurant menu", "תפריט מסעדה"),
    hero_eyebrow: makeText("Welcome", "ברוכים הבאים"),
    hero_title: makeText("Made for your table", "נוצר עבור השולחן שלכם"),
    languages: ["en", "he"],
    default_language: "en",
    currency_symbol: "₪",
    groups: [
      { id: "group-main", name: makeText("Main menu", "תפריט ראשי"), sort_order: 0, visible: true },
    ],
    items: [
      {
        id: "item-example",
        group_id: "group-main",
        name: makeText("Your first item", "הפריט הראשון שלכם"),
        description: makeText("Click this item in Content Studio to edit it.", "לחצו על הפריט כדי לערוך אותו."),
        price: "42",
        visible: true,
        sort_order: 0,
        image_url: "",
      },
    ],
  };
}

function readStoredDraft() {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "null");
    if (stored?.menu?.groups && stored?.menu?.items) return stored;
  } catch {
    // Ignore invalid session data.
  }
  return null;
}

function readCreationProfile() {
  try {
    return JSON.parse(window.sessionStorage.getItem(FLOW_KEY) || "null");
  } catch {
    return null;
  }
}

function nextSortOrder(list) {
  if (!list.length) return 0;
  return Math.max(...list.map((entry) => Number(entry.sort_order || 0))) + 1;
}

export default function MenuContentStudioV2() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const storedDraft = useMemo(readStoredDraft, []);
  const profile = useMemo(readCreationProfile, []);
  const requestedDesignId = params.get("design") || (() => {
    try { return window.sessionStorage.getItem(DESIGN_KEY) || ""; } catch { return ""; }
  })();

  const selectedDesignEntry = useMemo(
    () => PREMIUM_MENU_DESIGNS.find((entry) => entry.id === requestedDesignId) || PREMIUM_MENU_DESIGNS.find((entry) => entry.id === "heritage-original") || PREMIUM_MENU_DESIGNS[0],
    [requestedDesignId],
  );

  const design = useMemo(
    () => applyPremiumMenuDesign(DEFAULT_MENU_DESIGN, selectedDesignEntry?.id),
    [selectedDesignEntry?.id],
  );

  const [menu, setMenu] = useState(() => storedDraft?.menu || createBlankMenu());
  const [selection, setSelection] = useState(() => ({ type: "restaurant", id: "restaurant" }));
  const [saveStatus, setSaveStatus] = useState("Saved locally");

  const visibleGroups = useMemo(
    () => [...(menu.groups || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    [menu.groups],
  );

  useEffect(() => {
    setSaveStatus("Saving…");
    const timer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ menu, designId: selectedDesignEntry?.id || "", profile, savedAt: new Date().toISOString() }),
        );
        setSaveStatus("Saved locally");
      } catch {
        setSaveStatus("Could not save");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [menu, selectedDesignEntry?.id, profile]);

  const selectedCategory = selection.type === "category"
    ? menu.groups.find((group) => group.id === selection.id)
    : null;
  const selectedItem = selection.type === "item"
    ? menu.items.find((item) => item.id === selection.id)
    : null;

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

  function addCategory() {
    const id = `group-${Date.now()}`;
    const group = {
      id,
      name: makeText("New category", "קטגוריה חדשה"),
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
      name: makeText("New item", "פריט חדש"),
      description: makeText("Add a short description", "הוסיפו תיאור קצר"),
      price: "",
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
    <main className="menu-content-v2">
      <header className="menu-content-v2-topbar">
        <div className="menu-content-v2-brand-wrap">
          <button type="button" className="menu-content-v2-back" onClick={() => window.location.assign("/dev/menu-create-v2")} title="Back to setup">
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="menu-content-v2-brand" onClick={() => setSelection({ type: "restaurant", id: "restaurant" })}>
            <img src={beyondLogo} alt="" />
            <span><strong>Beyond Menu Studio</strong><small>{menu.restaurant_name}</small></span>
          </button>
        </div>

        <nav className="menu-content-v2-product-nav" aria-label="Menu workspace">
          <button type="button" className="active">Content</button>
          <button type="button" onClick={() => window.location.assign("/dev/menu-studio-v3-draft")}>Design</button>
          <button type="button" onClick={() => document.querySelector(".menu-content-v2-preview")?.scrollIntoView({ behavior: "smooth" })}>Preview</button>
          <button type="button" disabled>Publish</button>
        </nav>

        <div className="menu-content-v2-save"><span className={saveStatus === "Saved locally" ? "ok" : ""} /><strong>{saveStatus}</strong></div>
      </header>

      <div className="menu-content-v2-workspace">
        <aside className="menu-content-v2-tree">
          <div className="menu-content-v2-panel-head">
            <div><span>CONTENT</span><strong>Menu structure</strong></div>
            <button type="button" onClick={addCategory} title="Add category"><Plus size={16} /></button>
          </div>

          <button type="button" className={`menu-content-v2-restaurant-row ${selection.type === "restaurant" ? "active" : ""}`} onClick={() => setSelection({ type: "restaurant", id: "restaurant" })}>
            <span className="menu-content-v2-tree-icon">B</span>
            <span><strong>{menu.restaurant_name}</strong><small>Restaurant details</small></span>
            <ChevronRight size={14} />
          </button>

          <div className="menu-content-v2-tree-label"><span>Categories</span><small>{visibleGroups.length}</small></div>

          <div className="menu-content-v2-categories">
            {visibleGroups.map((group) => {
              const items = menu.items
                .filter((item) => item.group_id === group.id)
                .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
              return (
                <section key={group.id} className="menu-content-v2-category-block">
                  <button type="button" className={`menu-content-v2-category-row ${selection.type === "category" && selection.id === group.id ? "active" : ""}`} onClick={() => setSelection({ type: "category", id: group.id })}>
                    <GripVertical size={13} />
                    <span><strong>{textValue(group.name)}</strong><small>{items.length} items</small></span>
                    <ChevronRight size={13} />
                  </button>

                  <div className="menu-content-v2-items">
                    {items.map((item) => (
                      <button type="button" key={item.id} className={selection.type === "item" && selection.id === item.id ? "active" : ""} onClick={() => setSelection({ type: "item", id: item.id })}>
                        <GripVertical size={11} />
                        <span><strong>{textValue(item.name)}</strong><small>{item.price ? `₪${item.price}` : "No price"}</small></span>
                      </button>
                    ))}
                    <button type="button" className="menu-content-v2-add-item" onClick={() => addItem(group.id)}><Plus size={12} /> Add item</button>
                  </div>
                </section>
              );
            })}
          </div>

          <button type="button" className="menu-content-v2-add-category" onClick={addCategory}><Plus size={14} /> Add category</button>
        </aside>

        <section className="menu-content-v2-preview">
          <div className="menu-content-v2-canvas-toolbar">
            <div><span className="live" /><strong>LIVE PREVIEW</strong><small>Click content on the left to edit</small></div>
            <div className="menu-content-v2-design-chip"><Sparkles size={13} /><span>{selectedDesignEntry?.name || "Selected design"}</span></div>
            <div className="menu-content-v2-device"><Smartphone size={13} /> Mobile <span>390 × 780</span></div>
          </div>

          <div className="menu-content-v2-canvas">
            <div className="menu-content-v2-phone">
              <MenuRenderer menu={menu} design={design} initialLanguage={menu.default_language || "en"} />
            </div>
          </div>
        </section>

        <aside className="menu-content-v2-inspector">
          {selection.type === "restaurant" ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>RESTAURANT</span><h2>Menu details</h2><p>These details appear throughout the customer menu.</p></div>
              <div className="menu-content-v2-field"><label>Restaurant name</label><input value={menu.restaurant_name || ""} onChange={(event) => updateRestaurant("restaurant_name", event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>English subtitle</label><input value={textValue(menu.restaurant_subtitle, "en")} onChange={(event) => updateRestaurant("restaurant_subtitle", { ...(menu.restaurant_subtitle || {}), en: event.target.value })} /></div>
              <div className="menu-content-v2-field"><label>Hebrew subtitle</label><input dir="rtl" value={textValue(menu.restaurant_subtitle, "he")} onChange={(event) => updateRestaurant("restaurant_subtitle", { ...(menu.restaurant_subtitle || {}), he: event.target.value })} /></div>
              <div className="menu-content-v2-info-card"><Sparkles size={16} /><div><strong>Design fit applied</strong><p>{selectedDesignEntry?.name} was selected from your onboarding answers. Design Studio remains the place to refine colors, type and layout.</p></div></div>
            </>
          ) : null}

          {selectedCategory ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>CATEGORY</span><h2>{textValue(selectedCategory.name)}</h2><p>Edit the category customers use to navigate the menu.</p></div>
              <div className="menu-content-v2-field"><label>English name</label><input value={textValue(selectedCategory.name, "en")} onChange={(event) => updateLocalized("groups", selectedCategory.id, "name", "en", event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>Hebrew name</label><input dir="rtl" value={textValue(selectedCategory.name, "he")} onChange={(event) => updateLocalized("groups", selectedCategory.id, "name", "he", event.target.value)} /></div>
              <label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedCategory.visible !== false} onChange={(event) => updateEntry("groups", selectedCategory.id, { visible: event.target.checked })} /><span /><div><strong>Visible in menu</strong><small>Customers can browse this category</small></div></label>
              <button type="button" className="menu-content-v2-inspector-add" onClick={() => addItem(selectedCategory.id)}><Plus size={14} /> Add item to category</button>
              {menu.groups.length > 1 ? <button type="button" className="menu-content-v2-danger" onClick={() => deleteCategory(selectedCategory.id)}><Trash2 size={14} /> Delete category</button> : null}
            </>
          ) : null}

          {selectedItem ? (
            <>
              <div className="menu-content-v2-inspector-head"><span>MENU ITEM</span><h2>{textValue(selectedItem.name)}</h2><p>Edit the content customers see. Design is handled separately.</p></div>
              <div className="menu-content-v2-field"><label>English name</label><input value={textValue(selectedItem.name, "en")} onChange={(event) => updateLocalized("items", selectedItem.id, "name", "en", event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>Hebrew name</label><input dir="rtl" value={textValue(selectedItem.name, "he")} onChange={(event) => updateLocalized("items", selectedItem.id, "name", "he", event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>English description</label><textarea value={textValue(selectedItem.description, "en")} onChange={(event) => updateLocalized("items", selectedItem.id, "description", "en", event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>Hebrew description</label><textarea dir="rtl" value={textValue(selectedItem.description, "he")} onChange={(event) => updateLocalized("items", selectedItem.id, "description", "he", event.target.value)} /></div>
              <div className="menu-content-v2-field"><label>Price</label><div className="menu-content-v2-price"><span>₪</span><input inputMode="decimal" value={selectedItem.price || ""} onChange={(event) => updateEntry("items", selectedItem.id, { price: event.target.value })} placeholder="0" /></div></div>
              <div className="menu-content-v2-field"><label>Image URL <small>temporary dev input</small></label><div className="menu-content-v2-image-input"><ImagePlus size={15} /><input value={selectedItem.image_url || ""} onChange={(event) => updateEntry("items", selectedItem.id, { image_url: event.target.value })} placeholder="https://..." /></div></div>
              <label className="menu-content-v2-toggle"><input type="checkbox" checked={selectedItem.visible !== false} onChange={(event) => updateEntry("items", selectedItem.id, { visible: event.target.checked })} /><span /><div><strong>Visible in menu</strong><small>Customers can see this item</small></div></label>
              <button type="button" className="menu-content-v2-danger" onClick={() => deleteItem(selectedItem.id)}><Trash2 size={14} /> Delete item</button>
            </>
          ) : null}

          <div className="menu-content-v2-inspector-next">
            <div><Check size={14} /><span><strong>Content updates live</strong><small>Your draft is kept in this development session.</small></span></div>
            <button type="button" onClick={() => window.location.assign("/dev/menu-studio-v3-draft")}>Continue to Design <ArrowRight size={14} /></button>
          </div>
        </aside>
      </div>
    </main>
  );
}
