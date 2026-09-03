import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChartNoAxesCombined,
  Eye,
  Languages,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import MenuStudioHeader from "../components/MenuStudioHeader";
import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { loadMenuAnalyticsSummary } from "../features/menu-engine/analytics/menuAnalytics";
import { readStudioLanguage, studioLanguageDirection, writeStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import "./MenuAnalyticsStudioV2.css";

const COPY = {
  en: {
    title: "Guest attention",
    hint: "See what guests actually reach while browsing your menu — no ordering or cart required.",
    active: "Live analytics",
    activeNote: "Browsing signals from the rolling 30-day window.",
    emptyStatus: "Analytics is active",
    emptyNote: "Tracking is ready. Browsing patterns will appear after guests visit your published menu.",
    loading: "Loading analytics",
    loadingNote: "Reading the latest browsing activity for this menu.",
    error: "Analytics could not load",
    errorNote: "Tracking is connected, but the latest summary could not be loaded.",
    last30: "Last 30 days",
    metrics: ["Menu views", "Guest sessions", "Categories / visit", "Items seen / visit"],
    metricHints: ["Published-menu visits", "Distinct browsing sessions", "Average categories reached", "Average unique items visible"],
    trafficTitle: "Menu traffic",
    trafficHint: "Daily visits to the published menu",
    categoryTitle: "Category reach",
    categoryHint: "Share of guest sessions that reached each category",
    itemTitle: "Item visibility",
    itemHint: "Items that actually appeared on guests’ screens",
    languageTitle: "Menu language",
    languageHint: "Language used during tracked browsing sessions",
    insightsTitle: "BEYOND insights",
    insightsHint: "Data-backed observations about visibility and exploration",
    exploreTitle: "Menu exploration",
    exploreHint: "How broadly guests move through the menu",
    multiCategory: "Visits reaching 2+ categories",
    totalCategoryViews: "Category views",
    totalItemViews: "Item exposures",
    empty: "No activity data yet",
    emptyHint: "New visits to the published menu will start filling this graph.",
    sessions: "sessions",
    seenBy: "seen by",
    ofSessions: "of sessions",
    trust: "BEYOND measures visibility, navigation and attention signals — not purchases or sales.",
    unknownLanguage: "Not detected",
  },
  he: {
    title: "תשומת לב האורחים",
    hint: "ראו למה האורחים באמת מגיעים בזמן גלישה בתפריט — ללא צורך בהזמנה או סל קניות.",
    active: "אנליטיקה חיה",
    activeNote: "אותות גלישה בחלון מתגלגל של 30 יום.",
    emptyStatus: "האנליטיקה פעילה",
    emptyNote: "המעקב מוכן. דפוסי גלישה יופיעו לאחר שאורחים יבקרו בתפריט שפורסם.",
    loading: "טוען נתוני אנליטיקה",
    loadingNote: "קורא את פעילות הגלישה העדכנית של התפריט.",
    error: "לא ניתן לטעון את האנליטיקה",
    errorNote: "המעקב מחובר, אך לא ניתן לטעון כרגע את הסיכום העדכני.",
    last30: "30 הימים האחרונים",
    metrics: ["צפיות בתפריט", "סשנים של אורחים", "קטגוריות לביקור", "פריטים שנצפו לביקור"],
    metricHints: ["כניסות לתפריט שפורסם", "סשני גלישה נפרדים", "ממוצע קטגוריות שאליהן הגיעו", "ממוצע פריטים ייחודיים שהופיעו"],
    trafficTitle: "תנועת התפריט",
    trafficHint: "כניסות יומיות לתפריט שפורסם",
    categoryTitle: "חשיפה לקטגוריות",
    categoryHint: "אחוז מסשני האורחים שהגיעו לכל קטגוריה",
    itemTitle: "נראות פריטים",
    itemHint: "פריטים שבאמת הופיעו על מסכי האורחים",
    languageTitle: "שפת התפריט",
    languageHint: "השפה שבה נעשה שימוש במהלך הגלישה שנמדדה",
    insightsTitle: "תובנות BEYOND",
    insightsHint: "תובנות מבוססות נתונים על נראות וחקירת התפריט",
    exploreTitle: "חקירת התפריט",
    exploreHint: "עד כמה האורחים עוברים בין חלקי התפריט",
    multiCategory: "ביקורים שהגיעו ל-2+ קטגוריות",
    totalCategoryViews: "צפיות בקטגוריות",
    totalItemViews: "חשיפות לפריטים",
    empty: "עדיין אין נתוני פעילות",
    emptyHint: "ביקורים חדשים בתפריט שפורסם יתחילו למלא את הגרף.",
    sessions: "סשנים",
    seenBy: "נצפה אצל",
    ofSessions: "מהסשנים",
    trust: "BEYOND מודד נראות, ניווט ואותות תשומת לב — לא רכישות או מכירות.",
    unknownLanguage: "לא זוהה",
  },
  ar: {
    title: "انتباه الضيوف",
    hint: "اعرف ما يصل إليه الضيوف فعليًا أثناء تصفح القائمة — من دون طلبات أو سلة شراء.",
    active: "تحليلات مباشرة",
    activeNote: "إشارات التصفح ضمن نافذة متحركة لآخر 30 يومًا.",
    emptyStatus: "التحليلات مفعّلة",
    emptyNote: "التتبّع جاهز. ستظهر أنماط التصفح بعد زيارة الضيوف للقائمة المنشورة.",
    loading: "جارٍ تحميل التحليلات",
    loadingNote: "جارٍ قراءة أحدث نشاط تصفح لهذه القائمة.",
    error: "تعذر تحميل التحليلات",
    errorNote: "التتبّع متصل، لكن تعذر تحميل الملخص الحالي.",
    last30: "آخر 30 يومًا",
    metrics: ["مشاهدات القائمة", "جلسات الضيوف", "الفئات لكل زيارة", "الأصناف المرئية لكل زيارة"],
    metricHints: ["زيارات القائمة المنشورة", "جلسات تصفح منفصلة", "متوسط الفئات التي تم الوصول إليها", "متوسط الأصناف الفريدة الظاهرة"],
    trafficTitle: "حركة القائمة",
    trafficHint: "الزيارات اليومية للقائمة المنشورة",
    categoryTitle: "وصول الفئات",
    categoryHint: "نسبة جلسات الضيوف التي وصلت إلى كل فئة",
    itemTitle: "ظهور الأصناف",
    itemHint: "الأصناف التي ظهرت فعليًا على شاشات الضيوف",
    languageTitle: "لغة القائمة",
    languageHint: "اللغة المستخدمة أثناء جلسات التصفح المتتبعة",
    insightsTitle: "رؤى BEYOND",
    insightsHint: "ملاحظات مبنية على البيانات حول الظهور والاستكشاف",
    exploreTitle: "استكشاف القائمة",
    exploreHint: "مدى تنقل الضيوف بين أجزاء القائمة",
    multiCategory: "زيارات وصلت إلى فئتين أو أكثر",
    totalCategoryViews: "مشاهدات الفئات",
    totalItemViews: "مرات ظهور الأصناف",
    empty: "لا توجد بيانات نشاط بعد",
    emptyHint: "ستبدأ الزيارات الجديدة للقائمة المنشورة بملء هذا الرسم.",
    sessions: "جلسات",
    seenBy: "ظهر لدى",
    ofSessions: "من الجلسات",
    trust: "يقيس BEYOND الظهور والتنقل وإشارات الانتباه — وليس المشتريات أو المبيعات.",
    unknownLanguage: "غير محدد",
  },
};

const INSIGHT_COPY = {
  en: {
    early: (count, remaining) => ({
      title: "Building a reliable signal",
      body: `${count} guest ${count === 1 ? "session is" : "sessions are"} tracked. About ${remaining} more will make attention patterns more meaningful.`,
    }),
    category: (name, reach) => ({ title: "Highest category reach", body: `${name} was reached in ${reach}% of tracked guest sessions.` }),
    exploration: (average, share) => ({ title: "Guests explore beyond one section", body: `Guests reach ${average} categories per visit on average, and ${share}% reach at least two.` }),
    focused: (average) => ({ title: "Browsing is focused", body: `Guests currently reach ${average} categories per visit on average. Keeping the first category clear and useful matters.` }),
    item: (name, exposure) => ({ title: "Strong item visibility", body: `${name} appeared on screen in ${exposure}% of tracked guest sessions.` }),
    gap: (name, exposure) => ({ title: "Visibility opportunity", body: `${name} reached ${exposure}% of tracked sessions. If it is important, consider a higher position or a more-reached category.` }),
    trendUp: (change) => ({ title: "Traffic is rising", body: `Menu visits are up ${change}% versus the previous 7 days.` }),
    trendDown: (change) => ({ title: "Traffic eased this week", body: `Menu visits are down ${change}% versus the previous 7 days. This measures visits, not sales.` }),
  },
  he: {
    early: (count, remaining) => ({ title: "בונים אות אמין", body: `נמדדו ${count} סשנים של אורחים. עוד כ-${remaining} סשנים יהפכו את דפוסי תשומת הלב למשמעותיים יותר.` }),
    category: (name, reach) => ({ title: "החשיפה הגבוהה ביותר לקטגוריה", body: `${name} הופיעה ב-${reach}% מסשני האורחים שנמדדו.` }),
    exploration: (average, share) => ({ title: "האורחים חוקרים מעבר לחלק אחד", body: `האורחים מגיעים בממוצע ל-${average} קטגוריות בביקור, ו-${share}% מגיעים לפחות לשתיים.` }),
    focused: (average) => ({ title: "הגלישה ממוקדת", body: `האורחים מגיעים כרגע בממוצע ל-${average} קטגוריות בביקור. לכן לקטגוריה הראשונה יש חשיבות גבוהה.` }),
    item: (name, exposure) => ({ title: "נראות גבוהה לפריט", body: `${name} הופיע על המסך ב-${exposure}% מסשני האורחים שנמדדו.` }),
    gap: (name, exposure) => ({ title: "הזדמנות לשיפור נראות", body: `${name} הגיע ל-${exposure}% מהסשנים שנמדדו. אם הוא חשוב, אפשר לשקול מיקום גבוה יותר או קטגוריה עם חשיפה גבוהה יותר.` }),
    trendUp: (change) => ({ title: "התנועה עולה", body: `הכניסות לתפריט עלו ב-${change}% לעומת 7 הימים הקודמים.` }),
    trendDown: (change) => ({ title: "התנועה נחלשה השבוע", body: `הכניסות לתפריט ירדו ב-${change}% לעומת 7 הימים הקודמים. המדד מתייחס לכניסות, לא למכירות.` }),
  },
  ar: {
    early: (count, remaining) => ({ title: "نبني إشارة موثوقة", body: `تم تتبع ${count} جلسة للضيوف. نحو ${remaining} جلسة إضافية ستجعل أنماط الانتباه أكثر دلالة.` }),
    category: (name, reach) => ({ title: "أعلى وصول لفئة", body: `تم الوصول إلى ${name} في ${reach}% من جلسات الضيوف المتتبعة.` }),
    exploration: (average, share) => ({ title: "الضيوف يستكشفون أكثر من قسم", body: `يصل الضيوف إلى ${average} فئات في الزيارة بالمتوسط، و${share}% يصلون إلى فئتين على الأقل.` }),
    focused: (average) => ({ title: "التصفح مركز", body: `يصل الضيوف حاليًا إلى ${average} فئات في الزيارة بالمتوسط، لذلك وضوح الفئة الأولى مهم.` }),
    item: (name, exposure) => ({ title: "ظهور قوي لصنف", body: `ظهر ${name} على الشاشة في ${exposure}% من جلسات الضيوف المتتبعة.` }),
    gap: (name, exposure) => ({ title: "فرصة لتحسين الظهور", body: `وصل ${name} إلى ${exposure}% من الجلسات المتتبعة. إذا كان مهمًا، فكر في وضعه أعلى أو ضمن فئة أكثر وصولًا.` }),
    trendUp: (change) => ({ title: "الحركة ترتفع", body: `ارتفعت زيارات القائمة ${change}% مقارنة بالأيام السبعة السابقة.` }),
    trendDown: (change) => ({ title: "الحركة تراجعت هذا الأسبوع", body: `انخفضت زيارات القائمة ${change}% مقارنة بالأيام السبعة السابقة. هذا يقيس الزيارات وليس المبيعات.` }),
  },
};

const LOCALES = { en: "en-US", he: "he-IL", ar: "ar" };
const LANGUAGE_NAMES = {
  en: { en: "English", he: "Hebrew", ar: "Arabic" },
  he: { en: "אנגלית", he: "עברית", ar: "ערבית" },
  ar: { en: "الإنجليزية", he: "العبرية", ar: "العربية" },
};

function localizedName(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] || value?.en || value?.he || value?.ar || "—";
}

