import { useEffect, useState } from "react";
import { Building2, CheckCircle2, ImagePlus, LoaderCircle, RefreshCcw, Sparkles, Trash2, Upload, WandSparkles } from "lucide-react";

import { removeMenuItemImage, uploadMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import { generateRestaurantScenePresets, getRestaurantScenePresets } from "../features/menu-engine/data/menuPhotoAiService";
import { studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";
import "./MenuPlaceWorkspace.css";

const MAX_PLACE_PHOTOS = 5;

const COPY = {
  en: {
    eyebrow: "RESTAURANT PROFILE",
    title: "My Place",
    subtitle: "Give Beyond a visual memory of your restaurant. Your logo, real place photos and reusable AI scenes are shared automatically with Design and AI Photo Studio.",
    logoTitle: "Restaurant logo",
    logoHint: "This is the same logo used by your menu design.",
    addLogo: "Upload logo",
    replaceLogo: "Replace logo",
    placeTitle: "Place style photos",
    placeHint: "Upload 3–5 real photos of the dining room, bar, tables, walls and lighting. Beyond uses them to build reusable restaurant scenes.",
    addPhotos: "Add place photos",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} photos`,
    scenesTitle: "Restaurant scene presets",
    scenesHint: "Create these once from My Place, then reuse them for every item. Matching a dish or drink still generates only one photo per click.",
    barScene: "Bar scene",
    barSceneHint: "For beer, cocktails, wine and bar-style shots.",
    tableScene: "Table scene",
    tableSceneHint: "For dishes, desserts and table presentation.",
    createScene: "Create scene",
    refreshScene: "Regenerate",
    createBoth: "Create both scenes",
    creatingScene: "Creating scene…",
    noScene: "Not created yet",
    sceneReady: "Ready to reuse",
    sceneNeedsPhotos: "Add at least one My Place photo first.",
    sceneFailed: "Could not create this restaurant scene. Please try again.",
    aiTitle: "My Place is ready for Beyond AI",
    aiReady: (count, scenes) => scenes ? `Ready — ${scenes} reusable scene${scenes === 1 ? " is" : "s are"} available from ${count} place photo${count === 1 ? "" : "s"}.` : count ? `Ready — ${count} place photo${count === 1 ? "" : "s"} can now be turned into reusable scenes.` : "Add place photos to teach Beyond how this restaurant looks.",
    aiHint: "The item stays locked. Restaurant scenes control the background, surface, lighting and atmosphere so menu photos stay visually consistent.",
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
    subtitle: "תנו ל-Beyond זיכרון חזותי של המסעדה. הלוגו, תמונות המקום והסצנות החוזרות משותפים אוטומטית עם העיצוב וסטודיו התמונות AI.",
    logoTitle: "לוגו המסעדה",
    logoHint: "זהו אותו לוגו שבו משתמש עיצוב התפריט.",
    addLogo: "העלאת לוגו",
    replaceLogo: "החלפת לוגו",
    placeTitle: "תמונות סגנון של המקום",
    placeHint: "העלו 3–5 תמונות אמיתיות של החלל, הבר, השולחנות, הקירות והתאורה. Beyond יוצר מהן סצנות מסעדה לשימוש חוזר.",
    addPhotos: "הוספת תמונות מקום",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} תמונות`,
    scenesTitle: "סצנות מסעדה לשימוש חוזר",
    scenesHint: "יוצרים אותן פעם אחת מהמקום שלי ומשתמשים בהן לכל פריט. התאמת מנה או משקה עדיין יוצרת תמונה אחת בלבד בכל לחיצה.",
    barScene: "סצנת בר",
    barSceneHint: "לבירה, קוקטיילים, יין וצילומי בר.",
    tableScene: "סצנת שולחן",
    tableSceneHint: "למנות, קינוחים והצגה על שולחן.",
    createScene: "יצירת סצנה",
    refreshScene: "יצירה מחדש",
    createBoth: "יצירת שתי הסצנות",
    creatingScene: "יוצר סצנה…",
    noScene: "עדיין לא נוצרה",
    sceneReady: "מוכנה לשימוש חוזר",
    sceneNeedsPhotos: "יש להוסיף לפחות תמונת מקום אחת קודם.",
    sceneFailed: "לא ניתן ליצור את סצנת המסעדה. נסו שוב.",
    aiTitle: "המקום שלי מוכן ל-Beyond AI",
    aiReady: (count, scenes) => scenes ? `מוכן — ${scenes} סצנות לשימוש חוזר זמינות מתוך ${count} תמונות מקום.` : count ? `מוכן — ניתן ליצור סצנות לשימוש חוזר מתוך ${count} תמונות המקום.` : "הוסיפו תמונות מקום כדי ללמד את Beyond איך המסעדה נראית.",
    aiHint: "הפריט נשאר נעול. הסצנה קובעת את הרקע, המשטח, התאורה והאווירה כדי לשמור על אחידות בין תמונות התפריט.",
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
    subtitle: "امنح Beyond ذاكرة بصرية للمطعم. تتم مشاركة الشعار وصور المكان والمشاهد القابلة لإعادة الاستخدام تلقائياً مع التصميم واستوديو صور AI.",
    logoTitle: "شعار المطعم",
    logoHint: "هذا هو نفس الشعار المستخدم في تصميم القائمة.",
    addLogo: "رفع الشعار",
    replaceLogo: "استبدال الشعار",
    placeTitle: "صور أسلوب المكان",
    placeHint: "ارفع 3–5 صور حقيقية للمكان والبار والطاولات والجدران والإضاءة. يستخدمها Beyond لإنشاء مشاهد مطعم قابلة لإعادة الاستخدام.",
    addPhotos: "إضافة صور المكان",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} صور`,
    scenesTitle: "مشاهد المطعم القابلة لإعادة الاستخدام",
    scenesHint: "أنشئها مرة واحدة من مكاني ثم استخدمها لكل عنصر. مطابقة طبق أو مشروب ما زالت تنشئ صورة واحدة فقط لكل ضغطة.",
    barScene: "مشهد البار",
    barSceneHint: "للبيرة والكوكتيلات والنبيذ وصور البار.",
    tableScene: "مشهد الطاولة",
    tableSceneHint: "للأطباق والحلويات والعرض على الطاولة.",
    createScene: "إنشاء المشهد",
    refreshScene: "إعادة الإنشاء",
    createBoth: "إنشاء المشهدين",
    creatingScene: "جارٍ إنشاء المشهد…",
    noScene: "لم يتم إنشاؤه بعد",
    sceneReady: "جاهز لإعادة الاستخدام",
    sceneNeedsPhotos: "أضف صورة واحدة على الأقل للمكان أولاً.",
    sceneFailed: "تعذر إنشاء مشهد المطعم. حاول مرة أخرى.",
    aiTitle: "مكاني جاهز لـ Beyond AI",
    aiReady: (count, scenes) => scenes ? `جاهز — ${scenes} مشاهد قابلة لإعادة الاستخدام متاحة من ${count} صور للمكان.` : count ? `جاهز — يمكن الآن إنشاء مشاهد قابلة لإعادة الاستخدام من ${count} صور للمكان.` : "أضف صور المكان ليعرف Beyond كيف يبدو المطعم.",
    aiHint: "يبقى العنصر مقفلاً. تحدد المشاهد الخلفية والسطح والإضاءة والأجواء للحفاظ على اتساق صور القائمة.",
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
  const [scenes, setScenes] = useState({ bar: null, table: null });
  const [scenesLoading, setScenesLoading] = useState(false);
  const placePhotos = Array.isArray(placeStyle?.photos)
    ? placeStyle.photos.filter((photo) => photo?.url).slice(0, MAX_PLACE_PHOTOS)
    : [];
  const sceneCount = Number(Boolean(scenes.bar)) + Number(Boolean(scenes.table));

  useEffect(() => {
    let cancelled = false;
    if (!projectId || projectId === "draft") {
      setScenes({ bar: null, table: null });
      return () => { cancelled = true; };
    }
    setScenesLoading(true);
    getRestaurantScenePresets({ projectId })
      .then((result) => { if (!cancelled) setScenes(result.scenes || { bar: null, table: null }); })
      .catch(() => { if (!cancelled) setScenes({ bar: null, table: null }); })
      .finally(() => { if (!cancelled) setScenesLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

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

  async function createScenes(sceneTypes) {
    if (busy || scenesLoading) return;
    if (!placePhotos.length) {
      setError(t.sceneNeedsPhotos);
      return;
    }
    const key = `scenes-${sceneTypes.join("-")}`;
    setBusy(key);
    setError("");
    try {
      const result = await generateRestaurantScenePresets({ projectId, sceneTypes });
      setScenes(result.scenes || { bar: null, table: null });
    } catch (nextError) {
      setError(nextError?.message || t.sceneFailed);
    } finally {
      setBusy("");
    }
  }

  function sceneCard(type, scene, title, hint) {
    const creating = busy === `scenes-${type}` || busy === "scenes-bar-table";
    return (
      <article className={`menu-place-scene-card ${scene ? "ready" : ""}`}>
        <div className="menu-place-scene-preview">
          {scene?.url ? <img src={`${scene.url}?v=${encodeURIComponent(scene.path || "scene")}`} alt="" /> : <><Sparkles size={26} /><span>{t.noScene}</span></>}
          {scene ? <em><CheckCircle2 size={12} /> {t.sceneReady}</em> : null}
        </div>
        <div className="menu-place-scene-copy"><strong>{title}</strong><small>{hint}</small></div>
        <button type="button" className="menu-place-scene-action" onClick={() => createScenes([type])} disabled={Boolean(busy) || scenesLoading || !placePhotos.length}>
          {creating ? <LoaderCircle className="spin" size={15} /> : scene ? <RefreshCcw size={15} /> : <WandSparkles size={15} />}
          <span>{creating ? t.creatingScene : scene ? t.refreshScene : t.createScene}</span>
        </button>
      </article>
    );
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

        <section className="menu-place-scenes">
          <div className="menu-place-scenes-head">
            <div><span><Sparkles size={16} /></span><div><h2>{t.scenesTitle}</h2><p>{t.scenesHint}</p></div></div>
            <button type="button" onClick={() => createScenes(["bar", "table"])} disabled={Boolean(busy) || scenesLoading || !placePhotos.length}>
              {busy === "scenes-bar-table" ? <LoaderCircle className="spin" size={14} /> : <WandSparkles size={14} />}
              {busy === "scenes-bar-table" ? t.creatingScene : t.createBoth}
            </button>
          </div>
          {scenesLoading ? <div className="menu-place-loading"><LoaderCircle className="spin" size={16} /> Loading scenes…</div> : (
            <div className="menu-place-scene-grid">
              {sceneCard("bar", scenes.bar, t.barScene, t.barSceneHint)}
              {sceneCard("table", scenes.table, t.tableScene, t.tableSceneHint)}
            </div>
          )}
        </section>

        <aside className={`menu-place-ai-status ${placePhotos.length ? "ready" : ""}`}>
          <span className="menu-place-ai-icon">{placePhotos.length ? <CheckCircle2 size={21} /> : <WandSparkles size={21} />}</span>
          <div><h2>{t.aiTitle}</h2><strong>{t.aiReady(placePhotos.length, sceneCount)}</strong><p>{t.aiHint}</p></div>
        </aside>
      </div>
    </section>
  );
}
