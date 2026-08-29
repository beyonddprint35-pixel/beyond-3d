import { useRef, useState } from "react";
import { uploadMenuItemImage, retuneMenuItemImage } from "./menuItemImageStorage";
import { getCurrentDraftDesign } from "./draftSession";
import { resolveMenuPhotoProfile, menuPhotoProfileDescription, menuPhotoProfileLabel } from "../domain/menuPhotoProfiles";
import "./MenuStudioItemPhotoField.css";

const COPY = {
  en:{label:"Item photo",upload:"Upload photo",replace:"Replace photo",remove:"Remove",uploading:"Analyzing, enhancing & matching to menu…",hint:"JPEG, PNG or WebP · up to 20 MB · Beyond keeps the real photo and creates polished versions",drop:"Drop a food photo here",empty:"Add a photo for image-led menu designs",error:"Photo upload failed",standard:"Beyond Photo Standard",original:"Original",enhanced:"Enhanced",theme:"Theme match",recommended:"Recommended",currentMenu:"Current menu",natural:"Natural enhancement only — the dish itself is not changed.",themeSafe:"Theme matching adjusts light, color and contrast only. It never invents ingredients or changes the dish.",retune:"Match current theme",retuning:"Matching to theme…",themeOutdated:"The menu design changed. Update this photo so it matches the current theme.",excellent:"Excellent",good:"Good",needs_improvement:"Needs improvement",low_quality:"Low quality"},
  he:{label:"תמונת הפריט",upload:"העלאת תמונה",replace:"החלפת תמונה",remove:"הסרה",uploading:"מנתח, משפר ומתאים לתפריט…",hint:"JPEG, PNG או WebP · עד 20MB · Beyond שומר את התמונה האמיתית ויוצר גרסאות מלוטשות",drop:"שחררו כאן תמונת מנה",empty:"הוסיפו תמונה לעיצובים מבוססי תמונות",error:"העלאת התמונה נכשלה",standard:"תקן התמונות של Beyond",original:"מקור",enhanced:"משופר",theme:"התאמה לעיצוב",recommended:"מומלץ",currentMenu:"התפריט הנוכחי",natural:"שיפור טבעי בלבד — המנה עצמה אינה משתנה.",themeSafe:"ההתאמה לעיצוב משנה רק אור, צבע וניגודיות. היא לא ממציאה מרכיבים ולא משנה את המנה.",retune:"התאמה לעיצוב הנוכחי",retuning:"מתאים לעיצוב…",themeOutdated:"עיצוב התפריט השתנה. עדכנו את התמונה כדי שתתאים לעיצוב הנוכחי.",excellent:"מצוין",good:"טוב",needs_improvement:"דורש שיפור",low_quality:"איכות נמוכה"},
  ar:{label:"صورة العنصر",upload:"رفع صورة",replace:"استبدال الصورة",remove:"إزالة",uploading:"جارٍ التحليل والتحسين والمطابقة مع القائمة…",hint:"JPEG أو PNG أو WebP · حتى 20 MB · يحتفظ Beyond بالصورة الحقيقية وينشئ نسخًا مصقولة",drop:"أفلت صورة الطبق هنا",empty:"أضف صورة لتصاميم القوائم المعتمدة على الصور",error:"فشل رفع الصورة",standard:"معيار صور Beyond",original:"الأصل",enhanced:"محسنة",theme:"مطابقة التصميم",recommended:"موصى بها",currentMenu:"القائمة الحالية",natural:"تحسين طبيعي فقط — لا يتم تغيير الطبق نفسه.",themeSafe:"مطابقة التصميم تعدّل الإضاءة واللون والتباين فقط ولا تضيف مكونات أو تغيّر الطبق.",retune:"مطابقة التصميم الحالي",retuning:"جارٍ المطابقة…",themeOutdated:"تم تغيير تصميم القائمة. حدّث الصورة لتطابق التصميم الحالي.",excellent:"ممتاز",good:"جيد",needs_improvement:"بحاجة لتحسين",low_quality:"جودة منخفضة"},
};

