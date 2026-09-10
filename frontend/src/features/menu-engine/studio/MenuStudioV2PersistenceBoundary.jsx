import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CloudOff } from "lucide-react";

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
import { prefetchMenuSubscription } from "../data/menuSubscriptionService";
import { readStudioLanguage } from "./studioLanguage";
import { useMenuStudioWorkspace } from "./menuStudioWorkspaceContext";
import "./MenuStudioV2PersistenceBoundary.css";

const COPY = {
  en: {
    missing: "This menu draft could not be found.",
    missingHint: "Open My Menus to choose another draft or create a new one.",
    myMenus: "Open My Menus",
    newMenu: "Create new menu",
    cloudError: "Cloud autosave is temporarily unavailable. Your current browser copy is still safe.",
  },
  he: {
    missing: "לא ניתן למצוא את טיוטת התפריט.",
    missingHint: "פתחו את התפריטים שלי כדי לבחור טיוטה אחרת או ליצור תפריט חדש.",
    myMenus: "פתיחת התפריטים שלי",
    newMenu: "יצירת תפריט חדש",
    cloudError: "השמירה בענן אינה זמינה כרגע. העותק בדפדפן עדיין שמור.",
  },
  ar: {
    missing: "تعذر العثور على مسودة القائمة.",
    missingHint: "افتحوا قوائمي لاختيار مسودة أخرى أو إنشاء قائمة جديدة.",
    myMenus: "فتح قوائمي",
    newMenu: "إنشاء قائمة جديدة",
    cloudError: "الحفظ السحابي غير متاح مؤقتاً. نسخة المتصفح الحالية ما زالت محفوظة.",
  },
};

