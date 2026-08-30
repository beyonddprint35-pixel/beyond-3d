import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Eye, Rocket, TriangleAlert } from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import MenuStudioPreviewStage from "../features/menu-engine/studio/MenuStudioPreviewStage";
import { buildMenuStudioReadiness } from "../features/menu-engine/studio/menuStudioV2Readiness";
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
  studioLanguageMeta,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuPreviewStudioV2.css";

const UI = {
  en: {
    workspace:"Menu workspace", interfaceLanguage:"Interface language", contentLanguage:"Preview language",
    content:"Content", design:"Design", preview:"Preview", publish:"Publish", backDesign:"Back to Design",
    eyebrow:"CUSTOMER PREVIEW", title:"Review the experience before it goes live", hint:"Check every customer language and device using the exact menu draft your guests will receive.",
    ready:"Ready for final publish setup", attention:"Review before publishing", designLabel:"Design", items:"visible items", languages:"menu languages",
    continuePublish:"Continue to Publish", saved:"Preview language is saved with this draft.",
    languageReview:"Language review", languageReviewHint:"Click a language to inspect it in the live preview.", clean:"Complete", blocker:"needs attention", warning:"quality note",
    emptyCategories:"empty visible categories", allClear:"All enabled languages have complete category and item names.", qualityNotes:"quality notes", issues:"blocking issues",
  },
  he: {
    workspace:"סביבת עבודת התפריט", interfaceLanguage:"שפת הממשק", contentLanguage:"שפת התצוגה",
    content:"תוכן", design:"עיצוב", preview:"תצוגה מקדימה", publish:"פרסום", backDesign:"חזרה לעיצוב",
    eyebrow:"תצוגת לקוח", title:"בדקו את החוויה לפני שהיא עולה לאוויר", hint:"בדקו כל שפת לקוח וכל מכשיר באמצעות טיוטת התפריט המדויקת שהאורחים יקבלו.",
    ready:"מוכן להגדרות הפרסום הסופיות", attention:"כדאי לבדוק לפני הפרסום", designLabel:"עיצוב", items:"פריטים גלויים", languages:"שפות תפריט",
    continuePublish:"המשך לפרסום", saved:"שפת התצוגה נשמרת עם הטיוטה.",
    languageReview:"בדיקת שפות", languageReviewHint:"לחצו על שפה כדי לבדוק אותה בתצוגה החיה.", clean:"מלא", blocker:"דורש תשומת לב", warning:"הערת איכות",
    emptyCategories:"קטגוריות גלויות ריקות", allClear:"לכל השפות הפעילות יש שמות מלאים לקטגוריות ולפריטים.", qualityNotes:"הערות איכות", issues:"בעיות חוסמות",
  },
  ar: {
    workspace:"مساحة عمل القائمة", interfaceLanguage:"لغة الواجهة", contentLanguage:"لغة المعاينة",
    content:"المحتوى", design:"التصميم", preview:"المعاينة", publish:"النشر", backDesign:"العودة إلى التصميم",
    eyebrow:"معاينة الزبون", title:"راجعوا التجربة قبل نشرها", hint:"تحققوا من كل لغة للزبائن ومن كل جهاز باستخدام نفس مسودة القائمة التي سيشاهدها الضيوف.",
    ready:"جاهزة لإعداد النشر النهائي", attention:"راجع قبل النشر", designLabel:"التصميم", items:"عناصر ظاهرة", languages:"لغات القائمة",
    continuePublish:"المتابعة إلى النشر", saved:"يتم حفظ لغة المعاينة مع هذه المسودة.",
    languageReview:"مراجعة اللغات", languageReviewHint:"اضغط على لغة لمراجعتها في المعاينة الحية.", clean:"مكتملة", blocker:"تحتاج انتباهاً", warning:"ملاحظة جودة",
    emptyCategories:"فئات ظاهرة فارغة", allClear:"كل اللغات المفعلة تحتوي على أسماء كاملة للفئات والعناصر.", qualityNotes:"ملاحظات جودة", issues:"مشكلات مانعة",
  },
};