function formatNumber(value, language, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(LOCALES[language] || LOCALES.en, { maximumFractionDigits }).format(Number(value) || 0);
}

function formatDate(value, language) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(LOCALES[language] || LOCALES.en, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function EmptySection({ t }) {
  return <div className="menu-analytics-empty"><ChartNoAxesCombined size={26} aria-hidden="true" /><h3>{t.empty}</h3><p>{t.emptyHint}</p></div>;
}

function MenuViewsChart({ rows, language, t }) {
  const data = Array.isArray(rows) ? rows.map((row) => ({ ...row, views: Number(row.views) || 0 })) : [];
  const hasViews = data.some((row) => row.views > 0);
  if (!data.length || !hasViews) return <EmptySection t={t} />;

  const width = 760;
  const height = 260;
  const left = 34;
  const right = 18;
  const top = 22;
  const bottom = 42;
  const baseline = height - bottom;
  const plotHeight = baseline - top;
  const maxValue = Math.max(1, ...data.map((row) => row.views));
  const points = data.map((row, index) => {
    const x = left + (data.length === 1 ? 0 : index / (data.length - 1)) * (width - left - right);
    const y = baseline - (row.views / maxValue) * plotHeight;
    return { ...row, x, y };
  });
  const linePath = points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${baseline} L ${points[0].x.toFixed(2)} ${baseline} Z`;
  const labelIndexes = [...new Set([0, Math.floor((data.length - 1) / 3), Math.floor(((data.length - 1) * 2) / 3), data.length - 1])];

  return <div className="menu-analytics-line-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t.trafficTitle}>
      <defs>
        <linearGradient id="menuAnalyticsAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="menu-analytics-gradient-start" />
          <stop offset="100%" className="menu-analytics-gradient-end" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((ratio) => {
        const y = top + ratio * plotHeight;
        return <line key={ratio} className="menu-analytics-grid-line" x1={left} x2={width - right} y1={y} y2={y} />;
      })}
      <text className="menu-analytics-axis-value" x={left} y={top - 7}>{formatNumber(maxValue, language)}</text>
      <text className="menu-analytics-axis-value" x={left} y={baseline - 7}>0</text>
      <path className="menu-analytics-area" d={areaPath} />
      <path className="menu-analytics-line" d={linePath} />
      {points.filter((point) => point.views > 0).map((point) => <circle key={point.date} className="menu-analytics-point" cx={point.x} cy={point.y} r="4" />)}
      {labelIndexes.map((index) => <text key={index} className="menu-analytics-axis-date" x={points[index].x} y={height - 12} textAnchor="middle">{formatDate(points[index].date, language)}</text>)}
    </svg>
  </div>;
}

function ReachBars({ rows, nameFor, valueKey, language, t, type }) {
  if (!rows.length) return <EmptySection t={t} />;
  return <div className="menu-analytics-bars">
    {rows.slice(0, 8).map((row) => {
      const value = Math.max(0, Math.min(100, Number(row[valueKey]) || 0));
      return <div className="menu-analytics-bar-row" key={row.id}>
        <div className="menu-analytics-bar-meta">
          <strong title={nameFor(row.id)}>{nameFor(row.id)}</strong>
          <span>{formatNumber(value, language, 1)}% · {formatNumber(row.unique_sessions, language)} {t.sessions}</span>
        </div>
        <div className="menu-analytics-bar-track" aria-label={`${nameFor(row.id)} ${value}%`}>
          <span className={`menu-analytics-bar-fill is-${type}`} style={{ width: `${value}%` }} />
        </div>
      </div>;
    })}
  </div>;
}

function LanguageBars({ rows, language, t }) {
  const usable = rows.filter((row) => Number(row.sessions) > 0);
  if (!usable.length) return <EmptySection t={t} />;
  return <div className="menu-analytics-language-list">
    {usable.map((row) => {
      const code = String(row.language || "unknown");
      const label = LANGUAGE_NAMES[language]?.[code] || (code === "unknown" ? t.unknownLanguage : code.toUpperCase());
      const share = Number(row.share_percent) || 0;
      return <div key={code}>
        <div><strong>{label}</strong><span>{formatNumber(share, language, 1)}%</span></div>
        <div className="menu-analytics-language-track"><span style={{ width: `${Math.max(0, Math.min(100, share))}%` }} /></div>
      </div>;
    })}
  </div>;
}

function buildInsights({ summary, language, groupMap, itemMap }) {
  const c = INSIGHT_COPY[language] || INSIGHT_COPY.en;
  const sessions = Number(summary.unique_sessions) || 0;
  const categoryRows = Array.isArray(summary.category_performance) ? summary.category_performance : [];
  const itemRows = Array.isArray(summary.item_visibility) ? summary.item_visibility : [];
  const dailyRows = Array.isArray(summary.daily_views) ? summary.daily_views : [];
  const insights = [];

  if (sessions < 10) {
    insights.push(c.early(sessions, Math.max(0, 10 - sessions)));
  }

  if (categoryRows[0]) {
    const name = localizedName(groupMap.get(String(categoryRows[0].id))?.name, language);
    insights.push(c.category(name, formatNumber(categoryRows[0].reach_percent, language, 1)));
  }

  if (sessions >= 10) {
    const average = formatNumber(summary.avg_categories_per_session, language, 1);
    const share = formatNumber(summary.multi_category_sessions_percent, language, 1);
    insights.push(Number(summary.avg_categories_per_session) >= 1.8 ? c.exploration(average, share) : c.focused(average));
  }

  if (sessions >= 10 && itemRows[0]) {
    const item = itemMap.get(String(itemRows[0].id));
    insights.push(c.item(localizedName(item?.name, language), formatNumber(itemRows[0].exposure_percent, language, 1)));
  }

  if (sessions >= 20 && itemRows.length >= 4) {
    const lower = itemRows[itemRows.length - 1];
    const item = itemMap.get(String(lower.id));
    if (Number(lower.exposure_percent) < 35) insights.push(c.gap(localizedName(item?.name, language), formatNumber(lower.exposure_percent, language, 1)));
  }

  if (sessions >= 20 && dailyRows.length >= 14) {
    const last14 = dailyRows.slice(-14);
    const previous = last14.slice(0, 7).reduce((sum, row) => sum + (Number(row.views) || 0), 0);
    const current = last14.slice(7).reduce((sum, row) => sum + (Number(row.views) || 0), 0);
    if (previous > 0) {
      const change = Math.round(((current - previous) / previous) * 100);
      if (change >= 15) insights.push(c.trendUp(change));
      if (change <= -15) insights.push(c.trendDown(Math.abs(change)));
    }
  }

  return insights.slice(0, 4);
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

    async function refresh({ showLoading = false } = {}) {
      if (showLoading) setAnalytics((current) => ({ status: "loading", summary: current.summary, error: "" }));

      try {
        const summary = await loadMenuAnalyticsSummary(projectId, 30);
        if (!active) return;
        const hasActivity = Number(summary?.menu_views || 0)
          + Number(summary?.category_views || 0)
          + Number(summary?.item_impressions || 0) > 0;
        setAnalytics({ status: hasActivity ? "ready" : "empty", summary, error: "" });
      } catch (error) {
        if (!active) return;
        const message = error?.message || "Analytics unavailable";
        setAnalytics((current) => current.summary
          ? { ...current, error: message }
          : { status: "error", summary: null, error: message });
      }
    }

    void refresh({ showLoading: true });

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [projectId]);

  const summary = analytics.summary || {};
  const groupMap = useMemo(() => new Map((draft?.menu?.groups || []).map((group) => [String(group.id), group])), [draft]);
  const itemMap = useMemo(() => new Map((draft?.menu?.items || []).map((item) => [String(item.id), item])), [draft]);
  const categoryRows = Array.isArray(summary.category_performance) ? summary.category_performance : [];
  const itemRows = Array.isArray(summary.item_visibility) ? summary.item_visibility : [];
  const languageRows = Array.isArray(summary.language_mix) ? summary.language_mix : [];
  const dailyRows = Array.isArray(summary.daily_views) ? summary.daily_views : [];
  const uniqueGuests = Number(summary.unique_sessions) || 0;
  const insights = useMemo(() => buildInsights({ summary, language, groupMap, itemMap }), [summary, language, groupMap, itemMap]);
  const metricValues = [
    summary.menu_views,
    uniqueGuests,
    summary.avg_categories_per_session,
    summary.avg_items_seen_per_session,
  ];

  let statusTitle = t.active;
  let statusNote = t.activeNote;
  if (analytics.status === "loading") { statusTitle = t.loading; statusNote = t.loadingNote; }
  if (analytics.status === "empty") { statusTitle = t.emptyStatus; statusNote = t.emptyNote; }
  if (analytics.status === "error") { statusTitle = t.error; statusNote = t.errorNote; }

  function changeLanguage(value) { setLanguage(value); writeStudioLanguage(value); }
  const groupName = (id) => localizedName(groupMap.get(String(id))?.name, language);
  const itemName = (id) => localizedName(itemMap.get(String(id))?.name, language);

  return <main className="menu-content-v2 menu-analytics-v2" dir={studioLanguageDirection(language)} lang={language}>
    <MenuStudioHeader stage="analytics" language={language} onLanguageChange={changeLanguage} menuName={draft?.menu?.restaurant_name} />
    <div className="menu-analytics-body">
      <section className="menu-analytics-hero">
        <div className="menu-analytics-intro">
          <span className="menu-analytics-icon"><BarChart3 size={22} aria-hidden="true" /></span>
          <div><h1>{t.title}</h1><p>{t.hint}</p></div>
        </div>
        <div className="menu-analytics-window"><span className="menu-analytics-live-dot" />{t.last30}</div>
      </section>

      <section className={`menu-analytics-status is-${analytics.status}`} role="status">
        <div><strong>{statusTitle}</strong><p>{statusNote}</p></div>
        <span>{t.last30}</span>
      </section>

      <div className="menu-analytics-metrics">
        {t.metrics.map((label, index) => <article key={label}>
          <span className="menu-analytics-metric-kicker">{index === 0 ? <Eye size={16} /> : index === 1 ? <Users size={16} /> : <Layers size={16} />}</span>
          <h2>{label}</h2>
          <strong>{analytics.status === "loading" && !analytics.summary ? "…" : formatNumber(metricValues[index], language, index > 1 ? 1 : 0)}</strong>
          <span>{t.metricHints[index]}</span>
        </article>)}
      </div>

      <section className="menu-analytics-panel menu-analytics-traffic-panel">
        <div className="menu-analytics-panel-heading">
          <div><h2>{t.trafficTitle}</h2><p>{t.trafficHint}</p></div>
          <span>{formatNumber(summary.menu_views, language)} · {t.last30}</span>
        </div>
        <MenuViewsChart rows={dailyRows} language={language} t={t} />
      </section>

      <div className="menu-analytics-two-column">
        <section className="menu-analytics-panel">
          <div className="menu-analytics-panel-heading"><div><h2>{t.categoryTitle}</h2><p>{t.categoryHint}</p></div></div>
          <ReachBars rows={categoryRows} nameFor={groupName} valueKey="reach_percent" language={language} t={t} type="category" />
        </section>
        <section className="menu-analytics-panel">
          <div className="menu-analytics-panel-heading"><div><h2>{t.itemTitle}</h2><p>{t.itemHint}</p></div></div>
          <ReachBars rows={itemRows} nameFor={itemName} valueKey="exposure_percent" language={language} t={t} type="item" />
        </section>
      </div>

      <div className="menu-analytics-lower-grid">
        <section className="menu-analytics-panel menu-analytics-insights-panel">
          <div className="menu-analytics-panel-heading">
            <div><h2><Sparkles size={17} aria-hidden="true" />{t.insightsTitle}</h2><p>{t.insightsHint}</p></div>
          </div>
          <div className="menu-analytics-insights">
            {insights.length ? insights.map((insight, index) => <article key={`${insight.title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{insight.title}</strong><p>{insight.body}</p></div>
            </article>) : <EmptySection t={t} />}
          </div>
        </section>

        <div className="menu-analytics-side-stack">
          <section className="menu-analytics-panel">
            <div className="menu-analytics-panel-heading"><div><h2><Languages size={17} aria-hidden="true" />{t.languageTitle}</h2><p>{t.languageHint}</p></div></div>
            <LanguageBars rows={languageRows} language={language} t={t} />
          </section>
          <section className="menu-analytics-panel">
            <div className="menu-analytics-panel-heading"><div><h2>{t.exploreTitle}</h2><p>{t.exploreHint}</p></div></div>
            <div className="menu-analytics-exploration">
              <div><span>{t.multiCategory}</span><strong>{formatNumber(summary.multi_category_sessions_percent, language, 1)}%</strong></div>
              <div><span>{t.totalCategoryViews}</span><strong>{formatNumber(summary.category_views, language)}</strong></div>
              <div><span>{t.totalItemViews}</span><strong>{formatNumber(summary.item_impressions, language)}</strong></div>
            </div>
          </section>
        </div>
      </div>

      <p className="menu-analytics-trust-note"><Eye size={14} aria-hidden="true" />{t.trust}</p>
    </div>
  </main>;
}
