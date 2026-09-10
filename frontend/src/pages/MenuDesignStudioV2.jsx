import useStudioDraftSave from "../features/menu-engine/studio/useStudioDraftSave";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import MenuStudioHeader from "../components/MenuStudioHeader";
import { flushStudioDraft } from "../features/menu-engine/studio/studioNavigation";
import HeroImageFramingControl from "../features/menu-engine/studio/HeroImageFramingControl";
import MenuDesignControls from "../features/menu-engine/studio/MenuDesignControls";
import MenuItemNameColorControl from "../features/menu-engine/studio/MenuItemNameColorControl";
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
import "../features/menu-engine/studio/MenuDesignAdvancedClarity.css";
import "../features/menu-engine/studio/MenuDesignDarkMode.css";
import "../features/menu-engine/studio/MenuDesignDarkModePolish.css";
import "../features/menu-engine/studio/MenuDesignVariants.css";
import "../features/menu-engine/studio/MenuDesignCompactWorkspace.css";

const UI = {
  en: {
    interfaceLanguage:"Language", contentLanguage:"Language", backContent:"Back to Content", workspace:"Menu workspace",
    content:"Content", design:"Design", preview:"Preview", publish:"Publish", saved:"Saved locally", saving:"Saving…", saveError:"Could not save",
    eyebrow:"DESIGN STUDIO", title:"Design your menu", hint:"Choose a design and adjust it while your live menu stays visible beside you.",
    live:"LIVE DESIGN", continuePreview:"Continue to Preview", draftKept:"Design changes are saved to your draft.",
    savedDesigns:"Saved options", savedDesignsHint:"Keep two favorites for this menu. Switching options never changes your menu content.", option1:"Option 1", option2:"Option 2", editing:"Editing", duplicateHint:"Tap to create from your current option",
  },
  he: {
    interfaceLanguage:"שפה", contentLanguage:"שפה", backContent:"חזרה לתוכן", workspace:"סביבת עבודת התפריט",
    content:"תוכן", design:"עיצוב", preview:"תצוגה מקדימה", publish:"פרסום", saved:"נשמר מקומית", saving:"שומר…", saveError:"לא ניתן לשמור",
    eyebrow:"סטודיו לעיצוב", title:"עצבו את התפריט", hint:"בחרו עיצוב והתאימו אותו בזמן שהתפריט החי נשאר מולכם לאורך כל הדרך.",
    live:"עיצוב חי", continuePreview:"המשך לתצוגה מקדימה", draftKept:"שינויי העיצוב נשמרים בטיוטה שלכם.",
    savedDesigns:"אפשרויות שמורות", savedDesignsHint:"שמרו שתי אפשרויות מועדפות לאותו תפריט. התוכן נשאר משותף.", option1:"אפשרות 1", option2:"אפשרות 2", editing:"בעריכה", duplicateHint:"לחצו כדי ליצור מהאפשרות הנוכחית",
  },
  ar: {
    interfaceLanguage:"اللغة", contentLanguage:"اللغة", backContent:"العودة إلى المحتوى", workspace:"مساحة عمل القائمة",
    content:"المحتوى", design:"التصميم", preview:"المعاينة", publish:"النشر", saved:"تم الحفظ محلياً", saving:"جارٍ الحفظ…", saveError:"تعذر الحفظ",
    eyebrow:"استوديو التصميم", title:"صمّم قائمتك", hint:"اختر تصميماً وعدّله بينما تبقى المعاينة الحية ظاهرة أمامك طوال الوقت.",
    live:"تصميم مباشر", continuePreview:"المتابعة إلى المعاينة", draftKept:"تُحفظ تغييرات التصميم في مسودتكم.",
    savedDesigns:"خيارات محفوظة", savedDesignsHint:"احتفظ بخيارين مفضلين لنفس القائمة. يبقى المحتوى مشتركاً.", option1:"الخيار 1", option2:"الخيار 2", editing:"قيد التعديل", duplicateHint:"اضغط للإنشاء من الخيار الحالي",
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

function optionSlotLabel(slot, t) {
  return slot === "B" ? t.option2 : t.option1;
}

export default function MenuDesignStudioV2() {
  const navigate = useNavigate();
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const resolved = useMemo(() => resolveMenuStudioV2Design(storedDraft), [storedDraft]);
  const initialProfile = useMemo(() => storedDraft?.profile || readMenuCreateV2Profile() || {}, [storedDraft]);
  const initialActiveSlot = initialProfile?.activeDesignVariant === "B" ? "B" : "A";
  const initialVariants = useMemo(() => {
    const saved = initialProfile?.designVariants || {};
    const fallback = {
      design: normalizeMenuDesign(resolved.design),
      designId: findMatchingMenuDesign(resolved.design)?.id || resolved.designId,
    };
    return {
      A: saved.A?.design ? { design: normalizeMenuDesign(saved.A.design), designId: saved.A.designId || findMatchingMenuDesign(saved.A.design)?.id || resolved.designId } : fallback,
      B: saved.B?.design ? { design: normalizeMenuDesign(saved.B.design), designId: saved.B.designId || findMatchingMenuDesign(saved.B.design)?.id || resolved.designId } : null,
    };
  }, [initialProfile, resolved]);
  const initialVariant = initialVariants[initialActiveSlot] || initialVariants.A;

  const [profile, setProfile] = useState(() => ({
    ...initialProfile,
    activeDesignVariant: initialActiveSlot,
    designVariants: initialVariants,
  }));
  const [activeDesignVariant, setActiveDesignVariant] = useState(initialActiveSlot);
  const [designVariants, setDesignVariants] = useState(initialVariants);
  const [menu, setMenu] = useState(() => prepareMenuForIndustry(storedDraft?.menu || createBlankMenuV2(), PREMIUM_MENU_DESIGNS.find((entry) => entry.id === initialVariant?.designId) || resolved.entry));
  const [{ design, designId }, setDesignState] = useState(() => ({
    design: normalizeMenuDesign(initialVariant?.design || resolved.design),
    designId: initialVariant?.designId || findMatchingMenuDesign(resolved.design)?.id || resolved.designId,
  }));
  const designRailRef = useRef(null);
  const [contentLanguage, setContentLanguage] = useState(() => storedDraft?.contentLanguage || readStudioLanguage(menu.default_language || "en"));
  const [uiLanguage, setUiLanguage] = useState(() => storedDraft?.contentLanguage || readStudioLanguage(menu.default_language || "en"));
  const [panel, setPanel] = useState("brand");

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const placeLogo = design?.brand?.logoUrl || menu?.logo_url || "";
  const selectedDesignEntry = PREMIUM_MENU_DESIGNS.find((entry) => entry.id === designId) || resolved.entry;

  const saveState = useStudioDraftSave({ ...(storedDraft || {}), menu, design, designId, profile, contentLanguage });
  const saveLabel = saveState === "saving" ? t.saving : saveState === "error" ? t.saveError : t.saved;

  function changeStudioLanguage(language) {
    setContentLanguage(language);
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function persistVariants(nextVariants, nextActive = activeDesignVariant) {
    setDesignVariants(nextVariants);
    setProfile((current) => ({
      ...(current || {}),
      activeDesignVariant: nextActive,
      designVariants: nextVariants,
    }));
  }

  function patchDesign(updater, selectedId) {
    setDesignState((current) => {
      const next = normalizeMenuDesign(typeof updater === "function" ? updater(current.design) : updater);
      const nextId = selectedId || findMatchingMenuDesign(next)?.id || current.designId;
      const nextVariants = {
        ...designVariants,
        [activeDesignVariant]: { design: next, designId: nextId },
      };
      persistVariants(nextVariants, activeDesignVariant);
      return { design: next, designId: nextId };
    });
  }

  function switchDesignVariant(slot) {
    if (slot === activeDesignVariant) return;
    let nextVariants = designVariants;
    let target = designVariants[slot];
    if (!target) {
      target = { design: normalizeMenuDesign(design), designId };
      nextVariants = { ...designVariants, [slot]: target };
    }
    const targetEntry = PREMIUM_MENU_DESIGNS.find((entry) => entry.id === target.designId) || resolved.entry;
    setMenu((current) => prepareMenuForIndustry(current, targetEntry));
    setActiveDesignVariant(slot);
    setDesignState({ design: normalizeMenuDesign(target.design), designId: target.designId || resolved.designId });
    persistVariants(nextVariants, slot);
  }

  function updateSharedLogo(value) {
    const nextCurrentDesign = normalizeMenuDesign({
      ...design,
      brand: { ...(design?.brand || {}), logoUrl: value },
    });
    const nextVariants = { ...designVariants };

    ["A", "B"].forEach((slot) => {
      const variant = nextVariants[slot];
      if (!variant?.design) return;
      nextVariants[slot] = {
        ...variant,
        design: slot === activeDesignVariant
          ? nextCurrentDesign
          : normalizeMenuDesign({
              ...variant.design,
              brand: { ...(variant.design?.brand || {}), logoUrl: value },
            }),
      };
    });

    nextVariants[activeDesignVariant] = {
      ...(nextVariants[activeDesignVariant] || {}),
      design: nextCurrentDesign,
      designId,
    };

    setDesignState({ design: nextCurrentDesign, designId });
    setDesignVariants(nextVariants);
    setProfile((current) => ({
      ...(current || {}),
      activeDesignVariant,
      designVariants: nextVariants,
    }));
    setMenu((current) => ({ ...current, logo_url: value }));
  }

  function updatePlaceStyle(nextStyle) {
    setProfile((current) => ({
      ...(current || {}),
      aiPlaceStyle: nextStyle,
    }));
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

  function chooseDesign(selectedId) {
    if (selectedId === designId) return;
    const selectedEntry = PREMIUM_MENU_DESIGNS.find((entry) => entry.id === selectedId);
    const sharedLogo = placeLogo;
    setMenu((current) => prepareMenuForIndustry(current, selectedEntry));
    patchDesign((current) => {
      const applied = applyPremiumMenuDesign(current, selectedId);
      return sharedLogo
        ? { ...applied, brand: { ...(applied.brand || {}), logoUrl: sharedLogo } }
        : applied;
    }, selectedId);
  }

  function browseDesigns() {
    const selected = designRailRef.current?.querySelector('[aria-selected="true"]');
    selected?.scrollIntoView({ block: "nearest", inline: "center" });
    selected?.focus({ preventScroll: true });
  }

  function slotDesignName(slot) {
    const variant = designVariants[slot];
    if (!variant) return t.duplicateHint;
    return PREMIUM_MENU_DESIGNS.find((entry) => entry.id === variant.designId)?.name || "Custom";
  }

  return (
    <main className="menu-design-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <MenuStudioHeader
        stage="design"
        language={uiLanguage}
        onLanguageChange={changeStudioLanguage}
        menuName={menu.restaurant_name}
        onBack={() => navigate(studioRoute("/menu-studio/content"))}
        backLabel={t.backContent}
        saveState={saveState}
        saveLabel={saveLabel}
        placeLogo={placeLogo}
        placeStyle={profile?.aiPlaceStyle || null}
        onPlaceLogoUpdate={updateSharedLogo}
        onPlaceStyleUpdate={updatePlaceStyle}
      />

      <div className="menu-design-v2-workspace">
        <aside className="menu-design-v2-controls">
          <div className="menu-design-v2-sidebar-overview">
            <div className="menu-design-v2-sidebar-title">
              <span><Sparkles size={13} /> {t.eyebrow}</span>
              <strong>{t.title}</strong>
              <small>{t.hint}</small>
            </div>

            <section className="menu-design-v2-variants menu-design-v2-variants-compact" aria-label={t.savedDesigns}>
              <div className="menu-design-v2-variants-copy"><strong>{t.savedDesigns}</strong><small>{t.savedDesignsHint}</small></div>
              <div className="menu-design-v2-variant-buttons">
                {["A", "B"].map((slot) => (
                  <button key={slot} type="button" className={`menu-design-v2-variant-button ${activeDesignVariant === slot ? "active" : ""}`} onClick={() => switchDesignVariant(slot)} aria-pressed={activeDesignVariant === slot}>
                    <span className="menu-design-v2-variant-letter">{slot === "B" ? "2" : "1"}</span>
                    <span><strong>{optionSlotLabel(slot, t)}{activeDesignVariant === slot ? ` · ${t.editing}` : ""}</strong><small>{slotDesignName(slot)}</small></span>
                  </button>
                ))}
              </div>
            </section>

            <div className="menu-design-v2-sidebar-picker">
              <MenuDesignPicker designId={designId} language={uiLanguage} onSelect={chooseDesign} railRef={designRailRef} previewId="menu-design-live-preview" />
            </div>
          </div>

          <HeroImageFramingControl design={design} language={uiLanguage} patchDesign={patchDesign} />
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
          {panel === "type" ? <MenuItemNameColorControl design={design} language={uiLanguage} patchDesign={patchDesign} /> : null}
          {panel === "hero" ? (
            <MenuHeroHeadlineControl
              value={menu.hero_title}
              language={contentLanguage}
              industry={selectedDesignEntry?.industry || "restaurant"}
              onChange={patchHeroHeadline}
            />
          ) : null}
        </aside>

        <section className="menu-design-v2-canvas">
          <div className="menu-design-v2-live-preview" id="menu-design-live-preview" role="tabpanel" aria-labelledby={`menu-design-tab-${designId}`}>
            <MenuStudioDesignCanvas
              menu={{ ...menu, default_language: contentLanguage }}
              design={design}
              language={contentLanguage}
              uiLanguage={uiLanguage}
              label={`${t.live} · ${optionSlotLabel(activeDesignVariant, t)}`}
              patchDesign={patchDesign}
              compact
            />
          </div>
          <div className="menu-design-v2-next">
            <span>{t.draftKept}</span>
            <button type="button" onClick={() => navigate(studioRoute("/menu-studio/preview"))}>{t.continuePreview} <ForwardIcon size={14} /></button>
          </div>
        </section>
      </div>
    </main>
  );
}
