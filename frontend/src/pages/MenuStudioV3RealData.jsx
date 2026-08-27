import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { DEFAULT_MENU_DESIGN, normalizeMenuDesign } from "../features/menu-engine/domain/designSchema";
import { loadPublishedMenuBySlug } from "../features/menu-engine/data/menuRepository";
import "./MenuStudioV3RealData.css";

function choose(values = {}, language = "en") {
  return values?.[language] || values?.en || values?.he || values?.ar || "";
}

export default function MenuStudioV3RealData() {
  const [params, setParams] = useSearchParams();
  const slug = params.get("slug") || "el-puerto";
  const [slugInput, setSlugInput] = useState(slug);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [viewport, setViewport] = useState("390");
  const [template, setTemplate] = useState("classic");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    loadPublishedMenuBySlug(slug)
      .then(result => {
        if (!active) return;
        setPayload(result);
        setSelectedGroupId(result.menu.groups[0]?.id || "");
        setTemplate("classic");
        setStatus("ready");
      })
      .catch(err => {
        if (!active) return;
        setError(err?.message || "Could not load this menu.");
        setPayload(null);
        setStatus("error");
      });
    return () => { active = false; };
  }, [slug]);

  const design = useMemo(() => normalizeMenuDesign({
    ...DEFAULT_MENU_DESIGN,
    template,
    theme: { ...DEFAULT_MENU_DESIGN.theme },
    typography: { ...DEFAULT_MENU_DESIGN.typography },
    layout: { ...DEFAULT_MENU_DESIGN.layout },
  }), [template]);

  const menu = payload?.menu;
  const selectedGroup = menu?.groups?.find(group => group.id === selectedGroupId) || menu?.groups?.[0] || null;
  const selectedItems = selectedGroup ? menu.items.filter(item => item.group_id === selectedGroup.id) : [];
  const displayLanguage = menu?.default_language || "he";
  const frameWidth = viewport === "desktop" ? "min(1080px, 100%)" : `${viewport}px`;

  function submitSlug(event) {
    event.preventDefault();
    const clean = slugInput.trim();
    if (!clean || clean === slug) return;
    setParams({ slug: clean });
  }

  return (
    <div className="v3-real-shell">
      <header className="v3-real-topbar">
        <div>
          <strong>BEYOND MENU STUDIO V3</strong>
          <span>REAL DATA · READ ONLY · LOCAL DEVELOPMENT</span>
        </div>
        <span className="v3-real-safe">NO WRITES</span>
      </header>

      <form className="v3-real-loader" onSubmit={submitSlug}>
        <label>Published menu slug</label>
        <div>
          <input value={slugInput} onChange={event => setSlugInput(event.target.value)} placeholder="el-puerto" />
          <button type="submit">Load menu</button>
        </div>
      </form>

      {status === "loading" ? <div className="v3-real-state">Loading real menu data from Supabase…</div> : null}
      {status === "error" ? <div className="v3-real-state error">{error}</div> : null}

      {status === "ready" && menu ? (
        <main className="v3-real-main">
          <section className="v3-real-summary">
            <div><span>Restaurant</span><strong>{menu.restaurant_name}</strong></div>
            <div><span>Slug</span><strong>/{menu.slug}</strong></div>
            <div><span>Categories</span><strong>{menu.groups.length}</strong></div>
            <div><span>Items</span><strong>{menu.items.length}</strong></div>
          </section>

          <div className="v3-real-workspace">
            <aside className="v3-real-panel">
              <div className="v3-real-panel-head">
                <div><span>REAL CONTENT</span><h1>Categories</h1></div>
                <span className="v3-real-lock">🔒 Read only</span>
              </div>

              <div className="v3-real-categories">
                {menu.groups.map(group => {
                  const count = menu.items.filter(item => item.group_id === group.id).length;
                  return (
                    <button key={group.id} className={selectedGroup?.id === group.id ? "active" : ""} onClick={() => setSelectedGroupId(group.id)}>
                      <span><strong>{choose(group.name, displayLanguage)}</strong><small>{count} items</small></span>
                      <b>›</b>
                    </button>
                  );
                })}
              </div>

              {selectedGroup ? (
                <div className="v3-real-items">
                  <h2>{choose(selectedGroup.name, displayLanguage)}</h2>
                  {selectedItems.map(item => (
                    <article key={item.id}>
                      <div>
                        <strong>{choose(item.name, displayLanguage)}</strong>
                        <p>{choose(item.description, displayLanguage) || "No description"}</p>
                      </div>
                      <span>{item.price || item.price_options?.map(option => option.price).join(" / ")}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </aside>

            <section className="v3-real-preview-area">
              <div className="v3-real-preview-tools">
                <div className="v3-real-segment">
                  <button className={template === "classic" ? "active" : ""} onClick={() => setTemplate("classic")}>Classic</button>
                  <button className={template === "visual" ? "active" : ""} onClick={() => setTemplate("visual")}>Visual</button>
                </div>
                <div className="v3-real-segment">
                  {["320", "375", "390", "430"].map(size => <button key={size} className={viewport === size ? "active" : ""} onClick={() => setViewport(size)}>{size}</button>)}
                  <button className={viewport === "desktop" ? "active" : ""} onClick={() => setViewport("desktop")}>Desktop</button>
                </div>
              </div>

              <div className="v3-real-stage">
                <div className="v3-real-frame" style={{ width: frameWidth }}>
                  <MenuRenderer menu={menu} design={design} />
                </div>
              </div>
            </section>
          </div>

          <div className="v3-real-note">
            This page only performs SELECT queries against published menu data. Category editing, item editing, design changes and publishing are intentionally not persisted yet.
          </div>
        </main>
      ) : null}
    </div>
  );
}
