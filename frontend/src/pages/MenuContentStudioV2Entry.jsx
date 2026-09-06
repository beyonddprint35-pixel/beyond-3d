import { useEffect, useMemo, useRef, useState } from "react";

import MenuContentStudioV2 from "./MenuContentStudioV2";
import MenuWebsiteImportV2 from "./MenuWebsiteImportV2";
import { normalizeV3MenuPriceOptions } from "../features/menu-engine/data/aiMenuImportAdapter";
import { getMenuImportSession } from "../features/menu-engine/data/menuAiImportService";
import {
  collectV3TranslationRepairFields,
  repairV3MenuTranslations,
  translationLooksValid,
} from "../features/menu-engine/data/menuV3TranslationRepairService";
import {
  readMenuStudioV2Draft,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import { flushStudioDraft } from "../features/menu-engine/studio/studioNavigation";
import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import { menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { useMenuStudioWorkspace } from "../features/menu-engine/studio/menuStudioWorkspaceContext";
import "./MenuContentStudioV2Entry.css";

const COPY = {
  en: "Completing menu languages…",
  he: "משלים את שפות התפריט…",
  ar: "جارٍ استكمال لغات القائمة…",
};

const ISSUE_COPY = {
  en: (count) => `${count} translation${count === 1 ? "" : "s"} need review`,
  he: (count) => `${count} תרגומים דורשים בדיקה`,
  ar: (count) => `${count} ترجمة تحتاج إلى مراجعة`,
};

const ERROR_COPY = {
  en: (message) => `Automatic translation failed: ${message}`,
  he: (message) => `התרגום האוטומטי נכשל: ${message}`,
  ar: (message) => `فشلت الترجمة التلقائية: ${message}`,
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
    } catch {}
  };
  queueMicrotask(restore);
  window.requestAnimationFrame(restore);
}

function cloneMenu(menu) {
  return typeof structuredClone === "function" ? structuredClone(menu) : JSON.parse(JSON.stringify(menu));
}

function mergeMissingTranslations(latestMenu, repairedMenu, fields) {
  const next = cloneMenu(latestMenu);

  fields.forEach(({ key, targetLanguage, source }) => {
    const parts = String(key || "").split(".");
    if (parts[0] === "groups") {
      const groupIndex = Number(parts[1]);
      const field = parts[2];
      const language = parts[3];
      const latestGroup = next.groups?.[groupIndex];
      const repairedGroup = repairedMenu.groups?.[groupIndex];
      if (!latestGroup || !repairedGroup || !language || (field !== "name" && field !== "note")) return;
      const translated = String(repairedGroup[field]?.[language] || "").trim();
      if (translationLooksValid(translated, targetLanguage || language, source)) {
        latestGroup[field] = { ...(latestGroup[field] || {}), [language]: translated };
      }
      return;
    }

    if (parts[0] !== "items") return;
    const itemIndex = Number(parts[1]);
    const latestItem = next.items?.[itemIndex];
    const repairedItem = repairedMenu.items?.[itemIndex];
    if (!latestItem || !repairedItem) return;

    if (parts[2] === "name" || parts[2] === "description") {
      const field = parts[2];
      const language = parts[3];
      if (!language) return;
      const translated = String(repairedItem[field]?.[language] || "").trim();
      if (translationLooksValid(translated, targetLanguage || language, source)) {
        latestItem[field] = { ...(latestItem[field] || {}), [language]: translated };
      }
      return;
    }

    if (parts[2] === "price_options") {
      const optionIndex = Number(parts[3]);
      const language = parts[5];
      const latestOption = latestItem.price_options?.[optionIndex];
      const repairedOption = repairedItem.price_options?.[optionIndex];
      if (!latestOption || !repairedOption || !language) return;
      const labelKey = `label_${language}`;
      const translated = String(repairedOption[labelKey] || "").trim();
      if (translationLooksValid(translated, targetLanguage || language, source)) {
        latestOption[labelKey] = translated;
        if (!latestOption.label) latestOption.label = latestOption.label_en || latestOption.label_he || latestOption.label_ar || "";
      }
    }
  });

  return next;
}

function issueSnapshot(menu) {
  return collectV3TranslationRepairFields(menu || {});
}

