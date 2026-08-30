import { useEffect, useMemo, useState } from "react";

import MenuContentStudioV2 from "./MenuContentStudioV2";
import MenuWebsiteImportV2 from "./MenuWebsiteImportV2";
import { mergeAiTranslationRepairIntoV3 } from "../features/menu-engine/data/aiMenuImportAdapter";
import {
  findMissingRequestedMenuTranslations,
  getMenuImportSession,
} from "../features/menu-engine/data/menuAiImportService";
import { repairImportedDraftTranslations } from "../features/menu-engine/data/menuImportedDraftRepairService";
import {
  readMenuStudioV2Draft,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import { readStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import "./MenuContentStudioV2Entry.css";

const COPY = {
  en: "Completing menu languages…",
  he: "משלים את שפות התפריט…",
  ar: "جارٍ استكمال لغات القائمة…",
};

export default function MenuContentStudioV2Entry() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isWebsiteFlow = params.get("mode") === "website";
  const websiteImported = params.get("websiteImported") === "1";
  const shouldOpenWebsiteImporter = isWebsiteFlow && !websiteImported;
  const initialDraft = useMemo(() => shouldOpenWebsiteImporter ? null : readMenuStudioV2Draft(), [shouldOpenWebsiteImporter]);
  const [ready, setReady] = useState(shouldOpenWebsiteImporter);

  useEffect(() => {
    if (shouldOpenWebsiteImporter) return undefined;
    let active = true;

    async function prepareDraft() {
      const draft = initialDraft;
      const rawMenu = draft?.importProject?.structured_menu;
      const projectId = draft?.importProject?.id
        || draft?.profile?.importedProjectId
        || draft?.menu?.source_project_id
        || "";
      const languages = Array.isArray(rawMenu?.requested_languages) && rawMenu.requested_languages.length
        ? rawMenu.requested_languages
        : Array.isArray(draft?.menu?.languages)
          ? draft.menu.languages
          : [];

      if (!draft || !rawMenu || !projectId || !findMissingRequestedMenuTranslations(rawMenu, languages).length) {
        if (active) setReady(true);
        return;
      }

      try {
        const session = await getMenuImportSession();
        if (!session || !active) {
          if (active) setReady(true);
          return;
        }

        const repair = await repairImportedDraftTranslations({
          session,
          projectId,
          menu: rawMenu,
          languages,
        });
        if (!active) return;

        if (repair?.menu) {
          const repairedMenu = mergeAiTranslationRepairIntoV3(draft.menu, repair.menu);
          writeMenuStudioV2Draft({
            ...draft,
            menu: repairedMenu,
            importProject: {
              ...(draft.importProject || {}),
              id: projectId,
              structured_menu: repair.menu,
            },
          });
        }
      } catch (error) {
        console.warn("Could not complete imported menu translations before opening Studio.", error);
      } finally {
        if (active) setReady(true);
      }
    }

    prepareDraft();
    return () => { active = false; };
  }, [initialDraft, shouldOpenWebsiteImporter]);

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

  return <MenuContentStudioV2 />;
}
