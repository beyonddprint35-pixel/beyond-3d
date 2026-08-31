import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clipboard,
  ExternalLink,
  FileClock,
  Globe2,
  LayoutTemplate,
  LoaderCircle,
  PencilLine,
  Power,
  QrCode,
  Radio,
  Rocket,
  Smartphone,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import {
  draftFromMenuStudioProject,
  loadMenuStudioProject,
} from "../features/menu-engine/studio/menuStudioV2Persistence";
import {
  listMenuStudioPublicationVersions,
  menuStudioHasUnpublishedChanges,
  readMenuStudioPublishState,
  unpublishMenuStudioProject,
} from "../features/menu-engine/studio/menuStudioV2PublishService";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuManageV2.css";

const UI = {
  en: {
    back:"My Menus", language:"Language", loading:"Loading menu management…", unavailable:"This menu could not be loaded.",
    eyebrow:"MENU MANAGEMENT", live:"Live", pending:"Changes pending", draft:"Draft", offline:"Offline",
    liveHint:"Guests are seeing the latest published version.", pendingHint:"Your draft has changes that guests cannot see yet.", draftHint:"This menu has not been published yet.", offlineHint:"The menu is offline. Your draft and publication history are still saved.",
    updated:"Draft updated", published:"Published", version:"Version", publicAddress:"Public menu address", stableUrl:"Permanent QR & NFC destination",
    stableHint:"Use this URL in QR codes and NFC tags. Publishing a new version keeps the same destination as long as you keep the same menu address.",
    copy:"Copy link", copied:"Copied", openLive:"Open live menu", edit:"Edit content", design:"Edit design", preview:"Preview draft", publishMenu:"Publish menu", reviewPublish:"Review & publish changes", publishSettings:"Publish settings",
    history:"Publish history", historyHint:"Every launch is stored as an immutable snapshot.", current:"Current", noHistory:"No published versions yet.",
    safety:"Live version safety", safetyHint:"Editing the draft never changes the guest menu. Only Publish can move the live version forward.",
    unpublish:"Unpublish menu", unpublishHint:"Take the public menu offline while keeping the draft and every published version.", confirmUnpublish:"Take this menu offline? Your editable draft and complete publish history will be kept.", unpublished:"Menu taken offline.", failed:"Could not update this menu.",
    qrNfc:"QR & NFC", destination:"Destination", lastPublished:"Last published", items:"visible items", categories:"categories",
  },
  he: {
    back:"התפריטים שלי", language:"שפה", loading:"טוען ניהול תפריט…", unavailable:"לא ניתן לטעון את התפריט.",
    eyebrow:"ניהול תפריט", live:"חי", pending:"שינויים ממתינים", draft:"טיוטה", offline:"לא באוויר",
    liveHint:"האורחים רואים את הגרסה האחרונה שפורסמה.", pendingHint:"בטיוטה יש שינויים שהאורחים עדיין לא רואים.", draftHint:"התפריט עדיין לא פורסם.", offlineHint:"התפריט לא באוויר. הטיוטה והיסטוריית הפרסום נשמרו.",
    updated:"הטיוטה עודכנה", published:"פורסם", version:"גרסה", publicAddress:"כתובת התפריט הציבורית", stableUrl:"יעד קבוע ל-QR ול-NFC",
    stableHint:"השתמשו בכתובת הזו בקודי QR ובתגי NFC. פרסום גרסה חדשה שומר על אותו יעד כל עוד כתובת התפריט נשארת זהה.",
    copy:"העתקת קישור", copied:"הועתק", openLive:"פתיחת התפריט החי", edit:"עריכת תוכן", design:"עריכת עיצוב", preview:"תצוגת טיוטה", publishMenu:"פרסום תפריט", reviewPublish:"בדיקה ופרסום שינויים", publishSettings:"הגדרות פרסום",
    history:"היסטוריית פרסום", historyHint:"כל פרסום נשמר כצילום מצב בלתי משתנה.", current:"נוכחית", noHistory:"עדיין אין גרסאות שפורסמו.",
    safety:"בטיחות הגרסה החיה", safetyHint:"עריכת הטיוטה לעולם אינה משנה את התפריט של האורחים. רק פעולת פרסום מקדמת את הגרסה החיה.",
    unpublish:"הורדת התפריט מהאוויר", unpublishHint:"הורידו את התפריט הציבורי מהאוויר בלי למחוק את הטיוטה או את היסטוריית הגרסאות.", confirmUnpublish:"להוריד את התפריט מהאוויר? הטיוטה וכל היסטוריית הפרסום יישמרו.", unpublished:"התפריט הורד מהאוויר.", failed:"לא ניתן לעדכן את התפריט.",
    qrNfc:"QR ו-NFC", destination:"יעד", lastPublished:"פורסם לאחרונה", items:"פריטים גלויים", categories:"קטגוריות",
  },
  ar: {
    back:"قوائمي", language:"اللغة", loading:"جارٍ تحميل إدارة القائمة…", unavailable:"تعذر تحميل هذه القائمة.",
    eyebrow:"إدارة القائمة", live:"مباشرة", pending:"تغييرات معلقة", draft:"مسودة", offline:"غير منشورة",
    liveHint:"الضيوف يشاهدون أحدث نسخة منشورة.", pendingHint:"تحتوي المسودة على تغييرات لا يراها الضيوف بعد.", draftHint:"لم يتم نشر هذه القائمة بعد.", offlineHint:"القائمة غير منشورة. المسودة وسجل النشر ما زالا محفوظين.",
    updated:"تم تحديث المسودة", published:"تم النشر", version:"نسخة", publicAddress:"عنوان القائمة العام", stableUrl:"وجهة ثابتة لـ QR وNFC",
    stableHint:"استخدموا هذا الرابط في رموز QR ووسوم NFC. نشر نسخة جديدة يحافظ على نفس الوجهة ما دام عنوان القائمة نفسه.",
    copy:"نسخ الرابط", copied:"تم النسخ", openLive:"فتح القائمة المباشرة", edit:"تحرير المحتوى", design:"تحرير التصميم", preview:"معاينة المسودة", publishMenu:"نشر القائمة", reviewPublish:"مراجعة ونشر التغييرات", publishSettings:"إعدادات النشر",
    history:"سجل النشر", historyHint:"كل عملية نشر تُحفظ كلقطة ثابتة غير قابلة للتغيير.", current:"الحالية", noHistory:"لا توجد نسخ منشورة بعد.",
    safety:"أمان النسخة المباشرة", safetyHint:"تحرير المسودة لا يغيّر قائمة الضيوف أبداً. النشر فقط ينقل النسخة المباشرة إلى الأمام.",
    unpublish:"إلغاء نشر القائمة", unpublishHint:"أوقفوا القائمة العامة مع الاحتفاظ بالمسودة وكل سجل النسخ المنشورة.", confirmUnpublish:"إلغاء نشر هذه القائمة؟ ستبقى المسودة وكل محفوظات النشر محفوظة.", unpublished:"تم إيقاف القائمة.", failed:"تعذر تحديث هذه القائمة.",
    qrNfc:"QR وNFC", destination:"الوجهة", lastPublished:"آخر نشر", items:"عناصر ظاهرة", categories:"فئات",
  },
};

