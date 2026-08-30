import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, Rocket } from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import MenuStudioPreviewStage from "../features/menu-engine/studio/MenuStudioPreviewStage";
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
import "./MenuPreviewStudioV2.css";

const UI = {
  en: {
    workspace:"Menu workspace", interfaceLanguage:"Interface language", contentLanguage:"Preview language",
    content:"Content", design:"Design", preview:"Preview", publish:"Publish", backDesign:"Back to Design",
    eyebrow:"CUSTOMER PREVIEW", title:"See the menu exactly as your guests will", hint:"Review the same menu on mobile, tablet and desktop before anything goes live.",
    ready:"Preview is connected to your current draft", designLabel:"Design", items:"visible items", languages:"menu languages",
    continuePublish:"Continue to Publish", saved:"Preview language is saved with this draft.",
  },
  he: {
    workspace:"סביבת עבודת התפריט", interfaceLanguage:"שפת הממשק", contentLanguage:"שפת התצוגה",
    content:"תוכן", design:"עיצוב", preview:"תצוגה מקדימה", publish:"פרסום", backDesign:"חזרה לעיצוב",
    eyebrow:"תצוגת לקוח", title:"ראו את התפריט בדיוק כפי שהאורחים יראו אותו", hint:"בדקו את אותה טיוטה בנייד, בטאבלט ובמחשב לפני שמשהו עולה לאוויר.",
    ready:"התצוגה מחוברת לטיוטה הנוכחית", designLabel:"עיצוב", items:"פריטים גלויים", languages:"שפות תפריט",
    continuePublish:"המשך לפרסום", saved:"שפת התצוגה נשמרת עם הטיוטה.",
  },
  ar: {
    workspace:"مساحة عمل القائمة", interfaceLanguage:"لغة الواجهة", contentLanguage:"لغة المعاينة",
    content:"المحتوى", design:"التصميم", preview:"المعاينة", publish:"النشر", backDesign:"العودة إلى التصميم",
    eyebrow:"معاينة الزبون", title:"شاهدوا القائمة تماماً كما سيراها ضيوفكم", hint:"راجعوا نفس المسودة على الهاتف والجهاز اللوحي والكمبيوتر قبل نشر أي شيء.",
    ready:"المعاينة متصلة بالمسودة الحالية", designLabel:"التصميم", items:"عناصر ظاهرة", languages:"لغات القائمة",
    continuePublish:"المتابعة إلى النشر", saved:"يتم حفظ لغة المعاينة مع هذه المسودة.",
  },
};

export default function MenuPreviewStudioV2() {
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(readMenuCreateV2Profile, []);
  const resolved = useMemo(() => resolveMenuStudioV2Design(storedDraft), [storedDraft]);
  const [menu] = useState(() => storedDraft?.menu || createBlankMenuV2());
  const [design] = useState(() => resolved.design);
  const [contentLanguage, setContentLanguage] = useState(() => storedDraft?.contentLanguage || menu.default_language || "en");
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage("en"));

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const visibleItems = (menu.items || []).filter((item) => item.visible !== false).length;
  const menuLanguages = menu.languages?.length ? menu.languages : [menu.default_language || "en"];

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
          <StudioLanguageMenu value={contentLanguage} onChange={setContentLanguage} label={t.contentLanguage} compact />
          <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} label={t.interfaceLanguage} compact />
        </div>
      </header>

      <section className="menu-preview-v2-intro">
        <div className="menu-preview-v2-intro-copy">
          <span><Eye size={13} /> {t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.hint}</p>
        </div>
        <div className="menu-preview-v2-summary">
          <div><Check size={15} /><span><strong>{t.ready}</strong><small>{t.saved}</small></span></div>
          <dl>
            <div><dt>{t.designLabel}</dt><dd>{resolved.entry?.name || "Custom"}</dd></div>
            <div><dt>{t.items}</dt><dd>{visibleItems}</dd></div>
            <div><dt>{t.languages}</dt><dd>{menuLanguages.length}</dd></div>
          </dl>
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
