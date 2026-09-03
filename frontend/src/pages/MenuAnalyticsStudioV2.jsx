import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  Clock,
  Eye,
  Languages,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
    heatmapTitle: "Busiest browsing times",
    heatmapHint: "When guests open the menu, grouped into 3-hour windows in your local time",
    peakTime: "Peak window",
    depthTitle: "How far guests reach",
    depthHint: "Visibility as guests move deeper through a category",
    chooseCategory: "Choose category",
    visibilityTitle: "Visibility leaders & gaps",
    visibilityHint: "High- and low-exposure items inside categories guests actually visited",
    mostSeen: "Most seen",
    leastSeen: "Low visibility",
    comparisonTitle: "Last 7 days vs previous 7",
    comparisonHint: "See whether menu attention is moving up or down",
    currentPeriod: "Last 7 days",
    previousPeriod: "Previous 7",
    comparisonMetrics: ["Menu views", "Guest sessions", "Category views", "Item exposures"],
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
    emptyHint: "New visits to the published menu will start filling this section.",
    sessions: "sessions",
    seenBy: "seen by",
    ofSessions: "of sessions",
    trust: "BEYOND measures visibility, navigation and attention signals — not purchases or sales.",
    unknownLanguage: "Not detected",
    localTime: "Local time",
    dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    depthRange: (start, end) => `Items ${start}–${end}`,
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
    heatmapTitle: "שעות הגלישה העמוסות",
    heatmapHint: "מתי אורחים פותחים את התפריט, בחלונות של 3 שעות לפי הזמן המקומי שלכם",
    peakTime: "חלון שיא",
    depthTitle: "עד כמה האורחים מגיעים",
    depthHint: "נראות הפריטים ככל שמתקדמים עמוק יותר בתוך קטגוריה",
    chooseCategory: "בחירת קטגוריה",
    visibilityTitle: "מובילי נראות והזדמנויות",
    visibilityHint: "פריטים עם חשיפה גבוהה ונמוכה בתוך קטגוריות שהאורחים באמת ביקרו בהן",
    mostSeen: "הכי נצפים",
    leastSeen: "נראות נמוכה",
    comparisonTitle: "7 ימים אחרונים מול 7 קודמים",
    comparisonHint: "ראו אם תשומת הלב לתפריט מתחזקת או נחלשת",
    currentPeriod: "7 ימים אחרונים",
    previousPeriod: "7 ימים קודמים",
    comparisonMetrics: ["צפיות בתפריט", "סשנים של אורחים", "צפיות בקטגוריות", "חשיפות לפריטים"],
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
    emptyHint: "ביקורים חדשים בתפריט שפורסם יתחילו למלא את האזור הזה.",
    sessions: "סשנים",
    seenBy: "נצפה אצל",
    ofSessions: "מהסשנים",
    trust: "BEYOND מודד נראות, ניווט ואותות תשומת לב — לא רכישות או מכירות.",
    unknownLanguage: "לא זוהה",
    localTime: "זמן מקומי",
    dayLabels: ["ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳", "א׳"],
    depthRange: (start, end) => `פריטים ${start}–${end}`,
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
    heatmapTitle: "أوقات التصفح الأكثر نشاطًا",
    heatmapHint: "متى يفتح الضيوف القائمة، ضمن فترات من 3 ساعات حسب توقيتك المحلي",
    peakTime: "وقت الذروة",
    depthTitle: "إلى أي مدى يصل الضيوف",
    depthHint: "ظهور الأصناف كلما تقدم الضيوف داخل الفئة",
    chooseCategory: "اختر الفئة",
    visibilityTitle: "الأكثر ظهورًا وفرص التحسين",
    visibilityHint: "الأصناف ذات الظهور العالي والمنخفض ضمن الفئات التي زارها الضيوف",
    mostSeen: "الأكثر ظهورًا",
    leastSeen: "ظهور منخفض",
    comparisonTitle: "آخر 7 أيام مقابل 7 أيام سابقة",
    comparisonHint: "اعرف ما إذا كان الاهتمام بالقائمة يرتفع أم ينخفض",
    currentPeriod: "آخر 7 أيام",
    previousPeriod: "7 أيام سابقة",
    comparisonMetrics: ["مشاهدات القائمة", "جلسات الضيوف", "مشاهدات الفئات", "مرات ظهور الأصناف"],
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
    emptyHint: "ستبدأ الزيارات الجديدة للقائمة المنشورة بملء هذا القسم.",
    sessions: "جلسات",
    seenBy: "ظهر لدى",
    ofSessions: "من الجلسات",
    trust: "يقيس BEYOND الظهور والتنقل وإشارات الانتباه — وليس المشتريات أو المبيعات.",
    unknownLanguage: "غير محدد",
    localTime: "التوقيت المحلي",
    dayLabels: ["الإث", "الث", "الأر", "الخ", "الج", "الس", "الأح"],
    depthRange: (start, end) => `الأصناف ${start}–${end}`,
  },
};

