import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ImagePlus, LoaderCircle, Trash2, Upload, WandSparkles } from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import { normalizeMenuItemImage, validateMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import { studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";
import "./MenuPlaceWorkspace.css";

const BUCKET = "menu-item-images";
const MAX_PLACE_PHOTOS = 5;

const COPY = {
  en: {
    eyebrow: "RESTAURANT PROFILE",
    title: "My Place",
    subtitle: "Give Beyond a visual memory of your restaurant. These photos let AI-edited dish photos feel like they were actually shot in your place — even if you never created a dish in AI Photo Studio.",
    logoTitle: "Restaurant logo",
    logoHint: "Upload the logo you want Beyond to associate with this menu.",
    addLogo: "Upload logo",
    replaceLogo: "Replace logo",
    placeTitle: "Place style photos",
    placeHint: "Upload 3–5 real photos of the dining room, bar, tables, walls and lighting. Avoid close-up food photos here.",
    addPhotos: "Add place photos",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} photos`,
    aiTitle: "My Place style is used automatically",
    aiReady: (count) => count ? `Ready — Beyond can use ${Math.min(count, 3)} place reference photo${Math.min(count, 3) === 1 ? "" : "s"} when editing a real dish photo.` : "Add place photos and Beyond will use them when you choose Create style options on a real dish photo.",
    aiHint: "The dish stays locked. Place photos guide only the atmosphere: lighting, color temperature, table/background materials and restaurant mood.",
    loading: "Loading My Place…",
    uploading: "Uploading…",
    remove: "Remove",
    maxReached: "You can keep up to 5 place photos. Remove one before adding another.",
    missingProject: "Open a saved menu before setting up My Place.",
    signIn: "Please sign in again before uploading My Place photos.",
    uploadFailed: "Could not upload this photo. Please try again.",
    removeFailed: "Could not remove this photo. Please try again.",
    emptyLogo: "Your logo will appear here",
  },
  he: {
    eyebrow: "פרופיל המסעדה",
    title: "המקום שלי",
    subtitle: "תנו ל-Beyond זיכרון חזותי של המסעדה. התמונות האלו מאפשרות לתמונות מנות שעוברות עריכת AI להרגיש כאילו צולמו אצלכם — גם אם לא השתמשתם קודם ב-AI Photo Studio.",
    logoTitle: "לוגו המסעדה",
    logoHint: "העלו את הלוגו ש-Beyond ישייך לתפריט הזה.",
    addLogo: "העלאת לוגו",
    replaceLogo: "החלפת לוגו",
    placeTitle: "תמונות סגנון של המקום",
    placeHint: "העלו 3–5 תמונות אמיתיות של החלל, הבר, השולחנות, הקירות והתאורה. כאן עדיף לא להעלות תקריבים של אוכל.",
    addPhotos: "הוספת תמונות מקום",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} תמונות`,
    aiTitle: "סגנון המקום שלי מופעל אוטומטית",
    aiReady: (count) => count ? `מוכן — Beyond יכול להשתמש ב-${Math.min(count, 3)} תמונות מקום כ-reference בעת עריכת תמונת מנה אמיתית.` : "הוסיפו תמונות של המקום ו-Beyond ישתמש בהן כשתבחרו יצירת אפשרויות סגנון לתמונת מנה אמיתית.",
    aiHint: "המנה נשארת נעולה. תמונות המקום משפיעות רק על האווירה: תאורה, טמפרטורת צבע, חומרי שולחן/רקע והאופי של המסעדה.",
    loading: "טוען את המקום שלי…",
    uploading: "מעלה…",
    remove: "הסרה",
    maxReached: "ניתן לשמור עד 5 תמונות מקום. הסירו תמונה לפני הוספת תמונה חדשה.",
    missingProject: "פתחו תפריט שמור לפני הגדרת המקום שלי.",
    signIn: "יש להתחבר מחדש לפני העלאת תמונות המקום שלי.",
    uploadFailed: "לא ניתן להעלות את התמונה. נסו שוב.",
    removeFailed: "לא ניתן להסיר את התמונה. נסו שוב.",
    emptyLogo: "הלוגו שלכם יופיע כאן",
  },
  ar: {
    eyebrow: "ملف المطعم",
    title: "مكاني",
    subtitle: "امنح Beyond ذاكرة بصرية لمطعمك. تساعد هذه الصور صور الأطباق المعدلة بالذكاء الاصطناعي على الظهور وكأنها التُقطت فعلاً في مكانك، حتى لو لم تستخدم AI Photo Studio من قبل.",
    logoTitle: "شعار المطعم",
    logoHint: "ارفع الشعار الذي تريد من Beyond ربطه بهذه القائمة.",
    addLogo: "رفع الشعار",
    replaceLogo: "استبدال الشعار",
    placeTitle: "صور أسلوب المكان",
    placeHint: "ارفع 3–5 صور حقيقية لصالة الطعام أو البار والطاولات والجدران والإضاءة. تجنب صور الطعام القريبة هنا.",
    addPhotos: "إضافة صور المكان",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} صور`,
    aiTitle: "يُستخدم أسلوب مكاني تلقائياً",
    aiReady: (count) => count ? `جاهز — يمكن لـ Beyond استخدام ${Math.min(count, 3)} صور مرجعية للمكان عند تعديل صورة طبق حقيقية.` : "أضف صور المكان وسيستخدمها Beyond عند اختيار إنشاء خيارات الأسلوب لصورة طبق حقيقية.",
    aiHint: "يبقى الطبق مقفلاً. صور المكان توجه الأجواء فقط: الإضاءة وحرارة اللون وخامات الطاولة أو الخلفية وطابع المطعم.",
    loading: "جارٍ تحميل مكاني…",
    uploading: "جارٍ الرفع…",
    remove: "إزالة",
    maxReached: "يمكن الاحتفاظ بما يصل إلى 5 صور للمكان. احذف صورة قبل إضافة أخرى.",
    missingProject: "افتح قائمة محفوظة قبل إعداد مكاني.",
    signIn: "يرجى تسجيل الدخول مجدداً قبل رفع صور مكاني.",
    uploadFailed: "تعذر رفع الصورة. حاول مرة أخرى.",
    removeFailed: "تعذر حذف الصورة. حاول مرة أخرى.",
    emptyLogo: "سيظهر شعارك هنا",
  },
};

function safeId(value, fallback = "project") {
  const next = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  return next.slice(0, 120) || fallback;
}

function extensionFor(file) {
  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
}

function publicAsset(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

export default function MenuPlaceWorkspace({ projectId, language = "en" }) {
  const t = COPY[language] || COPY.en;
  const dir = studioLanguageDirection(language);
  const [folder, setFolder] = useState("");
  const [logo, setLogo] = useState(null);
  const [placePhotos, setPlacePhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const safeProjectId = useMemo(() => safeId(projectId), [projectId]);

  async function loadAssets() {
    if (!projectId) {
      setLoading(false);
      setError(t.missingProject);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error(t.signIn);
      const nextFolder = `${userId}/${safeProjectId}/my-place`;
      setFolder(nextFolder);
      const { data, error: listError } = await supabase.storage.from(BUCKET).list(nextFolder, {
        limit: 30,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (listError) throw listError;
      const assets = (data || [])
        .filter((entry) => entry?.name && entry?.metadata)
        .map((entry) => ({ ...entry, path: `${nextFolder}/${entry.name}`, url: publicAsset(`${nextFolder}/${entry.name}`) }));
      setLogo(assets.find((entry) => entry.name.startsWith("logo-")) || null);
      setPlacePhotos(assets.filter((entry) => entry.name.startsWith("place-")).slice(0, MAX_PLACE_PHOTOS));
    } catch (nextError) {
      setError(nextError?.message || t.uploadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, safeProjectId, language]);

  async function uploadOne(file, kind) {
    const validation = validateMenuItemImage(file);
    if (validation) throw new Error(validation);
    const uploadFile = await normalizeMenuItemImage(file);
    const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const path = `${folder}/${kind}-${suffix}.${extensionFor(uploadFile)}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, uploadFile, {
      cacheControl: "31536000",
      upsert: false,
      contentType: uploadFile.type,
    });
    if (uploadError) throw uploadError;
    return path;
  }

  async function onLogoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !folder || busy) return;
    setBusy("logo");
    setError("");
    try {
      await uploadOne(file, "logo");
      if (logo?.path) await supabase.storage.from(BUCKET).remove([logo.path]);
      await loadAssets();
    } catch (nextError) {
      setError(nextError?.message || t.uploadFailed);
    } finally {
      setBusy("");
    }
  }

  async function onPlacePhotosChange(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !folder || busy) return;
    const room = Math.max(0, MAX_PLACE_PHOTOS - placePhotos.length);
    if (!room) {
      setError(t.maxReached);
      return;
    }
    setBusy("place");
    setError("");
    try {
      for (const file of files.slice(0, room)) await uploadOne(file, "place");
      if (files.length > room) setError(t.maxReached);
      await loadAssets();
    } catch (nextError) {
      setError(nextError?.message || t.uploadFailed);
    } finally {
      setBusy("");
    }
  }

  async function removeAsset(asset) {
    if (!asset?.path || busy) return;
    setBusy(asset.path);
    setError("");
    try {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([asset.path]);
      if (removeError) throw removeError;
      await loadAssets();
    } catch (nextError) {
      setError(nextError?.message || t.removeFailed);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="menu-place-workspace-layer" dir={dir} aria-label={t.title}>
      <div className="menu-place-workspace">
        <header className="menu-place-workspace-head">
          <span>{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </header>

        {loading ? <div className="menu-place-loading"><LoaderCircle className="spin" size={24} /> {t.loading}</div> : null}
        {!loading && error ? <div className="menu-place-error">{error}</div> : null}

        {!loading && projectId ? <div className="menu-place-grid">
          <article className="menu-place-card menu-place-logo-card">
            <div className="menu-place-card-head">
              <div><span className="menu-place-card-icon"><Building2 size={18} /></span><div><h2>{t.logoTitle}</h2><p>{t.logoHint}</p></div></div>
            </div>
            <div className={`menu-place-logo-preview ${logo ? "has-image" : ""}`}>
              {logo ? <img src={logo.url} alt="" /> : <><Building2 size={30} /><span>{t.emptyLogo}</span></>}
            </div>
            <label className="menu-place-upload-button">
              {busy === "logo" ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
              <span>{busy === "logo" ? t.uploading : logo ? t.replaceLogo : t.addLogo}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={onLogoChange} disabled={Boolean(busy)} />
            </label>
          </article>

          <article className="menu-place-card menu-place-photos-card">
            <div className="menu-place-card-head">
              <div><span className="menu-place-card-icon"><ImagePlus size={18} /></span><div><h2>{t.placeTitle}</h2><p>{t.placeHint}</p></div></div>
              <strong>{t.photoCount(placePhotos.length)}</strong>
            </div>
            <div className="menu-place-photo-grid">
              {placePhotos.map((photo) => <figure key={photo.path} className="menu-place-photo-tile">
                <img src={photo.url} alt="" />
                <button type="button" title={t.remove} aria-label={t.remove} onClick={() => removeAsset(photo)} disabled={Boolean(busy)}>
                  {busy === photo.path ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />}
                </button>
              </figure>)}
              {placePhotos.length < MAX_PLACE_PHOTOS ? <label className="menu-place-photo-add">
                {busy === "place" ? <LoaderCircle className="spin" size={22} /> : <ImagePlus size={24} />}
                <strong>{busy === "place" ? t.uploading : t.addPhotos}</strong>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={onPlacePhotosChange} disabled={Boolean(busy)} />
              </label> : null}
            </div>
          </article>
        </div> : null}

        {!loading && projectId ? <aside className={`menu-place-ai-status ${placePhotos.length ? "ready" : ""}`}>
          <span className="menu-place-ai-icon">{placePhotos.length ? <CheckCircle2 size={21} /> : <WandSparkles size={21} />}</span>
          <div><h2>{t.aiTitle}</h2><strong>{t.aiReady(placePhotos.length)}</strong><p>{t.aiHint}</p></div>
        </aside> : null}
      </div>
    </section>
  );
}