function formatDate(value, language) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(language === "he" ? "he-IL" : language === "ar" ? "ar" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function localLivePath(slug) {
  return import.meta.env.DEV ? `/dev/menu-public-v3/${slug}` : `/menu/${slug}`;
}

export default function MenuManageV2() {
  const { projectId = "" } = useParams();
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage("en"));
  const [project, setProject] = useState(null);
  const [publishState, setPublishState] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;

  async function refresh() {
    setLoading(true);
    try {
      const [nextProject, nextPublishState, nextVersions] = await Promise.all([
        loadMenuStudioProject(projectId),
        readMenuStudioPublishState(projectId),
        listMenuStudioPublicationVersions(projectId),
      ]);
      setProject(nextProject);
      setPublishState(nextPublishState);
      setVersions(nextVersions);
    } catch (error) {
      console.warn("Could not load menu management.", error);
      setNotice(error?.message || t.unavailable);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [projectId]);

  const currentVersion = useMemo(() => versions.find((version) => version.id === publishState?.published_version_id) || null, [versions, publishState?.published_version_id]);
  const live = Boolean(publishState?.published_version_id && publishState?.published_slug);
  const hasHistory = versions.length > 0;
  const pending = live && menuStudioHasUnpublishedChanges({ ...project, ...publishState }, currentVersion);
  const stateKey = pending ? "pending" : live ? "live" : hasHistory ? "offline" : "draft";
  const stateHint = stateKey === "pending" ? t.pendingHint : stateKey === "live" ? t.liveHint : stateKey === "offline" ? t.offlineHint : t.draftHint;
  const stateLabel = stateKey === "pending" ? t.pending : stateKey === "live" ? t.live : stateKey === "offline" ? t.offline : t.draft;
  const menu = project?.studio_state?.menu || {};
  const visibleItems = Array.isArray(menu.items) ? menu.items.filter((item) => item.visible !== false).length : 0;
  const visibleGroups = Array.isArray(menu.groups) ? menu.groups.filter((group) => group.visible !== false).length : 0;
  const liveSlug = publishState?.published_slug || "";
  const publicUrl = liveSlug ? `https://www.b3yondworld.com/menu/${liveSlug}` : "";

  function changeLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  async function copyLiveUrl() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice(publicUrl);
    }
  }

  async function unpublish() {
    if (!live || busy || !window.confirm(t.confirmUnpublish)) return;
    setBusy(true);
    setNotice("");
    try {
      await unpublishMenuStudioProject(projectId);
      setNotice(t.unpublished);
      await refresh();
    } catch (error) {
      setNotice(error?.message || t.failed);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="menu-manage-v2 centered" dir={rtl ? "rtl" : "ltr"}><LoaderCircle className="spin" size={24} /><strong>{t.loading}</strong></main>;
  }

  if (!project) {
    return <main className="menu-manage-v2 centered" dir={rtl ? "rtl" : "ltr"}><CircleAlert size={25} /><strong>{t.unavailable}</strong><button type="button" onClick={() => window.location.assign("/my-menus")}>{t.back}</button></main>;
  }

  return (
    <main className="menu-manage-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-manage-v2-topbar">
        <button type="button" className="menu-manage-v2-brand" onClick={() => window.location.assign("/my-menus")}>
          <img src={beyondLogo} alt="" />
          <span><strong>BEYOND</strong><small>Menu Studio</small></span>
        </button>
        <div className="menu-manage-v2-top-actions">
          <StudioLanguageMenu value={uiLanguage} onChange={changeLanguage} label={t.language} compact />
        </div>
      </header>

      <div className="menu-manage-v2-shell">
        <button type="button" className="menu-manage-v2-back" onClick={() => window.location.assign("/my-menus")}><BackIcon size={15} /> {t.back}</button>

        <section className="menu-manage-v2-hero">
          <div>
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{project.name}</h1>
            <p>{stateHint}</p>
          </div>
          <div className={`menu-manage-v2-status ${stateKey}`}>
            {stateKey === "live" ? <Radio size={17} /> : stateKey === "pending" ? <CircleAlert size={17} /> : <FileClock size={17} />}
            <span><strong>{stateLabel}</strong><small>{currentVersion ? `${t.version} ${currentVersion.version_number}` : t.draft}</small></span>
          </div>
        </section>

        <section className="menu-manage-v2-summary">
          <div><Smartphone size={17} /><span><strong>{visibleItems}</strong><small>{t.items}</small></span></div>
          <div><LayoutTemplate size={17} /><span><strong>{visibleGroups}</strong><small>{t.categories}</small></span></div>
          <div><PencilLine size={17} /><span><strong>{formatDate(project.updated_at, uiLanguage)}</strong><small>{t.updated}</small></span></div>
          <div><Rocket size={17} /><span><strong>{formatDate(publishState?.published_at || versions[0]?.published_at, uiLanguage)}</strong><small>{t.lastPublished}</small></span></div>
        </section>

        <div className="menu-manage-v2-grid">
          <section className="menu-manage-v2-main">
            <article className="menu-manage-v2-card actions-card">
              <header><span>WORKSPACE</span><h2>{pending ? t.reviewPublish : live ? t.publishSettings : t.publishMenu}</h2></header>
              <div className="menu-manage-v2-workspace-actions">
                <button type="button" className="primary" onClick={() => window.location.assign(`/dev/menu-content-v2?project=${projectId}`)}><PencilLine size={15} /> {t.edit}</button>
                <button type="button" onClick={() => window.location.assign(`/dev/menu-design-v2?project=${projectId}`)}><LayoutTemplate size={15} /> {t.design}</button>
                <button type="button" onClick={() => window.location.assign(`/dev/menu-preview-v2?project=${projectId}`)}><Smartphone size={15} /> {t.preview}</button>
                <button type="button" className={pending ? "attention" : ""} onClick={() => window.location.assign(`/dev/menu-publish-v2?project=${projectId}`)}><Rocket size={15} /> {pending ? t.reviewPublish : t.publishSettings}</button>
              </div>
              <div className="menu-manage-v2-safety"><Check size={15} /><span><strong>{t.safety}</strong><small>{t.safetyHint}</small></span></div>
            </article>

            <article className="menu-manage-v2-card history-card">
              <header><span>{t.history}</span><h2>{versions.length ? `${versions.length} ${versions.length === 1 ? t.version : t.history}` : t.noHistory}</h2><p>{t.historyHint}</p></header>
              {versions.length ? <div className="menu-manage-v2-history">
                {versions.map((version) => {
                  const isCurrent = version.id === publishState?.published_version_id;
                  return <div key={version.id} className={isCurrent ? "current" : ""}>
                    <span className="version-number">V{version.version_number}</span>
                    <span className="history-copy"><strong>/menu/{version.slug}</strong><small>{formatDate(version.published_at, uiLanguage)}</small></span>
                    {isCurrent ? <em>{t.current}</em> : null}
                  </div>;
                })}
              </div> : <div className="menu-manage-v2-empty-history"><FileClock size={20} /><span>{t.noHistory}</span></div>}
            </article>
          </section>

          <aside className="menu-manage-v2-side">
            <article className="menu-manage-v2-card live-card">
              <header><Globe2 size={18} /><div><span>{t.publicAddress}</span><h2>{live ? `/menu/${liveSlug}` : t.offline}</h2></div></header>
              {live ? <>
                <div className="menu-manage-v2-public-url">{publicUrl}</div>
                <div className="menu-manage-v2-live-actions">
                  <button type="button" onClick={copyLiveUrl}><Clipboard size={14} /> {copied ? t.copied : t.copy}</button>
                  <button type="button" className="primary" onClick={() => window.location.assign(localLivePath(liveSlug))}><ExternalLink size={14} /> {t.openLive}</button>
                </div>
              </> : <p>{stateHint}</p>}
            </article>

            <article className="menu-manage-v2-card destination-card">
              <header><QrCode size={19} /><div><span>{t.qrNfc}</span><h2>{t.stableUrl}</h2></div></header>
              <p>{t.stableHint}</p>
              <div className="menu-manage-v2-destination-row"><span>{t.destination}</span><strong>{publicUrl || "—"}</strong></div>
              {live ? <button type="button" onClick={copyLiveUrl}><Clipboard size={14} /> {copied ? t.copied : t.copy}</button> : null}
            </article>

            {live ? <article className="menu-manage-v2-card danger-card">
              <header><Power size={18} /><div><span>{t.unpublish}</span><p>{t.unpublishHint}</p></div></header>
              <button type="button" disabled={busy} onClick={unpublish}>{busy ? <LoaderCircle className="spin" size={14} /> : <Power size={14} />} {t.unpublish}</button>
            </article> : null}
          </aside>
        </div>
      </div>

      {notice ? <div className="menu-manage-v2-notice" role="status">{notice}</div> : null}
    </main>
  );
}
