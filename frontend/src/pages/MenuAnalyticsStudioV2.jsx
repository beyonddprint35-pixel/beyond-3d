import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChartNoAxesCombined, Eye, MousePointerClick, Users } from "lucide-react";
import MenuStudioHeader from "../components/MenuStudioHeader";
import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { loadMenuAnalyticsSummary } from "../features/menu-engine/analytics/menuAnalytics";
import { readStudioLanguage, studioLanguageDirection, writeStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import "./MenuAnalyticsStudioV2.css";

const COPY = {
  en: {
    title: "Menu performance", hint: "Understand how guests explore your published menu.",
    active: "Analytics is active", activeNote: "Live customer activity from the last 30 days.",
    emptyStatus: "Analytics is active", emptyNote: "Tracking is ready. Customer activity will appear here after guests visit your published menu.",
    loading: "Loading analytics", loadingNote: "Reading the latest activity for this menu.",
    error: "Analytics could not load", errorNote: "The tracking service is connected, but the latest summary could not be loaded.",
    metrics: ["Menu views", "Category views", "Item impressions", "Item opens"],
    metricHints: ["Published menu visits", "Category selections", "Items seen on screen", "Item taps"],
    sections: ["Popular categories", "Popular items", "Guest engagement"],
    empty: "No activity data yet", emptyHint: "New visits to the published menu will start filling this section.",
    uniqueGuests: "Unique guest sessions", interactions: "Interactions per guest", last30: "Last 30 days",
    views: "views", opens: "opens", impressions: "impressions",
  },
  he: {
    title: "ביצועי התפריט", hint: "גלו כיצד אורחים משתמשים בתפריט שפורסם.",
    active: "האנליטיקה פעילה", activeNote: "פעילות לקוחות חיה מ-30 הימים האחרונים.",
    emptyStatus: "האנליטיקה פעילה", emptyNote: "המעקב מוכן. פעילות תופיע כאן לאחר שאורחים יבקרו בתפריט שפורסם.",
    loading: "טוען נתוני אנליטיקה", loadingNote: "קורא את הפעילות העדכנית של התפריט.",
    error: "לא ניתן לטעון את האנליטיקה", errorNote: "המעקב מחובר, אך לא ניתן לטעון כרגע את הסיכום העדכני.",
    metrics: ["צפיות בתפריט", "צפיות בקטגוריות", "חשיפות לפריטים", "פתיחות פריטים"],
    metricHints: ["כניסות לתפריט שפורסם", "בחירות קטגוריה", "פריטים שהופיעו במסך", "לחיצות על פריטים"],
    sections: ["קטגוריות פופולריות", "פריטים פופולריים", "מעורבות אורחים"],
    empty: "עדיין אין נתוני פעילות", emptyHint: "ביקורים חדשים בתפריט שפורסם יתחילו למלא את האזור הזה.",
    uniqueGuests: "סשנים ייחודיים של אורחים", interactions: "אינטראקציות לאורח", last30: "30 הימים האחרונים",
    views: "צפיות", opens: "פתיחות", impressions: "חשיפות",
  },
  ar: {
    title: "أداء القائمة", hint: "تعرّف على كيفية استخدام الضيوف للقائمة المنشورة.",
    active: "التحليلات مفعّلة", activeNote: "نشاط العملاء المباشر خلال آخر 30 يومًا.",
    emptyStatus: "التحليلات مفعّلة", emptyNote: "التتبّع جاهز. ستظهر البيانات هنا بعد زيارة الضيوف للقائمة المنشورة.",
    loading: "جارٍ تحميل التحليلات", loadingNote: "جارٍ قراءة أحدث نشاط لهذه القائمة.",
    error: "تعذر تحميل التحليلات", errorNote: "خدمة التتبّع متصلة، لكن تعذر تحميل الملخص الحالي.",
    metrics: ["مشاهدات القائمة", "مشاهدات الفئات", "ظهور الأصناف", "فتح الأصناف"],
    metricHints: ["زيارات القائمة المنشورة", "اختيارات الفئات", "الأصناف التي ظهرت على الشاشة", "النقر على الأصناف"],
    sections: ["الفئات الشائعة", "الأصناف الشائعة", "تفاعل الضيوف"],
    empty: "لا توجد بيانات نشاط بعد", emptyHint: "ستبدأ الزيارات الجديدة للقائمة المنشورة بملء هذا القسم.",
    uniqueGuests: "جلسات ضيوف فريدة", interactions: "التفاعلات لكل ضيف", last30: "آخر 30 يومًا",
    views: "مشاهدات", opens: "فتح", impressions: "ظهور",
  },
};

function localizedName(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] || value?.en || value?.he || value?.ar || "—";
}

