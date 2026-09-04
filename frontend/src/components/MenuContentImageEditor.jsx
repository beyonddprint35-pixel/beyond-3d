import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Camera,
  Check,
  ImagePlus,
  Link2,
  LoaderCircle,
  RefreshCcw,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import {
  removeMenuItemImage,
  uploadMenuItemImage,
  validateMenuItemImage,
} from "../features/menu-engine/data/menuItemImageService";
import {
  enhanceMenuPhotoWithAi,
  getMenuPhotoStyleMemory,
  rememberMenuPhotoStyle,
  resetMenuPhotoStyleMemory,
} from "../features/menu-engine/data/menuPhotoAiService";
import "./MenuContentImageEditor.css";
import "./MenuContentImageEditorStyleMemory.css";

const PHOTO_COPY = {
  en: {
    title: "Dish photo",
    hint: "Use a real photo. Beyond can make it look professionally shot without changing the dish.",
    take: "Take photo", takeHint: "Open camera", choose: "Choose from phone", chooseHint: "Photo library",
    replace: "Replace photo", ready: "Photo added", done: "AI enhanced",
    prepare: "Enhance with Beyond AI", prepareHint: "Clean, improve or match the menu style — while preserving the real food.",
    studioTitle: "Beyond AI Photo Studio", studioHint: "Choose what you want Beyond to improve.",
    enhance: "Enhance photo", enhanceHint: "Fix light, color and clarity",
    background: "Clean background", backgroundHint: "Remove surrounding distractions",
    match: "Match menu style", matchHint: "Create one consistent photo collection",
    recommended: "Recommended", foodLock: "Dish Lock ON",
    foodLockHint: "AI is instructed not to add, remove or change ingredients, portions or plating.",
    generate: "Generate AI preview", generating: "Enhancing your real photo…",
    generatingHint: "Beyond is preserving the dish and rebuilding only the presentation that needs improvement.",
    before: "Original", after: "AI result", compare: "Compare",
    enhancedView: "Enhanced photo", regenerate: "Try again", usePhoto: "Use AI photo", saving: "Saving photo…", cancel: "Cancel",
    advancedAi: "Create a new photo with AI instead", advancedAiHint: "Only use this when you do not have a real photo of the dish.",
    memoryTitle: "Style Memory", memoryOn: "Active — matching this restaurant's approved look",
    memoryOff: "Not set yet — your first approved Match Menu Style photo will teach Beyond the look",
    memoryUsed: "Style Memory used", memoryNew: "This can become the restaurant style after you approve it",
    memoryReset: "Reset style", memoryResetting: "Resetting…",
  },
  he: {
    title: "תמונת המנה", hint: "השתמשו בתמונה אמיתית. Beyond יכול להפוך אותה למקצועית בלי לשנות את המנה.",
    take: "צילום עכשיו", takeHint: "פתיחת המצלמה", choose: "בחירה מהטלפון", chooseHint: "ספריית התמונות",
    replace: "החלפת תמונה", ready: "התמונה נוספה", done: "שופרה עם AI",
    prepare: "שיפור עם Beyond AI", prepareHint: "ניקוי, שיפור והתאמה לסגנון התפריט — תוך שמירה על האוכל האמיתי.",
    studioTitle: "סטודיו התמונות של Beyond AI", studioHint: "בחרו מה תרצו ש-Beyond ישפר.",
    enhance: "שיפור התמונה", enhanceHint: "תאורה, צבע וחדות",
    background: "ניקוי הרקע", backgroundHint: "הסרת הסחות מסביב למנה",
    match: "התאמה לסגנון התפריט", matchHint: "מראה אחיד לכל תמונות התפריט",
    recommended: "מומלץ", foodLock: "נעילת מנה פעילה",
    foodLockHint: "ה-AI מונחה לא להוסיף, להסיר או לשנות מרכיבים, כמויות או צילחות.",
    generate: "יצירת תצוגת AI", generating: "משפר את התמונה האמיתית…",
    generatingHint: "Beyond שומר על המנה ומשפר רק את ההצגה שדורשת תיקון.",
    before: "מקור", after: "תוצאת AI", compare: "השוואה",
    enhancedView: "תמונה משופרת", regenerate: "נסו שוב", usePhoto: "שימוש בתמונת AI", saving: "שומר את התמונה…", cancel: "ביטול",
    advancedAi: "יצירת תמונה חדשה עם AI במקום", advancedAiHint: "רק כשאין תמונה אמיתית של המנה.",
    memoryTitle: "זיכרון סגנון", memoryOn: "פעיל — מתאים לסגנון המאושר של המסעדה",
    memoryOff: "עדיין לא הוגדר — התמונה הראשונה שתאשרו במצב התאמת סגנון תלמד את Beyond את המראה",
    memoryUsed: "נעשה שימוש בזיכרון הסגנון", memoryNew: "לאחר האישור התמונה יכולה להפוך לסגנון המסעדה",
    memoryReset: "איפוס סגנון", memoryResetting: "מאפס…",
  },
  ar: {
    title: "صورة الطبق", hint: "استخدم صورة حقيقية. يمكن لـ Beyond جعلها احترافية دون تغيير الطبق.",
    take: "التقط صورة", takeHint: "فتح الكاميرا", choose: "اختر من الهاتف", chooseHint: "مكتبة الصور",
    replace: "استبدال الصورة", ready: "تمت إضافة الصورة", done: "محسّنة بالذكاء الاصطناعي",
    prepare: "تحسين باستخدام Beyond AI", prepareHint: "تنظيف وتحسين ومطابقة أسلوب القائمة مع الحفاظ على الطعام الحقيقي.",
    studioTitle: "استوديو صور Beyond AI", studioHint: "اختر ما تريد من Beyond تحسينه.",
    enhance: "تحسين الصورة", enhanceHint: "الإضاءة واللون والوضوح",
    background: "تنظيف الخلفية", backgroundHint: "إزالة المشتتات حول الطبق",
    match: "مطابقة أسلوب القائمة", matchHint: "مجموعة صور متناسقة للقائمة",
    recommended: "موصى به", foodLock: "قفل الطبق مفعّل",
    foodLockHint: "الذكاء الاصطناعي موجه لعدم إضافة أو إزالة أو تغيير المكونات أو الكمية أو التقديم.",
    generate: "إنشاء معاينة AI", generating: "نحسّن صورتك الحقيقية…",
    generatingHint: "يحافظ Beyond على الطبق ويعيد فقط تحسين العرض اللازم.",
    before: "الأصل", after: "نتيجة AI", compare: "مقارنة",
    enhancedView: "الصورة المحسّنة", regenerate: "حاول مرة أخرى", usePhoto: "استخدم صورة AI", saving: "جارٍ حفظ الصورة…", cancel: "إلغاء",
    advancedAi: "أنشئ صورة جديدة بالذكاء الاصطناعي", advancedAiHint: "استخدم هذا فقط عندما لا توجد صورة حقيقية للطبق.",
    memoryTitle: "ذاكرة الأسلوب", memoryOn: "نشطة — تطابق المظهر المعتمد لهذا المطعم",
    memoryOff: "لم تُضبط بعد — أول صورة تعتمدها في مطابقة أسلوب القائمة ستعلّم Beyond المظهر",
    memoryUsed: "تم استخدام ذاكرة الأسلوب", memoryNew: "بعد الاعتماد يمكن أن تصبح هذه الصورة أسلوب المطعم",
    memoryReset: "إعادة ضبط الأسلوب", memoryResetting: "جارٍ الضبط…",
  },
};

