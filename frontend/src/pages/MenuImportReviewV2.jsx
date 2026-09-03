import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  LoaderCircle,
  SkipForward,
  Sparkles,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import { supabase } from "../lib/supabaseClient";
import {
  MENU_CREATE_V2_FLOW_KEY,
  readMenuStudioV2Draft,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuImportReviewV2.css";

const UI = {
  en: {
    eyebrow: "AI REVIEW",
    title: "Quick check before menu fit",
    hint: "BEYOND safely created the menu and kept uncertain rows here instead of guessing. Confirm only what you recognize from the original menu.",
    sourceEvidence: "What BEYOND could read",
    issue: "Why this needs review",
    category: "Category",
    name: "Item name",
    price: "Price",
    add: "Add to menu",
    skip: "Skip this row",
    finish: "Continue to menu fit",
    saving: "Preparing reviewed items…",
    resolved: "resolved",
    accepted: "added",
    skipped: "skipped",
    back: "Back to import",
    noDraft: "The imported menu draft is no longer available in this browser session.",
    returnImport: "Return to import",
    translationWarning: "The reviewed items were added, but BEYOND could not finish every translation. You can edit those fields later in Content Studio.",
  },
  he: {
    eyebrow: "בדיקת AI",
    title: "בדיקה קצרה לפני התאמת התפריט",
    hint: "BEYOND בנה את התפריט ושמר כאן שורות לא ודאיות במקום לנחש. אשרו רק פריטים שאתם מזהים מהתפריט המקורי.",
    sourceEvidence: "מה BEYOND הצליח לקרוא",
    issue: "למה צריך לבדוק",
    category: "קטגוריה",
    name: "שם הפריט",
    price: "מחיר",
    add: "הוסף לתפריט",
    skip: "דלג על השורה",
    finish: "המשך להתאמת התפריט",
    saving: "מכין את הפריטים שאושרו…",
    resolved: "נבדקו",
    accepted: "נוספו",
    skipped: "דולגו",
    back: "חזרה לייבוא",
    noDraft: "טיוטת התפריט המיובא כבר אינה זמינה בסשן הדפדפן הזה.",
    returnImport: "חזרה לייבוא",
    translationWarning: "הפריטים נוספו, אך BEYOND לא הצליח להשלים את כל התרגומים. אפשר לערוך אותם אחר כך ב-Content Studio.",
  },
  ar: {
    eyebrow: "مراجعة AI",
    title: "مراجعة سريعة قبل ملاءمة القائمة",
    hint: "أنشأ BEYOND القائمة وحفظ الصفوف غير المؤكدة هنا بدلاً من التخمين. أكّدوا فقط ما تتعرفون عليه من القائمة الأصلية.",
    sourceEvidence: "ما استطاع BEYOND قراءته",
    issue: "لماذا يحتاج للمراجعة",
    category: "الفئة",
    name: "اسم الصنف",
    price: "السعر",
    add: "إضافة إلى القائمة",
    skip: "تخطي هذا الصف",
    finish: "المتابعة إلى ملاءمة القائمة",
    saving: "جارٍ تجهيز العناصر المؤكدة…",
    resolved: "تمت مراجعتها",
    accepted: "تمت إضافتها",
    skipped: "تم تخطيها",
    back: "العودة إلى الاستيراد",
    noDraft: "مسودة القائمة المستوردة لم تعد متاحة في جلسة المتصفح هذه.",
    returnImport: "العودة إلى الاستيراد",
    translationWarning: "تمت إضافة العناصر، لكن BEYOND لم يستطع إكمال كل الترجمات. يمكن تعديلها لاحقاً في Content Studio.",
  },
};

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function localizedValues(value) {
  if (!value || typeof value !== "object") return [];
  return [value.en, value.he, value.ar].map(normalize).filter(Boolean);
}

function detectSourceLanguage(value) {
  const text = String(value || "");
  if (/[\u0590-\u05ff]/.test(text)) return "he";
  if (/[\u0600-\u06ff]/.test(text)) return "ar";
  return "en";
}

function cleanPrice(value) {
  return String(value || "").replace(/[₪$€£]/g, "").trim();
}

function defaultGroupId(item, groups) {
  const source = normalize(item?.section_source);
  if (!source) return groups[0]?.id || "";
  const exact = groups.find((group) => localizedValues(group?.name).some((name) => name === source));
  if (exact) return exact.id;
  const fuzzy = groups.find((group) => localizedValues(group?.name).some((name) => name.includes(source) || source.includes(name)));
  return fuzzy?.id || groups[0]?.id || "";
}

function makeRows(reviewItems, groups) {
  return reviewItems.map((item, index) => ({
    id: `review-${index}`,
    source: item,
    name: String(item?.name_source || "").trim(),
    price: cleanPrice(item?.price_source),
    groupId: defaultGroupId(item, groups),
    status: "pending",
  }));
}

export default function MenuImportReviewV2() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const draft = useMemo(() => readMenuStudioV2Draft(), []);
  const [uiLanguage, setUiLanguage] = useState(() => {
    const requested = params.get("ui");
    return ["en", "he", "ar"].includes(requested) ? requested : readStudioLanguage("en");
  });
  const groups = draft?.menu?.groups || [];
  const initialReview = draft?.profile?.aiImportReviewItems || [];
  const [rows, setRows] = useState(() => makeRows(initialReview, groups));
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState("");

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const current = rows[index];
  const resolved = rows.filter((row) => row.status !== "pending").length;
  const accepted = rows.filter((row) => row.status === "accepted").length;
  const skipped = rows.filter((row) => row.status === "skipped").length;
  const allResolved = rows.length > 0 && resolved === rows.length;

  useEffect(() => {
    if (draft && !initialReview.length) {
      window.location.replace(`/menu-builder?resume=fit&mode=upload&reviewed=1&ui=${uiLanguage}`);
    }
  }, [draft, initialReview.length, uiLanguage]);

  function changeUiLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function updateCurrent(patch) {
    setRows((currentRows) => currentRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function moveToNextPending(nextRows, currentIndex) {
    for (let offset = 1; offset <= nextRows.length; offset += 1) {
      const nextIndex = (currentIndex + offset) % nextRows.length;
      if (nextRows[nextIndex]?.status === "pending") return nextIndex;
    }
    return currentIndex;
  }

  function resolveCurrent(status) {
    setRows((currentRows) => {
      const nextRows = currentRows.map((row, rowIndex) => rowIndex === index ? { ...row, status } : row);
      setIndex(moveToNextPending(nextRows, index));
      return nextRows;
    });
  }

  async function finishReview() {
    if (!draft || saving) return;
    setSaving(true);
    setWarning("");
    try {
      const acceptedRows = rows.filter((row) => row.status === "accepted" && row.name.trim() && row.groupId);
      const languages = Array.isArray(draft.menu.languages) && draft.menu.languages.length ? draft.menu.languages : ["en", "he", "ar"];
      const projectId = draft?.profile?.importedProjectId || draft?.importProject?.id || "";
      const translationsByKey = new Map();

      if (acceptedRows.length && projectId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const session = sessionData?.session;
          if (session?.access_token) {
            const fields = [];
            acceptedRows.forEach((row) => {
              const sourceLanguage = detectSourceLanguage(row.name);
              languages.forEach((targetLanguage) => {
                if (targetLanguage === sourceLanguage) return;
                fields.push({
                  key: `${row.id}:${targetLanguage}`,
                  source: row.name.trim(),
                  targetLanguage,
                  kind: "menu item name",
                });
              });
            });
            if (fields.length) {
              const { data, error } = await supabase.functions.invoke("menu-ai-v3-translate-fields", {
                body: { projectId, fields },
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (error || !data?.ok) throw error || new Error(data?.error || "Translation failed");
              (data.translations || []).forEach((entry) => translationsByKey.set(entry.key, entry.text));
            }
          }
        } catch {
          setWarning(t.translationWarning);
        }
      }

      const nextMenu = {
        ...draft.menu,
        items: [...(draft.menu.items || [])],
      };
      const nextSortByGroup = new Map();
      nextMenu.items.forEach((item) => {
        const currentMax = nextSortByGroup.get(item.group_id) ?? -1;
        nextSortByGroup.set(item.group_id, Math.max(currentMax, Number(item.sort_order || 0)));
      });

      acceptedRows.forEach((row, rowIndex) => {
        const sourceLanguage = detectSourceLanguage(row.name);
        const name = { en: "", he: "", ar: "" };
        name[sourceLanguage] = row.name.trim();
        languages.forEach((language) => {
          if (language === sourceLanguage) return;
          name[language] = String(translationsByKey.get(`${row.id}:${language}`) || "").trim();
        });
        const nextSort = (nextSortByGroup.get(row.groupId) ?? -1) + 1;
        nextSortByGroup.set(row.groupId, nextSort);
        nextMenu.items.push({
          id: `ai-reviewed-${Date.now()}-${rowIndex}`,
          group_id: row.groupId,
          name,
          description: { en: "", he: "", ar: "" },
          price: cleanPrice(row.price),
          price_options: [],
          visible: true,
          sort_order: nextSort,
          image_url: "",
        });
      });

      const nextDraft = {
        ...draft,
        menu: nextMenu,
        profile: {
          ...(draft.profile || {}),
          aiImportReviewItems: [],
          aiImportReviewResolved: true,
          aiImportReviewSummary: {
            total: rows.length,
            accepted: acceptedRows.length,
            skipped,
            resolvedAt: new Date().toISOString(),
          },
        },
      };
      writeMenuStudioV2Draft(nextDraft);

      try {
        const existing = JSON.parse(window.sessionStorage.getItem(MENU_CREATE_V2_FLOW_KEY) || "{}") || {};
        window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify({
          ...existing,
          aiImportReviewCount: 0,
          aiImportReviewResolved: true,
          aiImportReviewAccepted: acceptedRows.length,
          aiImportReviewSkipped: skipped,
        }));
      } catch {
        // Navigation remains usable without optional flow metadata.
      }

      window.location.assign(`/menu-builder?resume=fit&mode=upload&reviewed=1&ui=${uiLanguage}`);
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <main className="menu-import-review-v2 centered" dir={rtl ? "rtl" : "ltr"}>
        <section className="menu-import-review-v2-empty">
          <CircleAlert size={24} />
          <h1>{t.noDraft}</h1>
          <button type="button" onClick={() => window.location.assign(`/menu-builder/import?ui=${uiLanguage}`)}>{t.returnImport}</button>
        </section>
      </main>
    );
  }

  if (!rows.length) return null;

  return (
    <main className="menu-import-review-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-import-review-v2-topbar">
        <button type="button" className="menu-import-review-v2-brand" onClick={() => window.location.assign(`/menu-builder/import?ui=${uiLanguage}`)}>
          <img src={beyondLogo} alt="" />
          <span><strong>Beyond Menu Studio</strong><small>AI Review</small></span>
        </button>
        <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} compact />
      </header>

      <div className="menu-import-review-v2-shell">
        <button type="button" className="menu-import-review-v2-back" onClick={() => window.location.assign(`/menu-builder/import?ui=${uiLanguage}`)}><BackIcon size={15} /> {t.back}</button>
        <section className="menu-import-review-v2-heading">
          <span><Sparkles size={13} /> {t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.hint}</p>
        </section>

        <section className="menu-import-review-v2-progress-card">
          <div><strong>{resolved} / {rows.length}</strong><span>{t.resolved}</span></div>
          <div><strong>{accepted}</strong><span>{t.accepted}</span></div>
          <div><strong>{skipped}</strong><span>{t.skipped}</span></div>
          <div className="bar"><i style={{ width: `${Math.round((resolved / rows.length) * 100)}%` }} /></div>
        </section>

        <div className="menu-import-review-v2-layout">
          <section className="menu-import-review-v2-card">
            <div className="menu-import-review-v2-card-head">
              <div><span>{index + 1} / {rows.length}</span><strong>{current.source?.section_source || t.category}</strong></div>
              <em>{current.status}</em>
            </div>

            <label>
              <span>{t.category}</span>
              <select value={current.groupId} onChange={(event) => updateCurrent({ groupId: event.target.value, status: "pending" })}>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name?.[uiLanguage] || group.name?.en || group.name?.he || group.name?.ar || "Category"}</option>)}
              </select>
            </label>
            <label>
              <span>{t.name}</span>
              <input value={current.name} onChange={(event) => updateCurrent({ name: event.target.value, status: "pending" })} />
            </label>
            <label>
              <span>{t.price}</span>
              <input value={current.price} onChange={(event) => updateCurrent({ price: event.target.value, status: "pending" })} inputMode="decimal" />
            </label>

            <div className="menu-import-review-v2-evidence">
              <span>{t.sourceEvidence}</span>
              <p>{current.source?.source_evidence || "—"}</p>
            </div>
            <div className="menu-import-review-v2-issue">
              <CircleAlert size={15} />
              <span><strong>{t.issue}</strong><small>{current.source?.issue || "Unclear source row"}</small></span>
            </div>

            <div className="menu-import-review-v2-actions">
              <button type="button" className="skip" onClick={() => resolveCurrent("skipped")}><SkipForward size={15} /> {t.skip}</button>
              <button type="button" className="accept" disabled={!current.name.trim() || !current.groupId} onClick={() => resolveCurrent("accepted")}><Check size={15} /> {t.add}</button>
            </div>
          </section>

          <aside className="menu-import-review-v2-list">
            {rows.map((row, rowIndex) => (
              <button type="button" key={row.id} className={`${rowIndex === index ? "active" : ""} ${row.status}`} onClick={() => setIndex(rowIndex)}>
                <span>{rowIndex + 1}</span>
                <div><strong>{row.name || row.source?.source_evidence || "Unclear row"}</strong><small>{row.source?.section_source || ""}</small></div>
                <i>{row.status === "accepted" ? "✓" : row.status === "skipped" ? "–" : ""}</i>
              </button>
            ))}
          </aside>
        </div>

        {warning ? <div className="menu-import-review-v2-warning">{warning}</div> : null}
        <button type="button" className="menu-import-review-v2-finish" disabled={!allResolved || saving} onClick={finishReview}>
          {saving ? <><LoaderCircle className="spin" size={16} /> {t.saving}</> : <>{t.finish} <ArrowRight size={16} /></>}
        </button>
      </div>
    </main>
  );
}