function number(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function EmptySection({ t }) {
  return <div className="menu-analytics-empty"><ChartNoAxesCombined size={26} aria-hidden="true" /><h3>{t.empty}</h3><p>{t.emptyHint}</p></div>;
}

export default function MenuAnalyticsStudioV2() {
  const draft = useMemo(readMenuStudioV2Draft, []);
  const projectId = useMemo(() => menuStudioProjectId(draft), [draft]);
  const [language, setLanguage] = useState(() => readStudioLanguage("en"));
  const [analytics, setAnalytics] = useState({ status: "loading", summary: null, error: "" });
  const t = COPY[language] || COPY.en;

  useEffect(() => {
    let active = true;
    if (!projectId) {
      setAnalytics({ status: "empty", summary: null, error: "" });
      return () => { active = false; };
    }
    setAnalytics({ status: "loading", summary: null, error: "" });
    loadMenuAnalyticsSummary(projectId, 30)
      .then((summary) => {
        if (!active) return;
        const hasActivity = Number(summary?.menu_views || 0)
          + Number(summary?.category_views || 0)
          + Number(summary?.item_impressions || 0)
          + Number(summary?.item_opens || 0) > 0;
        setAnalytics({ status: hasActivity ? "ready" : "empty", summary, error: "" });
      })
      .catch((error) => active && setAnalytics({ status: "error", summary: null, error: error?.message || "Analytics unavailable" }));
    return () => { active = false; };
  }, [projectId]);

  const summary = analytics.summary || {};
  const metricValues = [summary.menu_views, summary.category_views, summary.item_impressions, summary.item_opens];
  const groupMap = useMemo(() => new Map((draft?.menu?.groups || []).map((group) => [String(group.id), group])), [draft]);
  const itemMap = useMemo(() => new Map((draft?.menu?.items || []).map((item) => [String(item.id), item])), [draft]);
  const topCategories = Array.isArray(summary.top_categories) ? summary.top_categories : [];
  const topItems = Array.isArray(summary.top_items) ? summary.top_items : [];
  const interactions = Number(summary.category_views || 0) + Number(summary.item_opens || 0);
  const uniqueGuests = Number(summary.unique_sessions || 0);
  const interactionsPerGuest = uniqueGuests ? (interactions / uniqueGuests).toFixed(1) : "0.0";

  let statusTitle = t.active;
  let statusNote = t.activeNote;
  if (analytics.status === "loading") { statusTitle = t.loading; statusNote = t.loadingNote; }
  if (analytics.status === "empty") { statusTitle = t.emptyStatus; statusNote = t.emptyNote; }
  if (analytics.status === "error") { statusTitle = t.error; statusNote = t.errorNote; }

  function changeLanguage(value) { setLanguage(value); writeStudioLanguage(value); }

  return <main className="menu-content-v2 menu-analytics-v2" dir={studioLanguageDirection(language)} lang={language}>
    <MenuStudioHeader stage="analytics" language={language} onLanguageChange={changeLanguage} menuName={draft?.menu?.restaurant_name} />
    <div className="menu-analytics-body">
      <section className="menu-analytics-intro">
        <BarChart3 size={24} aria-hidden="true" />
        <h1>{t.title}</h1><p>{t.hint}</p>
      </section>
      <section className={`menu-analytics-status is-${analytics.status}`} role="status"><strong>{statusTitle}</strong><p>{statusNote}</p></section>
      <div className="menu-analytics-metrics">
        {t.metrics.map((label, index) => <article key={label}><h2>{label}</h2><strong>{analytics.status === "loading" ? "…" : number(metricValues[index])}</strong><span>{t.metricHints[index]}</span></article>)}
      </div>
      <div className="menu-analytics-sections">
        <section>
          <h2>{t.sections[0]}</h2>
          {topCategories.length ? <ol className="menu-analytics-ranking">{topCategories.map((row) => {
            const group = groupMap.get(String(row.id));
            return <li key={row.id}><span>{localizedName(group?.name, language)}</span><strong>{number(row.views)} {t.views}</strong></li>;
          })}</ol> : <EmptySection t={t} />}
        </section>
        <section>
          <h2>{t.sections[1]}</h2>
          {topItems.length ? <ol className="menu-analytics-ranking">{topItems.map((row) => {
            const item = itemMap.get(String(row.id));
            return <li key={row.id}><span>{localizedName(item?.name, language)}</span><strong>{number(row.opens)} {t.opens} · {number(row.impressions)} {t.impressions}</strong></li>;
          })}</ol> : <EmptySection t={t} />}
        </section>
        <section>
          <h2>{t.sections[2]}</h2>
          {uniqueGuests || analytics.status === "ready" ? <div className="menu-analytics-engagement">
            <div><Users size={22} aria-hidden="true" /><span>{t.uniqueGuests}</span><strong>{number(uniqueGuests)}</strong></div>
            <div><MousePointerClick size={22} aria-hidden="true" /><span>{t.interactions}</span><strong>{interactionsPerGuest}</strong></div>
            <small><Eye size={14} aria-hidden="true" />{t.last30}</small>
          </div> : <EmptySection t={t} />}
        </section>
      </div>
    </div>
  </main>;
}
