import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import MenuProBadge from "./MenuProBadge";
import MenuStudioHeader from "./MenuStudioHeader";
import { menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { readStudioLanguage, studioLanguageDirection, writeStudioLanguage } from "../features/menu-engine/studio/studioLanguage";
import useMenuProEntitlement from "../features/menu-engine/studio/useMenuProEntitlement";
import "./MenuProAnalyticsGate.css";

const COPY = {
  en: {
    title: "Analytics is a Pro feature",
    locked: "Upgrade this menu to Beyond Pro to see guest attention, category reach, item visibility and browsing trends.",
    checking: "Checking your subscription…",
    checkingNote: "Verifying Analytics access for this menu.",
    error: "We could not verify Analytics access right now. Refresh and try again.",
  },
  he: {
    title: "אנליטיקה היא יכולת Pro",
    locked: "שדרגו את התפריט ל-Beyond Pro כדי לראות תשומת לב של אורחים, חשיפה לקטגוריות ולפריטים ומגמות גלישה.",
    checking: "בודק את המנוי…",
    checkingNote: "מוודא גישה לאנליטיקה עבור התפריט הזה.",
    error: "לא ניתן לאמת כרגע את הגישה לאנליטיקה. רעננו ונסו שוב.",
  },
  ar: {
    title: "التحليلات ميزة Pro",
    locked: "قم بترقية هذه القائمة إلى Beyond Pro لرؤية اهتمام الضيوف ووصول الفئات وظهور الأصناف واتجاهات التصفح.",
    checking: "جارٍ التحقق من الاشتراك…",
    checkingNote: "جارٍ التحقق من صلاحية الوصول إلى التحليلات لهذه القائمة.",
    error: "تعذر التحقق من صلاحية الوصول إلى التحليلات الآن. حدّث الصفحة وحاول مجددًا.",
  },
};

export default function MenuProAnalyticsGate({ children }) {
  const draft = useMemo(readMenuStudioV2Draft, []);
  const projectId = useMemo(() => menuStudioProjectId(draft), [draft]);
  const [language, setLanguage] = useState(() => readStudioLanguage("en"));
  const { canUseAnalytics, loading, error } = useMenuProEntitlement(projectId);
  const t = COPY[language] || COPY.en;

  function changeLanguage(value) {
    setLanguage(value);
    writeStudioLanguage(value);
  }

  if (!projectId || canUseAnalytics) return children;

  const title = loading ? t.checking : t.title;
  const message = loading ? t.checkingNote : error ? t.error : t.locked;

  return (
    <main className="menu-content-v2 menu-analytics-pro-gate-page" dir={studioLanguageDirection(language)} lang={language}>
      <MenuStudioHeader
        stage="analytics"
        language={language}
        onLanguageChange={changeLanguage}
        menuName={draft?.menu?.restaurant_name}
      />
      <div className="menu-analytics-pro-gate-shell">
        <section className={`menu-analytics-pro-gate-card${loading ? " is-loading" : ""}`} aria-live="polite">
          <div className="menu-analytics-pro-gate-icon" aria-hidden="true"><BarChart3 size={26} /></div>
          <MenuProBadge language={language} />
          <h1>{title}</h1>
          <p>{message}</p>
        </section>
      </div>
    </main>
  );
}
