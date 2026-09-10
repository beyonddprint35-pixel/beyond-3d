import { useState } from "react";
import { Building2, CheckCircle2, ImagePlus, LoaderCircle, Trash2, Upload, WandSparkles } from "lucide-react";

import { removeMenuItemImage, uploadMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import { studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";
import "./MenuPlaceWorkspace.css";

const MAX_PLACE_PHOTOS = 5;

const COPY = {
  en: {
    eyebrow: "RESTAURANT PROFILE",
    title: "My Place",
    subtitle: "Give Beyond a visual memory of your restaurant. Your logo and place photos are shared automatically with Design and AI Photo Studio.",
    logoTitle: "Restaurant logo",
    logoHint: "This is the same logo used by your menu design.",
    addLogo: "Upload logo",
    replaceLogo: "Replace logo",
    placeTitle: "Place style photos",
    placeHint: "These are the same place-style photos used by AI Photo Studio. Upload 3–5 real photos of the dining room, bar, tables, walls and lighting.",
    addPhotos: "Add place photos",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} photos`,
    aiTitle: "My Place style is used automatically",
    aiReady: (count) => count ? `Ready — AI Photo Studio is connected to these ${count} place photo${count === 1 ? "" : "s"}.` : "Add place photos here or in AI Photo Studio — both use the same saved place style.",
    aiHint: "The dish stays locked. Place photos guide only the atmosphere: lighting, color temperature, table/background materials and restaurant mood.",
    uploading: "Uploading…",
    remove: "Remove",
    maxReached: "You can keep up to 5 place photos. Remove one before adding another.",
    missingProject: "Open a saved menu before setting up My Place.",
    uploadFailed: "Could not upload this photo. Please try again.",
    removeFailed: "Could not remove this photo. Please try again.",
    emptyLogo: "Your logo will appear here",
  },
  he: {
    eyebrow: "פרופיל המסעדה",
    title: "המקום שלי",
    subtitle: "תנו ל-Beyond זיכרון חזותי של המסעדה. הלוגו ותמונות המקום משותפים אוטומטית עם העיצוב וסטודיו התמונות AI.",
    logoTitle: "לוגו המסעדה",
    logoHint: "זהו אותו לוגו שבו משתמש עיצוב התפריט.",
    addLogo: "העלאת לוגו",
    replaceLogo: "החלפת לוגו",
    placeTitle: "תמונות סגנון של המקום",
    placeHint: "אלו אותן תמונות סגנון שבהן משתמש סטודיו התמונות AI. העלו 3–5 תמונות אמיתיות של החלל, הבר, השולחנות, הקירות והתאורה.",
    addPhotos: "הוספת תמונות מקום",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} תמונות`,
    aiTitle: "סגנון המקום שלי מופעל אוטומטית",
    aiReady: (count) => count ? `מוכן — סטודיו התמונות AI מחובר ל-${count} תמונות המקום האלו.` : "אפשר להוסיף תמונות כאן או בסטודיו התמונות AI — שניהם משתמשים באותו סגנון מקום שמור.",
    aiHint: "המנה נשארת נעולה. תמונות המקום משפיעות רק על האווירה: תאורה, טמפרטורת צבע, חומרי שולחן/רקע והאופי של המסעדה.",
    uploading: "מעלה…",
    remove: "הסרה",
    maxReached: "ניתן לשמור עד 5 תמונות מקום. הסירו תמונה לפני הוספת תמונה חדשה.",
    missingProject: "פתחו תפריט שמור לפני הגדרת המקום שלי.",
    uploadFailed: "לא ניתן להעלות את התמונה. נסו שוב.",
    removeFailed: "לא ניתן להסיר את התמונה. נסו שוב.",
    emptyLogo: "הלוגו שלכם יופיע כאן",
  },
  ar: {
    eyebrow: "ملف المطعم",
    title: "مكاني",
    subtitle: "امنح Beyond ذاكرة بصرية لمطعمك. تتم مشاركة الشعار وصور المكان تلقائياً مع التصميم واستوديو صور AI.",
    logoTitle: "شعار المطعم",
    logoHint: "هذا هو نفس الشعار المستخدم في تصميم القائمة.",
    addLogo: "رفع الشعار",
    replaceLogo: "استبدال الشعار",
    placeTitle: "صور أسلوب المكان",
    placeHint: "هذه هي نفس صور أسلوب المكان التي يستخدمها استوديو صور AI. ارفع 3–5 صور حقيقية للمكان والإضاءة والطاولات والجدران.",
    addPhotos: "إضافة صور المكان",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} صور`,
    aiTitle: "يُستخدم أسلوب مكاني تلقائياً",
    aiReady: (count) => count ? `جاهز — استوديو صور AI متصل بهذه الصور وعددها ${count}.` : "أضف الصور هنا أو في استوديو صور AI — كلاهما يستخدم نفس أسلوب المكان المحفوظ.",
    aiHint: "يبقى الطبق مقفلاً. صور المكان توجه الأجواء فقط: الإضاءة وحرارة اللون وخامات الطاولة أو الخلفية وطابع المطعم.",
    uploading: "جارٍ الرفع…",
    remove: "إزالة",
    maxReached: "يمكن الاحتفاظ بما يصل إلى 5 صور للمكان. احذف صورة قبل إضافة أخرى.",
    missingProject: "افتح قائمة محفوظة قبل إعداد مكاني.",
    uploadFailed: "تعذر رفع الصورة. حاول مرة أخرى.",
    removeFailed: "تعذر حذف الصورة. حاول مرة أخرى.",
    emptyLogo: "سيظهر شعارك هنا",
  },
};

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read this logo."));
    reader.readAsDataURL(file);
  });
}

export default function MenuPlaceWorkspace({
  projectId,
  language = "en",
  logoUrl = "",
  placeStyle = null,
  onLogoUpdate,
  onPlaceStyleUpdate,
}) {
  const t = COPY[language] || COPY.en;
  const dir = studioLanguageDirection(language);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const placePhotos = Array.isArray(placeStyle?.photos)
    ? placeStyle.photos.filter((photo) => photo?.url).slice(0, MAX_PLACE_PHOTOS)
    : [];

  async function onLogoFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    if (!String(file.type || "").startsWith("image/")) {
      setError(t.uploadFailed);
      return;
    }
    setBusy("logo");
    setError("");
    try {
      const nextLogoUrl = await fileAsDataUrl(file);
      onLogoUpdate?.(nextLogoUrl);
    } catch (nextError) {
      setError(nextError?.message || t.uploadFailed);
    } finally {
      setBusy("");
    }
  }

  async function onPlacePhotosChange(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || busy) return;
    if (!projectId) {
      setError(t.missingProject);
      return;
    }
    const room = Math.max(0, MAX_PLACE_PHOTOS - placePhotos.length);
    if (!room) {
      setError(t.maxReached);
      return;
    }
    setBusy("place");
    setError("");
    try {
      const uploaded = [];
      for (let index = 0; index < files.slice(0, room).length; index += 1) {
        const file = files[index];
        const result = await uploadMenuItemImage({
          file,
          itemId: `place-style-${Date.now()}-${index}`,
          projectId,
        });
        uploaded.push({ url: result.image_url, path: result.image_path, name: file.name });
      }
      const nextPhotos = [...placePhotos, ...uploaded].slice(0, MAX_PLACE_PHOTOS);
      onPlaceStyleUpdate?.({
        ...(placeStyle || {}),
        photos: nextPhotos,
        vibeId: placeStyle?.vibeId || "moody",
        updatedAt: new Date().toISOString(),
      });
      if (files.length > room) setError(t.maxReached);
    } catch (nextError) {
      setError(nextError?.message || t.uploadFailed);
    } finally {
      setBusy("");
    }
  }

  async function removePlacePhoto(photo) {
    if (!photo || busy) return;
    setBusy(photo.path || photo.url);
    setError("");
    try {
      if (photo.path) await removeMenuItemImage(photo.path);
      const nextPhotos = placePhotos.filter((entry) => entry !== photo && entry.path !== photo.path && entry.url !== photo.url);
      onPlaceStyleUpdate?.({
        ...(placeStyle || {}),
        photos: nextPhotos,
        vibeId: placeStyle?.vibeId || "moody",
        updatedAt: new Date().toISOString(),
      });
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

        {error ? <div className="menu-place-error">{error}</div> : null}

        <div className="menu-place-grid">
          <article className="menu-place-card menu-place-logo-card">
            <div className="menu-place-card-head">
              <div><span className="menu-place-card-icon"><Building2 size={18} /></span><div><h2>{t.logoTitle}</h2><p>{t.logoHint}</p></div></div>
            </div>
            <div className={`menu-place-logo-preview ${logoUrl ? "has-image" : ""}`}>
              {logoUrl ? <img src={logoUrl} alt="" /> : <><Building2 size={30} /><span>{t.emptyLogo}</span></>}
            </div>
            <label className="menu-place-upload-button">
              {busy === "logo" ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
              <span>{busy === "logo" ? t.uploading : logoUrl ? t.replaceLogo : t.addLogo}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={onLogoFileChange} disabled={Boolean(busy)} />
            </label>
            {logoUrl ? <button type="button" className="menu-place-logo-remove" onClick={() => onLogoUpdate?.("")} disabled={Boolean(busy)}><Trash2 size={14} /> {t.remove}</button> : null}
          </article>

          <article className="menu-place-card menu-place-photos-card">
            <div className="menu-place-card-head">
              <div><span className="menu-place-card-icon"><ImagePlus size={18} /></span><div><h2>{t.placeTitle}</h2><p>{t.placeHint}</p></div></div>
              <strong>{t.photoCount(placePhotos.length)}</strong>
            </div>
            <div className="menu-place-photo-grid">
              {placePhotos.map((photo) => <figure key={photo.path || photo.url} className="menu-place-photo-tile">
                <img src={photo.url} alt="" />
                <button type="button" title={t.remove} aria-label={t.remove} onClick={() => removePlacePhoto(photo)} disabled={Boolean(busy)}>
                  {busy === (photo.path || photo.url) ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />}
                </button>
              </figure>)}
              {placePhotos.length < MAX_PLACE_PHOTOS ? <label className="menu-place-photo-add">
                {busy === "place" ? <LoaderCircle className="spin" size={22} /> : <ImagePlus size={24} />}
                <strong>{busy === "place" ? t.uploading : t.addPhotos}</strong>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={onPlacePhotosChange} disabled={Boolean(busy)} />
              </label> : null}
            </div>
          </article>
        </div>

        <aside className={`menu-place-ai-status ${placePhotos.length ? "ready" : ""}`}>
          <span className="menu-place-ai-icon">{placePhotos.length ? <CheckCircle2 size={21} /> : <WandSparkles size={21} />}</span>
          <div><h2>{t.aiTitle}</h2><strong>{t.aiReady(placePhotos.length)}</strong><p>{t.aiHint}</p></div>
        </aside>
      </div>
    </section>
  );
}
