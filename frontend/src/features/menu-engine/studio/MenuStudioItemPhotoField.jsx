import { useEffect, useRef, useState } from "react";
import AuthModal from "../../../components/AuthModal";
import { supabase } from "../../../lib/supabaseClient";
import { MENU_PHOTO_AUTH_REQUIRED, uploadMenuItemImage, retuneMenuItemImage, reanalyzeMenuItemImage } from "./menuItemImageStorage";
import { getCurrentDraftDesign } from "./draftSession";
import { resolveMenuPhotoProfile, menuPhotoProfileDescription, menuPhotoProfileLabel } from "../domain/menuPhotoProfiles";
import "./MenuStudioItemPhotoField.css";

const COPY = {
  en:{label:"Item photo",upload:"Upload photo",replace:"Replace photo",remove:"Remove",signInUpload:"Sign in to upload",authRequired:"Sign in to Beyond to upload and save menu photos.",uploading:"Analyzing, enhancing & matching to menu…",hint:"JPEG, PNG or WebP · up to 20 MB · each unique photo is analyzed once and reused",drop:"Drop a food photo here",empty:"Add a photo for image-led menu designs",error:"Photo upload failed",standard:"Beyond Photo Standard",original:"Original",enhanced:"Enhanced",theme:"Theme match",recommended:"Recommended",currentMenu:"Current menu",natural:"Natural enhancement only — the dish itself is not changed.",themeSafe:"Theme matching reuses the saved photo analysis and adjusts locally. No new AI call is needed when designs change.",retune:"Match current theme",retuning:"Matching to theme…",themeOutdated:"This photo needs to join the reusable photo cache or match the current design. Beyond will analyze it once, then reuse it locally.",excellent:"Excellent",good:"Good",needs_improvement:"Needs improvement",low_quality:"Low quality",framing:"Photo framing",framingHint:"Beyond chooses the important visual area automatically. Tap or drag the target only if you want to override it.",adjustFraming:"Adjust framing",doneFraming:"Done framing",centerFraming:"Center",analyzedOnce:"Reusable photo analysis",cached:"Analyzed once · reusable across designs",reanalyze:"Reanalyze",reanalyzing:"Reanalyzing…",reanalyzeHint:"Only use this when the original photo or finishing standard genuinely needs a fresh analysis."},
  he:{label:"תמונת הפריט",upload:"העלאת תמונה",replace:"החלפת תמונה",remove:"הסרה",signInUpload:"התחברות להעלאת תמונה",authRequired:"יש להתחבר ל-Beyond כדי להעלות ולשמור תמונות בתפריט.",uploading:"מנתח, משפר ומתאים לתפריט…",hint:"JPEG, PNG או WebP · עד 20MB · כל תמונה ייחודית מנותחת פעם אחת ונשמרת לשימוש חוזר",drop:"שחררו כאן תמונת מנה",empty:"הוסיפו תמונה לעיצובים מבוססי תמונות",error:"העלאת התמונה נכשלה",standard:"תקן התמונות של Beyond",original:"מקור",enhanced:"משופר",theme:"התאמה לעיצוב",recommended:"מומלץ",currentMenu:"התפריט הנוכחי",natural:"שיפור טבעי בלבד — המנה עצמה אינה משתנה.",themeSafe:"התאמת העיצוב משתמשת מחדש בניתוח השמור ומעבדת מקומית. אין צורך בקריאת AI חדשה בעת החלפת עיצוב.",retune:"התאמה לעיצוב הנוכחי",retuning:"מתאים לעיצוב…",themeOutdated:"התמונה צריכה להצטרף למטמון התמונות לשימוש חוזר או להתאים לעיצוב הנוכחי. Beyond ינתח אותה פעם אחת ולאחר מכן ישתמש בניתוח מקומית.",excellent:"מצוין",good:"טוב",needs_improvement:"דורש שיפור",low_quality:"איכות נמוכה",framing:"מסגור התמונה",framingHint:"Beyond בוחר אוטומטית את האזור החשוב בתמונה. לחצו או גררו את הסמן רק אם תרצו לשנות אותו.",adjustFraming:"התאמת מסגור",doneFraming:"סיום מסגור",centerFraming:"מרכז",analyzedOnce:"ניתוח תמונה לשימוש חוזר",cached:"נותחה פעם אחת · לשימוש בכל העיצובים",reanalyze:"ניתוח מחדש",reanalyzing:"מנתח מחדש…",reanalyzeHint:"השתמשו בזה רק אם תמונת המקור או תקן הגימור באמת דורשים ניתוח חדש."},
  ar:{label:"صورة العنصر",upload:"رفع صورة",replace:"استبدال الصورة",remove:"إزالة",signInUpload:"تسجيل الدخول لرفع صورة",authRequired:"سجّل الدخول إلى Beyond لرفع صور القائمة وحفظها.",uploading:"جارٍ التحليل والتحسين والمطابقة مع القائمة…",hint:"JPEG أو PNG أو WebP · حتى 20 MB · يتم تحليل كل صورة فريدة مرة واحدة وإعادة استخدامها",drop:"أفلت صورة الطبق هنا",empty:"أضف صورة لتصاميم القوائم المعتمدة على الصور",error:"فشل رفع الصورة",standard:"معيار صور Beyond",original:"الأصل",enhanced:"محسنة",theme:"مطابقة التصميم",recommended:"موصى بها",currentMenu:"القائمة الحالية",natural:"تحسين طبيعي فقط — لا يتم تغيير الطبق نفسه.",themeSafe:"مطابقة التصميم تعيد استخدام تحليل الصورة المحفوظ وتتم محلياً. لا توجد حاجة لاتصال AI جديد عند تغيير التصميم.",retune:"مطابقة التصميم الحالي",retuning:"جارٍ المطابقة…",themeOutdated:"تحتاج هذه الصورة للانضمام إلى ذاكرة التحليل القابلة لإعادة الاستخدام أو مطابقة التصميم الحالي. سيحللها Beyond مرة واحدة ثم يعيد استخدامها محلياً.",excellent:"ممتاز",good:"جيد",needs_improvement:"بحاجة لتحسين",low_quality:"جودة منخفضة",framing:"تأطير الصورة",framingHint:"يختار Beyond المنطقة الأهم في الصورة تلقائيًا. اضغط أو اسحب الهدف فقط إذا أردت تعديلها.",adjustFraming:"ضبط التأطير",doneFraming:"إنهاء التأطير",centerFraming:"توسيط",analyzedOnce:"تحليل صورة قابل لإعادة الاستخدام",cached:"تم تحليلها مرة واحدة · قابلة لإعادة الاستخدام عبر التصاميم",reanalyze:"إعادة التحليل",reanalyzing:"جارٍ إعادة التحليل…",reanalyzeHint:"استخدم هذا فقط عندما تحتاج الصورة الأصلية أو معيار التشطيب فعلاً إلى تحليل جديد."},
};

