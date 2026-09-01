import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";

const COPY = {
  en: { content: "Content", design: "Design", preview: "Preview", publish: "Publish" },
  he: { content: "תוכן", design: "עיצוב", preview: "תצוגה מקדימה", publish: "פרסום" },
  ar: { content: "المحتوى", design: "التصميم", preview: "المعاينة", publish: "النشر" },
};

const STAGES = ["content", "design", "preview", "publish"];

export default function MenuStudioMobileStageNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => readStudioLanguage("en"));

  const currentStage = location.pathname.replace(/^\/menu-studio\/?/, "").split("/")[0] || "content";
  const t = COPY[language] || COPY.en;

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
    navigate(`/menu-studio/${stage}${location.search}${location.hash}`);
  }

  return (
    <nav className="menu-studio-mobile-stage-nav" aria-label="Menu Studio">
      {STAGES.map((stage) => (
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
