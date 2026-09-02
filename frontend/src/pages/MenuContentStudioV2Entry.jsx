import { useEffect, useMemo, useState } from "react";

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

export default function MenuContentStudioV2Entry() {
  const workspace = useMenuStudioWorkspace();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isWebsiteFlow = params.get("mode") === "website";
  const websiteImported = params.get("websiteImported") === "1";
  const shouldOpenWebsiteImporter = isWebsiteFlow && !websiteImported;
  const initialDraft = useMemo(() => shouldOpenWebsiteImporter ? null : readMenuStudioV2Draft(), [shouldOpenWebsiteImporter]);
  const [alreadyPrepared] = useState(() => {
    const id = menuStudioProjectId(initialDraft);
    return workspace?.isPrepared(id) || workspace?.isContentReady(id) || false;
  });
  const [ready, setReady] = useState(shouldOpenWebsiteImporter || alreadyPrepared);

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
      } finally {
        if (active) {
          writeMenuStudioV2Draft({
            ...draft,
            menu: repairedMenu,
          });
          workspace?.markContentReady(menuStudioProjectId(draft));
          setReady(true);
        }
      }
    }

    prepareDraft();
    return () => { active = false; };
  }, [initialDraft, shouldOpenWebsiteImporter, alreadyPrepared, workspace]);

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