const NOTE_COPY = {
  en:{low_resolution:"Resolution is too low for premium layouts.",medium_resolution:"Resolution is acceptable, but a larger photo would look sharper.",too_dark:"The photo is very dark.",slightly_dark:"The photo is slightly dark.",too_bright:"Highlights are too bright.",slightly_bright:"The photo is slightly overexposed.",low_contrast:"The photo looks flat and needs more separation.",soft_contrast:"Contrast is a little soft.",soft_focus:"The photo may be out of focus.",slightly_soft:"The photo is slightly soft."},
  he:{low_resolution:"הרזולוציה נמוכה מדי לעיצובים פרימיום.",medium_resolution:"הרזולוציה תקינה, אך תמונה גדולה יותר תהיה חדה יותר.",too_dark:"התמונה כהה מאוד.",slightly_dark:"התמונה מעט כהה.",too_bright:"האזורים הבהירים חזקים מדי.",slightly_bright:"התמונה מעט בהירה מדי.",low_contrast:"התמונה שטוחה ודורשת יותר הפרדה.",soft_contrast:"הניגודיות מעט רכה.",soft_focus:"ייתכן שהתמונה אינה בפוקוס.",slightly_soft:"התמונה מעט רכה."},
  ar:{low_resolution:"الدقة منخفضة جدًا للتصاميم المميزة.",medium_resolution:"الدقة مقبولة، لكن صورة أكبر ستبدو أكثر حدة.",too_dark:"الصورة داكنة جدًا.",slightly_dark:"الصورة داكنة قليلًا.",too_bright:"الإضاءة الساطعة قوية جدًا.",slightly_bright:"الصورة ساطعة قليلًا.",low_contrast:"الصورة مسطحة وتحتاج إلى فصل أوضح.",soft_contrast:"التباين ناعم قليلًا.",soft_focus:"قد تكون الصورة خارج نطاق التركيز.",slightly_soft:"الصورة ناعمة قليلًا."},
};