const INSIGHT_COPY = {
  en: {
    early: (count, remaining) => ({ title: "Building a reliable signal", body: `${count} guest ${count === 1 ? "session is" : "sessions are"} tracked. About ${remaining} more will make attention patterns more meaningful.` }),
    category: (name, reach) => ({ title: "Highest category reach", body: `${name} was reached in ${reach}% of tracked guest sessions.` }),
    exploration: (average, share) => ({ title: "Guests explore beyond one section", body: `Guests reach ${average} categories per visit on average, and ${share}% reach at least two.` }),
    focused: (average) => ({ title: "Browsing is focused", body: `Guests currently reach ${average} categories per visit on average. Keeping the first category clear and useful matters.` }),
    item: (name, exposure) => ({ title: "Strong item visibility", body: `${name} appeared on screen in ${exposure}% of tracked guest sessions.` }),
    gap: (name, exposure) => ({ title: "Visibility opportunity", body: `${name} reached ${exposure}% of tracked sessions. If it is important, consider a higher position or a more-reached category.` }),
    trendUp: (change) => ({ title: "Traffic is rising", body: `Menu visits are up ${change}% versus the previous 7 days.` }),
    trendDown: (change) => ({ title: "Traffic eased this week", body: `Menu visits are down ${change}% versus the previous 7 days. This measures visits, not sales.` }),
    peak: (label, share) => ({ title: "Peak browsing window", body: `${label} is currently the busiest menu-opening window, with ${share}% of tracked visits.` }),
    depth: (name, reach) => ({ title: "Guests miss the lower part of a category", body: `Only ${reach}% of visitors to ${name} reach its later items. Consider moving important items higher.` }),
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
    peak: (label, share) => ({ title: "חלון הגלישה העמוס ביותר", body: `${label} הוא כרגע חלון פתיחת התפריט העמוס ביותר, עם ${share}% מהכניסות שנמדדו.` }),
    depth: (name, reach) => ({ title: "אורחים מפספסים את החלק התחתון", body: `רק ${reach}% מהמבקרים ב-${name} מגיעים לפריטים המאוחרים יותר. כדאי לשקול להעביר פריטים חשובים למעלה.` }),
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
    peak: (label, share) => ({ title: "وقت التصفح الأكثر نشاطًا", body: `${label} هو حاليًا أكثر وقت لفتح القائمة، ويمثل ${share}% من الزيارات المتتبعة.` }),
    depth: (name, reach) => ({ title: "الضيوف لا يصلون إلى أسفل الفئة", body: `فقط ${reach}% من زوار ${name} يصلون إلى الأصناف المتأخرة. فكر في نقل الأصناف المهمة إلى الأعلى.` }),
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

function toLocalHeatmap(rows) {
  const offsetMinutes = typeof Date === "undefined" ? 0 : -new Date().getTimezoneOffset();
  const map = new Map();
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    for (let block = 0; block < 24; block += 3) map.set(`${weekday}-${block}`, { weekday, block, views: 0, sessions: 0 });
  }

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const utcWeekday = Number(row.weekday);
    const utcHour = Number(row.hour);
    if (!Number.isFinite(utcWeekday) || !Number.isFinite(utcHour)) return;
    const totalMinutes = utcHour * 60 + offsetMinutes;
    const dayShift = Math.floor(totalMinutes / 1440);
    const localMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const localHour = Math.floor(localMinutes / 60);
    const localWeekday = (((utcWeekday - 1 + dayShift) % 7) + 7) % 7 + 1;
    const block = Math.floor(localHour / 3) * 3;
    const key = `${localWeekday}-${block}`;
    const current = map.get(key);
    current.views += Number(row.views) || 0;
    current.sessions += Number(row.unique_sessions) || 0;
  });

  return Array.from(map.values());
}

