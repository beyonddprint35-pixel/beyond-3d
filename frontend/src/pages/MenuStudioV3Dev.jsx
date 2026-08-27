import { useMemo, useState } from "react";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { DEFAULT_MENU_DESIGN } from "../features/menu-engine/domain/designSchema";
import "./MenuStudioV3Dev.css";

const INITIAL_GROUPS = [
  { id: "draft", name: "Draft Beer", visible: true },
  { id: "food", name: "Food & Snacks", visible: true },
  { id: "bottles", name: "Beer from Bottle", visible: true },
  { id: "cocktails", name: "Cocktails", visible: true },
];

const INITIAL_ITEMS = [
  { id: "guinness", group_id: "draft", name: "Guinness", description: "Dark Irish stout, 4.2%", smallLabel: "330ml", smallPrice: "28", largeLabel: "500ml", largePrice: "35", visible: true },
  { id: "weihenstephan", group_id: "draft", name: "Weihenstephan", description: "German wheat beer", smallLabel: "330ml", smallPrice: "28", largeLabel: "500ml", largePrice: "35", visible: true },
  { id: "carlsberg", group_id: "draft", name: "Carlsberg", description: "Crisp lager", smallLabel: "330ml", smallPrice: "25", largeLabel: "500ml", largePrice: "32", visible: true },
  { id: "nachos", group_id: "food", name: "Nachos", description: "Salsa, cheese and jalapeño", smallLabel: "", smallPrice: "42", largeLabel: "", largePrice: "", visible: true },
];

function formatPrice(value) {
  if (!value) return "";
  return value.toString().startsWith("₪") ? value : `₪${value}`;
}

