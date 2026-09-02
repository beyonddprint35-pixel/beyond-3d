import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";

import { flushStudioDraft, STUDIO_NAV_COPY, STUDIO_STAGES } from "../features/menu-engine/studio/studioNavigation";

export default function MenuStudioMobileStageNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => readStudioLanguage("en"));

  const currentStage = location.pathname.replace(/^\/menu-studio\/?/, "").split("/")[0] || "content";
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
    navigate(`/menu-studio/${stage}${location.search}${location.hash}`);
  }

  return (
    <nav className="menu-studio-mobile-stage-nav" aria-label="Menu Studio">
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