function timeWindowLabel(block) {
  const end = (block + 3) % 24;
  return `${String(block).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00`;
}

function Heatmap({ rows, language, t }) {
  const cells = useMemo(() => toLocalHeatmap(rows), [rows]);
  const maxViews = Math.max(0, ...cells.map((cell) => cell.views));
  if (!maxViews) return <EmptySection t={t} />;

  const peak = cells.reduce((best, cell) => cell.views > best.views ? cell : best, cells[0]);
  const day = t.dayLabels[peak.weekday - 1];
  const total = cells.reduce((sum, cell) => sum + cell.views, 0);
  const peakShare = total ? (peak.views / total) * 100 : 0;

  return <>
    <div className="menu-analytics-peak">
      <span><Clock size={15} aria-hidden="true" /></span>
      <div><small>{t.peakTime}</small><strong>{day} · {timeWindowLabel(peak.block)}</strong></div>
      <b>{formatNumber(peakShare, language, 0)}%</b>
    </div>
    <div className="menu-analytics-heatmap" role="img" aria-label={t.heatmapTitle}>
      <div className="menu-analytics-heatmap-corner">{t.localTime}</div>
      {[0, 3, 6, 9, 12, 15, 18, 21].map((block) => <div key={`hour-${block}`} className="menu-analytics-heatmap-hour">{String(block).padStart(2, "0")}</div>)}
      {t.dayLabels.map((label, index) => {
        const weekday = index + 1;
        return [
          <div key={`day-${weekday}`} className="menu-analytics-heatmap-day">{label}</div>,
          ...[0, 3, 6, 9, 12, 15, 18, 21].map((block) => {
            const cell = cells.find((entry) => entry.weekday === weekday && entry.block === block);
            const ratio = maxViews ? (cell?.views || 0) / maxViews : 0;
            return <div
              key={`${weekday}-${block}`}
              className={`menu-analytics-heatmap-cell${cell?.views ? " has-data" : ""}`}
              style={{ "--heat": `${Math.round(12 + ratio * 78)}%` }}
              title={`${label} ${timeWindowLabel(block)} · ${cell?.views || 0}`}
            ><span>{cell?.views || ""}</span></div>;
          }),
        ];
      })}
    </div>
  </>;
}

function topGroupIdForItem(item, groupMap, topIds) {
  const sectionId = String(item?.section_id || "");
  if (topIds.has(sectionId)) return sectionId;
  let current = groupMap.get(String(item?.group_id || item?.subcategory_id || ""));
  const visited = new Set();
  while (current) {
    const id = String(current.id);
    if (visited.has(id)) return "";
    visited.add(id);
    if (!current.parent_id) return id;
    current = groupMap.get(String(current.parent_id));
  }
  return "";
}

