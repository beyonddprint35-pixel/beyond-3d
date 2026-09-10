import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { readStudioLanguage, studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";

import { flushStudioDraft, STUDIO_NAV_COPY, STUDIO_STAGES } from "../features/menu-engine/studio/studioNavigation";

export default function MenuStudioMobileStageNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => readStudioLanguage("en"));

  const routeStage = location.pathname.replace(/^\/menu-studio\/?/, "").split("/")[0] || "content";
  const query = new URLSearchParams(location.search);
  const currentStage = query.get("place") === "1" ? "place" : routeStage;
  const t = STUDIO_NAV_COPY[language] || STUDIO_NAV_COPY.en;

  useEffect(() => {
    const onLanguageChange = (event) => {
      setLanguage(event?.detail?.language || readStudioLanguage("en"));
    };
    const onStorage = (event) => {
      if (event.key === "beyond-menu-studio-ui-language-v1") {
        setLanguage(readStudioLanguage("en"));
      }
    };

    window.addEventListener("beyond-studio-language-change", onLanguageChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("beyond-studio-language-change", onLanguageChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function openStage(stage) {
    if (stage === currentStage) return;
    flushStudioDraft();
    const params = new URLSearchParams(location.search);
    params.delete("place");
    if (stage === "place") {
      params.set("place", "1");
      const nextQuery = params.toString();
      navigate(`/menu-studio/content${nextQuery ? `?${nextQuery}` : ""}${location.hash}`);
      return;
    }
    const nextQuery = params.toString();
    navigate(`/menu-studio/${stage}${nextQuery ? `?${nextQuery}` : ""}${location.hash}`);
  }

  return (
    <nav className="menu-studio-mobile-stage-nav" aria-label="Menu Studio" dir={studioLanguageDirection(language)}>
      {STUDIO_STAGES.map((stage) => (
        <button
          key={stage}
          type="button"
          className={currentStage === stage ? "active" : ""}
          aria-current={currentStage === stage ? "page" : undefined}
          onClick={() => openStage(stage)}
        >
          {t[stage]}
        </button>
      ))}
    </nav>
  );
}
