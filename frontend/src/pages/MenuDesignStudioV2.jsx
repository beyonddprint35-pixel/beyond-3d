import useStudioDraftSave from "../features/menu-engine/studio/useStudioDraftSave";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import MenuStudioHeader from "../components/MenuStudioHeader";
import { flushStudioDraft } from "../features/menu-engine/studio/studioNavigation";
import MenuDesignControls from "../features/menu-engine/studio/MenuDesignControls";
import MenuDesignPicker from "../features/menu-engine/studio/MenuDesignPicker";
import MenuHeroHeadlineControl from "../features/menu-engine/studio/MenuHeroHeadlineControl";
import { PREMIUM_MENU_DESIGNS, applyPremiumMenuDesign, findMatchingMenuDesign } from "../features/menu-engine/domain/menuDesignLibrary";
import MenuStudioDesignCanvas from "../features/menu-engine/studio/MenuStudioDesignCanvas";
import { normalizeMenuDesign } from "../features/menu-engine/domain/designSchema";
import {
  createBlankMenuV2,
  readMenuCreateV2Profile,
  readMenuStudioV2Draft,
  resolveMenuStudioV2Design,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuDesignStudioV2.css";
import "../features/menu-engine/studio/MenuDesignDarkMode.css";

const UI = {
  en: {
    interfaceLanguage:"Language", contentLanguage:"Language", backContent:"Back to Content", workspace:"Menu workspace",
    content:"Content", design:"Design", preview:"Preview", publish:"Publish", saved:"Saved locally", saving:"Saving…", saveError:"Could not save",
    eyebrow:"DESIGN STUDIO", title:"Choose your menu design", hint:"Swipe through designs and tap one to see your menu update below.",
    live:"LIVE DESIGN", continuePreview:"Continue to Preview", draftKept:"Design changes are saved to your draft.",
    restaurantLogo:"Restaurant logo", logoHint:"PNG, JPG, WebP or SVG", uploadLogo:"Upload logo", replaceLogo:"Replace logo", removeLogo:"Remove",
  },
  he: {
    interfaceLanguage:"שפה", contentLanguage:"שפה", backContent:"חזרה לתוכן", workspace:"סביבת עבודת התפריט",
    content:"תוכן", design:"עיצוב", preview:"תצוגה מקדימה", publish:"פרסום", saved:"נשמר מקומית", saving:"שומר…", saveError:"לא ניתן לשמור",
    eyebrow:"סטודיו לעיצוב", title:"בחרו את עיצוב התפריט", hint:"גללו בין העיצובים ולחצו על עיצוב כדי לראות מיד את התפריט שלכם למטה.",
    live:"עיצוב חי", continuePreview:"המשך לתצוגה מקדימה", draftKept:"שינויי העיצוב נשמרים בטיוטה שלכם.",
    restaurantLogo:"לוגו המסעדה", logoHint:"PNG, JPG, WebP או SVG", uploadLogo:"העלאת לוגו", replaceLogo:"החלפת לוגו", removeLogo:"הסרה",
  },
  ar: {
    interfaceLanguage:"اللغة", contentLanguage:"اللغة", backContent:"العودة إلى المحتوى", workspace:"مساحة عمل القائمة",
    content:"المحتوى", design:"التصميم", preview:"المعاينة", publish:"النشر", saved:"تم الحفظ محلياً", saving:"جارٍ الحفظ…", saveError:"تعذر الحفظ",
    eyebrow:"استوديو التصميم", title:"اختاروا تصميم قائمتكم", hint:"مرّروا بين التصاميم واضغطوا على أحدها لرؤية النتيجة فوراً أدناه.",
    live:"تصميم مباشر", continuePreview:"المتابعة إلى المعاينة", draftKept:"تُحفظ تغييرات التصميم في مسودتكم.",
    restaurantLogo:"شعار المطعم", logoHint:"PNG أو JPG أو WebP أو SVG", uploadLogo:"رفع الشعار", replaceLogo:"استبدال الشعار", removeLogo:"إزالة",
  },
};

const RESTAURANT_HERO_DEFAULT = Object.freeze({
  en: "Our Menu",
  he: "התפריט שלנו",
  ar: "قائمتنا",
});

const CLINIC_HERO_DEFAULT = Object.freeze({
  en: "Our Treatments",
  he: "הטיפולים שלנו",
  ar: "علاجاتنا",
});

const LEGACY_GENERIC_HERO_TITLES = Object.freeze({
  en: new Set(["", "made for your table"]),
  he: new Set(["", "נוצר עבור השולחן שלכם"]),
  ar: new Set(["", "صُممت لطاولتكم", "صممت لطاولتكم"]),
});

function localizedHeroTitle(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return { ...value };
  return { en: String(value || ""), he: "", ar: "" };
}

function normalizedHeroValue(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function prepareMenuForIndustry(sourceMenu, entry) {
  if (!sourceMenu) return sourceMenu;
  const clinic = entry?.industry === "clinic";
  const desiredDefaults = clinic ? CLINIC_HERO_DEFAULT : RESTAURANT_HERO_DEFAULT;
  const oppositeDefaults = clinic ? RESTAURANT_HERO_DEFAULT : CLINIC_HERO_DEFAULT;
  const heroTitle = localizedHeroTitle(sourceMenu.hero_title);
  let changed = false;

  ["en", "he", "ar"].forEach((language) => {
    const current = normalizedHeroValue(heroTitle[language]);
    const desired = desiredDefaults[language];
    const opposite = normalizedHeroValue(oppositeDefaults[language]);
    if (current === normalizedHeroValue(desired)) return;
    if (!LEGACY_GENERIC_HERO_TITLES[language].has(current) && current !== opposite) return;
    heroTitle[language] = desired;
    changed = true;
  });

  return changed ? { ...sourceMenu, hero_title: heroTitle } : sourceMenu;
}

function studioRoute(path) {
  flushStudioDraft();
  return `${path}${window.location.search || ""}`;
}

export default function MenuDesignStudioV2() {
  const navigate = useNavigate();
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(() => storedDraft?.profile || readMenuCreateV2Profile(), [storedDraft]);
  const resolved = useMemo(() => resolveMenuStudioV2Design(storedDraft), [storedDraft]);
  const [menu, setMenu] = useState(() => prepareMenuForIndustry(storedDraft?.menu || createBlankMenuV2(), resolved.entry));
  const [{ design, designId }, setDesignState] = useState(() => ({
    design: normalizeMenuDesign(resolved.design),
    designId: findMatchingMenuDesign(resolved.design)?.id || resolved.designId,
  }));
  const designRailRef = useRef(null);
  const [contentLanguage, setContentLanguage] = useState(() => storedDraft?.contentLanguage || readStudioLanguage(menu.default_language || "en"));
  const [uiLanguage, setUiLanguage] = useState(() => storedDraft?.contentLanguage || readStudioLanguage(menu.default_language || "en"));
  const [panel, setPanel] = useState("brand");

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const logo = Object.prototype.hasOwnProperty.call(design.brand || {}, "logoUrl") ? design.brand.logoUrl : (menu.logo_url || "");
  const selectedDesignEntry = PREMIUM_MENU_DESIGNS.find((entry) => entry.id === designId) || resolved.entry;

  const saveState = useStudioDraftSave({ ...(storedDraft || {}), menu, design, designId, profile, contentLanguage });

  const saveLabel = saveState === "saving" ? t.saving : saveState === "error" ? t.saveError : t.saved;

  function changeStudioLanguage(language) {
    setContentLanguage(language);
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function patchDesign(updater, selectedId) {
    setDesignState((current) => {
      const next = normalizeMenuDesign(typeof updater === "function" ? updater(current.design) : updater);
      return { design: next, designId: selectedId || findMatchingMenuDesign(next)?.id || current.designId };
    });
  }

  function patchLogo(value) {
    patchDesign((current) => ({ ...current, brand: { ...current.brand, logoUrl: value } }));
  }

  function patchHeroHeadline(value) {
    setMenu((current) => ({
      ...current,
      hero_title: {
        ...localizedHeroTitle(current.hero_title),
        [contentLanguage]: value,
      },
    }));
  }

  function uploadLogo(file) {
    if (!file || !file.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => patchLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function chooseDesign(selectedId) {
    if (selectedId === designId) return;
    const selectedEntry = PREMIUM_MENU_DESIGNS.find((entry) => entry.id === selectedId);
    setMenu((current) => prepareMenuForIndustry(current, selectedEntry));
    patchDesign((current) => applyPremiumMenuDesign(current, selectedId), selectedId);
  }

  function browseDesigns() {
    const selected = designRailRef.current?.querySelector('[aria-selected="true"]');
    selected?.scrollIntoView({ block: "center", inline: "nearest" });
    selected?.focus({ preventScroll: true });
  }

  return (
    <main className="menu-design-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <MenuStudioHeader stage="design" language={uiLanguage} onLanguageChange={changeStudioLanguage} menuName={menu.restaurant_name} onBack={() => navigate(studioRoute("/menu-studio/content"))} backLabel={t.backContent} saveState={saveState} saveLabel={saveLabel} />

      <section className="menu-design-v2-intro">
        <div><span><Sparkles size={13} /> {t.eyebrow}</span><h1>{t.title}</h1><p>{t.hint}</p></div>
        <div className="menu-design-v2-logo-control">
          <div className="menu-design-v2-logo-preview">{logo ? <img src={logo} alt="" /> : <span>LOGO</span>}</div>
          <div className="menu-design-v2-logo-copy"><strong>{t.restaurantLogo}</strong><small>{t.logoHint}</small></div>
          <label className="menu-design-v2-logo-upload">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadLogo(event.target.files?.[0])} />
            <span>{logo ? t.replaceLogo : t.uploadLogo}</span>
          </label>
          {logo ? <button type="button" className="menu-design-v2-logo-remove" onClick={() => patchLogo("")}>{t.removeLogo}</button> : null}
        </div>
      </section>

      <div className="menu-design-v2-workspace">
        <section className="menu-design-v2-canvas">
          <MenuDesignPicker designId={designId} language={uiLanguage} onSelect={chooseDesign} railRef={designRailRef} previewId="menu-design-live-preview" />
          <div className="menu-design-v2-live-preview" id="menu-design-live-preview" role="tabpanel" aria-labelledby={`menu-design-tab-${designId}`}>
            <MenuStudioDesignCanvas
              menu={{ ...menu, default_language: contentLanguage }}
              design={design}
              language={contentLanguage}
              uiLanguage={uiLanguage}
              label={t.live}
              compact
            />
          </div>
          <div className="menu-design-v2-next">
            <span>{t.draftKept}</span>
            <button type="button" onClick={() => navigate(studioRoute("/menu-studio/preview"))}>{t.continuePreview} <ForwardIcon size={14} /></button>
          </div>
        </section>
        <aside className="menu-design-v2-controls">
          <MenuDesignControls
            design={design}
            designId={designId}
            baselineDesign={resolved.baselineDesign}
            menu={menu}
            language={uiLanguage}
            panel={panel}
            setPanel={setPanel}
            patchDesign={patchDesign}
            onBrowseDesigns={browseDesigns}
          />
          {panel === "hero" ? (
            <MenuHeroHeadlineControl
              value={menu.hero_title}
              language={contentLanguage}
              industry={selectedDesignEntry?.industry || "restaurant"}
              onChange={patchHeroHeadline}
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}
