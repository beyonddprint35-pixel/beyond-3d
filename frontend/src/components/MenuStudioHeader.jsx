import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react";
import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "./StudioLanguageMenu";
import MenuStudioMenuSwitcher from "./MenuStudioMenuSwitcher";
import MenuPlaceWorkspace from "./MenuPlaceWorkspace";
import "./MenuStudioHeaderCompact.css";
import "./MenuStudioCompactStack.css";
import "./MenuStudioDesignSubnav.css";
import { applyStoredBeyondTheme, setBeyondTheme } from "../lib/beyondThemeBootstrap";
import { flushStudioDraft, STUDIO_NAV_COPY, STUDIO_STAGES } from "../features/menu-engine/studio/studioNavigation";
import { studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";

export default function MenuStudioHeader({
  stage,
  language,
  onLanguageChange,
  menuName,
  onBack,
  backLabel,
  onBrand,
  saveState,
  saveLabel,
  placeLogo = "",
  placeStyle = null,
  onPlaceLogoUpdate,
  onPlaceStyleUpdate,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => applyStoredBeyondTheme());
  const t = STUDIO_NAV_COPY[language] || STUDIO_NAV_COPY.en;
  const prefix = `menu-${stage === "analytics" ? "content" : stage}-v2`;
  const BackIcon = language === "en" ? ArrowLeft : ArrowRight;
  const searchParams = new URLSearchParams(location.search);
  const projectId = searchParams.get("project") || "";
  const designSection = stage === "design" && searchParams.get("designSection") === "place" ? "place" : "design";

  useEffect(() => {
    const refresh = (event) => setTheme(event?.detail?.theme || applyStoredBeyondTheme());
    window.addEventListener("beyond-theme-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("beyond-theme-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("place") !== "1") return;
    params.delete("place");
    params.set("designSection", "place");
    const query = params.toString();
    navigate(`/menu-studio/design${query ? `?${query}` : ""}${location.hash}`, { replace: true });
  }, [location.search, location.hash, navigate]);

  function openStage(nextStage) {
    flushStudioDraft();
    const params = new URLSearchParams(location.search);
    params.delete("place");
    params.delete("designSection");
    const query = params.toString();
    navigate(`/menu-studio/${nextStage}${query ? `?${query}` : ""}${location.hash}`);
  }

  function openDesignSection(section) {
    flushStudioDraft();
    const params = new URLSearchParams(location.search);
    params.delete("place");
    if (section === "place") params.set("designSection", "place");
    else params.delete("designSection");
    const query = params.toString();
    navigate(`/menu-studio/design${query ? `?${query}` : ""}${location.hash}`);
  }

  return <>
    <header className={`${prefix}-topbar menu-studio-header`} dir="ltr">
      <div className={`${prefix}-brand-wrap menu-studio-header-brand-wrap`}>
        <button type="button" className={`${prefix}-back`} aria-label={backLabel || t.back} onClick={() => { flushStudioDraft(); if (onBack) onBack(); else navigate("/"); }}>
          <BackIcon size={16} />
        </button>
        <button type="button" className={`${prefix}-brand menu-studio-header-brand`} onClick={onBrand || (() => openStage("content"))}>
          <img src={beyondLogo} alt="" />
          <span>
            <strong className="menu-studio-brand-title">Beyond Menu Studio</strong>
            <small>{menuName}</small>
          </span>
        </button>
      </div>

      <nav className={`${prefix}-product-nav`} aria-label="Menu Studio" dir={studioLanguageDirection(language)}>
        {STUDIO_STAGES.map((key) => <button type="button" key={key} aria-current={key === stage ? "page" : undefined} className={key === stage ? "active" : ""} onClick={() => openStage(key)}>{t[key]}</button>)}
      </nav>

      <div className={`${prefix}-top-actions menu-studio-header-actions`}>
        <div className="menu-studio-header-controls">
          <StudioLanguageMenu value={language} onChange={onLanguageChange} label={t.language} compact showThemeToggle={false} />
          <button type="button" className="studio-theme-toggle" aria-label={theme === "dark" ? t.light : t.dark} title={theme === "dark" ? t.light : t.dark} onClick={() => setBeyondTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
        {saveLabel ? <div className={`${prefix}-save`}><span className={saveState === "saved" ? "ok" : ""} /><strong>{saveLabel}</strong></div> : null}
      </div>

      <MenuStudioMenuSwitcher language={language} menuName={menuName} />
    </header>

    {stage === "design" ? <>
      <nav className="menu-design-subnav" aria-label={`${t.design} sections`} dir={studioLanguageDirection(language)}>
        <button type="button" className={designSection === "design" ? "active" : ""} aria-current={designSection === "design" ? "page" : undefined} onClick={() => openDesignSection("design")}>{t.design}</button>
        <button type="button" className={designSection === "place" ? "active" : ""} aria-current={designSection === "place" ? "page" : undefined} onClick={() => openDesignSection("place")}>{t.place}</button>
      </nav>
      <div className="menu-design-subnav-spacer" aria-hidden="true" />
    </> : null}

    {stage === "design" && designSection === "place" ? (
      <MenuPlaceWorkspace
        projectId={projectId}
        language={language}
        logoUrl={placeLogo}
        placeStyle={placeStyle}
        onLogoUpdate={onPlaceLogoUpdate}
        onPlaceStyleUpdate={onPlaceStyleUpdate}
      />
    ) : null}
  </>;
}
