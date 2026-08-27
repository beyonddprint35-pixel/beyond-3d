import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { loadPublishedMenuBySlug } from "../features/menu-engine/data/menuRepository";
import { createMenuDraftSession, updateDraftDesign, updateDraftMenu } from "../features/menu-engine/studio/draftSession";
import { MENU_ALLERGENS, MENU_DIETARY_BADGES, MENU_SPICE_LEVELS, BADGE_LABELS } from "../features/menu-engine/domain/itemMetadata";
import "./MenuStudioV3Dev.css";
import "./MenuStudioV3Draft.css";

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

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadPublishedMenuBySlug(slug)
      .then(payload => {
        if (!active) return;
        const next = createMenuDraftSession(payload);
        setSession(next);
        setSelectedGroupId(next.menu.groups[0]?.id || "");
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
  const language = menu?.default_language || "he";
  const selectedGroup = menu?.groups?.find(group => group.id === selectedGroupId) || menu?.groups?.[0] || null;
  const selectedItems = selectedGroup ? menu.items.filter(item => item.group_id === selectedGroup.id) : [];
  const frameWidth = viewport === "desktop" ? "min(1080px,100%)" : `${viewport}px`;

  const previewMenu = useMemo(() => {
    if (!menu) return null;
    return {
      ...menu,
      groups: menu.groups.filter(group => group.visible !== false),
      items: menu.items.filter(item => item.visible !== false),
    };
  }, [menu]);

  function patchMenu(updater) {
    setSession(current => updateDraftMenu(current, updater));
  }

  function patchDesign(updater) {
    setSession(current => updateDraftDesign(current, updater));
  }

  function openItem(item) {
    setEditingItemId(item.id);
    setDraftItem(JSON.parse(JSON.stringify(item)));
  }

  function saveItemLocally() {
    if (!draftItem) return;
    patchMenu(current => ({
      ...current,
      items: current.items.map(item => item.id === editingItemId ? draftItem : item),
    }));
    setEditingItemId(null);
    setDraftItem(null);
  }

  function toggleBadge(kind, key) {
    const current = draftItem.metadata?.[kind] || [];
    const exists = current.includes(key);
    setDraftItem(item => ({
      ...item,
      metadata: {
        ...item.metadata,
        [kind]: exists ? current.filter(value => value !== key) : [...current, key],
        reviewedByOwner: true,
      },
    }));
  }

  function toggleVisibility(id, type) {
    patchMenu(current => ({
      ...current,
      [type]: current[type].map(row => row.id === id ? { ...row, visible: row.visible === false } : row),
    }));
  }

  if (status === "loading") return <div className="studio-v3-draft-state">Loading real menu into a safe draft…</div>;
  if (status === "error") return <div className="studio-v3-draft-state error">{error}</div>;
  if (!session || !menu) return null;

  return (
    <div className="studio-v3-shell">
      <header className="studio-v3-topbar">
        <div className="studio-v3-brand">
          <span className="studio-v3-mark">B</span>
          <div><strong>Menu Studio V3</strong><span>{menu.restaurant_name} · real data draft</span></div>
        </div>
        <div className="studio-v3-draft-status">
          <span className={session.dirty ? "dirty" : "clean"}>{session.dirty ? "UNSAVED DRAFT" : "LIVE DATA LOADED"}</span>
          <span className="studio-v3-live">NO WRITES</span>
        </div>
      </header>

      <nav className="studio-v3-tabs">
        {["content","design","preview","settings"].map(key => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => { setTab(key); setMobileDetail(false); }}>
            {key[0].toUpperCase()+key.slice(1)}
          </button>
        ))}
      </nav>

      <main className="studio-v3-main">
        {tab === "content" && (
          <div className={`studio-v3-content-layout ${mobileDetail ? "mobile-detail" : ""}`}>
            <section className="studio-v3-panel studio-v3-categories">
              <div className="studio-v3-panel-heading">
                <div><span className="studio-v3-eyebrow">REAL CONTENT · LOCAL DRAFT</span><h1>Categories</h1></div>
              </div>
              <div className="studio-v3-category-list">
                {menu.groups.map(group => {
                  const count = menu.items.filter(item => item.group_id === group.id).length;
                  return (
                    <div className={`studio-v3-category-card ${selectedGroup?.id === group.id ? "selected" : ""}`} key={group.id}>
                      <button className="studio-v3-category-open" onClick={() => { setSelectedGroupId(group.id); setMobileDetail(true); }}>
                        <span className="studio-v3-category-copy"><strong>{textFor(group.name, language)}</strong><small>{count} items · {group.visible === false ? "Hidden" : "Visible"}</small></span>
                        <span className="studio-v3-chevron">›</span>
                      </button>
                      <button className="studio-v3-draft-hide" onClick={() => toggleVisibility(group.id,"groups")}>{group.visible === false ? "Show" : "Hide"}</button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="studio-v3-panel studio-v3-items">
              <button className="studio-v3-mobile-back" onClick={() => setMobileDetail(false)}>← Categories</button>
              <div className="studio-v3-panel-heading">
                <div><span className="studio-v3-eyebrow">CATEGORY</span><h2>{textFor(selectedGroup?.name, language)}</h2></div>
              </div>
              <div className="studio-v3-item-list">
                {selectedItems.map(item => (
                  <article className={`studio-v3-item-card ${item.visible === false ? "is-hidden" : ""}`} key={item.id}>
                    <div className="studio-v3-item-copy">
                      <div className="studio-v3-item-title-row"><strong>{textFor(item.name, language)}</strong><span>{priceText(item)}</span></div>
                      <p>{textFor(item.description, language) || "No description"}</p>
                    </div>
                    <div className="studio-v3-item-actions">
                      <button onClick={() => openItem(item)}>Edit</button>
                      <button onClick={() => toggleVisibility(item.id,"items")}>{item.visible === false ? "Show" : "Hide"}</button>
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
              <span className="studio-v3-eyebrow">DESIGN · DRAFT ONLY</span>
              <h1>Make it yours</h1>
              <p>Changes update the preview instantly and stay local.</p>
              <div className="studio-v3-template-grid">
                {["classic","visual"].map(template => (
                  <button key={template} className={session.design.template === template ? "active" : ""} onClick={() => patchDesign(current => ({ ...current, template }))}>
                    <strong>{template === "classic" ? "Classic" : "Visual"}</strong><span>{template === "classic" ? "No photos required" : "Image-led cards"}</span>
                  </button>
                ))}
              </div>
              <div className="studio-v3-design-tabs">
                {["colors","type","layout"].map(key => <button key={key} className={designPanel===key?"active":""} onClick={()=>setDesignPanel(key)}>{key==="type"?"Typography":key[0].toUpperCase()+key.slice(1)}</button>)}
              </div>
              {designPanel === "colors" && <>
                <label className="studio-v3-color-field"><span>Accent</span><input type="color" value={session.design.theme.accent} onChange={e => patchDesign(current => ({...current,theme:{...current.theme,accent:e.target.value}}))}/></label>
                <label className="studio-v3-color-field"><span>Background</span><input type="color" value={session.design.theme.background} onChange={e => patchDesign(current => ({...current,theme:{...current.theme,background:e.target.value}}))}/></label>
              </>}
              {designPanel === "type" && <label className="studio-v3-range-field"><span>Item name <b>{session.design.typography.itemNameSize}px</b></span><input type="range" min="13" max="22" value={session.design.typography.itemNameSize} onChange={e => patchDesign(current => ({...current,typography:{...current.typography,itemNameSize:Number(e.target.value)}}))}/></label>}
              {designPanel === "layout" && <label className="studio-v3-range-field"><span>Card radius <b>{session.design.layout.cardRadius}px</b></span><input type="range" min="0" max="28" value={session.design.layout.cardRadius} onChange={e => patchDesign(current => ({...current,layout:{...current.layout,cardRadius:Number(e.target.value)}}))}/></label>}
            </section>
            <section className="studio-v3-preview-panel">
              <div className="studio-v3-preview-label">LIVE DRAFT PREVIEW · 390PX</div>
              <div className="studio-v3-phone-canvas"><MenuRenderer menu={previewMenu} design={session.design} /></div>
            </section>
          </div>
        )}

        {tab === "preview" && (
          <section className="studio-v3-preview-full">
            <div className="studio-v3-preview-switcher">{["320","375","390","430","desktop"].map(size => <button key={size} className={viewport===size?"active":""} onClick={()=>setViewport(size)}>{size === "desktop" ? "Desktop" : size}</button>)}</div>
            <div className="studio-v3-draft-preview-frame" style={{width:frameWidth}}><MenuRenderer menu={previewMenu} design={session.design} /></div>
          </section>
        )}

        {tab === "settings" && (
          <section className="studio-v3-panel studio-v3-settings-panel">
            <span className="studio-v3-eyebrow">SETTINGS</span><h1>Menu settings</h1>
            <div className="studio-v3-setting-row"><span>Restaurant</span><span>{menu.restaurant_name}</span></div>
            <div className="studio-v3-setting-row"><span>Menu URL</span><span>/menu/{menu.slug}</span></div>
            <div className="studio-v3-setting-row"><span>Languages</span><span>{menu.languages.join(" + ").toUpperCase()}</span></div>
            <div className="studio-v3-safety-note">Publishing is intentionally disabled in this milestone. Nothing on this screen writes to Supabase.</div>
          </section>
        )}
      </main>

      {draftItem && (
        <div className="studio-v3-modal-backdrop" onMouseDown={() => { setDraftItem(null); setEditingItemId(null); }}>
          <section className="studio-v3-editor-sheet" onMouseDown={e => e.stopPropagation()}>
            <div className="studio-v3-sheet-handle" />
            <div className="studio-v3-sheet-heading"><div><span className="studio-v3-eyebrow">ITEM · LOCAL DRAFT</span><h2>Edit item</h2></div><button className="studio-v3-icon-button" onClick={()=>setDraftItem(null)}>×</button></div>
            <label className="studio-v3-field">Name<input value={draftItem.name?.[language] || ""} onChange={e=>setDraftItem(item=>({...item,name:{...item.name,[language]:e.target.value}}))}/></label>
            <label className="studio-v3-field">Description<textarea rows="3" value={draftItem.description?.[language] || ""} onChange={e=>setDraftItem(item=>({...item,description:{...item.description,[language]:e.target.value}}))}/></label>
            {!draftItem.price_options?.length ? <label className="studio-v3-field">Price<input value={draftItem.price || ""} onChange={e=>setDraftItem(item=>({...item,price:e.target.value}))}/></label> : null}

            <div className="studio-v3-badge-editor">
              <div className="studio-v3-badge-head"><strong>Dietary & allergen badges</strong><span>Owner-confirmed only</span></div>
              <div className="studio-v3-badge-grid">
                {MENU_DIETARY_BADGES.map(key => <button key={key} className={draftItem.metadata?.dietary?.includes(key)?"active":""} onClick={()=>toggleBadge("dietary",key)}>{BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en}</button>)}
                {MENU_ALLERGENS.map(key => <button key={key} className={draftItem.metadata?.allergens?.includes(key)?"active":""} onClick={()=>toggleBadge("allergens",key)}>{BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en}</button>)}
              </div>
              <label className="studio-v3-field">Spice level<select value={draftItem.metadata?.spice || "none"} onChange={e=>setDraftItem(item=>({...item,metadata:{...item.metadata,spice:e.target.value,reviewedByOwner:true}}))}>{MENU_SPICE_LEVELS.map(key=><option key={key} value={key}>{key === "none" ? "Not spicy" : (BADGE_LABELS[key]?.[language] || BADGE_LABELS[key]?.en)}</option>)}</select></label>
              <div className="studio-v3-ai-suggestion-note"><strong>AI badge suggestions</strong><span>Reserved for the next AI step. AI will suggest likely badges from name/description, but the restaurant must confirm before they appear publicly.</span></div>
            </div>

            <div className="studio-v3-sheet-footer"><button className="studio-v3-secondary" onClick={()=>setDraftItem(null)}>Cancel</button><button className="studio-v3-primary" onClick={saveItemLocally}>Apply to draft</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
