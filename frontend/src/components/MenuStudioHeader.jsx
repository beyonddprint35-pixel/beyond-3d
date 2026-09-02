import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react";
import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "./StudioLanguageMenu";
import MenuStudioMenuSwitcher from "./MenuStudioMenuSwitcher";
import { applyStoredBeyondTheme, setBeyondTheme } from "../lib/beyondThemeBootstrap";
import { flushStudioDraft, STUDIO_NAV_COPY, STUDIO_STAGES } from "../features/menu-engine/studio/studioNavigation";
import { studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";

export default function MenuStudioHeader({ stage, language, onLanguageChange, menuName, onBack, backLabel, onBrand, saveState, saveLabel }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => applyStoredBeyondTheme());
  const t = STUDIO_NAV_COPY[language] || STUDIO_NAV_COPY.en;
  const prefix = `menu-${stage === "analytics" ? "content" : stage}-v2`;
  const BackIcon = language === "en" ? ArrowLeft : ArrowRight;
  useEffect(() => {
    const refresh = (event) => setTheme(event?.detail?.theme || applyStoredBeyondTheme());
    window.addEventListener("beyond-theme-change", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("beyond-theme-change", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  function openStage(nextStage) {
    flushStudioDraft();
    navigate(`/menu-studio/${nextStage}${location.search}`);
  }
  return <header className={`${prefix}-topbar menu-studio-header`}>
    <div className={`${prefix}-brand-wrap`}>
      <button type="button" className={`${prefix}-back`} aria-label={backLabel || t.back} onClick={() => { flushStudioDraft(); if (onBack) onBack(); else navigate("/"); }}><BackIcon size={16} /></button>
      <button type="button" className={`${prefix}-brand`} onClick={onBrand || (() => openStage("content"))}><img src={beyondLogo} alt="" /><span><strong>Beyond Menu Studio</strong><small>{menuName}</small></span></button>
    </div>
    <nav className={`${prefix}-product-nav`} aria-label="Menu Studio" dir={studioLanguageDirection(language)}>
      {STUDIO_STAGES.map((key) => <button type="button" key={key} aria-current={key === stage ? "page" : undefined} className={key === stage ? "active" : ""} onClick={() => openStage(key)}>{t[key]}</button>)}
    </nav>
    <div className={`${prefix}-top-actions`}>
      <div className="menu-studio-header-controls">
        <StudioLanguageMenu value={language} onChange={onLanguageChange} label={t.language} compact />
        <button type="button" className="studio-theme-toggle" aria-label={theme === "dark" ? t.light : t.dark} title={theme === "dark" ? t.light : t.dark} onClick={() => setBeyondTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
      </div>
      {saveLabel ? <div className={`${prefix}-save`}><span className={saveState === "saved" ? "ok" : ""} /><strong>{saveLabel}</strong></div> : null}
    </div>
    <MenuStudioMenuSwitcher language={language} menuName={menuName} />
  </header>;
}