const NOTE_COPY = {
  en:{low_resolution:"Resolution is too low for premium layouts.",medium_resolution:"Resolution is acceptable, but a larger photo would look sharper.",too_dark:"The photo is very dark.",slightly_dark:"The photo is slightly dark.",too_bright:"Highlights are too bright.",slightly_bright:"The photo is slightly overexposed.",low_contrast:"The photo looks flat and needs more separation.",soft_contrast:"Contrast is a little soft.",soft_focus:"The photo may be out of focus.",slightly_soft:"The photo is slightly soft."},
  he:{low_resolution:"הרזולוציה נמוכה מדי לעיצובים פרימיום.",medium_resolution:"הרזולוציה תקינה, אך תמונה גדולה יותר תהיה חדה יותר.",too_dark:"התמונה כהה מאוד.",slightly_dark:"התמונה מעט כהה.",too_bright:"האזורים הבהירים חזקים מדי.",slightly_bright:"התמונה מעט בהירה מדי.",low_contrast:"התמונה שטוחה ודורשת יותר הפרדה.",soft_contrast:"הניגודיות מעט רכה.",soft_focus:"ייתכן שהתמונה אינה בפוקוס.",slightly_soft:"התמונה מעט רכה."},
  ar:{low_resolution:"الدقة منخفضة جدًا للتصاميم المميزة.",medium_resolution:"الدقة مقبولة، لكن صورة أكبر ستبدو أكثر حدة.",too_dark:"الصورة داكنة جدًا.",slightly_dark:"الصورة داكنة قليلًا.",too_bright:"الإضاءة الساطعة قوية جدًا.",slightly_bright:"الصورة ساطعة قليلًا.",low_contrast:"الصورة مسطحة وتحتاج إلى فصل أوضح.",soft_contrast:"التباين ناعم قليلًا.",soft_focus:"قد تكون الصورة خارج نطاق التركيز.",slightly_soft:"الصورة ناعمة قليلًا."},
};

