import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { flushMenuStudioProjectSave, listMenuStudioProjects, menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { flushStudioDraft, STUDIO_NAV_COPY, studioProjectUrl } from "../features/menu-engine/studio/studioNavigation";

export default function MenuStudioMenuSwitcher({ language, menuName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("");
  const [attempt, setAttempt] = useState(0);
  const projectId = new URLSearchParams(location.search).get("project") || menuStudioProjectId(readMenuStudioV2Draft());
  const t = STUDIO_NAV_COPY[language] || STUDIO_NAV_COPY.en;
  useEffect(() => {
    let active = true;
    listMenuStudioProjects().then((rows) => { if (active) { setProjects(rows); setStatus(""); } }).catch(() => { if (active) setStatus("loadError"); });
    return () => { active = false; };
  }, [attempt]);
  async function switchMenu(id) {
    if (id === projectId || status === "saving") return;
    setStatus("saving");
    try {
      if (!flushStudioDraft()) throw new Error("Draft could not be saved.");
      await flushMenuStudioProjectSave(projectId);
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
