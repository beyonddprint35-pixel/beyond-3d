import { useMemo, useState } from "react";
import { BarChart3, ChartNoAxesCombined } from "lucide-react";
import MenuStudioHeader from "../components/MenuStudioHeader";
import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { readStudioLanguage, studioLanguageDirection, writeStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import "./MenuAnalyticsStudioV2.css";

const COPY = {
  en: {
    title: "Menu performance", hint: "Understand how guests explore your menu.",
    status: "Analytics is not active yet", note: "Activity tracking is not connected for this menu. Views and interactions are unavailable until tracking is enabled.",
    metrics: ["Menu views", "Category views", "Item impressions", "Item opens"],
    sections: ["Popular categories", "Popular items", "Guest engagement"],
    unavailable: "Not available", empty: "No activity data yet", emptyHint: "This section needs activity from your published menu.",
  },
  he: {
    title: "ביצועי התפריט", hint: "גלו כיצד האורחים גולשים בתפריט שלכם.",
    status: "האנליטיקה עדיין לא פעילה", note: "מעקב הפעילות אינו מחובר לתפריט זה. צפיות ואינטראקציות יהיו זמינות לאחר הפעלת המעקב.",
    metrics: ["צפיות בתפריט", "צפיות בקטגוריות", "חשיפות לפריטים", "פתיחות פריטים"],
    sections: ["קטגוריות פופולריות", "פריטים פופולריים", "מעורבות אורחים"],
    unavailable: "לא זמין", empty: "עדיין אין נתוני פעילות", emptyHint: "חלק זה דורש נתוני פעילות מהתפריט שפורסם.",
  },
  ar: {
    title: "أداء القائمة", hint: "تعرّف على كيفية تصفّح الضيوف لقائمتك.",
    status: "التحليلات غير مفعّلة بعد", note: "تتبّع النشاط غير متصل بهذه القائمة. المشاهدات والتفاعلات غير متاحة حتى تفعيل التتبّع.",
    metrics: ["مشاهدات القائمة", "مشاهدات الفئات", "ظهور الأصناف", "فتح الأصناف"],
    sections: ["الفئات الشائعة", "الأصناف الشائعة", "تفاعل الضيوف"],
    unavailable: "غير متاح", empty: "لا توجد بيانات نشاط بعد", emptyHint: "يحتاج هذا القسم إلى بيانات نشاط من قائمتك المنشورة.",
  },
};

export default function MenuAnalyticsStudioV2() {
  const draft = useMemo(readMenuStudioV2Draft, []);
  const [language, setLanguage] = useState(() => readStudioLanguage("en"));
  const t = COPY[language] || COPY.en;
  function changeLanguage(value) { setLanguage(value); writeStudioLanguage(value); }
  return <main className="menu-content-v2 menu-analytics-v2" dir={studioLanguageDirection(language)} lang={language}>
    <MenuStudioHeader stage="analytics" language={language} onLanguageChange={changeLanguage} menuName={draft?.menu?.restaurant_name} />
    <div className="menu-analytics-body">
      <section className="menu-analytics-intro">
        <BarChart3 size={24} aria-hidden="true" />
        <h1>{t.title}</h1><p>{t.hint}</p>
      </section>
      <section className="menu-analytics-status" role="status"><strong>{t.status}</strong><p>{t.note}</p></section>
      <div className="menu-analytics-metrics">
        {t.metrics.map((label) => <article key={label}><h2>{label}</h2><strong aria-label={t.unavailable}>—</strong><span>{t.unavailable}</span></article>)}
      </div>
      <div className="menu-analytics-sections">
        {t.sections.map((label) => <section key={label}><h2>{label}</h2><div><ChartNoAxesCombined size={26} aria-hidden="true" /><h3>{t.empty}</h3><p>{t.emptyHint}</p></div></section>)}
      </div>
    </div>
  </main>;
}