function issueSignature(fields = []) {
  return fields.map((field) => `${field.key}|${field.targetLanguage}|${field.issue}|${field.source}`).join("\n");
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
  const [translationIssues, setTranslationIssues] = useState(() => issueSnapshot(initialDraft?.menu));
  const [translationError, setTranslationError] = useState("");
  const translationTimerRef = useRef(null);
  const translationBusyRef = useRef(false);
  const lastAttemptSignatureRef = useRef("");

  useEffect(() => {
    if (shouldOpenWebsiteImporter || alreadyPrepared) return undefined;
    let active = true;

    async function prepareDraft() {
      const draft = initialDraft;
      if (!draft?.menu) {
        if (active) setReady(true);
        return;
      }

      const projectId = draft?.importProject?.id || draft?.profile?.importedProjectId || draft?.menu?.source_project_id || "";
      let repairedMenu = normalizeV3MenuPriceOptions(draft.menu);
      let issues = issueSnapshot(repairedMenu);

      if (!modernPhotoImport) {
        try {
          if (projectId && issues.length) {
            const session = await getMenuImportSession();
            if (session && active) {
              const repair = await repairV3MenuTranslations({ session, projectId, menu: repairedMenu });
              if (repair?.menu) repairedMenu = normalizeV3MenuPriceOptions(repair.menu);
              issues = repair?.issues || issueSnapshot(repairedMenu);
            }
          }
        } catch (error) {
          console.warn("Could not complete V3 menu translations before opening Studio.", error);
          issues = issueSnapshot(repairedMenu);
          if (active) setTranslationError(error?.message || "Could not reach the translation service.");
        }
      }

      if (active) {
        setTranslationIssues(issues);
        writeMenuStudioV2Draft({
          ...draft,
          menu: repairedMenu,
          profile: { ...(draft.profile || {}), ...(modernPhotoImport ? { aiTranslationsReady: true } : {}), translationIssues: issues },
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

    async function translateMissingLanguages({ force = false, skipFlush = false } = {}) {
      if (translationBusyRef.current) return;
      if (!skipFlush) flushStudioDraft();

      const draft = readMenuStudioV2Draft();
      const projectId = menuStudioProjectId(draft);
      if (!draft?.menu || !projectId) {
        setTranslationError("The menu project could not be identified.");
        return;
      }

      const fields = collectV3TranslationRepairFields(draft.menu);
      if (!fields.length) {
        setTranslationIssues([]);
        setTranslationError("");
        lastAttemptSignatureRef.current = "";
        return;
      }

      const signature = issueSignature(fields);
      if (!force && signature === lastAttemptSignatureRef.current) return;
      lastAttemptSignatureRef.current = signature;
      translationBusyRef.current = true;
      setTranslationError("");

      try {
        const session = await getMenuImportSession();
        if (!session) throw new Error("Your session is not available. Sign in again and retry.");

        const repair = await repairV3MenuTranslations({ session, projectId, menu: draft.menu });
        const latestDraft = readMenuStudioV2Draft();
        if (menuStudioProjectId(latestDraft) !== projectId) return;
        const mergedMenu = repair?.menu ? mergeMissingTranslations(latestDraft.menu, repair.menu, fields) : latestDraft.menu;
        const normalizedMenu = normalizeV3MenuPriceOptions(mergedMenu);
        const issues = issueSnapshot(normalizedMenu);
        const nextProfile = { ...(latestDraft?.profile || {}), aiTranslationsReady: issues.length === 0, translationIssues: issues };
        setTranslationIssues(issues);
        writeMenuStudioV2Draft({
          ...latestDraft,
          menu: normalizedMenu,
          profile: nextProfile,
        });
        if (repair?.repaired) {
          setTranslationError("");
          window.dispatchEvent(new CustomEvent("beyond-menu-translations-applied", {
            detail: { menu: normalizedMenu, profile: nextProfile },
          }));
        } else if (issues.length) {
          setTranslationError("The translation service returned no usable replacement for the flagged fields.");
        }
      } catch (error) {
        console.warn("Could not auto-translate the missing menu languages.", error);
        setTranslationIssues(fields);
        setTranslationError(error?.message || "Could not reach the translation service.");
      } finally {
        translationBusyRef.current = false;
      }
    }

    const refreshIssues = () => {
      const latest = readMenuStudioV2Draft();
      const issues = issueSnapshot(latest?.menu);
      setTranslationIssues(issues);
      const signature = issueSignature(issues);
      if (issues.length && signature !== lastAttemptSignatureRef.current && !translationBusyRef.current) {
        window.clearTimeout(translationTimerRef.current);
        translationTimerRef.current = window.setTimeout(() => { void translateMissingLanguages(); }, 250);
      }
    };

    refreshIssues();
    const issueInterval = window.setInterval(refreshIssues, 1500);

    const onInputCapture = (event) => {
      const target = event.target;
      if (!isTranslationField(target)) return;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (start == null || end == null) return;
      restoreCaretAfterReact(target, start, end, target.selectionDirection);
    };

    const onBlurCapture = (event) => {
      if (!isTranslationField(event.target)) return;
      if (!String(event.target.value || "").trim()) return;
      flushStudioDraft();
      window.clearTimeout(translationTimerRef.current);
      translationTimerRef.current = window.setTimeout(() => { void translateMissingLanguages({ force: true, skipFlush: true }); }, 120);
    };

    const onRetry = () => {
      lastAttemptSignatureRef.current = "";
      void translateMissingLanguages({ force: true });
    };

    document.addEventListener("input", onInputCapture, true);
    document.addEventListener("blur", onBlurCapture, true);
    window.addEventListener("beyond-menu-translation-retry", onRetry);
    return () => {
      document.removeEventListener("input", onInputCapture, true);
      document.removeEventListener("blur", onBlurCapture, true);
      window.removeEventListener("beyond-menu-translation-retry", onRetry);
      window.clearTimeout(translationTimerRef.current);
      window.clearInterval(issueInterval);
    };
  }, [ready, shouldOpenWebsiteImporter]);

  if (shouldOpenWebsiteImporter) return <MenuWebsiteImportV2 />;

  if (!ready) {
    const language = readStudioLanguage("en");
    return <main className="menu-content-v2-entry-loading" dir={language === "he" || language === "ar" ? "rtl" : "ltr"}><span className="menu-content-v2-entry-spinner" aria-hidden="true" /><strong>{COPY[language] || COPY.en}</strong></main>;
  }

  const language = readStudioLanguage("en");
  return (
    <>
      <MenuContentStudioV2 />
      {translationIssues.length ? <aside className="menu-content-v2-translation-warning" role="status" aria-live="polite"><span aria-hidden="true">!</span><strong>{(ISSUE_COPY[language] || ISSUE_COPY.en)(translationIssues.length)}</strong></aside> : null}
      {translationError ? (
        <aside className="menu-content-v2-translation-error" role="alert">
          <strong>{(ERROR_COPY[language] || ERROR_COPY.en)(translationError)}</strong>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("beyond-menu-translation-retry"))}>Retry</button>
        </aside>
      ) : null}
    </>
  );
}
