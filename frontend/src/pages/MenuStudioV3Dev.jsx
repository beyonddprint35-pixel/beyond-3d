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

const COLOR_PRESETS = [
  { name: "Olive", accent: "#556b2f", background: "#f6f4ef", surface: "#fffdf8" },
  { name: "Beyond", accent: "#4974e5", background: "#f7f9ff", surface: "#ffffff" },
  { name: "Bordeaux", accent: "#8b2f43", background: "#fbf6f7", surface: "#ffffff" },
  { name: "Espresso", accent: "#6b4a32", background: "#f8f3ed", surface: "#fffaf5" },
];

function formatPrice(value) {
  if (!value) return "";
  return value.toString().startsWith("₪") ? value : `₪${value}`;
}

function moveInArray(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function MenuStudioV3Dev() {
  const [tab, setTab] = useState("content");
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [selectedGroupId, setSelectedGroupId] = useState("draft");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [draftItem, setDraftItem] = useState(null);
  const [designPanel, setDesignPanel] = useState("colors");
  const [design, setDesign] = useState(() => ({
    ...DEFAULT_MENU_DESIGN,
    theme: { ...DEFAULT_MENU_DESIGN.theme },
    typography: { ...DEFAULT_MENU_DESIGN.typography },
    layout: { ...DEFAULT_MENU_DESIGN.layout },
  }));

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

  function patchDesign(section, patch) {
    setDesign(current => ({
      ...current,
      [section]: { ...current[section], ...patch },
    }));
  }

  function setTemplate(template) {
    setDesign(current => ({ ...current, template }));
  }

  function openGroup(groupId) {
    setSelectedGroupId(groupId);
    setMobileDetail(true);
  }

  function openItemEditor(item) {
    setEditingItemId(item.id);
    setDraftItem({ ...item });
  }

  function closeItemEditor() {
    setEditingItemId(null);
    setDraftItem(null);
  }

  function saveItem() {
    if (!draftItem) return;
    setItems(current => current.map(item => item.id === editingItemId ? { ...draftItem } : item));
    closeItemEditor();
  }

  function addItem() {
    const id = `item-${Date.now()}`;
    const item = { id, group_id: selectedGroup.id, name: "New item", description: "", smallLabel: "", smallPrice: "", largeLabel: "", largePrice: "", visible: true };
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
    setMobileDetail(true);
  }

  function toggleItem(itemId) {
    setItems(current => current.map(item => item.id === itemId ? { ...item, visible: !item.visible } : item));
  }

  function toggleGroup(groupId) {
    setGroups(current => current.map(group => group.id === groupId ? { ...group, visible: !group.visible } : group));
  }

  function moveGroup(groupId, direction) {
    setGroups(current => {
      const index = current.findIndex(group => group.id === groupId);
      return moveInArray(current, index, direction);
    });
  }

  function moveItem(itemId, direction) {
    setItems(current => {
      const groupItems = current.filter(item => item.group_id === selectedGroup.id);
      const index = groupItems.findIndex(item => item.id === itemId);
      const reordered = moveInArray(groupItems, index, direction);
      let pointer = 0;
      return current.map(item => item.group_id === selectedGroup.id ? reordered[pointer++] : item);
    });
  }

  return (
    <div className="studio-v3-shell">
      <header className="studio-v3-topbar">
        <div className="studio-v3-brand">
          <span className="studio-v3-mark">B</span>
          <div><strong>Menu Studio</strong><span>El Puerto · local V3 prototype</span></div>
        </div>
        <span className="studio-v3-live">LOCAL</span>
      </header>

      <nav className="studio-v3-tabs" aria-label="Studio sections">
        {["content", "design", "preview", "settings"].map(key => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => { setTab(key); setMobileDetail(false); }}>
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
      </nav>

      <main className="studio-v3-main">
        {tab === "content" && (
          <div className={`studio-v3-content-layout ${mobileDetail ? "mobile-detail" : ""}`}>
            <section className="studio-v3-panel studio-v3-categories">
              <div className="studio-v3-panel-heading">
                <div><span className="studio-v3-eyebrow">MENU CONTENT</span><h1>Categories</h1></div>
                <button className="studio-v3-primary small" onClick={addCategory}>+ Add category</button>
              </div>

              <div className="studio-v3-category-list">
                {groups.map((group, index) => {
                  const count = items.filter(item => item.group_id === group.id).length;
                  return (
                    <div key={group.id} className={`studio-v3-category-card ${selectedGroupId === group.id ? "selected" : ""}`}>
                      <button className="studio-v3-category-open" onClick={() => openGroup(group.id)}>
                        <span className="studio-v3-category-copy"><strong>{group.name}</strong><small>{count} items · {group.visible ? "Visible" : "Hidden"}</small></span>
                        <span className="studio-v3-chevron">›</span>
                      </button>
                      <div className="studio-v3-order-actions" aria-label={`Reorder ${group.name}`}>
                        <button disabled={index === 0} onClick={() => moveGroup(group.id, -1)}>↑</button>
                        <button disabled={index === groups.length - 1} onClick={() => moveGroup(group.id, 1)}>↓</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="studio-v3-panel studio-v3-items">
              <button className="studio-v3-mobile-back" onClick={() => setMobileDetail(false)}>← Categories</button>
              <div className="studio-v3-panel-heading">
                <div><span className="studio-v3-eyebrow">CATEGORY</span><h2>{selectedGroup?.name}</h2></div>
                <button className="studio-v3-primary small" onClick={addItem}>+ Add item</button>
              </div>

              <div className="studio-v3-inline-actions">
                <button onClick={() => toggleGroup(selectedGroup.id)}>{selectedGroup?.visible ? "Hide category" : "Show category"}</button>
              </div>

              <div className="studio-v3-item-list">
                {selectedItems.map((item, index) => (
                  <article key={item.id} className={`studio-v3-item-card ${item.visible ? "" : "is-hidden"}`}>
                    <div className="studio-v3-item-copy">
                      <div className="studio-v3-item-title-row"><strong>{item.name}</strong><span>{item.largePrice ? `${formatPrice(item.smallPrice)} / ${formatPrice(item.largePrice)}` : formatPrice(item.smallPrice)}</span></div>
                      <p>{item.description || "No description"}</p>
                    </div>
                    <div className="studio-v3-item-actions">
                      <button onClick={() => openItemEditor(item)}>Edit</button>
                      <button onClick={() => toggleItem(item.id)}>{item.visible ? "Hide" : "Show"}</button>
                      <span className="studio-v3-order-actions compact">
                        <button disabled={index === 0} onClick={() => moveItem(item.id, -1)}>↑</button>
                        <button disabled={index === selectedItems.length - 1} onClick={() => moveItem(item.id, 1)}>↓</button>
                      </span>
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
                  <button className={design.template === "classic" ? "active" : ""} onClick={() => setTemplate("classic")}><strong>Classic</strong><span>Clean · no photos required</span></button>
                  <button className={design.template === "visual" ? "active" : ""} onClick={() => setTemplate("visual")}><strong>Visual</strong><span>Image-led menu cards</span></button>
                </div>
              </div>

              <div className="studio-v3-design-tabs">
                {["colors", "type", "layout"].map(key => <button key={key} className={designPanel === key ? "active" : ""} onClick={() => setDesignPanel(key)}>{key === "type" ? "Typography" : key[0].toUpperCase() + key.slice(1)}</button>)}
              </div>

              {designPanel === "colors" && (
                <div className="studio-v3-design-section">
                  <label className="studio-v3-control-label">Color preset</label>
                  <div className="studio-v3-color-presets">
                    {COLOR_PRESETS.map(preset => (
                      <button key={preset.name} onClick={() => patchDesign("theme", { accent: preset.accent, background: preset.background, surface: preset.surface })}>
                        <span className="studio-v3-swatch" style={{ background: preset.accent }} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                  <label className="studio-v3-color-field"><span>Accent</span><input type="color" value={design.theme.accent} onChange={e => patchDesign("theme", { accent: e.target.value })} /></label>
                  <label className="studio-v3-color-field"><span>Background</span><input type="color" value={design.theme.background} onChange={e => patchDesign("theme", { background: e.target.value })} /></label>
                </div>
              )}

              {designPanel === "type" && (
                <div className="studio-v3-design-section">
                  <label className="studio-v3-range-field"><span>Hero size <b>{design.typography.heroSize}px</b></span><input type="range" min="30" max="64" value={design.typography.heroSize} onChange={e => patchDesign("typography", { heroSize: Number(e.target.value) })} /></label>
                  <label className="studio-v3-range-field"><span>Section size <b>{design.typography.sectionSize}px</b></span><input type="range" min="24" max="48" value={design.typography.sectionSize} onChange={e => patchDesign("typography", { sectionSize: Number(e.target.value) })} /></label>
                  <label className="studio-v3-range-field"><span>Item name <b>{design.typography.itemNameSize}px</b></span><input type="range" min="13" max="22" value={design.typography.itemNameSize} onChange={e => patchDesign("typography", { itemNameSize: Number(e.target.value) })} /></label>
                </div>
              )}

              {designPanel === "layout" && (
                <div className="studio-v3-design-section">
                  <label className="studio-v3-range-field"><span>Card radius <b>{design.layout.cardRadius}px</b></span><input type="range" min="0" max="28" value={design.layout.cardRadius} onChange={e => patchDesign("layout", { cardRadius: Number(e.target.value) })} /></label>
                  <label className="studio-v3-range-field"><span>Item spacing <b>{design.layout.itemGap}px</b></span><input type="range" min="8" max="28" value={design.layout.itemGap} onChange={e => patchDesign("layout", { itemGap: Number(e.target.value) })} /></label>
                  <div className="studio-v3-choice-row"><span>Price position</span><div><button className={design.layout.pricePosition === "inline" ? "active" : ""} onClick={() => patchDesign("layout", { pricePosition: "inline" })}>Inline</button><button className={design.layout.pricePosition === "below" ? "active" : ""} onClick={() => patchDesign("layout", { pricePosition: "below" })}>Below</button></div></div>
                </div>
              )}
            </section>

            <section className="studio-v3-preview-panel">
              <div className="studio-v3-preview-label">LIVE PREVIEW · 390PX</div>
              <div className="studio-v3-phone-canvas"><MenuRenderer menu={rendererMenu} design={design} /></div>
            </section>
          </div>
        )}

        {tab === "preview" && (
          <section className="studio-v3-preview-full">
            <div className="studio-v3-preview-label">CUSTOMER PREVIEW · 390PX</div>
            <div className="studio-v3-phone-canvas standalone"><MenuRenderer menu={rendererMenu} design={design} /></div>
          </section>
        )}

        {tab === "settings" && (
          <section className="studio-v3-panel studio-v3-settings-panel">
            <span className="studio-v3-eyebrow">SETTINGS</span><h1>Menu settings</h1>
            <button className="studio-v3-setting-row"><span>Restaurant details</span><span>›</span></button>
            <button className="studio-v3-setting-row"><span>Languages</span><span>Hebrew + English ›</span></button>
            <button className="studio-v3-setting-row"><span>Menu URL</span><span>/menu/el-puerto ›</span></button>
            <button className="studio-v3-setting-row"><span>QR & NFC</span><span>›</span></button>
          </section>
        )}
      </main>

      {draftItem && (
        <div className="studio-v3-modal-backdrop" role="presentation" onMouseDown={closeItemEditor}>
          <section className="studio-v3-editor-sheet" role="dialog" aria-modal="true" aria-label="Edit item" onMouseDown={event => event.stopPropagation()}>
            <div className="studio-v3-sheet-handle" />
            <div className="studio-v3-sheet-heading">
              <div><span className="studio-v3-eyebrow">ITEM</span><h2>Edit item</h2></div>
              <button className="studio-v3-icon-button" onClick={closeItemEditor}>×</button>
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
            <div className="studio-v3-sheet-footer"><button className="studio-v3-secondary" onClick={closeItemEditor}>Cancel</button><button className="studio-v3-primary" onClick={saveItem}>Save item</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