function clampFocus(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50;
}

function roundedFocus(value) {
  return Math.round(clampFocus(value) * 10) / 10;
}

function finishPatch(finish) {
  return {
    image_finish_profile:finish?.profile || "dish-safe-pro-v1",
    image_finish_source:finish?.source || "local-vision",
    image_finish_safety:finish?.safety || "dish-integrity-locked",
    image_finish_confidence:Number.isFinite(Number(finish?.confidence)) ? Number(finish.confidence) : null,
    image_finish_model:finish?.model || "",
    image_finish_recipe:finish?.recipe || null,
  };
}

function assetPatch(result) {
  const asset = result?.asset;
  if (!asset) return {};
  return {
    photo_asset_id:asset.id,
    image_hash:result.imageHash || asset.image_hash || "",
    image_analysis_profile:result.analysisProfile || asset.analysis_profile || "",
    image_original_url:asset.original_url || result.original?.url || "",
    image_original_path:asset.original_path || result.original?.path || "",
    image_processed_url:asset.processed_url || result.processed?.url || asset.original_url || "",
    image_processed_path:asset.processed_path || result.processed?.path || asset.original_path || "",
    image_quality_score:Number.isFinite(Number(asset.quality_score)) ? Number(asset.quality_score) : result.analysis?.score ?? null,
    image_quality_level:asset.quality_level || result.analysis?.level || "",
    image_quality_notes:Array.isArray(asset.quality_notes) ? asset.quality_notes : (result.analysis?.notes || []),
    image_focus_x:Number.isFinite(Number(asset.focus_x)) ? Number(asset.focus_x) : 50,
    image_focus_y:Number.isFinite(Number(asset.focus_y)) ? Number(asset.focus_y) : 50,
    image_processing_profile:asset.analysis?.processingProfile || result.profile || "natural-auto-v2",
    image_processed_at:asset.analyzed_at || result.processedAt || null,
  };
}

