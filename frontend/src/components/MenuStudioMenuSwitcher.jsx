import { useEffect, useRef, useState } from "react";
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
  const mounted = useRef(true);
  const projectId = new URLSearchParams(location.search).get("project") || menuStudioProjectId(readMenuStudioV2Draft());
  const t = STUDIO_NAV_COPY[language] || STUDIO_NAV_COPY.en;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    (workspace ? workspace.loadProjects() : listMenuStudioProjects()).then((rows) => { if (active) { setProjects(rows); setStatus(""); } }).catch(() => { if (active) setStatus("loadError"); });
    return () => { active = false; };
  }, [attempt, workspace]);
  async function switchMenu(id) {
    if (id === projectId || status === "saving") return;
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
      navigate(studioProjectUrl(location.pathname, location.search, id));
    } catch { setStatus("error"); }
  }
  if (status === "loadError") return <div className="menu-studio-menu-switcher"><button type="button" onClick={() => setAttempt((value) => value + 1)}>{t.menus} · {t.retry}</button></div>;
  if (projects.length <= 1) return null;
  return <div className="menu-studio-menu-switcher">
    <nav aria-label={t.menus}>
      {projects.map((project) => <button key={project.id} type="button" aria-pressed={project.id === projectId} disabled={status === "saving"} onClick={() => switchMenu(project.id)}>{project.id === projectId ? menuName || project.name : project.name}</button>)}
    </nav>
    {status ? <p role="status">{status === "saving" ? t.switching : t.switchError}</p> : null}
  </div>;
}
