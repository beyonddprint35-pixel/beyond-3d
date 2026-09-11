import { useEffect, useState } from "react";
import { Building2, Check, CheckCircle2, ImagePlus, LoaderCircle, RefreshCcw, Sparkles, Trash2, Upload, WandSparkles } from "lucide-react";

import { removeMenuItemImage, uploadMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import { generateRestaurantScenePreset, getRestaurantScenePresets } from "../features/menu-engine/data/menuPhotoAiService";
import { studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";
import "./MenuPlaceWorkspace.css";

const MAX_PLACE_PHOTOS = 5;
const MAX_SCENE_PHOTOS = 3;

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
    placeHint: "Upload 3–5 real photos of your restaurant. You decide which photos belong to Scene 1 and Scene 2.",
    addPhotos: "Add place photos",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} photos`,
    scenesTitle: "Restaurant scene presets",
    scenesHint: "Choose the real My Place photos that define each scene. The first selected photo is the primary reference and stays visually dominant.",
    scene1: "Scene 1",
    scene2: "Scene 2",
    sceneHint: "Choose up to 3 My Place photos for this reusable scene.",
    choosePhotos: "Choose photos",
    hidePhotos: "Done choosing",
    selectedPhotos: (count) => `${count} selected`,
    primary: "Primary",
    createScene: "Create scene",
    regenerate: "Regenerate",
    recreate: "Recreate",
    regenerateHint: "New variation, same real setup",
    recreateHint: "Maximum fidelity to the selected photos",
    creatingScene: "Creating scene…",
    noScene: "Not created yet",
    sceneReady: "Ready to reuse",
    sceneNeedsPhotos: "Choose at least one My Place photo for this scene first.",
    sceneMaxPhotos: `Use up to ${MAX_SCENE_PHOTOS} photos per scene.`,
    sceneFailed: "Could not create this restaurant scene. Please try again.",
    aiTitle: "My Place is ready for Beyond AI",
    aiReady: (count, scenes) => scenes ? `Ready — ${scenes} reusable scene${scenes === 1 ? " is" : "s are"} available from ${count} place photo${count === 1 ? "" : "s"}.` : count ? `Ready — choose which of your ${count} place photo${count === 1 ? " belongs" : "s belong"} to each scene.` : "Add place photos to teach Beyond how this restaurant looks.",
    aiHint: "The item stays locked. Your selected scene controls the real background composition, surface, lighting and atmosphere.",
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
    placeHint: "העלו 3–5 תמונות אמיתיות של המסעדה. אתם בוחרים אילו תמונות שייכות לסצנה 1 ולסצנה 2.",
    addPhotos: "הוספת תמונות מקום",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} תמונות`,
    scenesTitle: "סצנות מסעדה לשימוש חוזר",
    scenesHint: "בחרו את תמונות המקום האמיתיות שמגדירות כל סצנה. התמונה הראשונה שנבחרת היא הרפרנס הראשי.",
    scene1: "סצנה 1",
    scene2: "סצנה 2",
    sceneHint: "בחרו עד 3 תמונות מקום לסצנה לשימוש חוזר.",
    choosePhotos: "בחירת תמונות",
    hidePhotos: "סיום בחירה",
    selectedPhotos: (count) => `${count} נבחרו`,
    primary: "ראשית",
    createScene: "יצירת סצנה",
    regenerate: "יצירה מחדש",
    recreate: "שחזור",
    regenerateHint: "וריאציה חדשה של אותו מקום",
    recreateHint: "נאמנות מרבית לתמונות שנבחרו",
    creatingScene: "יוצר סצנה…",
    noScene: "עדיין לא נוצרה",
    sceneReady: "מוכנה לשימוש חוזר",
    sceneNeedsPhotos: "בחרו לפחות תמונת מקום אחת לסצנה קודם.",
    sceneMaxPhotos: `ניתן לבחור עד ${MAX_SCENE_PHOTOS} תמונות לכל סצנה.`,
    sceneFailed: "לא ניתן ליצור את סצנת המסעדה. נסו שוב.",
    aiTitle: "המקום שלי מוכן ל-Beyond AI",
    aiReady: (count, scenes) => scenes ? `מוכן — ${scenes} סצנות לשימוש חוזר זמינות מתוך ${count} תמונות מקום.` : count ? `מוכן — בחרו אילו מתוך ${count} תמונות המקום שייכות לכל סצנה.` : "הוסיפו תמונות מקום כדי ללמד את Beyond איך המסעדה נראית.",
    aiHint: "הפריט נשאר נעול. הסצנה שנבחרה קובעת את הרקע האמיתי, המשטח, התאורה והאווירה.",
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
    placeHint: "ارفع 3–5 صور حقيقية للمطعم. أنت تختار الصور المناسبة للمشهد 1 والمشهد 2.",
    addPhotos: "إضافة صور المكان",
    photoCount: (count) => `${count}/${MAX_PLACE_PHOTOS} صور`,
    scenesTitle: "مشاهد المطعم القابلة لإعادة الاستخدام",
    scenesHint: "اختر صور مكاني الحقيقية التي تحدد كل مشهد. أول صورة مختارة هي المرجع الأساسي.",
    scene1: "المشهد 1",
    scene2: "المشهد 2",
    sceneHint: "اختر حتى 3 صور من مكاني لهذا المشهد.",
    choosePhotos: "اختيار الصور",
    hidePhotos: "إنهاء الاختيار",
    selectedPhotos: (count) => `تم اختيار ${count}`,
    primary: "أساسية",
    createScene: "إنشاء المشهد",
    regenerate: "إعادة التوليد",
    recreate: "إعادة الإنشاء",
    regenerateHint: "تنويع جديد لنفس المكان",
    recreateHint: "أعلى تطابق مع الصور المختارة",
    creatingScene: "جارٍ إنشاء المشهد…",
    noScene: "لم يتم إنشاؤه بعد",
    sceneReady: "جاهز لإعادة الاستخدام",
    sceneNeedsPhotos: "اختر صورة واحدة على الأقل من مكاني لهذا المشهد أولاً.",
    sceneMaxPhotos: `يمكن اختيار حتى ${MAX_SCENE_PHOTOS} صور لكل مشهد.`,
    sceneFailed: "تعذر إنشاء مشهد المطعم. حاول مرة أخرى.",
    aiTitle: "مكاني جاهز لـ Beyond AI",
    aiReady: (count, scenes) => scenes ? `جاهز — ${scenes} مشاهد قابلة لإعادة الاستخدام متاحة من ${count} صور للمكان.` : count ? `جاهز — اختر أي من صور المكان وعددها ${count} تنتمي لكل مشهد.` : "أضف صور المكان ليعرف Beyond كيف يبدو المطعم.",
    aiHint: "يبقى العنصر مقفلاً. المشهد المختار يحدد الخلفية الحقيقية والسطح والإضاءة والأجواء.",
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
  const [scenes, setScenes] = useState({ scene1: null, scene2: null });
  const [scenesLoading, setScenesLoading] = useState(false);
  const [openPicker, setOpenPicker] = useState("");
  const placePhotos = Array.isArray(placeStyle?.photos)
    ? placeStyle.photos.filter((photo) => photo?.url).slice(0, MAX_PLACE_PHOTOS)
    : [];
  const photoPaths = new Set(placePhotos.map((photo) => photo.path).filter(Boolean));
  const rawAssignments = placeStyle?.sceneAssignments && typeof placeStyle.sceneAssignments === "object" ? placeStyle.sceneAssignments : {};
  const sceneAssignments = {
    scene1: Array.isArray(rawAssignments.scene1) ? rawAssignments.scene1.filter((path) => photoPaths.has(path)).slice(0, MAX_SCENE_PHOTOS) : [],
    scene2: Array.isArray(rawAssignments.scene2) ? rawAssignments.scene2.filter((path) => photoPaths.has(path)).slice(0, MAX_SCENE_PHOTOS) : [],
  };
  const sceneCount = Number(Boolean(scenes.scene1)) + Number(Boolean(scenes.scene2));

  useEffect(() => {
    let cancelled = false;
    if (!projectId || projectId === "draft") {
      setScenes({ scene1: null, scene2: null });
      return () => { cancelled = true; };
    }
    setScenesLoading(true);
    getRestaurantScenePresets({ projectId })
      .then((result) => { if (!cancelled) setScenes(result.scenes || { scene1: null, scene2: null }); })
      .catch(() => { if (!cancelled) setScenes({ scene1: null, scene2: null }); })
      .finally(() => { if (!cancelled) setScenesLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  function updatePlaceStyle(patch) {
    onPlaceStyleUpdate?.({
      ...(placeStyle || {}),
      ...patch,
      vibeId: placeStyle?.vibeId || "moody",
      updatedAt: new Date().toISOString(),
    });
  }

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
      updatePlaceStyle({ photos: [...placePhotos, ...uploaded].slice(0, MAX_PLACE_PHOTOS), sceneAssignments });
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
      const nextAssignments = {
        scene1: sceneAssignments.scene1.filter((path) => path !== photo.path),
        scene2: sceneAssignments.scene2.filter((path) => path !== photo.path),
      };
      updatePlaceStyle({ photos: nextPhotos, sceneAssignments: nextAssignments });
    } catch (nextError) {
      setError(nextError?.message || t.removeFailed);
    } finally {
      setBusy("");
    }
  }

  function toggleScenePhoto(sceneKey, photo) {
    if (!photo?.path || busy) return;
    const current = sceneAssignments[sceneKey] || [];
    let next;
    if (current.includes(photo.path)) next = current.filter((path) => path !== photo.path);
    else {
      if (current.length >= MAX_SCENE_PHOTOS) {
        setError(t.sceneMaxPhotos);
        return;
      }
      next = [...current, photo.path];
    }
    setError("");
    updatePlaceStyle({
      sceneAssignments: {
        ...sceneAssignments,
        [sceneKey]: next,
      },
    });
  }

  async function createScene(sceneKey, generationMode) {
    if (busy || scenesLoading) return;
    const selected = sceneAssignments[sceneKey] || [];
    if (!selected.length) {
      setError(t.sceneNeedsPhotos);
      setOpenPicker(sceneKey);
      return;
    }
    const key = `${sceneKey}-${generationMode}`;
    setBusy(key);
    setError("");
    try {
      const result = await generateRestaurantScenePreset({
        projectId,
        sceneKey,
        sourcePaths: selected,
        generationMode,
      });
      setScenes(result.scenes || { scene1: null, scene2: null });
      setOpenPicker("");
    } catch (nextError) {
      setError(nextError?.message || t.sceneFailed);
    } finally {
      setBusy("");
    }
  }

  function sceneCard(sceneKey, scene, title) {
    const selected = sceneAssignments[sceneKey] || [];
    const selectedPhotos = selected.map((path) => placePhotos.find((photo) => photo.path === path)).filter(Boolean);
    const choosing = openPicker === sceneKey;
    const creating = busy === `${sceneKey}-recreate` || busy === `${sceneKey}-regenerate`;
    return (
      <article className={`menu-place-scene-card ${scene ? "ready" : ""}`}>
        <div className="menu-place-scene-preview">
          {scene?.url ? <img src={`${scene.url}?v=${Date.now()}`} alt="" /> : <><Sparkles size={26} /><span>{t.noScene}</span></>}
          {scene ? <em><CheckCircle2 size={12} /> {t.sceneReady}</em> : null}
        </div>
        <div className="menu-place-scene-copy"><strong>{title}</strong><small>{t.sceneHint}</small></div>

        <div className="menu-place-scene-sources">
          <div className="menu-place-scene-sources-head">
            <span>{t.selectedPhotos(selected.length)}</span>
            <button type="button" onClick={() => setOpenPicker(choosing ? "" : sceneKey)} disabled={Boolean(busy)}>{choosing ? t.hidePhotos : t.choosePhotos}</button>
          </div>
          {selectedPhotos.length ? <div className="menu-place-scene-selected-strip">
            {selectedPhotos.map((photo, index) => <span key={photo.path} className="menu-place-scene-selected-thumb">
              <img src={photo.url} alt="" />
              {index === 0 ? <em>{t.primary}</em> : null}
            </span>)}
          </div> : null}
          {choosing ? <div className="menu-place-scene-source-picker">
            {placePhotos.map((photo) => {
              const active = selected.includes(photo.path);
              return <button type="button" key={photo.path || photo.url} className={active ? "active" : ""} onClick={() => toggleScenePhoto(sceneKey, photo)} disabled={Boolean(busy)}>
                <img src={photo.url} alt="" />
                {active ? <i><Check size={13} /></i> : null}
              </button>;
            })}
          </div> : null}
        </div>

        {!scene ? <button type="button" className="menu-place-scene-action" onClick={() => createScene(sceneKey, "recreate")} disabled={Boolean(busy) || scenesLoading || !selected.length}>
          {creating ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />}
          <span>{creating ? t.creatingScene : t.createScene}</span>
        </button> : <div className="menu-place-scene-action-row">
          <button type="button" className="menu-place-scene-action secondary" onClick={() => createScene(sceneKey, "regenerate")} disabled={Boolean(busy) || scenesLoading || !selected.length} title={t.regenerateHint}>
            {busy === `${sceneKey}-regenerate` ? <LoaderCircle className="spin" size={15} /> : <RefreshCcw size={15} />}
            <span>{busy === `${sceneKey}-regenerate` ? t.creatingScene : t.regenerate}</span>
          </button>
          <button type="button" className="menu-place-scene-action" onClick={() => createScene(sceneKey, "recreate")} disabled={Boolean(busy) || scenesLoading || !selected.length} title={t.recreateHint}>
            {busy === `${sceneKey}-recreate` ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />}
            <span>{busy === `${sceneKey}-recreate` ? t.creatingScene : t.recreate}</span>
          </button>
        </div>}
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
          </div>
          {scenesLoading ? <div className="menu-place-loading"><LoaderCircle className="spin" size={16} /> Loading scenes…</div> : (
            <div className="menu-place-scene-grid">
              {sceneCard("scene1", scenes.scene1, t.scene1)}
              {sceneCard("scene2", scenes.scene2, t.scene2)}
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