function buildDepthRows({ categoryId, categoryRows, itemRows, items, groups, language, t }) {
  if (!categoryId) return [];
  const category = categoryRows.find((row) => String(row.id) === String(categoryId));
  const categorySessions = Number(category?.unique_sessions) || 0;
  if (!categorySessions) return [];

  const groupMap = new Map(groups.map((group) => [String(group.id), group]));
  const topIds = new Set(groups.filter((group) => !group.parent_id).map((group) => String(group.id)));
  const visibilityMap = new Map(itemRows.map((row) => [String(row.id), Number(row.unique_sessions) || 0]));
  const categoryItems = items
    .filter((item) => item?.visible !== false && topGroupIdForItem(item, groupMap, topIds) === String(categoryId))
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  const individual = categoryItems.map((item, index) => ({
    id: String(item.id),
    label: localizedName(item.name, language),
    start: index + 1,
    end: index + 1,
    reach: Math.min(100, (visibilityMap.get(String(item.id)) || 0) / categorySessions * 100),
  }));

  if (individual.length <= 8) return individual;
  const buckets = [];
  for (let start = 0; start < individual.length; start += 5) {
    const rows = individual.slice(start, start + 5);
    buckets.push({
      id: `${categoryId}-${start}`,
      label: t.depthRange(start + 1, start + rows.length),
      start: start + 1,
      end: start + rows.length,
      reach: rows.reduce((sum, row) => sum + row.reach, 0) / rows.length,
    });
  }
  return buckets;
}

function CategoryDepth({ rows, language, t }) {
  if (!rows.length) return <EmptySection t={t} />;
  return <div className="menu-analytics-depth">
    {rows.map((row, index) => <div className="menu-analytics-depth-row" key={row.id}>
      <div className="menu-analytics-depth-meta">
        <span className="menu-analytics-depth-position">{String(index + 1).padStart(2, "0")}</span>
        <strong title={row.label}>{row.label}</strong>
        <b>{formatNumber(row.reach, language, 0)}%</b>
      </div>
      <div className="menu-analytics-depth-track"><span style={{ width: `${Math.max(0, Math.min(100, row.reach))}%` }} /></div>
    </div>)}
  </div>;
}

function buildVisibilityLists({ categoryRows, itemRows, items, groups }) {
  const groupMap = new Map(groups.map((group) => [String(group.id), group]));
  const topIds = new Set(groups.filter((group) => !group.parent_id).map((group) => String(group.id)));
  const reachedCategories = new Set(categoryRows.filter((row) => Number(row.unique_sessions) > 0).map((row) => String(row.id)));
  const visibilityMap = new Map(itemRows.map((row) => [String(row.id), row]));
  const candidates = items
    .filter((item) => item?.visible !== false && reachedCategories.has(topGroupIdForItem(item, groupMap, topIds)))
    .map((item) => {
      const row = visibilityMap.get(String(item.id));
      return {
        id: String(item.id),
        item,
        exposure: Number(row?.exposure_percent) || 0,
        sessions: Number(row?.unique_sessions) || 0,
      };
    });

  const most = [...candidates].sort((a, b) => b.exposure - a.exposure || b.sessions - a.sessions).slice(0, 4);
  const mostIds = new Set(most.map((row) => row.id));
  let least = [...candidates].filter((row) => !mostIds.has(row.id)).sort((a, b) => a.exposure - b.exposure || a.sessions - b.sessions).slice(0, 4);
  if (!least.length) least = [...candidates].sort((a, b) => a.exposure - b.exposure).slice(0, Math.min(4, candidates.length));
  return { most, least };
}

function VisibilityList({ title, rows, language, emptyLabel }) {
  return <div className="menu-analytics-visibility-list">
    <h3>{title}</h3>
    {rows.length ? rows.map((row, index) => <div key={row.id}>
      <span>{index + 1}</span>
      <strong title={localizedName(row.item?.name, language)}>{localizedName(row.item?.name, language)}</strong>
      <b>{formatNumber(row.exposure, language, 0)}%</b>
    </div>) : <p>{emptyLabel}</p>}
  </div>;
}