export default function MenuStudioItemPhotoField({ item, onChange, siteId, slug, studioLanguage="en" }) {
  const copy = COPY[studioLanguage] || COPY.en;
  const noteCopy = NOTE_COPY[studioLanguage] || NOTE_COPY.en;
  const inputRef = useRef(null);
  const focusDraggingRef = useRef(false);
  const [uploading,setUploading] = useState(false);
  const [retuning,setRetuning] = useState(false);
  const [reanalyzing,setReanalyzing] = useState(false);
  const [dragging,setDragging] = useState(false);
  const [error,setError] = useState("");
  const [authUser,setAuthUser] = useState(undefined);
  const [authOpen,setAuthOpen] = useState(false);
  const [focusMode,setFocusMode] = useState(false);
  const [focusPoint,setFocusPoint] = useState({x:50,y:50});

  useEffect(() => {
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setAuthUser(data?.session?.user || null); })
      .catch(() => { if (active) setAuthUser(null); });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setAuthUser(nextSession?.user || null);
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (authUser) setError(current => current === copy.authRequired ? "" : current);
  }, [authUser, copy.authRequired]);

  const currentDesign = getCurrentDraftDesign({ siteId, slug }) || {};
  const currentThemeProfile = resolveMenuPhotoProfile(currentDesign);
  const currentThemeLabel = menuPhotoProfileLabel(currentThemeProfile, studioLanguage);
  const currentThemeDescription = menuPhotoProfileDescription(currentThemeProfile, studioLanguage);

  const imageUrl = String(item?.image_url || "");
  const originalUrl = String(item?.image_original_url || "");
  const processedUrl = String(item?.image_processed_url || "");
  const themeUrl = String(item?.image_theme_url || "");
  const originalPath = String(item?.image_original_path || "");
  const processedPath = String(item?.image_processed_path || "");
  const themePath = String(item?.image_theme_path || "");
  const storedThemeProfile = String(item?.image_theme_profile || "");
  const photoAssetId = String(item?.photo_asset_id || "");
  const qualityScore = Number.isFinite(Number(item?.image_quality_score)) ? Number(item.image_quality_score) : null;
  const qualityLevel = String(item?.image_quality_level || "");
  const qualityNotes = Array.isArray(item?.image_quality_notes) ? item.image_quality_notes : [];
  const savedFocusX = clampFocus(item?.image_focus_x);
  const savedFocusY = clampFocus(item?.image_focus_y);
  const activeVariant = item?.image_variant === "original" ? "original" : item?.image_variant === "theme" ? "theme" : "enhanced";
  const hasComparison = Boolean((originalUrl && processedUrl) || photoAssetId);
  const themeIsCurrent = Boolean(themeUrl && storedThemeProfile === currentThemeProfile.id);
  const finishIsCurrent = item?.image_finish_profile === "dish-safe-pro-v1" && item?.image_finish_safety === "dish-integrity-locked";
  const themeNeedsUpdate = Boolean((originalUrl || processedUrl || photoAssetId) && (!themeIsCurrent || !finishIsCurrent || !photoAssetId));
  const busy = uploading || retuning || reanalyzing;
  const displayedFocus = focusMode ? focusPoint : {x:savedFocusX,y:savedFocusY};

  useEffect(() => {
    if (!focusMode) setFocusPoint({x:savedFocusX,y:savedFocusY});
  }, [savedFocusX, savedFocusY, focusMode]);

  function handlePhotoError(err) {
    if (err?.code === MENU_PHOTO_AUTH_REQUIRED) {
      setAuthUser(null);
      setError(copy.authRequired);
      setAuthOpen(true);
      return;
    }
    setError(err?.message || copy.error);
  }

  function requestUpload() {
    setError("");
    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    inputRef.current?.click();
  }

  async function handleFile(file) {
    if (!file || busy) return;
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadMenuItemImage({ file, siteId, slug, itemId:item?.id, themeProfile:currentThemeProfile });
      const selected = uploaded.theme || uploaded.processed;
      const smartFocus = uploaded.focus || {x:50,y:50};
      const nextFocus = {x:roundedFocus(smartFocus.x),y:roundedFocus(smartFocus.y)};
      onChange?.({
        ...assetPatch(uploaded),
        ...finishPatch(uploaded.finish),
        image_url:selected.url,
        image_path:selected.path,
        image_original_url:uploaded.original?.url || "",
        image_original_path:uploaded.original?.path || "",
        image_processed_url:uploaded.processed?.url || "",
        image_processed_path:uploaded.processed?.path || "",
        image_theme_url:uploaded.theme?.url || "",
        image_theme_path:uploaded.theme?.path || "",
        image_theme_profile:uploaded.themeProfile || "",
        image_theme_processed_at:uploaded.theme ? uploaded.processedAt : null,
        image_width:selected.width,
        image_height:selected.height,
        image_focus_x:nextFocus.x,
        image_focus_y:nextFocus.y,
        image_variant:uploaded.theme ? "theme" : "enhanced",
        image_status:"ready",
      });
      setFocusPoint(nextFocus);
    } catch (err) {
      handlePhotoError(err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function retuneCurrentTheme() {
    if (busy || !(originalUrl || processedUrl || photoAssetId)) return;
    setError("");
    setRetuning(true);
    try {
      const tuned = await retuneMenuItemImage({
        sourceUrl:originalUrl || processedUrl,
        sourcePath:originalPath || processedPath,
        siteId,
        slug,
        itemId:item?.id,
        themeProfile:currentThemeProfile,
        photoAssetId,
      });
      onChange?.({
        ...assetPatch(tuned),
        ...finishPatch(tuned.finish),
        image_url:tuned.theme.url,
        image_path:tuned.theme.path,
        image_theme_url:tuned.theme.url,
        image_theme_path:tuned.theme.path,
        image_theme_profile:tuned.themeProfile,
        image_theme_processed_at:tuned.processedAt,
        image_width:tuned.theme.width,
        image_height:tuned.theme.height,
        image_variant:"theme",
        image_status:"ready",
      });
    } catch (err) {
      handlePhotoError(err);
    } finally {
      setRetuning(false);
    }
  }

  async function reanalyzePhoto() {
    if (busy || !(originalUrl || processedUrl || photoAssetId)) return;
    setError("");
    setReanalyzing(true);
    try {
      const analyzed = await reanalyzeMenuItemImage({
        sourceUrl:originalUrl || processedUrl,
        sourcePath:originalPath || processedPath,
        siteId,
        slug,
        itemId:item?.id,
        themeProfile:currentThemeProfile,
        photoAssetId,
      });
      const selected = analyzed.theme || analyzed.processed;
      onChange?.({
        ...assetPatch(analyzed),
        ...finishPatch(analyzed.finish),
        image_url:selected?.url || imageUrl,
        image_path:selected?.path || item?.image_path || "",
        image_theme_url:analyzed.theme?.url || "",
        image_theme_path:analyzed.theme?.path || "",
        image_theme_profile:analyzed.themeProfile || "",
        image_theme_processed_at:analyzed.theme ? analyzed.processedAt : null,
        image_width:selected?.width || item?.image_width || null,
        image_height:selected?.height || item?.image_height || null,
        image_variant:analyzed.theme ? "theme" : "enhanced",
        image_status:"ready",
      });
    } catch (err) {
      handlePhotoError(err);
    } finally {
      setReanalyzing(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (focusMode) return;
    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function chooseVariant(variant) {
    if (variant === "original" && originalUrl) {
      onChange?.({ image_url:originalUrl, image_path:originalPath, image_variant:"original" });
      return;
    }
    if (variant === "theme" && themeUrl) {
      onChange?.({ image_url:themeUrl, image_path:themePath, image_variant:"theme" });
      return;
    }
    if (processedUrl) onChange?.({ image_url:processedUrl, image_path:processedPath, image_variant:"enhanced" });
  }

  function removePhoto() {
    setError("");
    setFocusMode(false);
    setFocusPoint({x:50,y:50});
    onChange?.({
      image_url:"",
      image_path:"",
      image_original_url:"",
      image_original_path:"",
      image_processed_url:"",
      image_processed_path:"",
      image_theme_url:"",
      image_theme_path:"",
      image_theme_profile:"",
      image_theme_processed_at:null,
      photo_asset_id:"",
      image_hash:"",
      image_analysis_profile:"",
      image_width:null,
      image_height:null,
      image_focus_x:50,
      image_focus_y:50,
      image_variant:"",
      image_status:"none",
      image_quality_score:null,
      image_quality_level:"",
      image_quality_notes:[],
      image_processing_profile:"",
      image_processed_at:null,
      image_finish_profile:"",
      image_finish_source:"",
      image_finish_safety:"",
      image_finish_confidence:null,
      image_finish_model:"",
      image_finish_recipe:null,
    });
  }

  function pointFromPointer(event) {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return focusPoint;
    return {
      x: roundedFocus(((event.clientX - box.left) / box.width) * 100),
      y: roundedFocus(((event.clientY - box.top) / box.height) * 100),
    };
  }

  function commitFocus(point = focusPoint) {
    const next = {x:roundedFocus(point.x),y:roundedFocus(point.y)};
    setFocusPoint(next);
    onChange?.({ image_focus_x:next.x, image_focus_y:next.y });
  }

  function handleFocusPointerDown(event) {
    event.preventDefault();
    focusDraggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setFocusPoint(pointFromPointer(event));
  }

  function handleFocusPointerMove(event) {
    if (!focusDraggingRef.current) return;
    setFocusPoint(pointFromPointer(event));
  }

  function handleFocusPointerUp(event) {
    if (!focusDraggingRef.current) return;
    focusDraggingRef.current = false;
    const next = pointFromPointer(event);
    setFocusPoint(next);
    commitFocus(next);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function startFraming() {
    setFocusPoint({x:savedFocusX,y:savedFocusY});
    setFocusMode(true);
  }

  function centerFraming() {
    const centered = {x:50,y:50};
    setFocusPoint(centered);
    commitFocus(centered);
  }

  function finishFraming() {
    commitFocus();
    setFocusMode(false);
  }

  return <section className="studio-v3-item-photo-field">
    <div className="studio-v3-item-photo-label-row">
      <strong>{copy.label}</strong>
      <small>{copy.hint}</small>
    </div>

    <div
      className={`studio-v3-item-photo-dropzone ${imageUrl ? "has-image" : "empty"} ${dragging ? "is-dragging" : ""} ${busy ? "is-uploading" : ""} ${focusMode ? "is-framing" : ""}`}
      onDragEnter={event => { if (focusMode) return; event.preventDefault(); setDragging(true); }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={handleDrop}
    >
      {imageUrl ? <img src={imageUrl} alt="" style={{objectPosition:`${displayedFocus.x}% ${displayedFocus.y}%`}}/> : <div className="studio-v3-item-photo-empty"><span className="studio-v3-item-photo-icon" aria-hidden="true"><i/><i/></span><strong>{dragging ? copy.drop : copy.empty}</strong></div>}
      {focusMode && imageUrl ? <div
        className="studio-v3-item-photo-focus-layer"
        role="application"
        aria-label={copy.framingHint}
        onPointerDown={handleFocusPointerDown}
        onPointerMove={handleFocusPointerMove}
        onPointerUp={handleFocusPointerUp}
        onPointerCancel={() => { focusDraggingRef.current = false; }}
      ><span className="studio-v3-item-photo-focus-target" style={{left:`${focusPoint.x}%`,top:`${focusPoint.y}%`}} aria-hidden="true"><i/><i/></span></div> : null}
      <div className="studio-v3-item-photo-overlay">
        {focusMode ? <>
          <button type="button" className="primary" onClick={finishFraming}>{copy.doneFraming}</button>
          <button type="button" className="secondary" onClick={centerFraming}>{copy.centerFraming}</button>
        </> : <>
          <button type="button" className="primary" disabled={busy} onClick={requestUpload}>{uploading ? copy.uploading : (!authUser ? copy.signInUpload : (imageUrl ? copy.replace : copy.upload))}</button>
          {imageUrl ? <button type="button" className="secondary" disabled={busy} onClick={removePhoto}>{copy.remove}</button> : null}
        </>}
      </div>
      {busy ? <span className="studio-v3-item-photo-progress" aria-hidden="true"/> : null}
    </div>

    {imageUrl ? <div className={`studio-v3-item-photo-framing-row ${focusMode ? "active" : ""}`}>
      <div><strong>{copy.framing}</strong><span>{copy.framingHint}</span></div>
      {!focusMode ? <button type="button" disabled={busy} onClick={startFraming}>{copy.adjustFraming}</button> : <span className="studio-v3-item-photo-focus-coordinates">{Math.round(focusPoint.x)} · {Math.round(focusPoint.y)}</span>}
    </div> : null}

    {hasComparison ? <div className="studio-v3-item-photo-tuning">
      <div className="studio-v3-item-photo-standard-head">
        <div><span>{copy.standard}</span><strong>{qualityLevel ? copy[qualityLevel] || qualityLevel : copy.good}</strong></div>
        {qualityScore !== null ? <b className={`quality-${qualityLevel || "good"}`}>{qualityScore}/100</b> : null}
      </div>
      <div className="studio-v3-item-photo-theme-profile">
        <div><span>{copy.currentMenu}</span><strong>{currentThemeLabel}</strong><small>{currentThemeDescription}</small></div>
        {themeIsCurrent && finishIsCurrent && photoAssetId ? <span className="is-matched">✓ {copy.theme}</span> : null}
      </div>
      {photoAssetId ? <div className="studio-v3-item-photo-asset-row">
        <div><span>{copy.analyzedOnce}</span><strong>✓ {copy.cached}</strong><small>{copy.reanalyzeHint}</small></div>
        <button type="button" disabled={busy} onClick={reanalyzePhoto}>{reanalyzing ? copy.reanalyzing : copy.reanalyze}</button>
      </div> : null}
      <div className="studio-v3-item-photo-variants" role="group" aria-label={copy.standard}>
        <button type="button" className={activeVariant === "original" ? "active" : ""} onClick={() => chooseVariant("original")}><span>{copy.original}</span></button>
        <button type="button" className={activeVariant === "enhanced" ? "active" : ""} onClick={() => chooseVariant("enhanced")}><span>{copy.enhanced}</span></button>
        <button type="button" className={`${activeVariant === "theme" ? "active" : ""} theme-variant`} disabled={!themeUrl} onClick={() => chooseVariant("theme")}><span>{copy.theme}</span>{themeIsCurrent && finishIsCurrent && photoAssetId ? <small>{copy.recommended}</small> : null}</button>
      </div>
      {themeNeedsUpdate ? <div className="studio-v3-item-photo-retune"><span>{copy.themeOutdated}</span><button type="button" disabled={busy} onClick={retuneCurrentTheme}>{retuning ? copy.retuning : copy.retune}</button></div> : null}
      <p className="studio-v3-item-photo-natural-note">{activeVariant === "theme" ? copy.themeSafe : copy.natural}</p>
      {qualityNotes.length ? <div className="studio-v3-item-photo-notes">{qualityNotes.slice(0,3).map(code => <span key={code}>{noteCopy[code] || code}</span>)}</div> : null}
    </div> : null}

    <input ref={inputRef} className="studio-v3-item-photo-native-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => handleFile(event.target.files?.[0])}/>
    {error ? <div className="studio-v3-item-photo-error" role="alert">{error}</div> : null}
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login"/>
  </section>;
}
