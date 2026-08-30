import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import { adaptAiStructuredMenuToV3 } from "../features/menu-engine/data/aiMenuImportAdapter";
import {
  getMenuAiAllowance,
  getMenuImportSession,
} from "../features/menu-engine/data/menuAiImportService";
import {
  importMenuWebsiteWithAi,
  normalizeWebsiteUrl,
} from "../features/menu-engine/data/menuWebsiteImportService";
import {
  createBlankMenuV2,
  MENU_CREATE_V2_FLOW_KEY,
  readMenuCreateV2Profile,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  STUDIO_LANGUAGES,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuWebsiteImportV2.css";

const UI = {
  en: {
    language: "Interface language", back: "Back", eyebrow: "WEBSITE IMPORT", title: "Bring your current website into Studio",
    hint: "Paste the restaurant or menu page. BEYOND will find the readable menu pages, structure the content, and preserve it as an editable Studio draft.",
    source: "WEBSITE SOURCE", url: "Restaurant or menu URL", urlHint: "Use the most direct menu page you have for the best result.",
    languages: "CUSTOMER LANGUAGES", languageHint: "Choose the languages customers should be able to use in the finished menu.",
    ai: "AI MENU BUILD", private: "Private import", privateHint: "Only public pages from this website are read. A failed website scan does not spend an AI build.",
    remaining: "AI builds remaining", unlimited: "Unlimited AI builds", build: "Import this website", scanning: "Scanning website…", structuring: "Structuring menu…",
    success: "Website menu imported", successHint: "The content is ready in the same Studio draft. You can now review every category, item and price before continuing design work.",
    pages: "pages read", openContent: "Open Content Studio", retry: "Try again", changeUrl: "Change URL", manual: "Continue manually",
    errorTitle: "We couldn’t import this website reliably.", technical: "Technical detail", signIn: "Sign in is required to use website import.", home: "Return to BEYOND",
  },
  he: {
    language: "שפת הממשק", back: "חזרה", eyebrow: "ייבוא מאתר", title: "הכניסו את האתר הקיים ל-Studio",
    hint: "הדביקו קישור למסעדה או לעמוד התפריט. BEYOND ימצא את עמודי התפריט הקריאים, יסדר את התוכן וישמור אותו כטיוטה הניתנת לעריכה.",
    source: "מקור האתר", url: "קישור למסעדה או לתפריט", urlHint: "לתוצאה הטובה ביותר השתמשו בקישור הישיר ביותר לעמוד התפריט.",
    languages: "שפות ללקוחות", languageHint: "בחרו את השפות שבהן הלקוחות יוכלו להשתמש בתפריט הסופי.",
    ai: "בניית תפריט עם AI", private: "ייבוא פרטי", privateHint: "נקראים רק עמודים ציבוריים מאותו אתר. סריקת אתר שנכשלה אינה צורכת בניית AI.",
    remaining: "בניית AI שנותרו", unlimited: "בניית AI ללא הגבלה", build: "ייבוא האתר", scanning: "סורק את האתר…", structuring: "מסדר את התפריט…",
    success: "התפריט מהאתר יובא", successHint: "התוכן מוכן באותה טיוטת Studio. עכשיו אפשר לבדוק כל קטגוריה, פריט ומחיר לפני המשך העיצוב.",
    pages: "עמודים נקראו", openContent: "פתחו את Content Studio", retry: "נסו שוב", changeUrl: "שינוי קישור", manual: "המשך ידנית",
    errorTitle: "לא הצלחנו לייבא את האתר בצורה אמינה.", technical: "פרט טכני", signIn: "צריך להתחבר כדי להשתמש בייבוא מאתר.", home: "חזרה ל-BEYOND",
  },
  ar: {
    language: "لغة الواجهة", back: "رجوع", eyebrow: "استيراد من الموقع", title: "أدخلوا موقعكم الحالي إلى Studio",
    hint: "الصقوا رابط المطعم أو صفحة القائمة. سيبحث BEYOND عن صفحات القائمة المقروءة، ينظم المحتوى ويحفظه كمسودة قابلة للتعديل.",
    source: "مصدر الموقع", url: "رابط المطعم أو القائمة", urlHint: "استخدموا رابط صفحة القائمة المباشر قدر الإمكان للحصول على أفضل نتيجة.",
    languages: "لغات الزبائن", languageHint: "اختاروا اللغات التي سيتمكن الزبائن من استخدامها في القائمة النهائية.",
    ai: "بناء القائمة بالذكاء الاصطناعي", private: "استيراد خاص", privateHint: "تتم قراءة الصفحات العامة فقط من نفس الموقع. فشل فحص الموقع لا يستهلك محاولة بناء AI.",
    remaining: "محاولات AI المتبقية", unlimited: "محاولات AI غير محدودة", build: "استيراد الموقع", scanning: "جارٍ فحص الموقع…", structuring: "جارٍ تنظيم القائمة…",
    success: "تم استيراد قائمة الموقع", successHint: "المحتوى جاهز في مسودة Studio نفسها. يمكنكم الآن مراجعة كل فئة وصنف وسعر قبل متابعة التصميم.",
    pages: "صفحات تمت قراءتها", openContent: "فتح Content Studio", retry: "المحاولة مرة أخرى", changeUrl: "تغيير الرابط", manual: "المتابعة يدوياً",
    errorTitle: "لم نتمكن من استيراد الموقع بشكل موثوق.", technical: "تفصيل تقني", signIn: "يجب تسجيل الدخول لاستخدام استيراد الموقع.", home: "العودة إلى BEYOND",
  },
};

function nextContentUrl({ uiLanguage, manual = false }) {
  const next = new URL(window.location.href);
  next.searchParams.set("websiteImported", "1");
  next.searchParams.set("ui", uiLanguage);
  if (manual) next.searchParams.set("mode", "manual");
  return `${next.pathname}?${next.searchParams.toString()}`;
}

export default function MenuWebsiteImportV2() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const storedProfile = useMemo(() => readMenuCreateV2Profile() || {}, []);
  const [uiLanguage, setUiLanguage] = useState(() => {
    const requested = params.get("ui");
    return ["en", "he", "ar"].includes(requested) ? requested : readStudioLanguage("en");
  });
  const [websiteUrl, setWebsiteUrl] = useState(() => params.get("website") || storedProfile.websiteUrl || "");
  const [languages, setLanguages] = useState(() => {
    const stored = Array.isArray(storedProfile.customerLanguages) ? storedProfile.customerLanguages.filter((value) => ["en", "he", "ar"].includes(value)) : [];
    return stored.length ? stored : ["en", "he", "ar"];
  });
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [allowance, setAllowance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sourceSummary, setSourceSummary] = useState(null);

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const designId = params.get("design") || "";

  useEffect(() => {
    let active = true;
    getMenuImportSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setAuthReady(true);
        if (nextSession) getMenuAiAllowance().then((next) => active && setAllowance(next)).catch(() => {});
      })
      .catch(() => active && setAuthReady(true));
    return () => { active = false; };
  }, []);

  function changeUiLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function toggleLanguage(code) {
    setLanguages((current) => {
      if (current.includes(code)) return current.length === 1 ? current : current.filter((item) => item !== code);
      return [...current, code];
    });
  }

  async function handleImport() {
    if (!session || loading) return;
    setLoading(true);
    setError("");
    setSuccess(false);
    setSourceSummary(null);
    try {
      const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
      setWebsiteUrl(normalizedUrl);
      setPhase("scanning");
      const result = await importMenuWebsiteWithAi({
        session,
        url: normalizedUrl,
        languages,
        onSourceReady: (source) => {
          setSourceSummary(source);
          setPhase("structuring");
        },
      });
      const adaptedMenu = adaptAiStructuredMenuToV3(result.menu, { projectId: result.project?.id });
      const profile = {
        ...storedProfile,
        mode: "website",
        websiteUrl: result.websiteSource?.sourceUrl || normalizedUrl,
        customerLanguages: languages,
        importedProjectId: result.project?.id || "",
        websitePages: (result.websiteSource?.pages || []).map((page) => ({ url: page.url, title: page.title })),
        uiLanguage,
      };
      writeMenuStudioV2Draft({
        menu: adaptedMenu,
        designId,
        profile,
        contentLanguage: adaptedMenu.default_language || languages[0] || "en",
        importProject: result.project,
        websiteSource: {
          sourceUrl: result.websiteSource?.sourceUrl || normalizedUrl,
          pages: profile.websitePages,
        },
        savedAt: new Date().toISOString(),
      });
      try {
        window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify({ ...profile, createdAt: storedProfile.createdAt || new Date().toISOString() }));
      } catch {
        // The imported draft itself remains the source of truth.
      }
      setAllowance(result.allowance || allowance);
      setSourceSummary(result.websiteSource || null);
      setSuccess(true);
    } catch (importError) {
      setError(importError?.message || t.errorTitle);
      try { setAllowance(await getMenuAiAllowance()); } catch { /* preserve error */ }
    } finally {
      setPhase("idle");
      setLoading(false);
    }
  }

  function continueManually() {
    const menu = createBlankMenuV2();
    menu.languages = [...languages];
    menu.default_language = languages[0] || "en";
    const profile = {
      ...storedProfile,
      mode: "manual",
      sourceFallback: "website-import",
      websiteUrl,
      customerLanguages: languages,
      uiLanguage,
    };
    writeMenuStudioV2Draft({ menu, designId, profile, contentLanguage: menu.default_language, savedAt: new Date().toISOString() });
    try { window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify(profile)); } catch { /* non-blocking */ }
    window.location.assign(nextContentUrl({ uiLanguage, manual: true }));
  }

  if (authReady && !session) {
    return (
      <main className="menu-website-import-v2 centered" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
        <div className="menu-website-import-v2-auth-card"><CircleAlert size={26} /><h1>{t.signIn}</h1><button type="button" onClick={() => window.location.assign("/")}>{t.home}</button></div>
      </main>
    );
  }

  return (
    <main className="menu-website-import-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-website-import-v2-topbar">
        <button type="button" className="menu-website-import-v2-brand" onClick={() => window.location.assign(`/dev/menu-create-v2?ui=${uiLanguage}`)}>
          <img src={beyondLogo} alt="" /><span><strong>Beyond</strong><small>Menu Studio</small></span>
        </button>
        <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} label={t.language} compact />
      </header>

      <div className="menu-website-import-v2-shell">
        <button type="button" className="menu-website-import-v2-back" onClick={() => window.location.assign(`/dev/menu-create-v2?ui=${uiLanguage}`)}><BackIcon size={16} /> {t.back}</button>
        <section className="menu-website-import-v2-heading"><span><Globe2 size={14} /> {t.eyebrow}</span><h1>{t.title}</h1><p>{t.hint}</p></section>

        <div className="menu-website-import-v2-grid">
          <div className="menu-website-import-v2-main">
            <section className="menu-website-import-v2-card">
              <div className="menu-website-import-v2-card-head"><span>{t.source}</span><Globe2 size={17} /></div>
              <label className="menu-website-import-v2-field"><span>{t.url}</span><input type="url" value={websiteUrl} disabled={loading || success} onChange={(event) => { setWebsiteUrl(event.target.value); setError(""); }} placeholder="https://restaurant.com/menu"/><small>{t.urlHint}</small></label>
            </section>

            <section className="menu-website-import-v2-card">
              <div className="menu-website-import-v2-card-head"><span>{t.languages}</span><Sparkles size={17} /></div>
              <p className="menu-website-import-v2-help">{t.languageHint}</p>
              <div className="menu-website-import-v2-languages">
                {STUDIO_LANGUAGES.map((language) => {
                  const active = languages.includes(language.code);
                  return <button type="button" key={language.code} disabled={loading || success} className={active ? "active" : ""} onClick={() => toggleLanguage(language.code)}><i>{active ? <Check size={13} /> : null}</i><span><strong>{language.nativeLabel}</strong><small>{language.label}</small></span><em>{language.short}</em></button>;
                })}
              </div>
            </section>
          </div>

          <aside className="menu-website-import-v2-side">
            <section className="menu-website-import-v2-card ai-card">
              <div className="menu-website-import-v2-card-head"><span>{t.ai}</span><Sparkles size={17} /></div>
              <div className="menu-website-import-v2-private"><Sparkles size={16} /><span><strong>{t.private}</strong><small>{t.privateHint}</small></span></div>
              <div className="menu-website-import-v2-allowance"><span>{t.remaining}</span><strong>{allowance?.unlimited ? "∞" : allowance?.remaining_attempts ?? "—"}</strong><small>{allowance?.unlimited ? t.unlimited : ""}</small></div>

              {error ? <div className="menu-website-import-v2-error"><CircleAlert size={17} /><div><strong>{t.errorTitle}</strong><p>{error}</p></div></div> : null}
              {success ? <div className="menu-website-import-v2-success"><Check size={18} /><div><strong>{t.success}</strong><p>{t.successHint}</p>{sourceSummary?.pages?.length ? <small>{sourceSummary.pages.length} {t.pages}</small> : null}</div></div> : null}

              {!success ? <button type="button" className="menu-website-import-v2-primary" disabled={!session || loading || !websiteUrl.trim()} onClick={handleImport}>{loading ? <><LoaderCircle className="spin" size={16} /> {phase === "scanning" ? t.scanning : t.structuring}</> : <>{t.build}<ForwardIcon size={15} /></>}</button> : <button type="button" className="menu-website-import-v2-primary" onClick={() => window.location.assign(nextContentUrl({ uiLanguage }))}>{t.openContent}<ForwardIcon size={15} /></button>}

              {error && !loading ? <div className="menu-website-import-v2-recovery"><button type="button" onClick={handleImport}><RefreshCw size={14} /> {t.retry}</button><button type="button" onClick={() => { setError(""); setSuccess(false); }}>{t.changeUrl}</button><button type="button" onClick={continueManually}>{t.manual}</button></div> : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