export default function MenuStudioV3Dev() {
  const [tab, setTab] = useState("content");
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [selectedGroupId, setSelectedGroupId] = useState("draft");
  const [editingItemId, setEditingItemId] = useState(null);
  const [draftItem, setDraftItem] = useState(null);
  const [template, setTemplate] = useState("classic");

  const selectedGroup = groups.find(group => group.id === selectedGroupId) || groups[0];
  const selectedItems = items.filter(item => item.group_id === selectedGroup?.id);

  const rendererMenu = useMemo(() => ({
    restaurant_name: "El Puerto",
    subtitle: { en: "Bar · Cafe", he: "בר · קפה" },
    hero_kicker: { en: "Digital Menu", he: "תפריט דיגיטלי" },
    hero_title: { en: "Our Menu", he: "התפריט שלנו" },
    languages: ["he", "en"],
    default_language: "he",
    groups: groups.filter(group => group.visible).map(group => ({
      id: group.id,
      name: { en: group.name, he: group.name },
    })),
    items: items.filter(item => item.visible).map(item => ({
      id: item.id,
      group_id: item.group_id,
      name: { en: item.name, he: item.name },
      description: { en: item.description, he: item.description },
      price: item.largePrice ? "" : formatPrice(item.smallPrice),
      price_options: item.largePrice ? [
        { label: item.smallLabel, price: formatPrice(item.smallPrice) },
        { label: item.largeLabel, price: formatPrice(item.largePrice) },
      ] : [],
      image_url: "",
    })),
  }), [groups, items]);

  const design = useMemo(() => ({
    ...DEFAULT_MENU_DESIGN,
    template,
    theme: { ...DEFAULT_MENU_DESIGN.theme },
    typography: { ...DEFAULT_MENU_DESIGN.typography },
    layout: { ...DEFAULT_MENU_DESIGN.layout },
  }), [template]);

  function openItemEditor(item) {
    setEditingItemId(item.id);
    setDraftItem({ ...item });
  }

  function saveItem() {
    if (!draftItem) return;
    setItems(current => current.map(item => item.id === editingItemId ? { ...draftItem } : item));
    setEditingItemId(null);
    setDraftItem(null);
  }

  function addItem() {
    const id = `item-${Date.now()}`;
    const item = {
      id,
      group_id: selectedGroup.id,
      name: "New item",
      description: "",
      smallLabel: "",
      smallPrice: "",
      largeLabel: "",
      largePrice: "",
      visible: true,
    };
    setItems(current => [...current, item]);
    setEditingItemId(id);
    setDraftItem(item);
  }

  function addCategory() {
    const id = `group-${Date.now()}`;
    const name = window.prompt("Category name", "New category");
    if (!name?.trim()) return;
    setGroups(current => [...current, { id, name: name.trim(), visible: true }]);
    setSelectedGroupId(id);
  }

  function toggleItem(itemId) {
    setItems(current => current.map(item => item.id === itemId ? { ...item, visible: !item.visible } : item));
  }

  function toggleGroup(groupId) {
    setGroups(current => current.map(group => group.id === groupId ? { ...group, visible: !group.visible } : group));
  }

  return (
    <div className="studio-v3-shell">
      <header className="studio-v3-topbar">
        <div className="studio-v3-brand">
          <span className="studio-v3-mark">B</span>
          <div>
            <strong>Menu Studio</strong>
            <span>El Puerto · local V3 prototype</span>
          </div>
        </div>
        <span className="studio-v3-live">LOCAL</span>
      </header>

      <nav className="studio-v3-tabs" aria-label="Studio sections">
        {["content", "design", "preview", "settings"].map(key => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
      </nav>

      <main className="studio-v3-main">
        {tab === "content" && (
          <div className="studio-v3-content-layout">
            <section className="studio-v3-panel studio-v3-categories">
              <div className="studio-v3-panel-heading">
                <div>
                  <span className="studio-v3-eyebrow">MENU CONTENT</span>
                  <h1>Categories</h1>
                </div>
                <button className="studio-v3-primary small" onClick={addCategory}>+ Add category</button>
              </div>

              <div className="studio-v3-category-list">
                {groups.map(group => {
                  const count = items.filter(item => item.group_id === group.id).length;
                  return (
                    <button
                      key={group.id}
                      className={`studio-v3-category-card ${selectedGroupId === group.id ? "selected" : ""}`}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <span className="studio-v3-category-copy">
                        <strong>{group.name}</strong>
                        <small>{count} items · {group.visible ? "Visible" : "Hidden"}</small>
                      </span>
                      <span className="studio-v3-chevron">›</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="studio-v3-panel studio-v3-items">
              <div className="studio-v3-panel-heading">
                <div>
                  <span className="studio-v3-eyebrow">CATEGORY</span>
                  <h2>{selectedGroup?.name}</h2>
                </div>
                <button className="studio-v3-primary small" onClick={addItem}>+ Add item</button>
              </div>

              <div className="studio-v3-inline-actions">
                <button onClick={() => toggleGroup(selectedGroup.id)}>{selectedGroup?.visible ? "Hide category" : "Show category"}</button>
              </div>

              <div className="studio-v3-item-list">
                {selectedItems.map(item => (
                  <article key={item.id} className={`studio-v3-item-card ${item.visible ? "" : "is-hidden"}`}>
                    <div className="studio-v3-item-copy">
                      <div className="studio-v3-item-title-row">
                        <strong>{item.name}</strong>
                        <span>{item.largePrice ? `${formatPrice(item.smallPrice)} / ${formatPrice(item.largePrice)}` : formatPrice(item.smallPrice)}</span>
                      </div>
                      <p>{item.description || "No description"}</p>
                    </div>
                    <div className="studio-v3-item-actions">
                      <button onClick={() => openItemEditor(item)}>Edit</button>
                      <button onClick={() => toggleItem(item.id)}>{item.visible ? "Hide" : "Show"}</button>
                      <button aria-label="More actions">•••</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "design" && (
          <div className="studio-v3-design-layout">
            <section className="studio-v3-panel studio-v3-design-controls">
              <span className="studio-v3-eyebrow">DESIGN</span>
              <h1>Make it yours</h1>
              <p>Choose safe design options. Beyond keeps the menu responsive automatically.</p>

              <div className="studio-v3-control-group">
                <label>Template</label>
                <div className="studio-v3-template-grid">
                  <button className={template === "classic" ? "active" : ""} onClick={() => setTemplate("classic")}><strong>Classic</strong><span>Clean · no photos required</span></button>
                  <button className={template === "visual" ? "active" : ""} onClick={() => setTemplate("visual")}><strong>Visual</strong><span>Image-led menu cards</span></button>
                </div>
              </div>

              {["Colors", "Typography", "Header", "Categories", "Items", "Images", "Spacing"].map(label => (
                <button className="studio-v3-setting-row" key={label}><span>{label}</span><span>›</span></button>
              ))}
            </section>

            <section className="studio-v3-preview-panel">
              <div className="studio-v3-preview-label">LIVE PREVIEW · 390PX</div>
              <div className="studio-v3-phone-canvas">
                <MenuRenderer menu={rendererMenu} design={design} />
              </div>
            </section>
          </div>
        )}

        {tab === "preview" && (
          <section className="studio-v3-preview-full">
            <div className="studio-v3-preview-label">CUSTOMER PREVIEW · 390PX</div>
            <div className="studio-v3-phone-canvas standalone">
              <MenuRenderer menu={rendererMenu} design={design} />
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="studio-v3-panel studio-v3-settings-panel">
            <span className="studio-v3-eyebrow">SETTINGS</span>
            <h1>Menu settings</h1>
            <button className="studio-v3-setting-row"><span>Restaurant details</span><span>›</span></button>
            <button className="studio-v3-setting-row"><span>Languages</span><span>Hebrew + English ›</span></button>
            <button className="studio-v3-setting-row"><span>Menu URL</span><span>/menu/el-puerto ›</span></button>
            <button className="studio-v3-setting-row"><span>QR & NFC</span><span>›</span></button>
          </section>
        )}
      </main>

      {draftItem && (
        <div className="studio-v3-modal-backdrop" role="presentation" onMouseDown={() => { setEditingItemId(null); setDraftItem(null); }}>
          <section className="studio-v3-editor-sheet" role="dialog" aria-modal="true" aria-label="Edit item" onMouseDown={event => event.stopPropagation()}>
            <div className="studio-v3-sheet-handle" />
            <div className="studio-v3-sheet-heading">
              <div>
                <span className="studio-v3-eyebrow">ITEM</span>
                <h2>Edit item</h2>
              </div>
              <button className="studio-v3-icon-button" onClick={() => { setEditingItemId(null); setDraftItem(null); }}>×</button>
            </div>

            <label className="studio-v3-field">Name<input value={draftItem.name} onChange={e => setDraftItem({ ...draftItem, name: e.target.value })} /></label>
            <label className="studio-v3-field">Description<textarea rows="3" value={draftItem.description} onChange={e => setDraftItem({ ...draftItem, description: e.target.value })} /></label>

            <div className="studio-v3-price-grid">
              <label className="studio-v3-field">First size<input value={draftItem.smallLabel} placeholder="330ml" onChange={e => setDraftItem({ ...draftItem, smallLabel: e.target.value })} /></label>
              <label className="studio-v3-field">First price<input inputMode="decimal" value={draftItem.smallPrice} placeholder="28" onChange={e => setDraftItem({ ...draftItem, smallPrice: e.target.value })} /></label>
              <label className="studio-v3-field">Second size<input value={draftItem.largeLabel} placeholder="500ml" onChange={e => setDraftItem({ ...draftItem, largeLabel: e.target.value })} /></label>
              <label className="studio-v3-field">Second price<input inputMode="decimal" value={draftItem.largePrice} placeholder="35" onChange={e => setDraftItem({ ...draftItem, largePrice: e.target.value })} /></label>
            </div>

            <label className="studio-v3-toggle-row"><span>Visible on menu</span><input type="checkbox" checked={draftItem.visible} onChange={e => setDraftItem({ ...draftItem, visible: e.target.checked })} /></label>

            <div className="studio-v3-sheet-footer">
              <button className="studio-v3-secondary" onClick={() => { setEditingItemId(null); setDraftItem(null); }}>Cancel</button>
              <button className="studio-v3-primary" onClick={saveItem}>Save item</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