export default function MenuStudioV2PersistenceBoundary({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = useMenuStudioWorkspace();
  const route = useRef({ location, navigate });
  route.current = { location, navigate };

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isWebsiteEntry = ["/dev/menu-content-v2", "/menu-studio/content"].includes(location.pathname)
    && params.get("mode") === "website"
    && params.get("websiteImported") !== "1";
  const requestedProjectId = params.get("project") || "";

  // Persistence is deliberately non-blocking. Studio paints immediately from the
  // browser draft, while a requested cloud project is resolved in the background.
  // When the target draft arrives we remount the stage once so every editor reads
  // the newly activated draft synchronously on its next render.
  const [state, setState] = useState("ready");
  const [draftRevision, setDraftRevision] = useState(0);
  const [cloudError, setCloudError] = useState("");
  const [language] = useState(() => readStudioLanguage("en"));
  const t = COPY[language] || COPY.en;
  const rtl = language === "he" || language === "ar";

  useEffect(() => {
    if (isWebsiteEntry) {
      setState("ready");
      return undefined;
    }

    let active = true;

    function withProjectInUrl(projectId) {
      const current = route.current;
      const query = new URLSearchParams(current.location.search);
      if (!projectId || query.get("project") === projectId) return;
      query.set("project", projectId);
      current.navigate(`${current.location.pathname}?${query}${current.location.hash}`, { replace: true });
    }

    function activateDraft(draft, projectId, { remount = false } = {}) {
      if (!draft?.menu || !projectId) return false;
      writeMenuStudioV2Draft(draft, { queueSave: false });
      workspace?.rememberDraft(draft);
      setActiveMenuStudioProjectId(projectId);
      withProjectInUrl(projectId);
      if (active) {
        setState("ready");
        if (remount) setDraftRevision((value) => value + 1);
      }
      return true;
    }

    async function openDraft() {
      const localDraft = readMenuStudioV2Draft();
      const localProjectId = menuStudioProjectId(localDraft);
      const activeProjectId = readActiveMenuStudioProjectId();

      // Normal Studio navigation and menu switching prepare the browser draft
      // before changing the URL. In that common path there is nothing to wait for.
      if (requestedProjectId && localDraft?.menu && localProjectId === requestedProjectId) {
        workspace?.rememberDraft(localDraft);
        setActiveMenuStudioProjectId(requestedProjectId);
        if (active) setState("ready");
        return;
      }

      if (requestedProjectId && workspace?.isPrepared(requestedProjectId)) {
        const preparedDraft = readMenuStudioV2Draft();
        if (menuStudioProjectId(preparedDraft) === requestedProjectId) {
          workspace?.rememberDraft(preparedDraft);
          setActiveMenuStudioProjectId(requestedProjectId);
          if (active) setState("ready");
          return;
        }
      }

      try {
        if (requestedProjectId) {
          // Do not flush the requested project before opening it. It is not the
          // project currently being edited, and waiting for that queue created the
          // old full-screen "Opening your menu" delay.
          const project = await loadMenuStudioProject(requestedProjectId);
          if (!active) return;
          const draft = draftFromMenuStudioProject(project);
          if (!draft) throw new Error(t.missing);
          activateDraft(draft, project.id, { remount: true });
          return;
        }

        if (localDraft?.menu) {
          // A brand-new manual draft can be edited immediately. If it has not yet
          // been persisted, create its cloud project quietly behind the Studio.
          setState("ready");
          if (localProjectId) {
            workspace?.rememberDraft(localDraft);
            setActiveMenuStudioProjectId(localProjectId);
            withProjectInUrl(localProjectId);
            return;
          }

          const ensured = await ensureMenuStudioProject(localDraft);
          if (!active) return;
          const nextDraft = ensured?.draft || localDraft;
          const projectId = menuStudioProjectId(nextDraft);
          if (projectId) activateDraft(nextDraft, projectId, { remount: true });
          return;
        }

        if (activeProjectId) {
          const project = await loadMenuStudioProject(activeProjectId);
          if (!active) return;
          const draft = draftFromMenuStudioProject(project);
          if (!draft) throw new Error(t.missing);
          activateDraft(draft, project.id, { remount: true });
          return;
        }

        if (active) setState("missing");
      } catch (error) {
        console.warn("Could not open persistent Menu Studio draft.", error);
        // If a browser draft exists, keep the owner editing instead of replacing
        // the whole Studio with an infrastructure/loading screen.
        if (active) setState(readMenuStudioV2Draft()?.menu ? "ready" : "missing");
      }
    }

    void openDraft();
    return () => { active = false; };
  }, [isWebsiteEntry, requestedProjectId, t.missing, workspace]);

  useEffect(() => {
    const projectId = requestedProjectId || menuStudioProjectId(readMenuStudioV2Draft());
    if (projectId) void prefetchMenuSubscription(projectId);
  }, [requestedProjectId, draftRevision]);

  useEffect(() => {
    function onCloudSave(event) {
      const detail = event?.detail || {};
      if (detail.projectId !== (requestedProjectId || menuStudioProjectId(readMenuStudioV2Draft()))) return;
      if (detail.state === "error") setCloudError(detail.message || t.cloudError);
      if (detail.state === "saved") setCloudError("");
    }
    window.addEventListener("beyond-menu-studio-cloud-save", onCloudSave);
    return () => window.removeEventListener("beyond-menu-studio-cloud-save", onCloudSave);
  }, [t.cloudError, requestedProjectId]);

  if (state === "missing") {
    return <main className="menu-studio-persistence-screen" dir={rtl ? "rtl" : "ltr"}>
      <div className="menu-studio-persistence-card">
        <span className="icon"><CloudOff size={22} /></span>
        <h1>{t.missing}</h1>
        <p>{t.missingHint}</p>
        <div>
          <button type="button" className="primary" onClick={() => window.location.assign("/my-menus")}>{t.myMenus}</button>
          <button type="button" onClick={() => window.location.assign("/menu-builder")}>{t.newMenu}</button>
        </div>
      </div>
    </main>;
  }

  const stageKey = `${requestedProjectId || menuStudioProjectId(readMenuStudioV2Draft()) || "local"}:${draftRevision}`;

  return <>
    <Fragment key={stageKey}>{children}</Fragment>
    {cloudError ? <div className="menu-studio-persistence-error" role="status"><CloudOff size={15} /><span>{t.cloudError}</span></div> : null}
  </>;
}
