import { useEffect, useMemo, useState } from "react";
import { Cloud, CloudOff, LoaderCircle } from "lucide-react";

import {
  readMenuStudioV2Draft,
  writeMenuStudioV2Draft,
} from "./menuStudioV2Session";
import {
  draftFromMenuStudioProject,
  ensureMenuStudioProject,
  loadMenuStudioProject,
  menuStudioProjectId,
  readActiveMenuStudioProjectId,
  setActiveMenuStudioProjectId,
} from "./menuStudioV2Persistence";
import { readStudioLanguage } from "./studioLanguage";
import "./MenuStudioV2PersistenceBoundary.css";

const COPY = {
  en: {
    loading: "Opening your menu…",
    migrating: "Saving this menu to your account…",
    missing: "This menu draft could not be found.",
    missingHint: "Open My Menus to choose another draft or create a new one.",
    myMenus: "Open My Menus",
    newMenu: "Create new menu",
    cloudError: "Cloud autosave is temporarily unavailable. Your current browser copy is still safe.",
  },
  he: {
    loading: "פותח את התפריט…",
    migrating: "שומר את התפריט בחשבון שלכם…",
    missing: "לא ניתן למצוא את טיוטת התפריט.",
    missingHint: "פתחו את התפריטים שלי כדי לבחור טיוטה אחרת או ליצור תפריט חדש.",
    myMenus: "פתיחת התפריטים שלי",
    newMenu: "יצירת תפריט חדש",
    cloudError: "השמירה בענן אינה זמינה כרגע. העותק בדפדפן עדיין שמור.",
  },
  ar: {
    loading: "جارٍ فتح القائمة…",
    migrating: "جارٍ حفظ القائمة في حسابكم…",
    missing: "تعذر العثور على مسودة القائمة.",
    missingHint: "افتحوا قوائمي لاختيار مسودة أخرى أو إنشاء قائمة جديدة.",
    myMenus: "فتح قوائمي",
    newMenu: "إنشاء قائمة جديدة",
    cloudError: "الحفظ السحابي غير متاح مؤقتاً. نسخة المتصفح الحالية ما زالت محفوظة.",
  },
};

function withProjectInUrl(projectId) {
  if (!projectId || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("project") === projectId) return;
  url.searchParams.set("project", projectId);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function MenuStudioV2PersistenceBoundary({ children }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isWebsiteEntry = window.location.pathname === "/dev/menu-content-v2"
    && params.get("mode") === "website"
    && params.get("websiteImported") !== "1";
  const requestedProjectId = params.get("project") || "";
  const [state, setState] = useState(isWebsiteEntry ? "ready" : "loading");
  const [message, setMessage] = useState("");
  const [cloudError, setCloudError] = useState("");
  const language = readStudioLanguage("en");
  const t = COPY[language] || COPY.en;
  const rtl = language === "he" || language === "ar";

  useEffect(() => {
    if (isWebsiteEntry) return undefined;
    let active = true;

    async function openDraft() {
      const localDraft = readMenuStudioV2Draft();
      const localProjectId = menuStudioProjectId(localDraft);
      const activeProjectId = readActiveMenuStudioProjectId();
      const targetProjectId = requestedProjectId || localProjectId || activeProjectId;

      try {
        if (requestedProjectId) {
          setMessage(t.loading);
          const project = await loadMenuStudioProject(requestedProjectId);
          const draft = draftFromMenuStudioProject(project);
          if (!draft) throw new Error(t.missing);
          writeMenuStudioV2Draft(draft);
          setActiveMenuStudioProjectId(project.id);
          withProjectInUrl(project.id);
          if (active) setState("ready");
          return;
        }

        if (localDraft?.menu) {
          setMessage(localProjectId ? t.loading : t.migrating);
          const ensured = await ensureMenuStudioProject(localDraft);
          const nextDraft = ensured?.draft || localDraft;
          writeMenuStudioV2Draft(nextDraft);
          const projectId = menuStudioProjectId(nextDraft);
          if (projectId) withProjectInUrl(projectId);
          if (active) setState("ready");
          return;
        }

        if (targetProjectId) {
          setMessage(t.loading);
          const project = await loadMenuStudioProject(targetProjectId);
          const draft = draftFromMenuStudioProject(project);
          if (!draft) throw new Error(t.missing);
          writeMenuStudioV2Draft(draft);
          setActiveMenuStudioProjectId(project.id);
          withProjectInUrl(project.id);
          if (active) setState("ready");
          return;
        }

        if (active) setState("missing");
      } catch (error) {
        console.warn("Could not open persistent Menu Studio draft.", error);
        if (active) {
          setMessage(error?.message || t.missing);
          setState(localDraft?.menu ? "ready" : "missing");
        }
      }
    }

    openDraft();
    return () => { active = false; };
  }, [isWebsiteEntry, requestedProjectId, t.loading, t.migrating, t.missing]);

  useEffect(() => {
    function onCloudSave(event) {
      const detail = event?.detail || {};
      if (detail.state === "error") setCloudError(detail.message || t.cloudError);
      if (detail.state === "saved") setCloudError("");
    }
    window.addEventListener("beyond-menu-studio-cloud-save", onCloudSave);
    return () => window.removeEventListener("beyond-menu-studio-cloud-save", onCloudSave);
  }, [t.cloudError]);

  if (state === "ready") {
    return <>
      {children}
      {cloudError ? <div className="menu-studio-persistence-error" role="status"><CloudOff size={15} /><span>{t.cloudError}</span></div> : null}
    </>;
  }

  if (state === "missing") {
    return <main className="menu-studio-persistence-screen" dir={rtl ? "rtl" : "ltr"}>
      <div className="menu-studio-persistence-card">
        <span className="icon"><CloudOff size={22} /></span>
        <h1>{t.missing}</h1>
        <p>{t.missingHint}</p>
        <div>
          <button type="button" className="primary" onClick={() => window.location.assign("/dev/my-menus-v2")}>{t.myMenus}</button>
          <button type="button" onClick={() => window.location.assign("/dev/menu-create-v2")}>{t.newMenu}</button>
        </div>
      </div>
    </main>;
  }

  return <main className="menu-studio-persistence-screen" dir={rtl ? "rtl" : "ltr"}>
    <div className="menu-studio-persistence-card loading">
      <span className="icon"><Cloud size={22} /></span>
      <LoaderCircle className="spin" size={20} />
      <h1>{message || t.loading}</h1>
    </div>
  </main>;
}
