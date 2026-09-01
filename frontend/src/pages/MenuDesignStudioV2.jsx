import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import MenuDesignControls from "../features/menu-engine/studio/MenuDesignControls";
import MenuStudioDesignCanvas from "../features/menu-engine/studio/MenuStudioDesignCanvas";
import { normalizeMenuDesign } from "../features/menu-engine/domain/designSchema";
import {
  createBlankMenuV2,
  readMenuCreateV2Profile,
  readMenuStudioV2Draft,
  resolveMenuStudioV2Design,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuDesignStudioV2.css";

const UI = {
  en: {
    interfaceLanguage:"Language", contentLanguage:"Language", backContent:"Back to Content", workspace:"Menu workspace",
    content:"Content", design:"Design", preview:"Preview", publish:"Publish", saved:"Saved locally", saving:"Saving…", saveError:"Could not save",
    eyebrow:"DESIGN STUDIO", title:"Shape the customer experience", hint:"Choose a real menu design, then refine the brand, colors, type, layout and details while the live menu updates instantly.",
    live:"LIVE DESIGN", continuePreview:"Continue to Preview", draftKept:"The same guided menu draft is being edited here.",
  },
  he: {
    interfaceLanguage:"שפה", contentLanguage:"שפה", backContent:"חזרה לתוכן", workspace:"סביבת עבודת התפריט",
    content:"תוכן", design:"עיצוב", preview:"תצוגה מקדימה", publish:"פרסום", saved:"נשמר מקומית", saving:"שומר…", saveError:"לא ניתן לשמור",
    eyebrow:"סטודיו לעיצוב", title:"עצבו את חוויית הלקוח", hint:"בחרו עיצוב תפריט אמיתי ואז דייקו מותג, צבעים, טיפוגרפיה, פריסה ופרטים בזמן שהתפריט החי מתעדכן מיד.",
    live:"עיצוב חי", continuePreview:"המשך לתצוגה מקדימה", draftKept:"אותה טיוטת תפריט מודרכת נערכת גם כאן.",
  },
  ar: {
    interfaceLanguage:"اللغة", contentLanguage:"اللغة", backContent:"العودة إلى المحتوى", workspace:"مساحة عمل القائمة",
    content:"المحتوى", design:"التصميم", preview:"المعاينة", publish:"النشر", saved:"تم الحفظ محلياً", saving:"جارٍ الحفظ…", saveError:"تعذر الحفظ",
    eyebrow:"استوديو التصميم", title:"صمموا تجربة الزبون", hint:"اختاروا تصميماً حقيقياً للقائمة ثم اضبطوا الهوية والألوان والخطوط والتخطيط والتفاصيل بينما تتحدث القائمة مباشرة.",
    live:"تصميم مباشر", continuePreview:"المتابعة إلى المعاينة", draftKept:"يتم تعديل نفس مسودة القائمة الموجهة هنا.",
  },
};

function studioRoute(path) {
  return `${path}${window.location.search || ""}`;
}

export default function MenuDesignStudioV2() {
  const navigate = useNavigate();
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(readMenuCreateV2Profile, []);
  const resolved = useMemo(() => resolveMenuStudioV2Design(storedDraft), [storedDraft]);
  const [menu] = useState(() => storedDraft?.menu || createBlankMenuV2());
  const [design, setDesign] = useState(() => normalizeMenuDesign(resolved.design));
  const [contentLanguage, setContentLanguage] = useState(() => storedDraft?.contentLanguage || readStudioLanguage(menu.default_language || "en"));
  const [uiLanguage, setUiLanguage] = useState(() => storedDraft?.contentLanguage || readStudioLanguage(menu.default_language || "en"));
  const [panel, setPanel] = useState("brand");
  const [saveState, setSaveState] = useState("saved");

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;

  useEffect(() => {
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const ok = writeMenuStudioV2Draft({
        ...(storedDraft || {}),
        menu,
        design,
        designId: storedDraft?.designId || resolved.designId,
        profile,
        contentLanguage,
      });
      setSaveState(ok ? "saved" : "error");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [menu, design, resolved.designId, profile, contentLanguage, storedDraft]);

  const saveLabel = saveState === "saving" ? t.saving : saveState === "error" ? t.saveError : t.saved;

  function changeStudioLanguage(language) {
    setContentLanguage(language);
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function patchDesign(updater) {
    setDesign((current) => normalizeMenuDesign(typeof updater === "function" ? updater(current) : updater));
  }

  return (
    <main className="menu-design-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-design-v2-topbar">
        <div className="menu-design-v2-brand-wrap">
          <button type="button" className="menu-design-v2-back" onClick={() => navigate(studioRoute("/menu-studio/content"))} title={t.backContent}><BackIcon size={16} /></button>
          <button type="button" className="menu-design-v2-brand" onClick={() => navigate(studioRoute("/menu-studio/content"))}>
            <img src={beyondLogo} alt="" />
            <span><strong>Beyond Menu Studio</strong><small>{menu.restaurant_name}</small></span>
          </button>
        </div>

        <nav className="menu-design-v2-product-nav" aria-label={t.workspace}>
          <button type="button" onClick={() => navigate(studioRoute("/menu-studio/content"))}>{t.content}</button>
          <button type="button" className="active">{t.design}</button>
          <button type="button" onClick={() => navigate(studioRoute("/menu-studio/preview"))}>{t.preview}</button>
          <button type="button" onClick={() => navigate(studioRoute("/menu-studio/publish"))}>{t.publish}</button>
        </nav>

        <div className="menu-design-v2-top-actions">
          <StudioLanguageMenu value={contentLanguage} onChange={changeStudioLanguage} label={t.contentLanguage} compact />
          <div className="menu-design-v2-save"><span className={saveState === "saved" ? "ok" : ""} /><strong>{saveLabel}</strong></div>
        </div>
      </header>

      <section className="menu-design-v2-intro">
        <div><span><Sparkles size={13} /> {t.eyebrow}</span><h1>{t.title}</h1><p>{t.hint}</p></div>
        <div className="menu-design-v2-intro-status"><Check size={14} /><span><strong>{resolved.entry?.name || t.live}</strong><small>{t.draftKept}</small></span></div>
      </section>

      <div className="menu-design-v2-workspace">
        <aside className="menu-design-v2-controls">
          <MenuDesignControls
            design={design}
            baselineDesign={resolved.baselineDesign}
            menu={menu}
            language={uiLanguage}
            panel={panel}
            setPanel={setPanel}
            patchDesign={patchDesign}
          />
        </aside>

        <section className="menu-design-v2-canvas">
          <MenuStudioDesignCanvas
            menu={{ ...menu, default_language: contentLanguage }}
            design={design}
            language={contentLanguage}
            uiLanguage={uiLanguage}
            label={t.live}
          />
          <div className="menu-design-v2-next">
            <span>{t.draftKept}</span>
            <button type="button" onClick={() => navigate(studioRoute("/menu-studio/preview"))}>{t.continuePreview} <ForwardIcon size={14} /></button>
          </div>
        </section>
      </div>
    </main>
  );
}