import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { listMenuStudioProjects, readActiveMenuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { chooseStudioProject, studioProjectUrl } from "../features/menu-engine/studio/studioNavigation";
import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import "../features/menu-engine/studio/MenuStudioV2PersistenceBoundary.css";

const COPY = {
  en: { loading: "Opening Beyond Menu Studio…", signIn: "Sign in to open your menu", error: "We couldn’t open your menu.", retry: "Try again", home: "Return home" },
  he: { loading: "פותח את Beyond Menu Studio…", signIn: "התחברו כדי לפתוח את התפריט", error: "לא הצלחנו לפתוח את התפריט.", retry: "ניסיון נוסף", home: "חזרה לבית" },
  ar: { loading: "جارٍ فتح Beyond Menu Studio…", signIn: "سجّل الدخول لفتح قائمتك", error: "تعذر فتح القائمة.", retry: "حاول مجددًا", home: "العودة للرئيسية" },
};

export default function MenuStudioEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const language = readStudioLanguage("en");
  const t = COPY[language] || COPY.en;
  useEffect(() => {
    let active = true;
    setState("loading");
    async function open() {
      try {
        const params = new URLSearchParams(location.search);
        if (params.get("project")) {
          navigate(`/menu-studio/content${location.search}`, { replace: true });
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;
        if (!data?.session) { setState("signIn"); return; }
        const projects = await listMenuStudioProjects();
        if (!active) return;
        const project = chooseStudioProject(projects, { siteId: params.get("site") || "", activeId: readActiveMenuStudioProjectId() });
        if (project) {
          navigate(studioProjectUrl("/menu-studio/content", location.search, project.id), { replace: true });
        } else if (params.get("site")) {
          setState("error");
        } else {
          navigate(`/menu-builder?ui=${language}`, { replace: true });
        }
      } catch { if (active) setState("error"); }
    }
    open();
    return () => { active = false; };
  }, [location.search, navigate, attempt, language]);
  return <main className="menu-studio-persistence-screen" dir={language === "en" ? "ltr" : "rtl"}>
    <div className="menu-studio-persistence-card">
      {state === "loading" ? <LoaderCircle className="spin" size={24} /> : null}
      <h1>{t[state]}</h1>
      {state !== "loading" ? <div>{state === "error" ? <button type="button" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button> : null}<button type="button" onClick={() => navigate("/")}>{t.home}</button></div> : null}
    </div>
  </main>;
}