function Comparison({ data, language, t }) {
  const current = data?.current_7d || {};
  const previous = data?.previous_7d || {};
  const keys = ["menu_views", "unique_sessions", "category_views", "item_impressions"];
  return <div className="menu-analytics-comparison-grid">
    {keys.map((key, index) => {
      const now = Number(current[key]) || 0;
      const before = Number(previous[key]) || 0;
      const delta = before > 0 ? Math.round(((now - before) / before) * 100) : null;
      const positive = delta !== null && delta > 0;
      const negative = delta !== null && delta < 0;
      return <article key={key}>
        <span>{t.comparisonMetrics[index]}</span>
        <div className="menu-analytics-comparison-value">
          <strong>{formatNumber(now, language)}</strong>
          <em className={positive ? "is-up" : negative ? "is-down" : ""}>
            {positive ? <TrendingUp size={14} /> : negative ? <TrendingDown size={14} /> : null}
            {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}%`}
          </em>
        </div>
        <small>{t.previousPeriod}: {formatNumber(before, language)}</small>
      </article>;
    })}
  </div>;
}

function buildInsights({ summary, language, groupMap, itemMap, heatmapCells, depthRows, depthCategoryName }) {
  const c = INSIGHT_COPY[language] || INSIGHT_COPY.en;
  const sessions = Number(summary.unique_sessions) || 0;
  const categoryRows = Array.isArray(summary.category_performance) ? summary.category_performance : [];
  const itemRows = Array.isArray(summary.item_visibility) ? summary.item_visibility : [];
  const insights = [];

  if (sessions < 10) insights.push(c.early(sessions, Math.max(0, 10 - sessions)));

  if (categoryRows[0]) {
    const name = localizedName(groupMap.get(String(categoryRows[0].id))?.name, language);
    insights.push(c.category(name, formatNumber(categoryRows[0].reach_percent, language, 1)));
  }

  if (sessions >= 10) {
    const average = formatNumber(summary.avg_categories_per_session, language, 1);
    const share = formatNumber(summary.multi_category_sessions_percent, language, 1);
    insights.push(Number(summary.avg_categories_per_session) >= 1.8 ? c.exploration(average, share) : c.focused(average));
  }

  if (sessions >= 8 && heatmapCells.length) {
    const peak = heatmapCells.reduce((best, row) => row.views > best.views ? row : best, heatmapCells[0]);
    const total = heatmapCells.reduce((sum, row) => sum + row.views, 0);
    if (peak.views > 0 && total > 0) {
      const label = `${COPY[language]?.dayLabels?.[peak.weekday - 1] || COPY.en.dayLabels[peak.weekday - 1]} · ${timeWindowLabel(peak.block)}`;
      insights.push(c.peak(label, formatNumber(peak.views / total * 100, language, 0)));
    }
  }

  if (sessions >= 10 && itemRows[0]) {
    const item = itemMap.get(String(itemRows[0].id));
    insights.push(c.item(localizedName(item?.name, language), formatNumber(itemRows[0].exposure_percent, language, 1)));
  }

  if (sessions >= 20 && depthRows.length >= 2) {
    const last = depthRows[depthRows.length - 1];
    if (last.reach < 40) insights.push(c.depth(depthCategoryName, formatNumber(last.reach, language, 0)));
  }

  const comparison = summary.period_comparison;
  const previousViews = Number(comparison?.previous_7d?.menu_views) || 0;
  const currentViews = Number(comparison?.current_7d?.menu_views) || 0;
  if (sessions >= 10 && previousViews > 0) {
    const change = Math.round(((currentViews - previousViews) / previousViews) * 100);
    if (change >= 15) insights.push(c.trendUp(change));
    if (change <= -15) insights.push(c.trendDown(Math.abs(change)));
  }

  if (sessions >= 20 && itemRows.length >= 4) {
    const lower = itemRows[itemRows.length - 1];
    const item = itemMap.get(String(lower.id));
    if (Number(lower.exposure_percent) < 35) insights.push(c.gap(localizedName(item?.name, language), formatNumber(lower.exposure_percent, language, 1)));
  }

  return insights.slice(0, 5);
}

export default function MenuAnalyticsStudioV2() {
  const draft = useMemo(readMenuStudioV2Draft, []);
  const projectId = useMemo(() => menuStudioProjectId(draft), [draft]);
  const [language, setLanguage] = useState(() => readStudioLanguage("en"));
  const [analytics, setAnalytics] = useState({ status: "loading", summary: null, error: "" });
  const [depthCategoryId, setDepthCategoryId] = useState("");
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
  const groups = draft?.menu?.groups || [];
  const items = draft?.menu?.items || [];
  const groupMap = useMemo(() => new Map(groups.map((group) => [String(group.id), group])), [groups]);
  const itemMap = useMemo(() => new Map(items.map((item) => [String(item.id), item])), [items]);
  const categoryRows = Array.isArray(summary.category_performance) ? summary.category_performance : [];
  const itemRows = Array.isArray(summary.item_visibility) ? summary.item_visibility : [];
  const languageRows = Array.isArray(summary.language_mix) ? summary.language_mix : [];
  const dailyRows = Array.isArray(summary.daily_views) ? summary.daily_views : [];
  const heatmapRaw = Array.isArray(summary.traffic_heatmap_utc) ? summary.traffic_heatmap_utc : [];
  const heatmapCells = useMemo(() => toLocalHeatmap(heatmapRaw), [heatmapRaw]);
  const uniqueGuests = Number(summary.unique_sessions) || 0;

  useEffect(() => {
    if (!categoryRows.length) {
      setDepthCategoryId("");
      return;
    }
    if (!categoryRows.some((row) => String(row.id) === String(depthCategoryId))) {
      setDepthCategoryId(String(categoryRows[0].id));
    }
  }, [categoryRows, depthCategoryId]);

  const depthRows = useMemo(() => buildDepthRows({
    categoryId: depthCategoryId,
    categoryRows,
    itemRows,
    items,
    groups,
    language,
    t,
  }), [depthCategoryId, categoryRows, itemRows, items, groups, language, t]);

  const visibility = useMemo(() => buildVisibilityLists({ categoryRows, itemRows, items, groups }), [categoryRows, itemRows, items, groups]);
  const depthCategoryName = localizedName(groupMap.get(String(depthCategoryId))?.name, language);
  const insights = useMemo(() => buildInsights({
    summary,
    language,
    groupMap,
    itemMap,
    heatmapCells,
    depthRows,
    depthCategoryName,
  }), [summary, language, groupMap, itemMap, heatmapCells, depthRows, depthCategoryName]);

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

      <section className="menu-analytics-panel menu-analytics-feature-panel">
        <div className="menu-analytics-panel-heading">
          <div><h2><Clock size={17} aria-hidden="true" />{t.heatmapTitle}</h2><p>{t.heatmapHint}</p></div>
          <span>{t.localTime}</span>
        </div>
        <Heatmap rows={heatmapRaw} language={language} t={t} />
      </section>

      <div className="menu-analytics-two-column menu-analytics-owner-grid">
        <section className="menu-analytics-panel">
          <div className="menu-analytics-panel-heading">
            <div><h2><Layers size={17} aria-hidden="true" />{t.depthTitle}</h2><p>{t.depthHint}</p></div>
          </div>
          {categoryRows.length ? <div className="menu-analytics-category-picker" aria-label={t.chooseCategory}>
            {categoryRows.slice(0, 8).map((row) => <button
              type="button"
              key={row.id}
              className={String(row.id) === String(depthCategoryId) ? "is-active" : ""}
              onClick={() => setDepthCategoryId(String(row.id))}
            >{groupName(row.id)}</button>)}
          </div> : null}
          <CategoryDepth rows={depthRows} language={language} t={t} />
        </section>

        <section className="menu-analytics-panel">
          <div className="menu-analytics-panel-heading">
            <div><h2><Eye size={17} aria-hidden="true" />{t.visibilityTitle}</h2><p>{t.visibilityHint}</p></div>
          </div>
          <div className="menu-analytics-visibility-grid">
            <VisibilityList title={t.mostSeen} rows={visibility.most} language={language} emptyLabel={t.empty} />
            <VisibilityList title={t.leastSeen} rows={visibility.least} language={language} emptyLabel={t.empty} />
          </div>
        </section>
      </div>

      <section className="menu-analytics-panel menu-analytics-feature-panel">
        <div className="menu-analytics-panel-heading">
          <div><h2><CalendarDays size={17} aria-hidden="true" />{t.comparisonTitle}</h2><p>{t.comparisonHint}</p></div>
          <span>{t.currentPeriod}</span>
        </div>
        <Comparison data={summary.period_comparison} language={language} t={t} />
      </section>

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
