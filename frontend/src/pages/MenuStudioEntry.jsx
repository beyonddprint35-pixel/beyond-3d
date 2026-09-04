import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { listMenuStudioProjects, readActiveMenuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { chooseStudioProject, studioProjectUrl } from "../features/menu-engine/studio/studioNavigation";
import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import { useMenuStudioWorkspace } from "../features/menu-engine/studio/menuStudioWorkspaceContext";
import "../features/menu-engine/studio/MenuStudioV2PersistenceBoundary.css";

const COPY = {
  en: { signIn: "Sign in to open your menu", error: "We couldn’t open your menu.", retry: "Try again", home: "Return home" },
  he: { signIn: "התחברו כדי לפתוח את התפריט", error: "לא הצלחנו לפתוח את התפריט.", retry: "ניסיון נוסף", home: "חזרה לבית" },
  ar: { signIn: "سجّل الدخول لفتح قائمتك", error: "تعذر فتح القائمة.", retry: "حاول مجددًا", home: "العودة للرئيسية" },
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

  useEffect(() => {
    let active = true;
    setState("resolving");

    async function open() {
      try {
        // getSession resolves from the existing Supabase session first, so returning users
        // avoid a project-list request before entering the Studio.
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;
        if (!data?.session) {
          setState("signIn");
          return;
        }

        if (requestedProjectId) {
          navigate(`/menu-studio/content${location.search}`, { replace: true });
          return;
        }

        // The last active project is already stored locally. Use it immediately instead of
        // waiting for listMenuStudioProjects on every Menu Studio click.
        if (!requestedSiteId && activeProjectId) {
          navigate(studioProjectUrl("/menu-studio/content", location.search, activeProjectId), { replace: true });
          return;
        }

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
  }, [requestedProjectId, requestedSiteId, activeProjectId, location.search, navigate, attempt, language, workspace]);

  // Do not paint an intermediate full-screen loading card. The account page remains visible
  // for the few milliseconds needed to resolve the route, then Studio replaces it.
  if (state === "resolving") return null;

  return <main className="menu-studio-persistence-screen" dir={language === "en" ? "ltr" : "rtl"}>
    <div className="menu-studio-persistence-card">
      <h1>{state === "signIn" ? t.signIn : t.error}</h1>
      <div>
        {state === "error" ? <button type="button" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button> : null}
        <button type="button" onClick={() => navigate("/")}>{t.home}</button>
      </div>
    </div>
  </main>;
}
