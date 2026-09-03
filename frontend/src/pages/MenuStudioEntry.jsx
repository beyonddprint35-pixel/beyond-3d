import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { listMenuStudioProjects, readActiveMenuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { chooseStudioProject, studioProjectUrl } from "../features/menu-engine/studio/studioNavigation";
import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import { useMenuStudioWorkspace } from "../features/menu-engine/studio/menuStudioWorkspaceContext";
import "../features/menu-engine/studio/MenuStudioV2PersistenceBoundary.css";

const COPY = {
  en: { error: "We couldn’t open your menu.", retry: "Try again", home: "Return home" },
  he: { error: "לא הצלחנו לפתוח את התפריט.", retry: "ניסיון נוסף", home: "חזרה לבית" },
  ar: { error: "تعذر فتح القائمة.", retry: "حاول مجددًا", home: "العودة للرئيسية" },
};

export default function MenuStudioEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = useMenuStudioWorkspace();
  const [state, setState] = useState("resolving");
  const [attempt, setAttempt] = useState(0);
  const language = readStudioLanguage("en");
  const t = COPY[language] || COPY.en;
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedProjectId = String(params.get("project") || "").trim();
  const requestedSiteId = String(params.get("site") || "").trim();
  const activeProjectId = readActiveMenuStudioProjectId();

  const immediateTarget = requestedProjectId
    ? `/menu-studio/content${location.search}`
    : (!requestedSiteId && activeProjectId
      ? studioProjectUrl("/menu-studio/content", location.search, activeProjectId)
      : "");

  useEffect(() => {
    if (immediateTarget) return undefined;
    let active = true;
    setState("resolving");

    async function open() {
      try {
        const projects = await (workspace ? workspace.loadProjects() : listMenuStudioProjects());
        if (!active) return;
        const project = chooseStudioProject(projects, {
          siteId: requestedSiteId,
          activeId: activeProjectId,
        });

        if (project) {
          navigate(studioProjectUrl("/menu-studio/content", location.search, project.id), { replace: true });
        } else if (requestedSiteId) {
          setState("error");
        } else {
          navigate(`/menu-builder?ui=${language}`, { replace: true });
        }
      } catch {
        if (active) setState("error");
      }
    }

    void open();
    return () => { active = false; };
  }, [immediateTarget, requestedSiteId, activeProjectId, location.search, navigate, attempt, language, workspace]);

  if (immediateTarget) return <Navigate replace to={immediateTarget} />;

  // First-time accounts may need one project lookup. Keep that resolution invisible instead
  // of blocking the whole Studio with an "Opening..." card.
  if (state === "resolving") return null;

  return <main className="menu-studio-persistence-screen" dir={language === "en" ? "ltr" : "rtl"}>
    <div className="menu-studio-persistence-card">
      <h1>{t.error}</h1>
      <div>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button>
        <button type="button" onClick={() => navigate("/")}>{t.home}</button>
      </div>
    </div>
  </main>;
}