export default function MenuStudioItemPhotoField({ item, onChange, siteId, slug, studioLanguage="en" }) {
  const copy = COPY[studioLanguage] || COPY.en;
  const noteCopy = NOTE_COPY[studioLanguage] || NOTE_COPY.en;
  const inputRef = useRef(null);
  const [uploading,setUploading] = useState(false);
  const [retuning,setRetuning] = useState(false);
  const [dragging,setDragging] = useState(false);
  const [error,setError] = useState("");

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
  const qualityScore = Number.isFinite(Number(item?.image_quality_score)) ? Number(item.image_quality_score) : null;
  const qualityLevel = String(item?.image_quality_level || "");
  const qualityNotes = Array.isArray(item?.image_quality_notes) ? item.image_quality_notes : [];
  const activeVariant = item?.image_variant === "original" ? "original" : item?.image_variant === "theme" ? "theme" : "enhanced";
  const hasComparison = Boolean(originalUrl && processedUrl);
  const themeIsCurrent = Boolean(themeUrl && storedThemeProfile === currentThemeProfile.id);
  const themeNeedsUpdate = Boolean((originalUrl || processedUrl) && !themeIsCurrent);
  const busy = uploading || retuning;

  async function handleFile(file) {
    if (!file || busy) return;
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadMenuItemImage({ file, siteId, slug, itemId:item?.id, themeProfile:currentThemeProfile });
      const selected = uploaded.theme || uploaded.processed;
      onChange?.({
        image_url:selected.url,
        image_path:selected.path,
        image_original_url:uploaded.original.url,
        image_original_path:uploaded.original.path,
        image_processed_url:uploaded.processed.url,
        image_processed_path:uploaded.processed.path,
        image_theme_url:uploaded.theme?.url || "",
        image_theme_path:uploaded.theme?.path || "",
        image_theme_profile:uploaded.themeProfile || "",
        image_theme_processed_at:uploaded.theme ? uploaded.processedAt : null,
        image_width:selected.width,
        image_height:selected.height,
        image_variant:uploaded.theme ? "theme" : "enhanced",
        image_status:"ready",
        image_quality_score:uploaded.analysis.score,
        image_quality_level:uploaded.analysis.level,
        image_quality_notes:uploaded.analysis.notes,
        image_processing_profile:uploaded.profile,
        image_processed_at:uploaded.processedAt,
      });
    } catch (err) {
      setError(err?.message || copy.error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function retuneCurrentTheme() {
    if (busy || !(originalUrl || processedUrl)) return;
    setError("");
    setRetuning(true);
    try {
      const tuned = await retuneMenuItemImage({
        sourceUrl:originalUrl || processedUrl,
        siteId,
        slug,
        itemId:item?.id,
        themeProfile:currentThemeProfile,
        previousThemePath:themePath,
      });
      onChange?.({
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
      setError(err?.message || copy.error);
    } finally {
      setRetuning(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
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
      image_width:null,
      image_height:null,
      image_variant:"",
      image_status:"none",
      image_quality_score:null,
      image_quality_level:"",
      image_quality_notes:[],
      image_processing_profile:"",
      image_processed_at:null,
    });
  }

  return <section className="studio-v3-item-photo-field">
    <div className="studio-v3-item-photo-label-row">
      <strong>{copy.label}</strong>
      <small>{copy.hint}</small>
    </div>

    <div
      className={`studio-v3-item-photo-dropzone ${imageUrl ? "has-image" : "empty"} ${dragging ? "is-dragging" : ""} ${busy ? "is-uploading" : ""}`}
      onDragEnter={event => { event.preventDefault(); setDragging(true); }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={handleDrop}
    >
      {imageUrl ? <img src={imageUrl} alt=""/> : <div className="studio-v3-item-photo-empty"><span className="studio-v3-item-photo-icon" aria-hidden="true"><i/><i/></span><strong>{dragging ? copy.drop : copy.empty}</strong></div>}
      <div className="studio-v3-item-photo-overlay">
        <button type="button" className="primary" disabled={busy} onClick={() => inputRef.current?.click()}>{uploading ? copy.uploading : (imageUrl ? copy.replace : copy.upload)}</button>
        {imageUrl ? <button type="button" className="secondary" disabled={busy} onClick={removePhoto}>{copy.remove}</button> : null}
      </div>
      {busy ? <span className="studio-v3-item-photo-progress" aria-hidden="true"/> : null}
    </div>

    {hasComparison ? <div className="studio-v3-item-photo-tuning">
      <div className="studio-v3-item-photo-standard-head">
        <div><span>{copy.standard}</span><strong>{qualityLevel ? copy[qualityLevel] || qualityLevel : copy.good}</strong></div>
        {qualityScore !== null ? <b className={`quality-${qualityLevel || "good"}`}>{qualityScore}/100</b> : null}
      </div>
      <div className="studio-v3-item-photo-theme-profile">
        <div><span>{copy.currentMenu}</span><strong>{currentThemeLabel}</strong><small>{currentThemeDescription}</small></div>
        {themeIsCurrent ? <span className="is-matched">✓ {copy.theme}</span> : null}
      </div>
      <div className="studio-v3-item-photo-variants" role="group" aria-label={copy.standard}>
        <button type="button" className={activeVariant === "original" ? "active" : ""} onClick={() => chooseVariant("original")}><span>{copy.original}</span></button>
        <button type="button" className={activeVariant === "enhanced" ? "active" : ""} onClick={() => chooseVariant("enhanced")}><span>{copy.enhanced}</span></button>
        <button type="button" className={`${activeVariant === "theme" ? "active" : ""} theme-variant`} disabled={!themeUrl} onClick={() => chooseVariant("theme")}><span>{copy.theme}</span>{themeIsCurrent ? <small>{copy.recommended}</small> : null}</button>
      </div>
      {themeNeedsUpdate ? <div className="studio-v3-item-photo-retune"><span>{copy.themeOutdated}</span><button type="button" disabled={busy} onClick={retuneCurrentTheme}>{retuning ? copy.retuning : copy.retune}</button></div> : null}
      <p className="studio-v3-item-photo-natural-note">{activeVariant === "theme" ? copy.themeSafe : copy.natural}</p>
      {qualityNotes.length ? <div className="studio-v3-item-photo-notes">{qualityNotes.slice(0,3).map(code => <span key={code}>{noteCopy[code] || code}</span>)}</div> : null}
    </div> : null}

    <input ref={inputRef} className="studio-v3-item-photo-native-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => handleFile(event.target.files?.[0])}/>
    {error ? <div className="studio-v3-item-photo-error" role="alert">{error}</div> : null}
  </section>;
}
