import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  Copy,
  ExternalLink,
  FileText,
  LoaderCircle,
  Plus,
  Power,
  Smartphone,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import { supabase } from "../lib/supabaseClient";
import {
  archiveMenuStudioProject,
  duplicateMenuStudioProject,
  listMenuStudioProjects,
} from "../features/menu-engine/studio/menuStudioV2Persistence";
import { unpublishMenuStudioProject } from "../features/menu-engine/studio/menuStudioV2PublishService";
import {
  readStudioLanguage,
  studioLanguageDirection,
  studioLanguageMeta,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import { PREMIUM_MENU_DESIGNS } from "../features/menu-engine/domain/menuDesignLibrary";
import "./MenuMyMenusV2.css";

const UI = {
  en: {
    eyebrow:"MY MENUS", title:"Every menu, one workspace", hint:"Resume editing, preview, duplicate or manage the live version of every persistent menu.",
    create:"Create new menu", interfaceLanguage:"Language", loading:"Loading your menus…", signIn:"Sign in to see your menus", signInHint:"Persistent menus are private to your BEYOND account.", home:"Return home",
    empty:"No saved menus yet", emptyHint:"Create your first menu and BEYOND will keep it synced to your account automatically.",
    draft:"Draft", live:"Live", resume:"Continue editing", preview:"Draft preview", viewLive:"Open live", duplicate:"Duplicate", archive:"Archive", unpublish:"Unpublish", confirmArchive:"Archive this menu? Its currently published version will stay live until you unpublish it.", confirmUnpublish:"Take this menu offline? Your draft and publication history will be kept.",
    items:"items", categories:"categories", languages:"languages", updated:"Updated", design:"Design", duplicated:"Menu duplicated", unpublished:"Menu taken offline", failed:"Could not update this menu.", liveAddress:"Live address",
  },
  he: {
    eyebrow:"התפריטים שלי", title:"כל התפריטים במקום אחד", hint:"המשיכו לערוך, צפו בטיוטה, שכפלו או נהלו את הגרסה החיה של כל תפריט שנשמר בחשבון.",
    create:"יצירת תפריט חדש", interfaceLanguage:"שפה", loading:"טוען את התפריטים…", signIn:"התחברו כדי לראות את התפריטים", signInHint:"התפריטים השמורים פרטיים לחשבון BEYOND שלכם.", home:"חזרה לבית",
    empty:"עדיין אין תפריטים שמורים", emptyHint:"צרו את התפריט הראשון ו-BEYOND ישמור אותו אוטומטית בחשבון.",
    draft:"טיוטה", live:"חי", resume:"המשך עריכה", preview:"תצוגת טיוטה", viewLive:"פתיחת החי", duplicate:"שכפול", archive:"ארכיון", unpublish:"הורדה מהאוויר", confirmArchive:"להעביר את התפריט לארכיון? הגרסה שפורסמה תישאר חיה עד שתורידו אותה מהאוויר.", confirmUnpublish:"להוריד את התפריט מהאוויר? הטיוטה והיסטוריית הפרסום יישמרו.",
    items:"פריטים", categories:"קטגוריות", languages:"שפות", updated:"עודכן", design:"עיצוב", duplicated:"התפריט שוכפל", unpublished:"התפריט הורד מהאוויר", failed:"לא ניתן לעדכן את התפריט.", liveAddress:"כתובת חיה",
  },
  ar: {
    eyebrow:"قوائمي", title:"كل القوائم في مساحة واحدة", hint:"تابعوا التحرير أو معاينة المسودة أو النسخ أو إدارة النسخة المباشرة لكل قائمة محفوظة.",
    create:"إنشاء قائمة جديدة", interfaceLanguage:"اللغة", loading:"جارٍ تحميل القوائم…", signIn:"سجلوا الدخول لرؤية قوائمكم", signInHint:"القوائم المحفوظة خاصة بحساب BEYOND الخاص بكم.", home:"العودة للرئيسية",
    empty:"لا توجد قوائم محفوظة بعد", emptyHint:"أنشئوا أول قائمة وسيحفظها BEYOND تلقائياً في حسابكم.",
    draft:"مسودة", live:"مباشرة", resume:"متابعة التحرير", preview:"معاينة المسودة", viewLive:"فتح المباشرة", duplicate:"نسخ", archive:"أرشفة", unpublish:"إلغاء النشر", confirmArchive:"أرشفة هذه القائمة؟ ستبقى النسخة المنشورة مباشرة حتى تقوموا بإلغاء نشرها.", confirmUnpublish:"إيقاف هذه القائمة؟ ستبقى المسودة وسجل النسخ المنشورة محفوظين.",
    items:"عناصر", categories:"فئات", languages:"لغات", updated:"تم التحديث", design:"التصميم", duplicated:"تم نسخ القائمة", unpublished:"تم إيقاف القائمة", failed:"تعذر تحديث هذه القائمة.", liveAddress:"العنوان المباشر",
  },
};

function formatDate(value, language) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(language === "he" ? "he-IL" : language === "ar" ? "ar" : "en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function projectMetrics(project) {
  const menu = project?.studio_state?.menu || {};
  return {
    items: Array.isArray(menu.items) ? menu.items.filter((item) => item.visible !== false).length : 0,
    categories: Array.isArray(menu.groups) ? menu.groups.filter((group) => group.visible !== false).length : 0,
    languages: Array.isArray(menu.languages) && menu.languages.length ? menu.languages : [menu.default_language || "en"],
    designId: project?.studio_state?.designId || "",
  };
}

export default function MenuMyMenusV2() {
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage("en"));
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data?.session || null);
      setAuthReady(true);
    }).catch(() => active && setAuthReady(true));
    return () => { active = false; };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listMenuStudioProjects();
      if (!rows.length) {
        setProjects([]);
        return;
      }
      const { data: publicationRows, error: publicationError } = await supabase
        .from("menu_projects")
        .select("id,published_slug,published_version_id,published_at")
        .in("id", rows.map((project) => project.id));
      if (publicationError) throw publicationError;
      const publicationMap = new Map((publicationRows || []).map((row) => [row.id, row]));
      setProjects(rows.map((project) => ({ ...project, ...(publicationMap.get(project.id) || {}) })));
    } catch (error) {
      console.warn("Could not load persistent menus.", error);
      setNotice(t.failed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) refresh();
    else if (authReady) setLoading(false);
  }, [session, authReady]);

  function changeLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  async function duplicate(project) {
    setBusyId(project.id);
    setNotice("");
    try {
      await duplicateMenuStudioProject(project);
      setNotice(t.duplicated);
      await refresh();
    } catch (error) {
      console.warn("Could not duplicate menu.", error);
      setNotice(error?.message || t.failed);
    } finally {
      setBusyId("");
    }
  }

  async function archive(project) {
    if (!window.confirm(t.confirmArchive)) return;
    setBusyId(project.id);
    setNotice("");
    try {
      await archiveMenuStudioProject(project.id);
      await refresh();
    } catch (error) {
      console.warn("Could not archive menu.", error);
      setNotice(error?.message || t.failed);
    } finally {
      setBusyId("");
    }
  }

  async function unpublish(project) {
    if (!window.confirm(t.confirmUnpublish)) return;
    setBusyId(project.id);
    setNotice("");
    try {
      await unpublishMenuStudioProject(project.id);
      setNotice(t.unpublished);
      await refresh();
    } catch (error) {
      console.warn("Could not unpublish menu.", error);
      setNotice(error?.message || t.failed);
    } finally {
      setBusyId("");
    }
  }

  const renderedProjects = useMemo(() => projects.map((project) => ({ project, metrics: projectMetrics(project) })), [projects]);

  return <main className="menu-my-menus-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
    <header className="menu-my-menus-v2-topbar">
      <button type="button" className="menu-my-menus-v2-brand" onClick={() => window.location.assign("/")}>
        <img src={beyondLogo} alt="" />
        <span><strong>BEYOND</strong><small>Menu Studio</small></span>
      </button>
      <div className="menu-my-menus-v2-actions">
        <StudioLanguageMenu value={uiLanguage} onChange={changeLanguage} label={t.interfaceLanguage} compact />
        <button type="button" className="primary" onClick={() => window.location.assign(`/dev/menu-create-v2?ui=${uiLanguage}`)}><Plus size={15} /> {t.create}</button>
      </div>
    </header>

    <section className="menu-my-menus-v2-hero">
      <div><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.hint}</p></div>
    </section>

    {!authReady || loading ? <section className="menu-my-menus-v2-state"><LoaderCircle className="spin" size={22} /><strong>{t.loading}</strong></section> : null}

    {authReady && !session ? <section className="menu-my-menus-v2-state card"><FileText size={25} /><h2>{t.signIn}</h2><p>{t.signInHint}</p><button type="button" onClick={() => window.location.assign("/")}>{t.home}</button></section> : null}

    {session && !loading && !renderedProjects.length ? <section className="menu-my-menus-v2-state card"><FileText size={25} /><h2>{t.empty}</h2><p>{t.emptyHint}</p><button type="button" className="primary" onClick={() => window.location.assign(`/dev/menu-create-v2?ui=${uiLanguage}`)}><Plus size={14} /> {t.create}</button></section> : null}

    {session && !loading && renderedProjects.length ? <section className="menu-my-menus-v2-grid">
      {renderedProjects.map(({ project, metrics }) => {
        const designEntry = PREMIUM_MENU_DESIGNS.find((entry) => entry.id === metrics.designId);
        const live = Boolean(project.published_version_id || project.activated_site_id || project.status === "activated");
        const busy = busyId === project.id;
        return <article key={project.id} className="menu-my-menus-v2-card">
          <div className="menu-my-menus-v2-card-top">
            <span className={`status ${live ? "live" : "draft"}`}>{live ? t.live : t.draft}</span>
            <small>{t.updated} {formatDate(project.updated_at, uiLanguage)}</small>
          </div>
          <div className="menu-my-menus-v2-card-title"><span className="icon"><Smartphone size={18} /></span><div><h2>{project.name}</h2><p>{designEntry?.name || t.design}</p></div></div>
          {project.published_slug ? <div className="menu-my-menus-v2-live-path"><span>{t.liveAddress}</span><strong>/menu/{project.published_slug}</strong></div> : null}
          <div className="menu-my-menus-v2-metrics">
            <span><strong>{metrics.categories}</strong><small>{t.categories}</small></span>
            <span><strong>{metrics.items}</strong><small>{t.items}</small></span>
            <span><strong>{metrics.languages.length}</strong><small>{t.languages}</small></span>
          </div>
          <div className="menu-my-menus-v2-language-row">{metrics.languages.map((code) => <span key={code}>{studioLanguageMeta(code).short}</span>)}</div>
          <div className="menu-my-menus-v2-card-actions">
            <button type="button" className="resume" disabled={busy} onClick={() => window.location.assign(`/dev/menu-content-v2?project=${project.id}`)}>{t.resume} <ArrowRight size={14} /></button>
            <button type="button" disabled={busy} onClick={() => window.location.assign(`/dev/menu-preview-v2?project=${project.id}`)}>{t.preview}</button>
            {project.published_slug ? <button type="button" className="view-live" disabled={busy} onClick={() => window.location.assign(`/dev/menu-public-v3/${project.published_slug}`)}><ExternalLink size={13} /> {t.viewLive}</button> : null}
            <button type="button" disabled={busy} onClick={() => duplicate(project)}><Copy size={13} /> {t.duplicate}</button>
            {project.published_version_id ? <button type="button" className="unpublish" disabled={busy} onClick={() => unpublish(project)}><Power size={13} /> {t.unpublish}</button> : null}
            <button type="button" disabled={busy} onClick={() => archive(project)}><Archive size={13} /> {t.archive}</button>
          </div>
        </article>;
      })}
    </section> : null}

    {notice ? <div className="menu-my-menus-v2-notice" role="status">{notice}</div> : null}
  </main>;
}
