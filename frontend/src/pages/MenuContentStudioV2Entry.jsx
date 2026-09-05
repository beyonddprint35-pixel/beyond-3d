import { useEffect, useMemo, useRef, useState } from "react";

import MenuContentStudioV2 from "./MenuContentStudioV2";
import MenuWebsiteImportV2 from "./MenuWebsiteImportV2";
import { normalizeV3MenuPriceOptions } from "../features/menu-engine/data/aiMenuImportAdapter";
import { getMenuImportSession } from "../features/menu-engine/data/menuAiImportService";
import {
  collectV3TranslationRepairFields,
  repairV3MenuTranslations,
} from "../features/menu-engine/data/menuV3TranslationRepairService";
import {
  readMenuStudioV2Draft,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import { menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { useMenuStudioWorkspace } from "../features/menu-engine/studio/menuStudioWorkspaceContext";
import "./MenuContentStudioV2Entry.css";

const COPY = {
  en: "Completing menu languages…",
  he: "משלים את שפות התפריט…",
  ar: "جارٍ استكمال لغات القائمة…",
};

function photoImportTranslationsReady(draft) {
  if (draft?.profile?.aiTranslationsReady === true) return true;
  const pipelineVersion = String(draft?.profile?.aiImportDiagnostics?.pipelineVersion || "").trim().toLowerCase();
  return pipelineVersion.startsWith("v14-") || pipelineVersion.startsWith("v15-");
}

function isTranslationField(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    ? Boolean(target.closest(".menu-content-v2-language-card"))
    : false;
}

function restoreCaretAfterReact(target, start, end, direction) {
  const restore = () => {
    if (document.activeElement !== target) return;
    try {
      const max = String(target.value || "").length;
      target.setSelectionRange(Math.min(start, max), Math.min(end, max), direction || "none");
    } catch {
      // Some input types do not expose a text selection API.
    }
  };
  queueMicrotask(restore);
  window.requestAnimationFrame(restore);
}

export default function MenuContentStudioV2Entry() {
  const workspace = useMenuStudioWorkspace();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isWebsiteFlow = params.get("mode") === "website";
  const websiteImported = params.get("websiteImported") === "1";
  const shouldOpenWebsiteImporter = isWebsiteFlow && !websiteImported;
  const initialDraft = useMemo(() => shouldOpenWebsiteImporter ? null : readMenuStudioV2Draft(), [shouldOpenWebsiteImporter]);
  const modernPhotoImport = useMemo(() => photoImportTranslationsReady(initialDraft), [initialDraft]);
  const [alreadyPrepared] = useState(() => {
    const id = menuStudioProjectId(initialDraft);
    return workspace?.isPrepared(id) || workspace?.isContentReady(id) || false;
  });
  const [ready, setReady] = useState(shouldOpenWebsiteImporter || alreadyPrepared || modernPhotoImport);
  const [editorRevision, setEditorRevision] = useState(0);
  const translationTimerRef = useRef(null);
  const translationBusyRef = useRef(false);

  useEffect(() => {
    if (shouldOpenWebsiteImporter || alreadyPrepared) return undefined;
    let active = true;

    async function prepareDraft() {
      const draft = initialDraft;
      if (!draft?.menu) {
        if (active) setReady(true);
        return;
      }

      const projectId = draft?.importProject?.id
        || draft?.profile?.importedProjectId
        || draft?.menu?.source_project_id
        || "";

      // Imported price semantics are normalized every time Studio opens. This
      // also upgrades older drafts when the normalizer learns new serving-size
      // vocabulary (for example שליש/חצי and ثلث/نصف for draft beer).
      let repairedMenu = normalizeV3MenuPriceOptions(draft.menu);

      // Modern photo extraction already performs source-first translation for
      // all requested customer languages. Re-running the generic V3 repair on a
      // large photo menu can create hundreds of redundant translation fields
      // and block Content Studio for tens of seconds. Keep the repair only for
      // legacy PDF/text/older imports that still need it.
      if (!modernPhotoImport) {
        try {
          const fields = collectV3TranslationRepairFields(repairedMenu);
          if (projectId && fields.length) {
            const session = await getMenuImportSession();
            if (session && active) {
              const repair = await repairV3MenuTranslations({
                session,
                projectId,
                menu: repairedMenu,
              });
              if (repair?.menu) repairedMenu = normalizeV3MenuPriceOptions(repair.menu);
            }
          }
        } catch (error) {
          console.warn("Could not complete V3 menu translations before opening Studio.", error);
        }
      }

      if (active) {
        writeMenuStudioV2Draft({
          ...draft,
          menu: repairedMenu,
          profile: modernPhotoImport
            ? { ...(draft.profile || {}), aiTranslationsReady: true }
            : draft.profile,
        });
        workspace?.markContentReady(menuStudioProjectId(draft));
        setReady(true);
      }
    }

    prepareDraft();
    return () => { active = false; };
  }, [initialDraft, shouldOpenWebsiteImporter, alreadyPrepared, modernPhotoImport, workspace]);

  useEffect(() => {
    if (!ready || shouldOpenWebsiteImporter) return undefined;

    const onInputCapture = (event) => {
      const target = event.target;
      if (!isTranslationField(target)) return;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (start == null || end == null) return;
      restoreCaretAfterReact(target, start, end, target.selectionDirection);
    };

    async function translateMissingLanguages() {
      if (translationBusyRef.current) return;
      const draft = readMenuStudioV2Draft();
      const projectId = menuStudioProjectId(draft);
      if (!draft?.menu || !projectId) return;
      const fields = collectV3TranslationRepairFields(draft.menu);
      if (!fields.length) return;

      translationBusyRef.current = true;
      try {
        const session = await getMenuImportSession();
        if (!session) return;
        const repair = await repairV3MenuTranslations({ session, projectId, menu: draft.menu });
        if (!repair?.repaired || !repair?.menu) return;
        const latestDraft = readMenuStudioV2Draft();
        if (menuStudioProjectId(latestDraft) !== projectId) return;
        writeMenuStudioV2Draft({
          ...latestDraft,
          menu: normalizeV3MenuPriceOptions(repair.menu),
          profile: { ...(latestDraft?.profile || {}), aiTranslationsReady: true },
        });
        setEditorRevision((current) => current + 1);
      } catch (error) {
        console.warn("Could not auto-translate the missing menu languages.", error);
      } finally {
        translationBusyRef.current = false;
      }
    }

    const onBlurCapture = (event) => {
      if (!isTranslationField(event.target)) return;
      if (!String(event.target.value || "").trim()) return;
      window.clearTimeout(translationTimerRef.current);
      // Content Studio persists controlled input changes after 350ms. Run after
      // that save so the translation service receives the exact text the user
      // just finished typing, regardless of whether it was EN, HE or AR.
      translationTimerRef.current = window.setTimeout(() => {
        void translateMissingLanguages();
      }, 475);
    };

    document.addEventListener("input", onInputCapture, true);
    document.addEventListener("blur", onBlurCapture, true);
    return () => {
      document.removeEventListener("input", onInputCapture, true);
      document.removeEventListener("blur", onBlurCapture, true);
      window.clearTimeout(translationTimerRef.current);
    };
  }, [ready, shouldOpenWebsiteImporter]);

  if (shouldOpenWebsiteImporter) return <MenuWebsiteImportV2 />;

  if (!ready) {
    const language = readStudioLanguage("en");
    return (
      <main className="menu-content-v2-entry-loading" dir={language === "he" || language === "ar" ? "rtl" : "ltr"}>
        <span className="menu-content-v2-entry-spinner" aria-hidden="true" />
        <strong>{COPY[language] || COPY.en}</strong>
      </main>
    );
  }

  return <MenuContentStudioV2 key={editorRevision} />;
}
