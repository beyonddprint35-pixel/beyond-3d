import { useStudioDraftFlush } from "../features/menu-engine/studio/useStudioDraftSave";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Globe2,
  Link2,
  QrCode,
  Rocket,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import StudioLanguageMenu from "../components/StudioLanguageMenu";
import MenuStudioHeader from "../components/MenuStudioHeader";
import { supabase } from "../lib/supabaseClient";
import { flushStudioDraft } from "../features/menu-engine/studio/studioNavigation";
import { buildMenuStudioReadiness } from "../features/menu-engine/studio/menuStudioV2Readiness";
import { publishMenuStudioDraft } from "../features/menu-engine/studio/menuStudioV2PublishService";
import { deleteMenuStudioProject, menuStudioProjectId, queueMenuStudioProjectSave } from "../features/menu-engine/studio/menuStudioV2Persistence";
import {
  clearMenuStudioV2Draft,
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
  STUDIO_LANGUAGES,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuPublishStudioV2.css";

const UI = {
  en: {
    workspace:"Menu workspace", interfaceLanguage:"Interface language", content:"Content", design:"Design", preview:"Preview", publish:"Publish",
    backPreview:"Back to Preview", eyebrow:"PUBLISH", title:"Everything ready for your guests", hint:"Choose the public address, customer languages and final launch settings for this menu.",
    address:"Public menu address", addressHint:"This will be the URL used by your QR and NFC touchpoints.", slug:"Menu address", defaultLanguage:"Default customer language",
    customerLanguages:"Customer menu languages", customerLanguagesHint:"Choose which languages guests can switch between on the live menu.", launch:"Launch readiness", contentReady:"Menu content", designReady:"Design", addressReady:"Public address", languageReady:"Languages", translationsReady:"Language content",
    ready:"Ready", needsAttention:"Needs attention", visibleItems:"visible items", categories:"categories", selectedDesign:"Selected design", validAddress:"Valid menu URL", chooseLanguage:"At least one customer language", completeTranslations:"All enabled languages complete",
    qr:"QR & NFC", qrHint:"After publishing, this address becomes the source for your QR code and NFC stands.", qrLive:"Live menu QR", qrScan:"Scan to open the published menu.", secure:"Publishing safety", secureHint:"Draft changes remain private until you explicitly publish a new live version.",
    saveSetup:"Save publish setup", saved:"Publish setup saved", safePublish:"Safe live publishing", safePublishHint:"Publishing creates a locked live version. Future Studio edits stay private until you publish again.", publishLive:"Publish live", publishing:"Publishing…", publishAgain:"Publish new version",
    publicUrl:"Public URL", openPreview:"Open Preview", openLive:"Open live menu", allReady:"Your menu passes the Studio readiness checks.", notReady:"Complete the highlighted items before publishing.",
    published:"Menu is live", publishedHint:"Guests are seeing the locked version below.", version:"Version", publishError:"Could not publish this menu.",
    deleteMenu:"Delete menu", deleteConfirmTitle:"Delete this menu?", deleteConfirmHint:"The Studio menu will be removed and its live link will be taken offline. This cannot be undone in Studio.", cancel:"Cancel", deleteForever:"Delete menu", deleting:"Deleting…", deleteError:"Could not delete this menu.",
  },
  he: {
    workspace:"סביבת עבודת התפריט", interfaceLanguage:"שפת הממשק", content:"תוכן", design:"עיצוב", preview:"תצוגה מקדימה", publish:"פרסום",
    backPreview:"חזרה לתצוגה", eyebrow:"פרסום", title:"הכול מוכן לאורחים שלכם", hint:"בחרו כתובת ציבורית, שפות לקוח והגדרות השקה סופיות לתפריט.",
    address:"כתובת התפריט הציבורית", addressHint:"זו תהיה הכתובת של קוד ה-QR ושל נקודות ה-NFC.", slug:"כתובת התפריט", defaultLanguage:"שפת ברירת המחדל ללקוח",
    customerLanguages:"שפות תפריט ללקוחות", customerLanguagesHint:"בחרו בין אילו שפות האורחים יוכלו לעבור בתפריט החי.", launch:"מוכנות להשקה", contentReady:"תוכן התפריט", designReady:"עיצוב", addressReady:"כתובת ציבורית", languageReady:"שפות", translationsReady:"תוכן השפות",
    ready:"מוכן", needsAttention:"דורש תשומת לב", visibleItems:"פריטים גלויים", categories:"קטגוריות", selectedDesign:"עיצוב נבחר", validAddress:"כתובת תפריט תקינה", chooseLanguage:"לפחות שפת לקוח אחת", completeTranslations:"כל השפות הפעילות מלאות",
    qr:"QR ו-NFC", qrHint:"לאחר הפרסום הכתובת הזו תהיה המקור לקוד ה-QR ולעמדות ה-NFC.", qrLive:"QR לתפריט החי", qrScan:"סרקו לפתיחת התפריט שפורסם.", secure:"בטיחות בפרסום", secureHint:"שינויים בטיוטה נשארים פרטיים עד שאתם מפרסמים במפורש גרסה חיה חדשה.",
    saveSetup:"שמירת הגדרות פרסום", saved:"הגדרות הפרסום נשמרו", safePublish:"פרסום חי בטוח", safePublishHint:"הפרסום יוצר גרסה חיה נעולה. שינויים עתידיים ב-Studio נשארים פרטיים עד לפרסום מחדש.", publishLive:"פרסום חי", publishing:"מפרסם…", publishAgain:"פרסום גרסה חדשה",
    publicUrl:"כתובת ציבורית", openPreview:"פתיחת תצוגה", openLive:"פתיחת התפריט החי", allReady:"התפריט עובר את בדיקות המוכנות של Studio.", notReady:"השלימו את הפריטים המסומנים לפני הפרסום.",
    published:"התפריט חי", publishedHint:"האורחים רואים את הגרסה הנעולה שמופיעה למטה.", version:"גרסה", publishError:"לא ניתן לפרסם את התפריט.",
    deleteMenu:"מחיקת תפריט", deleteConfirmTitle:"למחוק את התפריט הזה?", deleteConfirmHint:"התפריט יוסר מ-Studio והקישור החי שלו יירד מהאוויר. לא ניתן לבטל את הפעולה ב-Studio.", cancel:"ביטול", deleteForever:"מחיקת תפריט", deleting:"מוחק…", deleteError:"לא ניתן למחוק את התפריט.",
  },
  ar: {
    workspace:"مساحة عمل القائمة", interfaceLanguage:"لغة الواجهة", content:"المحتوى", design:"التصميم", preview:"المعاينة", publish:"النشر",
    backPreview:"العودة إلى المعاينة", eyebrow:"النشر", title:"كل شيء جاهز لضيوفكم", hint:"اختاروا العنوان العام ولغات الزبائن وإعدادات الإطلاق النهائية لهذه القائمة.",
    address:"عنوان القائمة العام", addressHint:"سيكون هذا الرابط المستخدم في رمز QR ونقاط NFC.", slug:"عنوان القائمة", defaultLanguage:"لغة الزبون الافتراضية",
    customerLanguages:"لغات قائمة الزبائن", customerLanguagesHint:"اختاروا اللغات التي يستطيع الضيوف التبديل بينها في القائمة الحية.", launch:"جاهزية الإطلاق", contentReady:"محتوى القائمة", designReady:"التصميم", addressReady:"العنوان العام", languageReady:"اللغات", translationsReady:"محتوى اللغات",
    ready:"جاهز", needsAttention:"يحتاج انتباهاً", visibleItems:"عناصر ظاهرة", categories:"فئات", selectedDesign:"التصميم المختار", validAddress:"رابط قائمة صالح", chooseLanguage:"لغة زبائن واحدة على الأقل", completeTranslations:"كل اللغات المفعلة مكتملة",
    qr:"QR وNFC", qrHint:"بعد النشر يصبح هذا الرابط المصدر لرمز QR ولمجسمات NFC.", qrLive:"QR للقائمة المباشرة", qrScan:"امسح لفتح القائمة المنشورة.", secure:"أمان النشر", secureHint:"تبقى تعديلات المسودة خاصة حتى تنشروا نسخة مباشرة جديدة بشكل صريح.",
    saveSetup:"حفظ إعدادات النشر", saved:"تم حفظ إعدادات النشر", safePublish:"نشر مباشر آمن", safePublishHint:"ينشئ النشر نسخة مباشرة مقفلة. تبقى تعديلات Studio اللاحقة خاصة حتى تنشروا من جديد.", publishLive:"نشر مباشر", publishing:"جارٍ النشر…", publishAgain:"نشر نسخة جديدة",
    publicUrl:"الرابط العام", openPreview:"فتح المعاينة", openLive:"فتح القائمة المباشرة", allReady:"القائمة تجتاز فحوصات الجاهزية في Studio.", notReady:"أكملوا العناصر المحددة قبل النشر.",
    published:"القائمة مباشرة", publishedHint:"يشاهد الضيوف النسخة المقفلة الموضحة أدناه.", version:"النسخة", publishError:"تعذر نشر هذه القائمة.",
    deleteMenu:"حذف القائمة", deleteConfirmTitle:"حذف هذه القائمة؟", deleteConfirmHint:"ستُزال القائمة من Studio وسيتم إيقاف رابطها المباشر. لا يمكن التراجع عن ذلك داخل Studio.", cancel:"إلغاء", deleteForever:"حذف القائمة", deleting:"جارٍ الحذف…", deleteError:"تعذر حذف هذه القائمة.",
  },
};

function safeSlug(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function defaultSlug(name = "") {
  return safeSlug(name) || "my-menu";
}

function studioRoute(path) {
  flushStudioDraft();
  return `${path}${window.location.search || ""}`;
}

export default function MenuPublishStudioV2() {
  const navigate = useNavigate();
  const storedDraft = useMemo(readMenuStudioV2Draft, []);
  const profile = useMemo(() => storedDraft?.profile || readMenuCreateV2Profile(), [storedDraft]);
  const resolved = useMemo(() => resolveMenuStudioV2Design(storedDraft), [storedDraft]);
  const [menu, setMenu] = useState(() => storedDraft?.menu || createBlankMenuV2());
  const [design] = useState(() => resolved.design);
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage("en"));
  const [slug, setSlug] = useState(() => storedDraft?.publication?.slug || menu.slug || defaultSlug(menu.restaurant_name));
  const [enabledLanguages, setEnabledLanguages] = useState(() => storedDraft?.publication?.languages || menu.languages || ["en", "he", "ar"]);
  const [defaultLanguage, setDefaultLanguage] = useState(() => storedDraft?.publication?.defaultLanguage || menu.default_language || enabledLanguages[0] || "en");
  const [savedState, setSavedState] = useState(false);
  const [deleteState, setDeleteState] = useState({ confirm:false, status:"idle", error:"" });
  const [publishState, setPublishState] = useState(() => {
    const publication = storedDraft?.publication || {};
    if (!publication.publishedVersionId) return { status:"idle", result:null, error:"" };
    return {
      status:"published",
      result:{
        versionId:publication.publishedVersionId,
        versionNumber:publication.publishedVersionNumber,
        publishedAt:publication.publishedAt,
        slug:publication.publishedSlug || publication.slug,
      },
      error:"",
    };
  });

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const projectId = menuStudioProjectId(storedDraft);
  const normalizedSlug = safeSlug(slug);
  const publicUrl = `https://www.b3yondworld.com/menu/${normalizedSlug || "your-menu"}`;
  const readinessMenu = useMemo(() => ({ ...menu, languages: enabledLanguages, default_language: defaultLanguage }), [menu, enabledLanguages, defaultLanguage]);
  const studioReadiness = useMemo(() => buildMenuStudioReadiness({ menu: readinessMenu, design, languages: enabledLanguages }), [readinessMenu, design, enabledLanguages]);

  const checks = [
    { key:"content", label:t.contentReady, ok:studioReadiness.checks.content, detail:`${studioReadiness.visibleGroups} ${t.categories} · ${studioReadiness.visibleItems} ${t.visibleItems}` },
    { key:"design", label:t.designReady, ok:studioReadiness.checks.design, detail:resolved.entry?.name || t.selectedDesign },
    { key:"address", label:t.addressReady, ok:Boolean(normalizedSlug), detail:normalizedSlug ? t.validAddress : t.needsAttention },
    { key:"languages", label:t.languageReady, ok:studioReadiness.checks.languages, detail:enabledLanguages.length ? `${enabledLanguages.length} · ${t.chooseLanguage}` : t.chooseLanguage },
    { key:"translations", label:t.translationsReady, ok:studioReadiness.checks.translations, detail:studioReadiness.checks.translations ? t.completeTranslations : `${studioReadiness.translationBlockers} ${t.needsAttention}` },
  ];
  const ready = checks.every((check) => check.ok);
  const isPublishing = publishState.status === "publishing";
  const isDeleting = deleteState.status === "deleting";
  const publishedResult = publishState.result;
  const liveSlug = publishedResult?.slug || normalizedSlug;
  const livePublicUrl = `https://www.b3yondworld.com/menu/${liveSlug || "your-menu"}`;
  const qrImageUrl = publishedResult && liveSlug
    ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=18&format=svg&data=${encodeURIComponent(livePublicUrl)}`
    : "";

  useEffect(() => {
    if (!enabledLanguages.includes(defaultLanguage) && enabledLanguages.length) setDefaultLanguage(enabledLanguages[0]);
  }, [defaultLanguage, enabledLanguages]);

  useEffect(() => {
    if (!projectId || publishState.status === "publishing") return undefined;
    let active = true;

    async function resolveExistingPublication() {
      try {
        const { data: project, error } = await supabase
          .from("menu_projects")
          .select("published_slug,published_version_id,published_at,studio_state")
          .eq("id", projectId)
          .maybeSingle();
        if (error || !active || !project) return;

        if (project.published_version_id && project.published_slug) {
          let versionNumber = storedDraft?.publication?.publishedVersionNumber || null;
          const { data: version } = await supabase
            .from("menu_publication_versions")
            .select("version_number")
            .eq("id", project.published_version_id)
            .maybeSingle();
          if (version?.version_number != null) versionNumber = version.version_number;
          if (!active) return;
          setPublishState({
            status:"published",
            result:{
              versionId:project.published_version_id,
              versionNumber,
              publishedAt:project.published_at,
              slug:project.published_slug,
            },
            error:"",
          });
          setSlug(project.published_slug);
          return;
        }

        const legacySiteId = project?.studio_state?.profile?.legacySiteId || profile?.legacySiteId || "";
        if (!legacySiteId) return;
        const { data: legacySite, error: legacyError } = await supabase
          .from("menu_sites")
          .select("id,slug,published,updated_at")
          .eq("id", legacySiteId)
          .maybeSingle();
        if (legacyError || !active || !legacySite?.published || !legacySite.slug) return;

        setPublishState({
          status:"published",
          result:{
            versionId:null,
            versionNumber:null,
            publishedAt:legacySite.updated_at,
            slug:legacySite.slug,
            legacy:true,
          },
          error:"",
        });
        setSlug(legacySite.slug);
      } catch (error) {
        console.warn("Could not resolve existing menu publication.", error);
      }
    }

    void resolveExistingPublication();
    return () => { active = false; };
  }, [projectId]);

  function changeUiLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function toggleLanguage(code) {
    setEnabledLanguages((current) => {
      if (current.includes(code)) {
        if (current.length === 1) return current;
        return current.filter((language) => language !== code);
      }
      return [...current, code];
    });
  }

  function buildPublishDraft() {
    const nextMenu = { ...menu, slug: normalizedSlug, languages: enabledLanguages, default_language: defaultLanguage };
    const priorPublication = storedDraft?.publication || {};
    const liveMetadata = publishedResult ? {
      publishedVersionId: publishedResult.versionId,
      publishedVersionNumber: publishedResult.versionNumber,
      publishedAt: publishedResult.publishedAt,
      publishedSlug: publishedResult.slug,
      isLive: true,
    } : {};
    return {
      ...(storedDraft || {}),
      menu: nextMenu,
      design,
      designId: storedDraft?.designId || resolved.designId,
      profile,
      contentLanguage: storedDraft?.contentLanguage || defaultLanguage,
      publication: {
        ...priorPublication,
        ...liveMetadata,
        slug: normalizedSlug,
        languages: enabledLanguages,
        defaultLanguage,
        ready,
        publicUrl,
        savedAt: new Date().toISOString(),
      },
    };
  }

  useStudioDraftFlush(buildPublishDraft());

  function savePublishSetup() {
    const nextDraft = buildPublishDraft();
    setMenu(nextDraft.menu);
    const ok = writeMenuStudioV2Draft(nextDraft);
    setSavedState(ok);
    window.setTimeout(() => setSavedState(false), 2200);
  }

  async function publishLiveMenu() {
    if (!ready || !normalizedSlug || isPublishing) return;
    const nextDraft = buildPublishDraft();
    setMenu(nextDraft.menu);
    writeMenuStudioV2Draft(nextDraft);
    setPublishState({ status:"publishing", result:publishedResult, error:"" });
    try {
      const result = await publishMenuStudioDraft({ draft:nextDraft, slug:normalizedSlug });
      const publishedDraft = {
        ...nextDraft,
        publication: {
          ...nextDraft.publication,
          publishedVersionId: result.versionId,
          publishedVersionNumber: result.versionNumber,
          publishedAt: result.publishedAt,
          publishedSlug: result.slug,
          isLive: true,
        },
      };
      const currentDraft = readMenuStudioV2Draft();
      if (menuStudioProjectId(currentDraft) === menuStudioProjectId(publishedDraft)) {
        writeMenuStudioV2Draft({ ...currentDraft, publication: publishedDraft.publication });
      } else {
        queueMenuStudioProjectSave(publishedDraft);
      }
      setPublishState({ status:"published", result, error:"" });
    } catch (error) {
      setPublishState({ status:"error", result:publishedResult, error:error?.message || t.publishError });
    }
  }

  async function deleteCurrentMenu() {
    if (!projectId || isDeleting || isPublishing) return;
    setDeleteState({ confirm:true, status:"deleting", error:"" });
    try {
      await deleteMenuStudioProject(projectId);
      clearMenuStudioV2Draft();
      navigate("/menu-studio", { replace:true });
    } catch (error) {
      setDeleteState({ confirm:true, status:"error", error:error?.message || t.deleteError });
    }
  }

  function openLiveMenu() {
    if (!liveSlug) return;
    navigate(`/menu/${liveSlug}`);
  }

  return (
    <main className="menu-publish-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <MenuStudioHeader stage="publish" language={uiLanguage} onLanguageChange={changeUiLanguage} menuName={menu.restaurant_name} onBack={() => navigate(studioRoute("/menu-studio/preview"))} backLabel={t.backPreview} />

      <section className="menu-publish-v2-hero">
        <div><span><Rocket size={13} /> {t.eyebrow}</span><h1>{t.title}</h1><p>{t.hint}</p></div>
        <div className={`menu-publish-v2-readiness ${ready ? "ready" : "warning"}`}>
          {ready ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
          <span><strong>{ready ? t.allReady : t.notReady}</strong><small>{checks.filter((check) => check.ok).length} / {checks.length} {t.ready}</small></span>
        </div>
      </section>

      <div className="menu-publish-v2-grid">
        <section className="menu-publish-v2-main">
          <article className="menu-publish-v2-card">
            <header><div className="icon"><Globe2 size={18} /></div><div><span>{t.address}</span><p>{t.addressHint}</p></div></header>
            <label className="menu-publish-v2-slug"><span>{t.slug}</span><div><strong>b3yondworld.com/menu/</strong><input value={slug} onChange={(event) => setSlug(event.target.value)} onBlur={() => setSlug(safeSlug(slug))} placeholder="your-menu" /></div></label>
            <div className="menu-publish-v2-url-preview"><Link2 size={14} /><span><small>{t.publicUrl}</small><strong>{publishedResult ? livePublicUrl : publicUrl}</strong></span></div>
          </article>

          <article className="menu-publish-v2-card">
            <header><div className="icon"><Globe2 size={18} /></div><div><span>{t.customerLanguages}</span><p>{t.customerLanguagesHint}</p></div></header>
            <div className="menu-publish-v2-language-list">
              {STUDIO_LANGUAGES.map((language) => {
                const selected = enabledLanguages.includes(language.code);
                return <button type="button" key={language.code} className={selected ? "active" : ""} onClick={() => toggleLanguage(language.code)}>
                  <span className="check">{selected ? <Check size={13} /> : null}</span>
                  <span className="copy"><strong>{language.nativeLabel}</strong><small>{language.label}</small></span>
                  <b>{language.short}</b>
                </button>;
              })}
            </div>
            <div className="menu-publish-v2-default-language"><span>{t.defaultLanguage}</span><StudioLanguageMenu value={defaultLanguage} onChange={setDefaultLanguage} label={t.defaultLanguage} allowedLanguages={enabledLanguages} /></div>
          </article>

          <article className="menu-publish-v2-card duo">
            <div className={`menu-publish-v2-qr-panel ${publishedResult ? "live" : ""}`}>
              <QrCode size={20} />
              <span><strong>{publishedResult ? t.qrLive : t.qr}</strong><small>{publishedResult ? t.qrScan : t.qrHint}</small></span>
              {publishedResult && qrImageUrl ? <div className="menu-publish-v2-qr-live">
                <img src={qrImageUrl} alt={`${menu.restaurant_name || "Menu"} QR code`} />
                <strong>{livePublicUrl}</strong>
              </div> : null}
            </div>
            <div><ShieldCheck size={20} /><span><strong>{t.secure}</strong><small>{t.secureHint}</small></span></div>
          </article>
        </section>

        <aside className="menu-publish-v2-side">
          <section className="menu-publish-v2-checklist">
            <div className="menu-publish-v2-side-title"><span>{t.launch}</span><strong>{checks.filter((check) => check.ok).length}/{checks.length}</strong></div>
            {checks.map((check) => <div key={check.key} className={check.ok ? "ok" : "bad"}>
              <span className="state">{check.ok ? <Check size={13} /> : <CircleAlert size={13} />}</span>
              <span><strong>{check.label}</strong><small>{check.detail}</small></span>
              <em>{check.ok ? t.ready : t.needsAttention}</em>
            </div>)}
          </section>

          <section className="menu-publish-v2-action-card">
            <div className={`menu-publish-v2-dev-status ${publishedResult ? "success" : ""}`}>
              {publishedResult ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}
              <span>
                <strong>{publishedResult ? `${t.published}${publishedResult.versionNumber ? ` · ${t.version} ${publishedResult.versionNumber}` : ""}` : t.safePublish}</strong>
                <small>{publishedResult ? t.publishedHint : t.safePublishHint}</small>
              </span>
            </div>
            {publishState.error ? <div className="menu-publish-v2-publish-error"><CircleAlert size={14} /> <span>{publishState.error}</span></div> : null}
            <button type="button" className="save" onClick={savePublishSetup} disabled={isPublishing || isDeleting}>{savedState ? <Check size={14} /> : null}{savedState ? t.saved : t.saveSetup}</button>
            <button type="button" className="live" disabled={!ready || !normalizedSlug || isPublishing || isDeleting} onClick={publishLiveMenu}><Rocket size={14} /> {isPublishing ? t.publishing : publishedResult ? t.publishAgain : t.publishLive}</button>
            <button type="button" className="preview-link" disabled={isDeleting} onClick={publishedResult ? openLiveMenu : () => navigate(studioRoute("/menu-studio/preview"))}>{publishedResult ? t.openLive : t.openPreview}</button>

            {projectId ? <div className={`menu-publish-v2-danger ${deleteState.confirm ? "confirming" : ""}`}>
              {deleteState.error ? <div className="menu-publish-v2-delete-error"><CircleAlert size={14} /><span>{deleteState.error}</span></div> : null}
              {!deleteState.confirm ? <button type="button" className="delete-menu" disabled={isPublishing} onClick={() => setDeleteState({ confirm:true, status:"idle", error:"" })}><Trash2 size={14} /> {t.deleteMenu}</button> : <div className="menu-publish-v2-delete-confirm">
                <div><strong>{t.deleteConfirmTitle}</strong><small>{t.deleteConfirmHint}</small></div>
                <div className="menu-publish-v2-delete-actions">
                  <button type="button" className="cancel-delete" disabled={isDeleting} onClick={() => setDeleteState({ confirm:false, status:"idle", error:"" })}>{t.cancel}</button>
                  <button type="button" className="confirm-delete" disabled={isDeleting || isPublishing} onClick={deleteCurrentMenu}><Trash2 size={14} /> {isDeleting ? t.deleting : t.deleteForever}</button>
                </div>
              </div>}
            </div> : null}
          </section>
        </aside>
      </div>
    </main>
  );
}