export default function MenuPreviewStudioV2() {
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(readMenuCreateV2Profile, []);
  const resolved = useMemo(() => resolveMenuStudioV2Design(storedDraft), [storedDraft]);
  const [menu] = useState(() => storedDraft?.menu || createBlankMenuV2());
  const [design] = useState(() => resolved.design);
  const menuLanguages = menu.languages?.length ? menu.languages : [menu.default_language || "en"];
  const [contentLanguage, setContentLanguage] = useState(() => {
    const saved = storedDraft?.contentLanguage || menu.default_language || menuLanguages[0] || "en";
    return menuLanguages.includes(saved) ? saved : menuLanguages[0] || "en";
  });
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage("en"));

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const readiness = useMemo(() => buildMenuStudioReadiness({ menu, design, languages: menuLanguages }), [menu, design, menuLanguages]);

  useEffect(() => {
    writeMenuStudioV2Draft({
      ...(storedDraft || {}),
      menu,
      design,
      designId: storedDraft?.designId || resolved.designId,
      profile,
      contentLanguage,
    });
  }, [contentLanguage, design, menu, profile, resolved.designId, storedDraft]);

  function changeUiLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  return (
    <main className="menu-preview-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-preview-v2-topbar">
        <div className="menu-preview-v2-brand-wrap">
          <button type="button" className="menu-preview-v2-back" onClick={() => window.location.assign("/dev/menu-design-v2")} title={t.backDesign}><BackIcon size={16} /></button>
          <button type="button" className="menu-preview-v2-brand" onClick={() => window.location.assign("/dev/menu-content-v2")}>
            <img src={beyondLogo} alt="" />
            <span><strong>Beyond Menu Studio</strong><small>{menu.restaurant_name}</small></span>
          </button>
        </div>

        <nav className="menu-preview-v2-product-nav" aria-label={t.workspace}>
          <button type="button" onClick={() => window.location.assign("/dev/menu-content-v2")}>{t.content}</button>
          <button type="button" onClick={() => window.location.assign("/dev/menu-design-v2")}>{t.design}</button>
          <button type="button" className="active">{t.preview}</button>
          <button type="button" onClick={() => window.location.assign("/dev/menu-publish-v2")}>{t.publish}</button>
        </nav>

        <div className="menu-preview-v2-top-actions">
          <StudioLanguageMenu value={contentLanguage} onChange={setContentLanguage} label={t.contentLanguage} compact allowedLanguages={menuLanguages} />
          <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} label={t.interfaceLanguage} compact />
        </div>
      </header>

      <section className="menu-preview-v2-intro">
        <div className="menu-preview-v2-intro-copy">
          <span><Eye size={13} /> {t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.hint}</p>
        </div>
        <div className={`menu-preview-v2-summary ${readiness.ready ? "is-ready" : "needs-review"}`}>
          <div>{readiness.ready ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<span><strong>{readiness.ready ? t.ready : t.attention}</strong><small>{readiness.blockers.length} {t.issues} · {readiness.warnings.length} {t.qualityNotes}</small></span></div>
          <dl>
            <div><dt>{t.designLabel}</dt><dd>{resolved.entry?.name || "Custom"}</dd></div>
            <div><dt>{t.items}</dt><dd>{readiness.visibleItems}</dd></div>
            <div><dt>{t.languages}</dt><dd>{menuLanguages.length}</dd></div>
          </dl>
        </div>
      </section>

      <section className="menu-preview-v2-language-review" aria-label={t.languageReview}>
        <div className="menu-preview-v2-language-review-heading"><div><strong>{t.languageReview}</strong><span>{t.languageReviewHint}</span></div>{readiness.emptyGroups ? <span className="menu-preview-v2-empty-warning"><TriangleAlert size={13} /> {readiness.emptyGroups} {t.emptyCategories}</span> : <span className="menu-preview-v2-clear"><Check size={13} /> {t.allClear}</span>}</div>
        <div className="menu-preview-v2-language-cards">
          {menuLanguages.map((code) => {
            const meta = studioLanguageMeta(code);
            const state = readiness.byLanguage[code] || { blockers: 0, warnings: 0 };
            const clean = state.blockers === 0;
            return <button type="button" key={code} className={`${contentLanguage === code ? "active" : ""} ${clean ? "clean" : "problem"}`} onClick={() => setContentLanguage(code)}>
              <span className="menu-preview-v2-language-state">{clean ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}</span>
              <span className="menu-preview-v2-language-copy"><strong>{meta.nativeLabel}</strong><small>{clean ? t.clean : `${state.blockers} ${t.blocker}`}{state.warnings ? ` · ${state.warnings} ${t.warning}` : ""}</small></span>
              <b>{meta.short}</b>
            </button>;
          })}
        </div>
      </section>

      <section className="menu-preview-v2-stage-wrap">
        <MenuStudioPreviewStage
          menu={{ ...menu, default_language: contentLanguage }}
          design={design}
          language={contentLanguage}
          uiLanguage={uiLanguage}
        />
      </section>

      <footer className="menu-preview-v2-footer">
        <button type="button" className="secondary" onClick={() => window.location.assign("/dev/menu-design-v2")}><BackIcon size={14} /> {t.backDesign}</button>
        <button type="button" className="primary" onClick={() => window.location.assign("/dev/menu-publish-v2")}>{t.continuePublish} <Rocket size={14} /><ForwardIcon size={14} /></button>
      </footer>
    </main>
  );
}