const MODES = [
  { key: "enhance", icon: WandSparkles },
  { key: "background", icon: ImagePlus },
  { key: "match", icon: Sparkles },
];

export default function MenuContentImageEditor({ item, projectId = "draft", t = {}, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingStyle, setResettingStyle] = useState(false);
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [mode, setMode] = useState("match");
  const [result, setResult] = useState(null);
  const [compareSide, setCompareSide] = useState("after");
  const [savedCompareSide, setSavedCompareSide] = useState("after");
  const [styleMemory, setStyleMemory] = useState({ loaded: false, exists: false });
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  const language = ["en", "he", "ar"].includes(document.documentElement.lang) ? document.documentElement.lang : "en";
  const copy = PHOTO_COPY[language] || PHOTO_COPY.en;
  const sourceUrl = item.image_original_url || item.image_url || "";
  const sourcePath = item.image_original_path || item.image_path || "";
  const isAiReady = Boolean(item.image_ai_model || item.image_variant?.startsWith?.("ai-"));
  const hasSavedComparison = Boolean(isAiReady && item.image_original_url && item.image_url && item.image_original_url !== item.image_url);
  const visibleSavedUrl = savedCompareSide === "before" && hasSavedComparison ? item.image_original_url : item.image_url;

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result]);

  useEffect(() => {
    let cancelled = false;
    if (!sourcePath) {
      setStyleMemory({ loaded: true, exists: false });
      return () => { cancelled = true; };
    }
    getMenuPhotoStyleMemory({ projectId, sourcePath })
      .then((memory) => { if (!cancelled) setStyleMemory({ loaded: true, exists: Boolean(memory.exists) }); })
      .catch(() => { if (!cancelled) setStyleMemory({ loaded: true, exists: false }); });
    return () => { cancelled = true; };
  }, [projectId, sourcePath]);

  function clearResult() {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setCompareSide("after");
  }

  async function uploadFile(file) {
    if (!file || uploading || processing || saving) return;
    const validation = validateMenuItemImage(file);
    if (validation) return setError(validation);
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadMenuItemImage({ file, itemId: item.id, projectId, previousPath: item.image_path || "" });
      onChange?.({
        ...uploaded,
        image_original_url: uploaded.image_url,
        image_original_path: uploaded.image_path,
        image_processed_url: "",
        image_processed_path: "",
        image_variant: "",
        image_ai_model: "",
        image_ai_mode: "",
      });
      clearResult();
      setSavedCompareSide("after");
      setMode("match");
      setStudioOpen(true);
    } catch (uploadError) {
      setError(uploadError?.message || t.imageUploadError || "Could not upload this photo.");
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (libraryInputRef.current) libraryInputRef.current.value = "";
    }
  }

  async function generatePreview() {
    if (!sourceUrl || processing) return;
    setProcessing(true);
    setError("");
    clearResult();
    try {
      const ai = await enhanceMenuPhotoWithAi({ sourceUrl, sourcePath, projectId, mode, itemId: item.id });
      const url = URL.createObjectURL(ai.file);
      setResult({ ...ai, url });
      if (mode === "match") setStyleMemory((current) => ({ ...current, loaded: true, exists: ai.styleMemoryExists || current.exists }));
      setCompareSide("after");
    } catch (aiError) {
      setError(aiError?.message || "AI could not enhance this photo.");
    } finally {
      setProcessing(false);
    }
  }

  async function saveAiPhoto() {
    if (!result?.file || saving) return;
    setSaving(true);
    setError("");
    try {
      const uploaded = await uploadMenuItemImage({
        file: result.file,
        itemId: item.id,
        projectId,
        previousPath: item.image_processed_path || "",
      });

      if (result.mode === "match" && !styleMemory.exists) {
        try {
          const memory = await rememberMenuPhotoStyle({ projectId, sourcePath, approvedPath: uploaded.image_path });
          setStyleMemory({ loaded: true, exists: Boolean(memory.exists) });
        } catch (memoryError) {
          setError(memoryError?.message || "Photo saved, but Style Memory could not be updated.");
        }
      }

      onChange?.({
        image_url: uploaded.image_url,
        image_path: uploaded.image_path,
        image_original_url: sourceUrl,
        image_original_path: sourcePath,
        image_processed_url: uploaded.image_url,
        image_processed_path: uploaded.image_path,
        image_variant: `ai-${result.mode}`,
        image_ai_mode: result.mode,
        image_ai_model: result.model,
      });
      clearResult();
      setSavedCompareSide("after");
      setStudioOpen(false);
    } catch (saveError) {
      setError(saveError?.message || "Could not save the AI photo.");
    } finally {
      setSaving(false);
    }
  }

  async function resetStyleMemory() {
    if (resettingStyle) return;
    setResettingStyle(true);
    setError("");
    try {
      await resetMenuPhotoStyleMemory({ projectId, sourcePath });
      setStyleMemory({ loaded: true, exists: false });
      if (mode === "match") clearResult();
    } catch (resetError) {
      setError(resetError?.message || "Could not reset Style Memory.");
    } finally {
      setResettingStyle(false);
    }
  }

  async function removeImage() {
    setUploading(true);
    setError("");
    try {
      const paths = [...new Set([item.image_path, item.image_original_path, item.image_processed_path].filter(Boolean))];
      for (const path of paths) await removeMenuItemImage(path);
      onChange?.({ image_url: "", image_path: "", image_original_url: "", image_original_path: "", image_processed_url: "", image_processed_path: "", image_variant: "", image_ai_mode: "", image_ai_model: "" });
      clearResult();
      setSavedCompareSide("after");
      setStudioOpen(false);
    } catch (removeError) {
      setError(removeError?.message || t.imageRemoveError || "Could not remove this photo.");
    } finally {
      setUploading(false);
    }
  }

  function openAiPhotos() {
    const params = new URLSearchParams(window.location.search || "");
    params.set("item", item.id);
    window.location.assign(`/menu-studio/ai-images?${params.toString()}`);
  }

  const busy = uploading || processing || saving || resettingStyle;
  return (
    <div className="menu-content-v2-image-editor menu-content-v2-image-editor-friendly">
      <div className="menu-content-v2-image-editor-head">
        <div><strong>{copy.title}</strong><small>{copy.hint}</small></div>
        {item.image_url ? <button type="button" onClick={removeImage} disabled={busy}><Trash2 size={13} /> {t.removePhoto || "Remove"}</button> : null}
      </div>

      {item.image_url && !studioOpen ? (
        <div className="menu-content-v2-image-preview menu-content-v2-image-preview-friendly">
          <img src={visibleSavedUrl} alt="" />
          <div className={`menu-content-v2-photo-ready-badge ${isAiReady ? "is-finished" : ""}`}>
            {isAiReady ? <><Check size={10} /> {copy.done}</> : <>✓ {copy.ready}</>}
          </div>
          {hasSavedComparison ? (
            <div className="menu-content-v2-photo-saved-compare">
              <button type="button" className={savedCompareSide === "before" ? "active" : ""} onClick={() => setSavedCompareSide("before")}>{copy.before}</button>
              <button type="button" className={savedCompareSide === "after" ? "active" : ""} onClick={() => setSavedCompareSide("after")}><Sparkles size={10} /> {copy.enhancedView}</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {item.image_url && !studioOpen ? (
        <button type="button" className="menu-content-v2-photo-prepare" onClick={() => { clearResult(); setMode(item.image_ai_mode || "match"); setStudioOpen(true); }} disabled={busy}>
          <span className="menu-content-v2-photo-prepare-icon"><WandSparkles size={18} /></span>
          <span><strong>{copy.prepare}</strong><small>{copy.prepareHint}</small></span>
          <span className="menu-content-v2-photo-prepare-arrow">›</span>
        </button>
      ) : null}

      {studioOpen && sourceUrl ? (
        <div className="menu-content-v2-photo-studio menu-content-v2-photo-ai-studio">
          <div className="menu-content-v2-photo-studio-head">
            <div><strong>{copy.studioTitle}</strong><small>{copy.studioHint}</small></div>
            <button type="button" onClick={() => { clearResult(); setStudioOpen(false); }} disabled={busy} aria-label={copy.cancel}><X size={16} /></button>
          </div>

          <div className="menu-content-v2-photo-food-lock">
            <span><Check size={12} /></span>
            <div><strong>{copy.foodLock}</strong><small>{copy.foodLockHint}</small></div>
          </div>

          <div className={`menu-content-v2-photo-style-memory ${styleMemory.exists ? "is-active" : ""}`}>
            <span className="memory-icon"><Sparkles size={14} /></span>
            <div><strong>{copy.memoryTitle}</strong><small>{styleMemory.exists ? copy.memoryOn : copy.memoryOff}</small></div>
            {styleMemory.exists ? (
              <button type="button" onClick={resetStyleMemory} disabled={busy} title={copy.memoryReset}>
                {resettingStyle ? <LoaderCircle size={12} className="spin" /> : <RefreshCcw size={12} />}
                <span>{resettingStyle ? copy.memoryResetting : copy.memoryReset}</span>
              </button>
            ) : null}
          </div>

          {!result ? (
            <>
              <div className="menu-content-v2-photo-mode-grid">
                {MODES.map(({ key, icon: Icon }) => (
                  <button key={key} type="button" className={mode === key ? "active" : ""} onClick={() => { setMode(key); clearResult(); }} disabled={busy}>
                    <span className="mode-icon"><Icon size={17} /></span>
                    <span><strong>{copy[key]}</strong><small>{copy[`${key}Hint`]}</small>{key === "match" ? <em>{copy.recommended}</em> : null}</span>
                  </button>
                ))}
              </div>

              <div className="menu-content-v2-photo-studio-preview ai-source-preview">
                <img src={sourceUrl} alt="" />
                {processing ? <div className="menu-content-v2-photo-processing"><LoaderCircle size={26} className="spin" /><strong>{copy.generating}</strong><small>{copy.generatingHint}</small></div> : null}
              </div>

              <button type="button" className="menu-content-v2-photo-ai-generate" onClick={generatePreview} disabled={busy}>
                {processing ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
                {copy.generate}
              </button>
            </>
          ) : (
            <>
              {result.mode === "match" ? (
                <div className={`menu-content-v2-photo-memory-result ${result.styleLocked ? "used" : "new"}`}>
                  <Sparkles size={12} />
                  <span>{result.styleLocked ? copy.memoryUsed : copy.memoryNew}</span>
                </div>
              ) : null}
              <div className="menu-content-v2-photo-compare-tabs">
                <button type="button" className={compareSide === "before" ? "active" : ""} onClick={() => setCompareSide("before")}><span>{copy.before}</span></button>
                <button type="button" className={compareSide === "after" ? "active" : ""} onClick={() => setCompareSide("after")}><Sparkles size={11} /><span>{copy.after}</span></button>
              </div>
              <div className="menu-content-v2-photo-studio-preview ai-result-preview">
                <img src={compareSide === "before" ? sourceUrl : result.url} alt="" />
                <span><ArrowLeftRight size={12} /> {copy.compare}</span>
              </div>
              <div className="menu-content-v2-photo-ai-result-actions">
                <button type="button" className="secondary" onClick={generatePreview} disabled={busy}>{copy.regenerate}</button>
                <button type="button" className="primary" onClick={saveAiPhoto} disabled={busy}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}{saving ? copy.saving : copy.usePhoto}</button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!studioOpen ? (
        <div className="menu-content-v2-photo-actions">
          <button type="button" className="menu-content-v2-photo-action menu-content-v2-photo-action-camera" disabled={busy} onClick={() => cameraInputRef.current?.click()}>
            {uploading ? <LoaderCircle size={19} className="spin" /> : <Camera size={19} />}
            <span><strong>{uploading ? (t.uploadingPhoto || "Uploading…") : copy.take}</strong><small>{copy.takeHint}</small></span>
          </button>
          <button type="button" className="menu-content-v2-photo-action" disabled={busy} onClick={() => libraryInputRef.current?.click()}>
            {uploading ? <LoaderCircle size={19} className="spin" /> : <ImagePlus size={19} />}
            <span><strong>{item.image_url ? copy.replace : copy.choose}</strong><small>{copy.chooseHint}</small></span>
          </button>
        </div>
      ) : null}

      <input ref={cameraInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/*" capture="environment" onChange={(event) => uploadFile(event.target.files?.[0])} disabled={busy} />
      <input ref={libraryInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadFile(event.target.files?.[0])} disabled={busy} />

      {!studioOpen ? <button type="button" className="menu-content-v2-image-ai menu-content-v2-image-ai-secondary" onClick={openAiPhotos}><Sparkles size={15} /><span><strong>{copy.advancedAi}</strong><small>{copy.advancedAiHint}</small></span></button> : null}
      {!studioOpen ? <button type="button" className="menu-content-v2-image-url-toggle" onClick={() => setShowUrl((value) => !value)}><Link2 size={13} /> {showUrl ? (t.hideImageUrl || "Hide image URL") : (t.useImageUrl || "Use image URL")}</button> : null}
      {showUrl && !studioOpen ? <div className="menu-content-v2-image-input"><Link2 size={15} /><input dir="ltr" value={item.image_url || ""} onChange={(event) => onChange?.({ image_url: event.target.value, image_path: "" })} placeholder="https://..." /></div> : null}
      {error ? <div className="menu-content-v2-image-error">{error}</div> : null}
    </div>
  );
}
