import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { flushMenuStudioProjectSave, listMenuStudioProjects, menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { useMenuStudioWorkspace } from "../features/menu-engine/studio/menuStudioWorkspaceContext";
import { flushStudioDraft, STUDIO_NAV_COPY, studioProjectUrl } from "../features/menu-engine/studio/studioNavigation";

export default function MenuStudioMenuSwitcher({ language, menuName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = useMenuStudioWorkspace();
  const [projects, setProjects] = useState(() => workspace?.cachedProjects() || []);
  const [status, setStatus] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [compactOpen, setCompactOpen] = useState(false);
  const mounted = useRef(true);
  const projectId = new URLSearchParams(location.search).get("project") || menuStudioProjectId(readMenuStudioV2Draft());
  const t = STUDIO_NAV_COPY[language] || STUDIO_NAV_COPY.en;
  const activeProject = projects.find((project) => project.id === projectId);
  const activeName = menuName || activeProject?.name || t.menus;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    (workspace ? workspace.loadProjects() : listMenuStudioProjects()).then((rows) => {
      if (active) {
        setProjects(rows);
        setStatus("");
      }
    }).catch(() => {
      if (active) setStatus("loadError");
    });
    return () => { active = false; };
  }, [attempt, workspace]);

  useEffect(() => {
    setCompactOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!compactOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setCompactOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [compactOpen]);

  async function switchMenu(id) {
    if (!id || id === projectId || status === "saving") {
      if (id === projectId) setCompactOpen(false);
      return;
    }
    setStatus("saving");
    try {
      let savedSnapshot;
      let latestDraft;
      do {
        if (!flushStudioDraft()) throw new Error("Draft could not be saved.");
        savedSnapshot = JSON.stringify(readMenuStudioV2Draft());
        await flushMenuStudioProjectSave(projectId);
        if (!mounted.current) return;
        // Include edits made while the network save was in progress.
        if (!flushStudioDraft()) throw new Error("Draft could not be saved.");
        latestDraft = readMenuStudioV2Draft();
      } while (JSON.stringify(latestDraft) !== savedSnapshot);
      workspace?.rememberDraft(latestDraft);
      if (workspace && !workspace.activateDraft(id)) throw new Error("Menu could not be opened.");
      setCompactOpen(false);
      navigate(studioProjectUrl(location.pathname, location.search, id));
    } catch {
      setStatus("error");
    }
  }

  if (status === "loadError") {
    return <div className="menu-studio-menu-switcher"><button type="button" onClick={() => setAttempt((value) => value + 1)}>{t.menus} · {t.retry}</button></div>;
  }
  if (projects.length <= 1) return null;

  return <div className="menu-studio-menu-switcher" aria-busy={status === "saving" ? "true" : undefined}>
    <nav className="menu-studio-menu-switcher-wide" aria-label={t.menus}>
      {projects.map((project) => (
        <button key={project.id} type="button" aria-pressed={project.id === projectId} disabled={status === "saving"} onClick={() => switchMenu(project.id)}>
          {project.id === projectId ? activeName : project.name}
        </button>
      ))}
    </nav>

    <button
      type="button"
      className="menu-studio-menu-switcher-compact-trigger"
      aria-haspopup="dialog"
      aria-expanded={compactOpen}
      disabled={status === "saving"}
      onClick={() => setCompactOpen(true)}
    >
      <span><small>{t.menus}</small><strong>{activeName}</strong></span>
      <ChevronDown size={14} aria-hidden="true" />
    </button>

    {compactOpen ? (
      <div className="menu-studio-menu-switcher-layer" onClick={(event) => { if (event.target === event.currentTarget) setCompactOpen(false); }}>
        <section className="menu-studio-menu-switcher-sheet" role="dialog" aria-modal="true" aria-label={t.menus}>
          <div className="menu-studio-menu-switcher-sheet-head">
            <div><small>{t.menus}</small><strong>{activeName}</strong></div>
            <button type="button" aria-label="Close" onClick={() => setCompactOpen(false)}><X size={17} /></button>
          </div>
          <div className="menu-studio-menu-switcher-list">
            {projects.map((project) => {
              const current = project.id === projectId;
              return (
                <button key={project.id} type="button" className={current ? "active" : ""} aria-current={current ? "true" : undefined} disabled={status === "saving"} onClick={() => switchMenu(project.id)}>
                  <span>{current ? activeName : project.name}</span>
                  {current ? <Check size={17} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          {status ? <p role="status">{status === "saving" ? t.switching : t.switchError}</p> : null}
        </section>
      </div>
    ) : null}
  </div>;
}
