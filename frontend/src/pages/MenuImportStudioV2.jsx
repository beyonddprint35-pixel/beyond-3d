import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  FileUp,
  Image as ImageIcon,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import { adaptAiStructuredMenuToV3 } from "../features/menu-engine/data/aiMenuImportAdapter";
import {
  getMenuAiAllowance,
  getMenuImportSession,
  importMenuWithAi,
  MENU_IMPORT_MAX_FILES,
  MENU_IMPORT_MAX_TOTAL_MB,
  totalImportBytes,
  validateImportFiles,
} from "../features/menu-engine/data/menuAiImportService";
import {
  createBlankMenuV2,
  MENU_CREATE_V2_FLOW_KEY,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  studioLanguageDirection,
  STUDIO_LANGUAGES,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuImportStudioV2.css";

const UI = {
  en: {
    language:"Interface language", back:"Back", eyebrow:"AI MENU IMPORT", title:"Bring your current menu into Studio", hint:"Upload a PDF or menu photos, paste text, or combine both. BEYOND AI will structure the content, then we’ll recommend designs that fit your restaurant.",
    source:"MENU SOURCE", upload:"Upload PDF or photos", uploadHint:"PDF, JPG, PNG or WEBP. You can combine several menu pages.", choose:"Choose files", paste:"Write or paste menu text", pasteHint:"Optional. Add text if you have a copy of the menu or want to improve extraction accuracy.",
    languages:"CUSTOMER LANGUAGES", languageHint:"Choose the languages BEYOND should prepare during import.", private:"Your AI import is private", attempts:"Successful imports use your available AI builds. System failures are not treated as successful builds.", build:"Build my menu", building:"Building your menu…", signIn:"Sign in is required to use AI import.", returnHome:"Return to BEYOND", remaining:"AI builds remaining", unlimited:"Unlimited AI builds", files:"files", remove:"Remove", error:"Could not import this menu", continueFit:"Continue to menu fit", success:"Menu imported successfully", successHint:"The content is ready. Next we’ll ask a few questions and recommend the best design directions.",
    recoveryTitle:"We couldn’t read this source reliably.", recoveryHint:"Your files are still here. Try again, add any menu text you have, or continue manually. A failed system read is not counted as a successful AI build.", retry:"Try again", addText:"Add menu text", manual:"Continue manually", technical:"Technical detail",
  },
  he: {
    language:"שפת הממשק", back:"חזרה", eyebrow:"ייבוא תפריט עם AI", title:"הכניסו את התפריט הקיים ל-Studio", hint:"העלו PDF או תמונות תפריט, הדביקו טקסט או שלבו ביניהם. BEYOND AI יסדר את התוכן ואז נמליץ על עיצובים שמתאימים למסעדה שלכם.",
    source:"מקור התפריט", upload:"העלאת PDF או תמונות", uploadHint:"PDF, JPG, PNG או WEBP. אפשר לשלב כמה עמודים.", choose:"בחירת קבצים", paste:"כתיבה או הדבקת טקסט", pasteHint:"אופציונלי. הוסיפו טקסט אם יש לכם עותק או כדי לשפר את דיוק הזיהוי.",
    languages:"שפות ללקוחות", languageHint:"בחרו את השפות ש-BEYOND יכין בזמן הייבוא.", private:"הייבוא עם AI פרטי", attempts:"ייבוא מוצלח משתמש בניסיונות ה-AI הזמינים. תקלת מערכת לא נחשבת לבנייה מוצלחת.", build:"בניית התפריט שלי", building:"בונה את התפריט…", signIn:"צריך להתחבר כדי להשתמש בייבוא AI.", returnHome:"חזרה ל-BEYOND", remaining:"ניסיונות AI שנותרו", unlimited:"ניסיונות AI ללא הגבלה", files:"קבצים", remove:"הסר", error:"לא ניתן לייבא את התפריט", continueFit:"המשך להתאמת התפריט", success:"התפריט יובא בהצלחה", successHint:"התוכן מוכן. עכשיו נשאל כמה שאלות ונמליץ על כיווני העיצוב המתאימים ביותר.",
    recoveryTitle:"לא הצלחנו לקרוא את המקור בצורה אמינה.", recoveryHint:"הקבצים שלכם עדיין כאן. נסו שוב, הוסיפו טקסט מהתפריט אם יש לכם, או המשיכו ידנית. קריאת מערכת שנכשלה אינה נחשבת לבניית AI מוצלחת.", retry:"נסו שוב", addText:"הוספת טקסט תפריט", manual:"המשך ידנית", technical:"פרט טכני",
  },
  ar: {
    language:"لغة الواجهة", back:"رجوع", eyebrow:"استيراد القائمة بالذكاء الاصطناعي", title:"أدخلوا قائمتكم الحالية إلى Studio", hint:"ارفعوا PDF أو صور القائمة، الصقوا النص أو اجمعوا بينهما. سيقوم BEYOND AI بترتيب المحتوى ثم نقترح تصاميم تناسب مطعمكم.",
    source:"مصدر القائمة", upload:"رفع PDF أو صور", uploadHint:"PDF أو JPG أو PNG أو WEBP. يمكن الجمع بين عدة صفحات.", choose:"اختيار الملفات", paste:"كتابة أو لصق نص القائمة", pasteHint:"اختياري. أضيفوا النص إن كان متوفراً أو لتحسين دقة الاستخراج.",
    languages:"لغات الزبائن", languageHint:"اختاروا اللغات التي يجب أن يجهزها BEYOND أثناء الاستيراد.", private:"استيراد الذكاء الاصطناعي خاص", attempts:"الاستيراد الناجح يستخدم محاولات AI المتاحة. أعطال النظام لا تُحسب كبناء ناجح.", build:"بناء قائمتي", building:"جارٍ بناء القائمة…", signIn:"يجب تسجيل الدخول لاستخدام استيراد AI.", returnHome:"العودة إلى BEYOND", remaining:"محاولات AI المتبقية", unlimited:"محاولات AI غير محدودة", files:"ملفات", remove:"إزالة", error:"تعذر استيراد هذه القائمة", continueFit:"المتابعة إلى ملاءمة القائمة", success:"تم استيراد القائمة بنجاح", successHint:"المحتوى جاهز. الآن سنطرح بعض الأسئلة ونقترح أفضل اتجاهات التصميم.",
    recoveryTitle:"لم نتمكن من قراءة هذا المصدر بشكل موثوق.", recoveryHint:"ملفاتكم ما زالت موجودة. حاولوا مرة أخرى، أضيفوا أي نص متوفر من القائمة، أو تابعوا يدوياً. فشل قراءة النظام لا يُحسب كبناء AI ناجح.", retry:"المحاولة مرة أخرى", addText:"إضافة نص القائمة", manual:"المتابعة يدوياً", technical:"تفصيل تقني",
  },
};

function formatMb(bytes) {
  return `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`;
}

export default function MenuImportStudioV2() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const textAreaRef = useRef(null);
  const [uiLanguage, setUiLanguage] = useState(() => {
    const requested = params.get("ui");
    return ["en", "he", "ar"].includes(requested) ? requested : readStudioLanguage("en");
  });
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [allowance, setAllowance] = useState(null);
  const [files, setFiles] = useState([]);
  const [menuText, setMenuText] = useState("");
  const [languages, setLanguages] = useState(["en", "he", "ar"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptFailed, setAttemptFailed] = useState(false);
  const [success, setSuccess] = useState(false);

  const t = UI[uiLanguage] || UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const totalBytes = totalImportBytes(files);

  useEffect(() => {
    let active = true;
    getMenuImportSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setAuthReady(true);
        if (nextSession) {
          getMenuAiAllowance().then((nextAllowance) => active && setAllowance(nextAllowance)).catch(() => {});
        }
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

  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    const combined = [...files, ...selected].slice(0, MENU_IMPORT_MAX_FILES);
    const validation = validateImportFiles(combined);
    if (validation) {
      setError(validation);
      setAttemptFailed(false);
      event.target.value = "";
      return;
    }
    setFiles(combined);
    setError("");
    setAttemptFailed(false);
    event.target.value = "";
  }

  async function handleBuild() {
    if (!session) return;
    setLoading(true);
    setError("");
    setAttemptFailed(false);
    setSuccess(false);
    try {
      const result = await importMenuWithAi({ session, files, text: menuText, languages });
      const adaptedMenu = adaptAiStructuredMenuToV3(result.menu, { projectId: result.project?.id });
      writeMenuStudioV2Draft({
        menu: adaptedMenu,
        designId: "",
        profile: { mode: "upload", importedProjectId: result.project?.id || "", uiLanguage },
        contentLanguage: adaptedMenu.default_language || languages[0] || "en",
        importProject: result.project,
        savedAt: new Date().toISOString(),
      });
      try {
        window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify({
          mode: "upload",
          answers: {},
          uiLanguage,
          importedProjectId: result.project?.id || "",
          createdAt: new Date().toISOString(),
        }));
      } catch {
        // Import remains usable without storage metadata.
      }
      setAllowance(result.allowance || allowance);
      setSuccess(true);
    } catch (importError) {
      setError(importError?.message || t.error);
      setAttemptFailed(true);
      try {
        const nextAllowance = await getMenuAiAllowance();
        setAllowance(nextAllowance);
      } catch {
        // Preserve the import error.
      }
    } finally {
      setLoading(false);
    }
  }

  function continueToFit() {
    window.location.assign(`/dev/menu-create-v2?resume=fit&mode=upload&ui=${uiLanguage}`);
  }

  function focusMenuText() {
    textAreaRef.current?.focus();
    textAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function continueManually() {
    const manualMenu = createBlankMenuV2();
    writeMenuStudioV2Draft({
      menu: manualMenu,
      designId: "",
      profile: { mode: "manual", sourceFallback: "ai-import", uiLanguage },
      contentLanguage: languages[0] || "en",
      savedAt: new Date().toISOString(),
    });
    try {
      window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify({
        mode: "manual",
        answers: {},
        uiLanguage,
        sourceFallback: "ai-import",
        createdAt: new Date().toISOString(),
      }));
    } catch {
      // Manual flow still works without metadata persistence.
    }
    window.location.assign(`/dev/menu-create-v2?resume=fit&mode=manual&ui=${uiLanguage}`);
  }

  if (authReady && !session) {
    return <main className="menu-import-v2 centered" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <section className="menu-import-v2-auth-card">
        <img src={beyondLogo} alt="" />
        <h1>{t.signIn}</h1>
        <p>BEYOND Menu AI</p>
        <button type="button" onClick={() => window.location.assign("/#digital-menus")}>{t.returnHome}</button>
      </section>
    </main>;
  }

  return (
    <main className="menu-import-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-import-v2-topbar">
        <div className="menu-import-v2-brand-wrap">
          <button type="button" className="menu-import-v2-back" onClick={() => window.location.assign("/dev/menu-create-v2")} title={t.back}><BackIcon size={16} /></button>
          <div className="menu-import-v2-brand"><img src={beyondLogo} alt="" /><span><strong>Beyond Menu Studio</strong><small>AI Import</small></span></div>
        </div>
        <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} label={t.language} compact />
      </header>

      <div className="menu-import-v2-shell">
        <section className="menu-import-v2-heading"><span><Sparkles size={13} /> {t.eyebrow}</span><h1>{t.title}</h1><p>{t.hint}</p></section>

        <div className="menu-import-v2-grid">
          <section className="menu-import-v2-main">
            <article className="menu-import-v2-card source-card">
              <header><div><span>{t.source}</span><strong>{t.upload}</strong><p>{t.uploadHint}</p></div><small>{MENU_IMPORT_MAX_FILES} · {MENU_IMPORT_MAX_TOTAL_MB} MB</small></header>
              <label className="menu-import-v2-dropzone"><FileUp size={25} /><strong>{t.choose}</strong><span>{t.uploadHint}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple onChange={addFiles} /></label>
              {files.length ? <div className="menu-import-v2-files">{files.map((file, index) => <div key={`${file.name}-${index}`}>{file.type === "application/pdf" ? <FileText size={15} /> : <ImageIcon size={15} />}<span><strong>{file.name}</strong><small>{formatMb(file.size)}</small></span><button type="button" onClick={() => { setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)); setAttemptFailed(false); setError(""); }} title={t.remove}><Trash2 size={13} /></button></div>)}</div> : null}
              <div className="menu-import-v2-upload-meta"><span>{files.length} {t.files}</span><span>{formatMb(totalBytes)} / {MENU_IMPORT_MAX_TOTAL_MB} MB</span></div>
            </article>

            <article className="menu-import-v2-card text-card">
              <header><div><span>{t.source}</span><strong>{t.paste}</strong><p>{t.pasteHint}</p></div></header>
              <textarea ref={textAreaRef} value={menuText} onChange={(event) => { setMenuText(event.target.value); setAttemptFailed(false); setError(""); }} placeholder="Burgers\nClassic Burger - 58₪\nBeef patty, lettuce, tomato..." />
            </article>
          </section>

          <aside className="menu-import-v2-side">
            <section className="menu-import-v2-card languages-card">
              <header><div><span>{t.languages}</span><p>{t.languageHint}</p></div></header>
              <div className="menu-import-v2-language-list">{STUDIO_LANGUAGES.map((language) => {
                const selected = languages.includes(language.code);
                return <button type="button" key={language.code} className={selected ? "active" : ""} onClick={() => toggleLanguage(language.code)}><span className="check">{selected ? <Check size={13} /> : null}</span><span><strong>{language.nativeLabel}</strong><small>{language.label}</small></span><b>{language.short}</b></button>;
              })}</div>
            </section>

            <section className="menu-import-v2-card build-card">
              <div className="menu-import-v2-private"><Sparkles size={15} /><span><strong>{t.private}</strong><small>{t.attempts}</small></span></div>
              {allowance ? <div className="menu-import-v2-allowance"><span>{allowance.unlimited ? t.unlimited : t.remaining}</span><strong>{allowance.unlimited ? "∞" : allowance.remaining_attempts}</strong></div> : null}

              {error && !attemptFailed ? <div className="menu-import-v2-error">{error}</div> : null}

              {attemptFailed ? <div className="menu-import-v2-recovery" role="alert">
                <div className="menu-import-v2-recovery-head"><CircleAlert size={18} /><span><strong>{t.recoveryTitle}</strong><small>{t.recoveryHint}</small></span></div>
                <div className="menu-import-v2-recovery-actions">
                  <button type="button" className="primary" onClick={handleBuild} disabled={loading}><RefreshCw size={14} /> {loading ? t.building : t.retry}</button>
                  <button type="button" onClick={focusMenuText}><FileText size={14} /> {t.addText}</button>
                  <button type="button" onClick={continueManually}><PencilLine size={14} /> {t.manual}</button>
                </div>
                <details><summary>{t.technical}</summary><p>{error}</p></details>
              </div> : null}

              {success ? <div className="menu-import-v2-success"><Check size={16} /><span><strong>{t.success}</strong><small>{t.successHint}</small></span></div> : null}

              {!success && !attemptFailed ? <button type="button" className="menu-import-v2-build" disabled={loading || !session || (!files.length && !menuText.trim()) || !languages.length} onClick={handleBuild}>{loading ? <><LoaderCircle className="spin" size={16} /> {t.building}</> : <><Sparkles size={16} /> {t.build}</>}</button> : null}
              {success ? <button type="button" className="menu-import-v2-build" onClick={continueToFit}>{t.continueFit} <ForwardIcon size={15} /></button> : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
